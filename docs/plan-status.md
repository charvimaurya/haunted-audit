# Plan status: Sukhda's Build Plan

Audit date: Thu 19 Nov 2026, 22:19 IST. Gate: Sun 22 Nov. Feature freeze: Tue 24 Nov evening. Handover: Wed 25 Nov.
Plan source: `docs/Sukhdha plan.docx` (read in full, including its "if late" defaults).
Repo state audited: `main` at `7042eb1` (also `origin/main`). Uncommitted: `.vscode/settings.json` only.

## How this was checked

- **Read only.** I read files, `git log`, and the public GitHub API (pull requests, issues, Actions runs, repo visibility). I did not run tests, build, install, or edit anything. This file is the only one written.
- **Test evidence is the GitHub Actions run on `7042eb1`:** workflow `tests`, jobs `pytest` and `dashboard`, both **success**. I did not re-run them.
- **Eval numbers** come from `docs/evidence.md` (tracked) and `artifacts/eval/results.json` (local, git-ignored, `generated_at` 2026-11-06T11:16Z). Both agree.
- **A claim in a README or devlog is not evidence on its own.** Where a row rests on one, it says so.

## Why nothing is Done

The plan's Definition of done needs every box. Four boxes fail for every activity:

| Box | Finding | Evidence |
|---|---|---|
| Merged to main through a PR, template filled in | **0 pull requests have ever been opened.** All 10 commits went straight to `main` (or to a branch fast-forwarded into it). The PR template exists but is **empty (0 bytes)**. | GitHub API `/pulls?state=all` returns `[]`; `.github/pull_request_template.md` is 0 bytes |
| Reviewer agent has no serious issue open | **There is no Reviewer agent.** `.kiro/agents/` holds only `README.md`. | `ls .kiro/agents` |
| Anything that broke is a case in `evals/cases.yaml` | **`evals/cases.yaml` is empty (0 bytes).** | `wc -c evals/cases.yaml` |
| One line in `docs/devlog.md` per activity | `devlog.md` is a summary written from git history, not per-activity lines. It says so in its second line. | `docs/devlog.md` |

Also, no activity has a spec that matches it by name in `.kiro/specs/` for Phases 0 and 1, so "built in Kiro" cannot be shown from specs for the agent, API, scanner, or bank. The specs that exist are: `haunted-audit-frontend`, `haunted-audit-kiro-integration`, `night-watch` (requirements only), `product-shell-ia`, `llm-agent-eval`, `fix-verify-prevent`, `staging-deployment`, `multipage-routing-controls`.

## 1. Activity table

Status key: Done / Partial / Not started / Cannot verify. "DoD gaps" in the last column means the four failures above apply on top of what is listed.

### Phase 0

| ID | Status | Evidence | What is missing |
|---|---|---|---|
| 0.1 devlog note on Kiro practice run | Not started | `docs/devlog.md` has 10 dated lines, none about a practice run. No `kiro-practice` folder in the repo. | The 3-line practice note. The credit balance (a Phase 0 done box) is also not in the devlog. |
| 0.2 Bedrock reply from a script; `.env.example` only, no keys | Cannot verify | `.env.example` has empty `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` (no keys). `agent/keyboard_agent/agent.py` can call Bedrock. `artifacts/eval/results.json` records the LLM runs as "not executed: AWS credentials are not configured". No standalone 10-line hello script exists. | Console output (or a devlog line) showing one real reply from Claude on Bedrock, and the script. Needs Charvi's IAM access. |
| 0.3 five steering files (product, tech, structure, accessibility, data-contract) | Partial | `.kiro/steering/product-rules.md` (covers the purpose of `product.md`) and `product-ux.md` (covers part of `accessibility.md`: focus, targets, reduced motion). Both committed (`9d41ed2`, `12037fc`). | `tech.md`, `structure.md`, `data-contract.md` do not exist. No 16px / contrast / ghosts-never-cover-controls rule set as a file named for accessibility. No "list conflicting rules" check recorded. |
| 0.4 seven agents in `.kiro/agents` | Not started | `.kiro/agents/README.md` only (68 bytes). | planner, architect, developer, qa, reviewer (read-only, different model from developer), deployer, monitor. |
| 0.5 agent-drives-browser spike result logged | Partial | The scripted walker is in use: `agent/keyboard_agent/scripted_walker.py`; `docs/evidence.md` and the README state the demo walker is scripted. `artifacts/eval/results.json` has `decision: NO-GO` for the LLM agent (0 of 5, because no credentials). | `docs/decision-log.md` is **0 bytes**: the decision is not logged. The spike itself was never measured (LLM runs did not execute), so "agent failed, scripted chosen" is a default, not a result. |
| 0.6 Haunted Bank page + `bank/PLANTED.md` with 6 barriers | Partial | `fixtures/haunted_bank/index.html` (committed `9d41ed2`), labelled "Haunted Bank - test site", `?variant=broken\|fixed`. | `bank/PLANTED.md` does not exist (`bank/` holds only `README.md`). The page plants **one** barrier (`div.pay-btn` is not keyboard reachable). The plan needs 6, each with a testable criterion and WCAG rule. |
| 0.7 Ghost hunter scanner (Playwright + axe); planted barriers in `evals/cases.yaml` | Not started | `backend/scanner/README.md` only. No Python file uses axe. (`.kiro/scripts/axe-on-save.mjs` runs axe on the dashboard, not on the bank, and is not the scanner.) `evals/cases.yaml` is empty. | The scanner, saved findings in the data-contract shape, the 5-run repeat, and cases for each planted barrier. |

