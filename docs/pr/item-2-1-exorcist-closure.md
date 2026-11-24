# Item 2.1: Exorcist TASK-07 closure evidence (REQ-X-20). NOT a PR yet, NOT marked Done

Prepared 2026-11-24 on local branch `wip/dashboard-uncommitted`, uncommitted. Waiting on the owner's decision (see "Blocking
the PR" below). Spec: `.kiro/specs/exorcist/` and `.kiro/specs/voice-agent/` (REQ-VA-12, REQ-VA-13).

## What changed (uncommitted, this session)
- `agent/voice_agent/grammar.py`, `runner.py`: `expand_payment`, so "send money to Sam Lee, 100 dollars" becomes three commands.
- `agent/fixes/exorcist.py`: the scripted diff also turns the Amount caption into a label (4 changed lines).
- `dashboard/src/components/AutoLoopCard.tsx`, `dashboard/src/loop/useAutoLoop.ts`, `Possession.tsx`: "Run the whole loop".
- `dashboard/src/components/VoiceCommandsCard.tsx`, `Possession.tsx`: Push to talk runs when speech ends.
- Review fixes: `FixPanels.tsx` and `Fixes.tsx` focus ring 2px to 3px; `FixPanels.tsx` `changed_lines ?? '--'`;
  `AutoLoopCard.tsx` disabled style and `agent_mode` on the verify rows; `data-contract.md` documents the voice `said` arg.
- Tests: `test_fix_record_matches_the_data_contract`, `expand_payment` tests, `auto-loop.test.tsx` (axe, approval gate, offline).
- `scripts/keyboard_autoloop_walk.py` (new). `evals/cases.yaml` fail-006: original kept, `status: resolved`, `resolution` block added.
- Not this work, also uncommitted in the tree: `.kiro/steering/product-rules.md`, `.kiro/steering/ui-fidelity.md`,
  `dashboard/package.json`/`package-lock.json`, `HeroScene.tsx`, `HeroSection.tsx`, `TopNav.tsx`, `index.css`, `main.tsx`,
  `dashboard/src/assets/hero-bg.jpg`. Left untouched.

## QA agent (Kiro CLI 3.5.0, `qa` agent, claude-sonnet-4.6), measured this session
| Check | Result | agent_mode |
|---|---|---|
| `.venv/bin/python -m pytest -q` | 428 passed | n/a |
| `cd dashboard && npm test` | 17 files, 132 passed | n/a |
| `scripts/qa_exorcist.py` (5 runs) | 5/5 valid diffs, 4 changed lines, 5/5 PASSED on patched copy, 5/5 BLOCKED with bug put back, 0 tokens, $0.00, 0.9 ms avg | scripted |
| `scripts/qa_exorcist.py` llm | **NOT RUN**: AWS profile `haunted-audit` not found | llm |
| `agent.eval.run_eval --runs 5 --modes scripted` | broken 5/5 correct, fixed 5/5 correct | scripted |
| New failures | none; `evals/cases.yaml` not changed by QA | |

My own earlier run of `qa_exorcist.py` gave the same counts with 1.0 ms average latency.
After the review fixes: dashboard 132 passed again; `test_exorcist.py` and `test_voice_agent.py` passed.

## Reviewer agent (Kiro CLI, `reviewer` agent, read only)
**No serious issue open.** Six minor findings:
| # | Finding | Status |
|---|---|---|
| 1 | `FixPanels.tsx:17`, `Fixes.tsx:13` focus ring 2px, rule says 3px | Fixed (`ring-[3px]`) |
| 2 | `AutoLoopCard.tsx` BTN has no disabled style | Fixed |
| 3 | voice step `said` arg not in `data-contract.md` | Fixed (contract edited) |
| 4 | `AutoLoopCard.tsx` verify rows lack `agent_mode` | Fixed; test asserts "scripted mode" |
| 5 | `FixPanels.tsx:88` `changed_lines` null shows nothing | Fixed (`?? '--'`) |
| 6 | `fixContext.ts` `Fix` type omits `exorcist_model_id`, `created_at`, `history` | Not fixed here: `origin/main` `bfa8a1c` already adds them |
Could not verify (reviewer): contrast of the Approve Fix button. Not measured.

## Keyboard walks (Chrome, Tab / Shift+Tab / Enter / Space only), production build against a local API
| Walk | Result |
|---|---|
| `scripts/keyboard_walk.py`, every route | 0 of 20 pages failing; focus ring on every stop; Enter on "Possess This App" opens /try |
| `scripts/keyboard_loop_walk.py`, the four Fix steps and Reports | 0 failures. Verify: keyboard VERIFIED and voice VERIFIED, "Keyboard and voice". Regression: keyboard TARGET_NOT_FOCUSABLE, voice NO_ACTIVATION |
| `scripts/keyboard_autoloop_walk.py`, Run the whole loop | PASS. BLOCKED and cause shown; nothing ran before Approve; Space on Approve; keyboard PASSED and voice PASSED, scripted |
Failure found and fixed during the walk: the first autoloop walk reported "the fixed copy ran before anyone approved". The
check matched the card's intro text ("runs the fixed copy", case-insensitive). The fix history showed proposed, approved,
verify_started in that order. The check is now case-sensitive and passed. It was a test-script bug, not a product bug.

## Definition of done (plan v5.3, 10 boxes)
| # | Box | Evidence | Met? |
|---|---|---|---|
| 1 | Planned in Kiro; commit names the task | Specs exist. No commit yet | **No** (not committed) |
| 2 | Merged through a PR, template filled in | No PR. See "Blocking the PR" | **No** |
| 3 | Tests pass, GitHub Actions green on the PR | Local: pytest 428, dashboard 132. No CI run (no PR) | **Partly** |
| 4 | AI steps 4 of 5; scripted 5 of 5 | Scripted 5/5 (Exorcist, eval). LLM **NOT RUN** | **Scripted yes; LLM not run** |
| 5 | Reviewer: no serious issue open | No serious issue; 5 of 6 minor fixed | **Yes** |
| 6 | Keyboard only, "keyboard checked" | Three walks above pass | **Yes** |
| 7 | No secrets or real data | Diff searched for AKIA, secret, password: nothing; no `.env` | **Yes** |
| 8 | Anything that broke is an eval case | fail-006 kept and resolved with evidence; walk-script bug was in a new test script only | **Yes** (owner may want a case for the script bug) |
| 9 | Logged | Devlog line 24 Nov | **Yes** |
| 10 | Claims still true | Behaviour changed: Exorcist diff is 4 lines, voice now verifies on the patched copy. Deck, video and README not checked; Shilpa not told | **No** |
Box text says someone other than the author ticks these boxes.

## Blocking the PR
1. The work is not on `main`. It is on `wip/dashboard-uncommitted`, which has diverged from `origin/main`: 11 commits on
   main are not here and 2 here are not on main (`81bc722` WIP, `925fd05`, the same LE-01 fix as main's `57d642a`).
2. `origin/main` `616a79a` already ticks TASK-07 and `team-private/plan-status.md` on main says "1 Exorcist, 2 Verifier:
   paperwork | Done on main (no PR: owner chose main only)". That conflicts with this session's status edits.
3. The project's rule since 23 Nov is main only, no PRs (`docs/pr/item-3-journey-guard.md`). A PR needs the owner to say so.
4. LLM mode: NOT RUN until the `haunted-audit` AWS profile exists.
