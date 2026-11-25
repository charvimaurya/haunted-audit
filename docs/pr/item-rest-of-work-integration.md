# Integration: `chore/rest-of-work` (fail-006 correction, tracker and plan-status updates)

Branch `chore/rest-of-work`, from `origin/main` (base `5e4ac1f`, fast-forwarded to `ab6fdac` before commit).
Integrated by the coordinating Kiro session on 25 Nov 2026.

## What this is

Documentation and evidence correction found uncommitted in this worktree from an earlier, now-closed Kiro session.
No application code changed. One new regression test added.

## Files changed

- `agent/tests/test_loop_evidence.py`: new test `test_fail_006_is_fixed_voice_passes_on_the_patched_copy`.
- `evals/cases.yaml`: fail-006's `status` restored from `resolved` back to `open`, with a `note` explaining a
  prior integration merge (`77586ab`) had wrongly flipped it to `resolved`, and that the historical failure
  fields are kept unchanged on purpose. A `resolution` block (already present, now cross-referenced to the new test)
  records the current, correct behaviour.
- `docs/completion/MASTER_TASK_TRACKER.md`, `team-private/plan-status.md`, `team-private/waiting-on.md`: status
  rows updated to reflect PR #20 (Reference field) and the fail-006 fix; commit IDs corrected after a rebase
  (`990b469` -> `616a79a`, `0499cdb..b29a37b` -> `9722d6f..804af44`).

## What the new test proves, and its dependency

**Claim checked before integrating (coordinator instruction):** does this test depend on the Amount-label fix,
and is that fix new work or already shipped?

- Read `agent/fixes/exorcist.py` on main (`ab6fdac`): `_scripted_diff()` already patches **two** barriers
  unconditionally whenever both are found in the page source — Send Payment (div -> button) and the Amount
  field's caption (span -> label). This has been on main since the loop-evidence / Exorcist TASK-07 work
  (devlog, 24 Nov: "The scripted Exorcist now also labels Amount (barrier 2)").
- **Verified empirically, not just by reading code**: copied only the new test onto main with no other change
  and ran it in isolation. Result: `3 passed in 8.88s` (the file's 3 tests, including the new one). This proves
  the test depends only on Exorcist behaviour already on main; it adds no new application behaviour of its own.
- Conclusion: this is a **regression test for already-shipped behaviour**, not a dependency on new work. It is
  safe to merge on its own, and it does not touch, revert, or require any change to the Amount-label fix
  (coordinator's instruction: keep that fix as is, do not revert or silently combine it with voice-payment work).
  This integration makes no change to `agent/fixes/exorcist.py`.

## Tests

- `.venv/bin/python -m pytest -q`: exit 0, all tests pass (full suite, no failures), run on this branch after
  fast-forwarding to `ab6fdac`.
- The new test specifically: isolated run against main with no other change, passed (see above).

## Review

Read-only review by the coordinating session (no separate Reviewer agent invoked for this small, low-risk,
docs-plus-one-test change). No serious issue found. The one substantive content change (fail-006's `status`
field) was independently verified against the actual Exorcist source before acceptance, not taken on faith from
the commit message.

## Not done

- No GitHub PR opened (team-rules.md: a Reviewer report in `docs/pr/` counts instead).
- Shilpa has not reviewed this; per team-rules.md, build-first-review-after applies.
