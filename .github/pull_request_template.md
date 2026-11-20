## Spec link

<!-- Path or link to the spec, for example .kiro/specs/<name>/requirements.md. Small edits made in vibe mode: write "vibe mode" and say why no spec is needed. -->

## What changed

<!-- Files and behaviour, in plain words. List anything you touched that the task did not name. -->

## QA report

- Tests run: <!-- command and result, for example `.venv/bin/python -m pytest -q` and `cd dashboard && npm test` -->
- AI step pass rate: <!-- "n of 5 runs" counted from the runs just made, or "no AI step" -->
- `agent_mode` of every result quoted: <!-- scripted or llm -->
- Failures added to `evals/cases.yaml`: <!-- case ids, or "none" -->
- Measured numbers come from: <!-- file or command; never write a number that was not measured -->

## Reviewer notes

<!-- Reviewer agent output or your own read-only review. List open issues and who fixes them. -->

## Definition of done

- [ ] Built in Kiro: Spec mode for features, vibe mode for small edits
- [ ] Merged to main through this pull request with the sections above filled in
- [ ] Tests pass; any AI agent step passes at least 4 of 5 repeat runs
- [ ] Reviewer agent has no serious issue open
- [ ] No keys, passwords or real data in code or commits
- [ ] Any screen touched still works by keyboard alone (Tab, Shift+Tab, Enter)
- [ ] Anything that broke is a case in `evals/cases.yaml`
- [ ] One line in `docs/devlog.md`; a screen clip if a Kiro moment is worth showing
