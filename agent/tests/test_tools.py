"""The tool surface is keyboard-only, on the real fixture."""

from __future__ import annotations

import ast
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

from agent.keyboard_agent.runner import build_journey_config
from agent.keyboard_agent.tools import TOOL_NAMES, KeyboardSession, build_strands_tools

TOOLS_PATH = Path(__file__).resolve().parents[1] / "keyboard_agent" / "tools.py"
POINTER_MARKERS = (
    ".click(",
    ".dblclick(",
    ".hover(",
    "page.mouse",
    "dispatchEvent",
    "dispatch_event",
    "locator.click",
)


def test_source_exposes_no_pointer_actions() -> None:
    source = TOOLS_PATH.read_text()
    for marker in POINTER_MARKERS:
        assert marker not in source
    tree = ast.parse(source)
    forbidden = {"click", "dblclick", "hover", "mouse", "tap", "wheel"}
    for node in ast.walk(tree):
        if isinstance(node, ast.Attribute) and node.attr in forbidden:
            raise AssertionError(f"tools.py references pointer API .{node.attr}")
        if isinstance(node, ast.FunctionDef) and any(part in node.name for part in ("click", "mouse")):
            raise AssertionError(f"unexpected function {node.name}")


def test_registered_tool_names_match_the_contract(artifacts) -> None:
    config = build_journey_config("broken", "scripted", artifacts_dir=str(artifacts))
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(config.start_url, wait_until="domcontentloaded")
        session = KeyboardSession(page, config, artifacts / "names")
        tools = build_strands_tools(session)
        names = [_tool_name(tool) for tool in tools]
        assert names == list(TOOL_NAMES)
        for tool in tools:
            text = f"{_tool_name(tool)} {(getattr(tool, '__doc__', '') or '')}".lower()
            assert "mouse" not in text
            assert "click" not in text
        browser.close()


def test_broken_page_summary_hides_the_fake_button(artifacts) -> None:
    config = build_journey_config("broken", "scripted", artifacts_dir=str(artifacts))
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.goto(config.start_url, wait_until="domcontentloaded")
        session = KeyboardSession(page, config, artifacts / "read")
        session.note_initial_focus()
        summary = json.loads(session.read_page())
        names = [item["accessible_name"] for item in summary["interactive"]]
        hints = [item["selector_hint"] for item in summary["interactive"]]
        assert "Send Payment" not in names
        assert all("pay-btn" not in hint for hint in hints)
        assert "#recipient" in hints
        assert "#amount" in hints
        focus_names = []
        for _ in range(14):
            session.press_tab()
            focus_names.append(session.focus_trail[-1].accessible_name)
        assert "Send Payment" not in focus_names
        assert session.target_ever_focused is False
        browser.close()


def test_type_text_does_nothing_when_focus_is_not_editable(artifacts) -> None:
    config = build_journey_config("broken", "scripted", artifacts_dir=str(artifacts))
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(config.start_url, wait_until="domcontentloaded")
        session = KeyboardSession(page, config, artifacts / "type")
        session.note_initial_focus()
        message = session.type_text("Alex Carter")
        assert "not typed" in message
        assert page.locator("#recipient").input_value() == ""
        assert {event.tool for event in session.events} <= set(TOOL_NAMES)
        browser.close()


def _tool_name(tool: object) -> str:
    for attribute in ("tool_name", "__name__"):
        value = getattr(tool, attribute, None)
        if isinstance(value, str):
            return value
    raise AssertionError(f"tool has no name: {tool!r}")
