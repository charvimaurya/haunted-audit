"""POST /runs, GET /runs/{id}, and GET /runs/{id}/events (SSE).

Each run is one SQLite row plus the step events the dashboard streams while
the agent is still moving.
"""

from __future__ import annotations

import asyncio
import json
import os
import sqlite3
import threading
import uuid
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from agent.keyboard_agent.runner import build_journey_config, run_journey

load_dotenv()


class RunCreate(BaseModel):
    variant: Literal["broken", "fixed"] = "broken"
    mode: Literal["llm", "scripted"] = "scripted"
    max_steps: int = Field(default=25, ge=1, le=80)
    timeout_seconds: float = Field(default=90, ge=0, le=300)


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
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id TEXT NOT NULL,
                    seq INTEGER NOT NULL,
                    json TEXT NOT NULL
                );
                """
            )
            self._conn.commit()

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
                "SELECT run_id, variant, mode, status, verdict, reason_code, json FROM runs WHERE run_id = ?",
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


def create_app(db_path: Path | None = None) -> FastAPI:
    path = db_path or Path(os.getenv("HAUNTED_AUDIT_DB", "data/runs.db"))
    app = FastAPI(title="Haunted Audit keyboard agent", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.state.store = RunStore(path)

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok"}

    @app.post("/runs", status_code=202)
    def create_run(body: RunCreate) -> dict:
        run_id = str(uuid.uuid4())
        app.state.store.insert_running(run_id, body.variant, body.mode)
        thread = threading.Thread(
            target=_execute_run,
            args=(app.state.store, run_id, body),
            daemon=True,
            name=f"journey-{run_id[:8]}",
        )
        thread.start()
        return {"run_id": run_id, "status": "running"}

    @app.get("/runs/{run_id}")
    def get_run(run_id: str) -> dict:
        record = app.state.store.get_run(run_id)
        if record is None:
            raise HTTPException(status_code=404, detail="run not found")
        return record

    @app.get("/runs/{run_id}/events")
    def stream_events(run_id: str) -> StreamingResponse:
        if app.state.store.get_run(run_id) is None:
            raise HTTPException(status_code=404, detail="run not found")
        return StreamingResponse(
            _event_stream(app.state.store, run_id),
            media_type="text/event-stream",
        )

    return app


def _execute_run(store: RunStore, run_id: str, body: RunCreate) -> None:
    def on_event(event) -> None:
        store.append_event(run_id, event.model_dump(mode="json"))

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
        store.complete(run_id, result.model_dump(mode="json"), status=status)
    except Exception as exc:
        store.complete(
            run_id,
            {"run_id": run_id, "error": str(exc), "verdict": "BLOCKED"},
            status="error",
        )


async def _event_stream(store: RunStore, run_id: str):
    cursor = 0
    while True:
        page = store.events_after(run_id, cursor)
        if page is None:
            payload = json.dumps({"error": "run not found"})
            yield f"event: error\ndata: {payload}\n\n"
            return
        events, status = page
        for event in events:
            cursor = event["seq"]
            yield f"id: {cursor}\ndata: {event['json']}\n\n"
        if status in {"complete", "error"}:
            payload = json.dumps({"run_id": run_id, "status": status})
            yield f"event: done\ndata: {payload}\n\n"
            return
        await asyncio.sleep(0.2)


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
