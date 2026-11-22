# Devlog

Built from git history and the README only. Dates are commit dates.

- 2026-11-06: Initial commit with a one-line README.
- 2026-11-08: Repo skeleton. Placeholder folders for `backend`, `bank`, `dashboard`, `evals`, `power`, `prompts`, `skills`, `tests` and `.kiro` (agents, hooks, specs, steering), plus docs files (`decision-log.md`, `devlog.md`, `evidence.md`) and empty GitHub issue, pull request and workflow templates.
- 2026-11-09: Keyboard agent added. Nine keyboard-only tools, a scripted walker, an LLM agent (Strands on Amazon Bedrock), a deterministic checker that decides `PASSED` or `BLOCKED`, a runner, a FastAPI run API with Server-Sent Events, an eval script with a 4-of-5 reliability gate, and the Haunted Bank test site with `broken` and `fixed` variants. pytest and Hypothesis tests came with it. The README reports the scripted walker at 5 of 5 correct on both variants; LLM mode was not scored because Bedrock credentials were not configured.
- 2026-11-09: Dashboard added (Vite and React), with axe accessibility tests, in the same commit as the agent.
- 2026-11-09: Kiro setup committed: steering rules (`product-rules.md`), an axe-on-save hook and script, and specs for the frontend, the Kiro integration, and Night Watch (requirements only).
- 2026-11-09: GitHub Actions workflow added to run the keyboard-agent and dashboard tests on every push.
- 2026-11-09: Immersive layer added to the dashboard (decorative ghost and particles loaded lazily, ambient ghost sent slowly from left to right, Calm mode and sound switches, with tests), plus a GitHub Pages workflow to publish the dashboard and four new lines in the steering rules.
- 2026-11-09: Vite dev server configured to accept the live preview host.

## Lines per plan activity (added 2026-11-20)

One line for each activity in `docs/Sukhdha plan.docx` that has work in the repo. Partly done means exactly what the line says is missing. Numbers are from `docs/evidence.md`.

- 0.2 (partly): `.env` is git-ignored and `.env.example` holds no keys. No reply from Claude on Bedrock has been recorded, because AWS credentials are not set up.
- 0.3 (partly): steering rules `product-rules.md` (2026-11-09) and `product-ux.md` (2026-11-19) existed. On 2026-11-20 `product.md`, `tech.md`, `structure.md`, `accessibility.md` and `data-contract.md` were added, so all five now exist. No conflict check has been run.
- 0.4 (partly): seven agent files were written on 2026-11-20 (planner, architect, developer, qa, reviewer, deployer, monitor). None has been tried in Kiro yet, so none is confirmed to answer in role.
- 0.5 (partly): the scripted walker is the agent in use. The LLM agent has not been run, so there is no spike result. The decision is in `docs/decision-log.md`.
- 0.6 (partly): the Haunted Bank page is in `fixtures/haunted_bank/` (2026-11-09) and plants one barrier, the Send Payment div that the keyboard cannot reach. The plan wants six, and `bank/PLANTED.md` does not exist yet.
- 1.1 (partly): the keyboard agent, nine keyboard tools, scripted walker and checker were built on 2026-11-09. The scripted walker was right 5 of 5 on the broken page and 5 of 5 on the fixed page. The LLM agent has not run (0 of 5 each, credentials missing). The prompt is inside the code, not in `prompts/`.
- 1.4 (partly): the API (start a run, read it, stream its steps, SQLite) was built on 2026-11-09 and hardened on 2026-11-19 (health check, keep-alive, CORS list, rate limits). The plan's `POST /scan` and `POST /run-journey` do not exist.
- 1.5 (partly): `agent/eval/run_eval.py` runs each case 5 times and writes a GO or NO-GO report. There is no benchmark with precision and recall, and `evals/cases.yaml` was empty until 2026-11-20.
- 1.6 (partly): the dashboard (Vite + React) with the Possession Mode panel was built on 2026-11-09, with axe tests that run in CI. No browser keyboard test has been run and there is no Mac check yet.
- 1.7 (partly): a save hook runs axe on the dashboard (2026-11-09). It is a Node script, it does not cover the bank page, and no timing or screen clip was saved. On 2026-11-20 its command was made relative so it works on another machine.
- 1.9 (partly): a Dockerfile, a smoke test script and the staging spec were added on 2026-11-19. The image has never been built and nothing is deployed.
- 3.4 (partly): a guard that blocks private and local addresses, with tests, was added on 2026-11-19. There is no scan endpoint and no one-scan-a-minute limit yet.
- 3.5 (partly): the dashboard's axe tests run in jsdom. They have not been run on every screen in a real browser and no screenshot was saved.

- 2026-11-22: Origin note. `feature/exorcist` tracks `.cursor/rules/haunted-audit-dashboard.mdc` and a commit message mentions a Cursor rule, so part of the dashboard work (Stage 1 shell, Voice Agent panel wiring, README AI-IDE prompts) may have been prototyped outside Kiro. It is not yet reviewed. The reviewer agent must check it and the result will be recorded here before PR #6 merges. Branch audit: `docs/branch-audit.md`.
- 2026-11-22: PR #2 merged (merge commit). Branch audit `docs/branch-audit.md`. Reviewer (sub-agent fallback) found a wrong file count (85, really 75); corrected before merge.
- 2026-11-22: PR #1 merged (merge commit). Payment bug diagnosis and the reduced-scope payment-journey spec. Reviewer: no serious issue.
- 2026-11-22: PR #4 merged (merge commit). Hero-scene spec, no code. Reviewer: no serious issue.
- 2026-11-22: PR #3 merged (merge commit). PR template, seven agent files, steering, data contract, `evals/cases.yaml`. Reviewer found the `pages.yml` deletion unjustified; the reason (three failed runs, Pages not enabled) was added to `docs/decision-log.md` before merge. One devlog conflict with PR #2 resolved by keeping both sections.
- 2026-11-22: PR #5 merged (merge commit). Bank page takes a fake payment and plants six barriers. Reviewer found the fixed-variant Send Payment button at 2.57:1 to 4.25:1 contrast (axe skips gradients); changed to 5.37:1 to 6.9:1 and text raised to 16px. After the fix: pytest 247 passed, scripted walker 5 of 5 broken and 5 of 5 fixed.
- 2026-11-22: Origin result for PR #6. Six commits on `feature/exorcist` carry `Co-authored-by: Cursor <cursoragent@cursor.com>`: `f33720a`, `3f03798`, `37d11b5`, `97d34e2`, `cb64a38`, `64dab7b`. They include the multipage routes, the hero castle, README "AI IDE" prompts and `.cursor/rules/haunted-audit-dashboard.mdc`. Commits `e3da505` (Stage 1 shell) and `ddfc119` (Voice Agent panel) have no trailer; git does not record the editor, so their origin is not known. This work was prototyped outside Kiro, then reviewed and integrated in Kiro: the reviewer (Kiro sub-agent fallback) raised three serious issues (text under 16px, example outcomes shown as if measured, a derived "100% fixes verified"), all fixed in Kiro in `92aaa00` and `145eb87`, and a second review found no serious issue open.
- 2026-11-22: PR #6 merged (merge commit). Marketing and app shells mounted so all 19 manifest pages render; pages show only checker results or `--`. After the fix: dashboard 64 tests passed, pytest 247 passed, keyboard walk 19 of 19 pages passed in Chrome (`scripts/keyboard_walk.py`).
