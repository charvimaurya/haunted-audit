# Fix, Verify, Prevent - Requirements

**Steering applied:** `product-rules.md` (verdict authority, no invented metrics, agent mode contract, human approves code changes), `product-ux.md` (real content only).
**Principle:** rules where the answer must be the same every time, AI where judgement helps, a human approves anything that changes code.
**Builds on:** `agent/keyboard_agent/*` (checker, runner), `agent/api/main.py` (runs, SSE), the Haunted Bank fixture.
**Feeds:** `/app/fixes` pages in `.kiro/specs/product-shell-ia`, and the MCP tools in `.kiro/specs/haunted-audit-kiro-integration`.

## Conventions
EARS: WHEN trigger THE SYSTEM SHALL response. IF condition THEN ... WHILE state ...

Terms:
- **Finding:** a completed run whose checker verdict is `BLOCKED` with a barrier reason.
- **Barrier reason:** `TARGET_NOT_FOCUSABLE`, `FOCUS_TRAP` or `NO_ACTIVATION`. `STEP_LIMIT` and `TIMEOUT` mean the run ran out of room; they are **inconclusive**, not barriers.
- **Fix:** one record that follows a finding from proposal to verified test.
- **Copy:** a temporary directory made from `fixtures/haunted_bank`. Patches and re-runs happen on copies only.
- **Live code:** everything in the repository working tree.
- **Actor:** the fixed text `demo user` (no sign-in in the MVP).

Fix status flow: `proposing` -> `proposed` -> `approved` | `rejected`; `approved` -> `verifying` -> `verified` | `failed`. `exorcist_failed` ends a fix that never produced a valid diff.

---

## REQ-IMP - Impact (rules, no AI for the severity)

### REQ-IMP-01 Severity from rules
WHEN a fix is created from a finding THE SYSTEM SHALL set `severity` with plain Python rules from the finding's journey, verdict and reason code. The same input SHALL always give the same severity and the same `rule_id`.

### REQ-IMP-02 Payment rule
IF the journey is a payment journey (catalogue entry `blocks_task = "payment"`) and the verdict is `BLOCKED` with a barrier reason THEN severity SHALL be `critical` with `rule_id = "blocks-payment"`.

### REQ-IMP-03 Inconclusive runs
IF the reason is `STEP_LIMIT` or `TIMEOUT`, or the run has an `error`, THEN THE SYSTEM SHALL set severity `inconclusive`, SHALL NOT create a fix, and SHALL tell the caller why (409 `NOT_A_BARRIER`).

### REQ-IMP-04 WCAG mapping
THE SYSTEM SHALL attach WCAG criteria from a fixed table: `TARGET_NOT_FOCUSABLE` -> 2.1.1 Keyboard and 4.1.2 Name, Role, Value; `FOCUS_TRAP` -> 2.1.2 No Keyboard Trap; `NO_ACTIVATION` -> 2.1.1 Keyboard.

### REQ-IMP-05 AI writes words only
THE SYSTEM SHALL ask Bedrock Claude for a short plain-English explanation of the impact. The model SHALL receive severity, reason and WCAG criteria as fixed facts and SHALL NOT be able to change them. The stored severity SHALL equal the rules' output.
IF Bedrock is unavailable THEN THE SYSTEM SHALL store a fixed template sentence and set `explanation_source = "template"`; otherwise `"llm"`.

### REQ-IMP-06 Journey identity
THE SYSTEM SHALL carry a `journey_id` on every run result (default `send-payment`) so rules never parse goal text.

---

## REQ-EXO - Exorcist (Bedrock Claude via Strands)

### REQ-EXO-01 Inputs
WHEN a fix is created THE SYSTEM SHALL give the Exorcist: the page HTML of the file under test (read-only), and a trimmed JourneyResult (verdict, reason code, journey id, variant, blocked element tag, text, accessible name, selector and box, and the focus trail identities).

### REQ-EXO-02 Output
THE SYSTEM SHALL require from the Exorcist exactly: a plain-English `cause` (at most 3 sentences) and a `diff` in unified diff format, the smallest change that lets a keyboard user complete the journey.

### REQ-EXO-03 No powers
THE SYSTEM SHALL run the Exorcist as a Strands agent with **no tools**. The Exorcist SHALL NOT write to the repository, run commands, or read any file other than the one given in its prompt.

