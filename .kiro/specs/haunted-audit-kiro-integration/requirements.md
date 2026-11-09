# Haunted Audit Kiro Integration — Requirements

**Spec version:** 1.0  
**Steering:** `.kiro/steering/product-rules.md`  
**Companion specs:** `.kiro/specs/haunted-audit-frontend/`

---

## Conventions

Acceptance criteria use EARS notation:

- **WHEN** \<trigger\> **THE SYSTEM SHALL** \<behaviour\>
- **WHILE** \<state\> **THE SYSTEM SHALL** \<behaviour\>
- **IF** \<condition\> **THEN THE SYSTEM SHALL** \<behaviour\>
- **THE SYSTEM SHALL** \<unconditional behaviour\>

Cross-cutting invariants from `product-rules.md` that apply to every requirement here:

- **Verdict authority:** The deterministic checker (`checker.py`) decides every `verdict` and `reason_code`. No MCP tool, skill, or Power component overrides or fabricates these values.
- **Metrics:** Every tool response that includes a numeric result includes `agent_mode`. Values not yet measured are omitted from the response object; callers render `--`.
- **No auto-mutation:** No tool, skill, or automation writes to the repository without explicit human approval.
- **No fake data:** If a backend call fails, the tool returns a structured error. It never invents a verdict, violation count, or severity.

---

## REQ-MCP — MCP Server (`mcp_server/`)

### REQ-MCP-01 · Transport and protocol

**THE SYSTEM SHALL** implement an MCP server using **stdio transport** so Kiro can launch it as a subprocess with no network port required.

**THE SYSTEM SHALL** declare its protocol version, server name (`haunted-audit`), and tool list in the MCP `initialize` handshake.

**THE SYSTEM SHALL** read `HAUNTED_AUDIT_API_URL` from the environment (default `http://127.0.0.1:8000`) and use it as the base URL for all FastAPI calls. No URL is hardcoded in tool implementations.

**THE SYSTEM SHALL** read `HAUNTED_AUDIT_DEV_SERVER_URL` from the environment (default `http://localhost:5173`) for tools that scan local component routes.

### REQ-MCP-02 · Tool: `scan_url`

**Input schema:**
```json
{
  "url":    { "type": "string", "description": "Fully-qualified URL to scan" },
  "tags":   { "type": "array", "items": { "type": "string" },
              "default": ["wcag2a","wcag2aa","wcag21a","wcag21aa","best-practice"],
              "description": "axe-core rule tags to include" }
}
```

**Output schema:**
```json
{
  "url":         "string",
  "scanned_at":  "ISO-8601 timestamp",
  "violations":  [
    {
      "rule_id":   "string",
      "wcag":      "string  — e.g. WCAG 1.4.3 AA",
      "impact":    "critical|serious|moderate|minor",
      "selector":  "string  — CSS selector of first affected node",
      "html":      "string  — trimmed outerHTML of first affected node (≤200 chars)",
      "failure":   "string  — axe failure summary",
      "help_url":  "string"
    }
  ],
  "passes":      "integer — count of passing rules",
  "violation_count": "integer"
}
```

**THE SYSTEM SHALL** launch a headless Chromium browser via Playwright, navigate to `url`, wait for `networkidle`, and run `axe-core` with the requested tags.

**THE SYSTEM SHALL** limit scan requests to **one active scan per server process** at a time. If a scan is already running when a second call arrives, the tool SHALL return an error with code `SCAN_IN_PROGRESS`.

**THE SYSTEM SHALL** not click, submit forms, log in, or modify page state during a scan.

**IF** the URL is not reachable (connection refused or DNS failure) **THEN THE SYSTEM SHALL** return `{ "error": { "code": "URL_UNREACHABLE", "message": "..." } }` — not a stack trace, not a crash.

**THE SYSTEM SHALL** return structured JSON matching the output schema above. Violations are sorted descending by impact (`critical` → `serious` → `moderate` → `minor`).

### REQ-MCP-03 · Tool: `scan_file`

**Input schema:**
```json
{
  "path": { "type": "string",
            "description": "Absolute or workspace-relative path to a .tsx/.ts/.css file" }
}
```

**Output schema:** same as `scan_url` plus:
```json
{
  "route":   "string  — the dev-server route that was scanned",
  "file":    "string  — the resolved file path"
}
```

