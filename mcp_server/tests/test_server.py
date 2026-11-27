"""Server-level direct tests for all 7 tools in mcp_server.server (TASK-15)."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

import pytest

from agent.fixes.exorcist import propose as exorcist_propose
from mcp_server import fixer, journey, regression, scanner, server
from mcp_server.schemas import (
    BlockedElementSummary,
    GetRunOutput,
    ListRegressionTestsOutput,
    ProposeFixOutput,
    RunJourneyOutput,
    ScanResult,
    ToolError,
    VerifyFixOutput,
)

FIXTURES = Path(__file__).resolve().parent / "fixtures"


def test_all_seven_server_tools_success_and_error(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    raw = json.loads((FIXTURES / "scan_url_broken.json").read_text(encoding="utf-8"))
    run_blocked = json.loads((FIXTURES / "run_journey_blocked.json").read_text(encoding="utf-8"))

    monkeypatch.setattr(scanner, "_run_node_axe", lambda url, tags: raw)

    class _OkClient:
        def __init__(self, **kw): ...
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return None
        async def get(self, url): return type("R", (), {"status_code": 200})()

    monkeypatch.setattr(scanner.httpx, "AsyncClient", _OkClient)

    async def fake_post(body, **kwargs):
        return {"run_id": "run-xyz", "status": "running"}

    async def fake_fetch(run_id: str, **kwargs):
        if run_id == "nonexistent":
            return ToolError(error={"code": "RUN_NOT_FOUND", "message": "not found", "status": 404})
        if run_id == "verify-run":
            return {
                "run_id": "verify-run",
                "status": "complete",
                "mode": "scripted",
                "verdict": "PASSED",
                "result": {"verdict": "PASSED", "reason_code": None, "agent_mode": "scripted", "step_events": [{"step": 1}]},
            }
        return {
            "run_id": run_id,
            "status": "complete",
            "mode": "scripted",
            "verdict": run_blocked["verdict"],
            "reason_code": run_blocked["reason_code"],
            "result": run_blocked,
        }

    async def fake_run_journey(*args, **kwargs):
        return RunJourneyOutput(run_id="verify-run", status="running", journey_id="send-payment", variant="fixed", mode="scripted")

    monkeypatch.setattr(journey, "post_run", fake_post)
    monkeypatch.setattr(journey, "fetch_run", fake_fetch)

    async def run_all() -> None:
        s1 = await server.scan_url("http://localhost:5173/")
        ScanResult.model_validate(s1)
        e1 = await server.scan_url("")
        ToolError.model_validate(e1)

        s2 = await server.scan_file("dashboard/src/components/results/MetricValue.tsx")
        ScanResult.model_validate(s2)
        e2 = await server.scan_file("")
        ToolError.model_validate(e2)

        r1 = await server.run_journey("send-payment", "broken", "scripted")
        RunJourneyOutput.model_validate(r1)
        assert r1["mode"] == "scripted"
        e3 = await server.run_journey("invalid", "broken", "scripted")
        ToolError.model_validate(e3)

        g1 = await server.get_run("run-xyz")
        GetRunOutput.model_validate(g1)
        assert g1["agent_mode"] == "scripted"
        e4 = await server.get_run("nonexistent")
        ToolError.model_validate(e4)

        p1 = await server.propose_fix("run-xyz")
        ProposeFixOutput.model_validate(p1)
        e5 = await server.propose_fix("nonexistent")
        ToolError.model_validate(e5)

        monkeypatch.setattr(fixer, "run_journey", fake_run_journey)
        valid_diff = exorcist_propose({"reason_code": "TARGET_NOT_FOCUSABLE", "blocked_element": {"tag": "div"}}, "scripted").checked.diff  # type: ignore[union-attr]
        v1 = await server.verify_fix("run-xyz", valid_diff)
        VerifyFixOutput.model_validate(v1)
        assert v1["agent_mode"] == "scripted"
        e6 = await server.verify_fix("run-xyz", "bad patch")
        ToolError.model_validate(e6)

        l1 = await server.list_regression_tests()
        ListRegressionTestsOutput.model_validate(l1)

    asyncio.run(run_all())
