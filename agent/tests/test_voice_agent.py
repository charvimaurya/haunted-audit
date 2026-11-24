"""Voice agent tests (spec: .kiro/specs/voice-agent/)."""
from __future__ import annotations

import re
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from hypothesis import given, settings, strategies as st

from agent.api.main import create_app
from agent.voice_agent.grammar import Command, describe, parse
from agent.voice_agent.runner import VoiceSession, run_voice_journey

VOICE_DIR = Path(__file__).resolve().parents[1] / "voice_agent"
PAYMENT = ['type "Alex Carter" in Recipient', "type 50.00 in Amount", "click Send Payment"]


# ── REQ-VA-01: grammar ──────────────────────────────────────────────────────

@pytest.mark.parametrize("text,expected", [
    ("click Send Payment", Command("click", "Send Payment", source="click Send Payment")),
    ("  Click send payment.  ", Command("click", "send payment", source="  Click send payment.  ")),
    ("go to Accounts", Command("go_to", "Accounts", source="go to Accounts")),
    ("GO TO   See offer!", Command("go_to", "See offer", source="GO TO   See offer!")),
    ('type "Alex Carter" in Recipient', Command("type", "Recipient", "Alex Carter", 'type "Alex Carter" in Recipient')),
    ("type 'Sam' into Recipient", Command("type", "Recipient", "Sam", "type 'Sam' into Recipient")),
    ("type 50.00 in Amount", Command("type", "Amount", "50.00", "type 50.00 in Amount")),
])
def test_parse_the_three_commands(text, expected):
    assert parse(text) == expected


@pytest.mark.parametrize("text", [
    "", "   ", "click", "click   ", "send the payment", "please click Send Payment", "tap Send Payment",
    "type in Amount", 'type "" in Amount', "type Alex Carter in Recipient",  # two bare words need quotes
    "go Send Payment", "goto Accounts", "click Send Payment\nclick Cancel", "x" * 201,
])
def test_parse_rejects_everything_else(text):
    assert parse(text) is None


def test_describe_is_plain_english():
    assert describe(parse("click Send Payment")) == "Click Send Payment"
    assert describe(parse('type "Alex" in Recipient')) == 'Type "Alex" in Recipient'
    assert describe(parse("go to Accounts")) == "Go to Accounts"


# ── REQ-VA-01, 10: unrecognised text never leads to an action ──────────────

class RecordingPage:
    """Stands in for a Playwright page and records every call. A non-command must make none."""

    def __init__(self):
        self.calls: list[str] = []

    def __getattr__(self, name):
        def record(*args, **kwargs):
            self.calls.append(name)
            raise AssertionError(f"page.{name} was called for a non-command")
        return record


_COMMAND_START = re.compile(r"^\s*(click|type|go\s+to|please|can|could|would|i|send|make|submit|do|pay|press|tap|hit|push|select|choose|activate|open|visit|navigate|take|show|enter|write|put|fill|set)\b", re.IGNORECASE)


@settings(max_examples=300, deadline=None)
@given(st.text(max_size=120).filter(lambda t: not _COMMAND_START.match(t)))
def test_unrecognised_text_never_acts(text):
    assert parse(text) is None
    page = RecordingPage()
    event = VoiceSession(page).run_text(text)
    assert page.calls == []
    assert event.tool == "voice_not_understood" and event.args["outcome"] == "not_understood"


@settings(max_examples=200, deadline=None)
@given(st.text(max_size=120))
def test_any_parsed_command_is_one_of_the_three(text):
    cmd = parse(text)
    if cmd is not None:
        assert cmd.kind in {"click", "type", "go_to"} and cmd.name.strip() == cmd.name and cmd.name
        assert (cmd.text is not None) == (cmd.kind == "type")


# ── REQ-VA-02: accessible names only, no checker selectors ─────────────────

@pytest.mark.parametrize("path", sorted(VOICE_DIR.glob("*.py")))
def test_voice_code_never_reads_checker_selectors_or_css(path):
    source = path.read_text(encoding="utf-8")
    for banned in ("target_selector", "success_selector", ".locator(", "query_selector", "$(", "#send-payment", "pay-btn"):
        assert banned not in source, f"{path.name} uses {banned}"


# ── REQ-VA-03, 04, 05, 06, 10: the real bank, 5 runs each ──────────────────

@pytest.mark.parametrize("variant", ["broken", "fixed"])
def test_five_runs_on_the_real_bank(variant):
    correct = 0
    for _ in range(5):
        r = run_voice_journey(variant, PAYMENT, "typed")
        assert r.agent_kind == "voice" and r.input_source == "typed" and r.agent_mode == "scripted"
        msgs = [e.args["message"] for e in r.step_events]
        if variant == "broken":
            ok = (
                r.verdict == "BLOCKED" and r.reason_code == "NO_ACTIVATION"
                and "Could not activate Send Payment: no accessible role or name" in msgs
                and "Could not type in Amount: no accessible label" in msgs
                and r.step_events[-1].args["element"]["tag"] == "div"
                and r.step_events[-1].args["element"]["bounding_box"]["width"] > 0
                and r.blocked_element is not None and r.blocked_element.bounding_box is not None
            )
        else:
            ok = r.verdict == "PASSED" and r.reason_code is None and all(e.args["outcome"] == "done" for e in r.step_events)
        correct += 1 if ok else 0
    assert correct >= 4, f"{variant}: {correct} of 5 correct"


