"""Unit tests for mcp_server.scanner (TASK-05, TASK-06, TASK-07)."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

import pytest

from mcp_server import scanner
from mcp_server.schemas import ScanResult, ToolError

FIXTURES = Path(__file__).resolve().parent / "fixtures"


def test_classify_severity_promotions_and_no_demotion() -> None:
    assert scanner.classify_severity("keyboard", "serious") == "critical"
    assert scanner.classify_severity("keyboard", "critical") == "critical"
    assert scanner.classify_severity("color-contrast", "serious") == "serious"
    assert scanner.classify_severity("unknown-rule", "minor") == "minor"


def test_scan_url_parses_fixture_and_sorts(monkeypatch: pytest.MonkeyPatch) -> None:
    raw = json.loads((FIXTURES / "scan_url_broken.json").read_text(encoding="utf-8"))
    monkeypatch.setattr(scanner, "_run_node_axe", lambda url, tags: raw)

    res = asyncio.run(scanner.scan_url("http://localhost:5173/?variant=broken"))
    assert isinstance(res, ScanResult)
    assert res.violation_count > 0
    order = {"critical": 3, "serious": 2, "moderate": 1, "minor": 0}
    impacts = [order[v.impact] for v in res.violations]
    assert impacts == sorted(impacts, reverse=True)
    assert all(v.wcag for v in res.violations)


def test_scan_url_unreachable_returns_tool_error(monkeypatch: pytest.MonkeyPatch) -> None:
    def fail(url, tags):
        raise ConnectionRefusedError("refused")

    monkeypatch.setattr(scanner, "_run_node_axe", fail)
    res = asyncio.run(scanner.scan_url("http://localhost:5999"))
    assert isinstance(res, ToolError)
    assert res.error.code == "URL_UNREACHABLE"


def test_scan_url_concurrent_lock_returns_scan_in_progress(monkeypatch: pytest.MonkeyPatch) -> None:
    class _Locked:
        def locked(self) -> bool:
            return True

    monkeypatch.setattr(scanner, "_scan_lock", _Locked())
    res = asyncio.run(scanner.scan_url("http://localhost:5173"))
    assert isinstance(res, ToolError)
    assert res.error.code == "SCAN_IN_PROGRESS"


def test_scan_file_happy_and_offline(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(scanner, "routes_for_file", lambda p: ["/#reports"])
    raw = json.loads((FIXTURES / "scan_url_broken.json").read_text(encoding="utf-8"))
    monkeypatch.setattr(scanner, "_run_node_axe", lambda url, tags: raw)

    class _OkClient:
        def __init__(self, **kw): ...
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return None
        async def get(self, url):
            return type("R", (), {"status_code": 200})()

    monkeypatch.setattr(scanner.httpx, "AsyncClient", _OkClient)
    res = asyncio.run(scanner.scan_file("dashboard/src/components/results/MetricValue.tsx"))
    assert isinstance(res, ScanResult)
    assert res.route == "/#reports"

    class _DeadClient(_OkClient):
        async def get(self, url):
            raise OSError("connection refused")

    monkeypatch.setattr(scanner.httpx, "AsyncClient", _DeadClient)
    err = asyncio.run(scanner.scan_file("dashboard/src/components/results/MetricValue.tsx"))
    assert isinstance(err, ToolError)
    assert err.error.code == "DEV_SERVER_OFFLINE"