### Phase 1

| ID | Status | Evidence | What is missing |
|---|---|---|---|
| 1.1 keyboard agent | Partial | `agent/keyboard_agent/{agent,runner,scripted_walker,tools,checker,models}.py`. Scripted walker: `broken` 5 of 5 `BLOCKED/TARGET_NOT_FOCUSABLE` on `div.pay-btn`, `fixed` 5 of 5 `PASSED` (`docs/evidence.md`; `artifacts/eval/results.json` shows the same 20 runs). Tests green in CI (`tests`/`pytest` on `7042eb1`, includes Hypothesis checker tests). | **LLM agent never ran**: 0 of 5 on both variants (no AWS credentials), so "stuck 5 of 5, succeeds 4 of 5 on a fixed copy" is proven for the scripted walker only. Prompt is inline in `agent.py` (`SYSTEM_PROMPT`), not `prompts/keyboard_agent.md` (`prompts/` has a README only). No spec for this agent in `.kiro/specs/`. No failures logged in `cases.yaml`. DoD gaps. |
| 1.2 voice-command simulation agent | Not started | No voice code in `agent/`. The only "Voice Agent" is fixed text in `dashboard/src/components/GhostHuntSection.tsx` (pass/fail rows shown regardless of any run). | The agent, `prompts/voice_agent.md`, 4 of 5 runs, and a "voice-command simulation" label backed by a real run. The fixed rows should be removed (already flagged in `multipage-routing-controls`). |
| 1.3 Impact rules (Python, unit tests, Hypothesis) | Not started | No `severity` anywhere in `agent/`. Hypothesis tests exist (`agent/tests/test_checker.py`) but test checker invariants, not severity. | The severity function, unit tests, and the "exactly one severity per finding" Hypothesis test. |
| 1.4 API and evidence log (`POST /scan`, `POST /run-journey`, SQLite per run) | Partial | `agent/api/main.py`: `POST /runs`, `GET /runs/{id}`, `GET /runs/{id}/events` (SSE), SQLite `runs` and `events` tables. Tests `agent/tests/test_api.py`, `test_api_public.py`, `test_sse_keepalive.py`, `test_seed.py` (green in CI). | No `POST /scan` and no `POST /run-journey` (equivalent journey endpoint is `/runs`). No findings or severity stored. `data-contract.md` does not exist, so "returns the data-contract shape" cannot be checked. |
| 1.5 benchmark harness and `docs/eval.md` | Partial | `agent/eval/run_eval.py` runs 5 repeats per mode and variant and writes results (README "Eval"). Numbers in `docs/evidence.md`. | `evals/run_benchmark.py` and `docs/eval.md` do not exist. No scanner cases: `evals/cases.yaml` is empty, so "at least 6 cases end to end" and precision, recall, false positives are not measured. |
| 1.6 Possession mode dashboard page, focus trail, ghost beside control | Partial | `dashboard/src/components/{PossessionMode,GhostHuntSection,GhostMascot,RunControls}.tsx`; 16+ axe tests in `dashboard/src/test/a11y.test.tsx` (CI `dashboard` job green). Ghost position is read from `blocked_element.bounding_box`. | Stack differs (Vite, not Next.js; see mismatches). No browser keyboard test, so "mission completes by keyboard with visible focus trail" is unproven. No PR, no design review against v7.1 recorded, no Mac test (human). Known: the Possession panel's four sidebar links go to `#journeys`. |
| 1.7 on-save hook plus `scan_file.py`, under 10 s, clip saved | Partial | `.kiro/hooks/axe-on-save.json` and `.kiro/scripts/axe-on-save.mjs` (committed `9d41ed2`). | No `scan_file.py`. Hook matches `dashboard/src/**`, not `bank/`. The hook command is an absolute path (`/Users/sukhada/Desktop/Kiro.hackathon/...`), so it fails on any other machine. Its timeouts are 60 s (script) and 90 s (hook). **No timing and no clip** in `docs/kiro-writeup/` (README placeholder only). |
| 1.8 skill `wcag-ghost-mapper` | Not started | `skills/README.md` only. | The skill folder with 6 examples, and one use in Kiro chat. |
| 1.9 staging deploy (ECS Express Mode + Vercel), link in README | Partial | Preparation committed in `7fbf22d`: `Dockerfile`, `.dockerignore`, `/ping`, SSE keep-alive, CORS allow-list, rate limits, URL guard, seed (`agent/api/*`, `docs/evidence-seed.json`), spec `.kiro/specs/staging-deployment/`. Tests green in CI. | **Nothing is deployed.** No `iam/` files, no `deploy.yml`, no `vercel.json`, no `docs/deploy.md`. The README link is the placeholder `[live link]`. The image has never been built (no Docker on the dev machine). The `pages` workflow fails on every run (`deploy-pages` step; cause not read) and `https://charvimaurya.github.io/haunted-audit/` returns 404. Needs Charvi's AWS access. |

