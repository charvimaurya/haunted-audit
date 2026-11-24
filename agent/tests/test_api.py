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
