"""Run one keyboard journey and let the checker write the verdict.

The agent mode flag selects the LLM agent or the scripted walker. Both talk
to the same tools. Both produce a JourneyResult that records which mode ran.
"""

from __future__ import annotations

import argparse
import os
import time
import uuid
from pathlib import Path

from playwright.sync_api import sync_playwright

from agent.keyboard_agent.agent import run_llm_agent
from agent.keyboard_agent.checker import check_journey
from agent.keyboard_agent.models import (
    INTERNAL_DEFAULT_DETAILS,
    JourneyConfig,
    JourneyResult,
    TokenUsage,
    clean_amount,
    clean_detail,
)
from agent.keyboard_agent.scenarios import get_scenario, scenario_path
from agent.keyboard_agent.scripted_walker import run_scripted_walker
from agent.keyboard_agent.tools import KeyboardSession

FIXTURE_PATH = (
    Path(__file__).resolve().parents[2] / "fixtures" / "haunted_bank" / "index.html"
)
SCENARIOS_ROOT = FIXTURE_PATH.parents[1] / "scenarios"
BROKEN_TARGET = "div.pay-btn"
FIXED_TARGET = "button.btn-primary"
SUCCESS_SELECTOR = "[data-testid='payment-confirmation']"


def _launch_args() -> list[str]:
    """Chromium flags for a container. Locally the default sandbox stays on."""
    if os.getenv("HAUNTED_AUDIT_CONTAINER") == "1":
        # Fargate gives a small /dev/shm and no user namespaces for the sandbox.
        return ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    return []


# The Verifier's patched copies of the bank (exorcist design). Git-ignored; written only by agent/fixes/verifier.py.
VERIFY_ROOT = Path(__file__).resolve().parents[2] / "artifacts" / "verify"


def _is_bundled_url(url: str) -> bool:
    return (
        url == "about:blank"
        or url.startswith("data:")
        or url.startswith(FIXTURE_PATH.parent.as_uri() + "/")
        or url.startswith(SCENARIOS_ROOT.as_uri() + "/")
        or url.startswith(VERIFY_ROOT.as_uri() + "/")
    )


def _only_bundled_fixture(route) -> None:
    """Agents only ever run on the bundled Haunted Bank. Abort everything else."""
    if _is_bundled_url(route.request.url):
        route.continue_()
    else:
        route.abort()


def build_journey_config(
    variant: str,
    mode: str,
    **overrides,
) -> JourneyConfig:
    """Build a config. Checker selectors are set here and stay out of the prompt."""
    _load_env()
    scenario_def = get_scenario(overrides.pop("scenario", None))
    scen_file = scenario_path(scenario_def.id)
    recipient = clean_detail(overrides.pop("recipient", None) or INTERNAL_DEFAULT_DETAILS["recipient"], required=True)
    amount = clean_amount(overrides.pop("amount", None) or INTERNAL_DEFAULT_DETAILS["amount"], required=True)
    # No "reference" key: the internal default (reference-field REQ-RF-04). Key given as None: no reference
    # (a tester who left Reference empty; user-typed-test-details REQ-TD-03).
    reference = clean_detail(overrides.pop("reference", INTERNAL_DEFAULT_DETAILS["reference"]), required=False)
    if variant not in {"broken", "fixed"}:
        raise ValueError("variant must be broken or fixed")
    if mode not in {"llm", "scripted"}:
        raise ValueError("mode must be llm or scripted")
    goal = (
        f"Complete {scenario_def.name} ({scenario_def.submit_label}) of EUR {amount} for {recipient}"
        + (f" with the reference {reference}. " if reference else ". ")
        + ("Fill the recipient, the amount and the reference" if reference else "Fill the recipient and the amount")
        + f", then activate {scenario_def.submit_label}."
    )
    values = {
        "start_url": f"{scen_file.as_uri()}?variant={variant}",
        "goal": goal,
        "target_selector": BROKEN_TARGET if variant == "broken" else FIXED_TARGET,
        "success_selector": SUCCESS_SELECTOR,
        "recipient": recipient,
        "amount": amount,
        "reference": reference,
        "agent_mode": mode,
        "variant": variant,
        "input_usd_per_mtok": float(os.getenv("BEDROCK_INPUT_USD_PER_MTOK", "3")),
        "output_usd_per_mtok": float(os.getenv("BEDROCK_OUTPUT_USD_PER_MTOK", "15")),
    }
    values.update(overrides)
    return JourneyConfig(**values)


