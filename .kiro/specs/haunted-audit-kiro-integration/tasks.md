# Haunted Audit Kiro Integration — Tasks

**Spec version:** 1.0  
**Execution order:** complete each task before starting the next. Tasks within the same phase with no inter-dependency may be worked in parallel.

Each task states:
- **Satisfies:** requirement(s) it implements
- **Done when:** specific, verifiable completion criterion

---

## Phase 1 — Schemas and fixtures

### TASK-01 · Package skeleton

**Satisfies:** REQ-MCP-01 (server exists and is importable)  
**Depends on:** nothing

Steps:
1. Create `mcp_server/__init__.py` (empty).
2. Create `mcp_server/tests/__init__.py` (empty).
3. Create `mcp_server/tests/fixtures/` directory.
4. Add to `requirements.txt` (pinned exact versions):
   - `mcp==1.0.0`
   - `httpx==0.27.0`
   - Confirm `playwright>=1.49`, `pydantic>=2.6` are already present.
5. Verify: `python -c "import mcp_server"` exits 0.

**Done when:** `python -c "import mcp_server"` succeeds; `requirements.txt` contains `mcp==1.0.0`; no import errors.

---

### TASK-02 · Schemas (`mcp_server/schemas.py`)

**Satisfies:** REQ-MCP-10 (typed input/output schemas)  
**Depends on:** TASK-01

Steps:
1. Create `mcp_server/schemas.py`.
2. Define all input models: `ScanUrlInput`, `ScanFileInput`, `RunJourneyInput`, `GetRunInput`, `ProposeFixInput`, `VerifyFixInput`. (No input for `list_regression_tests`.)
3. Define all output models: `AxeViolation`, `ScanResult`, `RunJourneyOutput`, `GetRunOutput`, `BlockedElementSummary`, `BoundingBoxOut`, `ProposeFixOutput`, `FixDiff`, `VerifyFixOutput`, `RegressionTestEntry`, `ListRegressionTestsOutput`.
4. Define `ToolError` and `ErrorDetail`.
5. Add field constraints exactly as specified in `design.md §4`: `FixDiff.warning` is a `Literal[...]` with the exact string; `RunJourneyInput.journey_id` is `Literal["send-payment"]`.
6. Write `mcp_server/tests/test_schemas.py`:
   - Round-trip: construct each output model, call `.model_dump_json()`, parse back, assert equality.
   - Constraint: `RunJourneyInput(journey_id="invalid")` raises `ValidationError`.
   - Constraint: `ProposeFixOutput.warning` always equals the required string.

**Done when:** `pytest mcp_server/tests/test_schemas.py` exits 0; `mypy mcp_server/schemas.py --strict` exits 0 (or equivalent type check).

---

### TASK-03 · Test fixtures

**Satisfies:** REQ-MCP-10, REQ-INT-01 (fixture responses needed before tests can run)  
**Depends on:** TASK-01

Steps:
1. Create `mcp_server/tests/fixtures/scan_url_broken.json`:
   - A real axe-core output for `fixtures/haunted_bank/index.html?variant=broken`.
   - Must contain at least one violation with `rule_id` in `{ "aria-roles", "keyboard", "region", "landmark-one-main" }`.
   - Capture by running: `node -e "..." < /dev/null` using the inline axe script from `design.md §5`.
2. Create `mcp_server/tests/fixtures/scan_url_fixed.json`:
   - A real axe-core output for `?variant=fixed`.
   - Must NOT contain any violation with the same `rule_id` as the one caused by `div.pay-btn`.
3. Create `mcp_server/tests/fixtures/run_journey_blocked.json`:
   - A real `JourneyResult` for `variant=broken, mode=scripted`.
   - Copy from `artifacts/api/*/` or run `python -m agent.keyboard_agent.runner --variant broken --mode scripted` and capture stdout.
4. Create `mcp_server/tests/fixtures/run_journey_passed.json`:
   - A real `JourneyResult` for `variant=fixed, mode=scripted`.
5. Validate: `python -c "from agent.keyboard_agent.models import JourneyResult; import json; JourneyResult.model_validate(json.load(open('mcp_server/tests/fixtures/run_journey_blocked.json')))"` exits 0.

