"""Step and time limits actually stop a journey."""

from __future__ import annotations

from agent.keyboard_agent.agent import SYSTEM_PROMPT, build_user_prompt
from agent.keyboard_agent.runner import build_journey_config, run_journey


def test_step_limit_stops_the_run(artifacts) -> None:
    config = build_journey_config(
        "broken",
        "scripted",
        artifacts_dir=str(artifacts),
        max_steps=3,
        timeout_seconds=30,
    )
    result = run_journey(config)
    assert result.stop_reason == "step_limit"
    assert result.reason_code == "STEP_LIMIT"
    assert result.verdict == "BLOCKED"
    assert result.agent_mode == "scripted"
    assert len(result.step_events) <= config.max_steps + 2
    assert result.latency_ms < 30_000


def test_timeout_stops_the_run(artifacts) -> None:
    config = build_journey_config(
        "fixed",
        "scripted",
        artifacts_dir=str(artifacts),
        max_steps=25,
        timeout_seconds=0,
    )
    result = run_journey(config)
    assert result.stop_reason == "timeout"
    assert result.reason_code == "TIMEOUT"
    assert result.verdict == "BLOCKED"
    assert len(result.step_events) <= 3


def test_prompt_does_not_leak_checker_selectors() -> None:
    config = build_journey_config("broken", "llm")
    prompt = SYSTEM_PROMPT + "\n" + build_user_prompt(config)
    assert config.target_selector not in prompt
    assert config.success_selector not in prompt
    assert "div.pay-btn" not in prompt
    assert "Alex Carter" in prompt
    assert "50.00" in prompt
