"""The scripted walker is the fallback and a drop-in for the agent."""

from __future__ import annotations

from pathlib import Path

from agent.keyboard_agent.runner import build_journey_config, run_journey

WALKER_PATH = Path(__file__).resolve().parents[1] / "keyboard_agent" / "scripted_walker.py"


def test_walker_source_does_not_read_checker_selectors() -> None:
    source = WALKER_PATH.read_text()
    assert "target_selector" not in source
    assert "success_selector" not in source
    assert ".click(" not in source
    assert "mouse" not in source


def test_broken_variant_is_blocked(artifacts) -> None:
    result = run_journey(
        build_journey_config("broken", "scripted", artifacts_dir=str(artifacts), max_steps=25)
    )
    assert result.error is None
    assert result.agent_mode == "scripted"
    assert result.verdict == "BLOCKED"
    assert result.reason_code == "TARGET_NOT_FOCUSABLE"
    assert result.agent_claim == "blocked"
    assert result.agent_claim_mismatch is False
    assert result.target_ever_focused is False
    assert result.blocked_element is not None
    assert result.blocked_element.selector == "div.pay-btn"
    assert result.blocked_element.bounding_box is not None
    assert result.tokens.total_tokens == 0
    assert result.cost_usd == 0
    assert result.step_events
    assert result.screenshots


def test_fixed_variant_passes(artifacts) -> None:
    result = run_journey(
        build_journey_config("fixed", "scripted", artifacts_dir=str(artifacts), max_steps=25)
    )
    assert result.error is None
    assert result.agent_mode == "scripted"
    assert result.verdict == "PASSED"
    assert result.reason_code is None
    assert result.agent_claim == "attempted_complete"
    assert result.agent_claim_mismatch is False
    assert result.target_ever_focused is True
    assert result.blocked_element is None
    assert any(event.tool == "type_text" for event in result.step_events)
    assert any(event.tool == "press_enter" for event in result.step_events)
# ---- the Reference field (spec reference-field, REQ-RF-04, 05) ---------------------------------
def _typed(result) -> list[str]:
    return [str(event.args.get("text")) for event in result.step_events if event.tool == "type_text"]
def test_fixed_walker_types_recipient_amount_and_reference_in_order(artifacts) -> None:
    result = run_journey(
        build_journey_config("fixed", "scripted", artifacts_dir=str(artifacts), max_steps=25)
    )
    assert result.verdict == "PASSED"
    assert _typed(result) == ["Alex Carter", "50.00", "Electricity bill"]
    assert any(snap.selector_hint.endswith("#reference") or "#reference" in snap.selector_hint for snap in result.focus_trail)
def test_broken_walker_still_stops_only_at_send_payment_and_reaches_reference(artifacts) -> None:
    result = run_journey(
        build_journey_config("broken", "scripted", artifacts_dir=str(artifacts), max_steps=25)
    )
    assert result.verdict == "BLOCKED"
    assert result.reason_code == "TARGET_NOT_FOCUSABLE"
    assert result.blocked_element is not None and result.blocked_element.selector == "div.pay-btn"
    assert _typed(result) == ["Alex Carter", "50.00", "Electricity bill"]
def test_reference_override_reaches_the_goal_and_the_walker(artifacts) -> None:
    config = build_journey_config("fixed", "scripted", artifacts_dir=str(artifacts), reference="Rent")
    assert "reference Rent" in config.goal
    assert run_journey(config).verdict == "PASSED"
