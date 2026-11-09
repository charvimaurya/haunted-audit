"""Checker verdicts on the fixture, plus Hypothesis invariants."""

from __future__ import annotations

from playwright.sync_api import sync_playwright

from hypothesis import given, settings
from hypothesis import strategies as st

from agent.keyboard_agent.checker import check_journey
from agent.keyboard_agent.models import (
    BlockedElement,
    BoundingBox,
    CheckerInput,
    FocusSnapshot,
)
from agent.keyboard_agent.runner import build_journey_config
from agent.keyboard_agent.tools import KeyboardSession


def _drive(variant: str, artifacts, fill: bool) -> CheckerInput:
    config = build_journey_config(
        variant,
        "scripted",
        artifacts_dir=str(artifacts),
        max_steps=25,
    )
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.goto(config.start_url, wait_until="domcontentloaded")
        session = KeyboardSession(page, config, artifacts / variant)
        session.note_initial_focus()
        if fill:
            _complete_fixed_form(session)
        else:
            for _ in range(8):
                session.press_tab()
        observation = session.observe_for_checker()
        browser.close()
    return observation


def _complete_fixed_form(session: KeyboardSession) -> None:
    """Keyboard-only fill used to prove the checker, not the walker."""
    for _ in range(12):
        focus = session.focus_trail[-1]
        if focus.selector_hint == "#recipient":
            session.type_text("Alex Carter")
        elif focus.selector_hint == "#amount":
            session.type_text("50.00")
        elif focus.tag == "button":
            session.press_enter()
            return
        session.press_tab()


def test_broken_fixture_is_blocked(artifacts) -> None:
    observation = _drive("broken", artifacts, fill=False)
    verdict = check_journey(observation)
    assert verdict.verdict == "BLOCKED"
    assert verdict.reason_code == "TARGET_NOT_FOCUSABLE"
    assert verdict.target_ever_focused is False
    assert verdict.blocked_element is not None
    assert verdict.blocked_element.selector == "div.pay-btn"
    assert verdict.blocked_element.tag == "div"
    assert verdict.blocked_element.bounding_box is not None
    assert verdict.blocked_element.bounding_box.width > 0
    assert verdict.skipped_element is not None
    assert verdict.skipped_element.selector_hint == "div.pay-btn"


def test_fixed_fixture_passes(artifacts) -> None:
    observation = _drive("fixed", artifacts, fill=True)
    verdict = check_journey(observation)
    assert observation.success_visible is True
    assert verdict.verdict == "PASSED"
    assert verdict.reason_code is None
    assert verdict.blocked_element is None


def observations(*, success_visible: bool | None = None):
    """Random checker inputs. Floats stay finite so the models accept them."""
    number = st.floats(min_value=0, max_value=800, allow_nan=False, allow_infinity=False)
    boxes = st.builds(BoundingBox, x=number, y=number, width=number, height=number)
    snapshots = st.builds(
        FocusSnapshot,
        tag=st.sampled_from(["a", "button", "input", "body"]),
        role=st.one_of(st.none(), st.sampled_from(["link", "button", "textbox"])),
        accessible_name=st.text(max_size=24),
        selector_hint=st.sampled_from(["#recipient", "#amount", "#cancel", "body"]),
        bounding_box=st.one_of(st.none(), boxes),
        is_visible=st.booleans(),
    )
    blocked = st.builds(
        BlockedElement,
        selector=st.just("div.pay-btn"),
        bounding_box=st.one_of(st.none(), boxes),
        tag=st.just("div"),
        accessible_name=st.just("Send Payment"),
        text=st.just("Send Payment"),
    )
    visible = st.booleans() if success_visible is None else st.just(success_visible)
    return st.builds(
        CheckerInput,
        success_visible=visible,
        focus_trail=st.lists(snapshots, max_size=12),
        target_ever_focused=st.booleans(),
        blocked_element=st.one_of(st.none(), blocked),
        stop_reason=st.sampled_from(["completed", "step_limit", "timeout", "error"]),
        agent_claim=st.one_of(st.none(), st.sampled_from(["attempted_complete", "blocked"])),
    )


def test_same_input_is_deterministic() -> None:
    observation = CheckerInput(
        success_visible=False,
        focus_trail=[_snap("a", "#nav-dashboard")],
        target_ever_focused=False,
        blocked_element=BlockedElement(selector="div.pay-btn", tag="div"),
        stop_reason="completed",
        agent_claim="attempted_complete",
    )
    first = check_journey(observation)
    second = check_journey(observation)
    assert first == second
    assert first.agent_claim_mismatch is True


@given(observation=observations(success_visible=False))
@settings(max_examples=40, deadline=None)
def test_random_trails_never_pass_without_success(observation: CheckerInput) -> None:
    verdict = check_journey(observation)
    assert verdict.verdict == "BLOCKED"
    assert verdict.reason_code is not None


@given(observation=observations())
@settings(max_examples=40, deadline=None)
def test_checker_is_deterministic_for_random_input(observation: CheckerInput) -> None:
    assert check_journey(observation) == check_journey(observation)
    verdict = check_journey(observation)
    assert (verdict.verdict == "PASSED") is observation.success_visible


def _snap(tag: str, hint: str) -> FocusSnapshot:
    return FocusSnapshot(
        tag=tag,
        role="link",
        accessible_name=hint,
        selector_hint=hint,
        bounding_box=BoundingBox(x=0, y=0, width=10, height=10),
        is_visible=True,
    )
