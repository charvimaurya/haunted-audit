"""Unit tests for llm-agent-eval preflight, run_eval classification/cost guard, reporting, and publish."""

from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from agent.eval import preflight, publish, run_eval
from agent.keyboard_agent.models import BlockedElement, BoundingBox, JourneyResult, StepEvent, TokenUsage


class _FakeBotocoreExc(Exception):
    def __init__(self, code: str, message: str = "") -> None:
        super().__init__(message or code)
        self.response = {"Error": {"Code": code, "Message": message or code}}


class _StubSession:
    def __init__(self, *, sts_exc: Exception | None = None, converse_exc: Exception | None = None) -> None:
        self._sts_exc = sts_exc
        self._converse_exc = converse_exc

    def client(self, service: str, region_name: str = "us-east-1"):
        if service == "sts":
            return SimpleNamespace(get_caller_identity=self._sts_call)
        if service == "bedrock-runtime":
            return SimpleNamespace(converse=self._converse_call)
        raise AssertionError(f"Unexpected service {service}")

    def _sts_call(self):
        if self._sts_exc is not None:
            raise self._sts_exc
        return {"Account": "123456789012", "Arn": "arn:aws:iam::123456789012:user/haunted"}

    def _converse_call(self, **kwargs):
        if self._converse_exc is not None:
            raise self._converse_exc
        return {"usage": {"inputTokens": 3, "outputTokens": 2, "totalTokens": 5}}


def test_preflight_profile_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    class ProfileNotFound(Exception):
        pass

    monkeypatch.setattr(preflight, "_boto_session", lambda p, r: (_ for _ in ()).throw(ProfileNotFound("haunted-audit could not be found")))
    with pytest.raises(preflight.PreflightError) as exc:
        preflight.check_credentials("haunted-audit", "us-east-1")
    assert exc.value.code == "PROFILE_MISSING"
    assert "ProfileNotFound" in exc.value.instruction


@pytest.mark.parametrize(
    ("exc_code", "msg", "expected_code", "expected_snippet"),
    [
        ("ExpiredToken", "token expired", "TOKEN_EXPIRED", "aws sso login"),
        ("AccessDeniedException", "not authorized", "NO_INVOKE_PERMISSION", "AccessDeniedException"),
        ("AccessDeniedException", "AWS Marketplace subscription", "MARKETPLACE_SUBSCRIPTION", "Marketplace"),
        ("AccessDeniedException", "Anthropic use case details", "ANTHROPIC_USE_CASE", "use case"),
        ("ValidationException", "model id invalid", "BAD_MODEL_ID", "BEDROCK_MODEL_ID"),
        ("ThrottlingException", "throttled", "THROTTLED", "ThrottlingException"),
    ],
)
def test_preflight_model_access_errors(
    exc_code: str, msg: str, expected_code: str, expected_snippet: str
) -> None:
    sess = _StubSession(converse_exc=_FakeBotocoreExc(exc_code, msg))
    with pytest.raises(preflight.PreflightError) as exc:
        preflight.check_model_access("haunted-audit", "us-east-1", "us.anthropic.claude-sonnet-4-6", session=sess)
    assert exc.value.code == expected_code
    assert expected_snippet in exc.value.instruction


def test_preflight_success() -> None:
    sess = _StubSession()
    out = preflight.run_preflight("haunted-audit", "us-east-1", "us.anthropic.claude-sonnet-4-6", session=sess)
    assert out["account_id"] == "123456789012"
    assert out["principal_type"] == "iam-user"
    assert out["total_tokens"] == 5


def _step_event() -> StepEvent:
    return StepEvent(step=1, tool="press_tab", args={}, timestamp="2026-11-27T00:00:00Z")


def _fake_result(
    *,
    run_id: str,
    mode: str = "llm",
    variant: str = "broken",
    verdict: str = "BLOCKED",
    reason_code: str | None = "TARGET_NOT_FOCUSABLE",
    error: str | None = None,
    steps: int = 3,
    in_tok: int = 100,
    out_tok: int = 50,
    cost_usd: float = 0.05,
) -> JourneyResult:
    return JourneyResult(
        run_id=run_id,
        verdict=verdict,  # type: ignore[arg-type]
        reason_code=reason_code,  # type: ignore[arg-type]
        step_events=[_step_event() for _ in range(steps)],
        blocked_element=(
            BlockedElement(selector="div.pay-btn", bounding_box=BoundingBox(x=1, y=1, width=10, height=10))
            if variant == "broken"
            else None
        ),
        agent_mode=mode,  # type: ignore[arg-type]
        tokens=TokenUsage(input_tokens=in_tok, output_tokens=out_tok, total_tokens=in_tok + out_tok),
        latency_ms=500.0,
        cost_usd=cost_usd,
        variant=variant,
        goal="pay",
        error=error,
    )