**THE SYSTEM SHALL** map the saved file path to one or more dev-server routes using the same component-to-route table as the `axe-on-save` hook (`TopNav` → all routes, `PossessionMode` → `/#journeys`, etc.).

**THE SYSTEM SHALL** call `scan_url` internally for each resolved route and aggregate the results.

**IF** the dev server at `HAUNTED_AUDIT_DEV_SERVER_URL` is not reachable **THEN THE SYSTEM SHALL** return `{ "error": { "code": "DEV_SERVER_OFFLINE", "message": "Start the dev server and retry." } }`.

### REQ-MCP-04 · Tool: `run_journey`

**Input schema:**
```json
{
  "journey_id": { "type": "string", "enum": ["send-payment"],
                  "description": "Identifier of the journey to run" },
  "variant":    { "type": "string", "enum": ["broken", "fixed"] },
  "mode":       { "type": "string", "enum": ["scripted", "llm"],
                  "default": "scripted" },
  "max_steps":  { "type": "integer", "minimum": 1, "maximum": 80, "default": 25 },
  "timeout_seconds": { "type": "number", "minimum": 0, "maximum": 300, "default": 90 }
}
```

**Output schema:**
```json
{
  "run_id":     "string — UUID",
  "status":     "running",
  "journey_id": "string",
  "variant":    "string",
  "mode":       "string"
}
```

**THE SYSTEM SHALL** POST `{ variant, mode, max_steps, timeout_seconds }` to `HAUNTED_AUDIT_API_URL/runs` and return the `run_id` immediately without waiting for the run to complete.

**THE SYSTEM SHALL** include `agent_mode` in the response (mirrors `mode`).

**IF** the FastAPI backend returns a non-2xx status **THEN THE SYSTEM SHALL** return `{ "error": { "code": "BACKEND_ERROR", "status": <http_status>, "message": "..." } }`.

### REQ-MCP-05 · Tool: `get_run`

**Input schema:**
```json
{
  "run_id": { "type": "string" }
}
```

**Output schema:**
```json
{
  "run_id":        "string",
  "status":        "running|complete|error",
  "verdict":       "PASSED|BLOCKED|null",
  "reason_code":   "TARGET_NOT_FOCUSABLE|FOCUS_TRAP|NO_ACTIVATION|STEP_LIMIT|TIMEOUT|null",
  "agent_mode":    "scripted|llm",
  "step_count":    "integer",
  "blocked_element": {
    "selector":        "string|null",
    "tag":             "string|null",
    "accessible_name": "string|null",
    "bounding_box":    { "x": "number", "y": "number", "width": "number", "height": "number" } | null
  } | null,
  "latency_ms":    "number",
  "cost_usd":      "number",
  "error":         "string|null"
}
```

**THE SYSTEM SHALL** GET `HAUNTED_AUDIT_API_URL/runs/{run_id}` and project the full `JourneyResult` into the output schema above.

**THE SYSTEM SHALL** always include `agent_mode` in the response.

**IF** the run_id does not exist **THEN THE SYSTEM SHALL** return `{ "error": { "code": "RUN_NOT_FOUND", "message": "..." } }`.

### REQ-MCP-06 · Tool: `propose_fix`

**Input schema:**
```json
{
  "run_id": { "type": "string" }
}
```

**Output schema:**
```json
{
  "run_id":       "string",
  "verdict":      "BLOCKED",
  "reason_code":  "string",
  "blocked_element": { "selector": "string", "tag": "string|null" },
  "diff": {
    "file":   "string  — relative path to the source file containing the barrier",
    "before": "string  — the exact line(s) to be replaced",
    "after":  "string  — the proposed replacement",
    "wcag":   "string  — the WCAG criterion the fix addresses",
    "rationale": "string  — plain-English explanation of why this fixes it"
  },
  "warning": "string  — always 'This diff has not been applied. Human approval required.'"
}
```

**THE SYSTEM SHALL** fetch the run result via `get_run`, identify the blocked element's selector and tag, look up the corresponding source file, and generate a minimal unified diff that would make the element keyboard-accessible.

**THE SYSTEM SHALL** include in the `diff` object:
- For `div` with no `tabindex`/`role`: replace with `<button type="submit">` or add `tabindex="0" role="button"` as appropriate.
- The exact WCAG success criterion addressed (e.g. "WCAG 2.1.1 A — Keyboard" for a missing tabindex).

**THE SYSTEM SHALL** always include `"warning": "This diff has not been applied. Human approval required."` in the response.

