# Item 5: spooky moments as loop steps, plus items 1 and 2 paperwork (committed on main, no PR)

Owner rule: everything on `main`, no branches, so there is no pull request. Spec `.kiro/specs/spooky-steps/`.
Commits: `990b469` (Exorcist TASK-07 and Verifier outcomes), `319966c` (spec), `d5e2a7d` SS-01, `1de776a` SS-02,
then SS-03 (docs and review fixes).

## What changed
- Items 1 and 2: `scripts/qa_exorcist.py --runs 5` (scripted 5/5 valid, verified, caught; llm not run, no AWS) and
  new `scripts/qa_verifier_outcomes.py`: VERIFIED, STILL_BLOCKED (comment-only patch), PATCH_DOES_NOT_APPLY (stale),
  NOT_REPRODUCED (fixed page), and the patched copy pays by mouse click (v14.1). `docs/evidence/verifier-outcomes-2026-11-24.md`.
- Exorcism on Approve: the red ghost glows and fades in 1 s next to "Exorcism started: a person approved the fix.
  The Verifier still has to prove it." Shown only between Approve and Verify.
- Before and after on the Regression step: red BLOCKED from the first run, green VERIFIED only from a PASSED Verifier run.
- Calm and reduced motion: the same states, no movement (the resting style is the end state).

## Tests
| | Before (`047dacb`) | After |
|---|---|---|
| pytest | 416 passed | 416 passed |
| Dashboard (Vitest) | 129 passed | 137 passed |
| qa_verifier_outcomes.py, 5 runs | did not exist | 5 of 5 |
| Keyboard loop walk, motion on, 5 runs | 5 of 5 | 5 of 5 (exorcism and reveal each 1 animation) |
| Keyboard loop walk, reduced motion, 5 runs | not checked | 5 of 5 (0 animations, exorcism ghost at opacity 0.35) |
AI steps: none (no AWS). Keyboard checked: Possession, Fixes Find/Fix/Verify/Regression, Reports.
Secrets: none. `fixtures/` unchanged. evals: no new failure.
Screenshots: `docs/evidence/spooky-split.png`, `docs/evidence/spooky-split-calm.png`.

## QA agent report
QA: PASS. pytest 416/416, Vitest 137/137, qa_verifier_outcomes 5/5, loop walk 5/5 with motion and 5/5 with reduced
motion, REQ-SS-01 to SS-04 met, fixtures clean, no new eval case.

## Reviewer agent report (accessible-ui-review skill loaded)
No serious issue open. Minor items:
1. `Fix` type lacked `created_at`, `history`, `exorcist_model_id` from the data contract (older gap). Fixed: added as optional.
2. The "we caught it" ghost on the Regression step is purple (Ready), not red. Older design choice, not changed here;
   owner and Shilpa to decide (the v9 design draws that ghost white).

## Text for Shilpa to approve
- "Exorcism started: a person approved the fix. The Verifier still has to prove it."
- "Before and after", "BLOCKED", "VERIFIED", "Not verified", "Not run yet: approve and verify a fix to see the before and after."
- README "What you should see" step 7.
- Plan said the Verify step "starts" after the exorcism. It does not start by itself: a person presses Verify.
