# Data contract

The shapes the API returns today. Source of truth in code: `agent/keyboard_agent/models.py` and `agent/api/main.py`.
Rules:
- A new or changed field means editing this file in the same pull request.
- A value that was not measured is `null` in the API and `--` with "not yet measured" on screen. Never `0` for "unknown".
- `verdict` and `reason_code` come from the checker only. An agent's own claim is `agent_claim`.
- `target_selector` and `success_selector` are checker config. They never appear in the API or in any agent prompt.

## Endpoints today

| Method and path | Returns |
|---|---|
| `GET /ping`, `GET /health` | `200 {"status": "ok"}` |
| `POST /runs` | `202 {"run_id": str, "status": "running"}` |
| `GET /runs/{run_id}` | A Run record (below). `404 {"detail": "run not found"}` |
| `GET /runs/{run_id}/events` | Server-Sent Events (below). `404` as above |
| `POST /runs/{run_id}/fixes` | `201` Fix. `404`; `409 {detail: {code: RUN_NOT_FINISHED | NOTHING_TO_FIX | UNKNOWN_BARRIER, message}}` |
| `GET /fixes/{fix_id}` | Fix. `404` |
| `POST /fixes/{fix_id}/approve` | Fix. Body `{diff_sha256, note?}`. `422 DIFF_CHANGED`, `409 ALREADY_DECIDED` |
| `POST /fixes/{fix_id}/reject` | Fix. Body `{note?}`. `409 ALREADY_DECIDED` |
| `POST /fixes/{fix_id}/verify` | `202 {run_id, status, voice_run_id}`: a keyboard run, then a voice run, on the patched copy. `409 NOT_APPROVED` |
| `POST /fixes/{fix_id}/regression` | `202 {run_id, status, voice_run_id}`: a keyboard run, then a voice run, on the copy with the bug put back. `409 NOT_VERIFIED` |
| `POST /voice-runs` | `202 {"run_id": str, "status": "running"}`. Read back with `GET /runs/{run_id}` and the same events stream |

There is no run list and no scan endpoint today. Fix endpoints are below ("Fix").

## Request: `POST /runs`

Unknown fields are rejected with `422` (so a `url`, path or selector cannot be sent).

| Field | Type | Default |
|---|---|---|
| `variant` | `"broken"` or `"fixed"` | `"broken"` |
| `mode` | `"llm"` or `"scripted"` | `"scripted"` |
| `max_steps` | int, 1 to 80 | 25 |
| `timeout_seconds` | float, 0 to 300 | 90 |
| `recipient` | str or omitted. Trimmed, 1 to 40 characters, no control or format characters, else `422` | omitted |
| `amount` | str or omitted. The bank's own rule: two decimals (`^(0|[1-9][0-9]*)\.[0-9]{2}$`), more than 0.00, at most 1000.00 (the test balance). Anything else is `422` ("Use two decimals, like 10.00") | omitted |
| `reference` | str or omitted. Trimmed, 0 to 40 characters, same character rule; empty means none | omitted |

These are the tester's made-up test details (spec `.kiro/specs/user-typed-test-details/`). When `recipient` or `amount` is left out, the run uses `INTERNAL_DEFAULT_DETAILS` in `agent/keyboard_agent/models.py` (for tests, eval scripts, the CLI and Night Watch). That default is never put in `test_details` and no screen shows it. Typed values are never logged.

Refusals: `429` (rate limit, or too many runs at once; has `Retry-After`), `403` (LLM mode is off on the public demo). Both return `{"detail": "<plain sentence>"}`.

## Request: `POST /voice-runs`

Unknown fields are rejected with `422`. Same rate limits and refusals as `POST /runs`. Spec: `.kiro/specs/voice-agent/`.

| Field | Type | Default |
|---|---|---|
| `variant` | `"broken"` or `"fixed"` | `"broken"` |
| `commands` | list of str, 1 to 10 items, each 1 to 200 characters | required |
| `input_source` | `"typed"` or `"speech"` | `"typed"` |