**Done when:** All four fixture files exist; `JourneyResult.model_validate()` on both journey fixtures succeeds; broken fixture contains at least one violation; fixed fixture does not contain `div.pay-btn`-related violations.

---

## Phase 2 — Scanner wrapper

### TASK-04 · Route map (`mcp_server/route_map.py`)

**Satisfies:** REQ-MCP-03 (scan_file maps path to routes)  
**Depends on:** TASK-01

Steps:
1. Create `mcp_server/route_map.py` with `ROUTE_MAP` and `routes_for_file(path: str) -> list[str]` exactly as specified in `design.md §8`.
2. Write `mcp_server/tests/test_route_map.py` asserting:
   - `PossessionMode.tsx` → `['/#journeys']`
   - `TopNav.tsx` → 6 routes
   - `index.css` → 6 routes
   - `MetricValue.tsx` → `['/#reports']`
   - `Unknown.ts` → `['/']`
3. Update `.kiro/scripts/axe-on-save.mjs` to import the route map from `mcp_server/route_map.py` via a JSON export, or document that both must be kept in sync (acceptable for now; a follow-up task can unify them).

**Done when:** `pytest mcp_server/tests/test_route_map.py` exits 0; all five assertions pass.

---

### TASK-05 · Severity classification (`mcp_server/scanner.py`, partial)

**Satisfies:** REQ-SKILL-01 (deterministic severity rules)  
**Depends on:** TASK-02

Steps:
1. Create `mcp_server/scanner.py`.
2. Define `WCAG_MAP: dict[str, str]` — same mapping as `axe-on-save.mjs`. At minimum 25 entries covering the most common rules.
3. Define `SEVERITY_OVERRIDES: dict[str, str]` as specified in `design.md §10`.
4. Implement `classify_severity(rule_id: str, axe_impact: str) -> str`:
   - Returns the higher of `axe_impact` and `SEVERITY_OVERRIDES.get(rule_id, axe_impact)`.
   - Order: `minor < moderate < serious < critical`.
   - Never demotes below axe's own impact.
5. Write `mcp_server/tests/test_scanner.py` (severity section):
   - `classify_severity("keyboard", "serious")` → `"critical"` (promoted).
   - `classify_severity("keyboard", "critical")` → `"critical"` (no change).
   - `classify_severity("color-contrast", "serious")` → `"serious"` (not demoted below axe impact).
   - Unknown rule_id: returns axe_impact unchanged.

**Done when:** Severity section of `test_scanner.py` passes.

---

### TASK-06 · `scan_url` implementation

**Satisfies:** REQ-MCP-02  
**Depends on:** TASK-05, TASK-03

Steps:
1. Add to `mcp_server/scanner.py`:
   - `_check_node()` — raises `ToolError(SCANNER_UNAVAILABLE)` if `node --version` fails or returns < 18.
   - `_write_axe_script(tmp_dir)` — writes the inline Node axe script from `design.md §5` to `tmp_dir/run-axe.mjs`.
   - `_run_node_axe(url, tags, node_modules_dir)` — subprocess call, parses stdout JSON, deletes script.
   - `_parse_axe_output(raw, url) -> ScanResult` — maps axe JSON to `ScanResult`, calls `classify_severity` and `wcag_for` per violation, sorts by impact.
   - `_scan_lock: asyncio.Lock` — module-level lock.
   - `async def scan_url(url: str, tags: list[str] = DEFAULT_AXE_TAGS) -> ScanResult | ToolError`.
2. Add to `test_scanner.py`:
   - Mock `subprocess.run` to return the content of `fixtures/scan_url_broken.json`.
   - Assert: `scan_url` returns `ScanResult` with `violation_count > 0`.
   - Assert: violations are sorted critical → serious → moderate → minor.
   - Assert: each violation has `wcag` field matching a known criterion.
   - Mock subprocess to raise `ConnectionRefusedError`: assert returns `ToolError(URL_UNREACHABLE)`.
   - Call `scan_url` twice concurrently (mock lock as taken): second call returns `ToolError(SCAN_IN_PROGRESS)`.

**Done when:** `pytest mcp_server/tests/test_scanner.py` exits 0; no live browser or network in unit tests.

---

### TASK-07 · `scan_file` implementation

**Satisfies:** REQ-MCP-03  
**Depends on:** TASK-06, TASK-04

