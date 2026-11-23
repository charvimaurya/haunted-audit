"""Exorcist: proposes one small fix for one finding. It never applies it (exorcist REQ-X-01 to X-08, X-13, X-14).

scripted mode: a rule for the known barrier only. Send Payment is a <div> with an onclick, which the keyboard
cannot reach (TARGET_NOT_FOCUSABLE on a div). The rule proposes the native <button type="submit">. Any other
finding is refused with UNKNOWN_BARRIER. 0 tokens, 0.0 cost.

llm mode: Claude on Amazon Bedrock with the prompt in prompts/exorcist.md. Without AWS credentials it ends as
exorcist_failed with the credential error, and no diff is made by any other means. Calling Bedrock is not built
yet: there are no credentials to build or test it against.
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path

from agent.fixes.diffcheck import TARGET, CheckedDiff, DiffError, check

REPO = Path(__file__).resolve().parents[2]
PROMPT_PATH = REPO / "prompts" / "exorcist.md"

_BROKEN_SEND = """'<div class="pay-btn" id="send-payment" onclick="window.submitPayment()">Send Payment</div>'"""
_FIXED_SEND = """'<button type="submit" class="btn-primary" id="send-payment">Send Payment</button>'"""


class Refused(Exception):
    """The Exorcist will not propose a fix for this finding. code is an API error code."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


@dataclass
class Proposal:
    status: str  # "proposed" or "exorcist_failed"
    reason: str | None
    checked: CheckedDiff | None
    error: str | None
    exorcist_mode: str
    model_id: str | None
    input_tokens: int | None
    output_tokens: int | None
    cost_usd: float | None
    latency_ms: float
    raw_output: str | None = None


def page_source() -> str:
    """Read-only. The Exorcist is given this file's text and nothing else."""
    return (REPO / TARGET).read_text(encoding="utf-8")


def _scripted_diff(source: str, finding: dict) -> tuple[str, str]:
    el = finding.get("blocked_element") or {}
    if finding.get("reason_code") != "TARGET_NOT_FOCUSABLE" or (el.get("tag") or "").lower() != "div":
        raise Refused("UNKNOWN_BARRIER",
                      "The scripted Exorcist only knows one barrier: a div used as a button that the keyboard cannot reach.")
    lines = source.split("\n")
    hits = [i for i, l in enumerate(lines) if _BROKEN_SEND in l]
    if len(hits) != 1:
        raise Refused("UNKNOWN_BARRIER", "The div that acts as Send Payment was not found exactly once in the page.")
    i = hits[0]
    old = lines[i]
    new = old.replace(_BROKEN_SEND, _FIXED_SEND)
    ctx_before, ctx_after = lines[i - 1], lines[i + 1]
    diff = "\n".join([
        f"--- a/{TARGET}", f"+++ b/{TARGET}",
        f"@@ -{i},3 +{i},3 @@",
        " " + ctx_before, "-" + old, "+" + new, " " + ctx_after,
    ]) + "\n"
    reason = "Send Payment is a div with a click handler, so Tab never reaches it; a real submit button can be reached and pressed."
    return diff, reason


def _aws_credentials_error() -> str | None:
    try:
        import boto3
        creds = boto3.Session().get_credentials()
    except Exception as exc:  # boto3 missing or broken config
        return f"AWS credentials could not be read: {str(exc).splitlines()[0][:160]}"
    if creds is None:
        return "No AWS credentials are configured, so Claude on Amazon Bedrock cannot be called."
    return None


def propose(finding: dict, mode: str = "scripted") -> Proposal:
    started = time.perf_counter()
    if mode == "scripted":
        source = page_source()
        diff, reason = _scripted_diff(source, finding)
        try:
            checked = check(diff, source)
        except DiffError as exc:  # the rule's own diff must pass the same gate
            return Proposal("exorcist_failed", None, None, str(exc), "scripted", None, 0, 0, 0.0,
                            (time.perf_counter() - started) * 1000, raw_output=diff)
        return Proposal("proposed", reason, checked, None, "scripted", None, 0, 0, 0.0,
                        (time.perf_counter() - started) * 1000)
    if mode == "llm":
        err = _aws_credentials_error() or "The llm Exorcist is not built yet; Bedrock access is needed to build and test it."
        # Nothing was measured, so usage is null, never 0 (REQ-X-12).
        return Proposal("exorcist_failed", None, None, err, "llm", None, None, None, None,
                        (time.perf_counter() - started) * 1000)
    raise ValueError("exorcist_mode must be scripted or llm")