A voice run's `JourneyResult` has `agent_kind: "voice"`, `agent_mode: "scripted"` (rules, no model), an empty `focus_trail`, and one `StepEvent` per command:
- `tool` is `voice_click`, `voice_type`, `voice_go_to`, `voice_not_understood` or `voice_error`.
- A sentence with several commands is split first, and a payment phrase is expanded (`plan_commands`, voice-agent REQ-VA-21). Each step's `command` is the part it ran, not the whole sentence; the run's `goal` lists those parts.
- `args` holds `command`, `name`, `outcome` (`"done"`, `"failed"` or `"not_understood"`), a plain-English `message`, and, when measured, `element` `{tag, text, bounding_box}`. `voice_type` also has `text`. A step with a parsed command also has `said` (str), the command in plain English, for example `Click Send Payment`. `voice_not_understood` and `voice_error` have no `name` or `element` (there is no parsed control).
- `verdict` comes from the checker: `PASSED` when the confirmation is visible, otherwise `BLOCKED` with `NO_ACTIVATION` (or `TIMEOUT`).

## Run record: `GET /runs/{run_id}`

| Field | Type | Notes |
|---|---|---|
| `run_id` | str | |
| `variant` | `"broken"` or `"fixed"` | |
| `mode` | `"llm"` or `"scripted"` | the agent mode |
| `status` | `"running"`, `"complete"` or `"error"` | |
| `verdict` | `"PASSED"`, `"BLOCKED"` or `null` | `null` while running |
| `reason_code` | reason code or `null` | |
| `result` | JourneyResult or `null` | `null` while running. If the run crashed, only `{"run_id", "error", "verdict": "BLOCKED"}` |
| `seeded` | bool | `true` for a recorded run loaded from `docs/evidence-seed.json` |
| `recorded_at` | str or `null` | set only for seeded runs |
| `test_details` | `{recipient, amount, reference}` or `null` | what the tester typed; `null` when the request had no details (internal default). A seeded run shows the values typed when it was recorded |

## Finding: the checker's result (JourneyResult)

| Field | Type |
|---|---|
| `run_id` | str |
| `verdict` | `"PASSED"` or `"BLOCKED"` |
| `reason_code` | `"TARGET_NOT_FOCUSABLE"`, `"FOCUS_TRAP"`, `"NO_ACTIVATION"`, `"STEP_LIMIT"`, `"TIMEOUT"` or `null` (null when `PASSED`) |
| `blocked_element` | BlockedElement or `null` |
| `focus_trail` | list of FocusSnapshot |
| `step_events` | list of StepEvent |
| `screenshots` | list of str (file paths on the server) |
| `agent_mode` | `"llm"` or `"scripted"` |
| `tokens` | `{input_tokens, output_tokens, total_tokens}` ints. `0` in scripted mode |
| `latency_ms` | float, measured wall clock |
| `cost_usd` | float. `0.0` in scripted mode |
| `agent_claim` | `"attempted_complete"`, `"blocked"` or `null` |
| `agent_claim_reason` | str or `null` |
| `agent_claim_mismatch` | bool |
| `target_ever_focused` | bool |
| `last_focused_element` | FocusSnapshot or `null` |
| `skipped_element` | FocusSnapshot or `null` |
| `variant` | str |
| `goal` | str |
| `stop_reason` | `"completed"`, `"step_limit"`, `"timeout"` or `"error"` |
| `error` | str or `null` |
| `agent_kind` | `"keyboard"` or `"voice"` (default `"keyboard"`) |
| `input_source` | `"keyboard"`, `"typed"` or `"speech"` (default `"keyboard"`) |

**BlockedElement**: `selector` (str), `bounding_box` (BoundingBox or `null`), `tag`, `accessible_name`, `text` (each str or `null`).
**BoundingBox**: `x`, `y`, `width`, `height` (floats, CSS pixels in the 1280 x 800 viewport). The ghost is placed only from this.
**FocusSnapshot**: `tag` (str), `role` (str or `null`), `accessible_name` (str), `selector_hint` (str), `bounding_box` (BoundingBox or `null`), `is_visible` (bool).
**StepEvent**: `step` (int), `tool` (str), `args` (object), `focused_before` and `focused_after` (FocusSnapshot or `null`), `timestamp` (str), `screenshot_path` (str or `null`).

