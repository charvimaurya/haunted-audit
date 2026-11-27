"""Schema round-trip and constraint tests (TASK-02)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from mcp_server.schemas import (
    AxeViolation,
    BlockedElementSummary,
    ErrorDetail,
    FixDiff,
    GetRunOutput,
    ListRegressionTestsOutput,
    ProposeFixOutput,
    RegressionTestEntry,
    RunJourneyInput,
    RunJourneyOutput,
    ScanResult,
    ToolError,
    VerifyFixOutput,
)


def test_output_models_round_trip() -> None:
    models = [
        ScanResult(
            url="http://localhost:5173/",
            scanned_at="2026-11-27T00:00:00Z",
            violations=[
                AxeViolation(
                    rule_id="label",
                    wcag="WCAG 1.3.1 A",
                    impact="serious",
                    selector="#amount",
                    html="<input id='amount'>",
                    failure="Missing label",
                    help_url="https://dequeuniversity.com/rules/axe/4.10/label",
                )
            ],
            passes=10,
            violation_count=1,
        ),
        RunJourneyOutput(run_id="r-1", status="running", journey_id="send-payment", variant="broken", mode="scripted"),
        GetRunOutput(
            run_id="r-1",
            status="complete",
            verdict="BLOCKED",
            reason_code="TARGET_NOT_FOCUSABLE",
            agent_mode="scripted",
            step_count=4,
            blocked_element=BlockedElementSummary(selector="div.pay-btn", tag="div"),
            latency_ms=120.5,
            cost_usd=0.0,
            error=None,
        ),
        ProposeFixOutput(
            run_id="r-1",
            verdict="BLOCKED",
            reason_code="TARGET_NOT_FOCUSABLE",
            blocked_element=BlockedElementSummary(selector="div.pay-btn", tag="div"),
            diff=FixDiff(
                file="fixtures/haunted_bank/index.html",
                before='<div class="pay-btn">Send Payment</div>',
                after='<button type="submit" class="btn-primary">Send Payment</button>',
                wcag="WCAG 2.1.1 A — Keyboard",
                rationale="Make submit control focusable.",
            ),
        ),
        VerifyFixOutput(
            original_run_id="r-1",
            verify_run_id="r-2",
            patched_file="/tmp/verify_1/index.html",
            verdict="PASSED",
            reason_code=None,
            agent_mode="scripted",
            step_count=5,
            message="ok",
        ),
        ListRegressionTestsOutput(
            tests=[
                RegressionTestEntry(
                    name="send-payment",
                    path="tests/journeys/send-payment.spec.ts",
                    journey_id="send-payment",
                    variant="broken",
                    last_result="PASSED",
                    last_run_at="2026-11-27T00:00:00Z",
                )
            ],
            count=1,
        ),
        ToolError(error=ErrorDetail(code="RUN_NOT_FOUND", message="missing", status=404)),
    ]
    for m in models:
        reloaded = type(m).model_validate_json(m.model_dump_json())
        assert reloaded == m


def test_run_journey_input_rejects_invalid_journey_id() -> None:
    with pytest.raises(ValidationError):
        RunJourneyInput(journey_id="invalid", variant="broken")  # type: ignore[arg-type]


def test_propose_fix_warning_constant() -> None:
    out = ProposeFixOutput(
        run_id="r-1",
        verdict="BLOCKED",
        reason_code="TARGET_NOT_FOCUSABLE",
        blocked_element=BlockedElementSummary(selector="div.pay-btn", tag="div"),
        diff=FixDiff(file="a", before="b", after="c", wcag="WCAG 2.1.1 A", rationale="r"),
    )
    assert out.warning == "This diff has not been applied. Human approval required."
