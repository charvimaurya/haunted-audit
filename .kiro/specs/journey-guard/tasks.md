# Tasks: journey test and regression guard

All on `main` (owner, 23 Nov). One commit per task, task id in the message.

- [ ] JG-01 Journey test: `tests/journeys/package.json`, `playwright.config.ts`, `send-payment.spec.ts`; `.gitignore` for its `node_modules`.
  Satisfies REQ-JT-01 to REQ-JT-03.
  Verified by: `npx playwright test` passes on `?variant=fixed` and fails on `?variant=broken` with "Send Payment is not keyboard focusable".
- [ ] JG-02 Regression guard `agent/fixes/regression_guard.py` and `agent/tests/test_regression_guard.py`.
  Satisfies REQ-RG-01 to REQ-RG-03.
  Verified by: pytest (judge logic, always-pass spec gives GUARD_BROKEN, real run gives GUARD_WORKS, fixture hash unchanged).
- [ ] JG-03 Proof and docs: `--runs 5` output to `docs/kiro-writeup/returning-ghost.txt`, README "Fix, verify, prevent", data-contract note, evals case.
  Satisfies REQ-RG-02, REQ-RG-04, REQ-DOC-01.
  Verified by: `GUARD_WORKS 5 of 5` in the saved file; every README command was run.
