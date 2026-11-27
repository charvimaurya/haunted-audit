"""Evidence log for fixes (exorcist REQ-X-12): one row per fix and an append-only history. Rows are never deleted."""
from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

_COLUMNS = [
    "fix_id", "run_id", "variant", "reason_code", "blocked_element", "reason", "diff", "diff_sha256",
    "changed_lines", "exorcist_mode", "exorcist_model_id", "input_tokens", "output_tokens", "cost_usd",
    "latency_ms", "status", "error", "decided_by", "decided_at", "decision_note", "agent_mode", "created_at",
    "verify_run_id", "regression_run_id", "verify_voice_run_id", "regression_voice_run_id", "scenario",
]
# Added after the first release; opened databases get them with ALTER TABLE ADD COLUMN (no row is touched).
_ADDED_COLUMNS = ("verify_voice_run_id", "regression_voice_run_id", "scenario")


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


class FixStore:
    def __init__(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        with self._lock:
            self._conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS fixes (
                    fix_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, variant TEXT, reason_code TEXT,
                    blocked_element TEXT, reason TEXT, diff TEXT, diff_sha256 TEXT, changed_lines INTEGER,
                    exorcist_mode TEXT NOT NULL, exorcist_model_id TEXT, input_tokens INTEGER,
                    output_tokens INTEGER, cost_usd REAL, latency_ms REAL, status TEXT NOT NULL, error TEXT,
                    decided_by TEXT, decided_at TEXT, decision_note TEXT, agent_mode TEXT, created_at TEXT NOT NULL,
                    verify_run_id TEXT, regression_run_id TEXT,
                    verify_voice_run_id TEXT, regression_voice_run_id TEXT,
                    scenario TEXT DEFAULT 'haunted-bank'
                );
                CREATE TABLE IF NOT EXISTS fix_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, fix_id TEXT NOT NULL, at TEXT NOT NULL,
                    event TEXT NOT NULL, detail TEXT
                );
                CREATE TRIGGER IF NOT EXISTS fixes_no_delete BEFORE DELETE ON fixes
                BEGIN SELECT RAISE(ABORT, 'fix rows are never deleted'); END;
                CREATE TRIGGER IF NOT EXISTS fix_events_append_only BEFORE UPDATE ON fix_events
                BEGIN SELECT RAISE(ABORT, 'fix_events is append-only'); END;
                CREATE TRIGGER IF NOT EXISTS fix_events_no_delete BEFORE DELETE ON fix_events
                BEGIN SELECT RAISE(ABORT, 'fix_events is append-only'); END;
                """
            )
            have = {r["name"] for r in self._conn.execute("PRAGMA table_info(fixes)")}
            for col in _ADDED_COLUMNS:
                if col not in have:
                    self._conn.execute(f"ALTER TABLE fixes ADD COLUMN {col} TEXT")
            self._conn.commit()

    def _event(self, fix_id: str, event: str, detail: dict | None = None) -> None:
        self._conn.execute("INSERT INTO fix_events (fix_id, at, event, detail) VALUES (?, ?, ?, ?)",
                           (fix_id, now(), event, json.dumps(detail or {})))

    def create(self, row: dict) -> str:
        fix_id = str(uuid.uuid4())
        row = {**{c: None for c in _COLUMNS}, **row, "fix_id": fix_id, "created_at": now()}
        with self._lock:
            self._conn.execute(
                f"INSERT INTO fixes ({', '.join(_COLUMNS)}) VALUES ({', '.join('?' for _ in _COLUMNS)})",
                [json.dumps(row[c]) if c == "blocked_element" and row[c] is not None else row[c] for c in _COLUMNS],
            )
            self._event(fix_id, row["status"], {"exorcist_mode": row["exorcist_mode"], "error": row["error"]})
            self._conn.commit()
        return fix_id

    def get(self, fix_id: str) -> dict | None:
        with self._lock:
            r = self._conn.execute("SELECT * FROM fixes WHERE fix_id = ?", (fix_id,)).fetchone()
            events = self._conn.execute(
                "SELECT at, event, detail FROM fix_events WHERE fix_id = ? ORDER BY id", (fix_id,)).fetchall()
        if r is None:
            return None
        d = dict(r)
        d["blocked_element"] = json.loads(d["blocked_element"]) if d["blocked_element"] else None
        d["history"] = [{"at": e["at"], "event": e["event"], "detail": json.loads(e["detail"] or "{}")} for e in events]
        return d

    def decide(self, fix_id: str, status: str, actor: str, note: str | None) -> None:
        with self._lock:
            self._conn.execute(
                "UPDATE fixes SET status = ?, decided_by = ?, decided_at = ?, decision_note = ? WHERE fix_id = ?",
                (status, actor, now(), note, fix_id))
            self._event(fix_id, status, {"by": actor, "note": note})
            self._conn.commit()

    def link_run(self, fix_id: str, kind: str, run_id: str, voice_run_id: str | None = None) -> None:
        """The keyboard run and, when given, the voice run on the same copy. One history event for both."""
        assert kind in ("verify", "regression")
        with self._lock:
            self._conn.execute(f"UPDATE fixes SET {kind}_run_id = ?, {kind}_voice_run_id = ? WHERE fix_id = ?",
                               (run_id, voice_run_id, fix_id))
            self._event(fix_id, f"{kind}_started", {"run_id": run_id, "voice_run_id": voice_run_id})
            self._conn.commit()
