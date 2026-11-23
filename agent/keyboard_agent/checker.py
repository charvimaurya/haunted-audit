"""Deterministic journey verdict.

The agent may claim that it finished or that it was blocked. This module
ignores that claim when deciding PASSED or BLOCKED. The same input always
produces the same output.

Priority, first match wins:

1. The success selector is visible -> PASSED.
2. The run hit the wall clock -> TIMEOUT.
3. The run hit the step limit -> STEP_LIMIT.
4. The target received focus but success is not visible -> NO_ACTIVATION.
5. Focus cycled inside a short loop -> FOCUS_TRAP.
6. Otherwise the target is not in the tab order -> TARGET_NOT_FOCUSABLE.
"""

from __future__ import annotations

from agent.keyboard_agent.models import (
    BlockedElement,
    CheckerInput,
    CheckerOutput,
    FocusSnapshot,
)


def check_journey(observation: CheckerInput) -> CheckerOutput:
    """Decide the verdict from measured page facts and the focus trail."""
    last_focused = observation.focus_trail[-1] if observation.focus_trail else None
    if observation.success_visible:
        verdict = "PASSED"
        reason_code = None
        blocked = None
        skipped = None
    else:
        verdict = "BLOCKED"
        reason_code = _reason_code(observation)
        blocked = observation.blocked_element
        skipped = _skipped_element(observation)

    return CheckerOutput(
        verdict=verdict,
        reason_code=reason_code,
        target_ever_focused=observation.target_ever_focused,
        last_focused_element=last_focused,
        skipped_element=skipped,
        blocked_element=blocked,
        agent_claim_mismatch=_claim_mismatch(observation.agent_claim, verdict),
    )


def _reason_code(observation: CheckerInput):
    if observation.stop_reason == "timeout":
        return "TIMEOUT"
    if observation.stop_reason == "step_limit":
        return "STEP_LIMIT"
    if observation.target_ever_focused:
        return "NO_ACTIVATION"
    if is_focus_trap(observation.focus_trail):
        return "FOCUS_TRAP"
    return "TARGET_NOT_FOCUSABLE"


def is_focus_trap(trail: list[FocusSnapshot]) -> bool:
    """True when focus is stuck on one control or looping a 2-3 control cycle.

    One walk around the whole page is not a trap. The walker stops after a
    single cycle, and that stays TARGET_NOT_FOCUSABLE when the target was
    never focused.
    """
    identities = [
        snap.identity()
        for snap in trail
        if snap.selector_hint not in {"", "body"}
    ]
    if len(identities) < 6:
        return False
    if len(set(identities[-4:])) == 1:
        return True
    for size in (2, 3):
        pattern = identities[-size:]
        window = identities[-(size * 3) :]
        if len(window) == size * 3 and window == pattern * 3:
            return True
    return False


def _skipped_element(observation: CheckerInput) -> FocusSnapshot | None:
    """The control the trail never landed on. That is where the ghost sits."""
    if observation.target_ever_focused or observation.blocked_element is None:
        return None
    return _snapshot_from_blocked(observation.blocked_element)


def _snapshot_from_blocked(element: BlockedElement) -> FocusSnapshot:
    return FocusSnapshot(
        tag=element.tag or "unknown",
        role=None,
        accessible_name=element.accessible_name or element.text or "",
        selector_hint=element.selector,
        bounding_box=element.bounding_box,
        is_visible=element.bounding_box is not None,
    )


def _claim_mismatch(claim: str | None, verdict: str) -> bool:
    if claim == "attempted_complete" and verdict != "PASSED":
        return True
    if claim == "blocked" and verdict == "PASSED":
        return True
    return False


# ── Voice journeys (voice-agent REQ-VA-05) ──────────────────────────────────
# The voice runner acts by accessible name only and never sees these selectors.
# The checker measures the page after the commands and decides; the runner does not.

def observe_voice_page(page, config) -> CheckerInput:
    """Measure the confirmation and the target on the page after a voice run. Checker-only selectors."""
    from agent.keyboard_agent.tools import _JS_MEASURE_TARGET  # same measurement as the keyboard run
    from agent.keyboard_agent.models import BoundingBox

    try:
        loc = page.locator(config.success_selector)
        success = loc.count() > 0 and loc.first.is_visible()
    except Exception:
        success = False
    payload = page.evaluate(_JS_MEASURE_TARGET, config.target_selector) or {}
    box = payload.get("box") or {}
    bounding = (
        BoundingBox(x=float(box.get("x", 0)), y=float(box.get("y", 0)),
                    width=float(box.get("width", 0)), height=float(box.get("height", 0)))
        if payload.get("visible") else None
    )
    blocked = BlockedElement(
        selector=config.target_selector, bounding_box=bounding, tag=payload.get("tag"),
        accessible_name=payload.get("accessible_name") or None, text=payload.get("text") or None,
    )
    return CheckerInput(success_visible=success, blocked_element=blocked)


def check_voice_journey(observation: CheckerInput, *, stop_reason: str = "completed") -> CheckerOutput:
    """PASSED when the confirmation is visible. Otherwise BLOCKED: TIMEOUT if the run ran out of time,
    else NO_ACTIVATION (the voice commands did not get the payment sent)."""
    if observation.success_visible:
        return CheckerOutput(verdict="PASSED", reason_code=None, target_ever_focused=False)
    return CheckerOutput(
        verdict="BLOCKED",
        reason_code="TIMEOUT" if stop_reason == "timeout" else "NO_ACTIVATION",
        blocked_element=observation.blocked_element,
        target_ever_focused=False,
    )
