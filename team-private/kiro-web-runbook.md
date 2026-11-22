# Kiro Web runbook: fix one tester-reported issue

Plan item 30. The agent cannot run Kiro Web, which is a browser tool. These are the steps for you to do it.

**Issue:** [#8 Pipeline steps: arrow keys do nothing and every step is a Tab stop](https://github.com/charvimaurya/haunted-audit/issues/8), labelled `tester-reported` and `accessibility`.

## 1. Open the repo in Kiro Web

1. Go to **app.kiro.dev** and sign in.
2. Start a new session on **GitHub**, then pick `charvimaurya/haunted-audit`, branch `main`.
3. Check that Kiro reads the steering. Ask: "What are the accessibility rules for this repo?" It should quote `.kiro/steering/accessibility.md` (16px, 3px focus, keyboard only).

**Screenshot 1:** the session open on `charvimaurya/haunted-audit` with the steering answer.

## 2. Ask it to draft the fix

Paste this prompt:

> Fix GitHub issue #8 in this repo. Work on a new branch `fix/issue-8-pipeline-tabs`. Change only `dashboard/src/components/PipelineSection.tsx` and add one test in `dashboard/src/test/`. Meet every acceptance criterion in the issue. Run `cd dashboard && npm test`. Then open a pull request using `.github/pull_request_template.md`, with "Closes #8" and the real test output.

Let it work. Do not edit the code yourself.

**Screenshot 2:** the plan or task list Kiro Web made.
**Screenshot 3:** the diff, showing only `PipelineSection.tsx` and one new test.
**Screenshot 4:** the test output with the pass count.

## 3. Run QA and the reviewer on that branch

In a terminal on your laptop, with `kiro-cli` installed:

```
git fetch origin
git switch fix/issue-8-pipeline-tabs
kiro-cli chat --agent qa "Run the full test suite and python scripts/keyboard_walk.py. Report the real numbers."
kiro-cli chat --agent reviewer "Review this branch against main."
```

If `kiro-cli` is still not installed, use Kiro IDE instead. Open the branch and ask: "Review this branch against main using the reviewer checklist." Say in the PR that the CLI was not used.

**Screenshot 5:** the qa agent's numbers.
**Screenshot 6:** the reviewer's final line ("No serious issue open" or the list).

Paste both outputs into the PR's **QA report** and **Reviewer notes**.

## 4. Check it yourself with the keyboard (one minute)

Open `/app/fixes/verify` on the branch preview or locally (`cd dashboard && npm run dev`).

1. Press Tab until a step has focus. Only one step should be a stop.
2. Press Right and Left. Focus moves and the page does not change.
3. Press Enter. That step's page opens.

**Screen clip (optional):** this keyboard walk, 15 seconds.

## 5. Merge or reject, then record it

- **Merge** with a merge commit (not squash) if CI passes, the reviewer has no serious issue open, and your keyboard check passed.
- **Reject** if it changed other files, the tests fail, or the keyboard check failed. Close the PR with the reason.

Then add one line to `docs/devlog.md`. Copy one of these and fill in the parts in brackets:

```
- 2026-11-[dd]: Kiro Web fixed issue #8 (pipeline tabs) on fix/issue-8-pipeline-tabs, PR #[n]. QA: [n] tests passed, keyboard walk [n] of 19. Reviewer: [result]. Merged.
- 2026-11-[dd]: Kiro Web draft for issue #8 rejected, PR #[n]: [reason].
```
