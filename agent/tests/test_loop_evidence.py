"""loop-evidence LE-01: the Verifier and the regression check replay keyboard and voice on the same copy."""
from __future__ import annotations

import sqlite3
import time

import pytest
from fastapi.testclient import TestClient

from agent.api.main import VOICE_REPLAY, create_app
from agent.fixes.store import FixStore


def _wait(client, run_id, timeout=120):
    for _ in range(timeout * 5):
        rec = client.get(f"/runs/{run_id}").json()
        if rec["status"] != "running":
            return rec
        time.sleep(0.2)
    raise AssertionError("run did not finish")


@pytest.fixture
def client(tmp_path):
    return TestClient(create_app(tmp_path / "runs.db", seed_path=None))


def _click_send(rec) -> dict:
    steps = [e for e in rec["result"]["step_events"] if e["args"].get("name") == "Send Payment"]
    assert len(steps) == 1
    return steps[0]["args"]


def _approved_fix(client) -> str:
    run_id = client.post("/runs", json={"variant": "broken", "mode": "scripted"}).json()["run_id"]
    assert _wait(client, run_id)["verdict"] == "BLOCKED"
    fix = client.post(f"/runs/{run_id}/fixes", json={}).json()
    assert fix["verify_voice"] is None and fix["regression_voice"] is None
    client.post(f"/fixes/{fix['fix_id']}/approve", json={"diff_sha256": fix["diff_sha256"]})
    return fix["fix_id"]


def test_verify_and_regression_replay_voice_with_their_own_run_ids(client):
    fid = _approved_fix(client)

    v = client.post(f"/fixes/{fid}/verify").json()
    assert v["status"] == "running" and v["voice_run_id"] and v["voice_run_id"] != v["run_id"]
    kb, voice = _wait(client, v["run_id"]), _wait(client, v["voice_run_id"])
    assert kb["verdict"] == "PASSED"
    assert voice["status"] == "complete" and voice["verdict"] in {"PASSED", "BLOCKED"}  # the checker decides
    assert voice["result"]["agent_kind"] == "voice" and voice["result"]["agent_mode"] == "scripted"
    assert voice["result"]["goal"] == "Voice commands: " + " / ".join(VOICE_REPLAY)
    # It ran on the patched copy: Send Payment is a real button there, so the voice click works.
    assert _click_send(voice)["outcome"] == "done"

    view = client.get(f"/fixes/{fid}").json()
    assert view["verify_voice"]["run_id"] == v["voice_run_id"]
    assert view["verify_voice"]["verdict"] == voice["verdict"] and view["verify_voice"]["agent_mode"] == "scripted"

    g = client.post(f"/fixes/{fid}/regression").json()
    assert g["voice_run_id"] not in {g["run_id"], v["run_id"], v["voice_run_id"]}
    assert _wait(client, g["run_id"])["verdict"] == "BLOCKED"
    gv = _wait(client, g["voice_run_id"])
    assert gv["verdict"] == "BLOCKED"
    # The bug is back: the voice command cannot find a button named Send Payment.
    assert _click_send(gv)["outcome"] == "failed"

    view = client.get(f"/fixes/{fid}").json()
    assert view["regression_voice"]["run_id"] == g["voice_run_id"]
    starts = [h for h in view["history"] if h["event"].endswith("_started")]
    assert [h["detail"]["voice_run_id"] for h in starts] == [v["voice_run_id"], g["voice_run_id"]]


def test_old_database_gets_the_new_columns_and_keeps_its_rows(tmp_path):
    db = tmp_path / "old.db"
    conn = sqlite3.connect(db)
    conn.executescript(
        """
        CREATE TABLE fixes (
            fix_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, variant TEXT, reason_code TEXT,
            blocked_element TEXT, reason TEXT, diff TEXT, diff_sha256 TEXT, changed_lines INTEGER,
            exorcist_mode TEXT NOT NULL, exorcist_model_id TEXT, input_tokens INTEGER,
            output_tokens INTEGER, cost_usd REAL, latency_ms REAL, status TEXT NOT NULL, error TEXT,
            decided_by TEXT, decided_at TEXT, decision_note TEXT, agent_mode TEXT, created_at TEXT NOT NULL,
            verify_run_id TEXT, regression_run_id TEXT
        );
        INSERT INTO fixes (fix_id, run_id, exorcist_mode, status, created_at, verify_run_id)
        VALUES ('old-fix', 'r0', 'scripted', 'approved', '2026-11-23T00:00:00+00:00', 'kb-run');
        """
    )
    conn.commit()
    conn.close()

    store = FixStore(db)
    row = store.get("old-fix")
    assert row["verify_run_id"] == "kb-run"
    assert row["verify_voice_run_id"] is None and row["regression_voice_run_id"] is None
    store.link_run("old-fix", "regression", "kb2", "voice2")
    row = store.get("old-fix")
    assert row["regression_run_id"] == "kb2" and row["regression_voice_run_id"] == "voice2"
    FixStore(db)  # opening again does not try to add the columns twice
