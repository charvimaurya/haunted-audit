"""Unit tests for night_watch.run_journeys (night-watch REQ-TEST-01)."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import httpx
import pytest

from night_watch import run_journeys


def _mock_client(handler) -> httpx.Client:
    return httpx.Client(transport=httpx.MockTransport(handler), base_url="http://mock.api")


def test_happy_path_scripted_runs_pass(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys) -> None:
    db = tmp_path / "runs.db"
    monkeypatch.setattr(run_journeys, "_check_aws_credentials", lambda: (False, "no creds"))

    posted: list[dict] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST" and request.url.path == "/runs":
            body = json.loads(request.content.decode())
            posted.append(body)
            idx = len(posted)
            return httpx.Response(202, json={"run_id": f"run-{idx}", "status": "running"})
        if request.method == "GET" and request.url.path.startswith("/runs/"):
            rid = request.url.path.rsplit("/", 1)[-1]
            variant = "broken" if rid == "run-1" else "fixed"
            verdict = "BLOCKED" if variant == "broken" else "PASSED"
            reason = "TARGET_NOT_FOCUSABLE" if variant == "broken" else None
            return httpx.Response(
                200,
                json={
                    "run_id": rid,
                    "status": "complete",
                    "variant": variant,
                    "mode": "scripted",
                    "verdict": verdict,
                    "reason_code": reason,
                    "result": {
                        "verdict": verdict,
                        "reason_code": reason,
                        "latency_ms": 412.5,
                        "tokens": {"input_tokens": 99, "output_tokens": 99, "total_tokens": 198},
                        "cost_usd": 1.23,
                    },
                },
            )
        raise AssertionError(f"Unexpected request {request.method} {request.url}")

    client = _mock_client(handler)
    summary = run_journeys.run_night_watch(db_path=db, poll_interval=0.0, client=client)

    assert summary["regressions"] == 0
    assert summary["failures"] == 0
    assert summary["skipped"] == 2
    assert summary["exit_code"] == 0
    assert summary["runs"][0]["status"] == "pass"
    assert summary["runs"][0]["tokens"] == {"input": 0, "output": 0, "total": 0}
    assert summary["runs"][0]["cost_usd"] == 0.0
    assert summary["runs"][1]["status"] == "pass"
    assert "AWS credentials not configured" in capsys.readouterr().err


def test_regression_detected_when_fixed_variant_blocked(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    db = tmp_path / "runs.db"
    monkeypatch.setattr(run_journeys, "_check_aws_credentials", lambda: (False, "no creds"))

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST":
            variant = json.loads(request.content.decode())["variant"]
            return httpx.Response(202, json={"run_id": f"run-{variant}", "status": "running"})
        rid = request.url.path.rsplit("/", 1)[-1]
        return httpx.Response(
            200,
            json={
                "run_id": rid,
                "status": "complete",
                "verdict": "BLOCKED",
                "reason_code": "TARGET_NOT_FOCUSABLE",
                "result": {
                    "verdict": "BLOCKED",
                    "reason_code": "TARGET_NOT_FOCUSABLE",
                    "latency_ms": 250.0,
                },
            },
        )

    summary = run_journeys.run_night_watch(db_path=db, poll_interval=0.0, client=_mock_client(handler))
    assert summary["regressions"] == 1
    assert summary["exit_code"] == 1
    fixed_row = next(r for r in summary["runs"] if r["variant"] == "fixed" and r["agent_mode"] == "scripted")
    assert fixed_row["status"] == "regression"


def test_infra_failure_returns_exit_0_and_writes_rows(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    db = tmp_path / "runs.db"
    monkeypatch.setattr(run_journeys, "_check_aws_credentials", lambda: (False, "no creds"))

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    summary = run_journeys.run_night_watch(db_path=db, poll_interval=0.0, client=_mock_client(handler))
    assert summary["exit_code"] == 0
    assert summary["failures"] == 2
    scripted_runs = [r for r in summary["runs"] if r["agent_mode"] == "scripted"]
    assert all(r["status"] == "infra_failure" for r in scripted_runs)
    assert all("Backend unreachable:" in (r["error"] or "") for r in scripted_runs)
    with sqlite3.connect(db) as conn:
        count = conn.execute("SELECT COUNT(*) FROM night_watch").fetchone()[0]
    assert count == 4


def test_dry_run_makes_no_http_calls_or_db_writes(tmp_path: Path) -> None:
    db = tmp_path / "runs.db"
    summary = run_journeys.run_night_watch(dry_run=True, db_path=db)
    assert summary["dry_run"] is True
    assert summary["exit_code"] == 0
    assert summary["skipped"] == len(run_journeys.JOURNEY_MANIFEST)
    assert all(r["status"] == "skipped" for r in summary["runs"])
    assert not db.exists()


def test_write_evidence_row_is_idempotent_same_utc_day(tmp_path: Path) -> None:
    db = tmp_path / "runs.db"
    wrote1 = run_journeys._write_evidence_row(
        db,
        run_date="2026-11-27",
        run_id="r-1",
        journey_id="send-payment",
        variant="broken",
        agent_mode="scripted",
        verdict="BLOCKED",
        reason_code="TARGET_NOT_FOCUSABLE",
        status="pass",
    )
    wrote2 = run_journeys._write_evidence_row(
        db,
        run_date="2026-11-27",
        run_id="r-2",
        journey_id="send-payment",
        variant="broken",
        agent_mode="scripted",
        verdict="BLOCKED",
        reason_code="TARGET_NOT_FOCUSABLE",
        status="pass",
    )
    assert wrote1 is True
    assert wrote2 is False
    with sqlite3.connect(db) as conn:
        assert conn.execute("SELECT COUNT(*) FROM night_watch").fetchone()[0] == 1


def test_llm_runs_skipped_when_credentials_absent_single_warning(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys
) -> None:
    db = tmp_path / "runs.db"
    monkeypatch.setattr(run_journeys, "_check_aws_credentials", lambda: (False, "missing"))

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST":
            variant = json.loads(request.content.decode())["variant"]
            return httpx.Response(202, json={"run_id": f"r-{variant}", "status": "running"})
        variant = "broken" if request.url.path.endswith("r-broken") else "fixed"
        verdict = "BLOCKED" if variant == "broken" else "PASSED"
        return httpx.Response(
            200,
            json={"run_id": f"r-{variant}", "status": "complete", "verdict": verdict, "result": {"verdict": verdict}},
        )

    summary = run_journeys.run_night_watch(db_path=db, poll_interval=0.0, client=_mock_client(handler))
    llm_runs = [r for r in summary["runs"] if r["agent_mode"] == "llm"]
    assert len(llm_runs) == 2
    assert all(r["status"] == "skipped" and r["error"] == "AWS credentials not configured" for r in llm_runs)
    err = capsys.readouterr().err
    assert err.count("AWS credentials not configured") == 1
