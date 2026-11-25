"""Keyboard-only walk of the "Run the whole loop" card (voice-agent REQ-VA-13).

DEPRECATED (25 Nov 2026), kept on purpose. The card is no longer rendered on Possession Mode (commit f39d344,
team rule "Verify starts when a person presses it"), so this walk cannot reach it and will fail at the first
step. Use scripts/keyboard_loop_walk.py, which walks the manual Fix steps. Kept for history and in case the card
is shown again; AutoLoopCard.tsx, useAutoLoop.ts and auto-loop.test.tsx are kept too.

Only Tab, Shift+Tab, Enter and Space. No clicks. Every stop must show a focus ring.
Usage: DASHBOARD_URL=http://127.0.0.1:5180 .venv/bin/python scripts/keyboard_autoloop_walk.py   (API on the port the dashboard uses)
Checks: Tab reaches Run the whole loop; Enter starts it; the diff and Approve appear and nothing runs on the fixed copy until
Approve is pressed with the keyboard; keyboard and voice verdicts show; Shift+Tab goes back one stop. Exits 1 on any failure.
"""
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get("DASHBOARD_URL", "http://127.0.0.1:5173")
OUT = Path(__file__).resolve().parent.parent / "artifacts" / "loop-walk"
FOCUS = """() => { const e = document.activeElement; if (!e || e === document.body) return null;
  const s = getComputedStyle(e);
  const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none');
  const name = (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\\s+/g, ' ');
  return {tag: e.tagName, name, ring}; }"""
failures: list[str] = []

def fail(msg: str) -> None:
    failures.append(msg)
    print("  FAIL", msg)

def tab_to(pg, name: str, max_presses: int = 120) -> None:
    for _ in range(max_presses):
        pg.keyboard.press("Tab")
        f = pg.evaluate(FOCUS)
        if f and not f["ring"]:
            fail(f"no visible focus ring on {f['tag']} '{f['name'][:40]}'")
        if f and f["name"] == name:
            return
    raise SystemExit(f"FAIL: Tab never reached '{name}' in {max_presses} presses")

def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")
        pg = browser.new_page(viewport={"width": 1280, "height": 800})
        pg.goto(BASE + "/app/journeys/send-payment/possession")
        pg.wait_for_selector("h1")
        pg.wait_for_load_state("networkidle")
        print("1. Tab to Run the whole loop, press Enter")
        tab_to(pg, "Run the whole loop")
        pg.keyboard.press("Enter")
        pg.get_by_text("Broken page: BLOCKED", exact=False).first.wait_for(timeout=60_000)
        pg.get_by_text("Cause:", exact=False).first.wait_for(timeout=30_000)
        print("   broken page BLOCKED, cause shown")
        pg.get_by_role("button", name="Approve and run").wait_for(timeout=30_000)
        if pg.get_by_text(re.compile(r"^Fixed copy, (keyboard|voice):")).count() != 0:  # case-sensitive: the intro says "runs the fixed copy"
            fail("the fixed copy ran before anyone approved")
        else:
            print("   nothing ran on the fixed copy before approval")
        print("2. Tab to Approve and run, press Space")
        tab_to(pg, "Approve and run")
        pg.keyboard.press(" ")
        pg.get_by_text("Fixed copy, keyboard:", exact=False).first.wait_for(timeout=150_000)
        pg.get_by_text("Fixed copy, voice:", exact=False).first.wait_for(timeout=150_000)
        rows = pg.get_by_label("Run the whole loop").or_(pg.locator("section[aria-labelledby=auto-loop-heading]")).first.inner_text()
        print("   " + rows.replace("\n", "\n   "))
        for need in ("Fixed copy, keyboard: PASSED", "Fixed copy, voice: PASSED"):
            if need not in rows:
                fail(f"missing '{need}'")
        pg.screenshot(path=str(OUT / "autoloop.png"), full_page=True)
        print("3. Shift+Tab moves back one stop")
        before = pg.evaluate(FOCUS)
        pg.keyboard.press("Shift+Tab")
        after = pg.evaluate(FOCUS)
        if not after or after == before:
            fail("Shift+Tab did not move focus back")
        browser.close()
    print("RESULT:", "PASS" if not failures else f"FAIL ({len(failures)})")
    return 1 if failures else 0

if __name__ == "__main__":
    raise SystemExit(main())