**THE SYSTEM SHALL NEVER** write to the filesystem. The diff is a proposal only.

**IF** the run verdict is `PASSED` **THEN THE SYSTEM SHALL** return `{ "error": { "code": "NO_BARRIER", "message": "Run verdict is PASSED; no fix to propose." } }`.

**IF** the run is still `running` **THEN THE SYSTEM SHALL** return `{ "error": { "code": "RUN_IN_PROGRESS", "message": "Wait for the run to complete before requesting a fix." } }`.

### REQ-MCP-07 · Tool: `verify_fix`

**Input schema:**
```json
{
  "run_id": { "type": "string",
              "description": "The original blocked run to re-verify" },
  "patch":  { "type": "string",
              "description": "Unified diff string to apply to a temporary copy" }
}
```

**Output schema:**
```json
{
  "original_run_id":  "string",
  "verify_run_id":    "string",
  "patched_file":     "string  — path of the temp copy, not the original",
  "verdict":          "PASSED|BLOCKED",
  "reason_code":      "string|null",
  "agent_mode":       "string",
  "step_count":       "integer",
  "message":          "string  — human-readable summary"
}
```

**THE SYSTEM SHALL** apply `patch` to a temporary copy of the source file (in `tmp/`, never in the working tree).

**THE SYSTEM SHALL** start the dev server pointed at the patched copy (or instruct the caller to), run `run_journey` with `variant=fixed`, wait for completion, and return the full verification result.

**THE SYSTEM SHALL NEVER** write the patch to the original source file.

**THE SYSTEM SHALL** delete the temporary copy after the verification run completes or fails.

**IF** the patch does not apply cleanly **THEN THE SYSTEM SHALL** return `{ "error": { "code": "PATCH_FAILED", "message": "..." } }` without starting a run.

### REQ-MCP-08 · Tool: `list_regression_tests`

**Input schema:** `{}` (no parameters)

**Output schema:**
```json
{
  "tests": [
    {
      "name":        "string  — e.g. send_payment.spec.ts",
      "path":        "string  — relative path",
      "journey_id":  "string",
      "variant":     "string",
      "last_result": "PASSED|BLOCKED|null",
      "last_run_at": "ISO-8601 timestamp|null"
    }
  ],
  "count": "integer"
}
```

**THE SYSTEM SHALL** scan the `agent/tests/` directory and the `e2e/` directory (if present) for test files that follow the naming convention `*send_payment*` or are tagged `@haunted-audit`.

**THE SYSTEM SHALL** read each test file's last pytest/Playwright result from the most recent CI artefact or a local `data/regression_results.json` cache if present. If no result is cached, `last_result` is `null` and `last_run_at` is `null`.

**THE SYSTEM SHALL NEVER** run the tests itself. It reports existing results only.

### REQ-MCP-09 · Error contract (all tools)

**THE SYSTEM SHALL** return all errors as a JSON object `{ "error": { "code": "SCREAMING_SNAKE", "message": "..." } }`.

**THE SYSTEM SHALL NEVER** include a Python stack trace in a tool response.

**THE SYSTEM SHALL NEVER** return an HTTP error to the MCP caller; all outcomes are exit-0 JSON responses.

