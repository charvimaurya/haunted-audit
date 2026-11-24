"""Voice runner: acts on the real Haunted Bank by accessible name only (voice-agent REQ-VA-02 to 09).

`VoiceSession` finds controls with `get_by_role` and `get_by_label`. It never uses a CSS selector and never
reads the checker's selectors; a test checks this folder for them. After the commands,
the checker (`agent/keyboard_agent/checker.py`) measures the page and sets the verdict.
"""
from __future__ import annotations

import re
import time
import uuid
from datetime import datetime, timezone
from typing import Callable

from playwright.sync_api import Page, sync_playwright

from agent.keyboard_agent.checker import check_voice_journey, observe_voice_page
from agent.keyboard_agent.models import JourneyResult, StepEvent
from agent.keyboard_agent.runner import _launch_args, _only_bundled_fixture, build_journey_config
from agent.voice_agent.grammar import Command, describe, parse_natural as parse

STEP_TIMEOUT_MS = 5_000
RUN_TIMEOUT_S = 60.0
MAX_COMMANDS = 10

_ELEMENT_INFO = """(el) => { const b = el.getBoundingClientRect();
  return {tag: el.tagName.toLowerCase(), text: (el.innerText || el.textContent || '').trim().slice(0, 80),
          bounding_box: {x: b.x, y: b.y, width: b.width, height: b.height}}; }"""


def _exact(name: str) -> re.Pattern:
    """The whole name, any letter case. 'send payment' matches 'Send Payment' but not 'Send Payment now'."""
    return re.compile(rf"^\s*{re.escape(name)}\s*$", re.IGNORECASE)


def _label(field: str) -> re.Pattern:
    """A label that starts with the field's words: 'Amount' matches 'Amount (EUR)'."""
    return re.compile(rf"^\s*{re.escape(field)}\b", re.IGNORECASE)


