"""POST /runs, GET /runs/{id}, and GET /runs/{id}/events (SSE).

Each run is one SQLite row plus the step events the dashboard streams while
the agent is still moving.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import shutil
import sqlite3
import sys
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from agent.api.limits import LimitSettings, Refusal, RunLimiter, SlidingWindow, client_ip
from agent.api.url_guard import BlockedTarget, check_url
from agent.keyboard_agent.models import clean_amount, clean_detail
from agent.keyboard_agent.runner import build_journey_config, run_journey
from agent.keyboard_agent.scenarios import SCENARIOS, get_scenario

load_dotenv()

KEEPALIVE_SECONDS = 15
UNSEEDED_RUN_MAX_AGE = timedelta(days=7)
ARTIFACT_MAX_AGE = timedelta(hours=24)
DEFAULT_SEED_PATH = Path(__file__).resolve().parents[2] / "docs" / "evidence-seed.json"
ARTIFACTS_ROOT = Path("artifacts/api")
_USE_DEFAULT_SEED = object()
_RUN_ID_IN_PATH = re.compile(r"/runs/([0-9a-fA-F-]{8,36})")

log = logging.getLogger("haunted_audit")
if not log.handlers:
    _handler = logging.StreamHandler(sys.stdout)
    _handler.setFormatter(logging.Formatter("%(message)s"))
    log.addHandler(_handler)
    log.setLevel(logging.INFO)
    log.propagate = False


def log_event(**fields) -> None:
    """One JSON line to stdout. Never pass request bodies or credentials."""
    log.info(json.dumps(fields, default=str))


def allowed_origins() -> list[str]:
    raw = os.getenv("CORS_ALLOWED_ORIGINS", "")
    items = [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]
    if "*" in items:
        raise RuntimeError("CORS_ALLOWED_ORIGINS must list exact origins, not *")
    return items or ["http://localhost:5173", "http://127.0.0.1:5173"]


class RunCreate(BaseModel):
    # Agents only ever run on the bundled Haunted Bank. A url, path or selector
    # in the body is a 422, not something to ignore quietly.
    model_config = ConfigDict(extra="forbid")

    variant: Literal["broken", "fixed"] = "broken"
    mode: Literal["llm", "scripted"] = "scripted"
    scenario: str = "haunted-bank"
    max_steps: int = Field(default=25, ge=1, le=80)

    @field_validator("scenario")
    @classmethod
    def _scenario_ok(cls, v: str) -> str:
        return get_scenario(v).id
    timeout_seconds: float = Field(default=90, ge=0, le=300)
    # The details the tester typed (user-typed-test-details REQ-TD-03, 07). Left out, the run uses
    # INTERNAL_DEFAULT_DETAILS, so old requests and Night Watch keep working (REQ-TD-06).
    recipient: str | None = None
    amount: str | None = None
    reference: str | None = None

    @field_validator("recipient")
    @classmethod
    def _required_when_given(cls, v: str | None) -> str | None:
        return None if v is None else clean_detail(v, required=True)

    @field_validator("amount")
    @classmethod
    def _amount(cls, v: str | None) -> str | None:
        # The bank's own rule, so a run never starts with an amount the bank will refuse.
        return None if v is None else clean_amount(v, required=True)

    @field_validator("reference")
    @classmethod
    def _optional(cls, v: str | None) -> str | None:
        return clean_detail(v, required=False)

    def test_details(self) -> dict | None:
        """What the tester typed, or None when the request carried no details."""
        if self.recipient is None and self.amount is None and self.reference is None:
            return None
        return {"recipient": self.recipient, "amount": self.amount, "reference": self.reference}


class VoiceRunCreate(BaseModel):
    """POST /voice-runs (voice-agent REQ-VA-07). Unknown fields are a 422, as for /runs."""

    model_config = ConfigDict(extra="forbid")

    variant: Literal["broken", "fixed"] = "broken"
    scenario: str = "haunted-bank"
    commands: list[Annotated[str, StringConstraints(min_length=1, max_length=200)]] = Field(min_length=1, max_length=10)
    input_source: Literal["typed", "speech"] = "typed"

    @field_validator("scenario")
    @classmethod
    def _voice_scenario_ok(cls, v: str) -> str:
        return get_scenario(v).id


class FixCreate(BaseModel):
    """POST /runs/{run_id}/fixes (exorcist REQ-X-02, 13, 14)."""

    model_config = ConfigDict(extra="forbid")

    exorcist_mode: Literal["scripted", "llm"] = "scripted"


class FixApprove(BaseModel):
    model_config = ConfigDict(extra="forbid")

    diff_sha256: Annotated[str, StringConstraints(min_length=64, max_length=64)]
    note: Annotated[str, StringConstraints(max_length=300)] | None = None


class FixReject(BaseModel):
    model_config = ConfigDict(extra="forbid")

    note: Annotated[str, StringConstraints(max_length=300)] | None = None


class ScanCreate(BaseModel):
    """POST /scan for bundled fixture scan or SSRF-guarded public URL scan-only check."""

    model_config = ConfigDict(extra="forbid")

    variant: Literal["broken", "fixed"] | None = None
    url: str | None = None
    audit_type: Literal["all", "keyboard", "labels", "contrast"] = "all"


class RunStore:
    """One SQLite file. Writes happen on the journey thread; reads on the API."""

    def __init__(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init()

    def _init(self) -> None:
        with self._lock:
            self._conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS runs (
                    run_id TEXT PRIMARY KEY,
                    variant TEXT NOT NULL,
                    mode TEXT NOT NULL,
                    status TEXT NOT NULL,
                    verdict TEXT,
                    reason_code TEXT,
                    json TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    seeded INTEGER NOT NULL DEFAULT 0,
                    recorded_at TEXT
                );
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id TEXT NOT NULL,
                    seq INTEGER NOT NULL,
                    json TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS night_watch (
                    id            INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_date      TEXT NOT NULL,
                    run_id        TEXT,
                    journey_id    TEXT NOT NULL,
                    variant       TEXT NOT NULL,
                    agent_mode    TEXT NOT NULL,
                    verdict       TEXT,
                    reason_code   TEXT,
                    status        TEXT NOT NULL,
                    input_tokens  INTEGER NOT NULL DEFAULT 0,
                    output_tokens INTEGER NOT NULL DEFAULT 0,
                    total_tokens  INTEGER NOT NULL DEFAULT 0,
                    cost_usd      REAL NOT NULL DEFAULT 0.0,
                    latency_ms    REAL,
                    error_message TEXT,
                    created_at    TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS ix_night_watch_date ON night_watch(run_date);
                """
            )
            columns = {r["name"] for r in self._conn.execute("PRAGMA table_info(runs)")}
            if "seeded" not in columns:
                self._conn.execute("ALTER TABLE runs ADD COLUMN seeded INTEGER NOT NULL DEFAULT 0")
            if "recorded_at" not in columns:
                self._conn.execute("ALTER TABLE runs ADD COLUMN recorded_at TEXT")
            if "test_details" not in columns:  # nullable, so existing rows keep everything (REQ-TD-05)
                self._conn.execute("ALTER TABLE runs ADD COLUMN test_details TEXT")
            if "scenario" not in columns:
                self._conn.execute("ALTER TABLE runs ADD COLUMN scenario TEXT DEFAULT 'haunted-bank'")
            self._conn.commit()

    def load_seed(self, path: Path) -> int:
        """Insert recorded runs from a committed file. Returns rows added.

        Every row must be a real recorded run. A malformed file stops startup.
        """
        try:
            data = json.loads(Path(path).read_text())
            rows = data["runs"]
            if not isinstance(rows, list):
                raise TypeError("runs must be a list")
        except (OSError, ValueError, KeyError, TypeError) as exc:
            raise RuntimeError(f"Seed file {path} is not valid: {exc}") from exc
        added = 0
        for row in rows:
            try:
                run_id = str(row["run_id"])
                variant, mode, status = row["variant"], row["mode"], row["status"]
                result, recorded_at = row["result"], row["recorded_at"]
                events = row.get("events", [])
                details = row.get("test_details")
                if details is not None and not isinstance(details, dict):
                    raise ValueError("test_details must be an object or null")
                if variant not in {"broken", "fixed"} or mode not in {"llm", "scripted"}:
                    raise ValueError("variant or mode not recognised")
                if status not in {"complete", "error"} or not isinstance(result, dict):
                    raise ValueError("status or result missing")
                if not isinstance(recorded_at, str) or not recorded_at:
                    raise ValueError("recorded_at missing")
            except (KeyError, TypeError, ValueError) as exc:
                raise RuntimeError(f"Seed file {path} has a bad row: {exc}") from exc
            with self._lock:
                cur = self._conn.execute(
                    """
                    INSERT OR IGNORE INTO runs
                      (run_id, variant, mode, status, verdict, reason_code, json, seeded, recorded_at, test_details)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                    """,
                    (
                        run_id, variant, mode, status,
                        result.get("verdict"), result.get("reason_code"),
                        json.dumps(result), recorded_at,
                        json.dumps(details) if details is not None else None,
                    ),
                )
                if cur.rowcount:
                    added += 1
                    for seq, event in enumerate(events, start=1):
                        self._conn.execute(
                            "INSERT INTO events (run_id, seq, json) VALUES (?, ?, ?)",
                            (run_id, seq, json.dumps(event)),
                        )
                self._conn.commit()
        return added

    def prune(self, *, artifacts_root: Path | None = None, now: datetime | None = None) -> None:
        """Drop old live runs and old screenshots. Seeded rows are never removed."""
        now = now or datetime.now(timezone.utc)
        cutoff = (now - UNSEEDED_RUN_MAX_AGE).strftime("%Y-%m-%d %H:%M:%S")
        with self._lock:
            old = [r[0] for r in self._conn.execute(
                "SELECT run_id FROM runs WHERE seeded = 0 AND created_at < ?", (cutoff,))]
            for run_id in old:
                self._conn.execute("DELETE FROM events WHERE run_id = ?", (run_id,))
                self._conn.execute("DELETE FROM runs WHERE run_id = ?", (run_id,))
            self._conn.commit()
        if artifacts_root is not None and Path(artifacts_root).is_dir():
            limit = (now - ARTIFACT_MAX_AGE).timestamp()
            for child in Path(artifacts_root).iterdir():
                try:
                    if child.is_dir() and child.stat().st_mtime < limit:
                        shutil.rmtree(child, ignore_errors=True)
                except OSError:
                    continue

    def insert_running(self, run_id: str, variant: str, mode: str, test_details: dict | None = None, scenario: str = "haunted-bank") -> None:
        with self._lock:
            self._conn.execute(
                "INSERT INTO runs (run_id, variant, mode, status, test_details, scenario) VALUES (?, ?, ?, 'running', ?, ?)",
                (run_id, variant, mode, json.dumps(test_details) if test_details is not None else None, scenario),
            )
            self._conn.commit()

    def append_event(self, run_id: str, event: dict) -> None:
        with self._lock:
            row = self._conn.execute(
                "SELECT COALESCE(MAX(seq), 0) + 1 FROM events WHERE run_id = ?",
                (run_id,),
            ).fetchone()
            seq = int(row[0])
            self._conn.execute(
                "INSERT INTO events (run_id, seq, json) VALUES (?, ?, ?)",
                (run_id, seq, json.dumps(event)),
            )
            self._conn.commit()

    def complete(self, run_id: str, payload: dict, *, status: str) -> None:
        with self._lock:
            self._conn.execute(
                """
                UPDATE runs
                SET status = ?, verdict = ?, reason_code = ?, json = ?
                WHERE run_id = ?
                """,
                (
                    status,
                    payload.get("verdict"),
                    payload.get("reason_code"),
                    json.dumps(payload),
                    run_id,
                ),
            )
            self._conn.commit()

    def get_run(self, run_id: str) -> dict | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT run_id, variant, mode, status, verdict, reason_code, json, seeded, recorded_at, test_details, scenario "
                "FROM runs WHERE run_id = ?",
                (run_id,),
            ).fetchone()
        if row is None:
            return None
        result = json.loads(row["json"]) if row["json"] else None
        return {
            "run_id": row["run_id"],
            "variant": row["variant"],
            "mode": row["mode"],
            "scenario": row["scenario"] or "haunted-bank",
            "status": row["status"],
            "verdict": row["verdict"],
            "reason_code": row["reason_code"],
            "result": result,
            "seeded": bool(row["seeded"]),
            "recorded_at": row["recorded_at"],
            # Only what the tester typed; null for the internal default (REQ-TD-05, 06).
            "test_details": json.loads(row["test_details"]) if row["test_details"] else None,
        }

    def events_after(self, run_id: str, seq: int) -> tuple[list[dict], str] | None:
        with self._lock:
            run = self._conn.execute(
                "SELECT status FROM runs WHERE run_id = ?",
                (run_id,),
            ).fetchone()
            if run is None:
                return None
            rows = self._conn.execute(
                "SELECT seq, json FROM events WHERE run_id = ? AND seq > ? ORDER BY seq",
                (run_id, seq),
            ).fetchall()
        events = [{"seq": row["seq"], "json": row["json"]} for row in rows]
        return events, run["status"]

    def night_watch_history(
        self,
        *,
        limit: int = 100,
        offset: int = 0,
        status: str | None = None,
        journey_id: str | None = None,
        since: str | None = None,
    ) -> dict:
        clauses: list[str] = []
        params: list[object] = []
        if status:
            clauses.append("status = ?")
            params.append(status)
        if journey_id:
            clauses.append("journey_id = ?")
            params.append(journey_id)
        if since:
            clauses.append("run_date >= ?")
            params.append(since)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        with self._lock:
            total = int(
                self._conn.execute(f"SELECT COUNT(*) FROM night_watch {where}", params).fetchone()[0]
            )
            rows = self._conn.execute(
                f"""
                SELECT id, run_date, run_id, journey_id, variant, agent_mode,
                       verdict, reason_code, status,
                       input_tokens, output_tokens, total_tokens, cost_usd,
                       latency_ms, error_message, created_at
                FROM night_watch
                {where}
                ORDER BY run_date DESC, id DESC
                LIMIT ? OFFSET ?
                """,
                [*params, limit, offset],
            ).fetchall()
        return {"rows": [dict(row) for row in rows], "count": total}


