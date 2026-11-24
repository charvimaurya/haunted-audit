"""User-typed test details (.kiro/specs/user-typed-test-details/, REQ-TD-03 to 08).

The tester's values are what the agents type, the internal default never reaches test_details,
and typed values stay out of the log, the fix view and any list.
"""
from __future__ import annotations

import json
import sqlite3
import time

import pytest
from fastapi.testclient import TestClient

from agent.api.main import create_app
from agent.keyboard_agent.agent import build_user_prompt
from agent.keyboard_agent.models import INTERNAL_DEFAULT_DETAILS, clean_detail
from agent.keyboard_agent.runner import build_journey_config

TYPED = {"recipient": "Test Ghost Q", "amount": "12.34", "reference": "Typed ref 7"}


@pytest.fixture
def client(tmp_path):
    return TestClient(create_app(tmp_path / "runs.db", seed_path=None))


def _wait(client, run_id, timeout=60):
    deadline = time.time() + timeout
    record = client.get(f"/runs/{run_id}").json()
    while record["status"] == "running" and time.time() < deadline:
        time.sleep(0.2)
        record = client.get(f"/runs/{run_id}").json()
    return record


def _typed(record) -> list[str]:
    return [e["args"].get("text") for e in record["result"]["step_events"] if e["tool"] == "type_text"]


def test_an_old_request_without_details_still_works(client) -> None:
    """REQ-TD-06: Night Watch and old callers send no details and get the same verdict as before."""
    record = _wait(client, client.post("/runs", json={"variant": "broken", "mode": "scripted"}).json()["run_id"])
    assert record["status"] == "complete"
    assert (record["verdict"], record["reason_code"]) == ("BLOCKED", "TARGET_NOT_FOCUSABLE")
    assert record["test_details"] is None  # the internal default is never reported as typed
    assert _typed(record) == [INTERNAL_DEFAULT_DETAILS["recipient"], INTERNAL_DEFAULT_DETAILS["amount"]]


def test_typed_details_are_exactly_what_the_agent_types(client) -> None:
    """REQ-TD-03, 05: recipient, amount and reference in tab order, and nothing else."""
    created = client.post("/runs", json={"variant": "fixed", "mode": "scripted", **TYPED})
    assert created.status_code == 202
    record = _wait(client, created.json()["run_id"])
    assert record["verdict"] == "PASSED"
    assert record["test_details"] == TYPED
    assert _typed(record) == [TYPED["recipient"], TYPED["amount"], TYPED["reference"]]
    fields = [e["focused_before"]["selector_hint"] for e in record["result"]["step_events"] if e["tool"] == "type_text"]
    assert [f.split("#")[-1] for f in fields] == ["recipient", "amount", "reference"]
    assert INTERNAL_DEFAULT_DETAILS["recipient"] not in json.dumps(record)


def test_without_a_reference_only_two_values_are_typed(client) -> None:
    body = {"variant": "fixed", "mode": "scripted", "recipient": "Test Ghost Q", "amount": "1.00"}
    record = _wait(client, client.post("/runs", json=body).json()["run_id"])
    assert record["verdict"] == "PASSED"
    assert _typed(record) == ["Test Ghost Q", "1.00"]
    assert record["test_details"] == {"recipient": "Test Ghost Q", "amount": "1.00", "reference": None}


def test_values_are_trimmed(client) -> None:
    body = {"variant": "fixed", "mode": "scripted", "recipient": "  Test Ghost Q ", "amount": " 2.00", "reference": "   "}
    record = _wait(client, client.post("/runs", json=body).json()["run_id"])
    assert record["test_details"] == {"recipient": "Test Ghost Q", "amount": "2.00", "reference": None}


@pytest.mark.parametrize("field", ["recipient", "amount", "reference"])
@pytest.mark.parametrize("bad", ["x" * 41, "a\nb", "a\tb", "a\u202eb", "a\x00b", "a\u2028b"])
def test_a_value_over_40_characters_or_with_a_control_character_is_422(client, field, bad) -> None:
    assert client.post("/runs", json={field: bad}).status_code == 422


