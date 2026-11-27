"""axe-core scanner wrapper for mcp_server (design §5 & §10)."""

from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

from mcp_server.route_map import routes_for_file
from mcp_server.schemas import AxeViolation, DEFAULT_AXE_TAGS, ErrorDetail, ScanResult, ToolError

WCAG_MAP: dict[str, str] = {
    "aria-allowed-attr": "WCAG 4.1.2 A",
    "aria-hidden-focus": "WCAG 4.1.2 A",
    "aria-input-field-name": "WCAG 4.1.2 A",
    "aria-required-attr": "WCAG 4.1.2 A",
    "aria-roles": "WCAG 4.1.2 A",
    "aria-valid-attr": "WCAG 4.1.2 A",
    "aria-valid-attr-value": "WCAG 4.1.2 A",
    "button-name": "WCAG 4.1.2 A",
    "bypass": "WCAG 2.4.1 A",
    "color-contrast": "WCAG 1.4.3 AA",
    "color-contrast-enhanced": "WCAG 1.4.6 AAA",
    "document-title": "WCAG 2.4.2 A",
    "duplicate-id-active": "WCAG 4.1.1 A",
    "focus-order-semantics": "WCAG 2.4.3 A",
    "focus-trap": "WCAG 2.1.2 A",
    "frame-title": "WCAG 4.1.2 A",
    "heading-order": "WCAG 1.3.1 A",
    "html-has-lang": "WCAG 3.1.1 A",
    "image-alt": "WCAG 1.1.1 A",
    "input-button-name": "WCAG 4.1.2 A",
    "keyboard": "WCAG 2.1.1 A",
    "label": "WCAG 1.3.1 A / 4.1.2 A",
    "landmark-one-main": "WCAG 1.3.1 A",
    "link-name": "WCAG 4.1.2 A",
    "nested-interactive": "WCAG 4.1.2 A",
    "region": "WCAG 1.3.1 A",
    "scrollable-region-focusable": "WCAG 2.1.1 A",
    "select-name": "WCAG 4.1.2 A",
    "tabindex": "WCAG 2.4.3 A",
}

SEVERITY_OVERRIDES: dict[str, str] = {
    "keyboard": "critical",
    "focus-trap": "critical",
    "button-name": "serious",
    "label": "serious",
    "aria-hidden-focus": "serious",
    "color-contrast": "moderate",
    "heading-order": "moderate",
    "duplicate-id-active": "serious",
}

_IMPACT_ORDER = ["minor", "moderate", "serious", "critical"]

_INLINE_AXE_SCRIPT = """import { createRequire } from 'node:module';
const require = createRequire(process.env.HA_NODE_REQUIRE_BASE);
const { chromium } = require('playwright');
const AxeBuilderModule = require('@axe-core/playwright');
const AxeBuilder = AxeBuilderModule.default || AxeBuilderModule;
const [,, url, tagsJson] = process.argv;
const tags = JSON.parse(tagsJson);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(600);
const results = await new AxeBuilder({ page }).withTags(tags).analyze();
await browser.close();
console.log(JSON.stringify(results));
"""

_scan_lock = asyncio.Lock()


def classify_severity(rule_id: str, axe_impact: str) -> str:
    """Return effective severity; never demotes below axe_impact."""
    base = axe_impact if axe_impact in _IMPACT_ORDER else "moderate"
    override = SEVERITY_OVERRIDES.get(rule_id)
    if override is None or override not in _IMPACT_ORDER:
        return base
    return _IMPACT_ORDER[max(_IMPACT_ORDER.index(override), _IMPACT_ORDER.index(base))]


def wcag_for(rule_id: str) -> str:
    return WCAG_MAP.get(rule_id, "WCAG 2.1 AA")


def _tool_error(code: str, message: str, status: int | None = None) -> ToolError:
    return ToolError(error=ErrorDetail(code=code, message=message, status=status))


def _check_node() -> str:
    node = shutil.which("node")
    if not node:
        raise RuntimeError("SCANNER_UNAVAILABLE: Node.js >= 18 is not on PATH.")
    proc = subprocess.run([node, "--version"], capture_output=True, text=True, timeout=10)
    if proc.returncode != 0:
        raise RuntimeError("SCANNER_UNAVAILABLE: Could not read node --version.")
    m = re.match(r"v?(\d+)", proc.stdout.strip())
    major = int(m.group(1)) if m else 0
    if major < 18:
        raise RuntimeError(f"SCANNER_UNAVAILABLE: Node.js >= 18 required (found {proc.stdout.strip()}).")
    return node


def _write_axe_script(tmp_dir: Path) -> Path:
    script = tmp_dir / "run-axe.mjs"
    script.write_text(_INLINE_AXE_SCRIPT, encoding="utf-8")
    return script