## Events: `GET /runs/{run_id}/events`

- Content type `text/event-stream`. Each step is `id: <n>` and `data: <StepEvent JSON>`.
- `Last-Event-ID` resumes after that id.
- Every 15 seconds without an event the server sends the comment `: keep-alive`.
- The stream ends with `event: done` and `data: {"run_id": str, "status": "complete" | "error"}`, or `event: error` and `data: {"error": "run not found"}`.

## File finding: `backend/scan_file.py` (not an API endpoint)

Printed by `python3 backend/scan_file.py <path>` and by the scan-on-save hook as `{"file": str, "findings": [File finding]}`. The hook prints nothing when there is no finding. Spec: `.kiro/specs/scan-on-save/`.

| Field | Type | Notes |
|---|---|---|
| `finding_id` | str | `label-` + first 12 hex digits of SHA-256 of `file|line|rule|element`. Stable while the line does not move |
| `source` | `"scan_file"` | |
| `rule` | `"label"` | the only rule today: a form field with no accessible name |
| `wcag` | list of str | `["1.3.1", "3.3.2", "4.1.2"]` |
| `severity` | `"serious"` | |
| `file` | str | repo-relative POSIX path |
| `line` | int | 1-based line of the element |
| `element` | str | `tag#id`, `tag[name=x]` or `tag` |
| `message` | str | one plain sentence with the fix |

A file finding is a static check. It never sets `verdict` or `reason_code`; only the checker does.

## Regression guard: `agent/fixes/regression_guard.py` (not an API endpoint)

Printed by `python -m agent.fixes.regression_guard [--runs N]`. Spec: `.kiro/specs/journey-guard/`. Per run, three
steps (`fix applied`, `fix removed`, `fix restored`), each `PASS` or `FAIL` from the journey test
`tests/journeys/send-payment.spec.ts`, then `GUARD_WORKS` (only PASS, FAIL, PASS with the focus message) or
`GUARD_BROKEN`. Last line: `GUARD_WORKS k of N`, counted from those runs. Exit 0 all work, 1 any broken, 2 not run
(Node or packages missing). The guard result is not a checker verdict and never sets `verdict` or `reason_code`.

## Fix: `GET /fixes/{fix_id}`

Spec: `.kiro/specs/exorcist/`. Approve changes no tracked file; the Verifier and the regression check run on copies under `artifacts/verify/<fix_id>/`. The checker decides both.

| Field | Type |
|---|---|
| `fix_id`, `run_id`, `variant` | str |
| `reason_code`, `blocked_element` | the run's finding (blocked_element as in JourneyResult) |
| `reason` | str (one line) or `null` |
| `diff` | str (canonical unified diff for `fixtures/haunted_bank/index.html`) or `null` |
| `diff_sha256` | str or `null` |
| `changed_lines` | int or `null` |
| `exorcist_mode` | `"scripted"` or `"llm"` |
| `exorcist_model_id` | str or `null` |
| `input_tokens`, `output_tokens` | int; `0` in scripted mode; `null` when not measured |
| `cost_usd` | float; `0.0` in scripted mode; `null` when not measured |
| `latency_ms` | float, measured |
| `status` | `"proposed"`, `"approved"`, `"rejected"` or `"exorcist_failed"` |
| `error` | str or `null` (why it failed) |
| `decided_by`, `decided_at`, `decision_note` | str or `null` |
| `agent_mode` | the original run's mode |
| `created_at` | str (UTC) |
| `verify`, `regression` | `null`, or `{run_id, status, verdict, reason_code, agent_mode, error}`; `verdict` is `null` until the run is `complete` |
| `verify_voice`, `regression_voice` | same shape: the voice-command simulation on the same copy (`VOICE_REPLAY` in `agent/api/main.py`). Spec `.kiro/specs/loop-evidence/` |
| `history` | list of `{at, event, detail}`, append-only. `verify_started` and `regression_started` detail: `{run_id, voice_run_id}` |
