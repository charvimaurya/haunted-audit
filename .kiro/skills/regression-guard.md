---
name: regression-guard
description: Inspect accessibility regression test files and cached pass/block status without executing tests
tools:
  - list_regression_tests
---

# Regression Guard

## When to use

Use after a fix or before merging to review committed accessibility regression tests and check if any returning-ghost failure was recorded.

## Steps

1. Call `list_regression_tests()`.
2. Identify any failing (`last_result == "BLOCKED"`) or un-run (`last_result == null`) tests.
3. Display each test entry with `name`, `path`, `last_result`, and `last_run_at`.
4. For any `BLOCKED` failure, show the clear **"The ghost is back"** regression alert naming the control and test path.

## New regression test proposal flow

After verifying a new fix on an uncovered journey, propose a unified diff adding a Playwright assertion in `tests/journeys/send-payment.spec.ts` (for example pressing Tab until Send Payment receives focus, then pressing Enter) for explicit human review.

## Output format

Summary table of discovered regression tests plus any failing regression alert.

## Constraints

- This skill reads results. It does not execute tests.
