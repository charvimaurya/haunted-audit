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

There is no run list, no scan endpoint and no fix endpoint today.

## Request: `POST /runs`

Unknown fields are rejected with `422` (so a `url`, path or selector cannot be sent).

| Field | Type | Default |
|---|---|---|
| `variant` | `"broken"` or `"fixed"` | `"broken"` |
| `mode` | `"llm"` or `"scripted"` | `"scripted"` |
| `max_steps` | int, 1 to 80 | 25 |
| `timeout_seconds` | float, 0 to 300 | 90 |

Refusals: `429` (rate limit, or too many runs at once; has `Retry-After`), `403` (LLM mode is off on the public demo). Both return `{"detail": "<plain sentence>"}`.

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

**BlockedElement**: `selector` (str), `bounding_box` (BoundingBox or `null`), `tag`, `accessible_name`, `text` (each str or `null`).
**BoundingBox**: `x`, `y`, `width`, `height` (floats, CSS pixels in the 1280 x 800 viewport). The ghost is placed only from this.
**FocusSnapshot**: `tag` (str), `role` (str or `null`), `accessible_name` (str), `selector_hint` (str), `bounding_box` (BoundingBox or `null`), `is_visible` (bool).
**StepEvent**: `step` (int), `tool` (str), `args` (object), `focused_before` and `focused_after` (FocusSnapshot or `null`), `timestamp` (str), `screenshot_path` (str or `null`).

## Events: `GET /runs/{run_id}/events`

- Content type `text/event-stream`. Each step is `id: <n>` and `data: <StepEvent JSON>`.
- `Last-Event-ID` resumes after that id.
- Every 15 seconds without an event the server sends the comment `: keep-alive`.
- The stream ends with `event: done` and `data: {"run_id": str, "status": "complete" | "error"}`, or `event: error` and `data: {"error": "run not found"}`.

## Fix: PLANNED, not returned by the API today

No fix endpoint exists. The draft is in `.kiro/specs/fix-verify-prevent/requirements.md` (REQ-LOG-01) and is not approved. Do not build a screen on these fields until an endpoint returns them and this section is updated.

| Field | Type |
|---|---|
| `fix_id`, `run_id` | str |
| `finding` | the run's `reason_code` and `blocked_element` |
| `cause` | str |
| `diff` | str (unified diff) |
| `diff_sha256` | str |
| `changed_lines` | int |
| `status` | `"proposed"`, `"approved"`, `"rejected"` or `"exorcist_failed"` |
| `decided_by`, `decided_at`, `decision_note` | str or `null` |
| `agent_mode` | the original run's mode |
