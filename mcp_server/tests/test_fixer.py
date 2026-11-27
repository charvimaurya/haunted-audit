"""Unit tests for mcp_server.fixer (TASK-11, TASK-12)."""

from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from agent.fixes.exorcist import propose as exorcist_propose
from mcp_server import fixer, journey
from mcp_server.schemas import (
    BlockedElementSummary,
    GetRunOutput,
    ProposeFixOutput,
    RunJourneyOutput,
    ToolError,
    VerifyFixOutput,
)

REPO = Path(__file__).resolve().parents[2]


def _blocked_run(run_id: str = "r-1") -> GetRunOutput:
    return GetRunOutput(
        run_id=run_id,
        status="complete",
        verdict="BLOCKED",
        reason_code="TARGET_NOT_FOCUSABLE",
        agent_mode="scripted",
        step_count=5,
        blocked_element=BlockedElementSummary(selector="div.pay-btn", tag="div", accessible_name="Send Payment"),
        latency_ms=100.0,
        cost_usd=0.0,
        error=None,
    )


def test_propose_fix_returns_diff_and_guards(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("HAUNTED_AUDIT_WORKSPACE", str(REPO))

    async def get_blocked(run_id: str):
        return _blocked_run(run_id)

    monkeypatch.setattr(fixer, "get_run", get_blocked)
    out = asyncio.run(fixer.propose_fix("r-1"))
    assert isinstance(out, ProposeFixOutput)
    assert "div" in out.diff.before
    assert "button" in out.diff.after
    assert out.diff.wcag
    assert out.warning == "This diff has not been applied. Human approval required."

    async def get_passed(run_id: str):
        return _blocked_run(run_id).model_copy(update={"verdict": "PASSED", "reason_code": None, "blocked_element": None})

    monkeypatch.setattr(fixer, "get_run", get_passed)
    no_bar = asyncio.run(fixer.propose_fix("r-2"))
    assert isinstance(no_bar, ToolError) and no_bar.error.code == "NO_BARRIER"

    async def get_running(run_id: str):
        return _blocked_run(run_id).model_copy(update={"status": "running"})

    monkeypatch.setattr(fixer, "get_run", get_running)
    in_prog = asyncio.run(fixer.propose_fix("r-3"))
    assert isinstance(in_prog, ToolError) and in_prog.error.code == "RUN_IN_PROGRESS"


def test_verify_fix_valid_and_malformed_patch_leaves_source_untouched(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("HAUNTED_AUDIT_WORKSPACE", str(REPO))
    bank_file = REPO / "fixtures" / "haunted_bank" / "index.html"
    before_bytes = bank_file.read_bytes()

    async def get_blocked(run_id: str):
        return _blocked_run(run_id)

    async def fake_run_journey(*args, **kwargs):
        return RunJourneyOutput(run_id="verify-1", status="running", journey_id="send-payment", variant="fixed", mode="scripted")

    async def fake_wait(run_id: str, **kwargs):
        return {
            "run_id": run_id,
            "status": "complete",
            "mode": "scripted",
            "verdict": "PASSED",
            "result": {"verdict": "PASSED", "reason_code": None, "agent_mode": "scripted", "step_events": [{"step": 1}]},
        }

    monkeypatch.setattr(fixer, "get_run", get_blocked)
    monkeypatch.setattr(fixer, "run_journey", fake_run_journey)
    monkeypatch.setattr(journey, "wait_for_run", fake_wait)

    valid_diff = exorcist_propose({"reason_code": "TARGET_NOT_FOCUSABLE", "blocked_element": {"tag": "div"}}, "scripted").checked.diff  # type: ignore[union-attr]
    res = asyncio.run(fixer.verify_fix("r-1", valid_diff))
    assert isinstance(res, VerifyFixOutput)
    assert res.verdict == "PASSED"
    assert bank_file.read_bytes() == before_bytes

    bad = asyncio.run(fixer.verify_fix("r-1", "not a valid patch"))
    assert isinstance(bad, ToolError) and bad.error.code == "PATCH_FAILED"
    assert bank_file.read_bytes() == before_bytes
