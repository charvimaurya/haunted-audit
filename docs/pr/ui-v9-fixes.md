# Fixes screen to UI v9 (branch feature/ui-v9-fixes)

Team rules: a Reviewer report in docs/pr/ counts instead of a GitHub pull request. Spec `.kiro/specs/ui-v9-fixes/`.
Base `origin/main` `ab6fdac`. Commits: `f8e0362` spec, `e4a3f36` VF-01, `d9507b1` and `fc8ca30` (see "History note"),
`df2520b` VF-02, `667e676` review fix.

## What changed
- Fixes buttons: "Replay both journeys" and "Put the bug back and run both tests" (v9, team-rules default). Verify
  stays manual: a test proves nothing replays until a person presses the button.
- Done rows are ticked after the text (CSS, empty alt text). The "we caught it" ghost is white (token `ghost.caught`).
- The Regression card lists what ran on the copy with the bug put back ("Keyboard journey", "Voice-command
  simulation") and one FAILED line per blocked journey. The voice line is the voice agent's own first failed step,
  read from that run; until it loads, it names no control.
- `scripts/keyboard_loop_walk.py` fits the Test details form merged on 24 Nov (it had stopped working) and the new names.
- README Verify step matches the latest run; decision-log has one line per default; v9 audit of every screen in
  `docs/ui-fidelity/v9-audit.md` with side-by-side images.

## Measured (25 Nov, scripted, no AWS)
| | Before (`ab6fdac`) | After |
|---|---|---|
| pytest | 503 passed | 503 passed |
| Vitest | 156 passed | 162 passed |
| Keyboard loop walk, motion, 5 runs | not runnable (old form) | 5 of 5, 0 failures |
| Keyboard loop walk, reduced motion, 5 runs | not runnable | 5 of 5, 0 failures |
On the patched copy: keyboard PASSED and voice PASSED in every run. With the bug put back: keyboard BLOCKED
(TARGET_NOT_FOCUSABLE) and voice BLOCKED; the voice agent's first failure is "Could not type in Amount: no accessible
label", because the reverse patch also removes the Amount label.

Keyboard checked: Possession, Fixes Find, Fix, Verify, Regression, Reports. Secrets: none. `fixtures/` unchanged.
Test edits: one button name in `fix-panels.test.tsx` and one fallback text in `loop-evidence.test.tsx`, both to the
new wording with the same strength.

## QA agent
QA: PASS. pytest 503/503, Vitest 162/162, loop walk 5/5 with motion and 5/5 with reduced motion, REQ-VF-01 to 05 met,
no old button names left, fixtures clean, no new eval case.

## Reviewer agent (accessible-ui-review skill loaded)
No serious issue. Minor: the CSS tick may be read out in Firefox before 128 (accepted); the audit's Scans row was
empty (fixed in `667e676`). Notes: the two commits made by another process contain only the intended edits; the
dated README claim must be re-checked on the next run.

## History note
`d9507b1` and `fc8ca30` were created in this worktree at 22:09 by a process other than this session, about 40 seconds
before this session's own commit. They hold exactly this session's uncommitted edits. There is no git or Kiro hook
that commits. History was kept as it is (no rewrite). The owner should find which session commits in other worktrees.

## Text for Shilpa (review after build)
"Replay both journeys", "Put the bug back and run both tests", "Keyboard journey", "Voice-command simulation",
"FAILED (voice): the voice journey was blocked (<code>)", the white caught ghost, README Verify step.

## Claims affected
Deck, video and README must not say the voice journey is blocked after the fix: the latest run shows both journeys
PASSED on the patched copy.
