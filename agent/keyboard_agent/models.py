"""Pydantic contracts shared by the agent, the checker, the API, and the eval."""

from __future__ import annotations

import re
import unicodedata
from typing import Literal

from pydantic import BaseModel, Field

Verdict = Literal["PASSED", "BLOCKED"]
ReasonCode = Literal[
    "TARGET_NOT_FOCUSABLE",
    "FOCUS_TRAP",
    "NO_ACTIVATION",
    "STEP_LIMIT",
    "TIMEOUT",
]
AgentMode = Literal["llm", "scripted"]
ClaimOutcome = Literal["attempted_complete", "blocked"]
StopReason = Literal["completed", "step_limit", "timeout", "error"]
Variant = Literal["broken", "fixed"]

# Test details for direct API callers only (tests, eval scripts, the CLI, Night Watch) when a request
# carries none. Never put in a run's test_details, never sent to the dashboard as a value, never used
# to fill in a field (user-typed-test-details REQ-TD-06). The dashboard always sends what the tester typed.
INTERNAL_DEFAULT_DETAILS: dict[str, str | None] = {"recipient": "Alex Carter", "amount": "50.00", "reference": "Electricity bill"}

DETAIL_MAX_CHARS = 40


def clean_detail(value: str | None, *, required: bool) -> str | None:
    """Trim a typed test detail and check it (REQ-TD-07). Raises ValueError with a plain sentence.

    1 to 40 characters after trimming. No control or format characters (Unicode category C),
    and no line or paragraph separators, so a value cannot add a line to the agent prompt.
    """
    if value is None:
        if required:
            raise ValueError("is required")
        return None
    if not isinstance(value, str):
        raise ValueError("must be text")
    if any(unicodedata.category(ch).startswith("C") or ch in "\u2028\u2029" for ch in value):
        raise ValueError("must not contain control characters")
    v = value.strip()
    if not v:
        if required:
            raise ValueError("must not be empty")
        return None
    if len(v) > DETAIL_MAX_CHARS:
        raise ValueError(f"must be {DETAIL_MAX_CHARS} characters or fewer")
    return v


# The bank's own amount rule (fixtures/haunted_bank/index.html, toCents and validate). An amount the bank
# refuses can never complete the journey, so it is refused before a run starts instead of ending as
# BLOCKED / NO_ACTIVATION on the fixed page.
AMOUNT_PATTERN = re.compile(r"^(0|[1-9]\d*)\.\d{2}$", re.ASCII)
BANK_START_BALANCE_CENTS = 100_000  # `let balance = 100000;` in the fixture: EUR 1000.00, fresh on every page load
AMOUNT_HINT = "Use two decimals, like 10.00"


def clean_amount(value: str | None, *, required: bool = True) -> str | None:
    """clean_detail, then the bank's rule: two decimals, more than 0.00, at most the EUR 1000.00 test balance."""
    v = clean_detail(value, required=required)
    if v is None:
        return None
    if not AMOUNT_PATTERN.match(v):
        raise ValueError(AMOUNT_HINT)
    cents = int(v.replace(".", ""))
    if cents <= 0:
        raise ValueError(f"must be more than 0.00. {AMOUNT_HINT}")
    if cents > BANK_START_BALANCE_CENTS:
        raise ValueError("must be 1000.00 or less (the test balance)")
    return v
AgentKind = Literal["keyboard", "voice"]
InputSource = Literal["keyboard", "typed", "speech"]


class BoundingBox(BaseModel):
    """Viewport rectangle in CSS pixels. The frontend pins the red ghost here."""

    x: float
    y: float
    width: float
    height: float


class FocusSnapshot(BaseModel):
    """What a keyboard user can know about the element that currently has focus."""

    tag: str
    role: str | None = None
    accessible_name: str = ""
    selector_hint: str = ""
    bounding_box: BoundingBox | None = None
    is_visible: bool = False

    def identity(self) -> str:
        """Stable key for the focus trail. Two visits to the same control match."""
        return "|".join(
            [
                self.tag,
                self.role or "",
                self.accessible_name,
                self.selector_hint,
            ]
        )


class StepEvent(BaseModel):
    """One tool call. The live timeline on the dashboard is a stream of these."""

    step: int
    tool: str
    args: dict
    focused_before: FocusSnapshot | None = None
    focused_after: FocusSnapshot | None = None
    timestamp: str
    screenshot_path: str | None = None


class BlockedElement(BaseModel):
    """The control the checker measured. The agent is never given this selector."""

    selector: str
    bounding_box: BoundingBox | None = None
    tag: str | None = None
    accessible_name: str | None = None
    text: str | None = None


class TokenUsage(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0


class JourneyConfig(BaseModel):
    """Everything required to attempt one journey.

    ``target_selector`` and ``success_selector`` are for the checker only.
    They must never be copied into the agent prompt.
    """

    start_url: str
    goal: str
    target_selector: str
    success_selector: str = "[data-testid='payment-confirmation']"
    recipient: str = INTERNAL_DEFAULT_DETAILS["recipient"]  # type: ignore[assignment]
    amount: str = INTERNAL_DEFAULT_DETAILS["amount"]  # type: ignore[assignment]
    # reference-field REQ-RF-04: direct callers type the default reference; a tester's run types only what they typed.
    reference: str | None = INTERNAL_DEFAULT_DETAILS["reference"]
    max_steps: int = Field(default=25, ge=1)
    timeout_seconds: float = Field(default=90.0, ge=0)
    agent_mode: AgentMode = "scripted"
    variant: Variant = "broken"
    artifacts_dir: str = "artifacts"
    input_usd_per_mtok: float = 3.0
    output_usd_per_mtok: float = 15.0


class CheckerInput(BaseModel):
    """Facts the checker is allowed to use. None of them come from the model."""

    success_visible: bool
    focus_trail: list[FocusSnapshot] = Field(default_factory=list)
    target_ever_focused: bool = False
    blocked_element: BlockedElement | None = None
    stop_reason: StopReason = "completed"
    agent_claim: ClaimOutcome | None = None


class CheckerOutput(BaseModel):
    verdict: Verdict
    reason_code: ReasonCode | None = None
    target_ever_focused: bool
    last_focused_element: FocusSnapshot | None = None
    skipped_element: FocusSnapshot | None = None
    blocked_element: BlockedElement | None = None
    agent_claim_mismatch: bool = False


class JourneyResult(BaseModel):
    """The record the API stores and the eval scores. The model does not write this."""

    run_id: str
    verdict: Verdict
    reason_code: ReasonCode | None = None
    focus_trail: list[FocusSnapshot] = Field(default_factory=list)
    step_events: list[StepEvent] = Field(default_factory=list)
    screenshots: list[str] = Field(default_factory=list)
    blocked_element: BlockedElement | None = None
    agent_mode: AgentMode
    tokens: TokenUsage = Field(default_factory=TokenUsage)
    latency_ms: float = 0.0
    cost_usd: float = 0.0
    agent_claim: ClaimOutcome | None = None
    agent_claim_reason: str | None = None
    agent_claim_mismatch: bool = False
    target_ever_focused: bool = False
    last_focused_element: FocusSnapshot | None = None
    skipped_element: FocusSnapshot | None = None
    variant: str
    goal: str
    stop_reason: StopReason = "completed"
    error: str | None = None
    # Which agent ran and where its input came from (voice-agent REQ-VA-06). Additive, keyboard by default.
    agent_kind: AgentKind = "keyboard"
    input_source: InputSource = "keyboard"
