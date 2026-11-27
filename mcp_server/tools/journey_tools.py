"""run_journey and get_run MCP tool functions (TASK-09, TASK-10)."""

from __future__ import annotations

from pydantic import ValidationError

from mcp_server import journey
from mcp_server.schemas import (
    BlockedElementSummary,
    BoundingBoxOut,
    ErrorDetail,
    GetRunInput,
    GetRunOutput,
    RunJourneyInput,
    RunJourneyOutput,
    ToolError,
)


async def run_journey(
    journey_id: str,
    variant: str,
    mode: str = "scripted",
    max_steps: int = 25,
    timeout_seconds: float = 90,
) -> RunJourneyOutput | ToolError:
    try:
        validated = RunJourneyInput(
            journey_id=journey_id,  # type: ignore[arg-type]
            variant=variant,  # type: ignore[arg-type]
            mode=mode,  # type: ignore[arg-type]
            max_steps=max_steps,
            timeout_seconds=timeout_seconds,
        )
    except ValidationError as exc:
        return ToolError(error=ErrorDetail(code="INVALID_INPUT", message=str(exc)))

    resp = await journey.post_run(
        {
            "variant": validated.variant,
            "mode": validated.mode,
            "max_steps": validated.max_steps,
            "timeout_seconds": validated.timeout_seconds,
        }
    )
    if isinstance(resp, ToolError):
        return resp
    return RunJourneyOutput(
        run_id=resp["run_id"],
        status="running",
        journey_id=validated.journey_id,
        variant=validated.variant,
        mode=validated.mode,
    )


async def get_run(run_id: str) -> GetRunOutput | ToolError:
    try:
        validated = GetRunInput(run_id=run_id)
    except ValidationError as exc:
        return ToolError(error=ErrorDetail(code="INVALID_INPUT", message=str(exc)))
    if not validated.run_id.strip():
        return ToolError(error=ErrorDetail(code="INVALID_INPUT", message="run_id must not be empty."))

    record = await journey.fetch_run(validated.run_id)
    if isinstance(record, ToolError):
        return record

    result = record.get("result") or {}
    raw_blocked = result.get("blocked_element")
    blocked: BlockedElementSummary | None = None
    if isinstance(raw_blocked, dict):
        raw_box = raw_blocked.get("bounding_box")
        box = BoundingBoxOut(**raw_box) if isinstance(raw_box, dict) else None
        blocked = BlockedElementSummary(
            selector=raw_blocked.get("selector"),
            tag=raw_blocked.get("tag"),
            accessible_name=raw_blocked.get("accessible_name"),
            bounding_box=box,
        )

    agent_mode = result.get("agent_mode") or record.get("mode") or "scripted"
    steps = result.get("step_events") or []
    return GetRunOutput(
        run_id=record["run_id"],
        status=record["status"],
        verdict=result.get("verdict") or record.get("verdict"),
        reason_code=result.get("reason_code") or record.get("reason_code"),
        agent_mode=agent_mode,
        step_count=len(steps),
        blocked_element=blocked,
        latency_ms=float(result.get("latency_ms") or 0.0),
        cost_usd=float(result.get("cost_usd") or 0.0),
        error=result.get("error"),
    )
