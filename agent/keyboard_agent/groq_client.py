"""Zero-extra-dependency Groq Chat Completions helper built on httpx.

Uses Groq's OpenAI-compatible API (https://api.groq.com/openai/v1/chat/completions)
for both the keyboard-only accessibility agent (tool calls) and the Exorcist
patch proposer (structured JSON). Free tier at console.groq.com ($0).
"""

from __future__ import annotations

import json
import os
import re
import time
from typing import Any

import httpx

_RETRY_IN_RE = re.compile(r"try again in\s+(\d+(?:\.\d+)?)s", re.IGNORECASE)

DEFAULT_GROQ_BASE_URL = "https://api.groq.com/openai/v1"
DEFAULT_GROQ_MODEL_ID = "qwen/qwen3.8-27b"

KEYBOARD_TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "press_tab",
            "description": "Move keyboard focus to the next focusable element.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "press_shift_tab",
            "description": "Move keyboard focus to the previous focusable element.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "press_enter",
            "description": "Activate the focused control with the Enter key.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "press_space",
            "description": "Activate the focused control with the Space key.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "press_arrow",
            "description": "Press an arrow key (up, down, left, or right).",
            "parameters": {
                "type": "object",
                "properties": {
                    "direction": {
                        "type": "string",
                        "enum": ["up", "down", "left", "right"],
                    }
                },
                "required": ["direction"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "type_text",
            "description": "Type text into the currently focused editable field.",
            "parameters": {
                "type": "object",
                "properties": {"text": {"type": "string"}},
                "required": ["text"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_focus",
            "description": "Read the focused element: tag, role, name, selector hint, box, visibility.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_page",
            "description": "List visible interactive elements from the accessibility tree.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "declare_done",
            "description": "Stop the attempt when goal complete or blocked.",
            "parameters": {
                "type": "object",
                "properties": {
                    "outcome": {
                        "type": "string",
                        "enum": ["attempted_complete", "blocked"],
                    },
                    "reason": {"type": "string"},
                },
                "required": ["outcome", "reason"],
            },
        },
    },
]


def resolved_provider() -> str:
    """Return 'groq' or 'bedrock' based on LLM_PROVIDER ('auto' prefers GROQ_API_KEY)."""
    explicit = os.getenv("LLM_PROVIDER", "auto").strip().lower()
    if explicit in {"groq", "bedrock"}:
        return explicit
    return "groq" if (os.getenv("GROQ_API_KEY") or "").strip() else "bedrock"


def groq_config() -> tuple[str, str, str]:
    """Return (api_key, base_url, model_id) from environment variables."""
    api_key = (os.getenv("GROQ_API_KEY") or "").strip()
    base_url = (os.getenv("GROQ_BASE_URL") or DEFAULT_GROQ_BASE_URL).strip().rstrip("/")
    model_id = (os.getenv("GROQ_MODEL_ID") or DEFAULT_GROQ_MODEL_ID).strip()
    return api_key, base_url, model_id


def _retry_delay_seconds(resp: httpx.Response, attempt: int) -> float:
    """Estimate a safe pause duration from Groq 429 headers or error text."""
    for header in ("retry-after", "x-ratelimit-reset-tokens"):
        raw = (resp.headers.get(header) or "").strip()
        if raw:
            match = re.match(r"^(\d+(?:\.\d+)?)s?$", raw)
            if match:
                return min(max(float(match.group(1)) + 0.5, 1.0), 25.0)
    m = _RETRY_IN_RE.search(resp.text or "")
    if m:
        return min(max(float(m.group(1)) + 0.5, 1.0), 25.0)
    return min(2.0 * (attempt + 1), 15.0)


def chat_completion(
    messages: list[dict[str, Any]],
    *,
    api_key: str,
    base_url: str = DEFAULT_GROQ_BASE_URL,
    model_id: str = DEFAULT_GROQ_MODEL_ID,
    temperature: float = 0.1,
    max_tokens: int = 1024,
    tools: list[dict[str, Any]] | None = None,
    response_format: dict[str, str] | None = None,
    client: httpx.Client | None = None,
    max_retries: int = 3,
) -> dict[str, Any]:
    """Perform one synchronous chat completion call against Groq, retrying HTTP 429."""
    payload: dict[str, Any] = {
        "model": model_id,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"
    if response_format:
        payload["response_format"] = response_format

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    url = f"{base_url}/chat/completions"
    owns = client is None
    cli = client or httpx.Client(timeout=30.0)
    try:
        for attempt in range(max_retries + 1):
            resp = cli.post(url, headers=headers, json=payload)
            if resp.status_code == 429 and attempt < max_retries:
                time.sleep(_retry_delay_seconds(resp, attempt))
                continue
            if resp.status_code >= 400:
                detail = resp.text.strip()[:240]
                raise RuntimeError(f"Groq API error (HTTP {resp.status_code}): {detail}")
            return resp.json()
        raise RuntimeError("Groq API error (HTTP 429): rate limit retries exhausted.")
    except httpx.HTTPError as exc:
        raise RuntimeError(f"Groq API request failed: {exc}") from exc
    finally:
        if owns:
            cli.close()


def dispatch_keyboard_tool(session: Any, name: str, raw_args: str | dict[str, Any] | None) -> str:
    """Invoke one of the nine allowed KeyboardSession tools safely."""
    args: dict[str, Any]
    if isinstance(raw_args, dict):
        args = raw_args
    elif isinstance(raw_args, str) and raw_args.strip():
        try:
            loaded = json.loads(raw_args)
            args = loaded if isinstance(loaded, dict) else {}
        except ValueError:
            args = {}
    else:
        args = {}

    if name == "press_tab":
        return session.press_tab()
    if name == "press_shift_tab":
        return session.press_shift_tab()
    if name == "press_enter":
        return session.press_enter()
    if name == "press_space":
        return session.press_space()
    if name == "press_arrow":
        return session.press_arrow(str(args.get("direction") or "down"))
    if name == "type_text":
        return session.type_text(str(args.get("text") or ""))
    if name == "read_focus":
        return session.read_focus()
    if name == "read_page":
        return session.read_page()
    if name == "declare_done":
        return session.declare_done(
            str(args.get("outcome") or "blocked"),
            str(args.get("reason") or "Stopped."),
        )
    return f"Unknown tool: {name}"
