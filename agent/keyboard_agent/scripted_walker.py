"""Deterministic keyboard walker with the same tool calls as the LLM agent.

Policy, in order:

1. Read the page and the current focus.
2. Press Tab through the focus order.
3. Type the recipient into the first editable field and the amount into the second.
4. If a focused button is the send control, press Enter.
5. If a full tab cycle ends without that control, press Enter once on the last
   control and declare the attempt blocked.

This module does not read the target selector or the success selector. The
checker decides whether the journey passed.
"""

from __future__ import annotations

import json

from agent.keyboard_agent.models import FocusSnapshot, JourneyConfig
from agent.keyboard_agent.tools import KeyboardSession

_SUBMIT_TOKENS = ("send", "pay", "submit", "transfer")


def run_scripted_walker(session: KeyboardSession, config: JourneyConfig) -> None:
    """Attempt the journey. Stops on declare_done, the step limit, or timeout."""
    session.read_page()
    if _halt(session, "Stopped before the page could be read."):
        return
    session.read_focus()
    if _halt(session, "Stopped before focus could be read."):
        return

    filled_recipient = False
    filled_amount = False
    activated_submit = False
    cycle_start: str | None = None
    tabs = 0
    # Leave a few steps for Enter and declare_done.
    tab_budget = max(1, config.max_steps - 4)

    while tabs < tab_budget and not session.should_stop():
        focus = _current(session)
        if focus is None:
            break
        if _is_submit(focus) and filled_recipient and filled_amount:
            session.press_enter()
            activated_submit = True
            break
        if _is_editable(focus) and not filled_recipient:
            session.type_text(config.recipient)
            filled_recipient = True
            if _halt(session, "Stopped while entering the recipient."):
                return
        elif _is_editable(focus) and filled_recipient and not filled_amount:
            session.type_text(config.amount)
            filled_amount = True
            if _halt(session, "Stopped while entering the amount."):
                return

        session.press_tab()
        tabs += 1
        if _halt(session, "Stopped while moving through the tab order."):
            return
        landed = _current(session)
        if landed is None:
            break
        if cycle_start is None:
            cycle_start = landed.identity()
        elif landed.identity() == cycle_start and tabs > 1:
            break

    if session.claim_outcome is not None:
        return
    if session.should_stop():
        _halt(session, "Stopped before the journey finished.")
        return

    if activated_submit:
        session.declare_done(
            "attempted_complete",
            "Filled the recipient and the amount in tab order and pressed Enter on the send control.",
        )
        return

    session.press_enter()
    if _halt(session, "Stopped before declaring the attempt blocked."):
        return
    session.declare_done(
        "blocked",
        "Tabbed through the focus order and never reached a send control. "
        "Enter on the last focused control did not reveal a way to submit.",
    )


def _halt(session: KeyboardSession, reason: str) -> bool:
    if session.claim_outcome is not None:
        return True
    if session.stop_reason in {"step_limit", "timeout", "error"}:
        session.declare_done("blocked", reason)
        return True
    return False


def _current(session: KeyboardSession) -> FocusSnapshot | None:
    if session.focus_trail:
        return session.focus_trail[-1]
    return None


def _is_editable(snapshot: FocusSnapshot) -> bool:
    if snapshot.tag in {"input", "textarea"}:
        return True
    return snapshot.role in {"textbox", "searchbox", "spinbutton"}


def _is_submit(snapshot: FocusSnapshot) -> bool:
    if snapshot.tag not in {"button", "input"} and snapshot.role != "button":
        return False
    name = snapshot.accessible_name.lower()
    return any(token in name for token in _SUBMIT_TOKENS)


def parse_focus_tool_result(payload: str) -> dict:
    """Helper for tests that want the JSON a focus tool returned."""
    return json.loads(payload)
