"""Night Watch nightly regression runner (night-watch spec REQ-SCRIPT & REQ-LOG).

Runs Send Payment journeys sequentially against the FastAPI backend, persists each
outcome immediately to the append-only ``night_watch`` SQLite table, and prints one
deterministic JSON summary to stdout.
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

_REPO = Path(__file__).resolve().parents[1]
if str(_REPO) not in sys.path:
    sys.path.insert(0, str(_REPO))

JOURNEY_MANIFEST: list[tuple[str, str, str]] = [
    ("send-payment", "broken", "scripted"),
    ("send-payment", "fixed", "scripted"),
    ("send-payment", "broken", "llm"),
    ("send-payment", "fixed", "llm"),
]

DEFAULT_BASE_URL = "http://127.0.0.1:8000"
DEFAULT_DB_PATH = Path("data/runs.db")
DEFAULT_POLL_INTERVAL = 0.5
DEFAULT_POLL_TIMEOUT = 120.0

_SCHEMA_SQL = """
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


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_night_watch_table(conn: sqlite3.Connection) -> None:
    """Create the append-only night_watch table and date index non-destructively."""
    conn.executescript(_SCHEMA_SQL)
    conn.commit()


def _write_evidence_row(
    db_path: Path,
    *,
    run_date: str,
    run_id: str | None,
    journey_id: str,
    variant: str,
    agent_mode: str,
    verdict: str | None,
    reason_code: str | None,
    status: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    total_tokens: int = 0,
    cost_usd: float = 0.0,
    latency_ms: float | None = None,
    error_message: str | None = None,
    created_at: str | None = None,
) -> bool:
    """Write one row immediately if (run_date, journey_id, variant, agent_mode) is not logged yet."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        ensure_night_watch_table(conn)
        existing = conn.execute(
            """
            SELECT 1 FROM night_watch
            WHERE run_date = ? AND journey_id = ? AND variant = ? AND agent_mode = ?
            LIMIT 1
            """,
            (run_date, journey_id, variant, agent_mode),
        ).fetchone()
        if existing is not None:
            return False
        conn.execute(
            """
            INSERT INTO night_watch (
                run_date, run_id, journey_id, variant, agent_mode,
                verdict, reason_code, status,
                input_tokens, output_tokens, total_tokens, cost_usd,
                latency_ms, error_message, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_date,
                run_id,
                journey_id,
                variant,
                agent_mode,
                verdict,
                reason_code,
                status,
                int(input_tokens or 0),
                int(output_tokens or 0),
                int(total_tokens or 0),
                float(cost_usd or 0.0),
                latency_ms,
                error_message,
                created_at or _utc_now().isoformat(),
            ),
        )
        conn.commit()
    return True


def _check_aws_credentials(region: str | None = None) -> tuple[bool, str | None]:
    """Call _require_boto_session from agent.keyboard_agent.agent without inventing state."""
    from agent.keyboard_agent.agent import _require_boto_session

    target_region = region or os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-1"
    try:
        _require_boto_session(target_region)
        return True, None
    except Exception as exc:
        return False, str(exc)


def _classify_run(variant: str, agent_mode: str, record: dict[str, Any]) -> tuple[str, str | None, str | None, str | None]:
    """Determine (status, verdict, reason_code, error_message) strictly from API JourneyResult."""
    result = record.get("result") or {}
    verdict = result.get("verdict") or record.get("verdict")
    reason_code = result.get("reason_code") or record.get("reason_code")
    err = result.get("error")

    if agent_mode == "llm" and err and "AWS credentials" in str(err):
        return "skipped", None, None, "AWS credentials not configured"

    if record.get("status") == "error" or verdict not in {"PASSED", "BLOCKED"}:
        return "fail", verdict, reason_code, str(err or "Journey run failed")

    if variant == "fixed" and verdict == "BLOCKED":
        return "regression", verdict, reason_code, None
    if variant == "broken" and verdict == "PASSED":
        return "regression", verdict, reason_code, None

    return "pass", verdict, reason_code, None


