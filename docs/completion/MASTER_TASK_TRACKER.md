# Master task tracker: Sukhda Build Plan v5.3

Audit date: 24 Nov 2026 (local). Source plan: `Sukhdha plan v5.3 status.docx` (plan was checked against main 1568826).
Audited: `main` at 1de776a, in a separate git worktree. My first pass read the stale branch `wip/dashboard-uncommitted` (925fd05, behind main by 6 commits, with 19 modified and 4 untracked uncommitted files owned by Sukhda; I did not touch them). Rows below are corrected to main.

## Verified test baseline (run in this audit)

| Check | Command | Result |
|---|---|---|
| Python tests (main) | `.venv/bin/python -m pytest -q` | all pass, 0 failures (dots only, no `F`/`E`) |
| Dashboard tests (main) | `cd dashboard && npm test` | 17 files, 137 tests pass |
| Dashboard build | `npm run build` | built, no errors |
| Journey test file | `tests/journeys/send-payment.spec.ts` | exists. Not re-run in this audit |
| Playwright / axe browser tests | not re-run | UNVERIFIED in this audit |
| Eval (`run_eval --runs 5`) | not re-run | UNVERIFIED in this audit |

Status words: DONE, BUILT_PENDING_REVIEW, IN_PROGRESS, BLOCKED_EXTERNAL, NOT_STARTED.
"Verified" means I saw a file or a passing test in this audit. It does not mean a reviewer signed it off. DONE needs a reviewer other than the author (Definition of Done box 5), so nothing below that I wrote is marked DONE.

## Direct commits that still need paperwork (Phase 2)

31cbbab, fd9f336, afb96aa, 1568826, ea3581f, b5daec1, 9b3ba6c. All are in history, none had a pull request. Needed: qa and reviewer run, a devlog line each, `evals/cases.yaml` pointer for `qa_exorcist.py`. History is not rewritten. Status: NOT_STARTED. Owner: Sukhda. Needs `kiro-cli` (not run in this session).

## Tasks

