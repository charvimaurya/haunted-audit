"""Tests for Groq free-tier LLM integration in keyboard agent, Exorcist, and eval preflight."""

from __future__ import annotations

import json

import httpx
import pytest

from agent.eval import preflight
from agent.fixes import exorcist
from agent.keyboard_agent import agent as kbd_agent
from agent.keyboard_agent import groq_client
from agent.keyboard_agent.runner import build_journey_config, run_journey


def test_resolved_provider_prefers_groq_when_key_set(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("LLM_PROVIDER", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    assert groq_client.resolved_provider() == "bedrock"

    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_123")
    assert groq_client.resolved_provider() == "groq"

    monkeypatch.setenv("LLM_PROVIDER", "bedrock")
    assert groq_client.resolved_provider() == "bedrock"


def test_groq_keyboard_agent_tool_calls_complete_fixed_bank(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_123")

    state = {"recipient": False, "amount": False, "reference": False, "submitted": False}

    def fake_chat(messages, **kwargs):
        last = messages[-1]
        tool_name = "press_tab"
        tool_args: dict = {}

        if len(messages) <= 2:
            tool_name = "read_page"
        elif last.get("role") == "tool":
            content = str(last.get("content") or "")
            if content.startswith("{"):
                snap = json.loads(content)
                hint = snap.get("selector_hint", "")
                if hint == "#recipient" and not state["recipient"]:
                    state["recipient"] = True
                    tool_name, tool_args = "type_text", {"text": "Alice"}
                elif hint == "#amount" and not state["amount"]:
                    state["amount"] = True
                    tool_name, tool_args = "type_text", {"text": "25.00"}
                elif hint == "#reference" and not state["reference"]:
                    state["reference"] = True
                    tool_name, tool_args = "type_text", {"text": "Rent"}
                elif hint == "#send-payment" and state["recipient"] and state["amount"] and not state["submitted"]:
                    state["submitted"] = True
                    tool_name = "press_enter"
                elif state["submitted"]:
                    tool_name, tool_args = "declare_done", {"outcome": "attempted_complete", "reason": "Submitted."}
                else:
                    tool_name = "press_tab"
            elif "Confirmation" in content or state["submitted"]:
                tool_name, tool_args = "declare_done", {"outcome": "attempted_complete", "reason": "Submitted."}
            elif "Moved focus" in content:
                tool_name = "read_focus"
            else:
                tool_name = "press_tab"

        return {
            "usage": {"prompt_tokens": 12, "completion_tokens": 6, "total_tokens": 18},
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [
                            {
                                "id": f"call_{len(messages)}",
                                "type": "function",
                                "function": {
                                    "name": tool_name,
                                    "arguments": json.dumps(tool_args),
                                },
                            }
                        ],
                    }
                }
            ],
        }

    monkeypatch.setattr(groq_client, "chat_completion", fake_chat)

    cfg = build_journey_config(
        "fixed",
        "llm",
        recipient="Alice",
        amount="25.00",
        reference="Rent",
        artifacts_dir=str(tmp_path),
    )
    res = run_journey(cfg)
    assert res.verdict == "PASSED"
    assert res.agent_mode == "llm"
    assert res.cost_usd == 0.0
    assert res.tokens.total_tokens > 0
    assert res.error is None


def test_groq_exorcist_proposes_valid_diff_and_rejects_unsafe_diff(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_123")

    finding = {"reason_code": "TARGET_NOT_FOCUSABLE", "blocked_element": {"tag": "div", "selector": "div.pay-btn"}}
    scripted_diff = exorcist.propose(finding, "scripted").checked.diff  # type: ignore[union-attr]

    monkeypatch.setattr(
        groq_client,
        "chat_completion",
        lambda messages, **kwargs: {
            "usage": {"prompt_tokens": 100, "completion_tokens": 40},
            "choices": [
                {
                    "message": {
                        "content": json.dumps(
                            {"reason": "Use a semantic submit button instead of a div.", "diff": scripted_diff}
                        )
                    }
                }
            ],
        },
    )
    ok = exorcist.propose(finding, "llm")
    assert ok.status == "proposed"
    assert ok.exorcist_mode == "llm"
    assert ok.checked is not None
    assert ok.cost_usd == 0.0
    assert ok.input_tokens == 100

    # Unsafe diff deleting an element id must still fail deterministic diffcheck gate.
    monkeypatch.setattr(
        groq_client,
        "chat_completion",
        lambda messages, **kwargs: {
            "usage": {"prompt_tokens": 50, "completion_tokens": 20},
            "choices": [
                {
                    "message": {
                        "content": json.dumps(
                            {
                                "reason": "Bad diff",
                                "diff": "--- a/fixtures/haunted_bank/index.html\n+++ b/fixtures/haunted_bank/index.html\n@@ -1,1 +1,1 @@\n-<input id=\"recipient\">\n+<input>\n",
                            }
                        )
                    }
                }
            ],
        },
    )
    bad = exorcist.propose(finding, "llm")
    assert bad.status == "exorcist_failed"
    assert bad.checked is None


def test_preflight_uses_groq_when_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_123")
    monkeypatch.setattr(
        groq_client,
        "chat_completion",
        lambda messages, **kwargs: {"usage": {"prompt_tokens": 4, "completion_tokens": 2, "total_tokens": 6}},
    )
    out = preflight.run_preflight()
    assert out["account_id"] == "groq-free-tier"
    assert out["cost_usd"] == 0.0
    assert out["total_tokens"] == 6


def test_groq_chat_completion_retries_http_429_and_trims_history(monkeypatch: pytest.MonkeyPatch) -> None:
    attempts = {"count": 0}
    sleeps: list[float] = []

    def handler(request: httpx.Request) -> httpx.Response:
        attempts["count"] += 1
        if attempts["count"] == 1:
            return httpx.Response(
                429,
                headers={"retry-after": "2"},
                json={"error": {"message": "Rate limit reached. Please try again in 1.5s."}},
            )
        return httpx.Response(200, json={"usage": {"prompt_tokens": 10, "completion_tokens": 5}, "choices": []})

    monkeypatch.setattr(groq_client.time, "sleep", lambda sec: sleeps.append(sec))
    client = httpx.Client(transport=httpx.MockTransport(handler))
    res = groq_client.chat_completion(
        [{"role": "user", "content": "hi"}],
        api_key="gsk_test",
        client=client,
    )
    assert attempts["count"] == 2
    assert sleeps == [2.5]
    assert res["usage"]["prompt_tokens"] == 10

    history = [
        {"role": "system", "content": "sys"},
        {"role": "user", "content": "goal"},
    ]
    for idx in range(8):
        history.append({"role": "assistant", "content": None, "tool_calls": [{"id": f"c{idx}"}]})
        history.append({"role": "tool", "tool_call_id": f"c{idx}", "content": "ok"})
    trimmed = kbd_agent._trim_messages(history, keep_recent=6)
    assert trimmed[:2] == history[:2]
    assert trimmed[2]["role"] == "assistant"
    assert len(trimmed) < len(history)