Steps:
1. Add `async def scan_file(path: str) -> ScanResult | ToolError` to `mcp_server/scanner.py`.
2. Uses `routes_for_file(path)` to get routes.
3. Checks dev server liveness (HTTP GET to `HAUNTED_AUDIT_DEV_SERVER_URL`).
4. Calls `scan_url` for each route, merges `violations` lists (deduplicated by `rule_id + selector`), sums `passes`.
5. Adds `route` and `file` fields to the returned `ScanResult`.
6. Add to `test_scanner.py`:
   - Mock `routes_for_file` to return `['/#reports']`.
   - Mock `scan_url` to return `ScanResult` from fixture.
   - Assert `scan_file` returns `ScanResult` with `route == '/#reports'`.
   - Mock dev server check to fail: assert `ToolError(DEV_SERVER_OFFLINE)`.

**Done when:** `scan_file` tests pass without a live server.

---

## Phase 3 — Journey tools

### TASK-08 · Journey HTTP client (`mcp_server/journey.py`)

**Satisfies:** REQ-MCP-04, REQ-MCP-05  
**Depends on:** TASK-02

Steps:
1. Create `mcp_server/journey.py` with `httpx.AsyncClient`.
2. Implement `post_run(body: dict) -> dict | ToolError` — POST `/runs`, returns `{ run_id, status }` on 202, `ToolError(BACKEND_ERROR)` otherwise.
3. Implement `fetch_run(run_id: str) -> dict | ToolError` — GET `/runs/{run_id}`, returns full JSON on 200, `ToolError(RUN_NOT_FOUND)` on 404.
4. Implement `async def wait_for_run(run_id: str, *, poll_interval: float = 2.0, timeout: float = 120.0) -> dict | ToolError` — polls `fetch_run` until `status` is `complete` or `error`, or raises `ToolError(WAIT_TIMEOUT)`.
5. Write `mcp_server/tests/test_journey.py` using `respx` (or `httpx.MockTransport`) to mock HTTP:
   - `post_run` on 202 returns run_id.
   - `post_run` on 503 returns `ToolError(BACKEND_ERROR, status=503)`.
   - `fetch_run` on 404 returns `ToolError(RUN_NOT_FOUND)`.
   - `wait_for_run` polls twice then sees `status=complete`; returns the run record.
   - `wait_for_run` times out after `timeout=0`: returns `ToolError(WAIT_TIMEOUT)`.

**Done when:** `pytest mcp_server/tests/test_journey.py` exits 0 with no live backend.

---

### TASK-09 · `run_journey` tool function

**Satisfies:** REQ-MCP-04  
**Depends on:** TASK-08, TASK-02

Steps:
1. Create `mcp_server/tools/journey_tools.py` (or add to `server.py` directly — decision: add to a `tools/` sub-package for clarity).
2. Implement `async def run_journey(journey_id, variant, mode, max_steps, timeout_seconds) -> RunJourneyOutput | ToolError`.
3. Validates input against `RunJourneyInput` schema.
4. Calls `journey.post_run({"variant": variant, "mode": mode, "max_steps": max_steps, "timeout_seconds": timeout_seconds})`.
5. Returns `RunJourneyOutput(run_id=..., status="running", journey_id=journey_id, variant=variant, mode=mode)`.
6. Add test in `test_journey.py`: mock `post_run` → assert `run_journey` returns `RunJourneyOutput` with correct fields, including `mode` == `agent_mode`.

**Done when:** Test passes; `run_journey("send-payment", "broken", "scripted")` returns the correct schema.

---

### TASK-10 · `get_run` tool function

**Satisfies:** REQ-MCP-05  
**Depends on:** TASK-08, TASK-02

Steps:
1. Implement `async def get_run(run_id: str) -> GetRunOutput | ToolError`.
2. Calls `journey.fetch_run(run_id)`.
3. Projects `JourneyResult` fields onto `GetRunOutput`: `step_count = len(result.step_events)`, `agent_mode = result.agent_mode`, etc.
4. `agent_mode` is always present in the response (product-rules.md §Metrics).
5. Add test: load `fixtures/run_journey_blocked.json`, mock `fetch_run` to return it, assert `get_run` returns `GetRunOutput` with `verdict=BLOCKED`, `reason_code=TARGET_NOT_FOCUSABLE`, `agent_mode=scripted`, `step_count > 0`.

