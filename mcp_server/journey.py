"""Thin httpx.AsyncClient wrapper around the FastAPI backend (design §6)."""

from __future__ import annotations

import asyncio
import os
import time
from typing import Any

import httpx

from mcp_server.schemas import ErrorDetail, ToolError


def _api_url() -> str:
    return os.environ.get("HAUNTED_AUDIT_API_URL", "http://127.0.0.1:8000").rstrip("/")


def _err(code: str, message: str, status: int | None = None) -> ToolError:
    return ToolError(error=ErrorDetail(code=code, message=message, status=status))


async def post_run(body: dict[str, Any], *, client: httpx.AsyncClient | None = None) -> dict[str, Any] | ToolError:
    owns = client is None
    cli = client or httpx.AsyncClient(base_url=_api_url(), timeout=15.0)
    try:
        resp = await cli.post("/runs", json=body)
        if resp.status_code == 202:
            return resp.json()
        return _err("BACKEND_ERROR", f"POST /runs returned HTTP {resp.status_code}", resp.status_code)
    except (httpx.HTTPError, OSError) as exc:
        return _err("BACKEND_ERROR", f"Backend unavailable: {exc}")
    finally:
        if owns:
            await cli.aclose()


async def fetch_run(run_id: str, *, client: httpx.AsyncClient | None = None) -> dict[str, Any] | ToolError:
    owns = client is None
    cli = client or httpx.AsyncClient(base_url=_api_url(), timeout=15.0)
    try:
        resp = await cli.get(f"/runs/{run_id}")
        if resp.status_code == 200:
            return resp.json()
        if resp.status_code == 404:
            return _err("RUN_NOT_FOUND", f"Run {run_id} not found.", 404)
        return _err("BACKEND_ERROR", f"GET /runs/{run_id} returned HTTP {resp.status_code}", resp.status_code)
    except (httpx.HTTPError, OSError) as exc:
        return _err("BACKEND_ERROR", f"Backend unavailable: {exc}")
    finally:
        if owns:
            await cli.aclose()


async def wait_for_run(
    run_id: str,
    *,
    poll_interval: float = 2.0,
    timeout: float = 120.0,
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any] | ToolError:
    deadline = time.monotonic() + timeout
    while True:
        res = await fetch_run(run_id, client=client)
        if isinstance(res, ToolError):
            return res
        if res.get("status") in {"complete", "error"}:
            return res
        if time.monotonic() >= deadline:
            return _err("WAIT_TIMEOUT", f"Timed out waiting for run {run_id} after {timeout}s.")
        await asyncio.sleep(poll_interval)
