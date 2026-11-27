"""Tests for the run_journey and scan_page tools in backend/mcp_server.py."""
from __future__ import annotations

import pytest

from backend.mcp_server import run_journey_impl, scan_page_impl


def test_run_journey_refuses_external_url() -> None:
    with pytest.raises(ValueError, match="bundled Haunted Bank"):
        run_journey_impl(variant="broken", target="https://example.com")


def test_run_journey_refuses_unknown_variant() -> None:
    with pytest.raises(ValueError, match="broken.*fixed"):
        run_journey_impl(variant="invalid")


def test_run_journey_runs_broken_and_fixed() -> None:
    broken = run_journey_impl("broken")
    assert broken["variant"] == "broken"
    assert broken["verdict"] == "BLOCKED"
    assert broken["reason_code"] == "TARGET_NOT_FOCUSABLE"
    assert broken["run_id"]

    fixed = run_journey_impl("fixed")
    assert fixed["variant"] == "fixed"
    assert fixed["verdict"] == "PASSED"
    assert fixed["reason_code"] is None
    assert fixed["run_id"]


def test_scan_page_refuses_http_urls() -> None:
    with pytest.raises(ValueError, match="never fetches a web page"):
        scan_page_impl("https://example.com")