**Done when:** Test passes; `agent_mode` present in all output paths.

---

## Phase 4 — Fix tools

### TASK-11 · `propose_fix` (`mcp_server/fixer.py`)

**Satisfies:** REQ-MCP-06  
**Depends on:** TASK-10, TASK-02

Steps:
1. Create `mcp_server/fixer.py`.
2. Implement `_selector_to_source_file(selector: str, workspace: Path) -> Path | None`:
   - `div.pay-btn` → `fixtures/haunted_bank/index.html`
   - `button.btn-primary` → `fixtures/haunted_bank/index.html`
   - Pattern `dashboard/src/**` → derived from route_map reverse lookup.
   - Unknown → `None` (causes `SOURCE_NOT_FOUND` error).
3. Implement `_generate_diff(source_path: Path, tag: str, selector: str) -> FixDiff`:
   - Reads source file.
   - Finds the line(s) matching the selector using a regex scan.
   - For `div.pay-btn`: `before` = the div line, `after` = `<button type="submit" class="btn-primary" id="send-payment">Send Payment</button>`.
   - `wcag` = `"WCAG 2.1.1 A — Keyboard"`.
   - `rationale` = plain-English string (deterministic string constant, not LLM-generated for this known case).
4. Implement `async def propose_fix(run_id: str) -> ProposeFixOutput | ToolError`:
   - Fetches run via `get_run`.
   - Guards: running → `RUN_IN_PROGRESS`; passed → `NO_BARRIER`; no blocked_element → `NO_BARRIER`.
   - Calls `_selector_to_source_file` and `_generate_diff`.
   - Always sets `warning = "This diff has not been applied. Human approval required."`.
5. Write `mcp_server/tests/test_fixer.py`:
   - Mock `get_run` with blocked fixture → assert `propose_fix` returns `ProposeFixOutput`.
   - Assert `diff.before` contains `div` and `diff.after` contains `button`.
   - Assert `warning` equals the required literal string exactly.
   - Assert `diff.wcag` is non-empty.
   - Mock `get_run` with passed fixture → assert `ToolError(NO_BARRIER)`.
   - Mock `get_run` with `status=running` → assert `ToolError(RUN_IN_PROGRESS)`.

**Done when:** `pytest mcp_server/tests/test_fixer.py` exits 0; `ProposeFixOutput.warning` test passes.

---

### TASK-12 · `verify_fix` (`mcp_server/fixer.py`)

**Satisfies:** REQ-MCP-07  
**Depends on:** TASK-11, TASK-09, TASK-10

Steps:
1. Add `async def verify_fix(run_id: str, patch: str) -> VerifyFixOutput | ToolError` to `mcp_server/fixer.py`.
2. Apply patch to temp copy using `subprocess.run(["patch", "-p0"], input=patch, ...)`:
   - If non-zero exit → `PATCH_FAILED`.
3. If source is a fixture HTML: start `http.server` in temp dir on a random port.
4. Call `run_journey("send-payment", "fixed", "scripted")` with the patched server URL.
5. Call `wait_for_run(verify_run_id)` until complete.
6. Build `VerifyFixOutput` with `patched_file = str(temp_path)`.
7. `finally`: stop the HTTP server; `shutil.rmtree(tmp_dir)`.
8. Add to `test_fixer.py`:
   - Provide a valid patch string (the `before → after` diff from TASK-11).
   - Mock `run_journey` and `wait_for_run` to return a passed result.
   - Assert `verify_fix` returns `VerifyFixOutput` with `verdict=PASSED`.
   - Assert original fixture file is unchanged after the call.
   - Provide a malformed patch string → assert `ToolError(PATCH_FAILED)`.

**Done when:** Tests pass; `tempfile.mkdtemp()` directories are always cleaned up; original file is never modified.

---

## Phase 5 — Regression tool

### TASK-13 · `list_regression_tests` (`mcp_server/regression.py`)

**Satisfies:** REQ-MCP-08  
**Depends on:** TASK-02