class VoiceSession:
    """Runs one parsed command at a time on an open page. Knows nothing about the checker."""

    def __init__(self, page: Page, on_event: Callable[[StepEvent], None] | None = None) -> None:
        self.page = page
        self.on_event = on_event
        self.events: list[StepEvent] = []

    # ── helpers ──────────────────────────────────────────────────────────
    def _emit(self, tool: str, args: dict) -> StepEvent:
        event = StepEvent(
            step=len(self.events) + 1,
            tool=tool,
            args=args,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        self.events.append(event)
        if self.on_event:
            self.on_event(event)
        return event

    def _text_on_page(self, pattern: re.Pattern):
        """Only to tell 'no such text' from 'text with no role or name'. Never acted on.
        Headings, labels and legends are skipped: they name a section or a field, not the control meant."""
        loc = self.page.get_by_text(pattern)
        n = loc.count()
        if n == 0:
            return None
        for i in range(n):
            tag = loc.nth(i).evaluate("e => e.tagName.toLowerCase()")
            if tag not in {"h1", "h2", "h3", "h4", "h5", "h6", "label", "legend", "title"}:
                return loc.nth(i)
        return loc.first

    def _element(self, locator) -> dict | None:
        try:
            return locator.evaluate(_ELEMENT_INFO)
        except Exception:
            return None

    # ── commands ─────────────────────────────────────────────────────────
    def run_text(self, text: str) -> StepEvent:
        cmd = parse(text)
        if cmd is None:
            return self._emit("voice_not_understood", {
                "command": text, "outcome": "not_understood",
                "message": f'Not understood: "{text.strip()[:80]}". Say click <name>, type <text> in <field>, or go to <name>. Phrases such as "send payment" or "enter 50 in Amount" also work.',
            })
        if cmd.kind == "click":
            return self._click(cmd)
        if cmd.kind == "type":
            return self._type(cmd)
        return self._go_to(cmd)

    def _activate(self, cmd: Command, role: str, tool: str) -> StepEvent:
        base = {"command": cmd.source, "name": cmd.name, "said": describe(cmd)}
        loc = self.page.get_by_role(role, name=_exact(cmd.name))
        n = loc.count()
        if n == 1:
            loc.click(timeout=STEP_TIMEOUT_MS)
            self.page.wait_for_timeout(300)
            return self._emit(tool, {**base, "outcome": "done", "message": f"{describe(cmd)}: done.",
                                     "element": self._element(loc)})
        if n > 1:
            return self._emit(tool, {**base, "outcome": "failed",
                                     "message": f"Could not activate {cmd.name}: {n} controls have that name."})
        found = self._text_on_page(_exact(cmd.name))
        if found is not None:
            info = self._element(found)
            shown = (info or {}).get("text") or cmd.name
            return self._emit(tool, {**base, "outcome": "failed", "element": info,
                                     "message": f"Could not activate {shown}: no accessible role or name"})
        return self._emit(tool, {**base, "outcome": "failed", "message": f"Could not find {cmd.name} on the page"})

    def _click(self, cmd: Command) -> StepEvent:
        return self._activate(cmd, "button", "voice_click")

    def _go_to(self, cmd: Command) -> StepEvent:
        return self._activate(cmd, "link", "voice_go_to")

    def _type(self, cmd: Command) -> StepEvent:
        base = {"command": cmd.source, "name": cmd.name, "text": cmd.text, "said": describe(cmd)}
        loc = self.page.get_by_label(_label(cmd.name))
        n = loc.count()
        if n == 1:
            loc.fill(cmd.text or "", timeout=STEP_TIMEOUT_MS)
            return self._emit("voice_type", {**base, "outcome": "done", "message": f"{describe(cmd)}: done.",
                                             "element": self._element(loc)})
        if n > 1:
            return self._emit("voice_type", {**base, "outcome": "failed",
                                             "message": f"Could not type in {cmd.name}: {n} fields have that label."})
        found = self._text_on_page(_label(cmd.name))
        if found is not None:
            info = self._element(found)
            return self._emit("voice_type", {**base, "outcome": "failed", "element": info,
                                             "message": f"Could not type in {cmd.name}: no accessible label"})
        return self._emit("voice_type", {**base, "outcome": "failed",
                                         "message": f"Could not find a field labelled {cmd.name} on the page"})


def run_voice_journey(
    variant: str,
    commands: list[str],
    input_source: str,
    *,
    on_event: Callable[[StepEvent], None] | None = None,
    run_id: str | None = None,
    start_url: str | None = None,
) -> JourneyResult:
    """Open the bundled bank, run the commands, then let the checker decide.
    start_url is set only by the Verifier, for a copy of the bank under artifacts/verify/."""
    run_id = run_id or str(uuid.uuid4())
    config = build_journey_config(variant, "scripted", **({"start_url": start_url} if start_url else {}))
    commands = list(commands)[:MAX_COMMANDS]
    goal = "Voice commands: " + " / ".join(c.strip() for c in commands)
    started = time.perf_counter()
    browser = None
    stop_reason = "completed"
    session: VoiceSession | None = None
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, args=_launch_args())
            context = browser.new_context(viewport={"width": 1280, "height": 800})
            context.route("**/*", _only_bundled_fixture)
            page = context.new_page()
            page.set_default_timeout(STEP_TIMEOUT_MS)
            page.goto(config.start_url, wait_until="domcontentloaded")
            session = VoiceSession(page, on_event=on_event)
            for text in commands:
                if time.perf_counter() - started > RUN_TIMEOUT_S:
                    stop_reason = "timeout"
                    break
                try:
                    session.run_text(text)
                except Exception as exc:  # a Playwright timeout on one step: report it, go on
                    session._emit("voice_error", {"command": text, "outcome": "failed",
                                                  "message": f"That step did not finish: {str(exc).splitlines()[0][:160]}"})
            observation = observe_voice_page(page, config)
            verdict = check_voice_journey(observation, stop_reason=stop_reason)
            browser.close()
            browser = None
            return JourneyResult(
                run_id=run_id, verdict=verdict.verdict, reason_code=verdict.reason_code,
                step_events=list(session.events), blocked_element=verdict.blocked_element,
                agent_mode="scripted", latency_ms=(time.perf_counter() - started) * 1000,
                variant=variant, goal=goal, stop_reason=stop_reason,
                agent_kind="voice", input_source=input_source,
            )
    except Exception as exc:
        if browser is not None:
            try:
                browser.close()
            except Exception:  # Playwright may already be stopped
                pass
        return JourneyResult(
            run_id=run_id, verdict="BLOCKED", reason_code=None,
            step_events=list(session.events) if session else [], agent_mode="scripted",
            latency_ms=(time.perf_counter() - started) * 1000, variant=variant, goal=goal,
            stop_reason="error", error=str(exc), agent_kind="voice", input_source=input_source,
        )