def _tokens_and_cost(agent_mode: str, result: dict[str, Any]) -> tuple[dict[str, int], float]:
    """REQ-LOG-03: scripted mode always records 0 tokens; never record null."""
    if agent_mode == "scripted":
        return {"input": 0, "output": 0, "total": 0}, 0.0
    tokens = result.get("tokens") or {}
    in_tok = int(tokens.get("input_tokens") or 0)
    out_tok = int(tokens.get("output_tokens") or 0)
    tot_tok = int(tokens.get("total_tokens") or (in_tok + out_tok))
    cost = float(result.get("cost_usd") or 0.0)
    return {"input": in_tok, "output": out_tok, "total": tot_tok}, cost


def _build_entry(
    *,
    journey_id: str,
    variant: str,
    agent_mode: str,
    run_id: str | None = None,
    verdict: str | None = None,
    reason_code: str | None = None,
    status: str,
    latency_ms: float | None = None,
    tokens: dict[str, int] | None = None,
    cost_usd: float | None = 0.0,
    error: str | None = None,
) -> dict[str, Any]:
    return {
        "journey_id": journey_id,
        "variant": variant,
        "agent_mode": agent_mode,
        "run_id": run_id,
        "verdict": verdict,
        "reason_code": reason_code,
        "status": status,
        "latency_ms": latency_ms,
        "tokens": tokens if tokens is not None else {"input": 0, "output": 0, "total": 0},
        "cost_usd": cost_usd,
        "error": error,
    }


def _execute_one_journey(
    client: httpx.Client,
    *,
    journey_id: str,
    variant: str,
    agent_mode: str,
    poll_interval: float,
    poll_timeout: float,
) -> dict[str, Any]:
    """POST /runs and poll GET /runs/{id} sequentially until completion or infra failure."""
    try:
        resp = client.post("/runs", json={"variant": variant, "mode": agent_mode})
        if resp.status_code >= 500:
            raise httpx.HTTPStatusError(
                f"HTTP {resp.status_code} from POST /runs",
                request=resp.request,
                response=resp,
            )
        if resp.status_code >= 400:
            detail = None
            try:
                detail = resp.json().get("detail")
            except Exception:
                detail = resp.text
            return _build_entry(
                journey_id=journey_id,
                variant=variant,
                agent_mode=agent_mode,
                status="fail",
                cost_usd=0.0,
                error=str(detail or f"HTTP {resp.status_code}"),
            )

        run_id = resp.json()["run_id"]
        deadline = time.monotonic() + poll_timeout
        while True:
            poll_resp = client.get(f"/runs/{run_id}")
            if poll_resp.status_code >= 500:
                raise httpx.HTTPStatusError(
                    f"HTTP {poll_resp.status_code} from GET /runs/{run_id}",
                    request=poll_resp.request,
                    response=poll_resp,
                )
            record = poll_resp.json()
            if record.get("status") in {"complete", "error"}:
                break
            if time.monotonic() >= deadline:
                return _build_entry(
                    journey_id=journey_id,
                    variant=variant,
                    agent_mode=agent_mode,
                    run_id=run_id,
                    status="fail",
                    cost_usd=0.0,
                    error=f"Timed out waiting for run {run_id}",
                )
            time.sleep(poll_interval)

        result = record.get("result") or {}
        status, verdict, reason_code, error_msg = _classify_run(variant, agent_mode, record)
        tokens, cost_usd = _tokens_and_cost(agent_mode, result)
        latency_ms = result.get("latency_ms")
        return _build_entry(
            journey_id=journey_id,
            variant=variant,
            agent_mode=agent_mode,
            run_id=run_id,
            verdict=verdict,
            reason_code=reason_code,
            status=status,
            latency_ms=float(latency_ms) if latency_ms is not None else None,
            tokens=tokens,
            cost_usd=cost_usd,
            error=error_msg,
        )
    except (httpx.HTTPError, OSError) as exc:
        return _build_entry(
            journey_id=journey_id,
            variant=variant,
            agent_mode=agent_mode,
            status="infra_failure",
            cost_usd=0.0,
            error=f"Backend unreachable: {type(exc).__name__}: {exc}",
        )


