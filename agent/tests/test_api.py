"""The API starts a run, stores it, and streams step events."""

from __future__ import annotations

import json
import time

from fastapi.testclient import TestClient

from agent.api.main import create_app


def test_scripted_run_streams_events_and_stores_the_verdict(tmp_path) -> None:
    client = TestClient(create_app(tmp_path / "runs.db"))
    created = client.post("/runs", json={"variant": "broken", "mode": "scripted", "max_steps": 25})
    assert created.status_code == 202
    run_id = created.json()["run_id"]

    deadline = time.time() + 30
    record = client.get(f"/runs/{run_id}").json()
    while record["status"] == "running" and time.time() < deadline:
        time.sleep(0.2)
        record = client.get(f"/runs/{run_id}").json()

    assert record["status"] == "complete"
    assert record["result"]["verdict"] == "BLOCKED"
    assert record["result"]["reason_code"] == "TARGET_NOT_FOCUSABLE"
    assert record["result"]["agent_mode"] == "scripted"

    with client.stream("GET", f"/runs/{run_id}/events") as response:
        assert response.status_code == 200
        body = "".join(response.iter_text())
    assert "event: done" in body
    data_lines = [
        json.loads(line.removeprefix("data: "))
        for line in body.splitlines()
        if line.startswith("data: ") and "run_id" not in line
    ]
    assert data_lines
    assert data_lines[0]["tool"] in {"read_page", "read_focus", "press_tab"}


def test_unknown_run_is_404(tmp_path) -> None:
    client = TestClient(create_app(tmp_path / "runs.db"))
    assert client.get("/runs/missing").status_code == 404


def _seed_night_watch(db_path) -> None:
    from night_watch.run_journeys import _write_evidence_row

    _write_evidence_row(
        db_path,
        run_date="2026-10-31",
        run_id="nw-1",
        journey_id="send-payment",
        variant="broken",
        agent_mode="scripted",
        verdict="BLOCKED",
        reason_code="TARGET_NOT_FOCUSABLE",
        status="pass",
    )
    _write_evidence_row(
        db_path,
        run_date="2026-11-02",
        run_id="nw-2",
        journey_id="send-payment",
        variant="fixed",
        agent_mode="scripted",
        verdict="BLOCKED",
        reason_code="TARGET_NOT_FOCUSABLE",
        status="regression",
    )


def test_night_watch_history_empty_table(tmp_path) -> None:
    client = TestClient(create_app(tmp_path / "runs.db"))
    resp = client.get("/night-watch/history")
    assert resp.status_code == 200
    assert resp.json() == {"rows": [], "count": 0}


def test_night_watch_history_orders_newest_first(tmp_path) -> None:
    db_path = tmp_path / "runs.db"
    client = TestClient(create_app(db_path))
    _seed_night_watch(db_path)
    data = client.get("/night-watch/history").json()
    assert data["count"] == 2
    assert [r["run_date"] for r in data["rows"]] == ["2026-11-02", "2026-10-31"]


def test_night_watch_history_filters_status_and_since(tmp_path) -> None:
    db_path = tmp_path / "runs.db"
    client = TestClient(create_app(db_path))
    _seed_night_watch(db_path)

    by_status = client.get("/night-watch/history?status=regression").json()
    assert by_status["count"] == 1
    assert by_status["rows"][0]["status"] == "regression"

    by_since = client.get("/night-watch/history?since=2026-11-01").json()
    assert by_since["count"] == 1
    assert by_since["rows"][0]["run_date"] == "2026-11-02"


def test_night_watch_history_limit_returns_one_row_and_count(tmp_path) -> None:
    db_path = tmp_path / "runs.db"
    client = TestClient(create_app(db_path))
    _seed_night_watch(db_path)
    data = client.get("/night-watch/history?limit=1").json()
    assert len(data["rows"]) == 1
    assert data["count"] == 2
