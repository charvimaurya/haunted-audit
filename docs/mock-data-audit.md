# Mock data audit (plan item U2)

Date: Sun 22 Nov 2026. Branch: `feature/no-mock-results`, from `main` at `e10bdde`.

## How the search was done

- `git grep` over `dashboard/src` (tests left out) for literal results: `passed: true|false`, `done: true|false`, `'success'`, `'error'`, `Verified`, `caught`, `PASSED`, `FAILED`, `BLOCKED`, `Detected`.
- Second `git grep` for constant arrays and objects (`const UPPER = [` or `{`), and the words `sample`, `mock`, `fixture`, `example`, `demo`, `DEFAULT_`, `seed`.
- Every hit was read in context and sorted into one of the groups below.
- No JSON sample file or fixture module exists in `dashboard/src`. Every made-up value is a constant inside a component.

## Made-up results shown to users (must go)

| # | Where | What it shows | Page | Without any run? | Severity |
|---|---|---|---|---|---|
| M1 | `components/OutcomeCard.tsx:17` `OUTCOMES` | Three green ticks with `aria-label="achieved"`: "Customer can complete the payment", "A regression test prevents it from breaking again", "Accessibility built into the dev workflow with Kiro" | Reports, Results | **yes, always** | serious. Two of the three are not true today (no regression test exists) |
| M2 | `components/KiroIntegrationSection.tsx:43` `DEFAULT_EVENTS` | "Kiro Hook (Live)" list in an `aria-live` region: success "File saved: SendPayment.tsx", "scan triggered", error "Missing accessible label" | Kiro | **yes, always** | serious. Presented as live, but nothing is connected and `SendPayment.tsx` does not exist |
| M3 | `components/KiroIntegrationSection.tsx:20` `HOOK_CODE_LINES` | Hook code `hauntedAudit.scanJourney(file, "send-payment")` | Kiro | yes | serious. That API does not exist. The real hook runs `python3 backend/scan_file.py --hook` |
| M4 | `components/KiroIntegrationSection.tsx:28` `FILE_TREE` | `.kiro/powers/` | Kiro | yes | minor. The power is in `power/` at the repo root; `.kiro/` really holds agents, hooks, settings, skills, specs, steering |
| M5 | `components/PipelineSection.tsx:34,38` `BROKEN_CODE`, `FIXED_CODE` | Example diff under "Proposed Fix (by Exorcist Agent)" | Fixes: all four steps | yes | serious. It is labelled "Example fix", but it sits under an agent's name, and the Exorcist does not exist |
| M6 | `components/PipelineSection.tsx` Verification panel | "Reached Send Payment by keyboard", "Payment journey completed" ticks and a green **"Journey Verified"** badge, under "Verification (by Verifier Agent)" | Fixes | after any run | serious. These are the keyboard run's checker result on the reference fixed page, not a Verifier checking an approved fix. "Verified" claims a fix was verified |
| M7 | `voice/interpretVoiceCommand.ts:130-175` | Voice outcomes with ok/fail icons ("Found by name", "Could not activate button", "Activation reached in this run"), derived from the **keyboard** run | Agents | after a typed command | serious. No voice agent ran. The detail line says so, but the icons show PASS/FAIL |
| M8 | `components/PossessionMode.tsx:171-181` | A red pulsing **"Live Test"** badge | Possession Mode, Try | **yes, always** | minor. Claims a live test when none is running |
| M9 | `test/voice-agent.test.tsx:151` comment | "Keyboard card still has its own mock rows" | (test only) | n/a | stale comment. The keyboard rows were bound to real data in PR #6 |

## Already bound to real data (checked, keep)