def run_night_watch(
    *,
    dry_run: bool = False,
    base_url: str | None = None,
    db_path: Path | None = None,
    poll_interval: float = DEFAULT_POLL_INTERVAL,
    poll_timeout: float = DEFAULT_POLL_TIMEOUT,
    client: httpx.Client | None = None,
) -> dict[str, Any]:
    """Execute the Night Watch manifest and return the summary dictionary."""
    now = _utc_now()
    run_date = now.date().isoformat()
    resolved_db = Path(db_path or os.getenv("HAUNTED_AUDIT_DB", str(DEFAULT_DB_PATH)))
    resolved_url = (base_url or os.getenv("HAUNTED_AUDIT_API_URL") or DEFAULT_BASE_URL).rstrip("/")

    if dry_run:
        runs = [
            _build_entry(
                journey_id=j,
                variant=v,
                agent_mode=m,
                status="skipped",
                cost_usd=0.0,
                error="Dry run",
            )
            for j, v, m in JOURNEY_MANIFEST
        ]
        return {
            "night_watch_at": now.isoformat(),
            "dry_run": True,
            "runs": runs,
            "regressions": 0,
            "failures": 0,
            "skipped": len(runs),
            "exit_code": 0,
        }

    runs: list[dict[str, Any]] = []
    aws_checked = False
    aws_ok = False
    warned_aws = False

    owns_client = client is None
    http_client = client or httpx.Client(base_url=resolved_url, timeout=15.0)
    try:
        for journey_id, variant, agent_mode in JOURNEY_MANIFEST:
            if agent_mode == "llm":
                if not aws_checked:
                    aws_ok, _ = _check_aws_credentials()
                    aws_checked = True
                if not aws_ok:
                    if not warned_aws:
                        print(
                            "Night Watch warning: AWS credentials not configured; skipping llm-mode journeys.",
                            file=sys.stderr,
                        )
                        warned_aws = True
                    entry = _build_entry(
                        journey_id=journey_id,
                        variant=variant,
                        agent_mode=agent_mode,
                        status="skipped",
                        cost_usd=0.0,
                        error="AWS credentials not configured",
                    )
                    _write_evidence_row(
                        resolved_db,
                        run_date=run_date,
                        run_id=None,
                        journey_id=journey_id,
                        variant=variant,
                        agent_mode=agent_mode,
                        verdict=None,
                        reason_code=None,
                        status="skipped",
                        input_tokens=0,
                        output_tokens=0,
                        total_tokens=0,
                        cost_usd=0.0,
                        latency_ms=None,
                        error_message=entry["error"],
                    )
                    runs.append(entry)
                    continue

            entry = _execute_one_journey(
                http_client,
                journey_id=journey_id,
                variant=variant,
                agent_mode=agent_mode,
                poll_interval=poll_interval,
                poll_timeout=poll_timeout,
            )
            _write_evidence_row(
                resolved_db,
                run_date=run_date,
                run_id=entry["run_id"],
                journey_id=journey_id,
                variant=variant,
                agent_mode=agent_mode,
                verdict=entry["verdict"],
                reason_code=entry["reason_code"],
                status=entry["status"],
                input_tokens=entry["tokens"]["input"],
                output_tokens=entry["tokens"]["output"],
                total_tokens=entry["tokens"]["total"],
                cost_usd=float(entry["cost_usd"] or 0.0),
                latency_ms=entry["latency_ms"],
                error_message=entry["error"],
            )
            runs.append(entry)
    finally:
        if owns_client:
            http_client.close()

    regressions = sum(1 for r in runs if r["status"] == "regression")
    failures = sum(1 for r in runs if r["status"] in {"fail", "infra_failure"})
    skipped = sum(1 for r in runs if r["status"] == "skipped")
    exit_code = 1 if regressions > 0 else 0

    return {
        "night_watch_at": now.isoformat(),
        "runs": runs,
        "regressions": regressions,
        "failures": failures,
        "skipped": skipped,
        "exit_code": exit_code,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Night Watch nightly journey regression runner.")
    parser.add_argument("--dry-run", action="store_true", help="Print skipped summary without API calls or DB writes.")
    parser.add_argument("--base-url", default=None, help="FastAPI base URL (default: HAUNTED_AUDIT_API_URL or http://127.0.0.1:8000).")
    parser.add_argument("--db", type=Path, default=None, help="SQLite DB path (default: HAUNTED_AUDIT_DB or data/runs.db).")
    args = parser.parse_args(argv)

    summary = run_night_watch(dry_run=args.dry_run, base_url=args.base_url, db_path=args.db)
    print(json.dumps(summary, indent=2))
    return int(summary["exit_code"])


if __name__ == "__main__":
    raise SystemExit(main())