**THE SYSTEM SHALL** log full exception details to `stderr` (captured by Kiro's process manager, not visible in the tool output).

### REQ-MCP-10 · Schema validation and unit tests

**THE SYSTEM SHALL** define input schemas as Pydantic v2 `BaseModel` classes in `mcp_server/schemas.py`. One class per tool input and one per tool output.

**THE SYSTEM SHALL** have a unit test for every tool in `mcp_server/tests/`. Each test uses a fixture response (not a live backend or browser) and asserts that:
  - Valid input deserialises without error.
  - The tool function returns an object matching the output schema.
  - An error input returns the structured error object (not a raised exception).

---

## REQ-POWER — Kiro Power (`.kiro/powers/haunted-audit/`)

### REQ-POWER-01 · Directory structure

**THE SYSTEM SHALL** create `.kiro/powers/haunted-audit/` with:
- `POWER.md` — Power manifest
- `mcp.json` — MCP server configuration for this Power
- `steering/workflow.md` — Find → Experience → Fix → Verify → Prevent guidance
- `steering/tool-reference.md` — tool names, inputs, outputs, and usage notes
- `steering/rules.md` — the non-negotiable rules (mirrors product-rules.md in Power scope)

### REQ-POWER-02 · `POWER.md` contents

**THE SYSTEM SHALL** include in `POWER.md`:
- A one-paragraph description of what Haunted Audit does.
- **Keywords** that should cause Kiro to suggest activating this Power: `accessibility`, `keyboard`, `WCAG`, `focus`, `screen reader`, `aria`, `tabindex`, `a11y`, `barrier`, `contrast`.
- A complete tool list with one-line descriptions.
- The "propose, human approves, verify" rule stated as a numbered constraint.
- "Built with Kiro" as plain text.

### REQ-POWER-03 · MCP server configuration

**THE SYSTEM SHALL** include in `.kiro/powers/haunted-audit/mcp.json` a ready-to-copy MCP server entry:
```json
{
  "mcpServers": {
    "haunted-audit": {
      "command": "python",
      "args": ["-m", "mcp_server.server"],
      "cwd": "${workspaceFolder}",
      "env": {
        "HAUNTED_AUDIT_API_URL": "http://127.0.0.1:8000",
        "HAUNTED_AUDIT_DEV_SERVER_URL": "http://localhost:5173"
      }
    }
  }
}
```

**THE SYSTEM SHALL** document in `POWER.md` that `HAUNTED_AUDIT_API_URL` must point to the running FastAPI backend and `HAUNTED_AUDIT_DEV_SERVER_URL` to the frontend dev server.

### REQ-POWER-04 · Workflow steering (`steering/workflow.md`)

**THE SYSTEM SHALL** describe the five-stage pipeline in `steering/workflow.md`:
1. **Find** — when to call `scan_url` or `scan_file`.
2. **Experience** — when to call `run_journey` and what to do with the result.
3. **Fix** — when to call `propose_fix`, and the rule that only a human may approve.
4. **Verify** — when to call `verify_fix` on the approved patch.
5. **Prevent** — when to call `list_regression_tests` and how to interpret the results.

**THE SYSTEM SHALL** include the verbatim rule: "Agents propose. Humans approve. Verify on a copy, never on live code."

### REQ-POWER-05 · Tool-reference steering (`steering/tool-reference.md`)

**THE SYSTEM SHALL** list every tool with its input fields, output fields, and one usage example per tool.

### REQ-POWER-06 · Rules steering (`steering/rules.md`)

**THE SYSTEM SHALL** restate the product-rules.md invariants in the Power scope:
- Verdict authority (checker decides, not the model).
- No invented metrics.
- `agent_mode` in every result.
- No auto-mutation rule.
- Ghost mascot states and their meanings.

---

## REQ-SKILL — Skills (`.kiro/skills/`)

### REQ-SKILL-01 · `audit-component`

**File:** `.kiro/skills/audit-component.md`

**THE SYSTEM SHALL** define this skill to:
1. Accept a file path as input.
2. Call `scan_file(path)` via the MCP server.
3. Group violations by severity: `critical`, `serious`, `moderate`, `minor`.
4. For each violation, include: rule ID, WCAG criterion, selector, and a one-sentence fix hint (plain English, not a code change).
5. Output a summary line: "N critical, N serious, N moderate, N minor barriers found."

**THE SYSTEM SHALL** state in the skill definition that severity classification uses deterministic rules (any violation that would block a payment flow or prevent form submission is `critical`; any that removes keyboard access to a non-blocking control is `serious`; contrast and label issues are `moderate` unless on a required form control), not model judgement. The AI writes only the plain-English explanation.

**THE SYSTEM SHALL** end the skill output with either:
- "No violations found. axe covers ~30–40% of WCAG issues; manual testing is also required."
- "Review violations above. No code has been changed."

### REQ-SKILL-02 · `keyboard-journey`

**File:** `.kiro/skills/keyboard-journey.md`

**THE SYSTEM SHALL** define this skill to:
1. Call `run_journey("send-payment", variant, mode)` using the `scripted` mode by default.
2. Poll `get_run(run_id)` until `status` is `complete` or `error` (polling interval: 2 seconds, timeout: 120 seconds).
3. Report where focus got stuck: `blocked_element.selector`, `reason_code`, step count.
4. Show ghost state: purple (running), red (BLOCKED), green (PASSED).
5. If BLOCKED, show WCAG criteria `2.1.1 Keyboard` and `4.1.2 Name, Role, Value`.
6. End with "Run used agent_mode: {agent_mode}. The deterministic checker decided the verdict, not the agent."

**THE SYSTEM SHALL** include in the skill: "If mode=llm is requested, AWS credentials must be present. If missing, the skill reports the missing credential error and does not invent a result."

### REQ-SKILL-03 · `fix-and-verify`

**File:** `.kiro/skills/fix-and-verify.md`

**THE SYSTEM SHALL** define this skill to:
1. Accept a `run_id` for a BLOCKED run.
2. Call `propose_fix(run_id)` and present the diff to the human.
3. **STOP** and wait for explicit human approval before proceeding.
4. On approval: call `verify_fix(run_id, approved_patch)`.
5. Report the verification result: verdict, step count, agent_mode.
6. If PASSED: "Fix verified. The barrier is resolved."
7. If BLOCKED after verification: "Fix did not resolve the barrier. reason_code: {reason_code}. No changes were applied."

**THE SYSTEM SHALL** state clearly: "Step 3 is a hard stop. The skill does not proceed to verify_fix until the human types an explicit approval in chat."

**THE SYSTEM SHALL** note: "verify_fix runs on a temporary copy. The original source file is unchanged until the developer applies the diff manually."

### REQ-SKILL-04 · `regression-guard`

**File:** `.kiro/skills/regression-guard.md`

**THE SYSTEM SHALL** define this skill to:
1. Call `list_regression_tests()`.
2. Show each test with its last result, path, and journey_id.
3. Identify any test whose `last_result` is `BLOCKED` or `null`.
4. For each failing or un-run test: show filename, last result, and the message "The ghost is back. Run the test suite to confirm: `pytest agent/tests/` or `npx playwright test e2e/`."
5. For all-passing tests: "All regression tests passed. The ghost has not returned."

**THE SYSTEM SHALL** explicitly state: "This skill reads existing test results only. It does not execute tests."

**THE SYSTEM SHALL** describe how a new regression test is generated after a verified fix: "After `fix-and-verify` completes with PASSED, Kiro may offer to generate a `send_payment.spec.ts` Playwright test that asserts `button.btn-primary` is reachable by Tab. The test file is proposed as a diff; the developer applies it manually."

---

## REQ-INT — Integration Test

### REQ-INT-01 · `scan_url` against fixture variants

**THE SYSTEM SHALL** have an integration test at `mcp_server/tests/test_integration.py` that:
1. Starts the Haunted Bank fixture HTTP server on a random port using Python's `http.server`.
2. Calls `scan_url(url=f"http://localhost:{port}/index.html?variant=broken")` directly (not via MCP transport).
3. Asserts that at least one violation is present with `rule_id` matching any of: `aria-roles`, `button-name`, `keyboard`, `region`, or any rule related to the missing semantic role on `div.pay-btn`.
4. Calls `scan_url(url=f"http://localhost:{port}/index.html?variant=fixed")`.
5. Asserts that `div.pay-btn`-related violations are absent (the fixed variant uses a proper `<button>`).

**THE SYSTEM SHALL** mark this test with `@pytest.mark.integration` so it is excluded from the default `pytest` run and only runs explicitly with `pytest -m integration`.

### REQ-INT-02 · `run_journey` round-trip

**THE SYSTEM SHALL** have an integration test that:
1. Starts the FastAPI backend in a subprocess.
2. Calls `run_journey("send-payment", "broken", "scripted")` via the MCP tool function directly.
3. Polls `get_run(run_id)` until complete.
4. Asserts `verdict == "BLOCKED"`, `reason_code == "TARGET_NOT_FOCUSABLE"`, `agent_mode == "scripted"`, `blocked_element.selector == "div.pay-btn"`.

---

## REQ-README — Documentation

### REQ-README-01 · How to enable the Power

**THE SYSTEM SHALL** add a section "Kiro Integration" to the project `README.md` containing:
1. A description of what the Power does in one paragraph.
2. Step-by-step setup:
   a. Start the FastAPI backend: `uvicorn agent.api.main:app --port 8000`
   b. Start the frontend dev server: `cd dashboard && npm run dev`
   c. Copy the `mcp.json` snippet into `.kiro/settings/mcp.json` (or `~/.kiro/settings/mcp.json` for user-level).
   d. Open the Kiro MCP server view and reconnect.
3. The exact copy-paste `mcp.json` block.
4. A list of the four skills with one-line descriptions.
5. A troubleshooting table: Backend offline → error code + fix. Dev server offline → error code + fix. AWS credentials missing → LLM mode disabled, scripted mode unaffected.