Steps:
1. Create `mcp_server/regression.py`.
2. Implement `list_regression_tests(workspace_root: Path, cache_path: Path | None = None) -> ListRegressionTestsOutput`:
   - Glob `agent/tests/test_*.py` for files containing `regression` or `send_payment`.
   - Glob `e2e/*.spec.ts` for files containing `send-payment` or `haunted-audit`.
   - Read `data/regression_results.json` if it exists; populate `last_result` and `last_run_at`.
   - Files not in cache: `last_result=None`, `last_run_at=None`.
3. Write `mcp_server/tests/test_regression.py`:
   - Create a temp workspace with two fake test files; assert both appear in output.
   - Provide a cache JSON; assert `last_result` is populated from it.
   - No cache file: assert all `last_result` are `None`.
   - Assert `count` matches `len(tests)`.

**Done when:** `pytest mcp_server/tests/test_regression.py` exits 0.

---

## Phase 6 — Server entry point

### TASK-14 · MCP server (`mcp_server/server.py`)

**Satisfies:** REQ-MCP-01 (stdio transport), REQ-MCP-09 (error contract)  
**Depends on:** TASK-06, TASK-07, TASK-09, TASK-10, TASK-11, TASK-12, TASK-13

Steps:
1. Create `mcp_server/server.py`.
2. Import and register all seven tool functions with the MCP `Server` instance.
3. Generate JSON Schema from Pydantic models for the `initialize` handshake.
4. Wrap each tool in a try/except that converts any unhandled exception to `ToolError(INTERNAL_ERROR, str(exc))` and logs the full traceback to `stderr`.
5. Implement `async def main()` that calls `stdio_server(server)`.
6. Add `if __name__ == "__main__": asyncio.run(main())`.
7. Verify startup: `echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}' | python -m mcp_server.server` returns a valid MCP initialize response containing `"haunted-audit"` in the server name.

**Done when:** The initialize handshake works; `python -m mcp_server.server` exits cleanly on EOF; all seven tools appear in the tool list.

---

### TASK-15 · Server-level tool tests (`mcp_server/tests/test_server.py`)

**Satisfies:** REQ-MCP-10 (unit test for every tool)  
**Depends on:** TASK-14

Steps:
1. Call each of the seven tool functions directly (not via MCP transport) with valid inputs using fixture mocks.
2. Assert each returns an object that deserialises against the correct output schema.
3. Call each tool with an input that should produce an error (e.g. `scan_url` with `url=""`, `get_run` with `run_id="nonexistent"`).
4. Assert each error case returns a `ToolError` instance (not a raised exception, not a stack trace).
5. Assert every successful tool response that includes a run result contains `agent_mode`.

**Done when:** `pytest mcp_server/tests/test_server.py` exits 0; all seven tools covered.

---

## Phase 7 — Power packaging

### TASK-16 · Power directory and `POWER.md`

**Satisfies:** REQ-POWER-01, REQ-POWER-02  
**Depends on:** TASK-14 (tools must be final before documenting them)

Steps:
1. Create `.kiro/powers/haunted-audit/` directory.
2. Create `.kiro/powers/haunted-audit/POWER.md` with:
   - YAML front-matter: `name`, `version`, `description`, `keywords` (exact list from REQ-POWER-02).
   - One-paragraph description.
   - Tool list table: name, one-line description, key inputs.
   - Three numbered constraints: (1) propose, (2) human approves, (3) verify on copy.
   - "Built with Kiro" plain text at the bottom.
3. No placeholder text; all tool names must match `mcp_server/server.py` exactly.

**Done when:** A human reviewer can read `POWER.md` and identify all seven tools, all keywords, and the approval constraint.

---

### TASK-17 · `mcp.json` and steering files

**Satisfies:** REQ-POWER-03, REQ-POWER-04, REQ-POWER-05, REQ-POWER-06  
**Depends on:** TASK-16

Steps:
1. Create `.kiro/powers/haunted-audit/mcp.json` with the exact block from `design.md §15`.
2. Create `.kiro/powers/haunted-audit/steering/workflow.md`:
   - Five sections: Find, Experience, Fix, Verify, Prevent.
   - One paragraph per stage describing when to call which tool.
   - Verbatim rule: "Agents propose. Humans approve. Verify on a copy, never on live code."
3. Create `.kiro/powers/haunted-audit/steering/tool-reference.md`:
   - One `##` section per tool.
   - Each section: input fields, output fields, one usage example (tool call + sample response).
