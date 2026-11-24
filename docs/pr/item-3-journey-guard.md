# Item 3: journey test and regression guard (committed on main, no PR)

The owner asked for everything on `main` with no feature branches (23 Nov), so there is no pull request.
This file holds what the PR template would hold. Commits: `0499cdb` (spec), `b46152d` JG-01, `e75dbf4` JG-02,
`5a798b6` JG-03, `b29a37b` JG-02 review fixes.

## What changed
- `tests/journeys/send-payment.spec.ts`: keyboard-only Playwright test. Tab until Send Payment has focus, then Enter.
  On the haunted bank it fails with "Send Payment is not keyboard focusable: 30 presses of Tab never reached it".
- `python -m agent.fixes.regression_guard [--runs N]`: fix applied PASS, fix removed FAIL, fix restored PASS gives
  GUARD_WORKS. Copies only under `artifacts/regression/`. The fix is a Scripted repair demonstration.
- README: "Fix, verify, prevent" section; Option A heading is now "Quick Start in Kiro" (O4).
- CI: the pytest job installs Node 22 and `tests/journeys`, so the real guard tests run in CI.
- Data contract: guard output documented (not an API endpoint, never a checker verdict).

## Tests
| | Before (`9b3ba6c`) | After |
|---|---|---|
| pytest | 403 passed | 414 passed |
| Dashboard (Vitest) | 117 passed | 117 passed |
| Regression guard, 5 runs (scripted) | did not exist | GUARD_WORKS 5 of 5 |
| Journey test, fixed bank, 5 runs | did not exist | 5 of 5 pass |
| Journey test, haunted bank, 5 runs | did not exist | 5 of 5 fail with the focus message |
AI steps: none in this item (no AWS credentials; scripted Exorcist only).

## Checks
- Keyboard: no dashboard screen changed. The journey test is itself a Tab/Enter check of the bank.
- Secrets: diff searched for AKIA, secret, password, .env: nothing.
- `git status --short fixtures/` empty after every run.
- evals/cases.yaml: no failure found, no case added.

## QA agent report
QA: PASS. pytest 414/414, Vitest 117/117, regression guard GUARD_WORKS 5 of 5, journey test fixed 5/5 PASS,
broken 5/5 FAIL with the correct message, fixtures unchanged. Every acceptance criterion in
`.kiro/specs/journey-guard/requirements.md` met. No failures; evals/cases.yaml unchanged.

## Reviewer agent report
No serious issue open. Minor and note items, all fixed in `b29a37b`:
1. Minor: pytest job had no `actions/setup-node`. Fixed: Node 22 pinned.
2. Minor: missing Chromium gave GUARD_BROKEN (exit 1) instead of "not run" (exit 2). Fixed.
3. Minor: temporary always-pass spec written to a tracked folder with no ignore rule. Fixed: `tests/journeys/.gitignore`.
4. Note: local variable named `verdict` for the guard result. Renamed `guard_result`.
