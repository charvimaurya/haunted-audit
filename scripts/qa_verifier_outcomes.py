"""The four Verifier outcomes from plan item 2, with real runs (exorcist spec, REQ-X-07 to X-11).
Usage: .venv/bin/python scripts/qa_verifier_outcomes.py
Each row is measured now by the checker or the diff gate; nothing is assumed:
- correct fix: before BLOCKED/TARGET_NOT_FOCUSABLE on the haunted bank, after PASSED on the patched copy (VERIFIED)
- comment-only patch: passes the diff gate, but the checker still says BLOCKED on the copy (STILL_BLOCKED)
- stale patch: its context is not in today's file, so the diff gate refuses it (PATCH_DOES_NOT_APPLY;
  over the API this is 409 DIFF_NO_LONGER_APPLIES)
- already-fixed page: a PASSED run has no finding, so no fix is made (NOT_REPRODUCED; over the API 409 NOTHING_TO_FIX)
- plus demo script v14.1: on the patched copy a mouse click also completes the payment.
Copies are written under artifacts/verify/; fixtures/ is never changed.
"""
from __future__ import annotations

import hashlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from playwright.sync_api import sync_playwright  # noqa: E402

from agent.fixes import exorcist, verifier  # noqa: E402
from agent.fixes.diffcheck import TARGET, DiffError, check  # noqa: E402
from agent.keyboard_agent.runner import _launch_args, build_journey_config, run_journey  # noqa: E402

REPO = Path(__file__).resolve().parents[1]
PLANTED = {"reason_code": "TARGET_NOT_FOCUSABLE", "blocked_element": {"tag": "div"}}


def walk(variant: str = "broken", url: str | None = None):
    cfg = build_journey_config(variant, "scripted", artifacts_dir="artifacts/qa-verifier", **({"start_url": url} if url else {}))
    return run_journey(cfg)


def mouse_pays(url: str) -> bool:
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True, args=_launch_args())
        pg = b.new_page(viewport={"width": 1280, "height": 800})
        pg.goto(url)
        pg.locator("#recipient").fill("Test Recipient")
        pg.locator("#amount").fill("10.00")
        pg.get_by_role("button", name="Send Payment").click()
        try:
            pg.get_by_test_id("payment-confirmation").wait_for(state="visible", timeout=5000)
            ok = True
        except Exception:  # Playwright TimeoutError: no confirmation within 5 s
            ok = False
        b.close()
        return ok


def main() -> int:
    bank = REPO / TARGET
    before_hash = hashlib.sha256(bank.read_bytes()).hexdigest()
    source = exorcist.page_source()
    lines = source.split("\n")
    rows: list[tuple[str, str, str, str]] = []

    # 1. Correct fix
    before = walk("broken")
    prop = exorcist.propose(PLANTED, "scripted")
    copy = verifier.patched_copy("qa-correct", prop.checked.diff)
    after = walk(url=verifier.start_url(copy))
    ok = before.verdict == "BLOCKED" and before.reason_code == "TARGET_NOT_FOCUSABLE" and after.verdict == "PASSED"
    rows.append(("correct fix (Scripted repair demonstration)", "VERIFIED",
                 f"before {before.verdict}/{before.reason_code}, after {after.verdict}", "yes" if ok else "no"))

    # 2. Comment-only patch: one added comment line after the broken Send Payment line
    i = next(n for n, l in enumerate(lines) if 'id="send-payment" onclick' in l)
    comment = "\n".join([f"--- a/{TARGET}", f"+++ b/{TARGET}", f"@@ -{i},2 +{i},3 @@",
                         " " + lines[i - 1], " " + lines[i], "+      // accessibility fixed (comment only)"]) + "\n"
    copy = verifier.patched_copy("qa-comment", comment)  # passes the gate
    still = walk(url=verifier.start_url(copy))
    rows.append(("comment-only patch", "STILL_BLOCKED",
                 f"diff gate accepted it; checker {still.verdict}/{still.reason_code}",
                 "yes" if still.verdict == "BLOCKED" else "no"))

    # 3. Stale patch: context lines that are not in today's file
    stale = prop.checked.diff.replace(" " + lines[i - 1], " " + lines[i - 1] + "  /* older version */", 1)
    try:
        check(stale, source)
        msg, ok = "diff gate accepted it", False
    except DiffError as exc:
        msg, ok = f"diff gate refused it: {exc}", True
    rows.append(("stale patch", "PATCH_DOES_NOT_APPLY", msg, "yes" if ok else "no"))

    # 4. Already-fixed page: the checker passes it, so there is no finding to fix
    fixed = walk("fixed")
    rows.append(("already-fixed page (variant=fixed)", "NOT_REPRODUCED",
                 f"checker {fixed.verdict}, reason_code {fixed.reason_code}; the API refuses a fix with NOTHING_TO_FIX",
                 "yes" if fixed.verdict == "PASSED" and fixed.reason_code is None else "no"))

    # 5. v14.1: mouse click still pays on the patched copy
    copy = verifier.patched_copy("qa-correct", prop.checked.diff)
    clicked = mouse_pays(verifier.start_url(copy))
    rows.append(("patched copy, mouse click", "payment confirmed",
                 "confirmation shown" if clicked else "no confirmation", "yes" if clicked else "no"))

    unchanged = hashlib.sha256(bank.read_bytes()).hexdigest() == before_hash
    print("| case | expected | measured | as expected |")
    print("| --- | --- | --- | --- |")
    for r in rows:
        print("| " + " | ".join(r) + " |")
    print(f"\nagent_mode: scripted (walker), exorcist_mode: scripted. fixtures/haunted_bank unchanged: {'yes' if unchanged else 'NO'}")
    return 0 if unchanged and all(r[3] == "yes" for r in rows) else 1


if __name__ == "__main__":
    sys.exit(main())