4. Create `.kiro/powers/haunted-audit/steering/rules.md`:
   - Checker authority rule.
   - No invented metrics rule.
   - `agent_mode` in every result rule.
   - No auto-mutation rule.
   - Ghost mascot states table (purple/red/green).

**Done when:** All four Power files exist; `workflow.md` contains the verbatim approval rule; `tool-reference.md` has an entry for all seven tools; `mcp.json` is valid JSON matching the spec.

---

## Phase 8 — Skills

### TASK-18 · `audit-component` skill

**Satisfies:** REQ-SKILL-01  
**Depends on:** TASK-07 (scan_file must be final)

Steps:
1. Create `.kiro/skills/audit-component.md`.
2. Front-matter: `name: audit-component`, `description: Scan a changed component file for WCAG violations and summarise by severity`, `tools: [scan_file]`.
3. Body sections: When to use, Steps (numbered), Output format, Constraints.
4. Constraints section must state:
   - Severity classification is deterministic Python code (not model judgement).
   - The skill ends with either the zero-violations message or the "no code changed" message.
5. Steps must reference `scan_file` by name and describe what to do with each severity bucket.

**Done when:** Skill file parses as valid Markdown with correct YAML front-matter; `tools` field lists `scan_file`; constraints section contains the deterministic-severity statement.

---

### TASK-19 · `keyboard-journey` skill

**Satisfies:** REQ-SKILL-02  
**Depends on:** TASK-09, TASK-10

Steps:
1. Create `.kiro/skills/keyboard-journey.md`.
2. Front-matter: `tools: [run_journey, get_run]`.
3. Steps section (numbered):
   1. Call `run_journey("send-payment", variant, mode="scripted")`.
   2. Poll `get_run` every 2 seconds until `status` is `complete` or `error`.
   3. Report: `blocked_element.selector`, `reason_code`, step count.
   4. Show ghost state (purple → running, red → BLOCKED, green → PASSED).
   5. Show WCAG criteria if BLOCKED.
   6. End with `agent_mode` attribution line.
4. Constraints section: AWS credentials note for LLM mode.

**Done when:** Skill file valid; `tools` field lists `run_journey` and `get_run`; polling interval and ghost states documented.

---

### TASK-20 · `fix-and-verify` skill

**Satisfies:** REQ-SKILL-03  
**Depends on:** TASK-11, TASK-12

Steps:
1. Create `.kiro/skills/fix-and-verify.md`.
2. Front-matter: `tools: [propose_fix, verify_fix]`.
3. Steps section (numbered):
   1. Call `propose_fix(run_id)`, display the diff.
   2. Display `warning` field verbatim.
   3. **STOP. Wait for explicit human approval in chat.**
   4. On approval: call `verify_fix(run_id, approved_patch)`.
   5. Report result.
4. Step 3 must be formatted as a bold callout: "**HARD STOP: Do not proceed to step 4 without explicit human approval.**"
5. Constraints: "verify_fix runs on a temporary copy. Original source file is unchanged."

**Done when:** Skill file valid; step 3 contains the HARD STOP callout; `tools` lists `propose_fix` and `verify_fix`; constraint about temp copy present.

---

### TASK-21 · `regression-guard` skill

**Satisfies:** REQ-SKILL-04  
**Depends on:** TASK-13

Steps:
1. Create `.kiro/skills/regression-guard.md`.
2. Front-matter: `tools: [list_regression_tests]`.
3. Steps: call `list_regression_tests`, identify failing or un-run tests, show per-test result, show the "ghost is back" message for failures.
4. Constraints section: "This skill reads results. It does not execute tests."
5. New-test section: describe the diff-proposal flow for generating `send_payment.spec.ts` after a verified fix.

**Done when:** Skill file valid; "does not execute tests" constraint present; new-test section present.

---

## Phase 9 — Integration tests and documentation

### TASK-22 · Integration tests (`mcp_server/tests/test_integration.py`)

**Satisfies:** REQ-INT-01, REQ-INT-02  
**Depends on:** TASK-06, TASK-09, TASK-10

