# Plan status: Sukhda's Build Plan

Audit date: **Sun 22 Nov 2026, evening** (gate day). Feature freeze: Tue 24 Nov evening. Handover: Wed 25 Nov.

**Done** means every Definition-of-done box is met with evidence: built in Kiro, merged through a PR with the template filled in, tests pass, reviewer has no serious issue open, no secrets, keyboard check on touched screens, failures in `evals/cases.yaml`, one devlog line.

**Kiro CLI:** `kiro-cli` 3.5.0 is installed. From PR #10 on, the `qa` agent (claude-sonnet-4.6) and the read-only `reviewer` agent (claude-opus-4.6, `accessible-ui-review` skill loaded) ran from the CLI on every PR. The earlier caveat (a sub-agent fallback for PRs #1 to #9) applies only to those PRs.

## This round (Phases 1 to 4)

| Item | Status | Evidence | Left |
|---|---|---|---|
| **U11 Site shell** | **Done** | [PR #10](https://github.com/charvimaurya/haunted-audit/pull/10): v7 top menu on every page, one route table for every link, Possession Mode and four fix steps load, redirects, not-found with a way back. `docs/shell-regression.md`. Link crawl (12 tests) and ghost overlap (5 Playwright tests, fails on the old ghost paths) | none |
| **U2 No made-up results** | **Done** | [PR #11](https://github.com/charvimaurya/haunted-audit/pull/11): 13 made-up results removed (`docs/mock-data-audit.md`), Not run yet / offline / Not available yet states, guard test over every page, build check against `src/samples/`, crashed runs never shown as a verdict | none |
| **24 Voice agent drives the bank** | **Done** | [PR #12](https://github.com/charvimaurya/haunted-audit/pull/12): `POST /voice-runs`, accessible names only. Haunted: "Could not activate Send Payment: no accessible role or name", 5 of 5. Fixed: payment confirmed, 5 of 5. Steps on the same SSE; `agent_kind` and `input_source` in every result | optional LLM mapping (needs AWS) |
| **U2 UI fidelity** | **Done** when PR #13 merges | [PR #13](https://github.com/charvimaurya/haunted-audit/pull/13): `docs/ui-fidelity.md` (D1 to D20), before/after screenshots at 1440 px, SVG mascot in Ready/Blocked/Verified, Critical Ghost card from data, high contrast mode, axe 0 in three modes | D20 text-size setting |
| **3 Journey test, regression guard** | **Built on main; not Done** (review record `docs/pr/item-3-journey-guard.md`: QA PASS, Reviewer agent no serious issue open, which counts instead of a PR under `.kiro/steering/team-rules.md`; Done not decided: see "Left") | Spec `journey-guard`, commits `9722d6f`..`804af44` (the earlier ids were rebased away). GUARD_WORKS 5 of 5 (`docs/kiro-writeup/returning-ghost.txt`); journey test fails on the haunted bank with 'Send Payment is not keyboard focusable'. pytest 414, dashboard 117. qa PASS, reviewer no serious issue (`docs/pr/item-3-journey-guard.md`) | CI: green on main (`5e4ac1f`, `9c2f07a`) — done. Left: plan: Shilpa or Charvi confirms the ticked boxes (team rules: Shilpa reviews after the build); no box list has been ticked by them |
| **5 Spooky moments** | **Built on main; not Done** (review record `docs/pr/item-5-spooky-steps.md`: QA PASS, Reviewer agent no serious issue open, which counts instead of a PR under `.kiro/steering/team-rules.md`; Done not decided: see "Left") | Spec `spooky-steps`. Exorcism on Approve and Before and after split, each with a Calm version (0 animations with reduced motion). Dashboard 137, loop walk 5/5 motion and 5/5 reduced. qa PASS, reviewer no serious issue (`docs/pr/item-5-spooky-steps.md`) | Caught-ghost colour: settled by team rules (white, v9) and `FixPanels.tsx` renders it with state `ready`, which `GhostMascot` draws white; no `docs/decision-log.md` line for that default yet. Left: that decision-log line; plan: Shilpa or Charvi confirms the ticked boxes (team rules: Shilpa reviews after the build); no box list has been ticked by them |
| **1 Exorcist, 2 Verifier: paperwork** | **Built on main; not Done** (REQ-X-20 open: no PR; header rule above needs one) | Exorcist TASK-07 ticked. qa_exorcist.py 5 runs: scripted 5/5 valid, verified, caught; llm not run (no AWS). qa_verifier_outcomes.py 5/5: VERIFIED, STILL_BLOCKED, PATCH_DOES_NOT_APPLY, NOT_REPRODUCED, mouse click pays (`docs/evidence/verifier-outcomes-2026-11-24.md`) | REQ-X-20: a PR with the template, or your OK for a `docs/pr/` record like items 3 to 5; qa and reviewer agent runs on the Exorcist diff (none recorded); `team-private/waiting-on.md` rows of 19 Nov still say design and code not started; Shilpa's approval; LLM Exorcist needs AWS |
| **User-typed test details** | **Merged to main 24 Nov; not Done** (in the integration push `5e4ac1f`; PR #15 had qa PASS and reviewer no serious issue before merge, but no person or reviewer ticked the DoD boxes on the merged result) | [PR #15](https://github.com/charvimaurya/haunted-audit/pull/15), spec `user-typed-test-details`. Empty Recipient, Amount, Reference; run refused with an inline error and focus; agents and Verifier type exactly the typed values; amount follows the bank's rule (fail-008 fixed). pytest 460, dashboard 139, browser 8 + 3 with the real API, scripted 5/5 each, voice 5/5 each; qa PASS, reviewer no serious issue (3 minor). Seed re-exported by the owner at 2026-11-24T12:29:52Z: broken BLOCKED / TARGET_NOT_FOCUSABLE, fixed PASSED, JSON valid; not yet committed | Owner: OK to publish the typed values in the seed; then commit it, CI green on the PR, merge; preview.png kept deleted (it still shows the old name) |
| **2 and 4 Loop evidence (keyboard + voice)** | **Built on main; not Done** (review record `docs/pr/item-4-loop-evidence.md`: QA PASS on the commits, Reviewer agent no serious issue open, which counts instead of a PR under `.kiro/steering/team-rules.md`; Done not decided: see "Left") | Spec `loop-evidence`, `1f063e7`..`57d642a`. Keyboard and voice runs on the patched copy, each with its own run ID, on Verify, Regression and Reports. Keyboard PASSED, voice BLOCKED by barrier 2 (fail-006). pytest 416, dashboard 129, loop walk 5 of 5. qa PASS on commits, reviewer no serious issue (`docs/pr/item-4-loop-evidence.md`) | Barrier 2: decided by the owner 24 Nov (fail-006, regression test on main). Left: `docs/pr/item-4-loop-evidence.md` "Claims affected" still says voice is blocked, so DoD box 10 (claims still true, tell Shilpa) is open; plan: Shilpa or Charvi confirms the ticked boxes (team rules: Shilpa reviews after the build); no box list has been ticked by them |
| **2.1 Exorcist (TASK-01 to 07)** | **Built on main; not Done** | Spec `.kiro/specs/exorcist/` (tasks 01 to 07 ticked). `scripts/qa_exorcist.py`, 5 runs made 24 Nov, **scripted** mode: valid diffs 5 of 5 (4 changed lines each), fix verified (checker PASSED on the patched copy) 5 of 5, regression caught (checker BLOCKED with the bug put back) 5 of 5, cost $0.00 (0 tokens), average latency 1.0 ms. Data contract: `test_fix_record_matches_the_data_contract` (REQ-X-17). Full pytest 428 passed, dashboard 132 passed (24 Nov). Devlog line 24 Nov. **LLM mode: NOT RUN** (AWS profile `haunted-audit` is not configured); no LLM result is claimed. The scripted Exorcist also labels Amount (barrier 2), so the voice replay passes on the patched copy | PR with the template filled in (none opened; work is on main); reviewer agent pass; keyboard walk of the Fix pages; LLM-mode QA once AWS access exists |
| **31 Reference field** | **Merged to main 24 Nov; not Done** (`docs/pr/item-31-reference-field.md` records QA and a first Reviewer agent pass on branch `feature/reference-field`, no serious issue; that review was of the branch, not of the merged result combined with PR #15, and the record itself lists a second reviewer and PR approval as not done) | [PR #20](https://github.com/charvimaurya/haunted-audit/pull/20), spec `reference-field`: labelled Reference on both bank variants, internal default "Electricity bill", Tab to Reference row. Combined with PR #15 in the 24 Nov integration (merge commit message lists the choices). Scripted eval after the merge: broken 5/5 BLOCKED / TARGET_NOT_FOCUSABLE (20.0 steps), fixed 5/5 PASSED (16.0 steps) | independent review |
| **fail-006 voice on the patched copy** | **Fixed on main; history kept** | `evals/cases.yaml` fail-006 is kept with its resolution. New test `test_fail_006_is_fixed_voice_passes_on_the_patched_copy` (agent/tests/test_loop_evidence.py): voice PASSED on the patched copy, BLOCKED with the bug put back; it fails with the old one-change Exorcist (`BLOCKED / NO_ACTIVATION`) | none |

## Test counts, before and after this round (all measured 22 Nov)

| | Start of round (`main` `47f7da2`) | After PR #13 |
|---|---|---|
| Dashboard (Vitest) | 64 passed (24 failed at `11e1846`, the cause of U11) | **100 passed** |
| Browser (Playwright) | none | **8 passed** (axe on 20 pages in normal, Calm, high contrast; ghost overlap) |
| pytest | 319 passed | **357 passed** |
| Keyboard walk (Chrome) | 19 pages, old URLs dead | **0 of 20 pages failing** |
| Keyboard walker, 5 runs | broken 5/5, fixed 5/5 | broken 5/5, fixed 5/5 |
| Voice agent, 5 runs | did not exist | **haunted 5/5, fixed 5/5** |
| LLM agent | not run (no AWS credentials) | not run (no AWS credentials) |

## QA and Reviewer per PR (Kiro CLI)

| PR | QA agent | Reviewer agent |
|---|---|---|
| #10 | QA: PASS | No serious issue; 4 minor, 3 fixed |
| #11 | QA: PASS | No serious issue; 4 minor, 2 fixed. Re-run with the skill loaded: no serious issue, 4 minor contrast items, all fixed in #12 |
| #12 | QA: PASS | No serious issue (skill loaded); 2 minor, 1 fixed, 1 was the fix itself |
| #13 | QA: FAIL on one obsolete emoji assertion, then QA: PASS after the owner-approved edit | No serious issue (skill loaded); 1 minor (that assertion) |

Test edits this round, each approved by the owner: one link name in `routes.test.tsx` (Results to Reports, #10) and one assertion in `immersion.test.tsx` (emoji to SVG ghost, #13). No test was deleted, skipped or loosened.

## Blocked, and by what

| What | Blocked by |
|---|---|
| Exorcist and Verifier marked Done (REQ-X-20) | No PR or `docs/pr/` record with qa and reviewer output; Shilpa's approval of the Exorcist requirements; AWS for the LLM Exorcist (Charvi). Built and tested on main (scripted) |
| `exorcise_page` MCP tool, `exorcise-fix` and `journey-test-writer` skills | The same |
| LLM agent pass rate (4 of 5) and an LLM voice mapping | AWS credentials and Bedrock access (Charvi) |
| Staging (gate check 4) | Nothing deployed |
| Text-size setting | Not built (`docs/ui-fidelity.md` D20) |

## Only you can do these

1. **Screen clips:** the voice agent failing on the haunted bank and paying on the fixed one (Agents page); the scan-on-save hook timing (target under 10 s; record the number in `docs/devlog.md`).
2. **Screenshots:** `scan_page` in Kiro chat; the two skills being applied; the high-contrast mode.
3. **Kiro Web:** issue #8 by `docs/kiro-web-runbook.md`, then record merged or rejected.
4. **Power on a second laptop** from `power/README.md`.
5. **Approvals:** Shilpa on the Exorcist requirements; Charvi for AWS IAM and Bedrock.
6. **Decide:** `team-private/` is in `.gitignore` as "never commit", but commit `47f7da2` added it to this **public** repo. Keep it public, or remove it from the repo (history keeps it either way).
7. **Rotate the Cursor API key.** It was visible in plain text on a running process's command line earlier today.

---

# Earlier status (22 Nov, before this round), kept for history


Audit date: **Sun 22 Nov 2026** (gate day). Feature freeze: Tue 24 Nov evening. Handover: Wed 25 Nov.
`main` is at the merge of PR #9 once it lands (see the PR list). Previous audit (20 Nov) is kept below the line for history.

**Done** means every Definition-of-done box is met with evidence: built in Kiro, merged through a PR with the template filled in, tests pass, reviewer has no serious issue open, no secrets, keyboard check on touched screens, failures in `evals/cases.yaml`, one devlog line.

One box is weaker than the plan asks for everywhere. The `qa` and `reviewer` agents did not run from the **Kiro CLI**, because `kiro-cli` is not installed on this machine. QA was done by hand in Kiro IDE following `qa.md`. Reviews ran as a Kiro sub-agent following `reviewer.md`, and I cannot prove it used a different model from the developer. Every PR says this. Items below marked **Done** carry that caveat. They become fully Done when you re-run the two agents from the CLI on one PR.

## Items in this round

| Item | Status | Evidence | What is left |
|---|---|---|---|
| **0 Merge the branches through PRs** | **Done** (caveat above) | `docs/branch-audit.md`; PRs #1 to #6 merged with merge commits, never squash; reviewer fixes listed in each PR; `docs/devlog.md` 22 Nov lines | `feature/voice-agent-spec` left unmerged on purpose (it holds an empty spec folder) |
| **0 Origin note** | **Done** | `docs/devlog.md`: six commits co-authored by Cursor are listed by hash; prototyped outside Kiro, then reviewed and integrated in Kiro. PR #6 leaves "Built in Kiro" unticked | Optional: remove `.cursor/rules/haunted-audit-dashboard.mdc` |
| **13 Hook form check** | **Partial** | `backend/scan_file.py`, `.kiro/hooks/scan-on-save.json` (shell command, relative path, quiet when clean); PR #7 merged; 44 unit tests; hook command 26 ms median over 5 runs | **You:** save-to-finding time in Kiro IDE (target under 10 s) and the screen clip. The hook loads at session start, so it did not fire in the session that wrote it |
| **18 MCP server and Power** | **Partial** | `backend/mcp_server.py` `scan_page`; `.kiro/settings/mcp.json`; called from Kiro chat on the bank page (`docs/evidence/mcp-scan-page-2026-11-22.md`); stdio connection test; `power/` with install README; PR #9 | **You:** screenshot of the call; install the power on a second laptop from the README. `exorcise_page` blocked by the Exorcist (`docs/waiting-on.md`) |
| **29 Skills** | **Partial (2 of 4)** | `wcag-ghost-mapper` applied to "explain this finding"; `accessible-ui-review` picked by a fresh sub-agent for "review this UI" (`docs/evidence/skills-activation-2026-11-22.md`), and its four serious findings in `RunControls.tsx` were fixed and checked in Chrome. Reviewer agent points at it | `exorcise-fix`, `journey-test-writer` written and marked unverified, not claimed, until the Exorcist and journey-test writer exist |
| **30 Kiro Web** | **Partial (prepared)** | Issue [#8](https://github.com/charvimaurya/haunted-audit/issues/8) `tester-reported`, with acceptance criteria; `docs/kiro-web-runbook.md` | **You:** run it in Kiro Web, then record merged or rejected in `docs/devlog.md` |

## Measured today (all from runs made on 22 Nov)

| What | Result | Source |
|---|---|---|
| Python tests | 319 passed | `.venv/bin/python -m pytest` on `feature/mcp-power` |
| Dashboard tests | 64 passed | `cd dashboard && npm test` |
| Keyboard-only walk, every page, Chrome | 0 of 19 pages failing; Enter on the main button works | `scripts/keyboard_walk.py` |
| Scripted walker, 5 runs each | broken 5 of 5 `BLOCKED`/`TARGET_NOT_FOCUSABLE`, fixed 5 of 5 `PASSED` (`agent_mode` scripted) | `python -m agent.eval.run_eval --modes scripted --runs 5` |
| LLM agent | **not run**: no AWS credentials. NO-GO for the LLM demo, as decided on 20 Nov | `docs/decision-log.md` |
| `scan_page` on the bank page | 1 finding, `input#amount` (planted barrier 2) | `docs/evidence/mcp-scan-page-2026-11-22.md` |
| Scan-on-save hook command | 26 ms median, 39 ms max (5 runs on each of 4 files) | `docs/devlog.md` |
| Secrets scan | 0 findings on every PR (changed files only, not full history) | `detect-secrets` |

## Blocked, and by what

| What | Blocked by |
|---|---|
| LLM agent pass rate (needs 4 of 5) | AWS credentials and Bedrock access (Charvi) |
| `exorcise_page` tool, `exorcise-fix` skill, Approve/Reject in the UI, gate checks 2 and 3 | The Exorcist: requirements only, no design or code; your OK on `.kiro/specs/exorcist/requirements.md`, then Shilpa's approval |
| `journey-test-writer` skill, `tests/journeys/` | A journey-test writer and a fix to regress against |
| Phase B "in the Kiro CLI" | `kiro-cli` not installed |
| Staging (gate check 4) | Nothing deployed; no Docker on this machine |
| Voice agent (1.2) | The spec was never written |

## Only you can do these

1. **Screen clip:** the scan-on-save hook. Open `bank/` or `fixtures/haunted_bank/index.html`, delete a `<label for=...>`, save, and time how long until the finding appears in Kiro. Write the number in `docs/devlog.md`.
2. **Screenshot:** in a new Kiro chat ask "scan fixtures/haunted_bank/index.html for missing labels" and capture the `scan_page` call and its output.
3. **Screenshot:** in a new Kiro chat ask "explain this finding" with the finding pasted, and "review this UI: dashboard/src/components/PipelineSection.tsx". Capture which skill Kiro applies.
4. **Kiro Web:** follow `docs/kiro-web-runbook.md` for issue #8, then record the outcome in `docs/devlog.md`.
5. **Kiro CLI:** install `kiro-cli`, run `qa` and `reviewer` on one merged PR, and paste the output into it. That completes Phase B as written.
6. **Power on another laptop:** follow `power/README.md` from scratch and note anything that did not work.
7. **Approvals:** Shilpa on the Exorcist requirements; Charvi for AWS IAM and Bedrock access.

## Open minor issues (not blocking)

- `.cursor/rules/haunted-audit-dashboard.mdc` is still tracked and contradicts the Kiro steering.
- `/journeys/send-payment/fixes/:step` redirects to Find and drops the step.
- Voice Agent panel does not show `agent_mode`; the `RunRecord` type lacks `seeded` and `recorded_at`.
- `data-contract.md` says unmeasured is `null`, but `models.py` defaults `latency_ms` and `cost_usd` to `0.0`.
- Home is hero-only (one purpose per page), so the full v7 single-page layout is spread over the app pages.

---

# Previous audit (20 Nov 2026), kept for history


Audit date: **Fri 20 Nov 2026, 21:42 IST**. Previous audit: Fri 20 Nov 2026, 21:30 IST (same day; this pass re-checks after pushes).
Gate: Sun 22 Nov. Feature freeze: Tue 24 Nov evening. Handover: Wed 25 Nov.
Plan source: `docs/Sukhdha plan.docx` (read in full, including its "if late" defaults).
Status docx source: `docs/Sukhdha plan - status 20 Nov.docx` (living evidence log; keep 19 Nov copy aligned).

## Where the work lives today

Today's work is split across **six git worktrees** of the same repo (`charvimaurya/haunted-audit`). None of the new feature branches are on `origin/main`. `main` is still `7042eb1`.

| Folder | Branch | Tip / state | Plan activities touched |
|---|---|---|---|
| `/Users/sukhada/Desktop/Kiro.hackathon` | `feature/exorcist` | `97d34e2` on GitHub; local `Home.tsx` still dirty | **2.1** requirements draft; **1.6 / 2.5** multipage routes committed; README setup |
| `/Users/sukhada/Desktop/Kiro.bank` | `feature/bank-payment-barriers` | `fe32f17` **pushed** | **0.6** six barriers + `PLANTED.md` + tests |
| `/Users/sukhada/Desktop/Kiro.payment` | `feature/payment-journey` | `d494af4` **pushed** | Diagnosis + payment-journey spec (ties to 0.6 / 1.6) |
| `/Users/sukhada/Desktop/Kiro.unblock` | `chore/unblock` | `97e9c8c` **committed + pushed** | **0.3, 0.4, 0.5, C1–C8** catch-up |
| `/Users/sukhada/Desktop/Kiro.hero` | `feature/hero-scene` | `0f1a611` **pushed** (draft spec) | Hero scene spec (design polish for Home) |
| `/Users/sukhada/Desktop/Kiro.voice` | `feature/voice-agent-spec` | `c4f4c42` **pushed** | **1.2** empty `.kiro/specs/voice-agent/` placeholder only |

## How this was checked

- `git worktree list`, each worktree `git status -sb` / tip SHA, and the files named in each row.
- Did **not** merge branches into `main`. Did **not** invent numbers. Bank contrast / axe numbers are quoted from `Kiro.bank/bank/PLANTED.md` (measured 2026-11-20 in that branch's tests).
- GitHub remotes: `main` and `chore/repo-hygiene` at `7042eb1`; also `feature/exorcist`, `feature/payment-journey`, `feature/bank-payment-barriers`, `chore/unblock`, `feature/hero-scene`, `feature/voice-agent-spec`. `gh pr list` still **Forbidden** from this machine; earlier audit had `[]`. Still **0 pull requests merged** for Definition of done.

## Why nothing is fully Done

Same four Definition-of-done boxes still fail for every activity:

| Box | Finding |
|---|---|
| Merged to main through a PR, template filled in | No activity from today is on `main`. The PR template exists on `chore/unblock` (`97e9c8c`) but no PR has merged. |
| Reviewer agent has no serious issue open | Reviewer file exists on `chore/unblock` but has not been run on a PR. |
| Failures in `evals/cases.yaml` | Filled on `chore/unblock`. Still empty / missing on `main` and on the bank branch. |
| One line in `docs/devlog.md` per activity | Per-activity lines exist on `chore/unblock`. `main` / `feature/exorcist` still have the older summary-only log. |

## What changed since the 21:30 audit (same evening)

Branches that were **staged / not pushed** are now **on origin** at the tips above. Status markers stay **Partial** (or Not started / Cannot verify). Still **no whole activity Done** under DoD.

### Catch-up (`Kiro.unblock`, `97e9c8c`, pushed)

| Catch-up ID | Status tonight | Evidence |
|---|---|---|
| C1 PR template | **Built (pushed)** | `.github/pull_request_template.md` has Spec / What changed / QA / Reviewer / DoD sections |
| C3 decision-log | **Built (pushed)** | `docs/decision-log.md`: scripted walker chosen; LLM not measured |
| C4 per-activity devlog | **Built (pushed)** | `docs/devlog.md` section "Lines per plan activity (added 2026-11-20)" |
| C5 data-contract | **Built (pushed)** | `.kiro/steering/data-contract.md` |
| C6 cases.yaml | **Built (pushed)** | `evals/cases.yaml` with `bank-001`, `fail-001`, `fail-002`, … (still says PLANTED.md missing — outdated once bank branch merges) |
| C7 relative hook path | **Built (pushed)** | `.kiro/hooks/axe-on-save.json` → `node .kiro/scripts/axe-on-save.mjs` |
| C8 delete Pages workflow | **Built (pushed)** | `.github/workflows/pages.yml` deleted on this branch |

### Phase 0

| ID | Earlier tonight | Now | Evidence / missing |
|---|---|---|---|
| 0.1 practice run | Not started | Not started | Still no practice note / credit balance in the active branches' `devlog.md` |
| 0.2 Bedrock hello | Cannot verify | Cannot verify | Still no recorded Bedrock reply; needs Charvi's IAM |
| 0.3 five steering files | Partial (staged) | **Partial (5 of 5 on `chore/unblock`, pushed)** | `product.md`, `tech.md`, `structure.md`, `accessibility.md`, `data-contract.md` (plus product-ux / product-rules). Conflict check not run. Not on `main` |
| 0.4 seven agents | Partial (staged) | **Partial (files pushed on `chore/unblock`)** | planner, architect, developer, qa, reviewer, deployer, monitor. Not tried in Kiro yet |
| 0.5 spike logged | Partial | **Partial (stronger; pushed)** | Decision logged on `chore/unblock`. Spike itself still never measured for the LLM |
| 0.6 bank + 6 barriers | Partial (local) | **Partial (pushed `fe32f17`)** | `bank/PLANTED.md` lists barriers 1–6; fixture plants all six; `agent/tests/test_bank_barriers.py` (296 lines). **Not merged.** `cases.yaml` on that branch is still empty |
| 0.7 scanner | Not started | Not started | Still no scanner |

### Phase 1

| ID | Earlier tonight | Now | Evidence / missing |
|---|---|---|---|
| 1.1 keyboard agent | Partial | Partial | Unchanged measured evidence (scripted 5/5). LLM still not run |
| 1.2 voice agent | Not started (branch only) | **Not started (branch + empty placeholder pushed)** | `Kiro.voice` has empty `.kiro/specs/voice-agent/` |
| 1.3 impact rules | Not started | Not started | — |
| 1.4 API | Partial | Partial | Unchanged on `main` |
| 1.5 benchmark | Partial | Partial | `cases.yaml` has content only on `chore/unblock` |
| 1.6 Possession dashboard | Partial (local) | **Partial (multipage committed on `97d34e2`; `Home.tsx` still dirty)** | Routes / Possession / HeroCastle on `feature/exorcist`. Payment diagnosis on payment branch |
| 1.7 hook | Partial | **Partial (path fixed on unblock, pushed)** | Absolute path removed. Still Node-only, dashboard-only, no timing clip |
| 1.8 skill | Not started | Not started | — |
| 1.9 staging | Partial | Partial | Still nothing deployed; README live link still a placeholder |

### Phase 2

| ID | Earlier tonight | Now | Evidence / missing |
|---|---|---|---|
| 2.1 Exorcist | Partial (requirements draft) | **Partial (requirements draft on GitHub)** | `.kiro/specs/exorcist/requirements.md` on `feature/exorcist`. Status DRAFT, waiting your OK. No design/tasks/code. Approve/Reject still dead |
| 2.2–2.4, 2.6–2.8 | Not started | Not started | — |
| 2.5 Find/Fix/Verify/Regression | Partial (local routes) | **Partial (routes committed on `97d34e2`)** | Pages under `/journeys/send-payment/fixes/{find,fix,verify,regression}`. Still no live Fix/Verify data |

### Phase 3

Unchanged in substance. URL guard (3.4) and jest-axe (3.5) remain Partial. Write-up / handover / Power still Not started.

### Extra specs started (not numbered plan IDs)

| Spec / work | Where | Status |
|---|---|---|
| `payment-journey` | `Kiro.payment` `d494af4` | Diagnosis DONE; scope reduced; REQ-PAY/REQ-BAR built on bank branch (not merged); sessions/UI deferred |
| `hero-scene` | `Kiro.hero` `0f1a611` | DRAFT requirements/design/tasks; nothing built in that worktree |
| `pixel-faithful-ui-v7` / `ui-fidelity.md` | local / untracked possible | Stretch / design; do not block the gate |

## 1. Activity table (tonight)

Status key: Done / Partial / Not started / Cannot verify. "DoD gaps" still apply until PRs land on `main`.

### Phase 0

| ID | Status | Evidence | What is missing |
|---|---|---|---|
| 0.1 | Not started | No practice note | 3-line note + credit balance |
| 0.2 | Cannot verify | No Bedrock reply recorded | Charvi IAM + hello script output |
| 0.3 | Partial | Five named steering files on `chore/unblock` (`97e9c8c`) | Conflict check; PR + merge |
| 0.4 | Partial | Seven agent `.md` files on `chore/unblock` | Try each in Kiro; PR + merge |
| 0.5 | Partial | `docs/decision-log.md` on `chore/unblock` | Measured LLM spike when credentials exist |
| 0.6 | Partial | Six barriers + `PLANTED.md` + tests on `fe32f17` | PR + merge; refresh `cases.yaml` labels from PLANTED.md |
| 0.7 | Not started | No scanner | Scanner + cases for each barrier |

### Phase 1

| ID | Status | Evidence | What is missing |
|---|---|---|---|
| 1.1 | Partial | Scripted 5/5 both variants (`docs/evidence.md`) | LLM 4/5 when credentials land; prompt file; cases |
| 1.2 | Not started | Empty `voice-agent` spec dir on `c4f4c42` | Requirements + agent |
| 1.3 | Not started | No severity | Function + Hypothesis |
| 1.4 | Partial | `/runs` API on `main` | `/scan`, data-contract shape on `main` |
| 1.5 | Partial | `run_eval.py` | `docs/eval.md`; cases on `main` |
| 1.6 | Partial | Dashboard multipage on `97d34e2`; payment bug diagnosed | Wire panel to real bank or iframe; keyboard browser test; PR |
| 1.7 | Partial | Relative hook path on unblock | Timing + clip; bank coverage |
| 1.8 | Not started | — | Skill |
| 1.9 | Partial | Dockerfile + staging spec | Deploy; live URL |

### Phase 2–3

| ID | Status | Notes |
|---|---|---|
| 2.1 | Partial | Exorcist requirements draft on GitHub; needs your OK then design/code |
| 2.2–2.4, 2.6–2.8 | Not started | Core loop still blocked on 2.1 |
| 2.5 | Partial | Route shells on `97d34e2`; no live Fix/Verify |
| 3.1–3.3, 3.6–3.10 | Not started | — |
| 3.4 | Partial | URL guard on `main` |
| 3.5 | Partial | jest-axe only |

## 2. The five gate checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | EUR 50 payment fails when haunted | **Pass (scripted walker / fixture bank)** | Unchanged measured table. Fixture bank has six barriers on the bank branch; only barrier 1 blocks the keyboard journey |
| 2 | Human approves fix; Verifier passes | **Fail** | Exorcist still draft; no Approve handler |
| 3 | Journey test catches returned bug | **Fail** | `tests/journeys/` still README only |
| 4 | Loop 4 of 5 on staging | **Fail** | No staging, no loop |
| 5 | Power with install README | **Fail** | Still placeholder |

Gate result tonight: **still 1 of 5**.

## 3. Done list

DONE (full Definition of done on `main`): **none**.

Strongest progress on GitHub (needs PR + merge to count for the plan):

1. **0.6 bank barriers** (`fe32f17`) — six planted barriers + answer key + tests  
2. **Catch-up C1–C8** (`97e9c8c`) — PR template, decision log, cases, agents, steering, hook path, Pages removed  
3. **2.1 Exorcist requirements** + multipage UI (`97d34e2`) — draft waiting OK; routes committed  
4. **Payment diagnosis + spec** (`d494af4`)

## 4. Build order (unchanged priority, with tonight's facts)

| Order | ID | Tonight note |
|---|---|---|
| 0a | Open PR for `chore/unblock` | Unlocks DoD paperwork for everything after |
| 0b | Open PR for `feature/bank-payment-barriers` | Lands 0.6 evidence |
| 0c | Keep `feature/payment-journey` ready for review | Diagnosis/spec already on GitHub |
| 1 | 2.1 Exorcist | After you OK `.kiro/specs/exorcist/requirements.md` |
| 2–5 | 2.2, 2.3, 2.5, 2.8 | Same as before |
| — | 1.2 Voice | Branch empty; plan default still "simulation / defer" |
| — | Hero / pixel-faithful | Stretch / design; do not block the gate |

### Human waits (see also `docs/waiting-on.md`)

| Who | What | Status Fri 20 |
|---|---|---|
| You | OK Exorcist Q1–Q7 | **Still open** |
| Shilpa | Spec approvals | Not asked yet |
| Charvi | AWS / Bedrock | **Still open** — blocks 0.2, LLM half of 1.1, AI Exorcist |

## Layout note (unchanged)

Plan says Next.js / `backend/` / `bank/PLANTED.md`. Repo uses Vite / `agent/` / fixture bank. As of tonight, **`bank/PLANTED.md` exists on the bank worktree** and matches the plan's answer-key idea.

## OneDrive

Tried the shared OneDrive Word link: WebFetch returned **500**; browser opened Word Online titled `Sukhdha plan v4.6 status.docx` but the page had **no editable controls** in automation (0 interactive refs). **OneDrive itself was not written.** Local mirrors below are the source of truth for this audit.
