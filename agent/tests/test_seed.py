"""Seeded rows are real recorded runs, load once, and are never pruned."""
from __future__ import annotations

import json
import os
import sqlite3
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from agent.api.limits import LimitSettings
from agent.api.main import RunStore, create_app

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
import export_seed  # noqa: E402


def row(run_id="seed-1", **over):
    base = {
        "run_id": run_id, "variant": "broken", "mode": "scripted", "status": "complete",
        "recorded_at": "2026-11-10T09:00:00Z",
        "result": {"verdict": "BLOCKED", "reason_code": "TARGET_NOT_FOCUSABLE", "agent_mode": "scripted"},
        "events": [{"tool": "press_tab"}, {"tool": "read_focus"}],
    }
    base.update(over)
    return base


def write(tmp_path, runs):
    p = tmp_path / "seed.json"
    p.write_text(json.dumps({"runs": runs}))
    return p


def test_seed_loads_once_and_is_labelled(tmp_path) -> None:
    store = RunStore(tmp_path / "a.db")
    seed = write(tmp_path, [row()])
    assert store.load_seed(seed) == 1
    assert store.load_seed(seed) == 0  # idempotent
    rec = store.get_run("seed-1")
    assert rec["seeded"] is True and rec["recorded_at"] == "2026-11-10T09:00:00Z"
    assert rec["result"]["verdict"] == "BLOCKED"
    events, status = store.events_after("seed-1", 0)
    assert len(events) == 2 and status == "complete"


def test_empty_seed_gives_no_rows(tmp_path) -> None:
    store = RunStore(tmp_path / "a.db")
    assert store.load_seed(write(tmp_path, [])) == 0


@pytest.mark.parametrize(
    "bad",
    [row(variant="sideways"), row(mode="magic"), row(status="running"), row(result=None), row(recorded_at="")],
)
def test_bad_rows_stop_startup(tmp_path, bad) -> None:
    store = RunStore(tmp_path / "a.db")
    with pytest.raises(RuntimeError):
        store.load_seed(write(tmp_path, [bad]))


def test_malformed_files_stop_startup(tmp_path) -> None:
    store = RunStore(tmp_path / "a.db")
    p = tmp_path / "seed.json"
    p.write_text("{not json")
    with pytest.raises(RuntimeError):
        store.load_seed(p)
    p.write_text('{"nope": []}')
    with pytest.raises(RuntimeError):
        store.load_seed(p)


def test_live_runs_are_not_marked_seeded(tmp_path) -> None:
    store = RunStore(tmp_path / "a.db")
    store.insert_running("live-1", "broken", "scripted")
    assert store.get_run("live-1")["seeded"] is False


def test_prune_drops_old_live_rows_and_old_artifacts_but_keeps_seeded(tmp_path) -> None:
    store = RunStore(tmp_path / "a.db")
    store.load_seed(write(tmp_path, [row()]))
    store.insert_running("old", "broken", "scripted")
    store.insert_running("new", "broken", "scripted")
    conn = sqlite3.connect(tmp_path / "a.db")
    conn.execute("UPDATE runs SET created_at = '2020-01-01 00:00:00' WHERE run_id = 'old'")
    conn.commit()
    art = tmp_path / "art"
    (art / "stale").mkdir(parents=True)
    (art / "fresh").mkdir()
    old = time.time() - 3 * 86400
    os.utime(art / "stale", (old, old))
    store.prune(artifacts_root=art)
    assert store.get_run("old") is None
    assert store.get_run("new") is not None and store.get_run("seed-1") is not None
    assert not (art / "stale").exists() and (art / "fresh").exists()


def test_old_database_without_new_columns_is_upgraded(tmp_path) -> None:
    db = tmp_path / "old.db"
    conn = sqlite3.connect(db)
    conn.executescript(
        "CREATE TABLE runs (run_id TEXT PRIMARY KEY, variant TEXT NOT NULL, mode TEXT NOT NULL, "
        "status TEXT NOT NULL, verdict TEXT, reason_code TEXT, json TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);"
        "INSERT INTO runs (run_id, variant, mode, status) VALUES ('x','broken','scripted','complete');"
    )
    conn.commit()
    conn.close()
    assert RunStore(db).get_run("x")["seeded"] is False


def test_app_serves_seeded_run_over_http(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://x.example")
    seed = write(tmp_path, [row()])
    client = TestClient(create_app(tmp_path / "a.db", settings=LimitSettings(), seed_path=seed, artifacts_root=None))
    body = client.get("/runs/seed-1").json()
    assert body["seeded"] is True and body["mode"] == "scripted"


def test_export_refuses_rows_without_a_verdict_and_never_edits(tmp_path) -> None:
    db = tmp_path / "r.db"
    store = RunStore(db)
    store.insert_running("a", "broken", "scripted")
    store.complete("a", {"verdict": "BLOCKED", "reason_code": "TARGET_NOT_FOCUSABLE", "latency_ms": 1234.5}, status="complete")
    store.insert_running("b", "fixed", "scripted")
    store.complete("b", {"error": "boom"}, status="complete")  # no verdict
    out = tmp_path / "seed.json"
    assert export_seed.export(db, out) == 1
    data = json.loads(out.read_text())
    assert data["runs"][0]["run_id"] == "a" and data["runs"][0]["result"]["latency_ms"] == 1234.5
    assert RunStore(tmp_path / "t.db").load_seed(out) == 1  # exported file loads back


def test_committed_seed_file_is_valid_and_only_real_shaped_rows() -> None:
    seed = ROOT / "docs" / "evidence-seed.json"
    assert seed.exists(), "docs/evidence-seed.json must exist (the image copies it)"
    store = RunStore(Path(os.devnull).parent / "unused.db") if False else None
    data = json.loads(seed.read_text())
    assert data["source"] == "scripts/export_seed.py"
    for r in data["runs"]:
        assert r["result"].get("verdict") in {"PASSED", "BLOCKED"}
        assert r["result"].get("agent_mode") == r["mode"]