Steps:
1. Create `mcp_server/tests/test_integration.py`.
2. Mark all tests with `@pytest.mark.integration`.
3. Test 1 — `scan_url` against fixture:
   - Start `http.server` on a random port serving `fixtures/haunted_bank/`.
   - Call `scanner.scan_url(f"http://localhost:{port}/index.html?variant=broken")` directly.
   - Assert `len(result.violations) > 0`.
   - Assert at least one violation has `rule_id` in `{ "aria-roles", "keyboard", "region", "landmark-one-main", "scrollable-region-focusable" }`.
   - Call `scanner.scan_url(f"...?variant=fixed")`.
   - Assert no violation has `selector` matching `div.pay-btn`.
4. Test 2 — `run_journey` round-trip:
   - Start the FastAPI backend as a subprocess (`uvicorn agent.api.main:app --port 18000`).
   - Call `journey.post_run({"variant": "broken", "mode": "scripted", "max_steps": 25, "timeout_seconds": 60})`.
   - Call `journey.wait_for_run(run_id, poll_interval=1, timeout=90)`.
   - Assert `verdict == "BLOCKED"`, `reason_code == "TARGET_NOT_FOCUSABLE"`, `agent_mode == "scripted"`, `blocked_element.selector == "div.pay-btn"`.
   - Terminate the subprocess in `finally`.
5. Add `pytest.ini` marker: `integration: marks tests requiring live browser or backend`.

**Done when:** `pytest -m integration mcp_server/tests/test_integration.py` exits 0 with both backends available; unit tests (`pytest -m "not integration"`) still exit 0.

---

### TASK-23 · README documentation

**Satisfies:** REQ-README-01  
**Depends on:** TASK-14, TASK-16, TASK-17

Steps:
1. Add a "## Kiro Integration" section to `README.md` (do not remove any existing content).
2. Include:
   - One-paragraph description of what the Power + MCP server does.
   - Numbered setup steps: start backend, start dev server, copy mcp.json, reconnect MCP.
   - The exact `mcp.json` block (fenced code block, JSON).
   - Skills table: skill name, one-line description.
   - Troubleshooting table: error code, cause, fix.

**Done when:** A developer unfamiliar with the project can read the README section and get the MCP server running in under 5 minutes; the `mcp.json` block is syntactically valid JSON; all seven tool names appear somewhere in the section.

---

## Summary Table

| Task | Phase | Requirement(s) | Depends on |
|---|---|---|---|
| TASK-01 | 1 | REQ-MCP-01 | — |
| TASK-02 | 1 | REQ-MCP-10 | TASK-01 |
| TASK-03 | 1 | REQ-MCP-10, REQ-INT-01 | TASK-01 |
| TASK-04 | 2 | REQ-MCP-03 | TASK-01 |
| TASK-05 | 2 | REQ-SKILL-01 | TASK-02 |
| TASK-06 | 2 | REQ-MCP-02 | TASK-05, TASK-03 |
| TASK-07 | 2 | REQ-MCP-03 | TASK-06, TASK-04 |
| TASK-08 | 3 | REQ-MCP-04, REQ-MCP-05 | TASK-02 |
| TASK-09 | 3 | REQ-MCP-04 | TASK-08, TASK-02 |
| TASK-10 | 3 | REQ-MCP-05 | TASK-08, TASK-02 |
| TASK-11 | 4 | REQ-MCP-06 | TASK-10, TASK-02 |
| TASK-12 | 4 | REQ-MCP-07 | TASK-11, TASK-09, TASK-10 |
| TASK-13 | 5 | REQ-MCP-08 | TASK-02 |
| TASK-14 | 6 | REQ-MCP-01, REQ-MCP-09 | TASK-06–TASK-13 |
| TASK-15 | 6 | REQ-MCP-10 | TASK-14 |
| TASK-16 | 7 | REQ-POWER-01, REQ-POWER-02 | TASK-14 |
| TASK-17 | 7 | REQ-POWER-03–06 | TASK-16 |
| TASK-18 | 8 | REQ-SKILL-01 | TASK-07 |
| TASK-19 | 8 | REQ-SKILL-02 | TASK-09, TASK-10 |
| TASK-20 | 8 | REQ-SKILL-03 | TASK-11, TASK-12 |
| TASK-21 | 8 | REQ-SKILL-04 | TASK-13 |
| TASK-22 | 9 | REQ-INT-01, REQ-INT-02 | TASK-06, TASK-09, TASK-10 |
| TASK-23 | 9 | REQ-README-01 | TASK-14, TASK-16, TASK-17 |
