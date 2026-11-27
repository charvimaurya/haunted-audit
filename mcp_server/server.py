"""Haunted Audit MCP server over stdio exposing all 7 integration tools (TASK-14)."""

from __future__ import annotations

import asyncio
import sys
import traceback
from typing import Any

from mcp.server.mcpserver import MCPServer

from mcp_server import fixer, regression, scanner
from mcp_server.schemas import (
    DEFAULT_AXE_TAGS,
    ErrorDetail,
    GetRunOutput,
    ListRegressionTestsOutput,
    ProposeFixOutput,
    RunJourneyOutput,
    ScanResult,
    ToolError,
    VerifyFixOutput,
)
from mcp_server.tools import journey_tools

server = MCPServer(
    name="haunted-audit",
    instructions=(
        "Haunted Audit MCP server: scan_url, scan_file, run_journey, get_run, "
        "propose_fix, verify_fix, and list_regression_tests. "
        "Agents propose; humans approve; verify_fix runs on a temporary copy."
    ),
)


def _internal_error(exc: Exception) -> dict[str, Any]:
    traceback.print_exc(file=sys.stderr)
    return ToolError(
        error=ErrorDetail(code="INTERNAL_ERROR", message=str(exc))
    ).model_dump(mode="json")


def _dump(res: Any) -> dict[str, Any]:
    if hasattr(res, "model_dump"):
        return res.model_dump(mode="json")
    return dict(res)


@server.tool(name="scan_url", description="Run axe-core WCAG scan against a URL via Node subprocess.")
async def scan_url(url: str, tags: list[str] | None = None) -> dict[str, Any]:
    try:
        res: ScanResult | ToolError = await scanner.scan_url(url, tags or list(DEFAULT_AXE_TAGS))
        return _dump(res)
    except Exception as exc:
        return _internal_error(exc)


@server.tool(name="scan_file", description="Map workspace file path to routes and scan via axe-core.")
async def scan_file(path: str) -> dict[str, Any]:
    try:
        res: ScanResult | ToolError = await scanner.scan_file(path)
        return _dump(res)
    except Exception as exc:
        return _internal_error(exc)


@server.tool(name="run_journey", description="Start an accessibility journey run on Haunted Bank.")
async def run_journey(
    journey_id: str = "send-payment",
    variant: str = "broken",
    mode: str = "scripted",
    max_steps: int = 25,
    timeout_seconds: float = 90,
) -> dict[str, Any]:
    try:
        res: RunJourneyOutput | ToolError = await journey_tools.run_journey(
            journey_id=journey_id,
            variant=variant,
            mode=mode,
            max_steps=max_steps,
            timeout_seconds=timeout_seconds,
        )
        return _dump(res)
    except Exception as exc:
        return _internal_error(exc)


@server.tool(name="get_run", description="Fetch journey run status, verdict, and blocked element.")
async def get_run(run_id: str) -> dict[str, Any]:
    try:
        res: GetRunOutput | ToolError = await journey_tools.get_run(run_id)
        return _dump(res)
    except Exception as exc:
        return _internal_error(exc)


@server.tool(name="propose_fix", description="Generate a deterministic accessibility diff proposal for human review.")
async def propose_fix(run_id: str) -> dict[str, Any]:
    try:
        res: ProposeFixOutput | ToolError = await fixer.propose_fix(run_id)
        return _dump(res)
    except Exception as exc:
        return _internal_error(exc)


@server.tool(name="verify_fix", description="Verify a proposed patch on a temporary copy via Playwright.")
async def verify_fix(run_id: str, patch: str) -> dict[str, Any]:
    try:
        res: VerifyFixOutput | ToolError = await fixer.verify_fix(run_id, patch)
        return _dump(res)
    except Exception as exc:
        return _internal_error(exc)


@server.tool(name="list_regression_tests", description="Discover accessibility regression tests and cached results.")
async def list_regression_tests() -> dict[str, Any]:
    try:
        res: ListRegressionTestsOutput = await asyncio.to_thread(regression.list_regression_tests)
        return _dump(res)
    except Exception as exc:
        return _internal_error(exc)


async def main() -> None:
    await server.run_stdio_async()


if __name__ == "__main__":
    asyncio.run(main())
