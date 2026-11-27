"""Typed Pydantic v2 input/output schemas for mcp_server (design §4)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

DEFAULT_AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]
WARNING_LITERAL = Literal["This diff has not been applied. Human approval required."]


class ScanUrlInput(BaseModel):
    url: str
    tags: list[str] = Field(default_factory=lambda: list(DEFAULT_AXE_TAGS))


class ScanFileInput(BaseModel):
    path: str


class AxeViolation(BaseModel):
    rule_id: str
    wcag: str
    impact: Literal["critical", "serious", "moderate", "minor"]
    selector: str
    html: str
    failure: str
    help_url: str


class ScanResult(BaseModel):
    url: str
    scanned_at: str
    violations: list[AxeViolation]
    passes: int
    violation_count: int
    route: str | None = None
    file: str | None = None


class RunJourneyInput(BaseModel):
    journey_id: Literal["send-payment"]
    variant: Literal["broken", "fixed"]
    mode: Literal["scripted", "llm"] = "scripted"
    max_steps: int = Field(default=25, ge=1, le=80)
    timeout_seconds: float = Field(default=90, ge=0, le=300)


class GetRunInput(BaseModel):
    run_id: str


class ProposeFixInput(BaseModel):
    run_id: str


class VerifyFixInput(BaseModel):
    run_id: str
    patch: str


class BoundingBoxOut(BaseModel):
    x: float
    y: float
    width: float
    height: float


class BlockedElementSummary(BaseModel):
    selector: str | None = None
    tag: str | None = None
    accessible_name: str | None = None
    bounding_box: BoundingBoxOut | None = None


class RunJourneyOutput(BaseModel):
    run_id: str
    status: Literal["running"]
    journey_id: str
    variant: str
    mode: str


class GetRunOutput(BaseModel):
    run_id: str
    status: Literal["running", "complete", "error"]
    verdict: Literal["PASSED", "BLOCKED"] | None = None
    reason_code: str | None = None
    agent_mode: Literal["scripted", "llm"]
    step_count: int
    blocked_element: BlockedElementSummary | None = None
    latency_ms: float
    cost_usd: float
    error: str | None = None


class FixDiff(BaseModel):
    file: str
    before: str
    after: str
    wcag: str
    rationale: str


class ProposeFixOutput(BaseModel):
    run_id: str
    verdict: Literal["BLOCKED"]
    reason_code: str
    blocked_element: BlockedElementSummary
    diff: FixDiff
    warning: WARNING_LITERAL = "This diff has not been applied. Human approval required."


class VerifyFixOutput(BaseModel):
    original_run_id: str
    verify_run_id: str
    patched_file: str
    verdict: Literal["PASSED", "BLOCKED"]
    reason_code: str | None = None
    agent_mode: str
    step_count: int
    message: str


class RegressionTestEntry(BaseModel):
    name: str
    path: str
    journey_id: str
    variant: str
    last_result: Literal["PASSED", "BLOCKED"] | None = None
    last_run_at: str | None = None


class ListRegressionTestsOutput(BaseModel):
    tests: list[RegressionTestEntry]
    count: int


class ErrorDetail(BaseModel):
    code: str
    message: str
    status: int | None = None


class ToolError(BaseModel):
    error: ErrorDetail
