# Journey test and regression guard (plan item 3)

Replaces TASK-07 and TASK-08 of `fix-verify-prevent`, which were written for an older layout (`agent/fixing/`,
a review branch per fix). The code that exists is `agent/fixes/` (Exorcist, diff check, Verifier copies) and the
API endpoints in `data-contract.md`. Owner decision, 23 Nov: everything lands on `main`, no feature or review
branches, so the generated-branch part of TASK-07 is dropped.

The regression guard is the "Prevent" step: a journey test that a person can keep in CI, which fails when the
Send Payment barrier comes back. The checker still owns `verdict` and `reason_code`; the guard result is a
separate field, `guard`, and never sets a verdict.

## REQ-JT-01 Journey test exists and runs by keyboard only
`tests/journeys/send-payment.spec.ts` (Playwright Test, version pinned to the repo's `1.64.1`) opens the page
given in `JOURNEY_URL`, fills Recipient and Amount, then presses Tab until Send Payment has focus, then Enter.
**Acceptance:** on `fixtures/haunted_bank/index.html?variant=fixed` the test passes; on `?variant=broken` it fails.

## REQ-JT-02 Clear failure message
When Send Payment never gets focus the test fails with the message
`Send Payment is not keyboard focusable: 30 presses of Tab never reached it`.
When it gets focus but Enter does not confirm the payment, the message is
`Send Payment has keyboard focus but Enter did not confirm the payment`.
**Acceptance:** the failure output on the broken page contains `Send Payment is not keyboard focusable`.

## REQ-JT-03 The test finds the control by its accessible name
The test looks for the focused element whose accessible name is "Send Payment". It does not read `JourneyConfig`
or the checker's selectors.
**Acceptance:** `grep -E "target_selector|success_selector" tests/journeys` finds nothing.

## REQ-RG-01 Regression guard: PASS, FAIL, PASS
`python -m agent.fixes.regression_guard` takes the scripted Exorcist's fix for the planted barrier, writes three
copies under `artifacts/regression/<run>/` (fix applied, fix removed, fix restored), runs the journey test on each,
and reports `GUARD_WORKS` only when the results are PASS, FAIL, PASS and the FAIL message contains
`Send Payment is not keyboard focusable`. Any other sequence is `GUARD_BROKEN`.
**Acceptance:** one run prints the three results and `GUARD_WORKS`; exit code 0. A guard given an always-pass
test reports `GUARD_BROKEN`, exit code 1.

## REQ-RG-02 Repeated runs
`--runs N` repeats the whole sequence N times and prints `GUARD_WORKS k of N`, where k is counted from the runs
just executed.
**Acceptance:** `--runs 5` prints `GUARD_WORKS 5 of 5`; the output is saved to `docs/kiro-writeup/returning-ghost.txt`.

## REQ-RG-03 No tracked file changes
The guard writes only under `artifacts/` (git-ignored).
**Acceptance:** `git status --short fixtures/` is empty after a run, and a test checks the fixture hash before and after.

## REQ-RG-04 Honest wording
Output and docs say the test "catches" the bug when it comes back. They never say it "can never" return.
The fix is labelled "Scripted repair demonstration".
**Acceptance:** `grep -i "can never" docs/kiro-writeup/returning-ghost.txt README.md` finds nothing new.

## REQ-DOC-01 README section
README has a "Fix, verify, prevent" section: the fix endpoints that exist today, the Node setup for
`tests/journeys`, the guard command, and that only the llm Exorcist needs Bedrock.
**Acceptance:** the section exists and every command in it was run.

## Out of scope
- New API endpoints. `POST /fixes/{id}/regression` already puts the bug back and runs the checker. O6: `POST /runs`
  and `GET /runs/{id}` are not changed.
- The dashboard "Summon the Ghost Again" button (item 4).
- A branch per fix (owner: no branches).