def run_journey(
    config: JourneyConfig,
    *,
    on_event=None,
    run_id: str | None = None,
) -> JourneyResult:
    """Attempt the journey, then score it. The model never writes the verdict."""
    run_id = run_id or str(uuid.uuid4())
    artifacts = Path(config.artifacts_dir) / run_id
    started = time.perf_counter()
    tokens = TokenUsage()
    browser = None
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, args=_launch_args())
            context = browser.new_context(viewport={"width": 1280, "height": 800})
            context.route("**/*", _only_bundled_fixture)
            page = context.new_page()
            page.goto(config.start_url, wait_until="domcontentloaded")
            session = KeyboardSession(
                page,
                config,
                artifacts,
                on_event=on_event,
            )
            session.note_initial_focus()
            try:
                if config.agent_mode == "llm":
                    tokens = run_llm_agent(session, config)
                else:
                    run_scripted_walker(session, config)
            except Exception as exc:
                session.error = str(exc)
                if session.stop_reason is None:
                    session.stop_reason = "error"
            if session.stop_reason is None:
                session.stop_reason = "completed"
            verdict = check_journey(session.observe_for_checker())
            browser.close()
            browser = None
            return _result_from_session(
                session,
                config,
                verdict,
                run_id=run_id,
                tokens=tokens,
                latency_ms=(time.perf_counter() - started) * 1000,
            )
    except Exception as exc:
        if browser is not None:
            browser.close()
        return JourneyResult(
            run_id=run_id,
            verdict="BLOCKED",
            reason_code=None,
            agent_mode=config.agent_mode,
            tokens=tokens,
            latency_ms=(time.perf_counter() - started) * 1000,
            cost_usd=_cost(tokens, config),
            variant=config.variant,
            goal=config.goal,
            stop_reason="error",
            error=str(exc),
        )


def _result_from_session(session, config, verdict, *, run_id, tokens, latency_ms) -> JourneyResult:
    screenshots = [
        event.screenshot_path
        for event in session.events
        if event.screenshot_path
    ]
    return JourneyResult(
        run_id=run_id,
        verdict=verdict.verdict,
        reason_code=verdict.reason_code,
        focus_trail=list(session.focus_trail),
        step_events=list(session.events),
        screenshots=screenshots,
        blocked_element=verdict.blocked_element,
        agent_mode=config.agent_mode,
        tokens=tokens,
        latency_ms=latency_ms,
        cost_usd=_cost(tokens, config),
        agent_claim=session.claim_outcome,
        agent_claim_reason=session.claim_reason,
        agent_claim_mismatch=verdict.agent_claim_mismatch,
        target_ever_focused=verdict.target_ever_focused,
        last_focused_element=verdict.last_focused_element,
        skipped_element=verdict.skipped_element,
        variant=config.variant,
        goal=config.goal,
        stop_reason=session.stop_reason or "completed",
        error=session.error,
    )


def _cost(tokens: TokenUsage, config: JourneyConfig) -> float:
    """Dollar cost from measured tokens and the configured rate card."""
    return (
        tokens.input_tokens / 1_000_000 * config.input_usd_per_mtok
        + tokens.output_tokens / 1_000_000 * config.output_usd_per_mtok
    )


def _load_env() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    load_dotenv()


def main() -> None:
    parser = argparse.ArgumentParser(description="Run one Haunted Bank keyboard journey.")
    parser.add_argument("--variant", choices=["broken", "fixed"], default="broken")
    parser.add_argument("--mode", choices=["llm", "scripted"], default="scripted")
    parser.add_argument("--max-steps", type=int, default=25)
    parser.add_argument("--timeout", type=float, default=90)
    args = parser.parse_args()
    config = build_journey_config(
        args.variant,
        args.mode,
        max_steps=args.max_steps,
        timeout_seconds=args.timeout,
    )
    result = run_journey(config)
    print(result.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