def test_setup_error_before_step_is_not_run_while_mid_run_error_is_incorrect() -> None:
    pre_step = _fake_result(run_id="r-pre", steps=0, error="ThrottlingException")
    mid_run = _fake_result(run_id="r-mid", steps=2, error="Timeout during step")
    pre_row = run_eval.serialize_run(pre_step)
    mid_row = run_eval.serialize_run(mid_run)

    assert pre_row["setup_error"] == "ThrottlingException"
    assert pre_row["correct"] is False
    assert mid_row["setup_error"] is None
    assert mid_row["correct"] is False

    payload = run_eval.build_report_payload(
        [pre_step, mid_run],
        requested=5,
        max_steps=25,
        timeout_seconds=90,
        max_cost_usd=10.0,
        model_id="m",
        region="us-east-1",
        commit="abc",
        commit_dirty=False,
    )
    assert payload["summary"][0]["runs_completed"] == 1
    assert payload["totals"]["runs_executed"] == 1
    assert payload["totals"]["runs_not_executed"] == 1
    assert payload["decision"] == "INCOMPLETE"


def test_fewer_than_five_llm_runs_and_cost_guard_produce_incomplete(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        run_eval,
        "run_preflight",
        lambda **kwargs: {"account_id": "123", "principal_type": "iam-user", "total_tokens": 5, "cost_usd": 0.0},
    )
    calls = 0

    def fake_run_journey(cfg):
        nonlocal calls
        calls += 1
        return _fake_result(run_id=f"r-{calls}", variant=cfg.variant, verdict="PASSED" if cfg.variant == "fixed" else "BLOCKED", reason_code=None if cfg.variant == "fixed" else "TARGET_NOT_FOCUSABLE", cost_usd=6.0)

    monkeypatch.setattr(run_eval, "run_journey", fake_run_journey)
    out = tmp_path / "eval"
    rc = run_eval.main(["--modes", "llm", "--variants", "broken,fixed", "--runs", "5", "--max-cost-usd", "5.0", "--out", str(out)])
    assert rc == 0
    payload = json.loads((out / "results.json").read_text(encoding="utf-8"))
    assert payload["decision"] == "INCOMPLETE"
    assert "Stopped by --max-cost-usd guard" in payload["sentence"]
    assert "GO" not in payload["sentence"]


def test_report_totals_equal_row_sums_and_publish_checks(tmp_path: Path) -> None:
    broken = [_fake_result(run_id=f"b-{i}", variant="broken", in_tok=10, out_tok=5, cost_usd=0.01) for i in range(5)]
    fixed = [
        _fake_result(run_id=f"f-{i}", variant="fixed", verdict="PASSED", reason_code=None, in_tok=20, out_tok=10, cost_usd=0.02)
        for i in range(5)
    ]
    payload = run_eval.build_report_payload(
        broken + fixed,
        requested=5,
        max_steps=25,
        timeout_seconds=90,
        max_cost_usd=10.0,
        model_id="claude",
        region="us-east-1",
        preflight_info={"cost_usd": 0.001},
        commit="deadbeef",
        commit_dirty=False,
    )
    assert payload["decision"] == "GO"
    assert payload["totals"]["input_tokens"] == sum(r["input_tokens"] for r in payload["runs"])
    assert payload["totals"]["output_tokens"] == sum(r["output_tokens"] for r in payload["runs"])
    assert payload["totals"]["total_tokens"] == sum(r["total_tokens"] for r in payload["runs"])
    assert payload["totals"]["cost_usd"] == pytest.approx(sum(r["cost_usd"] for r in payload["runs"]) + 0.001)

    res_json = tmp_path / "results.json"
    out_md = tmp_path / "eval.md"
    res_json.write_text(json.dumps(payload), encoding="utf-8")
    published = publish.publish_report(res_json, out_md)
    assert "deadbeef" in published.read_text(encoding="utf-8")

    for bad in [{"decision": "NOT RUN", "commit_dirty": False}, {"decision": "INCOMPLETE", "commit_dirty": False}, {"decision": "GO", "commit_dirty": True}]:
        res_json.write_text(json.dumps(bad), encoding="utf-8")
        with pytest.raises(publish.PublishRefused):
            publish.publish_report(res_json, out_md)
