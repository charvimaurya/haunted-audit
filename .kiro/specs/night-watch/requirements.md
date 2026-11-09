# Night Watch — Requirements

**Spec version:** 1.0  
**Steering:** `.kiro/steering/product-rules.md`  
**Companion specs:** `.kiro/specs/haunted-audit-kiro-integration/`

---

## Conventions

Acceptance criteria use EARS notation:

- **WHEN** \<trigger\> **THE SYSTEM SHALL** \<behaviour\>
- **WHILE** \<state\> **THE SYSTEM SHALL** \<behaviour\>
- **IF** \<condition\> **THEN THE SYSTEM SHALL** \<behaviour\>
- **THE SYSTEM SHALL** \<unconditional behaviour\>

### Cross-cutting invariants (from `product-rules.md`)

These apply to every requirement below and are not repeated per section:

- **Verdict authority:** The deterministic checker decides every `verdict` and `reason_code`. No AI component, no Crew agent, no reporting code overrides or fabricates these values. The nightly script reads verdicts from the API; it never computes them.
- **No invented metrics:** Any value not yet measured renders as `--` or is omitted. Empty history shows "No runs yet", never placeholder rows.
- **`agent_mode` always present:** Every evidence log row and every history API response includes `agent_mode`.
- **No auto-mutation:** No component opens a PR, modifies source files, or pushes commits. Regressions are reported; fixes require human action.
- **Budget guard:** The Crew agent step (regression summary) only runs when at least one regression is detected. If all journeys pass, no agent session is created and no Bedrock tokens are spent.

---

## REQ-SCRIPT — Nightly Run Script (`night_watch/run_journeys.py`)

### REQ-SCRIPT-01 · Journeys executed

**THE SYSTEM SHALL** run the Send Payment journey against the demo bank (`/bank`) in this fixed order:
1. `send-payment` / `variant=broken` / `mode=scripted`
2. `send-payment` / `variant=fixed` / `mode=scripted`
3. `send-payment` / `variant=broken` / `mode=llm` (skipped if AWS credentials absent)
4. `send-payment` / `variant=fixed` / `mode=llm` (skipped if AWS credentials absent)

**THE SYSTEM SHALL** run journeys sequentially, not concurrently, to avoid port conflicts or browser resource contention.

**THE SYSTEM SHALL** treat Send Payment as the primary journey. Additional journeys may be added in future by extending the `JOURNEY_MANIFEST` list in the script.

### REQ-SCRIPT-02 · Pass/fail determination

**THE SYSTEM SHALL** determine pass/fail from the `verdict` field of `JourneyResult` returned by `GET /runs/{id}`. No other field is used for pass/fail.

**THE SYSTEM SHALL** classify a run as a **regression** only when:
- `variant == "fixed"` AND `verdict == "BLOCKED"` (a journey that should pass is now failing)
- OR `variant == "broken"` AND `verdict == "PASSED"` (the barrier we deliberately planted is now absent)

**THE SYSTEM SHALL NEVER** classify an `llm`-mode run as a regression if AWS credentials were absent (`run.error` contains the credential error string). Unexecuted runs are recorded as `skipped`, not regressions.

**THE SYSTEM SHALL** classify a run as an **infrastructure failure** when the FastAPI backend is unreachable (connection refused, DNS failure, or HTTP 5xx on `POST /runs` or `GET /runs/{id}`). Infrastructure failures are distinct from regressions in the evidence log.

### REQ-SCRIPT-03 · JSON summary output

**THE SYSTEM SHALL** print to stdout a single JSON object on exit:

```json
{
  "night_watch_at": "ISO-8601 UTC timestamp",
  "runs": [
    {
      "journey_id":   "send-payment",
      "variant":      "broken|fixed",
      "agent_mode":   "scripted|llm",
      "run_id":       "uuid|null",
      "verdict":      "PASSED|BLOCKED|null",
      "reason_code":  "string|null",
      "status":       "pass|fail|regression|skipped|infra_failure",
      "latency_ms":   "number|null",
      "tokens":       { "input": 0, "output": 0, "total": 0 },
      "cost_usd":     "number|null",
      "error":        "string|null"
    }
  ],
  "regressions":  "integer — count of regression-status runs",
  "failures":     "integer — count of fail + infra_failure status runs",
  "skipped":      "integer — count of skipped runs",
  "exit_code":    "0|1"
}
```

