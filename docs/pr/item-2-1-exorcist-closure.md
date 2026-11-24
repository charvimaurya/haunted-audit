# Item 2.1: Exorcist TASK-07 closure (REQ-X-17, REQ-X-20). DRAFT, not Done

Branch `feature/exorcist-item-2-1-closure`, made from `origin/main` `28e8fec`. Spec: `.kiro/specs/exorcist/`.
This PR does not mark TASK-07 or REQ-X-20 Done and does not change the tracker. `team-private/plan-status.md` on
`main` already has a "Done on main" row for "1 Exorcist, 2 Verifier: paperwork". That row is left for a
separately reviewed tracker reconciliation.

## What changed
- `agent/tests/test_exorcist.py`: new `test_fix_record_matches_the_data_contract` (REQ-X-17). It reads the "Fix" table
  in `.kiro/steering/data-contract.md` and checks that `GET /fixes/{id}` returns exactly those fields.
- Reviewer findings fixed on the Fix pages (accessibility rule: 3px focus outline; data rule: unmeasured shows `--`):
  - `dashboard/src/components/FixPanels.tsx`: focus ring `ring-2` to `ring-[3px]`; `changed_lines ?? '--'`.
  - `dashboard/src/pages/app/Fixes.tsx`: step links' focus ring `ring-2` to `ring-[3px]`.
- `.kiro/steering/data-contract.md`: documents the voice step arg `said`, which `agent/voice_agent/runner.py` on main
  already sends.
- This file and one `docs/devlog.md` line.

Not in this PR, by the owner's decision: the Amount-label fix in the scripted Exorcist, automatic Verify
(the "Run the whole loop" card), and the voice phrase expansion. Verify stays manual.

## QA (measured on this branch, 24 Nov)
| Check | Result | agent_mode |
|---|---|---|
| `.venv/bin/python -m pytest -q` | 417 collected: 409 passed, 8 skipped, 0 failed | n/a |
| `cd dashboard && npm test` | 17 files, 137 passed | n/a |
| `npx tsc --noEmit -p tsconfig.app.json` | no errors | n/a |
| `scripts/qa_exorcist.py` (5 runs) | 5/5 valid diffs, 2 changed lines each, 5/5 PASSED on the patched copy, 5/5 BLOCKED with the bug put back, 0 tokens, $0.00, 0.9 ms average. Passes (at least 4 of 5) | scripted |
| `scripts/qa_exorcist.py` llm | **NOT RUN.** The script printed: "AWS credentials could not be read: Missing Dependency: Using the login credential provider requires an additional dependency. You will need to pip install "botocore[crt]"". No LLM number is claimed | llm |
| `git status --short fixtures/` after the runs | empty | |

**CI has not run for this branch yet.** The results above are local only.

## Keyboard walks (Chrome; Tab, Shift+Tab, Enter, Space only; this branch's production build and API)
| Walk | Result |
|---|---|
| `scripts/keyboard_walk.py`, every route | 0 of 20 pages failing; a visible focus ring on every stop; Enter on "Possess This App" opens /try |
| `scripts/keyboard_loop_walk.py`, Possession, the four Fix steps, Reports | 0 failures. Verify: keyboard journey VERIFIED; voice-command simulation **Not verified** (NO_ACTIVATION, "Could not type in Amount: no accessible label"); the screen says "Keyboard only". Regression: TARGET_NOT_FOCUSABLE. Reports: same run IDs |

keyboard checked

## evals/cases.yaml
No change. `fail-006` stays `open`. The keyboard loop walk on this branch reproduced it: the voice replay on the patched
copy is BLOCKED (NO_ACTIVATION) because Amount has no label. Its resolution waits on the separate Amount-label fix and an
independent, measured voice replay. No new failure was found.

## Reviewer notes
An earlier reviewer agent run (Kiro CLI `reviewer`, read only) covered a larger uncommitted diff that included the
changes left out of this PR. It found no serious issue and six minor issues. Three apply to the files in this PR and are
fixed here (findings 1, 3 and 5). Finding 6, the missing `Fix` type fields, was already fixed on main (`bfa8a1c`).
Findings 2 and 4 were about the "Run the whole loop" card, which is not in this PR.

Reviewer agent on this branch's final uncommitted diff (Kiro CLI `reviewer`, read only, 24 Nov): **No serious issue open.**
It found one minor issue, in code main already had and that this PR does not change:
1. Minor, open: `dashboard/src/components/FixPanels.tsx` RegressionPanel shows the regression verdict and reason code
   but not `agent_mode` (product rule: `agent_mode` beside every result). VerificationPanel already shows it. Owner to decide
   whether to fix it here or in a follow-up.
The reviewer also could not check text contrast without a browser. That is not measured.
The reviewer agent wrote this summary. The author did not tick any box.

## Definition of done (plan v5.3). Not complete
| # | Box | Status on this branch |
|---|---|---|
| 1 | Planned in Kiro; commit names the task | Spec `.kiro/specs/exorcist/`; the commit message names TASK-07 |
| 2 | Merged through a PR, template filled in | Draft PR open, not merged |
| 3 | Tests pass; GitHub Actions green on the PR | Local tests pass. **CI not run yet** |
| 4 | AI steps at least 4 of 5; scripted 5 of 5 | Scripted 5 of 5. **LLM not run** |
| 5 | Reviewer agent: no serious issue open | No serious issue on the final diff; 1 minor open (RegressionPanel `agent_mode`, pre-existing) |
| 6 | Keyboard only (screen changed) | Two walks above, 0 failures |
| 7 | No secrets or real data | Diff searched for AKIA, secret, password, private key and .env files: nothing |
| 8 | Anything that broke is an eval case | No new failure; fail-006 unchanged and still open |
| 9 | Logged | One devlog line |
| 10 | Claims still true | Nothing claimed in the deck, video or README changes in this PR. Not checked with Shilpa |
The plan says someone other than the author ticks these boxes.

## Outstanding blockers
- CI run on this PR.
- Minor reviewer finding: RegressionPanel `agent_mode` (pre-existing on main).
- LLM-mode QA (needs AWS sign-in to work: `botocore[crt]`, or a profile that does not need it).
- Separate tracker reconciliation for main's "Done on main" row in `team-private/plan-status.md`.
- fail-006: the Amount-label fix and an independent measured voice replay, in a separate change.
