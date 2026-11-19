# LLM agent eval - Design

## 1. What exists today (read from the code)

| Area | Today | Gap for this goal |
|---|---|---|
| Run loop | `_run_batch` runs `--runs` journeys per mode and variant, sequentially | none |
| Rule | `is_correct` and `_summarize` (`reliable` needs 5 runs and at least 4 correct) | none |
| Credentials | `_llm_preflight` calls `_require_boto_session`, which only checks that a credential exists | does not check the profile resolves, or model access |
| Setup errors | only messages containing "credentials are not configured" or "unable to locate credentials" become "not run" | `AccessDeniedException` or a bad model id would be scored as incorrect runs, producing a false NO-GO |
| Report | `results.md` has a summary table (averages) only | no per-run rows, no total cost, no commit hash, no date |
| Cost | `cost_usd` per run from tokens times `.env` rates | no total, no guard |
| Profile | `boto3.Session(region_name=...)` | `AWS_PROFILE` in the environment works, but is not named in errors |

This is why the spec starts with preflight and reporting changes, before any scored run.

## 2. Changes (small, in `agent/eval/`)

1. `preflight.py`
   - `check_credentials(profile, region)` -> `sts.get_caller_identity()`; returns account id and principal type.
   - `check_model_access(profile, region, model_id)` -> one `bedrock-runtime.converse` call, `maxTokens=5`; returns usage tokens.
   - Both raise `PreflightError(code, instruction)` with a fixed instruction text per case (section 3).
2. `run_eval.py`
   - Call preflight once when `llm` is in `--modes`. On `PreflightError`: print the instruction, write `results.md` with status `NOT RUN`, exit code 2. No scored runs.
   - `--max-cost-usd` (default 10): checked between LLM runs.
   - Classify errors: an error raised before the first step event is `not_run` (new field `setup_error`); after the first step event it is an ordinary incorrect run.
   - Add `commit`, `commit_dirty`, `generated_at`, `model_id`, `region`, `settings` to `results.json`.
   - Write per-run rows to `results.md`.
   - Final status: `GO`, `NO-GO`, or `INCOMPLETE`. `INCOMPLETE` prints no GO or NO-GO sentence.
3. `docs/eval.md` writer: `python -m agent.eval.publish` reads `artifacts/eval/results.json` and writes `docs/eval.md`. It refuses to run when status is `NOT RUN` or `INCOMPLETE`, or when `commit_dirty` is true.

## 3. Setup stop messages

| Failure | Detected by | Message tells you to |
|---|---|---|
| Profile missing | `ProfileNotFound` | Create profile `haunted-audit` in `~/.aws/config` (SSO: `aws configure sso --profile haunted-audit`, then `aws sso login --profile haunted-audit`; or access keys: `aws configure --profile haunted-audit`, region `us-east-1`) |
| Token expired | `ExpiredToken`, `UnauthorizedSSOTokenError` | `aws sso login --profile haunted-audit` |
| No invoke permission | `AccessDeniedException` on `Converse` | Attach an IAM policy allowing `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream` on the inference profile and the foundation model in `us-east-1`, `us-east-2`, `us-west-2` (the US cross-region profile routes across them) |
| Marketplace | message mentions AWS Marketplace | Let the identity create the Marketplace subscription on first call (`aws-marketplace:ViewSubscriptions`, `aws-marketplace:Subscribe`), or have an administrator invoke the model once in the console to activate it |
| Anthropic use case | message mentions use case details | In the Bedrock console (us-east-1) submit the Anthropic first-time use case form, then wait for access to show as granted |
| Bad model id | `ValidationException` or `ResourceNotFoundException` | Confirm `BEDROCK_MODEL_ID` in the model catalog or `aws bedrock list-inference-profiles --region us-east-1` |
| Throttled | `ThrottlingException` during preflight | Retry later; do not score |

Message text is final copy for the tests; it names the AWS error code it reacted to.

## 4. Per-run record and report

`results.json` run object:

```json
{ "run_id": "...", "mode": "llm", "variant": "broken",
  "verdict": "BLOCKED", "reason_code": "TARGET_NOT_FOCUSABLE", "correct": true,
  "steps": 18, "latency_ms": 41230.1,
  "input_tokens": 0, "output_tokens": 0, "total_tokens": 0, "cost_usd": 0.0,
  "agent_claim": "blocked", "agent_claim_mismatch": false,
  "stop_reason": "completed", "error": null, "setup_error": null }
```

`results.md` / `docs/eval.md` sections: header (date, commit, dirty flag, model, region, settings), summary (mode, variant, correct of 5, reliable, mean steps, mean latency, tokens, cost, mismatches), per-run table, totals, cost basis note, final status and sentence.

## 5. Commit hash and date
`git rev-parse HEAD` and `git status --porcelain -- agent fixtures`. The hash in `docs/eval.md` is the commit the code was run at. Because `docs/eval.md` is committed afterwards, it records "run at commit X", not its own hash.

## 6. Cost
Total cost = preflight + sum of run `cost_usd`. Source: tokens counted by Strands (`result.metrics.accumulated_usage`), times the rate card in `.env`. The default 3 and 15 USD per million tokens is the published rate for Claude Sonnet models, and reports say Sonnet 4.6 kept that price; confirm on the AWS Bedrock pricing page when you quote the figure. It is not the invoice. The invoice appears in Cost Explorer after about a day.

## 7. NO-GO edits (only after a complete, clean result)
- `README.md`: the sentence that names the demo agent, and the Eval section, say "scripted walker" and link to `docs/eval.md`.
- Dashboard: components that name the agent ("Keyboard Agent", run controls default) show "Scripted walker" for `agent_mode = scripted`; `agent_mode` badge unchanged. Tests updated.
- `docs/eval.md` gets a "Deck notes" section with replacement slide text.

## 8. Risks
| Risk | Mitigation |
|---|---|
| Missing access scored as a model failure | Preflight plus setup-error classification (REQ-PRE, REQ-SCORE-02) |
| Model id unverified (`us.anthropic.claude-sonnet-4-6`) | The preflight call proves it; error text tells you what to change |
| Cost surprise | `--max-cost-usd`, hard step limit 25, `BEDROCK_MAX_TOKENS` 1024 |
| Cherry-picking | Every run reported; repeats listed separately (REQ-RUN-03) |
| Run on uncommitted code | Dirty flag; publish refuses |
