# Haunted Audit Workflow

Agents propose. Humans approve. Verify on a copy, never on live code.

## 1. Find

Call `scan_file` (on a modified component path) or `scan_url` (on a live route) to detect deterministic axe-core WCAG 2.x rule violations sorted from `critical` to `minor`.

## 2. Experience

Call `run_journey` with `journey_id="send-payment"` and `variant="broken"` or `"fixed"`, then poll `get_run` until `status` is `complete` or `error` to observe what keyboard-only users actually hit.

## 3. Fix

When `get_run` ends `BLOCKED`, call `propose_fix(run_id)` to compute a deterministic patch diff (`FixDiff`) and inspect its `warning` banner without mutating source files.

## 4. Verify

Only after explicit human approval of the diff, call `verify_fix(run_id, patch)` to apply the patch to a temporary directory copy and replay the payment journey cleanly.

## 5. Prevent

Call `list_regression_tests` to inspect committed pytest and Playwright regression guards and read their cached pass/block status without running side-effecting commands.
