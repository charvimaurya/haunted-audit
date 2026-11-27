"""Unit tests for mcp_server.journey and journey_tools (TASK-08, TASK-09, TASK-10)."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

import httpx
import pytest

from mcp_server import journey
from mcp_server.schemas import GetRunOutput, RunJourneyOutput, ToolError
from mcp_server.tools import journey_tools

FIXTURES = Path(__file__).resolve().parent / "fixtures"


def test_post_run_and_fetch_run_errors() -> None:
    async def run_cases() -> None:
        cli_ok = httpx.AsyncClient(
            transport=httpx.MockTransport(lambda req: httpx.Response(202, json={"run_id": "abc", "status": "running"})),
            base_url="http://mock",
        )
        res = await journey.post_run({"variant": "broken"}, client=cli_ok)
        assert res == {"run_id": "abc", "status": "running"}
        await cli_ok.aclose()

        cli_503 = httpx.AsyncClient(
            transport=httpx.MockTransport(lambda req: httpx.Response(503, text="down")),
            base_url="http://mock",
        )
        err = await journey.post_run({"variant": "broken"}, client=cli_503)
        assert isinstance(err, ToolError)
        assert err.error.code == "BACKEND_ERROR"
        assert err.error.status == 503
        await cli_503.aclose()

        cli_404 = httpx.AsyncClient(
            transport=httpx.MockTransport(lambda req: httpx.Response(404)),
            base_url="http://mock",
        )
        nf = await journey.fetch_run("missing", client=cli_404)
        assert isinstance(nf, ToolError)
        assert nf.error.code == "RUN_NOT_FOUND"
        await cli_404.aclose()

    asyncio.run(run_cases())


def test_wait_for_run_polls_and_times_out() -> None:
    async def run_cases() -> None:
        calls = {"n": 0}

        def handler(req: httpx.Request) -> httpx.Response:
            calls["n"] += 1
            status = "running" if calls["n"] < 2 else "complete"
            return httpx.Response(200, json={"run_id": "r1", "status": status})

        cli = httpx.AsyncClient(transport=httpx.MockTransport(handler), base_url="http://mock")
        done = await journey.wait_for_run("r1", poll_interval=0.0, timeout=5.0, client=cli)
        assert isinstance(done, dict) and done["status"] == "complete"
        assert calls["n"] == 2
        await cli.aclose()

        cli_slow = httpx.AsyncClient(
            transport=httpx.MockTransport(lambda req: httpx.Response(200, json={"run_id": "r2", "status": "running"})),
            base_url="http://mock",
        )
        timeout_err = await journey.wait_for_run("r2", poll_interval=0.0, timeout=0.0, client=cli_slow)
        assert isinstance(timeout_err, ToolError)
        assert timeout_err.error.code == "WAIT_TIMEOUT"
        await cli_slow.aclose()

    asyncio.run(run_cases())


def test_run_journey_and_get_run_use_fixture(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_post(body):
        return {"run_id": "r-blocked-1", "status": "running"}

    fixture_result = json.loads((FIXTURES / "run_journey_blocked.json").read_text(encoding="utf-8"))

    async def fake_fetch(run_id: str):
        return {
            "run_id": run_id,
            "status": "complete",
            "mode": "scripted",
            "verdict": fixture_result["verdict"],
            "reason_code": fixture_result["reason_code"],
            "result": fixture_result,
        }

    monkeypatch.setattr(journey, "post_run", fake_post)
    monkeypatch.setattr(journey, "fetch_run", fake_fetch)

    started = asyncio.run(journey_tools.run_journey("send-payment", "broken", "scripted"))
    assert isinstance(started, RunJourneyOutput)
    assert started.mode == "scripted"

    fetched = asyncio.run(journey_tools.get_run(started.run_id))
    assert isinstance(fetched, GetRunOutput)
    assert fetched.verdict == "BLOCKED"
    assert fetched.reason_code == "TARGET_NOT_FOCUSABLE"
    assert fetched.agent_mode == "scripted"
    assert fetched.step_count > 0