| Where | Source |
|---|---|
| `GhostHuntSection` Keyboard Agent and Ghost Hunter rows, "Critical Ghost Detected" | `JourneyResult.verdict`, `reason_code`, `blocked_element` (fixed in PR #6) |
| `PossessionMode` checklist (`stepsFromResult`) | `focus_trail` and `verdict`. With no run, three grey "pending" circles and no pass/fail icon |
| `PossessionMode` ghost (`ghostStateFromResult`) | `verdict`; the blocked ghost is placed beside the control |
| `ResultsSection` "Planted barriers detected" | `1` only when `verdict` is `BLOCKED` with a `blocked_element`, shown as `1 / 6` (6 from `bank/PLANTED.md`); otherwise `--` |
| `ResultsSection` other three tiles | `null`, shown as `--` and "not yet measured" |
| Live steps (Agents) | SSE `StepEvent`s from `GET /runs/{id}/events` |

## Not results (decoration or real labels, keep)

`HeroCastle.WINDOWS`, `HeroSection.PILL_STEPS`, `GhostMascot.STATE_COLOR`, `CodeBlock.LINE_STYLE`, `RunControls.STATUS_*`, `RunNotice.LABELS`, `MetricValue.MODE_BADGE`, `PossessionMode.NAV_ITEMS` (the bank's menu labels), `GhostHuntSection.TOOL_COLOR`, `interpretVoiceCommand.DEFAULT_TARGET` (a parser default, not a result).

## Missing states

| What | Today |
|---|---|
| API offline | Shown only after pressing Run ("The audit service did not answer"). Before that, pages show "not yet measured" as if the API were up |
| Fix endpoint | Does not exist (`.kiro/steering/data-contract.md`, "Fix: PLANNED"). Nothing on the Fix pages says "Not available yet" for the Exorcist or the Verifier as a whole |

## Found while fixing (22 Nov, same branch)

| # | Where | Problem | Fix |
|---|---|---|---|
| M10 | `runs/RunProvider.tsx` | A crashed run (`status: "error"`, result `{run_id, error, verdict: "BLOCKED"}`) was shown as a real finding ("No, in the last run: BLOCKED", "Blocked: no reason code"). Seen in Chrome: the API on port 8000 was started from Cursor's sandbox and cannot find its Playwright browser, so every run crashed | `runs/record.ts` drops the result of a crashed run. Pages say "The run failed, so no result is shown." plus the first line of the error |
| M11 | `components/PipelineSection.tsx` step tabs | Steps before the current one were green and announced "completed" with no run | Tabs show position only ("step 2 of 4") |
| M12 | `components/ResultsSection.tsx` "Approved fixes verified" tile | Green tick next to `--` | Neutral wrench icon. This differs from v7, so it goes in the Phase 4 fidelity list |
| M13 | `components/MetricValue.tsx` counter | Counting up to 1 showed `0.6736666666865351 / 6` | Whole numbers count in whole steps |

## Plan

1. **Immediate:** one `ExampleLabel` component, an icon plus the text "Example only, not a real run". Every sample value that stays is wrapped in it and has no PASS, FAIL, Verified or caught state.
2. **Real fix:**
   - M1: each outcome comes from data or says "Not run yet" or "Not available yet", with no icon.
   - M2: replace the fake live list with the real hook command, plus one **recorded** finding from 22 Nov with its source file (a sourced number, not a live claim).
   - M3 and M4: show the real hook and the real `.kiro/` folders.
   - M5 and M6: Proposed Fix, Verification and Regression show "Not available yet" until the Exorcist and Verifier exist. The keyboard checker result moves to its own labelled row, with its `agent_mode`, and no "Verified" badge.
   - M7: simulated voice outcomes carry the Example label and no pass/fail icons until Phase 3.
   - M8: "Live Test" shows only while a run is going; otherwise "Not run yet".
   - The API status is checked with `GET /health` on load. Offline means an offline state everywhere results appear.
3. **Guards:**
   - A test renders every page with no run and with the API offline, and fails if any pass/fail/verified/caught state appears outside an `ExampleLabel`.
   - A build check fails if `src/samples/` is imported by app code.