**THE SYSTEM SHALL** exit with code `1` if `regressions > 0`. Exit `0` otherwise (including when only infrastructure failures or skipped runs occurred).

**THE SYSTEM SHALL** produce identical output structure regardless of whether runs pass, fail, regress, or are skipped, so downstream consumers can parse it unconditionally.

### REQ-SCRIPT-04 · Dry-run mode

**THE SYSTEM SHALL** support a `--dry-run` flag. In dry-run mode:
- No `POST /runs` calls are made.
- No evidence log writes occur.
- The script prints a JSON summary with `status: "skipped"` for every run.
- The script exits 0.

**WHEN** `--dry-run` is active **THE SYSTEM SHALL** print `"dry_run": true` in the summary JSON.

### REQ-SCRIPT-05 · Idempotency

**THE SYSTEM SHALL** be idempotent: running the script twice in the same UTC day does not duplicate evidence log rows. Before inserting a row, the script checks for an existing row with the same `(run_date, journey_id, variant, agent_mode)` tuple and skips the insert if found.

**THE SYSTEM SHALL** use the current UTC date (`datetime.now(timezone.utc).date().isoformat()`) as `run_date`, not a local timezone date.

### REQ-SCRIPT-06 · Backend-down handling

**WHEN** the FastAPI backend is unreachable **THE SYSTEM SHALL**:
1. Record one `infra_failure` entry per planned journey (not per HTTP call).
2. Set `error` to a short human-readable string: `"Backend unreachable: {exception_class}: {message}"`.
3. Print the JSON summary with all runs having `status: "infra_failure"`.
4. Exit `0` (infrastructure failures are not regressions and must not page the on-call).

**THE SYSTEM SHALL** write infrastructure failure rows to the evidence log so the history table shows the outage.

### REQ-SCRIPT-07 · LLM credential handling

**THE SYSTEM SHALL** attempt to detect AWS credentials before starting any `llm`-mode run by calling the same `_require_boto_session` check used in `agent/keyboard_agent/agent.py`.

**WHEN** credentials are absent **THE SYSTEM SHALL** record `status: "skipped"` with `error: "AWS credentials not configured"` for every `llm`-mode run and proceed to the next journey.

**THE SYSTEM SHALL** log a single credential-missing warning to `stderr` before the first skipped `llm` run, not once per journey.

---

## REQ-LOG — Evidence Log

### REQ-LOG-01 · Schema

**THE SYSTEM SHALL** maintain a `night_watch` table in the existing SQLite database at `HAUNTED_AUDIT_DB` (default `data/runs.db`). The schema:

```sql
CREATE TABLE IF NOT EXISTS night_watch (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    run_date      TEXT NOT NULL,          -- UTC date: YYYY-MM-DD
    run_id        TEXT,                   -- FastAPI run UUID, null for skipped/infra
    journey_id    TEXT NOT NULL,          -- e.g. "send-payment"
    variant       TEXT NOT NULL,          -- "broken" | "fixed"
    agent_mode    TEXT NOT NULL,          -- "scripted" | "llm"
    verdict       TEXT,                   -- "PASSED" | "BLOCKED" | null
    reason_code   TEXT,                   -- nullable
    status        TEXT NOT NULL,          -- "pass" | "fail" | "regression" | "skipped" | "infra_failure"
    input_tokens  INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens  INTEGER NOT NULL DEFAULT 0,
    cost_usd      REAL NOT NULL DEFAULT 0.0,
    latency_ms    REAL,                   -- null for skipped/infra
    error_message TEXT,                   -- null unless status is skipped/infra_failure/fail
    created_at    TEXT NOT NULL           -- ISO-8601 UTC timestamp of the write
);
CREATE INDEX IF NOT EXISTS ix_night_watch_date ON night_watch(run_date);
```

**THE SYSTEM SHALL** create the table (and index) on first write if it does not exist, without dropping or modifying existing tables. This is a non-destructive `CREATE TABLE IF NOT EXISTS` only.

**THE SYSTEM SHALL** never delete rows from `night_watch`. The log is append-only.

### REQ-LOG-02 · Write timing

**THE SYSTEM SHALL** write each row immediately after its journey completes (or is determined skipped/infra), not in a batch at the end. If the script crashes mid-run, rows for completed journeys are still persisted.

### REQ-LOG-03 · Token and cost fields

