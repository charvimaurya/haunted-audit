# Plan status: Sukhda's Build Plan

Audit date: **Fri 20 Nov 2026, 21:30 IST**. Previous audit: Thu 19 Nov 2026, 22:19 IST.
Gate: Sun 22 Nov. Feature freeze: Tue 24 Nov evening. Handover: Wed 25 Nov.
Plan source: `docs/Sukhdha plan.docx` (read in full, including its "if late" defaults).
Status docx source: `docs/Sukhdha plan - status 19 Nov.docx` (edited yesterday; this file is the living evidence log).

## Where the work lives today

Today's work is split across **six git worktrees** of the same repo (`charvimaurya/haunted-audit`). None of the new feature branches except `feature/exorcist` and part of `feature/payment-journey` are on `origin/main`. `main` is still `7042eb1`.

| Folder | Branch | Tip / state | Plan activities touched |
|---|---|---|---|
| `/Users/sukhada/Desktop/Kiro.hackathon` | `feature/exorcist` | `3f03798` on GitHub; **uncommitted** multipage UI, HeroCastle, pixel-faithful spec | 2.1 (spec draft), 1.6 / 2.5 (routing UI local), README setup |
| `/Users/sukhada/Desktop/Kiro.bank` | `feature/bank-payment-barriers` | `fe32f17`, **7 local commits, not pushed** | **0.6** six barriers + `PLANTED.md` + tests |
| `/Users/sukhada/Desktop/Kiro.payment` | `feature/payment-journey` | on GitHub, **ahead 1** (`d494af4`) | Diagnosis + payment-journey spec (ties to 0.6 / 1.6) |
| `/Users/sukhada/Desktop/Kiro.unblock` | `chore/unblock` | staged changes, **not committed** | **0.3, 0.4, 0.5, C1–C8** catch-up |
| `/Users/sukhada/Desktop/Kiro.hero` | `feature/hero-scene` | draft spec untracked; base `7042eb1` | Hero scene spec (design polish for Home) |
| `/Users/sukhada/Desktop/Kiro.voice` | `feature/voice-agent-spec` | empty `.kiro/specs/voice-agent/` | **1.2** branch only; no requirements yet |

## How this was checked

