"""Ghost Hunter scanner powered by Playwright + axe-core.

Supports:
- scan_bundled_bank(variant): scans fixtures/haunted_bank/index.html?variant=...
- scan_public_url(url): scan-only public URL check guarded by agent.api.url_guard.check_url.
  Never clicks, types, logs in, or stores raw page content.
"""
from __future__ import annotations

import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Literal

from playwright.sync_api import sync_playwright

from agent.api.url_guard import MAX_SECONDS, check_url

REPO_ROOT = Path(__file__).resolve().parents[2]
AXE_SCRIPT_PATH = REPO_ROOT / "dashboard" / "node_modules" / "axe-core" / "axe.min.js"
BUNDLED_AXE_SCRIPT_PATH = Path(__file__).resolve().parent / "axe.min.js"
FIXTURE_ROOT = REPO_ROOT / "fixtures" / "haunted_bank"
WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]


def _axe_source() -> str:
    for candidate in (AXE_SCRIPT_PATH, BUNDLED_AXE_SCRIPT_PATH):
        if candidate.is_file():
            return candidate.read_text(encoding="utf-8")
    raise RuntimeError(f"axe-core script not found at {AXE_SCRIPT_PATH} or {BUNDLED_AXE_SCRIPT_PATH}")


def _serve_bank_once(variant: str):
    class QuietHandler(SimpleHTTPRequestHandler):
        def log_message(self, format, *args) -> None:  # noqa: A002
            return

    handler = partial(QuietHandler, directory=str(FIXTURE_ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{server.server_address[1]}/index.html?variant={variant}"
    return server, url


def _format_violations(violations: list[dict]) -> list[dict]:
    findings: list[dict] = []
    for v in violations:
        for node in v.get("nodes") or [{}]:
            targets = node.get("target") or []
            findings.append({
                "rule": v.get("id"),
                "impact": v.get("impact"),
                "description": v.get("description"),
                "help": v.get("help"),
                "element": targets[0] if targets else None,
                "failure_summary": node.get("failureSummary"),
            })
    return findings


def _run_axe_on_url(target_url: str) -> list[dict]:
    axe_js = _axe_source()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        page = context.new_page()
        page.set_default_timeout(MAX_SECONDS * 1000)
        page.goto(target_url, wait_until="domcontentloaded")
        page.wait_for_timeout(150)
        page.add_script_tag(content=axe_js)
        raw = page.evaluate(
            """async (tags) => {
                const res = await window.axe.run(document, {
                    runOnly: { type: 'tag', values: tags },
                    resultTypes: ['violations']
                });
                return res.violations;
            }""",
            WCAG_TAGS,
        )
        context.close()
        browser.close()
    return _format_violations(raw or [])


def scan_bundled_bank(variant: Literal["broken", "fixed"] = "broken") -> dict:
    """Run axe-core against the bundled Haunted Bank fixture cleanly."""
    v = "fixed" if variant == "fixed" else "broken"
    server, url = _serve_bank_once(v)
    try:
        findings = _run_axe_on_url(url)
    finally:
        server.shutdown()
        server.server_close()
    return {
        "target": f"fixtures/haunted_bank/index.html?variant={v}",
        "findings": findings,
        "count": len(findings),
    }


def scan_public_url(url: str) -> dict:
    """Validate URL through url_guard.check_url, then perform read-only axe-core scan."""
    resolved = check_url(url)
    findings = _run_axe_on_url(resolved.url)
    return {
        "target": resolved.url,
        "findings": findings,
        "count": len(findings),
    }