**THE SYSTEM SHALL** record `input_tokens`, `output_tokens`, `total_tokens`, and `cost_usd` from `JourneyResult.tokens` and `JourneyResult.cost_usd`.

**THE SYSTEM SHALL** record `0` for all token fields when `agent_mode == "scripted"` (as per product-rules.md §Agent Mode Contract). It NEVER records `null` for token fields.

---

## REQ-API — Backend Endpoint (`GET /night-watch/history`)

### REQ-API-01 · Endpoint definition

**THE SYSTEM SHALL** add `GET /night-watch/history` to the FastAPI application in `agent/api/main.py`.

**Response schema:**
```json
{
  "rows": [
    {
      "id":           "integer",
      "run_date":     "YYYY-MM-DD",
      "run_id":       "string|null",
      "journey_id":   "string",
      "variant":      "string",
      "agent_mode":   "string",
      "verdict":      "string|null",
      "reason_code":  "string|null",
      "status":       "string",
      "input_tokens": "integer",
      "output_tokens": "integer",
      "total_tokens": "integer",
      "cost_usd":     "number",
      "latency_ms":   "number|null",
      "error_message": "string|null",
      "created_at":   "string"
    }
  ],
  "count": "integer"
}
```

### REQ-API-02 · Query parameters

**THE SYSTEM SHALL** support these optional query parameters:
- `limit` (integer, default 100, max 500): number of rows to return.
- `offset` (integer, default 0): pagination offset.
- `status` (string): filter by status value.
- `journey_id` (string): filter by journey.
- `since` (string, YYYY-MM-DD): return only rows with `run_date >= since`.

### REQ-API-03 · Ordering

**THE SYSTEM SHALL** return rows ordered by `run_date DESC`, `id DESC` (newest first).

### REQ-API-04 · Empty history

**WHEN** the `night_watch` table is empty or no rows match the filters **THE SYSTEM SHALL** return `{ "rows": [], "count": 0 }`. It NEVER returns fabricated rows.

---

## REQ-UI — Reports Page Night Watch Section

### REQ-UI-01 · History table

**THE SYSTEM SHALL** add a "Night Watch" section to the Reports page (`/reports`) that displays the history table fetched from `GET /night-watch/history`.

**THE SYSTEM SHALL** render the table with these columns: Date, Journey, Variant, Mode, Verdict, Status, Steps / Tokens, Cost, Latency.

**THE SYSTEM SHALL** render `agent_mode` as a badge next to every row's Mode cell (consistent with product-rules.md §Metrics and Rendering).

### REQ-UI-02 · Status colours and icons

**THE SYSTEM SHALL** render each status with an icon AND a text label (never colour alone, WCAG 1.4.1):
- `pass` — green check icon, "Pass"
- `regression` — red × icon, "Regression"
- `fail` — red × icon, "Fail"
- `skipped` — grey dash icon, "Skipped"
- `infra_failure` — amber ⚠ icon, "Infra failure"

### REQ-UI-03 · Empty state

**WHEN** `count === 0` **THE SYSTEM SHALL** render "No runs yet" inside the table area. No placeholder rows, no skeleton rows with fake data.

### REQ-UI-04 · Loading and error states

**WHILE** the history fetch is in flight **THE SYSTEM SHALL** render a skeleton matching the table shape.

**WHEN** `GET /night-watch/history` returns a non-200 response **THE SYSTEM SHALL** render an error state with the HTTP status code and a "Retry" button.

### REQ-UI-05 · Accessibility

**THE SYSTEM SHALL** render the history table as a semantic `<table>` with `<thead>` and `<tbody>`, a `<caption>` of "Night Watch run history", and `scope="col"` on every `<th>`.

**THE SYSTEM SHALL** pass axe-core WCAG 2.1 AA scan with zero violations on the Reports page.

---

## REQ-CREW — Kiro Crew Registration

### REQ-CREW-01 · Cron job

**THE SYSTEM SHALL** register a Kiro Crew cron job named `night-watch` that fires daily at 02:00 UTC (`0 2 * * *`).

**THE SYSTEM SHALL** declare the cron job inside the Night Watch Kiro Crew App manifest (`night_watch/app.json`) so the schedule is version-controlled and reproducible.

**THE SYSTEM SHALL** define the cron job's prompt as:
> "Run the Night Watch nightly journey check: execute `python night_watch/run_journeys.py` in the workspace, capture its JSON output, and if `regressions > 0`, activate the regression-summary agent with the JSON as input."