class RequestLogMiddleware:
    """One JSON line per request. Pure ASGI so streaming responses are not buffered."""

    def __init__(self, app) -> None:
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        started = time.perf_counter()
        status = {"code": 0}

        async def send_wrapper(message) -> None:
            if message["type"] == "http.response.start":
                status["code"] = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            path = scope.get("path", "")
            if path != "/ping":  # the load balancer calls it every few seconds
                headers = dict(scope.get("headers") or [])
                match = _RUN_ID_IN_PATH.search(path)
                log_event(
                    msg="request",
                    request_id=headers.get(b"x-amzn-trace-id", b"").decode("latin-1") or None,
                    method=scope.get("method"),
                    path=path,
                    status=status["code"],
                    duration_ms=round((time.perf_counter() - started) * 1000, 1),
                    run_id=match.group(1) if match else None,
                )


def create_app(
    db_path: Path | None = None,
    *,
    settings: LimitSettings | None = None,
    clock=time.monotonic,
    seed_path: Path | None | object = _USE_DEFAULT_SEED,
    artifacts_root: Path | None = ARTIFACTS_ROOT,
) -> FastAPI:
    path = db_path or Path(os.getenv("HAUNTED_AUDIT_DB", "data/runs.db"))
    app = FastAPI(title="Haunted Audit keyboard agent", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins(),
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Last-Event-ID"],
        expose_headers=["Retry-After"],
        allow_credentials=False,
    )
    app.add_middleware(RequestLogMiddleware)
    app.state.store = RunStore(path)
    from agent.fixes.store import FixStore
    app.state.fixes = FixStore(path)
    app.state.limiter = RunLimiter(settings or LimitSettings.from_env(), clock)
    app.state.scan_window = SlidingWindow()
    app.state.clock = clock
    app.state.artifacts_root = artifacts_root

    seed = DEFAULT_SEED_PATH if seed_path is _USE_DEFAULT_SEED else seed_path
    if isinstance(seed, (str, Path)) and Path(seed).exists():
        app.state.store.load_seed(Path(seed))
    app.state.store.prune(artifacts_root=artifacts_root)

    @app.get("/ping")
    def ping() -> dict:
        # Load balancer health check. No database, browser or AWS call.
        return {"status": "ok"}

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok"}

    @app.get("/night-watch/history")
    def night_watch_history(
        limit: int = Query(default=100, ge=1, le=500),
        offset: int = Query(default=0, ge=0),
        status: str | None = None,
        journey_id: str | None = None,
        since: str | None = None,
    ) -> dict:
        return app.state.store.night_watch_history(
            limit=limit,
            offset=offset,
            status=status,
            journey_id=journey_id,
            since=since,
        )

    _AUDIT_RULES: dict[str, set[str]] = {
        "labels": {
            "label", "button-name", "link-name", "image-alt", "input-button-name", "select-name",
            "aria-allowed-attr", "aria-required-attr", "aria-valid-attr", "aria-valid-attr-value",
            "html-has-lang", "frame-title", "document-title", "aria-hidden-focus",
        },
        "contrast": {"color-contrast", "color-contrast-enhanced"},
        "keyboard": {
            "tabindex", "bypass", "accesskeys", "focus-order-semantics",
            "scrollable-region-focusable", "nested-interactive", "region",
        },
    }

    def _filter_scan_result(result: dict, audit_type: str) -> dict:
        if audit_type == "all" or audit_type not in _AUDIT_RULES:
            return {**result, "audit_type": "all"}
        allowed = _AUDIT_RULES[audit_type]
        filtered = [f for f in result.get("findings", []) if f.get("rule") in allowed]
        return {
            **result,
            "findings": filtered,
            "count": len(filtered),
            "total_wcag_count": result.get("count", len(filtered)),
            "audit_type": audit_type,
        }

    @app.post("/scan")
    def scan_target(body: ScanCreate, request: Request) -> dict:
        from backend.scanner.axe_scanner import scan_bundled_bank, scan_public_url

        if body.url and body.variant:
            raise HTTPException(status_code=422, detail="Provide either 'variant' or 'url', not both.")
        if not body.url:
            raw = scan_bundled_bank(body.variant or "broken")
            return _filter_scan_result(raw, body.audit_type)

        try:
            resolved = check_url(body.url)
        except BlockedTarget as exc:
            raise HTTPException(status_code=422, detail=exc.message)

        ip = client_ip(request)
        now = app.state.clock()
        wait = app.state.scan_window.peek(ip, limit=1, window_s=60.0, now=now)
        if wait is not None:
            secs = max(1, int(wait))
            raise HTTPException(
                status_code=429,
                detail=f"Public URL scan is limited to 1 per minute. Try again in {secs} seconds.",
                headers={"Retry-After": str(secs)},
            )
        app.state.scan_window.record(ip, now=now)
        try:
            result = scan_public_url(resolved.url)
        except Exception as exc:
            msg = str(exc).splitlines()[0][:180]
            raise HTTPException(
                status_code=504,
                detail=f"Public site scan could not complete ({msg}). Try a fast public URL like https://www.w3.org/WAI/demos/bad/before/home.html.",
            ) from exc
        log_event(msg="public_scan_finished", findings=result["count"])
        return _filter_scan_result(result, body.audit_type)

    @app.get("/sandbox/{scenario_id}", response_class=HTMLResponse)
    def serve_sandbox(
        scenario_id: str,
        variant: Literal["broken", "fixed"] = "broken",
        run_id: str | None = None,
        return_to: str | None = None,
    ) -> HTMLResponse:
        from agent.keyboard_agent.scenarios import scenario_path

        try:
            path = scenario_path(scenario_id)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        html = path.read_text(encoding="utf-8")
        if run_id:
            from urllib.parse import urlsplit

            safe_run = json.dumps(run_id)
            safe_api = json.dumps("")
            # Allow relative /app/fixes paths or full URLs on an allowed CORS origin (for split Vercel + API deploys).
            resolved_redirect = f"/app/fixes/{run_id}"
            if return_to:
                if return_to.startswith("/app/fixes"):
                    resolved_redirect = return_to
                else:
                    parsed = urlsplit(return_to)
                    origin = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else ""
                    if origin in allowed_origins() and parsed.path.startswith("/app/fixes"):
                        resolved_redirect = return_to
            safe_redirect = json.dumps(resolved_redirect)
            observer = (
                "<script>(function(){"
                "const runId=" + safe_run + ";"
                "const api=" + safe_api + "||window.location.origin;"
                "const nextUrl=" + safe_redirect + ";"
                "const ghost=document.createElement('div');"
                "ghost.setAttribute('aria-hidden','true');"
                "ghost.style.cssText='position:fixed;z-index:9998;pointer-events:none;transition:left .32s ease,top .32s ease,transform .25s ease;left:24px;top:24px;display:flex;align-items:center;gap:8px';"
                "function ghostSvg(tone){"
                "const fill=tone==='red'?'#ff5a5a':tone==='green'?'#22c55e':'#a855f7';"
                "const glow=tone==='red'?'rgba(239,68,68,.75)':tone==='green'?'rgba(34,197,94,.75)':'rgba(168,85,247,.7)';"
                "return '<svg width=\"48\" height=\"48\" viewBox=\"0 0 120 120\" style=\"filter:drop-shadow(0 0 10px '+glow+')\"><path d=\"M60 6C36 6 24 26 24 48c0 6-4 12-12 18 8 3 14 1 18-2-2 14-6 26-14 38 12 2 22-2 28-8 4 10 12 14 22 12 8 6 18 6 24-2 8 6 18 4 22-2-8-12-10-26-10-40 4 3 10 5 18 2-8-6-12-12-12-18C96 26 84 6 60 6z\" fill=\"'+fill+'\"/><ellipse cx=\"47\" cy=\"52\" rx=\"6\" ry=\"8\" fill=\"#120b24\"/><ellipse cx=\"73\" cy=\"52\" rx=\"6\" ry=\"8\" fill=\"#120b24\"/></svg>';"
                "}"
                "const bubble=document.createElement('span');"
                "bubble.style.cssText='background:#120b24;color:#fff;border:1px solid #a855f7;border-radius:10px;padding:6px 10px;font:700 12px/1.3 ui-sans-serif,system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.55);max-width:220px';"
                "bubble.textContent='Walking page...';"
                "ghost.innerHTML=ghostSvg('green');ghost.appendChild(bubble);document.body.appendChild(ghost);"
                "const bar=document.createElement('div');"
                "bar.style.cssText='position:fixed;bottom:12px;right:12px;left:12px;z-index:9999;max-width:390px;margin-left:auto;background:#120b24;color:#f3efff;border:1.5px solid #22c55e;border-radius:12px;padding:12px 14px;font:600 13px/1.4 ui-sans-serif,system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.6)';"
                "bar.innerHTML='<div style=\"color:#6ee7a0;font-size:11px;text-transform:uppercase;letter-spacing:.08em\">Haunted Audit Live Ghost Guide</div><div id=\"ha-live-msg\">Connecting to sandbox runner...</div>';"
                "document.body.appendChild(bar);"
                "let lastHighlighted=null;"
                "function highlight(sel,label,tone){"
                "if(lastHighlighted){lastHighlighted.style.outline='';lastHighlighted.style.boxShadow='';}"
                "const color=tone==='red'?'#ef4444':tone==='green'?'#22c55e':'#fbbf24';"
                "const glow=tone==='red'?'rgba(239,68,68,.55)':tone==='green'?'rgba(34,197,94,.5)':'rgba(251,191,36,.55)';"
                "if(sel){try{const el=document.querySelector(sel);if(el){lastHighlighted=el;el.style.outline='3px solid '+color;el.style.boxShadow='0 0 18px '+glow;el.scrollIntoView({block:'nearest'});const r=el.getBoundingClientRect();ghost.firstElementChild.outerHTML=ghostSvg(tone||'green');ghost.style.left=Math.max(8,Math.min(window.innerWidth-260,r.right-24))+'px';ghost.style.top=Math.max(8,r.top-8)+'px';bubble.style.borderColor=color;bubble.textContent=label||'Inspecting';}}catch(e){}}"
                "if(label)document.getElementById('ha-live-msg').textContent=label;"
                "}"
                "const es=new EventSource(api+'/runs/'+encodeURIComponent(runId)+'/events');"
                "es.onmessage=function(ev){try{const d=JSON.parse(ev.data);"
                "const hint=d.focused_after&&d.focused_after.selector_hint;"
                "const targetBefore=d.focused_before&&d.focused_before.selector_hint;"
                "if(d.tool==='type_text'&&d.args&&typeof d.args.text==='string'){const f=targetBefore?document.querySelector(targetBefore):document.activeElement;if(f&&'value' in f){f.value=d.args.text;}}"
                "const t=d.tool==='declare_done'?'amber':'green';"
                "highlight(hint,'Step '+d.step+': '+d.tool+(hint?' -> '+hint:''),t);"
                "}catch(e){}};"
                "es.addEventListener('done',function(){es.close();fetch(api+'/runs/'+encodeURIComponent(runId)).then(r=>r.json()).then(rec=>{"
                "const res=rec.result||rec;const blocked=res.verdict==='BLOCKED';"
                "bar.style.borderColor=blocked?'#ef4444':'#22c55e';"
                "bar.firstElementChild.style.color=blocked?'#ff8a8a':'#6ee7a0';"
                "const msg=blocked?('BLOCKED: '+(res.reason_code||'')+' '+(res.blocked_element&&res.blocked_element.selector||'')):'PASSED cleanly'; "
                "document.getElementById('ha-live-msg').textContent=msg+' · Redirecting to Fixes...';"
                "if(blocked&&res.blocked_element&&res.blocked_element.selector){highlight(res.blocked_element.selector,'Ghost caught: '+res.reason_code,'red');}"
                "else if(!blocked){highlight('[data-testid=\"payment-confirmation\"]','Journey Verified!','green');}"
                "setTimeout(function(){window.location.assign(nextUrl);},1400);"
                "}).catch(function(){});});"
                "})();</script>"
            )
            html = html.replace("</body>", observer + "</body>")
        return HTMLResponse(content=html)

    @app.post("/runs", status_code=202)
    def create_run(body: RunCreate, request: Request) -> dict:
        limiter: RunLimiter = app.state.limiter
        try:
            limiter.admit(client_ip(request), body.mode)
        except Refusal as refusal:
            headers = {"Retry-After": str(refusal.retry_after)} if refusal.retry_after else None
            raise HTTPException(status_code=refusal.status, detail=refusal.message, headers=headers)
        run_id = str(uuid.uuid4())
        try:
            app.state.store.insert_running(run_id, body.variant, body.mode, body.test_details(), body.scenario)
            thread = threading.Thread(
                target=_execute_run,
                args=(app.state.store, run_id, body, limiter, app.state.artifacts_root),
                daemon=True,
                name=f"journey-{run_id[:8]}",
            )
            thread.start()
        except Exception:
            limiter.release()
            raise
        log_event(msg="run_started", run_id=run_id, variant=body.variant, mode=body.mode)
        return {"run_id": run_id, "status": "running"}

    @app.post("/voice-runs", status_code=202)
    def create_voice_run(body: VoiceRunCreate, request: Request) -> dict:
        limiter: RunLimiter = app.state.limiter
        try:
            limiter.admit(client_ip(request), "scripted")
        except Refusal as refusal:
            headers = {"Retry-After": str(refusal.retry_after)} if refusal.retry_after else None
            raise HTTPException(status_code=refusal.status, detail=refusal.message, headers=headers)
        run_id = str(uuid.uuid4())
        try:
            app.state.store.insert_running(run_id, body.variant, "scripted", None, body.scenario)
            thread = threading.Thread(
                target=_execute_voice_run,
                args=(app.state.store, run_id, body, limiter),
                daemon=True,
                name=f"voice-{run_id[:8]}",
            )
            thread.start()
        except Exception:
            limiter.release()
            raise
        log_event(msg="voice_run_started", run_id=run_id, variant=body.variant,
                  input_source=body.input_source, commands=len(body.commands))
        return {"run_id": run_id, "status": "running"}

    # ── Fixes: Exorcist, human decision, Verifier, regression check (.kiro/specs/exorcist/) ──
    def _fix_view(fix_id: str) -> dict:
        fix = app.state.fixes.get(fix_id)
        if fix is None:
            raise HTTPException(status_code=404, detail="fix not found")

        def run_summary(run_id):
            if not run_id:
                return None
            rec = app.state.store.get_run(run_id)
            if rec is None:
                return None
            res = rec.get("result") or {}
            return {"run_id": run_id, "status": rec["status"], "verdict": rec["verdict"] if rec["status"] == "complete" else None,
                    "reason_code": rec["reason_code"] if rec["status"] == "complete" else None,
                    "agent_mode": res.get("agent_mode"), "error": res.get("error")}

        verify = run_summary(fix.pop("verify_run_id"))
        regression = run_summary(fix.pop("regression_run_id"))
        verify_voice = run_summary(fix.pop("verify_voice_run_id", None))
        regression_voice = run_summary(fix.pop("regression_voice_run_id", None))
        return {**fix, "verify": verify, "regression": regression,
                "verify_voice": verify_voice, "regression_voice": regression_voice}

    @app.post("/runs/{run_id}/fixes", status_code=201)
    def create_fix(run_id: str, body: FixCreate) -> dict:
        from agent.fixes.exorcist import Refused, propose

        rec = app.state.store.get_run(run_id)
        if rec is None:
            raise HTTPException(status_code=404, detail="run not found")
        if rec["status"] != "complete":
            raise HTTPException(status_code=409, detail={"code": "RUN_NOT_FINISHED", "message": "The run has not finished."})
        result = rec.get("result") or {}
        if rec["verdict"] != "BLOCKED" or result.get("agent_kind", "keyboard") not in {"keyboard", "voice"}:
            raise HTTPException(status_code=409, detail={"code": "NOTHING_TO_FIX",
                                                        "message": "Only a finished, BLOCKED run has a finding to fix."})
        finding = {"reason_code": result.get("reason_code"), "blocked_element": result.get("blocked_element")}
        scenario = rec.get("scenario") or "haunted-bank"
        try:
            prop = propose(finding, body.exorcist_mode, scenario=scenario)
        except Refused as exc:
            raise HTTPException(status_code=409, detail={"code": exc.code, "message": str(exc)})
        fix_id = app.state.fixes.create({
            "run_id": run_id, "variant": rec["variant"], "scenario": scenario, "reason_code": finding["reason_code"],
            "blocked_element": finding["blocked_element"], "reason": prop.reason,
            "diff": prop.checked.diff if prop.checked else None,
            "diff_sha256": prop.checked.sha256 if prop.checked else None,
            "changed_lines": prop.checked.changed_lines if prop.checked else None,
            "exorcist_mode": prop.exorcist_mode, "exorcist_model_id": prop.model_id,
            "input_tokens": prop.input_tokens, "output_tokens": prop.output_tokens, "cost_usd": prop.cost_usd,
            "latency_ms": round(prop.latency_ms, 1), "status": prop.status, "error": prop.error,
            "agent_mode": result.get("agent_mode"),
        })
        log_event(msg="fix_proposed", fix_id=fix_id, run_id=run_id, status=prop.status, mode=prop.exorcist_mode)
        return _fix_view(fix_id)

    @app.get("/fixes/{fix_id}")
    def get_fix(fix_id: str) -> dict:
        return _fix_view(fix_id)

    def _decidable(fix_id: str) -> dict:
        fix = app.state.fixes.get(fix_id)
        if fix is None:
            raise HTTPException(status_code=404, detail="fix not found")
        if fix["status"] != "proposed":
            raise HTTPException(status_code=409, detail={"code": "ALREADY_DECIDED",
                                                        "message": f"This fix is {fix['status']}; it can no longer be decided."})
        return fix

    @app.post("/fixes/{fix_id}/approve")
    def approve_fix(fix_id: str, body: FixApprove) -> dict:
        fix = _decidable(fix_id)
        if body.diff_sha256 != fix["diff_sha256"]:
            raise HTTPException(status_code=422, detail={"code": "DIFF_CHANGED",
                                                        "message": "The diff you saw is not the stored diff."})
        app.state.fixes.decide(fix_id, "approved", os.getenv("HAUNTED_AUDIT_ACTOR", "demo user"), body.note)
        log_event(msg="fix_approved", fix_id=fix_id)
        return _fix_view(fix_id)

    @app.post("/fixes/{fix_id}/reject")
    def reject_fix(fix_id: str, body: FixReject) -> dict:
        _decidable(fix_id)
        app.state.fixes.decide(fix_id, "rejected", os.getenv("HAUNTED_AUDIT_ACTOR", "demo user"), body.note)
        log_event(msg="fix_rejected", fix_id=fix_id)
        return _fix_view(fix_id)

    def _start_copy_run(fix: dict, kind: str, request: Request) -> dict:
        from agent.fixes import verifier

        limiter: RunLimiter = app.state.limiter
        try:
            limiter.admit(client_ip(request), "scripted")
        except Refusal as refusal:
            headers = {"Retry-After": str(refusal.retry_after)} if refusal.retry_after else None
            raise HTTPException(status_code=refusal.status, detail=refusal.message, headers=headers)
        scen = fix.get("scenario") or "haunted-bank"
        try:
            copy = (verifier.patched_copy if kind == "verify" else verifier.reintroduced_copy)(
                fix["fix_id"], fix["diff"], scenario=scen,
            )
        except Exception as exc:
            limiter.release()
            raise HTTPException(status_code=409, detail={"code": "DIFF_NO_LONGER_APPLIES", "message": str(exc)})
        run_id, voice_run_id = str(uuid.uuid4()), str(uuid.uuid4())
        original = app.state.store.get_run(fix["run_id"]) or {}
        body = RunCreate(variant="broken", mode="scripted", scenario=scen, **(original.get("test_details") or {}))
        voice_commands = _voice_commands(body)
        store = app.state.store
        url = verifier.start_url(copy)
        artifacts_root = app.state.artifacts_root

        def both() -> None:
            voice_started = False
            try:
                _execute_run(store, run_id, body, None, artifacts_root,
                             start_url=url)
                voice_started = True
                _execute_voice_run(store, voice_run_id,
                                   VoiceRunCreate(variant="broken", scenario=scen, commands=voice_commands, input_source="typed"),
                                   None, start_url=url)
            finally:
                if not voice_started:  # never leave the voice run "running" when it could not start
                    store.complete(voice_run_id, {"run_id": voice_run_id, "error": "the keyboard run failed first",
                                                  "verdict": "BLOCKED"}, status="error")
                limiter.release()

        try:
            store.insert_running(run_id, "broken", "scripted", body.test_details(), scen)
            store.insert_running(voice_run_id, "broken", "scripted", None, scen)
            app.state.fixes.link_run(fix["fix_id"], kind, run_id, voice_run_id)
            threading.Thread(target=both, daemon=True, name=f"{kind}-{run_id[:8]}").start()
        except Exception:
            limiter.release()
            raise
        log_event(msg=f"fix_{kind}_started", fix_id=fix["fix_id"], run_id=run_id, voice_run_id=voice_run_id)
        return {"run_id": run_id, "status": "running", "voice_run_id": voice_run_id}

    @app.post("/fixes/{fix_id}/verify", status_code=202)
    def verify_fix(fix_id: str, request: Request) -> dict:
        fix = app.state.fixes.get(fix_id)
        if fix is None:
            raise HTTPException(status_code=404, detail="fix not found")
        if fix["status"] != "approved":
            raise HTTPException(status_code=409, detail={"code": "NOT_APPROVED",
                                                        "message": "A person must approve the fix before it is verified."})
        return _start_copy_run(fix, "verify", request)

    @app.post("/fixes/{fix_id}/regression", status_code=202)
    def regression_fix(fix_id: str, request: Request) -> dict:
        view = _fix_view(fix_id)
        if not view["verify"] or view["verify"]["verdict"] != "PASSED":
            raise HTTPException(status_code=409, detail={"code": "NOT_VERIFIED",
                                                        "message": "The regression check runs only after the fix has been verified PASSED."})
        fix = app.state.fixes.get(fix_id)
        return _start_copy_run(fix, "regression", request)

    @app.get("/runs/{run_id}")
    def get_run(run_id: str) -> dict:
        record = app.state.store.get_run(run_id)
        if record is None:
            raise HTTPException(status_code=404, detail="run not found")
        return record

    @app.get("/runs/{run_id}/events")
    def stream_events(
        run_id: str,
        last_event_id: str | None = Header(default=None, alias="Last-Event-ID"),
    ) -> StreamingResponse:
        if app.state.store.get_run(run_id) is None:
            raise HTTPException(status_code=404, detail="run not found")
        try:
            start_after = max(0, int(last_event_id)) if last_event_id else 0
        except ValueError:
            start_after = 0
        return StreamingResponse(
            _event_stream(app.state.store, run_id, start_after),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    return app


# The voice-command simulation the Verifier replays on a copy of the bank (loop-evidence REQ-LE-01). Typed, no microphone.
VOICE_REPLAY = ('type "Test Recipient" in Recipient', "type 10.00 in Amount", "click Send Payment")


def _voice_commands(body: RunCreate) -> list[str]:
    """The voice replay types the original run's details when the tester typed them, else VOICE_REPLAY."""
    submit = f"click {get_scenario(body.scenario).submit_label}"
    if body.test_details() is None:
        return [VOICE_REPLAY[0], VOICE_REPLAY[1], submit]

    def quoted(v: str) -> str:
        return f"'{v}'" if '"' in v and "'" not in v else f'"{v}"'

    commands = [f"type {quoted(body.recipient)} in Recipient"] if body.recipient else []
    if body.amount:
        commands.append(f"type {quoted(body.amount)} in Amount")
    if body.reference:
        commands.append(f"type {quoted(body.reference)} in Reference")
    return commands + [submit]


def _execute_run(
    store: RunStore,
    run_id: str,
    body: RunCreate,
    limiter: RunLimiter | None = None,
    artifacts_root: Path | None = ARTIFACTS_ROOT,
    start_url: str | None = None,
) -> None:
    def on_event(event) -> None:
        store.append_event(run_id, event.model_dump(mode="json"))

    started = time.perf_counter()
    status = "error"
    verdict = None
    try:
        config = build_journey_config(
            body.variant,
            body.mode,
            scenario=body.scenario,
            max_steps=body.max_steps,
            timeout_seconds=body.timeout_seconds,
            artifacts_dir="artifacts/api",
            # Typed details go through as typed (a missing Reference stays empty). An old request with no
            # details gets the whole internal default instead (user-typed-test-details REQ-TD-06).
            **(body.test_details() or {}),
            **({"start_url": start_url} if start_url else {}),
        )
        result = run_journey(config, on_event=on_event, run_id=run_id)
        status = "error" if result.error else "complete"
        verdict = result.verdict
        store.complete(run_id, result.model_dump(mode="json"), status=status)
    except Exception as exc:
        store.complete(
            run_id,
            {"run_id": run_id, "error": str(exc), "verdict": "BLOCKED"},
            status="error",
        )
    finally:
        if limiter is not None:
            limiter.release()
        log_event(
            msg="run_finished",
            run_id=run_id,
            variant=body.variant,
            mode=body.mode,
            status=status,
            verdict=verdict,
            latency_ms=round((time.perf_counter() - started) * 1000, 1),
        )
        try:
            store.prune(artifacts_root=artifacts_root)
        except Exception:  # housekeeping must never fail a run
            pass


def _execute_voice_run(store: RunStore, run_id: str, body: VoiceRunCreate, limiter: RunLimiter | None = None,
                       start_url: str | None = None) -> None:
    from agent.voice_agent.runner import run_voice_journey

    started = time.perf_counter()
    status = "error"
    verdict = None
    try:
        result = run_voice_journey(
            body.variant, body.commands, body.input_source,
            on_event=lambda event: store.append_event(run_id, event.model_dump(mode="json")),
            run_id=run_id,
            start_url=start_url,
            scenario=body.scenario,
        )
        status = "error" if result.error else "complete"
        verdict = result.verdict
        store.complete(run_id, result.model_dump(mode="json"), status=status)
    except Exception as exc:
        store.complete(run_id, {"run_id": run_id, "error": str(exc), "verdict": "BLOCKED"}, status="error")
    finally:
        if limiter is not None:
            limiter.release()
        log_event(msg="voice_run_finished", run_id=run_id, variant=body.variant, status=status, verdict=verdict,
                  latency_ms=round((time.perf_counter() - started) * 1000, 1))


async def _event_stream(
    store: RunStore,
    run_id: str,
    start_after: int = 0,
    *,
    keepalive: float = KEEPALIVE_SECONDS,
    clock=time.monotonic,
    poll: float = 0.2,
):
    cursor = start_after
    last_sent = clock()
    while True:
        page = store.events_after(run_id, cursor)
        if page is None:
            payload = json.dumps({"error": "run not found"})
            yield f"event: error\ndata: {payload}\n\n"
            return
        events, status = page
        for event in events:
            cursor = event["seq"]
            last_sent = clock()
            yield f"id: {cursor}\ndata: {event['json']}\n\n"
        if status in {"complete", "error"}:
            payload = json.dumps({"run_id": run_id, "status": status})
            yield f"event: done\ndata: {payload}\n\n"
            return
        if clock() - last_sent >= keepalive:
            last_sent = clock()
            # SSE comment: ignored by EventSource, keeps the load balancer from closing an idle stream.
            yield ": keep-alive\n\n"
        await asyncio.sleep(poll)


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
