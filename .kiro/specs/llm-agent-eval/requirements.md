# LLM agent eval - Requirements

**Goal:** settle GO or NO-GO on whether the Bedrock-backed keyboard agent is reliable, using real runs only.
**Steering:** `product-rules.md` (verdict authority, no invented metrics, reliability gate, agent mode contract).
**Existing code this builds on:** `agent/eval/run_eval.py`, `agent/keyboard_agent/agent.py`, `runner.py`, `checker.py`.

## Conventions
EARS: WHEN trigger THE SYSTEM SHALL response. IF condition THEN ...

Terms:
- **Run:** one `run_journey` call for a mode and a variant.
- **Correct run:** the existing `is_correct` rule. `broken` is correct only when verdict is `BLOCKED`, reason is `TARGET_NOT_FOCUSABLE`, and `blocked_element` is `div.pay-btn` with a measured box of width and height above 0. `fixed` is correct only when verdict is `PASSED` with no reason code.
- **Not run:** a run that could not start because of setup (credentials, model access, region). A not-run is never a model failure and never counts toward the gate.
- **Reliable:** at least 4 of 5 correct runs on **both** variants.

---

## REQ-ENV - Configuration

### REQ-ENV-01 Settings
THE SYSTEM SHALL read these from `.env`: `AWS_PROFILE=haunted-audit`, `AWS_REGION=us-east-1`, `BEDROCK_MODEL_ID`, `BEDROCK_TEMPERATURE`, `BEDROCK_MAX_TOKENS`, and the two rate-card values.

### REQ-ENV-02 No secrets in files
THE SYSTEM SHALL keep `.env` out of git. Credentials SHALL come from the AWS profile only. THE SYSTEM SHALL NOT write access keys or session tokens into the repo, `.env`, logs, or reports.

### REQ-ENV-03 Fixed run settings
THE SYSTEM SHALL use step limit 25, timeout 90 seconds and temperature 0.1 (`BEDROCK_TEMPERATURE`) for every LLM run, and SHALL print these values in the report.

### REQ-ENV-04 Stop with exact instructions
WHEN the profile, credentials, region or model access is missing THE SYSTEM SHALL stop before any scored run and print exactly what to enable (see design section 3), with the AWS error code that triggered it.

---

## REQ-PRE - Preflight

### REQ-PRE-01 Credentials
THE SYSTEM SHALL confirm the profile resolves to credentials (`sts:GetCallerIdentity`) and SHALL print the account id and the principal type, never keys.

### REQ-PRE-02 Model access
THE SYSTEM SHALL make one minimal `Converse` call (1 short input, `maxTokens` 5) to the configured model id before the first scored run.
IF the call fails with `AccessDeniedException`, `ResourceNotFoundException`, `ValidationException` (bad model id), or a Marketplace or use-case error THEN THE SYSTEM SHALL stop with the matching instruction and SHALL mark every LLM run "not run".

### REQ-PRE-03 Preflight cost
THE SYSTEM SHALL count the preflight call's tokens and cost in the eval total.

### REQ-PRE-04 Clean tree
THE SYSTEM SHALL record `git rev-parse HEAD`.
IF files under `agent/` or `fixtures/` have uncommitted changes THEN THE SYSTEM SHALL say so in the report (`commit_dirty: true`) and the GO or NO-GO sentence SHALL NOT be used as a final result until the tree is clean.

---

## REQ-RUN - Running

### REQ-RUN-01 Command
THE SYSTEM SHALL run `python -m agent.eval.run_eval --modes llm,scripted --runs 5` and nothing else for the scored result.

### REQ-RUN-02 Coverage
THE SYSTEM SHALL run 5 runs for each of: llm/broken, llm/fixed, scripted/broken, scripted/fixed (20 runs), one at a time.

### REQ-RUN-03 Every run reported
THE SYSTEM SHALL report every run it executed. THE SYSTEM SHALL NOT drop, retry-until-pass, or replace a failed run.
IF a run must be repeated because of a setup fault THEN THE SYSTEM SHALL list the faulted run as "not run" with its reason and report the repeat separately.