### REQ-EXO-04 Validation
THE SYSTEM SHALL validate the diff before storing it. It SHALL be accepted only if all are true: it parses as a unified diff; every file path is a relative path inside `fixtures/haunted_bank/`; files are modified (no creates, deletes, renames or binary); every hunk's context and removed lines match the file exactly once; total changed lines (added plus removed) are at most `HAUNTED_AUDIT_MAX_DIFF_LINES` (default 20).
THE SYSTEM SHALL ignore the model's hunk line numbers, locate hunks by exact context, and store a canonical diff with correct headers.

### REQ-EXO-05 Retry
IF validation fails THEN THE SYSTEM SHALL send the validation error back to the Exorcist and retry at most 2 times. IF it still fails THEN the fix SHALL end as `exorcist_failed` with the last validation error and the raw output stored.

### REQ-EXO-06 Untrusted page content
THE SYSTEM SHALL treat the page HTML as untrusted. THE SYSTEM SHALL NOT act on any instruction found in it; only the validated diff leaves the Exorcist step, and nothing is applied before approval.

### REQ-EXO-07 Real usage
THE SYSTEM SHALL store the Exorcist's measured input tokens, output tokens, cost and latency. Credentials missing SHALL end the fix as `exorcist_failed` with the AWS error, and SHALL NOT produce a diff by any other means.

---

## REQ-APR - Human approval

### REQ-APR-01 Endpoints
THE SYSTEM SHALL provide `POST /fixes/{id}/approve` and `POST /fixes/{id}/reject`.

### REQ-APR-02 Bound to the diff seen
THE SYSTEM SHALL require `diff_sha256` in the approve request and SHALL reject with 422 `DIFF_CHANGED` if it does not equal the hash of the stored diff.

### REQ-APR-03 Who and when
THE SYSTEM SHALL store `decided_by = "demo user"` (configurable by `HAUNTED_AUDIT_ACTOR`) and `decided_at` (UTC) on approve and on reject, plus an optional note.

### REQ-APR-04 One decision
THE SYSTEM SHALL accept a decision only while status is `proposed`. Otherwise it SHALL return 409 `ALREADY_DECIDED` with the current status.

### REQ-APR-05 Nothing without approval
THE SYSTEM SHALL NOT verify, generate a test, create a branch, or apply a patch anywhere unless status is `approved`. There SHALL be no automatic approval path.

### REQ-APR-06 Reject ends the fix
WHEN a fix is rejected THE SYSTEM SHALL keep the record (for the evidence log) and SHALL allow `POST /runs/{id}/exorcise` to create a new fix for the same run.

---

## REQ-VER - Verifier (deterministic)

### REQ-VER-01 Copies only
WHEN `POST /fixes/{id}/verify` is called on an approved fix THE SYSTEM SHALL copy `fixtures/haunted_bank` to a new temporary directory, apply the approved patch to the **copy**, and re-run the same journey (same journey id, variant, recipient, amount, step limit and timeout) against the copy.
THE SYSTEM SHALL NOT write to any path outside the temporary directory and the evidence store.

### REQ-VER-02 Before and after
THE SYSTEM SHALL run the journey first on an **unpatched** copy (before) and then on the patched copy (after), both with the scripted walker, and store both run ids and verdicts. These are fresh runs; the original finding's verdict is not reused as "before".

### REQ-VER-03 Strict patch application
THE SYSTEM SHALL apply patches with its own exact matcher (no fuzz, no shelling out to `patch`) and SHALL leave no partial result: either all hunks apply or none do.

### REQ-VER-04 Clear results
THE SYSTEM SHALL end verification with exactly one `verify_result`:
- `VERIFIED`: before is `BLOCKED` with a barrier reason, after is `PASSED`.
- `STILL_BLOCKED`: the patch applied but after is not `PASSED` (store the after reason code).
- `PATCH_DOES_NOT_APPLY`: a hunk does not match (store which).
- `PATCH_INVALID`: the diff fails validation (REQ-EXO-04).
- `NOT_REPRODUCED`: before is not `BLOCKED`, so no fix can be claimed.
- `RUN_ERROR`: a run raised an error (store it).
`VERIFIED` sets status `verified`; every other result sets status `failed`.