### Phase 2

| ID | Status | Evidence | What is missing |
|---|---|---|---|
| 2.1 Exorcist | Not started | Spec only: `.kiro/specs/fix-verify-prevent/`. In the dashboard, "Approve Fix" and "Reject" buttons in `PipelineSection.tsx` have **no handler**. | `prompts/exorcist.md`, diff generation, real Approve/Reject, decisions in the evidence log, 5-run check. |
| 2.2 Verifier | Not started | Spec only (`fix-verify-prevent`). | The patched-copy runner, before FAIL / after PASS, proof the live bank is unchanged. |
| 2.3 journey test writer | Not started | `tests/journeys/README.md` only. | The writer, the test in `tests/journeys/`, the bug-back FAIL / fix-restored PASS run 5 of 5, saved output. |
| 2.4 skills `exorcise-fix`, `journey-test-writer` | Not started | `skills/README.md` only. | Both skills and proof they are used. |
| 2.5 dashboard Find, Fix, Verify, Regression | Partial | `dashboard/src/components/PipelineSection.tsx` (Fix, Verify, Prevent tabs) and `GhostHuntSection.tsx` exist as static UI. | No live data for Fix/Verify/Regression (no backend). Dead Approve/Reject. No loop-by-keyboard test on staging. |
| 2.6 benchmark at 12 labelled cases | Not started | `evals/cases.yaml` is 0 bytes. | 12 labelled cases (needs Charvi's labels; default: run only labelled cases, never invent labels). |
| 2.7 MCP server, `.kiro/settings/mcp.json`, `power/` with install README | Not started | `.kiro/settings/` does not exist. `power/README.md` is a one-line placeholder. `mcp` is not in `requirements.txt`. Spec only: `.kiro/specs/haunted-audit-kiro-integration/`. | `mcp_server.py` with `scan_page` and `exorcise_page`, the registration, a screenshot of the tool call, the Power with an install README. |
| 2.8 gate rehearsal on staging | Not started | None (no staging, no loop). | Whole loop 5 times from a clean start; failures into `cases.yaml`. |

### Phase 3

| ID | Status | Evidence | What is missing |
|---|---|---|---|
| 3.1 live link | Not started | README has `[live link]`. | Staging, then promotion; a stranger completes the loop. |
| 3.2 Power install test | Not started | No Power exists. | Install on another laptop from the README alone. |
| 3.3 Kiro forms test numbers | Not started | `docs/eval.md` does not exist. | Both numbers. |
| 3.4 external scan with safety rules | Partial | `agent/api/url_guard.py` blocks private, loopback, link-local (incl. `169.254.169.254`, `169.254.170.2`), CGNAT, IPv6 and tricky IP spellings; `agent/tests/test_url_guard.py` and `test_scan_routes_use_guard.py` (green in CI). Fixture-only agent browser: `agent/tests/test_bundled_only_browser.py`. | No scan endpoint, no axe-only scan, no "1 scan per minute" limit (the limiter in `agent/api/limits.py` applies to runs: 5 per minute), no "findings only stored" storage. No spec named for 3.4. |
| 3.5 dashboard self-scan, zero axe errors, screenshot | Partial | jest-axe tests in `dashboard/src/test/a11y.test.tsx` (jsdom) pass in CI. | Not run in a real browser over every screen; no screenshot saved. jsdom cannot check colour contrast. |
| 3.6 skill `accessible-ui-review` | Not started | `skills/README.md` only. | Skill and a Reviewer-agent quote on a PR (no Reviewer agent, no PR). |
| 3.7 write-up, 10 headings | Not started | `docs/kiro-writeup/README.md` is one placeholder line. | All 10 sections with real examples and links. |
| 3.8 `docs/adlc.md` | Not started | File does not exist. | The paper trail (needs real PRs, QA report, Reviewer notes first). |
| 3.9 outsider skill check | Not started | None. | Needs the Power and a person outside the team (Shilpa). |
| 3.10 `docs/handover.md` and README known issues | Not started | `docs/handover.md` does not exist. README has no "Known issues" section. | Both. |

### Also checked

| Check | Status | Evidence |
|---|---|---|
| MIT LICENSE | Done | `LICENSE` is MIT, "Copyright (c) 2026 The Haunted Audit team", committed in `3666843`. |
| PR template | Fail | `.github/pull_request_template.md` exists and is **0 bytes**. No PR has used it. |
| `.kiro` not in `.gitignore` | Pass | `.gitignore` has no `.kiro` entry; 30 `.kiro/` files are tracked. |
| Secrets anywhere in git history | None found by pattern scan | Searched all history (`git log --all -p`) for AWS key IDs, secret key assignments, private key headers, GitHub and `sk-` tokens: the only matches are the words `AKIA`/`ASIA` inside the `staging-deployment` spec text. `.env` was never committed. **Limit:** this is a pattern search, not a full scanner (no gitleaks run); the plan's "secret scanning shows nothing" needs a scanner result or GitHub secret scanning status. |
| Commit history shows Kiro-built work over time | Weak | 10 commits, 2026-11-06 to 2026-11-19: 2 by Charvi (initial, skeleton), 4 on 2026-11-09 (agent, dashboard, specs, CI, Pages, Vite config), then nothing until 4 commits on 2026-11-19. The agent, API, checker, and bank arrive in one commit (`9d41ed2`). No commit message mentions Kiro, no PRs, no branch history. Specs are the only Kiro trace. |

## Layout mismatches (matched by purpose, not restructured)

| Plan | Repo |
|---|---|
| `backend/` (app, scanner, `mcp_server.py`, `scan_file.py`) | `agent/` (keyboard_agent, api, eval); `backend/*` has README placeholders only |
| Next.js dashboard on `localhost:3000` | Vite + React + TypeScript on `localhost:5173` |
| `bank/` (HTML bank, `PLANTED.md`) | `fixtures/haunted_bank/index.html`; `bank/` has a README only |
| `POST /scan`, `POST /run-journey` | `POST /runs`, `GET /runs/{id}`, `GET /runs/{id}/events` |
| `evals/run_benchmark.py`, `docs/eval.md` | `agent/eval/run_eval.py`, `docs/evidence.md` |
| Steering: product, tech, structure, accessibility, data-contract | `product-rules.md`, `product-ux.md` |
| Hook runs `python backend/scan_file.py` on `bank/` and `dashboard/` | `.kiro/hooks/axe-on-save.json` runs a Node script on `dashboard/src/**` |
| Agent prompt in `prompts/keyboard_agent.md` | Prompt inline in `agent/keyboard_agent/agent.py` |
| Python 3.12, `pyyaml`, `mcp`, `axe-playwright-python` | Python 3.11 (README setup, `pyproject.toml` `requires-python >=3.11`); none of those three in `requirements.txt` |
| Plan's "fixed layout in R2 of Doc" | Not in `Sukhdha plan.docx`; **cannot check** against it |

## 2. The five gate checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | The EUR 50 payment fails when haunted | **Pass (scripted walker only)** | `docs/evidence.md`: scripted `broken` 5 of 5 `BLOCKED/TARGET_NOT_FOCUSABLE` on `div.pay-btn`; `fixed` 5 of 5 `PASSED`. CI `pytest` green on `7042eb1`. The AI agent has no result (0 of 5, credentials missing). |
| 2 | A human approves the fix and the Verifier passes it | **Fail** | No Exorcist, no Verifier, Approve/Reject buttons have no handler. |
| 3 | The journey test catches the returned bug and passes when restored | **Fail** | `tests/journeys/` has a README only. |
| 4 | The whole loop passes 4 of 5 runs on staging | **Fail** | No loop exists beyond Find/Experience; nothing is deployed. |
| 5 | Power packaged with an install README | **Fail** | `power/README.md` is one placeholder line; no `mcp.json`, no MCP server. |

Gate result as of tonight: **1 of 5**.

## 3. Done list

DONE: none

Nothing meets the full Definition of done, mainly because no pull request has ever been opened and `evals/cases.yaml` is empty. The strongest rows by evidence are 1.1 (scripted walker only), 1.4, and 1.5. They are Partial, not Done.

## 4. Build queue

### Human-only items (not attempted; plan's "if late" default)

| Item | Needed by | Plan's "if late" default |
|---|---|---|
| Shilpa: review of `product.md` | Phase 0 | Merge; address comments in the next PR |
| Shilpa: spike fallback decision | Fri 6 Nov evening | Scripted keyboard walker; Bedrock only explains and fixes |
| Shilpa: approval of each spec's requirements (bank, scanner, keyboard agent, API, Exorcist, Verifier, journey test, safety) | within 12 h of each PR | Start the design from your own reading (safety spec: build exactly as written in 3.4.1) |
| Shilpa: voice agent requirements and "simulation" wording | Phase 1 | Build as written; call it simulation everywhere |
| Shilpa: the 4 severity rules | Mon 9 Nov | Use them as written in 1.3.1 |
| Shilpa: demo screens list | Mon 9 Nov | Build to the v7.1 design image |
| Shilpa: design review of Possession mode and of the loop screens | Phase 1, Phase 2 | Merge; fix comments in the next PR |
| Shilpa: gate decision (go or cut; real speech or simulation) | Sun 22 Nov | Go with the core loop; voice stays simulation |
| Shilpa: approval to go live | Mon 23 Nov | Keep the live link unshared until approved |
| Shilpa: someone outside the team with a laptop | Tue 24 Nov | Install on a second laptop yourself |
| Charvi: IAM sign-in, region, Bedrock access | Before 0.2 | Start 0.5 with Playwright only; add Bedrock the day access lands |
| Charvi: repo collaborator invite | Before 0.3 | Work in a local repo; push once access arrives |
| Charvi: keyboard check of the bank page | Sun 8 Nov | Carry on; re-checked Mon 9 Nov |
| Charvi: first 6 to 8 labelled cases | Sun 15 Nov | Carry on with the planted cases |
| Charvi: labels for all 12 cases | Fri 20 Nov | Run on the labelled cases only; never invent labels |
| Charvi: Mac keyboard test of Possession mode | Sat 14 Nov | Test on Windows yourself |
| Charvi: full-loop keyboard test on staging | Fri 20 Nov | Run it yourself and note it in the PR |
| Charvi: keyboard sign-off in the gate issue | Sat 21 Nov | Carry on; it is checked on Sunday |
| Charvi: Power installed on her Mac | Mon 23 Nov | Install on a second Windows laptop yourself |
| Charvi: keyboard check of the dashboard | Tue 24 Nov | Check it yourself and note it in the PR |
| Charvi: confirmation the $150 AWS budget covers the live service until 29 Jan | Mon 23 Nov | Go live anyway; the budget alerts still warn |
| User sessions (30 Nov to 3 Dec; Shilpa runs them, you send the university request by Sun 8 Nov) | Sun 8 Nov | The plan gives **no default**. Nothing in the repo shows the request was sent (cannot verify) |
| Credit balance noted in `docs/devlog.md` | Phase 0 | The plan gives no default; it is a Phase 0 done box and is missing |

### Capacity check (read this before the queue)

The plan's own pace is 30 h a week, about 4.3 h a day. From Fri 20 to Wed 25 is 6 days, so about **26 h** at the plan's pace, or about **48 h** at 8 h a day. I do not know your real hours; please tell me.

Plan hours still unbuilt, taken from the plan (not re-estimated):

| Group | Plan hours |
|---|---|
| Gate items 2.1, 2.2, 2.3, 2.5, 2.8 | 23.0 |
| Needed for gate checks 4 and 5: 1.9 staging (4.0) and 2.7 MCP and Power (3.0) | 7.0 |
| Then: LLM result for 1.1 (QA step 1.1.6), 2.6, 1.7 | 4.5 |
| Phase 3 (3.1 to 3.10) | 13.0 |
| **Total** | **47.5** |

Gate checks 4 and 5 cannot pass without 1.9 and 2.7, so the **minimum for a full gate is about 30 h**. That does not fit before Sun 22 Nov (3 days, about 13 h at the plan's pace) and fits before Wed 25 only at about 5 h a day or more, with no waiting on people. Gate check 4 also needs staging, which needs Charvi's AWS access. These are estimates from the plan's hours.

### Queue, in your priority order

| Order | ID | Plan h | Depends on / blocked by | Fits before 25 Nov? |
|---|---|---|---|---|
| 1 | 2.1 Exorcist | 5.5 | 1.4 evidence log fields; spec exists (`fix-verify-prevent`), human approval of requirements; Bedrock access for real diffs (else scripted fallback, see spec open question D6) | Yes, if started Fri 20 |
| 2 | 2.2 Verifier | 4.5 | 2.1 | Yes |
| 3 | 2.3 Journey test writer | 4.5 | 2.2 | Yes |
| 4 | 2.5 Dashboard Find, Fix, Verify, Regression | 4.5 | 2.1 to 2.3; remove dead Approve/Reject first | Yes, on the same pace |
| 5 | 2.8 Gate rehearsal | 4.0 | 2.1 to 2.7, staging | Only with 1.9 and 2.7 done. Likely Mon 23, not Sun 22 |
| 6 | 1.1 LLM result | 1.0 | Charvi's AWS access | Yes, if access lands; otherwise stays "scripted walker chosen" and say so in the decision log |
| 7 | 1.9 Staging | 4.0 | Charvi's AWS access, Docker build (not yet done), spec `staging-deployment` | At risk: depends on a person |
| 8 | 2.6 Benchmark to 12 | 2.5 | `cases.yaml` is empty; Charvi's labels | Cut to what is labelled |
| 9 | 2.7 MCP and Power | 3.0 | 1.7, skills | Needed for gate check 5 |
| 10 | 1.7 Hook timing and clip | 1.0 | `scan_file.py` or accept the Node script and say so; fix the absolute path | Yes |
| 11 | Phase 3 (3.1 to 3.10) | 13.0 | Gate, staging | Partly; see cuts |

Things the queue needs first (small, not in your list, but "Done" is impossible without them):
1. **Open pull requests and fill the PR template.** Write the template (0 bytes now). Every item below should go through a PR from now on.
2. Put real failures into `evals/cases.yaml` (empty now) as each item is built.
3. Add `docs/decision-log.md` entry for the scripted-walker decision and one `docs/devlog.md` line per activity.
4. Write `data-contract.md` and `tech.md` (the plan's prompts for design and API work refer to them).

### Cuts to fit, using the plan's own rule (core loop first; Night Watch, Kiro Web and polish are stretch)

Proposed, for your decision:
- **Already stretch in the plan:** Night Watch, Kiro Web, design polish, benchmark to 20, loan journey, general buffer. No work on these before 25 Nov.
- **Defer 1.2 Voice agent (4 h).** None of the five gate checks needs it. The plan's default keeps voice as simulation. Remove the fixed "Voice Agent" rows from the dashboard and label voice "planned".
- **Shrink 2.6 to the labelled cases that exist** (plan default), and report real numbers only.
- **Defer from Phase 3, in this order:** 3.9 outsider check (needs a person), 3.6 skill `accessible-ui-review`, 3.3 forms test, 3.4 external scan endpoint (the URL guard already exists; the endpoint does not), 3.8 `adlc.md` (needs real PRs first; keep a short version once PRs exist).
- **Keep in Phase 3:** 3.1 go live, 3.2 Power install test, 3.5 self-scan, 3.7 write-up (draft), 3.10 handover. The plan says that if the gate fails, Mon 23 goes only to the core loop.
- **Will not fit before 25 Nov at the plan's pace:** 1.2, 2.6 (full 12), 3.3, 3.4 endpoint, 3.6, 3.8, 3.9, and the stretch list. The full gate fits only if you can give about 5 h a day or more from Fri 20 and the AWS access arrives early.

Decision needed from you: your real hours per day to Wed 25, and whether Charvi's AWS access has landed.