def _run_node_axe(url: str, tags: list[str], node_modules_dir: Path | None = None) -> dict[str, Any]:
    node = _check_node()
    dashboard_dir = Path(os.environ.get("HAUNTED_AUDIT_DASHBOARD_DIR", "dashboard")).resolve()
    nm_dir = (node_modules_dir or (dashboard_dir / "node_modules")).resolve()
    require_base = str((nm_dir.parent / "package.json").resolve())
    tmp_dir = Path(tempfile.mkdtemp(prefix="ha_axe_"))
    script = _write_axe_script(tmp_dir)
    env = {**os.environ, "NODE_PATH": str(nm_dir), "HA_NODE_REQUIRE_BASE": require_base}
    try:
        proc = subprocess.run(
            [node, str(script), url, json.dumps(tags)],
            cwd=str(dashboard_dir if dashboard_dir.is_dir() else tmp_dir),
            env=env,
            capture_output=True,
            text=True,
            timeout=60,
        )
        if proc.returncode != 0:
            err = (proc.stderr or proc.stdout or "").strip()
            if "ERR_CONNECTION_REFUSED" in err or "net::" in err or "Timeout" in err:
                raise ConnectionRefusedError(err)
            raise RuntimeError(err or f"axe subprocess failed with exit code {proc.returncode}")
        return json.loads(proc.stdout)
    finally:
        script.unlink(missing_ok=True)
        shutil.rmtree(tmp_dir, ignore_errors=True)


def _parse_axe_output(raw: dict[str, Any], url: str) -> ScanResult:
    violations: list[AxeViolation] = []
    for v in raw.get("violations") or []:
        rule_id = str(v.get("id") or "unknown")
        axe_impact = str(v.get("impact") or "moderate")
        impact = classify_severity(rule_id, axe_impact)
        wcag = wcag_for(rule_id)
        help_url = str(v.get("helpUrl") or "")
        for node in v.get("nodes") or [{}]:
            targets = node.get("target") or []
            selector = str(targets[0]) if targets else "document"
            html = str(node.get("html") or "")[:200]
            failure = str(node.get("failureSummary") or v.get("help") or v.get("description") or "")
            violations.append(
                AxeViolation(
                    rule_id=rule_id,
                    wcag=wcag,
                    impact=impact,  # type: ignore[arg-type]
                    selector=selector,
                    html=html,
                    failure=failure,
                    help_url=help_url,
                )
            )
    violations.sort(key=lambda item: _IMPACT_ORDER.index(item.impact), reverse=True)
    return ScanResult(
        url=url,
        scanned_at=datetime.now(timezone.utc).isoformat(),
        violations=violations,
        passes=len(raw.get("passes") or []),
        violation_count=len(violations),
    )


async def scan_url(url: str, tags: list[str] | None = None) -> ScanResult | ToolError:
    cleaned = (url or "").strip()
    if not cleaned:
        return _tool_error("INVALID_INPUT", "URL must not be empty.")
    if _scan_lock.locked():
        return _tool_error("SCAN_IN_PROGRESS", "Another accessibility scan is already running.")
    use_tags = list(tags) if tags else list(DEFAULT_AXE_TAGS)
    async with _scan_lock:
        try:
            raw = await asyncio.to_thread(_run_node_axe, cleaned, use_tags)
            return _parse_axe_output(raw, cleaned)
        except ConnectionRefusedError as exc:
            return _tool_error("URL_UNREACHABLE", f"Could not reach {cleaned}: {exc}")
        except RuntimeError as exc:
            msg = str(exc)
            if msg.startswith("SCANNER_UNAVAILABLE:"):
                return _tool_error("SCANNER_UNAVAILABLE", msg.split(":", 1)[1].strip())
            return _tool_error("SCAN_FAILED", msg)


async def scan_file(path: str) -> ScanResult | ToolError:
    cleaned = (path or "").strip()
    if not cleaned:
        return _tool_error("INVALID_INPUT", "File path must not be empty.")
    dev_url = os.environ.get("HAUNTED_AUDIT_DEV_SERVER_URL", "http://localhost:5173").rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(dev_url)
            if resp.status_code >= 500:
                return _tool_error("DEV_SERVER_OFFLINE", f"Dev server returned HTTP {resp.status_code}.", resp.status_code)
    except (httpx.HTTPError, OSError) as exc:
        return _tool_error("DEV_SERVER_OFFLINE", f"Dev server at {dev_url} is offline: {exc}")

    routes = routes_for_file(cleaned)
    merged: list[AxeViolation] = []
    seen_keys: set[tuple[str, str]] = set()
    total_passes = 0
    for route in routes:
        target_url = f"{dev_url}{route if route.startswith('/') else '/' + route}"
        res = await scan_url(target_url)
        if isinstance(res, ToolError):
            return res
        total_passes += res.passes
        for v in res.violations:
            key = (v.rule_id, v.selector)
            if key not in seen_keys:
                seen_keys.add(key)
                merged.append(v)

    first_route = routes[0] if routes else "/"
    return ScanResult(
        url=f"{dev_url}{first_route if first_route.startswith('/') else '/' + first_route}",
        scanned_at=datetime.now(timezone.utc).isoformat(),
        violations=merged,
        passes=total_passes,
        violation_count=len(merged),
        route=first_route,
        file=cleaned,
    )
