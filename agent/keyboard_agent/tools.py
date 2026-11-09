"""Keyboard-only Playwright tools.

The public surface is the nine functions in ``TOOL_NAMES``. They press keys,
read focus, read the accessibility summary, or declare the attempt over.
They do not click, move the mouse, or run a selector-based action.

``page.evaluate`` in this module only reads the DOM. It never calls ``click``
or dispatches an event.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from playwright.sync_api import Page

from agent.keyboard_agent.models import (
    BlockedElement,
    BoundingBox,
    CheckerInput,
    FocusSnapshot,
    JourneyConfig,
    StepEvent,
)

TOOL_NAMES = (
    "press_tab",
    "press_shift_tab",
    "press_enter",
    "press_space",
    "press_arrow",
    "type_text",
    "read_focus",
    "read_page",
    "declare_done",
)

_ARROW_KEYS = {
    "up": "ArrowUp",
    "down": "ArrowDown",
    "left": "ArrowLeft",
    "right": "ArrowRight",
}

# Read-only probes. Kept free of click / mouse / dispatch so the tool audit
# can scan this source.
_JS_READ_ACTIVE = """
(selector) => {
  const el = document.activeElement;
  const target = selector ? document.querySelector(selector) : null;
  if (!el) {
    return {
      tag: "none", role: null, accessible_name: "", selector_hint: "body",
      bounding_box: null, is_visible: false, is_target: false
    };
  }
  const described = describe(el);
  described.is_target = !!(target && target === el);
  return described;

  function describe(node) {
    const rect = node.getBoundingClientRect();
    const box = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    return {
      tag: node.tagName.toLowerCase(),
      role: node.getAttribute("role") || implicitRole(node),
      accessible_name: accessibleName(node),
      selector_hint: hint(node),
      bounding_box: box.width || box.height ? box : null,
      is_visible: isVisible(node)
    };
  }
  function implicitRole(node) {
    const tag = node.tagName.toLowerCase();
    if (tag === "a" && node.hasAttribute("href")) return "link";
    if (tag === "button") return "button";
    if (tag === "textarea") return "textbox";
    if (tag === "select") return "combobox";
    if (tag === "input") {
      const type = (node.getAttribute("type") || "text").toLowerCase();
      if (type === "checkbox") return "checkbox";
      if (type === "radio") return "radio";
      if (type === "submit" || type === "button") return "button";
      return "textbox";
    }
    if (node === document.body) return null;
    return null;
  }
  function accessibleName(node) {
    const labelledby = node.getAttribute("aria-labelledby");
    if (labelledby) {
      const text = labelledby.split(/\\s+/).map((id) => {
        const label = document.getElementById(id);
        return label ? label.innerText : "";
      }).join(" ").trim();
      if (text) return text.slice(0, 160);
    }
    const aria = node.getAttribute("aria-label");
    if (aria) return aria.trim().slice(0, 160);
    if (node.labels && node.labels.length) {
      return (node.labels[0].innerText || "").trim().slice(0, 160);
    }
    const text = (node.innerText || node.getAttribute("alt") || node.getAttribute("placeholder") || "").trim();
    return text.slice(0, 160);
  }
  function hint(node) {
    if (node === document.body || node === document.documentElement) return "body";
    if (node.id) return "#" + CSS.escape(node.id);
    const cls = Array.from(node.classList).slice(0, 2).join(".");
    const tag = node.tagName.toLowerCase();
    return cls ? tag + "." + cls : tag;
  }
  function isVisible(node) {
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }
}
"""

_JS_READ_PAGE = """
() => {
  const selector = [
    "a[href]",
    "button",
    "input",
    "select",
    "textarea",
    "[tabindex]:not([tabindex='-1'])",
    "[role='button']",
    "[role='link']",
    "[role='textbox']"
  ].join(",");
  const nodes = Array.from(document.querySelectorAll(selector));
  return nodes.filter(isVisible).slice(0, 40).map((node) => ({
    tag: node.tagName.toLowerCase(),
    role: node.getAttribute("role") || implicitRole(node),
    accessible_name: accessibleName(node),
    selector_hint: hint(node),
    disabled: !!node.disabled
  }));

  function implicitRole(node) {
    const tag = node.tagName.toLowerCase();
    if (tag === "a" && node.hasAttribute("href")) return "link";
    if (tag === "button") return "button";
    if (tag === "textarea") return "textbox";
    if (tag === "input") return "textbox";
    return null;
  }
  function accessibleName(node) {
    if (node.getAttribute("aria-label")) return node.getAttribute("aria-label").trim();
    if (node.labels && node.labels.length) return (node.labels[0].innerText || "").trim();
    return (node.innerText || node.getAttribute("placeholder") || "").trim().slice(0, 160);
  }
  function hint(node) {
    if (node.id) return "#" + CSS.escape(node.id);
    const tag = node.tagName.toLowerCase();
    const cls = Array.from(node.classList).slice(0, 2).join(".");
    return cls ? tag + "." + cls : tag;
  }
  function isVisible(node) {
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }
}
"""

_JS_MEASURE_TARGET = """
(selector) => {
  const node = document.querySelector(selector);
  if (!node) return null;
  const rect = node.getBoundingClientRect();
  const labelled = node.labels && node.labels.length ? node.labels[0].innerText : "";
  return {
    tag: node.tagName.toLowerCase(),
    text: (node.innerText || "").trim().slice(0, 200),
    accessible_name: (node.getAttribute("aria-label") || labelled || node.innerText || "").trim().slice(0, 160),
    box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    visible: rect.width > 0 && rect.height > 0
  };
}
"""


class KeyboardSession:
    """One Playwright page, a step budget, and the focus trail for a journey."""

    def __init__(
        self,
        page: Page,
        config: JourneyConfig,
        artifacts_dir: Path,
        *,
        on_event: Callable[[StepEvent], None] | None = None,
        clock: Callable[[], float] | None = None,
    ) -> None:
        self.page = page
        self.config = config
        self.artifacts_dir = artifacts_dir
        self.on_event = on_event
        self.clock = clock or _monotonic
        self.started_at = self.clock()
        self.step = 0
        self.events: list[StepEvent] = []
        self.focus_trail: list[FocusSnapshot] = []
        self.stop_reason: str | None = None
        self.claim_outcome: str | None = None
        self.claim_reason: str | None = None
        self.target_ever_focused = False
        self.error: str | None = None
        self.artifacts_dir.mkdir(parents=True, exist_ok=True)

    def note_initial_focus(self) -> FocusSnapshot:
        """Record focus after navigation. This is not a tool call."""
        snapshot = self._read_active()
        self._note_focus(snapshot)
        return snapshot

    def should_stop(self) -> bool:
        return self.stop_reason in {"step_limit", "timeout", "error"} or self.claim_outcome is not None

    def press_tab(self) -> str:
        """Move focus to the next focusable element."""
        return self._press("press_tab", {}, "Tab")

    def press_shift_tab(self) -> str:
        """Move focus to the previous focusable element."""
        return self._press("press_shift_tab", {}, "Shift+Tab")

    def press_enter(self) -> str:
        """Activate the focused control with Enter."""
        return self._press("press_enter", {}, "Enter")

    def press_space(self) -> str:
        """Activate the focused control with Space."""
        return self._press("press_space", {}, " ")

    def press_arrow(self, direction: str) -> str:
        """Press an arrow key. direction is up, down, left, or right."""
        key = _ARROW_KEYS.get(direction.lower())
        if key is None:
            return "direction must be up, down, left, or right."
        return self._press("press_arrow", {"direction": direction.lower()}, key)

    def type_text(self, text: str) -> str:
        """Type into the currently focused field. Does nothing if it is not editable."""
        args = {"text": text}
        blocked = self._begin_tool("type_text", args)
        if blocked:
            return blocked
        before = self._read_active()
        if not _is_editable(before):
            self._record("type_text", args, before=before, after=before)
            return (
                "No editable field is focused. Text was not typed. "
                f"Focus is {before.selector_hint or before.tag}."
            )
        self.page.keyboard.type(text)
        after = self._read_active()
        self._record("type_text", args, before=before, after=after)
        return f"Typed {len(text)} characters into {after.selector_hint or after.tag}."

    def read_focus(self) -> str:
        """Return the tag, role, accessible name, hint, box, and visibility of focus."""
        blocked = self._begin_tool("read_focus", {})
        if blocked:
            return blocked
        snapshot = self._read_active()
        self._record("read_focus", {}, before=snapshot, after=snapshot)
        return _format_focus(snapshot)

    def read_page(self) -> str:
        """Return the visible interactive elements from the accessibility tree."""
        blocked = self._begin_tool("read_page", {})
        if blocked:
            return blocked
        before = self._read_active()
        summary = self.page.evaluate(_JS_READ_PAGE)
        self._record("read_page", {}, before=before, after=before)
        return json.dumps({"interactive": summary})

    def declare_done(self, outcome: str, reason: str) -> str:
        """Record the attempt outcome. This does not decide PASSED or BLOCKED."""
        if self.claim_outcome is not None:
            return "Declaration already recorded. Stop calling tools."
        if outcome not in {"attempted_complete", "blocked"}:
            return 'outcome must be "attempted_complete" or "blocked". Nothing was recorded.'
        if self.stop_reason is None:
            if self.clock() - self.started_at >= self.config.timeout_seconds:
                self.stop_reason = "timeout"
            elif self.step >= self.config.max_steps:
                self.stop_reason = "step_limit"
        self.claim_outcome = outcome
        self.claim_reason = reason
        focus = self._safe_focus()
        self._record(
            "declare_done",
            {"outcome": outcome, "reason": reason},
            before=focus,
            after=focus,
        )
        if self.stop_reason is None:
            self.stop_reason = "completed"
        return "Declaration recorded. Stop calling tools."

    def observe_for_checker(self) -> CheckerInput:
        """Measure the success selector and the target. Never shown to the agent."""
        return CheckerInput(
            success_visible=self._success_visible(),
            focus_trail=list(self.focus_trail),
            target_ever_focused=self.target_ever_focused,
            blocked_element=self._measure_target(),
            stop_reason=self.stop_reason or "completed",  # type: ignore[arg-type]
            agent_claim=self.claim_outcome,  # type: ignore[arg-type]
        )

    def _press(self, tool: str, args: dict, key: str) -> str:
        blocked = self._begin_tool(tool, args)
        if blocked:
            return blocked
        before = self._read_active()
        self.page.keyboard.press(key)
        after = self._read_active()
        self._record(tool, args, before=before, after=after)
        return _format_focus(after)

    def _begin_tool(self, tool: str, args: dict) -> str | None:
        if self.stop_reason in {"step_limit", "timeout", "error"}:
            return f"Run stopped ({self.stop_reason}). Do not call more tools."
        if self.clock() - self.started_at >= self.config.timeout_seconds:
            self.stop_reason = "timeout"
            focus = self._safe_focus()
            self._record(tool, args, before=focus, after=focus)
            return "TIMEOUT: wall-clock limit reached. Stop calling tools."
        if self.step >= self.config.max_steps:
            self.stop_reason = "step_limit"
            focus = self._safe_focus()
            self._record(tool, args, before=focus, after=focus)
            return "STEP_LIMIT: hard step limit reached. Stop calling tools."
        return None

    def _read_active(self) -> FocusSnapshot:
        payload = self.page.evaluate(_JS_READ_ACTIVE, self.config.target_selector)
        if payload.get("is_target"):
            self.target_ever_focused = True
        return _snapshot_from_payload(payload)

    def _safe_focus(self) -> FocusSnapshot | None:
        try:
            return self._read_active()
        except Exception:
            return self.focus_trail[-1] if self.focus_trail else None

    def _note_focus(self, snapshot: FocusSnapshot) -> None:
        if not self.focus_trail or self.focus_trail[-1].identity() != snapshot.identity():
            self.focus_trail.append(snapshot)

    def _record(
        self,
        tool: str,
        args: dict,
        *,
        before: FocusSnapshot | None,
        after: FocusSnapshot | None,
    ) -> StepEvent:
        self.step += 1
        screenshot = self._screenshot(tool)
        event = StepEvent(
            step=self.step,
            tool=tool,
            args=args,
            focused_before=before,
            focused_after=after,
            timestamp=datetime.now(timezone.utc).isoformat(),
            screenshot_path=screenshot,
        )
        self.events.append(event)
        if after is not None:
            self._note_focus(after)
        if self.on_event is not None:
            self.on_event(event)
        return event

    def _screenshot(self, tool: str) -> str | None:
        path = self.artifacts_dir / f"step-{self.step:03d}-{tool}.png"
        try:
            self.page.screenshot(path=str(path))
        except Exception:
            return None
        return str(path)

    def _success_visible(self) -> bool:
        locator = self.page.locator(self.config.success_selector)
        try:
            if locator.count() == 0:
                return False
            return locator.first.is_visible()
        except Exception:
            return False

    def _measure_target(self) -> BlockedElement | None:
        payload = self.page.evaluate(_JS_MEASURE_TARGET, self.config.target_selector)
        if not payload:
            return BlockedElement(selector=self.config.target_selector)
        box = payload.get("box") or {}
        bounding = None
        if payload.get("visible"):
            bounding = BoundingBox(
                x=float(box.get("x", 0)),
                y=float(box.get("y", 0)),
                width=float(box.get("width", 0)),
                height=float(box.get("height", 0)),
            )
        return BlockedElement(
            selector=self.config.target_selector,
            bounding_box=bounding,
            tag=payload.get("tag"),
            accessible_name=payload.get("accessible_name") or None,
            text=payload.get("text") or None,
        )


def build_strands_tools(session: KeyboardSession) -> list[Any]:
    """Wrap the session methods as Strands tools. Names match ``TOOL_NAMES``."""
    from strands import tool

    @tool
    def press_tab() -> str:
        """Move keyboard focus to the next focusable element. Keyboard only."""
        return session.press_tab()

    @tool
    def press_shift_tab() -> str:
        """Move keyboard focus to the previous focusable element."""
        return session.press_shift_tab()

    @tool
    def press_enter() -> str:
        """Activate the focused control with the Enter key."""
        return session.press_enter()

    @tool
    def press_space() -> str:
        """Activate the focused control with the Space key."""
        return session.press_space()

    @tool
    def press_arrow(direction: str) -> str:
        """Press an arrow key. direction must be up, down, left, or right."""
        return session.press_arrow(direction)

    @tool
    def type_text(text: str) -> str:
        """Type text into the currently focused field only."""
        return session.type_text(text)

    @tool
    def read_focus() -> str:
        """Read the focused element: tag, role, name, selector hint, box, visibility."""
        return session.read_focus()

    @tool
    def read_page() -> str:
        """List visible interactive elements from the accessibility tree."""
        return session.read_page()

    @tool
    def declare_done(outcome: str, reason: str) -> str:
        """Stop the attempt. outcome is attempted_complete or blocked. reason is what you observed."""
        return session.declare_done(outcome, reason)

    return [
        press_tab,
        press_shift_tab,
        press_enter,
        press_space,
        press_arrow,
        type_text,
        read_focus,
        read_page,
        declare_done,
    ]


def _snapshot_from_payload(payload: dict) -> FocusSnapshot:
    box = payload.get("bounding_box")
    bounding = None
    if box:
        bounding = BoundingBox(
            x=float(box["x"]),
            y=float(box["y"]),
            width=float(box["width"]),
            height=float(box["height"]),
        )
    return FocusSnapshot(
        tag=str(payload.get("tag") or "unknown"),
        role=payload.get("role"),
        accessible_name=str(payload.get("accessible_name") or ""),
        selector_hint=str(payload.get("selector_hint") or ""),
        bounding_box=bounding,
        is_visible=bool(payload.get("is_visible")),
    )


def _format_focus(snapshot: FocusSnapshot) -> str:
    return json.dumps(snapshot.model_dump(mode="json"))


def _is_editable(snapshot: FocusSnapshot) -> bool:
    if snapshot.tag in {"input", "textarea"}:
        return True
    return snapshot.role in {"textbox", "searchbox", "spinbutton"}


def _monotonic() -> float:
    import time

    return time.monotonic()