def test_go_to_link_and_not_understood_on_the_real_bank():
    r = run_voice_journey("fixed", ["go to Accounts", "sing a song", "click Nothing Here"], "speech")
    assert [e.args["outcome"] for e in r.step_events] == ["done", "not_understood", "failed"]
    assert r.step_events[2].args["message"] == "Could not find Nothing Here on the page"
    assert r.input_source == "speech" and r.verdict == "BLOCKED"


# ── REQ-VA-07: API ──────────────────────────────────────────────────────────

def _client(tmp_path):
    return TestClient(create_app(tmp_path / "runs.db", seed_path=None))


@pytest.mark.parametrize("body", [
    {"commands": ["click Send Payment"], "url": "https://example.com"},
    {"commands": []},
    {"commands": ["click x"] * 11},
    {"commands": ["x" * 201]},
    {"commands": ["click x"], "input_source": "file"},
    {"commands": ["click x"], "variant": "other"},
])
def test_voice_runs_rejects_bad_bodies(tmp_path, body):
    assert _client(tmp_path).post("/voice-runs", json=body).status_code == 422


def test_voice_run_end_to_end_over_the_api(tmp_path):
    client = _client(tmp_path)
    res = client.post("/voice-runs", json={"variant": "broken", "commands": PAYMENT, "input_source": "speech"})
    assert res.status_code == 202
    run_id = res.json()["run_id"]
    for _ in range(100):
        record = client.get(f"/runs/{run_id}").json()
        if record["status"] != "running":
            break
        time.sleep(0.2)
    assert record["status"] == "complete" and record["verdict"] == "BLOCKED"
    result = record["result"]
    assert result["agent_kind"] == "voice" and result["input_source"] == "speech" and result["agent_mode"] == "scripted"
    stream = client.get(f"/runs/{run_id}/events").text
    assert stream.count("data: ") >= 4  # three steps plus done
    assert "Could not activate Send Payment: no accessible role or name" in stream
    assert "event: done" in stream


def test_keyboard_results_say_keyboard():
    from agent.keyboard_agent.models import JourneyResult
    r = JourneyResult(run_id="r", verdict="PASSED", agent_mode="scripted", variant="fixed", goal="g")
    assert r.agent_kind == "keyboard" and r.input_source == "keyboard"


# ── REQ-VA-11: natural phrases ──────────────────────────────────────────────
from agent.voice_agent.grammar import parse_natural  # noqa: E402


@pytest.mark.parametrize("text,kind,name,value", [
    ("send payment", "click", "Send Payment", None),
    ("Please send the payment.", "click", "Send Payment", None),
    ("pay", "click", "Send Payment", None),
    ("tap Send Payment", "click", "Send Payment", None),
    ("press the Cancel button", "click", "Cancel", None),
    ("open Accounts", "go_to", "Accounts", None),
    ("enter 50 in Amount", "type", "Amount", "50"),
    ('enter "Alex Carter" into Recipient', "type", "Recipient", "Alex Carter"),
    ("set Amount to 50.00", "type", "Amount", "50.00"),
])
def test_natural_phrases_become_one_of_the_three(text, kind, name, value):
    cmd = parse_natural(text)
    assert cmd is not None and (cmd.kind, cmd.name, cmd.text) == (kind, name, value)


@pytest.mark.parametrize("text", ["Send hundred dollars", "hello", "", "enter in Amount", "send payment\nclick Cancel"])
def test_natural_layer_still_rejects_the_rest(text):
    assert parse_natural(text) is None


@settings(max_examples=300, deadline=None)
@given(st.text(max_size=120))
def test_natural_parse_is_always_one_of_the_three(text):
    cmd = parse_natural(text)
    if cmd is not None:
        assert cmd.kind in {"click", "type", "go_to"} and cmd.name
        assert (cmd.text is not None) == (cmd.kind == "type")


# ── REQ-VA-12: one phrase, several steps ────────────────────────────────────
from agent.voice_agent.grammar import expand_payment  # noqa: E402


@pytest.mark.parametrize("text,expected", [
    ("send money to xyz and ex 100 dollars", ['type "xyz" in Recipient', "type 100.00 in Amount", "click Send Payment"]),
    ("Please send $100 to Sam Lee", ['type "Sam Lee" in Recipient', "type 100.00 in Amount", "click Send Payment"]),
    ("pay 50.5 euros to Ann", ['type "Ann" in Recipient', "type 50.50 in Amount", "click Send Payment"]),
    ("send money to Sam", ['type "Sam" in Recipient']),
])
def test_expand_payment(text, expected):
    assert expand_payment(text) == expected


@pytest.mark.parametrize("text", ["send payment", "pay now", "send 0 to Bob", "send 100 to 200", "click Send Payment", "send money"])
def test_expand_payment_leaves_other_text(text):
    assert expand_payment(text) == [text]


def test_spoken_payment_completes_on_fixed_page():
    result = run_voice_journey("fixed", ["send money to Alex Carter and 50 dollars"], "speech")
    assert result.verdict == "PASSED"
    assert [e.args["outcome"] for e in result.step_events] == ["done", "done", "done"]