### REQ-CREW-02 · Budget guard in prompt

**THE SYSTEM SHALL** include in the cron prompt: "If `regressions == 0`, do not activate the regression-summary agent. Exit immediately after logging the summary. Only spend agent tokens when a regression is detected."

### REQ-CREW-03 · No auto-mutation

**THE SYSTEM SHALL** include in the cron prompt: "Do not open pull requests, do not modify source files, do not push commits. Report only."

---

## REQ-AGENT — Regression Summary Agent

### REQ-AGENT-01 · Trigger condition

**THE SYSTEM SHALL** define the regression summary agent in `night_watch/report_agent/prompt.md`.

**THE SYSTEM SHALL** activate the agent only when `regressions > 0` in the JSON summary from `run_journeys.py`.

### REQ-AGENT-02 · Report content

**THE SYSTEM SHALL** instruct the agent to write a plain-English report containing:
1. Which journey regressed (journey_id, variant, agent_mode).
2. The blocked element: `blocked_element.selector`, `blocked_element.tag`, `blocked_element.accessible_name`.
3. The reason code and its meaning in plain English (not a code dump).
4. The diff between the current state and the last green run — the agent should check `git log` and `git diff` for changes since the last `pass` row in the evidence log for this journey.
5. Which regression test (if any from `list_regression_tests`) has a `last_result == "BLOCKED"`.
6. A one-paragraph summary suitable for a Slack message.

### REQ-AGENT-03 · Constraints in the prompt

**THE SYSTEM SHALL** include these constraints verbatim in `prompt.md`:
- "The checker, not you, decided the verdict. Do not second-guess or re-evaluate the verdict."
- "Do not modify source files. Do not open pull requests. Do not run fix tools."
- "If `blocked_element` is null, state that the element data was unavailable and describe what `reason_code` indicates."
- "Every fact in this report comes from the JSON input. Do not invent blocked element names, selectors, or WCAG criteria."

### REQ-AGENT-04 · Output format

**THE SYSTEM SHALL** instruct the agent to produce a Markdown report saved to `data/night_watch_reports/YYYY-MM-DD.md`, appending if the file already exists.

**THE SYSTEM SHALL** include "Built with Kiro" as plain text at the end of every report.

---

## REQ-DOCKER — Always-On Option

### REQ-DOCKER-01 · Documentation

**THE SYSTEM SHALL** include a "Running 24/7 with Docker" section in `night_watch/README.md` that describes:
1. Using the official Kiro Crew Docker image (`ghcr.io/kirodotdev/kirocrew:stable`) so nightly runs are not missed when the laptop is off.
2. Mounting the workspace directory into the container so `run_journeys.py` can reach the project files and SQLite database.
3. Mounting a `kirocrew-home` volume for persistent Crew state (memory, cron registrations).
4. The exact `docker run` command with `--name`, `-p`, `-v` flags.
5. A note that the FastAPI backend must also be accessible from within the container (either run inside the same Docker network or expose it on a non-loopback address).

---

## REQ-TEST — Tests

### REQ-TEST-01 · Unit tests for `run_journeys.py`

**THE SYSTEM SHALL** have unit tests in `night_watch/tests/test_run_journeys.py` that mock all HTTP calls and database writes. Tests cover:
- Happy path: two scripted runs pass → summary has `regressions: 0`, `exit_code: 0`.
- Regression detected: fixed variant returns BLOCKED → summary has `regressions: 1`, `exit_code: 1`.
- Infrastructure failure: all HTTP calls raise `ConnectionError` → all statuses are `infra_failure`, `exit_code: 0`.
- Dry-run mode: no HTTP calls made, no DB writes, exit 0.
- Idempotency: calling `_write_evidence_row` twice with same date/journey/variant/mode → second call is a no-op.
- LLM skip: credentials absent → llm runs have `status: "skipped"`, scripted runs still execute.

### REQ-TEST-02 · Unit tests for the backend endpoint

**THE SYSTEM SHALL** have tests in `agent/tests/test_api.py` (extending the existing test module) that cover:
- `GET /night-watch/history` with an empty table returns `{ "rows": [], "count": 0 }`.
- `GET /night-watch/history` with two rows returns them newest-first.
- `GET /night-watch/history?status=regression` filters correctly.
- `GET /night-watch/history?since=2026-11-01` filters by date.
- `GET /night-watch/history?limit=1` returns one row and the correct count.
