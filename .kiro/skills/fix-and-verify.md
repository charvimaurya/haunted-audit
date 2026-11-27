---
name: fix-and-verify
description: Propose a deterministic accessibility fix, pause for human approval, and verify on a temporary copy
tools:
  - propose_fix
  - verify_fix
---

# Fix and Verify

## When to use

Use after a `BLOCKED` journey run when you want a deterministic patch proposal and verification replay.

## Steps

1. Call `propose_fix(run_id)` and display the computed diff (`diff.before` -> `diff.after`, `diff.file`, `diff.rationale`).
2. Display the `warning` field verbatim (`"This diff has not been applied. Human approval required."`).
3. **HARD STOP: Do not proceed to step 4 without explicit human approval.** Wait for the user to approve the diff in chat.
4. Once approved, call `verify_fix(run_id, approved_patch)`.
5. Report `VerifyFixOutput` (`verdict`, `verify_run_id`, `agent_mode`, `step_count`).

## Output format

Show proposed diff + verbatim warning, pause at step 3, and after approval show the verification replay outcome.

## Constraints

- `verify_fix` runs on a temporary copy. Original source file is unchanged.