### REQ-VER-05 Verdict authority
THE SYSTEM SHALL take every verdict and reason code from the checker. THE SYSTEM SHALL NOT use any model output to decide `VERIFIED`.

### REQ-VER-06 Cleanup
THE SYSTEM SHALL delete the temporary directory after verification, success or failure.

### REQ-VER-07 Live code untouched
THE SYSTEM SHALL leave the repository working tree byte-identical before and after verification.

---

## REQ-GEN - Journey test generator

### REQ-GEN-01 When
WHEN a fix becomes `verified` THE SYSTEM SHALL generate a Playwright test from the fix record by a fixed template (no AI). The same record SHALL always give the same file bytes.

### REQ-GEN-02 What the test does
THE SYSTEM SHALL generate `tests/journeys/send_payment.spec.ts` that uses only the keyboard: Tab until the element with id `send-payment` has focus (at most 25 Tab presses), type the recipient and amount into their fields, press Enter, and expect `[data-testid="payment-confirmation"]` to be visible. It SHALL fail if `send-payment` is never focused or the confirmation never appears.

### REQ-GEN-03 Target URL
THE SYSTEM SHALL let the test read the page under test from `HAUNTED_BANK_URL` (default: the repository fixture file) and the variant from `HAUNTED_BANK_VARIANT` (default: the fix's variant), so the Verifier and the regression guard can point it at copies.

### REQ-GEN-04 Branch, not main
THE SYSTEM SHALL write the file on a new git branch `haunted-audit/fix-{short_id}` created from the current HEAD in a separate git worktree. The branch SHALL contain two commits: the approved patch, and the generated test. THE SYSTEM SHALL NOT push, merge, rebase, or change the checked-out branch or working tree.
WHERE `HAUNTED_AUDIT_TEST_BRANCHES=off` THE SYSTEM SHALL write the file to `artifacts/fixes/{id}/send_payment.spec.ts` only.

### REQ-GEN-05 Existing file
IF `tests/journeys/send_payment.spec.ts` already exists at HEAD with different content THEN THE SYSTEM SHALL NOT overwrite it and SHALL return `TEST_FILE_EXISTS` for a human to resolve.

### REQ-GEN-06 Proven before reported
THE SYSTEM SHALL run the generated test once against the unpatched copy (must fail) and once against the patched copy (must pass) before storing `test_proven = true`.

---

## REQ-REG - Regression guard

### REQ-REG-01 Script
THE SYSTEM SHALL provide a script and `POST /regression/demo` that: (1) applies the approved patch to a copy and runs the generated test (expect PASS), (2) reintroduces the bug by reverse-applying the same patch on that copy (the button goes back to `div.pay-btn`) and runs the test (expect FAIL), (3) restores the fix and runs the test again (expect PASS).

### REQ-REG-02 Real fix only
THE SYSTEM SHALL use a `verified` fix with a generated test. WHEN `fix_id` is omitted it SHALL use the most recent such fix. IF none exists THEN it SHALL return 409 `NO_VERIFIED_FIX` and run nothing.

### REQ-REG-03 Result
THE SYSTEM SHALL report `GUARD_WORKS` only when the three results are PASS, FAIL, PASS in that order. Any other order SHALL be `GUARD_BROKEN` with the three real results and the test output.

### REQ-REG-04 Copies only
THE SYSTEM SHALL do all steps on a temporary copy and SHALL NOT touch live code.

### REQ-REG-05 Recorded
THE SYSTEM SHALL store the three results, their test output (truncated at 20 kB each) and the time on the fix's evidence row.

---

## REQ-LOG - Evidence log

### REQ-LOG-01 One row per fix
THE SYSTEM SHALL store one row per fix in SQLite (table `fixes`) with: `fix_id`, `run_id`, `journey_id`, `variant`, `finding` (reason code, blocked element JSON, WCAG), `severity`, `severity_rule_id`, `impact_explanation`, `explanation_source`, `cause`, `diff`, `diff_sha256`, `changed_lines`, `exorcist_mode`, `exorcist_model_id`, exorcist tokens and cost and latency, `status`, `decided_by`, `decided_at`, `decision_note`, `before_run_id`, `before_verdict`, `before_reason`, `after_run_id`, `after_verdict`, `after_reason`, `verify_result`, `agent_mode` (of the original run), `test_file_path`, `test_branch`, `test_proven`, the three regression results, and `created_at` / `updated_at`.

### REQ-LOG-02 Append only history
THE SYSTEM SHALL record each status change as an event row (fix id, from, to, time, detail). THE SYSTEM SHALL NOT delete fix rows.

### REQ-LOG-03 Real numbers
Every number returned or shown (steps, latency, tokens, cost, counts) SHALL come from a stored real run or call. A value not yet measured SHALL be `null` in the API.

---

## REQ-API - API and progress

### REQ-API-01 Endpoints
THE SYSTEM SHALL provide:
- `POST /runs/{id}/exorcise` -> 202 `{fix_id}`; 404 unknown run; 409 `RUN_NOT_COMPLETE`, `NOT_A_BARRIER`, or `FIX_EXISTS` (with the existing fix id).
- `GET /fixes` (filters `status`, `run_id`; `limit`, `offset`) and `GET /fixes/{id}`.
- `POST /fixes/{id}/approve`, `POST /fixes/{id}/reject`.
- `POST /fixes/{id}/verify` -> 202; 409 `NOT_APPROVED`.
- `POST /regression/demo` -> 202 `{fix_id}`.
- `GET /fixes/{id}/events` (SSE).

### REQ-API-02 Progress over SSE
THE SYSTEM SHALL stream progress on the existing SSE mechanism: `impact`, `exorcist_started`, `diff_validated` (or `diff_invalid`), `awaiting_approval`, `approved` / `rejected`, `verify_before_started` / `verify_before_done`, `verify_after_started` / `verify_after_done`, `verify_result`, `test_generated`, `test_proven`, `regression_step`, `done`. Run-level events remain on `/runs/{id}/events`; fix events reference the before and after run ids.

### REQ-API-03 Errors
THE SYSTEM SHALL return errors as `{ "error": { "code": "...", "message": "..." } }`, never stack traces.

### REQ-API-04 Async work
THE SYSTEM SHALL do exorcise, verify and regression work on background threads like `POST /runs`, and SHALL allow only one verification or regression job at a time (409 `BUSY` otherwise).

### REQ-API-05 Contract with the web app
THE SYSTEM SHALL use `approve` and `reject` instead of the single `decision` endpoint named in `.kiro/specs/product-shell-ia`; that spec's contract table is updated to match.

---

## REQ-TEST - Tests (pytest + Hypothesis)

### REQ-TEST-01 Severity
Property tests: for any generated BLOCKED JourneyResult with a barrier reason on a payment journey, severity is `critical`, repeated calls give identical output, and PASSED results or `STEP_LIMIT` / `TIMEOUT` never get `critical`.

### REQ-TEST-02 Diff handling
Property tests: valid diff -> canonical form -> parse is stable; apply then reverse-apply restores the original bytes; any path with `..`, an absolute path, a create, delete or rename is rejected; a diff over the line limit is rejected; a diff whose context matches zero or two places is rejected.

### REQ-TEST-03 Bad patch
A patch that applies but does not fix the bug (for example it edits a comment) SHALL produce `STILL_BLOCKED`, not `VERIFIED`. A patch that does not apply SHALL produce `PATCH_DOES_NOT_APPLY`.

### REQ-TEST-04 Generated test
Integration test: the generated test fails on the unpatched fixture with variant `broken`, passes on the unpatched fixture with variant `fixed`, and passes on a copy patched with the approved fix.

### REQ-TEST-05 Live code
A test SHALL hash the fixture directory and the git working tree status before and after verify and regression, and assert no change.

### REQ-TEST-06 Approval gate
Tests SHALL prove: verify before approve returns 409; approve with a wrong `diff_sha256` returns 422; a second decision returns 409; a rejected fix cannot be verified.

### REQ-TEST-07 Exorcist without AWS
Unit tests with a stubbed Strands agent: invalid output retries twice then `exorcist_failed`; no tools are registered; missing credentials end as `exorcist_failed` with no diff.

### REQ-TEST-08 Regression guard
Integration test: `GUARD_WORKS` for the real verified fix; `GUARD_BROKEN` when the test file is replaced with one that always passes.