### REQ-RUN-04 Cost guard
THE SYSTEM SHALL stop starting new LLM runs when the measured total cost passes `--max-cost-usd` (default 10) and SHALL report the eval as incomplete, not as NO-GO.

---

## REQ-SCORE - Scoring

### REQ-SCORE-01 Rule
THE SYSTEM SHALL apply the existing rule: a mode is reliable only if correct runs are at least 4 of 5 on both variants. Only the deterministic checker's `verdict` and `reason_code` count. THE SYSTEM SHALL NOT use the agent's claim.

### REQ-SCORE-02 Setup errors are not model failures
THE SYSTEM SHALL classify credential, access, throttling and network errors that happen before the agent's first tool call as "not run".
THE SYSTEM SHALL classify errors that happen after the agent started (for example timeout, step limit, a model response error mid-run) as incorrect runs, and SHALL keep the error text.

### REQ-SCORE-03 Incomplete is not NO-GO
IF fewer than 5 LLM runs executed on either variant THEN THE SYSTEM SHALL report "INCOMPLETE" with the reason and SHALL NOT print a GO or NO-GO sentence.

---

## REQ-REC - Per-run record

### REQ-REC-01 Fields
THE SYSTEM SHALL record for each run: `run_id`, `mode`, `variant`, `verdict`, `reason_code`, `correct`, `steps` (number of step events), `latency_ms`, `input_tokens`, `output_tokens`, `total_tokens`, `cost_usd`, `agent_claim`, `agent_claim_mismatch`, `stop_reason`, `error`.

### REQ-REC-02 Scripted baseline
THE SYSTEM SHALL record scripted runs with `0` tokens and `0` cost, not `--`.

### REQ-REC-03 Totals
THE SYSTEM SHALL compute from the recorded runs: correct count per mode and variant, mean and max steps, mean latency, total tokens, total cost (including the preflight), and mismatch count.

### REQ-REC-04 Cost basis
THE SYSTEM SHALL state that cost is measured tokens times the configured rate card and is not the AWS bill.

---

## REQ-OUT - Outputs

### REQ-OUT-01 Artifacts
THE SYSTEM SHALL write `artifacts/eval/results.json` and `artifacts/eval/results.md`. `results.md` SHALL contain one table row per run.

### REQ-OUT-02 Committed summary
THE SYSTEM SHALL write `docs/eval.md` (committed) with: date (UTC), exact commit hash, model id, region, settings (steps, timeout, temperature), the summary table, the per-run table, total cost, and the final sentence.

### REQ-OUT-03 Final sentence
THE SYSTEM SHALL end with the existing GO or NO-GO sentence from `run_eval.py`, filled with the measured counts.

---

## REQ-NOGO - If NO-GO

### REQ-NOGO-01 README
WHEN the result is NO-GO THE SYSTEM SHALL change the README so it names the **scripted walker** as the demo agent and states that LLM mode was scored and failed the gate, with a link to `docs/eval.md`.

### REQ-NOGO-02 Dashboard label
WHEN the result is NO-GO THE SYSTEM SHALL make the dashboard label the default agent "Scripted walker" wherever it names the agent, while still showing `agent_mode`.

### REQ-NOGO-03 Deck notes
WHEN the result is NO-GO THE SYSTEM SHALL add a "Deck notes" section to `docs/eval.md` with replacement wording for the slides that mention the LLM agent. THE SYSTEM SHALL NOT edit the `.pptx` file.

### REQ-NOGO-04 If GO
WHEN the result is GO THE SYSTEM SHALL change no labels and SHALL state the measured counts only.

---

## REQ-TEST - Tests

### REQ-TEST-01 Preflight
THE SYSTEM SHALL have unit tests with a stubbed `boto3` client for: no profile, expired token, access denied, model not found, success.

### REQ-TEST-02 Scoring
THE SYSTEM SHALL have unit tests that setup errors become "not run", mid-run errors become incorrect, and "INCOMPLETE" is reported with fewer than 5 runs.

### REQ-TEST-03 Report
THE SYSTEM SHALL have a unit test that `results.md` has one row per run and that totals equal the sum of the rows.
