# Audit of the seven direct commits on main

Checked 24 Nov 2026 against `main`. Nothing here rewrites history. Each commit is an ancestor of `main` (checked with `git merge-base --is-ancestor`).
A "pull request" row means a merged PR exists for that commit. The merged PRs on main are #1 to #7, #9 to #14 and #16; none contains these commits.

| Commit | What it did | Size | Pull request | QA report | Reviewer notes | Devlog line | Spec or tasks ticked | Eval case |
|---|---|---|---|---|---|---|---|---|
| 31cbbab | Exorcist, approve/reject, Verifier, regression check | 16 files, +1006 | none | none | none | none for the commit. A TASK-07 line exists (2026-11-24) for the qa_exorcist 5-run output | `exorcist/tasks.md` TASK-01 to TASK-07 ticked | `fail-005` exists but points to a devlog entry dated 2026-11-22; the entry is dated 2026-11-24 |
| fd9f336 | Fix pages run the real loop by keyboard | 9 files, +494 | none | none | none | none | no spec tasks named | none |
| afb96aa | Real demo clips, high-contrast screenshot | 7 files | none | not needed (media only) | none | none | n/a | none |
| 1568826 | Voice panel example without a name; two screenshots | 3 files | none | none | none | none | n/a | none |
| ea3581f | Possession fields stay empty; clips re-recorded | 32 files | none | none | none | none | n/a | none |
| b5daec1 | v7 replica: roaming ghosts, sidebar labels, Fix/Verify/Regression panels, Kiro hook panel, Results from the loop | 16 files, +272 | none | none | none | none | no spec named | none |
| 9b3ba6c | Tester types the recipient; Settings menu; voice commands card and Keyboard/Voice switch | 50 files, +733 | none | none | none | none | none named in the commit message | none |

## What is missing, exactly

1. Devlog lines: none of the seven has its own line. Six need one new line each (fd9f336, afb96aa and 1568826 can share one line for the demo clips if the owner prefers; the plan asks for one line per commit).
2. QA report: a run of `kiro-cli --agent qa` on main, for 31cbbab, fd9f336, b5daec1, ea3581f and 9b3ba6c (the ones that change code or UI). Not run yet.
3. Reviewer notes: a run of `kiro-cli --agent reviewer` over the same range, saved in `docs/devlog.md` or `docs/pr/`. Not run yet.
4. `evals/cases.yaml` `fail-005`: change the evidence pointer date from 2026-11-22 to the real entry date.
5. Exorcist TASK-07 ticked: already done on main (`exorcist/tasks.md`). The 5-run output exists (scripted 5 of 5, llm not run, no AWS).

## What I did not do

- I did not run `kiro-cli qa` or `kiro-cli reviewer`, and I have not written devlog lines for these commits. Lines written without those runs would claim paperwork that did not happen.
- Because the commits are on main, the review has to be a range review (`git diff 31cbbab^..9b3ba6c`) and be recorded as such, not as a PR approval.
