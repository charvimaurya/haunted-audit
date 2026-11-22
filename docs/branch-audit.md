# Branch audit

Date: Sun 22 Nov 2026. Repo: `charvimaurya/haunted-audit`. Base: `main` at `7042eb1`.

## Access check

| Check | Result |
|---|---|
| `git remote -v` | `origin https://github.com/charvimaurya/haunted-audit.git` (fetch and push) |
| `gh auth status` | Logged in as `Sukhxdx`. Token scopes: `repo`, `workflow`, `read:org`, `gist` |
| Push rights | `viewerPermission: WRITE`. Pushing branches and opening PRs works. |
| Branch protection / merge rights on `main` | Not checked yet. Confirmed at the first merge. |

## Branches

"Ahead" is the number of commits not on `main`. "Behind" is the number of commits on `main` that the
branch lacks. Every branch is 0 behind, so each one merges into `main` without a rebase today.

| Branch | Worktree folder | Ahead | Behind | Pushed | Uncommitted | Open PR at audit time | Files changed vs `main` |
|---|---|---|---|---|---|---|---|
| `main` | none | 0 | 0 | yes | none | none | none |
| `chore/repo-hygiene` | none | 0 | 0 | yes | none | none | 0 (same commit as `main`) |
| `chore/unblock` | `Kiro.unblock` | 1 | 0 | yes | none | none | 18 |
| `feature/bank-payment-barriers` | `Kiro.bank` | 7 | 0 | yes | none | none | 5 |
| `feature/payment-journey` | `Kiro.payment` | 3 | 0 | yes | none | #1 (draft) | 7 |
| `feature/hero-scene` | `Kiro.hero` | 1 | 0 | yes | none | none | 3 |
| `feature/voice-agent-spec` | `Kiro.voice` | 1 | 0 | yes | none | none | 1 |
| `feature/exorcist` | `Kiro.hackathon` (main folder) | 8 | 0 | yes | none | none | 75 |

`~/Desktop/Kiro.payment` has no uncommitted work. Local and remote tips match on every branch.

## File overlap between branches

No two branches change the same file. Merging them in any order should not conflict.
This was computed with `git diff --name-only main origin/<branch>` for each pair.

## What each branch holds

- `chore/unblock`: PR template, decision log, data contract, steering files, seven `.kiro/agents/*.md`, `evals/cases.yaml`, relative hook path.
- `feature/bank-payment-barriers`: working fake payment on the bank page, six planted barriers, `bank/PLANTED.md`, and tests.
- `feature/payment-journey`: docs only. Diagnosis of the payment bug and a reduced-scope spec.
- `feature/hero-scene`: spec only.
- `feature/voice-agent-spec`: a note that the voice-agent spec directory is empty. There is no spec yet.
- `feature/exorcist`: the name is misleading. It holds one Exorcist requirements file plus most of the dashboard work (multipage routes, hero castle and scene, Agents page, Voice Agent panel), plan-status docs, and README changes. It mixes docs, specs and code. See "Findings".

## Findings

1. **Work not clearly done in Kiro.** `feature/exorcist` tracks `.cursor/rules/haunted-audit-dashboard.mdc`.
   Commit `64dab7b` is titled "...dashboard Cursor rule" and `3f03798` adds "AI IDE prompts" to the README.
   These point to Cursor, which is not Kiro. The commits `ddfc119` (Voice Agent panel in Ghost Hunt),
   `e3da505` (Stage 1 marketing and app shell) and `97d34e2` (multipage routes, hero castle) have no
   marker of which tool wrote them. The Reviewer agent must check this diff. `docs/devlog.md` needs a plain line
   saying what was prototyped elsewhere and then reviewed and integrated in Kiro (Phase A, step 5).
2. **Mixed concerns.** `feature/exorcist` should not carry the dashboard code under that name. Options: merge it as one PR with an honest title, or split it. The split needs your decision.
3. **Worktree folders sit inside the main folder.** `git status` in `Kiro.hackathon` lists `Kiro.bank/`, `Kiro.hero/`, `Kiro.payment/`, `Kiro.unblock/`, `Kiro.voice/` as untracked.
   A careless `git add .` would add them. They should be moved out or ignored locally (`.git/info/exclude`) before any commit in the main folder.
4. **`chore/repo-hygiene` is the same commit as `main`.** It is safe to delete after you agree. Nothing was deleted.
5. **`.env` exists in the main folder.** It is ignored by `.gitignore` and not tracked. A secrets scan runs before each PR.
6. **PR #1 is a draft** from `feature/payment-journey`. Its title and body predate the scope reduction. The reduction commit `d494af4` is now pushed.
7. **Voice agent:** `feature/voice-agent-spec` contains no spec. The spec was never written. It is not mergeable as a feature.
8. **Author names.** Commits carry three author strings for the same person (`Sukhada dhingra`, `sukhada dhingra`, and a `noreply` form). Two commits are by Charvi Maurya. History is not rewritten.

## Not checked yet

- Branch protection and required reviews on `main`.
- Test results and secrets scan per branch. These run in step 3.

## PRs opened after this audit

#1 `feature/payment-journey` (already open), #2 this audit, #3 `chore/unblock`, #4 `feature/hero-scene`,
#5 `feature/bank-payment-barriers`, #6 `feature/exorcist` (draft). `feature/voice-agent-spec` has no PR because it has no spec.

## Correction

The first version of this file said `feature/exorcist` changes 85 files. `git diff --name-only origin/main origin/feature/exorcist` gives 75. Corrected after review.