| # | Task | Plan status | Verified status | Remaining | Depends on | Acceptance | Evidence | Owner |
|---|---|---|---|---|---|---|---|---|
| 0 | Merge by PR | Done | DONE (per plan, PRs 1-14 merged) | keep using PRs | - | main has the branches | git log | Sukhda |
| 1 | Exorcist, approve/reject | Built | BUILT_PENDING_REVIEW | TASK-07 devlog line and `scripts/qa_exorcist.py --runs 5` output are on main (990b469: scripted 5 of 5; llm not run, no AWS). Left: independent Reviewer sign-off | - | Reject leaves code unchanged; decisions stored | `agent/fixes/exorcist.py`, `agent/tests/test_exorcist.py` (pytest passes) | Sukhda |
| 2 | Verifier keyboard + voice | Built | BUILT_PENDING_REVIEW | voice replay is on main (LE-01 to LE-03); `scripts/qa_verifier_outcomes.py` shows the four outcomes (990b469). Left: independent Reviewer sign-off | 1 | 4 Verifier results in real runs; bank fixtures unchanged | commits 06933b3, 774f08b, 16fbe46; `docs/evidence/loop-evidence-*.png` | Sukhda |
| 3 | Journey test, regression guard, API | Due | BUILT_PENDING_REVIEW | `tests/journeys/send-payment.spec.ts` and guard exist (JG-01 to JG-03, "GUARD_WORKS 5 of 5" recorded in 663ce22). Re-run the guard here. Plan's endpoint names `POST /runs/{id}/exorcise`, `POST /regression/demo`, `GET /fixes/{id}/events` differ from the data contract (`/runs/{id}/fixes`, `/fixes/{id}/regression`); I will not rename shipped endpoints (Task 20) | 1, 2 | GUARD_WORKS 5 of 5 | `docs/pr/item-3-journey-guard.md` | Sukhda |
| 4 | Wire loop to dashboard | Built | BUILT_PENDING_REVIEW | PR, devlog, two evidence rows with run IDs (LE-02 adds them) | 1, 2 | whole loop by keyboard; npm test passes | dashboard tests 132 pass | Sukhda |
| 5 | Spooky moments | Due | IN_PROGRESS | SS-01 exorcism on Approve and SS-02 before/after split are on main (d5e2a7d, 1de776a); SS-03 (docs, review record) not ticked. Returning-ghost moment on regression: unverified | 4 | 3 moments + no-motion version + tests | `.kiro/specs/spooky-steps/` | Sukhda |
| 6 | UI fixes U1-U14 | Due | IN_PROGRESS | U3 (`/ 6` from PLANTED.md), U5 (focus trail on bank) | - | all U rows fixed | plan U table | Sukhda |
| 7 | Core design states | Due | IN_PROGRESS | empty/loading/error on every loop screen plus test | 4 | see plan | - | Sukhda |
| 8 | Self-scan axe | Due | IN_PROGRESS | re-run browser axe, save screenshot (live link needs item 9) | 41 | 0 findings | - | Sukhda |
| 9 | Deploy live | Due | BLOCKED_EXTERNAL | Charvi runs Appendix A (AWS access). Local: write `docs/deploy.md`, check Dockerfile | - | live link works | no `docs/deploy.md` yet | Charvi |
| 10 | Recorded-run fallback | Due | IN_PROGRESS | auto-replay when API unreachable | - | API stopped shows labelled replay | `RunNotice` exists | Sukhda |
| 11 | Gate and recording run | Due | NOT_STARTED | needs 3, 9, 18 | 3, 9, 18 | 4 of 5 in `docs/evidence.md` | - | Sukhda + Charvi |
| 12 | Agents, steering, spec fix | Due | BUILT_PENDING_REVIEW | Next.js wording replaced with Vite in `haunted-audit-frontend/design.md` and `.cursor/rules/haunted-audit-dashboard.mdc` removed, on branch `chore/item-12-spec-fix` (grep finds no `Next.js`). Left: PR, review, and checking each of the 7 agents answers in role | - | no "Next.js" left | `grep -n "Next\.js" ...` is empty | Sukhda |
| 13 | Form hook | Due | IN_PROGRESS | remove `/Users` paths (check), timing clip in Kiro | - | hook prints axe findings | `backend/scan_file.py` | Sukhda |
| 14 | PLANTED.md | Done | DONE (per plan) | - | - | - | `bank/PLANTED.md` | - |
| 15 | Paper trail | Done | DONE (per plan) | - | - | - | docs | - |
| 16 | AI disclosure | Due | NOT_STARTED | README section (Kiro, Claude AI, Cursor); remove "built only with Kiro" claims; list for Shilpa | - | README section | - | Sukhda |
| 17 | Write-up notes | Due | NOT_STARTED | notes for Shilpa | most | - | `docs/kiro-writeup/` exists | Sukhda -> Shilpa |
| 18 | MCP + Power | Due | IN_PROGRESS | `run_journey` tool, screenshot, 2nd laptop, Windows | - | Kiro chat runs the journey | `docs/evidence/power-fresh-install-2026-11-22.md` | Sukhda + Charvi |
| 19 | Freeze, handover | Due | NOT_STARTED | `docs/handover.md`, Known issues in README | most | - | missing | Sukhda |
| 20 | API stability | Due | DONE as a rule | no change to `POST /runs` / `GET /runs/{id}` without Shilpa | - | unchanged | data-contract | Sukhda |
| 21 | Review Night Watch PR | Due | BLOCKED_EXTERNAL | Shilpa's PR must exist | Shilpa | review comment | - | Sukhda |
| 22 | Judge README | Due | NOT_STARTED | replace Option A with Appendix B (I need Appendix B text and real live and video URLs; none invented) | 9 | clean-machine test | - | Sukhda |
| 23 | Codespaces | Due | NOT_STARTED | `.devcontainer` absent (confirmed) | - | fresh codespace runs both demos | - | Sukhda |
| 24 | Voice agent | Done | DONE (per plan) | - | - | - | `agent/voice_agent/` | - |
| 25 | Ghost hunter scanner | Due | NOT_STARTED | `backend/scanner` is README only | - | 5 of 5 same findings | - | Sukhda |
| 26 | External scan mode | Due | NOT_STARTED | needs 25 | 25 | SSRF tests, 1/min limit | URL guard exists | Sukhda |
| 27 | Benchmark 12 cases | Due | NOT_STARTED | `evals/cases.yaml` has 6; no `docs/eval.md`; Charvi labels | 25 | measured numbers only | - | Sukhda + Charvi |
| 28 | Kiro forms test | Moved | BLOCKED_EXTERNAL | Charvi | 13 | - | - | Charvi |
| 29 | Four skills | Due | IN_PROGRESS | 4 skills present in `.kiro/skills/`; 2 proven; prove exorcise-fix and journey-test-writer with screenshots | 1, 3 | screenshot each | skills-activation doc | Sukhda |
| 30 | Kiro Web | Due | NOT_STARTED | run issue #8 in Kiro Web (needs the user's Kiro Web account) | - | linked PR | - | Sukhda |
| 31 | Reference field | Due | NOT_STARTED | add field to both variants, PLANTED.md, seed, eval | - | 3 fields; 5-run pass | - | Sukhda |
| 32 | Journey tests in CI | Due | IN_PROGRESS | `tests.yml` already installs the journey test; required-check setting needs Charvi | 3 | job fails when bug returns | `.github/workflows/tests.yml` | Sukhda + Charvi |
| 33 | Assets and licences | Due | NOT_STARTED | audit fonts, icons, images, sounds, packages | - | README section | - | Sukhda |
| 34 | Submission tag | Due | BLOCKED_EXTERNAL | only on Shilpa's confirmation | all | tag exists | - | Shilpa |
| 35 | UI v9 base | Due | IN_PROGRESS (partly built, uncommitted) | tokens, Creepster, one Settings menu, ui-fidelity.md | - | matches v9 | `design/v9/` | Sukhda |
| 36 | Home hero | Due | IN_PROGRESS | `HeroScene`/`HeroSection` modified, uncommitted | 35 | matches `01-home.html` | - | Sukhda |
| 37 | Possession + voice | Due | IN_PROGRESS | built in 9b3ba6c; remove extra Voice agent button (done in 9b3ba6c? unverified) | 35 | matches `03-possession-voice.html` | - | Sukhda |
| 38 | Agents page | Due | NOT_STARTED | v9 styling and live timeline | 35 | "Not run yet" before a run | - | Sukhda |
| 39 | Fixes page | Due | IN_PROGRESS | panels built in b5daec1; keyboard and voice evidence rows in LE-02 | 2, 35 | real run IDs | loop-evidence screenshots | Sukhda |
| 40 | Kiro + Results | Due | IN_PROGRESS | parts built; real benchmark values need item 27 | 27 | `--` when unmeasured | - | Sukhda |
| 41 | UI fit + a11y | Due | BLOCKED_EXTERNAL | Charvi owns it | 35-40 | 0 axe findings, no clipping at 1366x768 | - | Charvi |

## What cannot be done from this session

- AWS deploy (9), Kiro Web (30), second-laptop and Windows tests (18, 22), Codespaces test (23), tag (34): need accounts, other people or other machines.
- `kiro-cli qa` / `reviewer` runs: not run here. The sub-agents `qa` and `reviewer` are available in this IDE and can be used per branch.
- Plan Appendix A and B, and rows for items 35-41 beyond the prompt, were not read in full yet.
