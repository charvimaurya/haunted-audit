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
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from agent.api.limits import LimitSettings, Refusal, RunLimiter, client_ip
from agent.keyboard_agent.runner import build_journey_config, run_journey

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
    max_steps: int = Field(default=25, ge=1, le=80)
    timeout_seconds: float = Field(default=90, ge=0, le=300)


class VoiceRunCreate(BaseModel):
    """POST /voice-runs (voice-agent REQ-VA-07). Unknown fields are a 422, as for /runs."""

    model_config = ConfigDict(extra="forbid")

    variant: Literal["broken", "fixed"] = "broken"
    commands: list[Annotated[str, StringConstraints(min_length=1, max_length=200)]] = Field(min_length=1, max_length=10)
    input_source: Literal["typed", "speech"] = "typed"


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
                """
            )
            columns = {r["name"] for r in self._conn.execute("PRAGMA table_info(runs)")}
            if "seeded" not in columns:
                self._conn.execute("ALTER TABLE runs ADD COLUMN seeded INTEGER NOT NULL DEFAULT 0")
            if "recorded_at" not in columns:
                self._conn.execute("ALTER TABLE runs ADD COLUMN recorded_at TEXT")
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
                      (run_id, variant, mode, status, verdict, reason_code, json, seeded, recorded_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
                    """,
                    (
                        run_id, variant, mode, status,
                        result.get("verdict"), result.get("reason_code"),
                        json.dumps(result), recorded_at,
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

    def insert_running(self, run_id: str, variant: str, mode: str) -> None:
        with self._lock:
            self._conn.execute(
                "INSERT INTO runs (run_id, variant, mode, status) VALUES (?, ?, ?, 'running')",
                (run_id, variant, mode),
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
                "SELECT run_id, variant, mode, status, verdict, reason_code, json, seeded, recorded_at "
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
            "status": row["status"],
            "verdict": row["verdict"],
            "reason_code": row["reason_code"],
            "result": result,
            "seeded": bool(row["seeded"]),
            "recorded_at": row["recorded_at"],
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
    app.state.limiter = RunLimiter(settings or LimitSettings.from_env(), clock)
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
            app.state.store.insert_running(run_id, body.variant, body.mode)
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
            app.state.store.insert_running(run_id, body.variant, "scripted")
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


def _execute_run(
    store: RunStore,
    run_id: str,
    body: RunCreate,
    limiter: RunLimiter | None = None,
    artifacts_root: Path | None = ARTIFACTS_ROOT,
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
            max_steps=body.max_steps,
            timeout_seconds=body.timeout_seconds,
            artifacts_dir="artifacts/api",
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


def _execute_voice_run(store: RunStore, run_id: str, body: VoiceRunCreate, limiter: RunLimiter | None = None) -> None:
    from agent.voice_agent.runner import run_voice_journey

    started = time.perf_counter()
    status = "error"
    verdict = None
    try:
        result = run_voice_journey(
            body.variant, body.commands, body.input_source,
            on_event=lambda event: store.append_event(run_id, event.model_dump(mode="json")),
            run_id=run_id,
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