def test_forty_characters_is_accepted() -> None:
    assert clean_detail("x" * 40, required=True) == "x" * 40


@pytest.mark.parametrize("field", ["recipient", "amount"])
def test_an_empty_required_value_is_422(client, field) -> None:
    assert client.post("/runs", json={field: "   "}).status_code == 422


def test_unknown_fields_are_still_rejected(client) -> None:
    assert client.post("/runs", json={"recipient": "Test Ghost Q", "url": "https://example.com"}).status_code == 422


def test_typed_values_never_reach_the_log_the_fix_view_or_a_list(client, capsys, caplog) -> None:
    """REQ-TD-07: stored only in the run record, never logged, never listed."""
    caplog.set_level("INFO")
    run_id = client.post("/runs", json={"variant": "broken", "mode": "scripted", **TYPED}).json()["run_id"]
    assert _wait(client, run_id)["verdict"] == "BLOCKED"
    fix = client.post(f"/runs/{run_id}/fixes", json={}).json()
    client.post(f"/fixes/{fix['fix_id']}/approve", json={"diff_sha256": fix["diff_sha256"]})
    verify = client.post(f"/fixes/{fix['fix_id']}/verify").json()
    copy = _wait(client, verify["run_id"], timeout=90)
    # The Verifier typed the original run's details (REQ-TD-03)
    assert copy["test_details"] == TYPED
    assert _typed(copy) == [TYPED["recipient"], TYPED["amount"], TYPED["reference"]]
    assert copy["verdict"] == "PASSED"
    view = json.dumps(client.get(f"/fixes/{fix['fix_id']}").json())
    logged = capsys.readouterr().out + caplog.text
    for value in TYPED.values():
        assert value not in view
        assert value not in logged
    # There is no run list to leak from
    assert client.get("/runs").status_code in {404, 405}


def test_the_seed_carries_test_details_round_trip(tmp_path) -> None:
    """REQ-TD-08: export from runs.db, load at start-up, read back."""
    from scripts.export_seed import export

    db = tmp_path / "runs.db"
    c = TestClient(create_app(db, seed_path=None))
    run_id = c.post("/runs", json={"variant": "fixed", "mode": "scripted", **TYPED}).json()["run_id"]
    _wait(c, run_id)
    out = tmp_path / "seed.json"
    assert export(db, out, modes=("scripted",)) >= 1
    seeded = json.loads(out.read_text())["runs"]
    assert seeded[0]["test_details"] == TYPED
    c2 = TestClient(create_app(tmp_path / "other.db", seed_path=out))
    record = c2.get(f"/runs/{run_id}").json()
    assert record["seeded"] is True and record["test_details"] == TYPED


def test_an_old_database_gains_the_column_without_losing_rows(tmp_path) -> None:
    db = tmp_path / "old.db"
    conn = sqlite3.connect(db)
    conn.executescript(
        "CREATE TABLE runs (run_id TEXT PRIMARY KEY, variant TEXT NOT NULL, mode TEXT NOT NULL, status TEXT NOT NULL,"
        " verdict TEXT, reason_code TEXT, json TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);"
        "INSERT INTO runs (run_id, variant, mode, status, verdict, json) VALUES ('r1', 'fixed', 'scripted', 'complete', 'PASSED', '{}');"
    )
    conn.commit()
    conn.close()
    record = TestClient(create_app(db, seed_path=None)).get("/runs/r1").json()
    assert record["verdict"] == "PASSED" and record["test_details"] is None


def test_the_llm_prompt_quotes_each_typed_value() -> None:
    cfg = build_journey_config("fixed", "scripted", recipient='Test "Q"', amount="3.00", reference="Ref")
    prompt = build_user_prompt(cfg)
    assert 'Recipient to enter: "Test \\"Q\\""' in prompt
    assert 'Reference to enter: "Ref"' in prompt
    assert "Reference" not in build_user_prompt(build_journey_config("fixed", "scripted"))
