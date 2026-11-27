"""Tests for Ghost Hunter axe-core scanner and POST /scan (items 25 and 26)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from agent.api.main import create_app
from backend.scanner.axe_scanner import scan_bundled_bank


def test_bundled_broken_scan_is_deterministic_and_matches_planted_md() -> None:
    first = scan_bundled_bank("broken")
    second = scan_bundled_bank("broken")
    assert first["findings"] == second["findings"]
    pairs = {(f["rule"], f["element"]) for f in first["findings"]}
    assert pairs == {
        ("label", "#amount"),
        ("color-contrast", "#recipient-hint"),
        ("button-name", "#cancel"),
    }


def test_bundled_fixed_scan_has_zero_findings() -> None:
    res = scan_bundled_bank("fixed")
    assert res["count"] == 0
    assert res["findings"] == []


def test_post_scan_blocks_private_urls_and_rate_limits_public_scans(tmp_path, monkeypatch) -> None:
    now = [100.0]
    app = create_app(tmp_path / "runs.db", clock=lambda: now[0], seed_path=None)
    client = TestClient(app)

    # Bundled variant works without URL
    r_bank = client.post("/scan", json={"variant": "fixed"})
    assert r_bank.status_code == 200
    assert r_bank.json()["count"] == 0

    # SSRF guard blocks loopback and metadata URLs before scanning
    for bad in ("http://127.0.0.1:8000", "http://169.254.169.254/latest/meta-data", "http://localhost:5173"):
        r_bad = client.post("/scan", json={"url": bad})
        assert r_bad.status_code == 422

    # Mock DNS/playwright execution for public scan rate-limit verification
    import agent.api.main as api_mod
    import backend.scanner.axe_scanner as sc_mod

    monkeypatch.setattr(
        api_mod,
        "check_url",
        lambda u: type("R", (), {"url": u})(),
    )
    monkeypatch.setattr(
        sc_mod,
        "scan_public_url",
        lambda u: {"target": u, "findings": [], "count": 0},
    )

    r1 = client.post("/scan", json={"url": "https://example.com"})
    assert r1.status_code == 200
    r2 = client.post("/scan", json={"url": "https://example.com"})
    assert r2.status_code == 429
    assert "1 per minute" in r2.json()["detail"]

    now[0] += 61.0
    r3 = client.post("/scan", json={"url": "https://example.com"})
    assert r3.status_code == 200