- Read the worktrees above, `git log` / `git status` / `git worktree list`, and the files named in each row.
- Did **not** merge branches into `main`. Did **not** invent numbers. Bank contrast / axe numbers are quoted from `Kiro.bank/bank/PLANTED.md` (measured 2026-11-20 in that branch's tests).
- Dashboard tests in `Kiro.hackathon/dashboard`: **44 passed** locally on this audit (includes hero-castle and route tests for uncommitted UI).
- GitHub: `main` and `chore/repo-hygiene` at `7042eb1`; remotes also have `feature/exorcist` and `feature/payment-journey`. Still **0 pull requests** merged for Definition of done (PR list API was Forbidden from this machine; earlier audit had `[]`).

## Why nothing is fully Done

Same four Definition-of-done boxes still fail for every activity:

| Box | Finding |
|---|---|
| Merged to main through a PR, template filled in | No activity from today is on `main`. The PR template is filled **only on `chore/unblock` (staged)**. |
| Reviewer agent has no serious issue open | Reviewer file exists on `chore/unblock` (staged) but has not been run on a PR. |
| Failures in `evals/cases.yaml` | Filled on `chore/unblock` (staged). Still empty on `main` and on the bank branch. |
| One line in `docs/devlog.md` per activity | Per-activity lines exist on `chore/unblock` (staged). `main` / `feature/exorcist` still have the old summary-only log. |

## What changed since yesterday (19 → 20 Nov)

### Catch-up (`Kiro.unblock`, staged, not committed)

| Catch-up ID | Status tonight | Evidence |
|---|---|---|
| C1 PR template | **Built (staged)** | `.github/pull_request_template.md` has Spec / What changed / QA / Reviewer / DoD sections |
| C3 decision-log | **Built (staged)** | `docs/decision-log.md`: scripted walker chosen; LLM not measured |
| C4 per-activity devlog | **Built (staged)** | `docs/devlog.md` section "Lines per plan activity (added 2026-11-20)" |
| C5 data-contract | **Built (staged)** | `.kiro/steering/data-contract.md` (~4.9 KB) |
| C6 cases.yaml | **Built (staged)** | `evals/cases.yaml` with `bank-001`, `fail-001`, `fail-002`, … (still refers to PLANTED.md as missing — outdated once bank branch merges) |
| C7 relative hook path | **Built (staged)** | `.kiro/hooks/axe-on-save.json` → `node .kiro/scripts/axe-on-save.mjs` |
| C8 delete Pages workflow | **Built (staged)** | `.github/workflows/pages.yml` deleted on this branch |

### Phase 0

| ID | Yesterday | Tonight | Evidence / missing |
|---|---|---|---|
| 0.1 practice run | Not started | Not started | Still no practice note / credit balance in the active branches' `devlog.md` |
| 0.2 Bedrock hello | Cannot verify | Cannot verify | Still no recorded Bedrock reply; needs Charvi's IAM |
| 0.3 five steering files | Partial (2 of 5) | **Partial (5 of 5 on `chore/unblock`, staged)** | `product.md`, `tech.md`, `structure.md`, `accessibility.md`, `data-contract.md` added. Conflict check not run. Not on `main` |
| 0.4 seven agents | Not started | **Partial (files on `chore/unblock`, staged)** | planner, architect, developer, qa, reviewer, deployer, monitor. Not tried in Kiro yet |
| 0.5 spike logged | Partial | **Partial (stronger)** | Decision logged on `chore/unblock`. Spike itself still never measured for the LLM |
| 0.6 bank + 6 barriers | Partial (1 barrier, no PLANTED.md) | **Partial → nearly complete on `feature/bank-payment-barriers`** | `bank/PLANTED.md` lists barriers 1–6 with measured criteria; `fixtures/haunted_bank/index.html` plants all six; `agent/tests/test_bank_barriers.py` (296 lines). **Not pushed, not merged.** `cases.yaml` on that branch is still 0 bytes |
| 0.7 scanner | Not started | Not started | Still no scanner |

### Phase 1

| ID | Yesterday | Tonight | Evidence / missing |
|---|---|---|---|
| 1.1 keyboard agent | Partial | Partial | Unchanged measured evidence (scripted 5/5). LLM still not run |
| 1.2 voice agent | Not started | **Not started (branch only)** | `Kiro.voice` has empty `.kiro/specs/voice-agent/` |
| 1.3 impact rules | Not started | Not started | — |
| 1.4 API | Partial | Partial | Unchanged on `main` |
| 1.5 benchmark | Partial | Partial | `cases.yaml` has content only on `chore/unblock` (staged) |
| 1.6 Possession dashboard | Partial | **Partial (local progress in hackathon + payment diagnosis)** | Multipage routes / Possession / HeroCastle **uncommitted** in `Kiro.hackathon`. Payment diagnosis (`docs/bug-payment.md` on payment branch): dashboard Send Payment is a drawing with no handler — fixture bank works by mouse |
| 1.7 hook | Partial | **Partial (path fixed on unblock)** | Absolute path removed on `chore/unblock`. Still Node-only, dashboard-only, no timing clip |
| 1.8 skill | Not started | Not started | — |
| 1.9 staging | Partial | Partial | `vercel.json` exists uncommitted in hackathon (SPA rewrite only). Still nothing deployed; README live link still a placeholder |

### Phase 2

| ID | Yesterday | Tonight | Evidence / missing |
|---|---|---|---|
| 2.1 Exorcist | Not started | **Partial (requirements draft)** | `.kiro/specs/exorcist/requirements.md` on `feature/exorcist` (GitHub). Status DRAFT, waiting your OK. No design/tasks/code. Approve/Reject still dead |
| 2.2–2.4, 2.6–2.8 | Not started | Not started | — |
| 2.5 Find/Fix/Verify/Regression | Partial (static) | **Partial (routes exist locally)** | Pages under `/journeys/send-payment/fixes/{find,fix,verify,regression}` in uncommitted `AppRoutes` / `routes.ts`. Still no live Fix/Verify data |

### Phase 3

Unchanged in substance. URL guard (3.4) and jest-axe (3.5) remain Partial. Write-up / handover / Power still Not started.

### Extra specs started today (not numbered plan IDs)

| Spec / work | Where | Status |
|---|---|---|
| `payment-journey` | `Kiro.payment` | Diagnosis DONE; scope reduced; REQ-PAY/REQ-BAR built on bank branch (not merged); sessions/UI deferred |
| `hero-scene` | `Kiro.hero` | DRAFT requirements/design/tasks; nothing built in that worktree |
| `pixel-faithful-ui-v7` | `Kiro.hackathon` (untracked) | DRAFT; Home HeroCastle is a local decorative start |
| `ui-fidelity.md` steering | `Kiro.hackathon` (untracked) | Written |

## 1. Activity table (tonight)

Status key: Done / Partial / Not started / Cannot verify. "DoD gaps" still apply until PRs land on `main`.

### Phase 0

| ID | Status | Evidence | What is missing |
|---|---|---|---|
| 0.1 | Not started | No practice note | 3-line note + credit balance |
| 0.2 | Cannot verify | No Bedrock reply recorded | Charvi IAM + hello script output |
| 0.3 | Partial | Five named steering files on `chore/unblock` (staged) | Commit + PR; conflict check |
| 0.4 | Partial | Seven agent `.md` files on `chore/unblock` (staged) | Try each in Kiro; commit + PR |
| 0.5 | Partial | `docs/decision-log.md` on `chore/unblock` | Measured LLM spike when credentials exist |
| 0.6 | Partial | Six barriers + `PLANTED.md` + tests on `feature/bank-payment-barriers` | Push, PR, merge; refresh `cases.yaml` labels from PLANTED.md |
| 0.7 | Not started | No scanner | Scanner + cases for each barrier |

### Phase 1

| ID | Status | Evidence | What is missing |
|---|---|---|---|
| 1.1 | Partial | Scripted 5/5 both variants (`docs/evidence.md`) | LLM 4/5 when credentials land; prompt file; cases |
| 1.2 | Not started | Empty `voice-agent` spec dir | Requirements + agent |
| 1.3 | Not started | No severity | Function + Hypothesis |
| 1.4 | Partial | `/runs` API on `main` | `/scan`, data-contract shape on `main` |
| 1.5 | Partial | `run_eval.py` | `docs/eval.md`; cases on `main` |
| 1.6 | Partial | Dashboard + local multipage; payment bug diagnosed | Wire panel to real bank or iframe; keyboard browser test; PR |
| 1.7 | Partial | Relative hook path on unblock | Timing + clip; bank coverage |
| 1.8 | Not started | — | Skill |
| 1.9 | Partial | Dockerfile + staging spec; local `vercel.json` | Deploy; live URL |

### Phase 2–3

| ID | Status | Notes |
|---|---|---|
| 2.1 | Partial | Exorcist requirements draft on GitHub; needs your OK then design/code |
| 2.2–2.4, 2.6–2.8 | Not started | Core loop still blocked on 2.1 |
| 2.5 | Partial | Route shells local; no live Fix/Verify |
| 3.1–3.3, 3.6–3.10 | Not started | — |
| 3.4 | Partial | URL guard on `main` |
| 3.5 | Partial | jest-axe only |

## 2. The five gate checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | EUR 50 payment fails when haunted | **Pass (scripted walker / fixture bank)** | Unchanged measured table. Fixture bank now has six barriers on the bank branch; only barrier 1 blocks the keyboard journey |
| 2 | Human approves fix; Verifier passes | **Fail** | Exorcist still draft; no Approve handler |
| 3 | Journey test catches returned bug | **Fail** | `tests/journeys/` still README only |
| 4 | Loop 4 of 5 on staging | **Fail** | No staging, no loop |
| 5 | Power with install README | **Fail** | Still placeholder |

Gate result tonight: **still 1 of 5**.

## 3. Done list

DONE (full Definition of done on `main`): **none**.

Strongest local progress tonight (needs commit/PR/merge to count for the plan):

1. **0.6 bank barriers** (`Kiro.bank`) — six planted barriers + answer key + tests  
2. **Catch-up C1–C8** (`Kiro.unblock`) — PR template, decision log, cases, agents, steering, hook path, Pages removed  
3. **2.1 Exorcist requirements** (`feature/exorcist` on GitHub) — draft waiting OK  
4. **Payment diagnosis + spec** (`Kiro.payment` on GitHub)

## 4. Build queue (unchanged priority, with today's facts)

| Order | ID | Tonight note |
|---|---|---|
| 0a | Commit + PR `chore/unblock` | Unlocks DoD paperwork for everything after |
| 0b | Push + PR `feature/bank-payment-barriers` | Lands 0.6 evidence |
| 0c | Push remaining `feature/payment-journey` commit | Keeps diagnosis/spec on GitHub |
| 1 | 2.1 Exorcist | After you OK `.kiro/specs/exorcist/requirements.md` |
| 2–5 | 2.2, 2.3, 2.5, 2.8 | Same as yesterday |
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
