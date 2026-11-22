"""Helpers for tests that drive the Haunted Bank page in a real browser.

The page is served from a real local HTTP server (not a file) so storage and
network behaviour are the ones a visitor gets.
"""

from __future__ import annotations

import functools
import http.server
import json
import threading
from contextlib import contextmanager
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
BANK_DIR = ROOT / "fixtures" / "haunted_bank"
AXE_JS = ROOT / "dashboard" / "node_modules" / "axe-core" / "axe.min.js"
BROWSERS = ["chromium", "chrome"]

# The one send control, as it appears in the page source for the haunted state.
HAUNTED_SEND = '<div class="pay-btn" id="send-payment" onclick="window.submitPayment()">Send Payment</div>'
REPAIRED_SEND = '<button type="submit" class="btn-primary" id="send-payment">Send Payment</button>'


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args) -> None:  # keep test output clean
        pass


@contextmanager
def serve(directory: Path):
    handler = functools.partial(_Quiet, directory=str(directory))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}"
    finally:
        server.shutdown()
        server.server_close()


def launch(playwright, name: str):
    """Launch the bundled Chromium or the installed Google Chrome. Skip if absent."""
    kwargs = {"channel": "chrome"} if name == "chrome" else {}
    try:
        return playwright.chromium.launch(headless=True, **kwargs)
    except Exception as exc:  # not installed here: report as not run, never as a pass
        pytest.skip(f"{name} is not available: {str(exc)[:80]}")


def open_bank(browser, base_url: str, variant: str, *, path: str = "index.html"):
    """Open the page in a fresh context. Returns (context, page, console_problems)."""
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()
    problems: list[str] = []
    page.on("console", lambda m: problems.append(m.text) if m.type in ("error", "warning") else None)
    page.on("pageerror", lambda e: problems.append(f"pageerror: {e}"))
    page.goto(f"{base_url}/{path}?variant={variant}")
    return context, page, problems


def contrast_ratio(fg: str, bg: str) -> float:
    """WCAG contrast ratio of two CSS rgb()/rgba() strings."""

    def channels(css: str) -> tuple[float, float, float]:
        nums = css[css.index("(") + 1 : css.index(")")].replace("/", " ").replace(",", " ").split()
        return tuple(float(n) for n in nums[:3])  # type: ignore[return-value]

    def lum(rgb: tuple[float, float, float]) -> float:
        out = []
        for c in rgb:
            c = c / 255
            out.append(c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4)
        return 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2]

    hi, lo = sorted((lum(channels(fg)), lum(channels(bg))), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def run_axe(page) -> list[dict]:
    """Run axe-core (WCAG 2.0 to 2.2 A and AA tags) and return the violations."""
    if not AXE_JS.exists():
        pytest.skip("axe-core is not installed (run `npm ci` in dashboard/): not run")
    page.add_script_tag(content=AXE_JS.read_text())
    result = page.evaluate(
        """async () => {
          const r = await axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }
          });
          return r.violations.map(v => ({ id: v.id, impact: v.impact,
                                          targets: v.nodes.map(n => n.target.join(' ')) }));
        }"""
    )
    return json.loads(json.dumps(result))


def tab_order(page, presses: int = 20, *, reverse: bool = False) -> list[str]:
    """Press Tab (or Shift+Tab) and return the id or tag of each focused element."""
    seen: list[str] = []
    key = "Shift+Tab" if reverse else "Tab"
    for _ in range(presses):
        page.keyboard.press(key)
        seen.append(
            page.evaluate(
                "() => { const a = document.activeElement; "
                "return a ? (a.id || a.tagName.toLowerCase()) : 'none'; }"
            )
        )
    return seen


def focus_by_keyboard(page, element_id: str, limit: int = 20) -> None:
    for _ in range(limit):
        page.keyboard.press("Tab")
        if page.evaluate("document.activeElement && document.activeElement.id") == element_id:
            return
    raise AssertionError(f"Tab never reached #{element_id}")


def money(page) -> str:
    return page.locator("#balance").inner_text()


