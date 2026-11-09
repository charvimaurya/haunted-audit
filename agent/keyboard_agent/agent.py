"""LLM keyboard agent. Strands Agents SDK on Amazon Bedrock (Claude).

The model is a keyboard-only user. It is not told the target selector, and it
does not decide whether the journey passed. ``declare_done`` records a claim.
The checker scores the page afterwards.
"""

from __future__ import annotations

import os

from agent.keyboard_agent.models import JourneyConfig, TokenUsage
from agent.keyboard_agent.tools import KeyboardSession, build_strands_tools

SYSTEM_PROMPT = """You are a keyboard-only user. You cannot use a mouse, click, or touch the screen.
You are attempting one task on a web page to learn whether a keyboard user can finish it.

Rules:
- Use only the provided tools. There is no click tool and no mouse tool.
- Think step by step.
- Start with read_page, then read_focus.
- After every focus move, call read_focus before you decide the next action.
- Never guess that a hidden element exists. Trust read_focus and read_page.
- Type only when read_focus shows an editable field.
- When you have operated the control the goal needs, call declare_done with outcome "attempted_complete" and a short reason.
- If you cannot reach or activate that control, call declare_done with outcome "blocked" and an honest reason.
- You do not decide whether the journey passed. You only attempt it and report what you could reach.
- When a tool says STOP, STEP_LIMIT, or TIMEOUT, call declare_done if you have not already, then stop.
"""


def build_user_prompt(config: JourneyConfig) -> str:
    """Goal text for the model. Selectors used by the checker are not included."""
    prompt = (
        f"Goal: {config.goal}\n"
        f"Recipient to enter: {config.recipient}\n"
        f"Amount to enter: {config.amount}\n"
        "Complete the goal using only the keyboard."
    )
    _reject_leaked_selectors(config, prompt)
    return prompt


def run_llm_agent(session: KeyboardSession, config: JourneyConfig) -> TokenUsage:
    """Run one Claude attempt. Raises if AWS credentials are missing.

    A missing credential is a failed run, not a number we invent.
    """
    from dotenv import load_dotenv

    load_dotenv()
    prompt = build_user_prompt(config)
    model_id = os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-6")
    region = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-1"
    temperature = float(os.getenv("BEDROCK_TEMPERATURE", "0.1"))
    max_tokens = int(os.getenv("BEDROCK_MAX_TOKENS", "1024"))

    boto_session = _require_boto_session(region)
    model = _bedrock_model(
        model_id=model_id,
        region=region,
        temperature=temperature,
        max_tokens=max_tokens,
        boto_session=boto_session,
    )
    from strands import Agent

    agent = Agent(
        model=model,
        system_prompt=SYSTEM_PROMPT,
        tools=build_strands_tools(session),
        callback_handler=None,
    )
    result = agent(prompt)
    return extract_token_usage(result)


def extract_token_usage(result: object) -> TokenUsage:
    """Read token counts off a Strands result. Missing metrics stay at zero."""
    metrics = getattr(result, "metrics", None)
    usage = getattr(metrics, "accumulated_usage", None) if metrics is not None else None
    if usage is None:
        usage = getattr(result, "usage", None)
    if not isinstance(usage, dict):
        usage = {}
    input_tokens = int(usage.get("inputTokens") or usage.get("input_tokens") or 0)
    output_tokens = int(usage.get("outputTokens") or usage.get("output_tokens") or 0)
    total = int(usage.get("totalTokens") or usage.get("total_tokens") or (input_tokens + output_tokens))
    return TokenUsage(
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=total,
    )


def _require_boto_session(region: str):
    import boto3

    boto_session = boto3.Session(region_name=region)
    credentials = boto_session.get_credentials()
    access_key = getattr(credentials, "access_key", None) if credentials else None
    if not access_key:
        raise RuntimeError(
            "AWS credentials are not configured. Set AWS_ACCESS_KEY_ID and "
            "AWS_SECRET_ACCESS_KEY in .env, or configure an AWS profile. "
            "The LLM mode was not run, and no reliability number was invented."
        )
    return boto_session


def _bedrock_model(*, model_id: str, region: str, temperature: float, max_tokens: int, boto_session):
    from strands.models import BedrockModel

    kwargs = {
        "model_id": model_id,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "boto_session": boto_session,
    }
    # region_name is the documented BedrockModel argument. Fall back if a
    # future release renames it; the boto session already carries the region.
    try:
        return BedrockModel(region_name=region, **kwargs)
    except TypeError:
        return BedrockModel(**kwargs)


def _reject_leaked_selectors(config: JourneyConfig, prompt: str) -> None:
    leaked = [
        selector
        for selector in (config.target_selector, config.success_selector)
        if selector and selector in prompt
    ]
    if leaked:
        raise RuntimeError(
            "Refusing to send checker selectors to the agent: " + ", ".join(leaked)
        )
