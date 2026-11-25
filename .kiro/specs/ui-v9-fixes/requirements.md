# Fixes screen to UI v9 (plan items 35 to 41, Fixes part)

Target: `design/v9/05-fixes.html` (and the Fixes views in `design/v9/index.html`). Team rules (24 Nov): follow v9;
if v9 is silent keep what was built, in plain and true words. Verify stays manual (owner, 25 Nov). The Amount-label
fix is on main and stays; nothing here tests it. Branch `feature/ui-v9-fixes` from `origin/main` `ab6fdac`.

## REQ-VF-01 Button wording (v9, team-rules default)
The Verify button says "Replay both journeys". The regression button says "Put the bug back and run both tests".
Both still need a person to press them; nothing starts by itself.
**Acceptance:** Vitest finds both buttons by those names; after Approve no copy run has started until the button is pressed.

## REQ-VF-02 Regression card lists what ran, with real FAILED lines
After the regression check the card shows, in v9's order: "Bug reintroduced on purpose", one line per journey that ran
on the copy with the bug put back ("Keyboard journey" and "Voice-command simulation"), then one FAILED line per
journey the checker blocked. The voice FAILED line uses the voice agent's own message from that run (for example
"Could not activate Send Payment: no accessible role or name"). v9's file names `send_payment.spec.ts` and
`send_payment_voice.spec.ts` are not shown: no such files run in this check, so the names would not be true.
The voice line is counted only when the voice journey was verified first (as before).
**Acceptance:** Vitest with a measured voice regression run shows its message; with no voice run, no voice FAILED line.

## REQ-VF-03 The caught ghost is white (v9, team-rules default)
"The ghost is back. But this time, we caught it." shows a white ghost (new token `ghost.caught`). The red ghost at the
top of the card stays, larger, as in v9. Ghosts stay `aria-hidden`.
**Acceptance:** Vitest: the caught ghost has the `text-ghost-caught` class and no colour state is used for it.

## REQ-VF-04 Done rows show a tick after the text (v9)
Verification and regression rows that are done also show a "✓" after the text, `aria-hidden` (the row already says
"Done" to screen readers).
**Acceptance:** Vitest: done rows end with a hidden tick; rows not run have none.

## REQ-VF-05 Keyboard, axe, honesty
No new tab stops other than the two renamed buttons. axe clean. No PASS, FAIL, VERIFIED or "caught" without the
checker's verdict on that run. `scripts/keyboard_loop_walk.py` and `scripts/record_clips.py` use the new names.
**Acceptance:** Vitest + axe; keyboard loop walk 0 failures; grep finds no old button names.

## Out of scope (v9 differences recorded in the audit, not changed here)
- Fitting the Fixes page into 1366 x 657 without scrolling (needs a shell and layout change across pages).
- The panel top bar with breadcrumb and "Live Test" chip (shell work, every page).
- Showing only the changed lines of the diff in a short box (the real diff is long; the full diff is what a person approves).
