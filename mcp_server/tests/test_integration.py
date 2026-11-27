"""Integration tests requiring a live browser / backend (TASK-22)."""

from __future__ import annotations

import asyncio
import http.server
import socketserver
import subprocess
import sys
import threading
import time
from functools import partial
from pathlib import Path

import httpx
import pytest

from mcp_server import journey, scanner

REPO = Path(__file__).resolve().parents[2]


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:  # noqa: A002
        return


@pytest.mark.integration
def test_scan_url_against_fixture() -> None:
    bank_dir = REPO / "fixtures" / "haunted_bank"
    srv = socketserver.TCPServer(("127.0.0.1", 0), partial(_Quiet, directory=str(bank_dir)))
    port = srv.server_address[1]
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    try:
        broken = asyncio.run(scanner.scan_url(f"http://127.0.0.1:{port}/index.html?variant=broken"))
        assert not isinstance(broken, type(None))
        assert broken.violation_count > 0  # type: ignore[union-attr]

        fixed = asyncio.run(scanner.scan_url(f"http://127.0.0.1:{port}/index.html?variant=fixed"))
        assert not any("pay-btn" in v.selector for v in fixed.violations)  # type: ignore[union-attr]
    finally:
        srv.shutdown()
        srv.server_close()


@pytest.mark.integration
def test_run_journey_round_trip(monkeypatch: pytest.MonkeyPatch) -> None:
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "agent.api.main:app", "--host", "127.0.0.1", "--port", "18000"],
        cwd=str(REPO),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    monkeypatch.setenv("HAUNTED_AUDIT_API_URL", "http://127.0.0.1:18000")
    try:
        for _ in range(30):
            try:
                if httpx.get("http://127.0.0.1:18000/ping", timeout=1.0).status_code == 200:
                    break
            except Exception:
                time.sleep(0.2)

        async def run_flow():
            created = await journey.post_run({"variant": "broken", "mode": "scripted", "max_steps": 25, "timeout_seconds": 60})
            return await journey.wait_for_run(created["run_id"], poll_interval=0.5, timeout=90.0)

        done = asyncio.run(run_flow())
        assert done["result"]["verdict"] == "BLOCKED"
        assert done["result"]["reason_code"] == "TARGET_NOT_FOCUSABLE"
        assert done["result"]["agent_mode"] == "scripted"
        assert done["result"]["blocked_element"]["selector"] == "div.pay-btn"
    finally:
        proc.terminate()
        proc.wait(timeout=5)
