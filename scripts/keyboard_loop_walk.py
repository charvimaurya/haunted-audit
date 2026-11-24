"""Keyboard-only walk of the whole fix loop (loop-evidence LE-02): run, propose, approve, verify, regression, Reports.
Only Tab, Shift+Tab, Enter, Space and typing into a focused field. No clicks. Every stop must show a focus ring.
Usage: DASHBOARD_URL=http://127.0.0.1:5180 API_URL=http://127.0.0.1:8010 .venv/bin/python scripts/keyboard_loop_walk.py
Prints what each step showed and exits 1 on any failure. Screenshots go to artifacts/loop-walk/.
"""
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = os.environ.get("DASHBOARD_URL", "http://127.0.0.1:5173")
API = os.environ.get("API_URL", "http://127.0.0.1:8000")
OUT = Path(__file__).resolve().parent.parent / "artifacts" / "loop-walk"
FOCUS = """() => { const e = document.activeElement; if (!e || e === document.body) return null;
  const s = getComputedStyle(e);
  const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none');
  const name = (e.getAttribute('aria-label') || (e.labels && e.labels[0] && e.labels[0].textContent) || e.textContent || '')
    .trim().replace(/\\s+/g, ' ');
  return {tag: e.tagName, name, ring}; }"""
failures: list[str] = []


def fail(msg: str) -> None:
    failures.append(msg)
    print("  FAIL", msg)


def tab_to(pg, name: str, max_presses: int = 90) -> None:
    """Press Tab until the focused element's name is exactly `name`."""
    seen = []
    for _ in range(max_presses):
        pg.keyboard.press("Tab")
        f = pg.evaluate(FOCUS)
        seen.append(f"{f['tag']} {f['name'][:30]}" if f else "(page)")
        if f and not f["ring"]:
            fail(f"no visible focus ring on {f['tag']} '{f['name'][:40]}'")
        if f and f["name"] == name:
            return
    raise SystemExit(f"FAIL: Tab never reached '{name}' in {max_presses} presses on {pg.url}. Stops: {seen[:40]}")


def wait_text(pg, text: str, timeout: float = 150) -> None:
    pg.get_by_text(text, exact=False).first.wait_for(timeout=timeout * 1000)


def api(path: str) -> dict:
    with urllib.request.urlopen(API + path, timeout=10) as r:
        return json.load(r)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")
        pg = browser.new_page(viewport={"width": 1280, "height": 800})
        pg.goto(BASE + "/app/journeys/send-payment/possession")
        pg.wait_for_selector("h1")
        pg.wait_for_load_state("networkidle")

        print("1. Possession: type the recipient, Run Journey with Enter")
        tab_to(pg, "Recipient name")
        pg.keyboard.type("Test Recipient")
        tab_to(pg, "Run Journey")
        pg.keyboard.press("Enter")
        pg.get_by_role("button", name="Running…").wait_for(timeout=10_000)
        pg.get_by_role("button", name="Run Journey").wait_for(timeout=150_000)
        print("   run finished (the Run Journey button is back)")

        print("2. Fixes: Propose with Enter, Approve with Space")
        tab_to(pg, "Fixes")
        pg.keyboard.press("Enter")
        pg.get_by_role("heading", level=1, name="Fixes: Find").wait_for()
        tab_to(pg, "Next: Fix")
        pg.keyboard.press("Enter")
        pg.get_by_role("heading", level=1, name="Fixes: Fix").wait_for()
        tab_to(pg, "Propose a fix (scripted Exorcist)")
        pg.keyboard.press("Enter")
        wait_text(pg, "Approve Fix", 30)
        tab_to(pg, "Approve Fix")
        pg.keyboard.press(" ")
        wait_text(pg, "No file in the repo was changed", 30)

        print("3. Verify with Enter: keyboard and voice on the patched copy")
        tab_to(pg, "Verify on a patched copy")
        pg.keyboard.press("Enter")
        pg.wait_for_function(
            "() => /Voice-command simulation: (VERIFIED|Not verified|The run failed)/.test(document.body.innerText)",
            timeout=150_000)
        # A voice run that is not verified also shows why, read from its steps once the run is complete.
        pg.wait_for_function(
            """() => { const t = document.querySelector('[aria-label="Verifier evidence"]').innerText;
               return /Voice-command simulation: VERIFIED/.test(t) || t.trim().split('\\n').length >= 5; }""",
            timeout=10_000)
        evidence = pg.get_by_role("list", name="Verifier evidence").inner_text()
        print("   " + evidence.replace("\n", "\n   "))
        verdict_line = pg.locator("text=Keyboard only").or_(pg.locator("text=Keyboard and voice")).first.inner_text()
        print(f"   under Journey Verified: {verdict_line}")
        pg.screenshot(path=str(OUT / "verify.png"), full_page=True)

        print("4. Shift+Tab moves back one stop")
        before = pg.evaluate(FOCUS)
        pg.keyboard.press("Shift+Tab")
        after = pg.evaluate(FOCUS)
        if not after or after == before:
            fail("Shift+Tab did not move focus back")
        pg.keyboard.press("Tab")

        print("5. Regression with Enter: the bug put back on a copy")
        tab_to(pg, "Put the bug back and check")
        pg.keyboard.press("Enter")
        pg.wait_for_function(
            "() => /(Voice: not counted|FAILED \\(voice\\)|PASSED \\(voice\\))/.test(document.body.innerText)",
            timeout=150_000)
        steps = pg.get_by_role("list", name="Regression steps").inner_text()
        print("   " + steps.replace("\n", "\n   "))
        pg.screenshot(path=str(OUT / "regression.png"), full_page=True)

        print("6. Reports with Enter: the same two rows and run IDs")
        tab_to(pg, "Reports")
        pg.keyboard.press("Enter")
        pg.get_by_role("heading", name="Verifier evidence (patched copy)").wait_for()
        reports = pg.get_by_role("list", name="Verifier evidence").inner_text()
        print("   " + reports.replace("\n", "\n   "))
        if reports != evidence:
            fail("Reports evidence differs from the Verification panel")
        pg.screenshot(path=str(OUT / "reports.png"), full_page=True)
        browser.close()

    # The run IDs on screen are the API's own.
    lines = [ln for ln in evidence.splitlines() if ln.startswith("Run ")]
    shown = [ln.split()[1].rstrip(",") for ln in lines]
    for run_id in shown:
        rec = api(f"/runs/{run_id}")
        print(f"   API {run_id[:8]}: {rec['result'].get('agent_kind')} {rec['verdict']} {rec['reason_code']}")
    if len(set(shown)) != 2:
        fail(f"expected two different run IDs on screen, got {shown}")

    print(f"\n{len(failures)} failure(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
