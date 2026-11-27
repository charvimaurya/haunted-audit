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

## 2026-11-25: Team defaults applied (`.kiro/steering/team-rules.md`)

- 2026-11-25: Fix-step buttons read "Replay both journeys" (Verify) and "Put the bug back and run both tests" (regression check), default from v9 (`design/v9/05-fixes.html`); open for Shilpa's review.
- 2026-11-25: The "we caught it" ghost is white (`CaughtGhost` in `dashboard/src/components/FixPanels.tsx`, token `--color-ghost-caught: #ffffff`, from `feature/ui-v9-fixes`; guarded by `dashboard/src/test/ui-v9-fixes.test.tsx`), default from v9; open for Shilpa's review.
- 2026-11-25: Verify starts only when a person presses it; the AutoLoopCard is no longer rendered on Possession Mode (commit `f39d344`; its source and tests are kept), default from team rules; open for Shilpa's review.
- 2026-11-25: The Regression card lists "Keyboard journey" and "Voice-command simulation" instead of v9's `send_payment.spec.ts` and `send_payment_voice.spec.ts`, because no such files run in this check; v9's layout kept, true names used (team rules: plain and true words); open for Shilpa's review.
- 2026-11-25: The voice FAILED line on the Regression card shows the voice agent's own first failed step (today "Could not type in Amount: no accessible label", because the bug put back includes the Amount label), not v9's sample text "no button named Send Payment"; open for Shilpa's review.

## 2026-11-27: Public URL scan-only mode (`POST /scan`, Plan items 25–26)

**Decision.** Added `POST /scan` with the Playwright + axe-core Ghost Hunter scanner (`backend/scanner/axe_scanner.py`) and SSRF guard (`agent/api/url_guard.py`). Agents remain restricted to the bundled Haunted Bank fixture; the external scanner operates strictly read-only (no clicks, no typing, no login, no stored page HTML) and limits public URL scans to 1 per minute per client IP.
**Evidence.** Default approved from the deck (slide 16) and `.kiro/steering/product-rules.md`; guarded by `agent/tests/test_scan_routes_use_guard.py` and `agent/tests/test_ghost_scanner.py`.
