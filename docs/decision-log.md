# Decision log

One entry per decision. Facts only. Each entry names the files that hold the evidence.

## 2026-11-20: The demo uses the scripted walker, not the LLM agent

**Decision.** Journeys run in `scripted` mode. The scripted walker is the agent used for the demo and for every measured result.

**Why.** The LLM keyboard agent (Strands Agents on Amazon Bedrock) has not been run. All 10 LLM runs in the last eval (5 `broken`, 5 `fixed`) stopped with `stop_reason: error` and the message "AWS credentials are not configured". No tokens were recorded and no model accuracy was measured. The scripted walker ran 10 of 10 correct.

**Evidence.**
- Eval run: `generated_at` 2026-11-06T11:16:34Z in `artifacts/eval/results.json` (git-ignored; reproduce with `python -m agent.eval.run_eval`).
- Numbers are copied to `docs/evidence.md`:

| agent_mode | variant | correct | avg steps | avg latency ms |
|---|---|---|---|---|
| scripted | broken | 5 of 5 (`BLOCKED`, `TARGET_NOT_FOCUSABLE`, `div.pay-btn`) | 18.0 | 897.8 |
| scripted | fixed | 5 of 5 (`PASSED`) | 14.0 | 756.2 |
| llm | broken | 0 of 5 run (credentials missing) | n/a | n/a |
| llm | fixed | 0 of 5 run (credentials missing) | n/a | n/a |

- The eval report's own decision is NO-GO for the LLM agent, with the reason "LLM runs did not execute because Amazon Bedrock credentials were missing, so this is not a measured model accuracy".
- The checker (`agent/keyboard_agent/checker.py`) decides `verdict` and `reason_code` in both modes. Both modes use the same nine keyboard tools.

**Not known.** Whether the LLM agent would pass 4 of 5 runs. No spike was run, so no result for or against it exists.

**Plan reference.** `docs/Sukhdha plan.docx`, step 0.5.3 (log the spike result) and the wait row that follows it: if the spike fails, the default is the scripted keyboard walker.

**Revisit when.** AWS credentials and Bedrock access for Claude are available. Then run `python -m agent.eval.run_eval --modes llm --runs 5` and add a new entry with the real counts. Until then no LLM accuracy or reliability figure may be shown anywhere.

## 2026-11-22: Remove the GitHub Pages workflow

**Decision.** Delete `.github/workflows/pages.yml`.
**Evidence.** `gh run list --workflow pages.yml` shows the `pages` workflow with a `failure` result on its three most recent runs (2026-11-09 twice, 2026-11-19). `gh api repos/charvimaurya/haunted-audit/pages` returns 404, so GitHub Pages is not enabled for this repo.
**Why.** A deploy job that fails on every push to `main` hides real failures. The staging spec (`.kiro/specs/staging-deployment/`) names a different target. The dashboard is not published anywhere today.
**Not known.** Whether Pages will be enabled later. If it is, add a new workflow then.
**Revisit when.** The staging deploy exists or Pages is switched on.
