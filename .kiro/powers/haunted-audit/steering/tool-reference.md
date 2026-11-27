# Haunted Audit MCP Tool Reference

## scan_url
- **Inputs:** `url: str`, `tags: list[str] = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]`
- **Output:** `ScanResult` (`url`, `scanned_at`, `violations[]`, `passes`, `violation_count`) or `ToolError`
- **Example:** `scan_url(url="http://127.0.0.1:8000/sandbox/haunted-bank?variant=broken")` -> `{"violation_count": 3, "violations": [...]}`

## scan_file
- **Inputs:** `path: str`
- **Output:** `ScanResult` (plus `route`, `file`) or `ToolError`
- **Example:** `scan_file(path="dashboard/src/components/journey/PossessionMode.tsx")` -> `{"route": "/#journeys", "violation_count": 0}`

## run_journey
- **Inputs:** `journey_id: "send-payment"`, `variant: "broken" | "fixed"`, `mode: "scripted" | "llm"`, `max_steps: int`, `timeout_seconds: float`
- **Output:** `RunJourneyOutput` (`run_id`, `status="running"`, `journey_id`, `variant`, `mode`) or `ToolError`
- **Example:** `run_journey(journey_id="send-payment", variant="broken", mode="scripted")` -> `{"run_id": "...", "status": "running", "mode": "scripted"}`

## get_run
- **Inputs:** `run_id: str`
- **Output:** `GetRunOutput` (`run_id`, `status`, `verdict`, `reason_code`, `agent_mode`, `step_count`, `blocked_element`, `latency_ms`, `cost_usd`, `error`) or `ToolError`
- **Example:** `get_run(run_id="...")` -> `{"status": "complete", "verdict": "BLOCKED", "reason_code": "TARGET_NOT_FOCUSABLE", "agent_mode": "scripted"}`

## propose_fix
- **Inputs:** `run_id: str`
- **Output:** `ProposeFixOutput` (`run_id`, `verdict`, `reason_code`, `blocked_element`, `diff`, `warning`) or `ToolError`
- **Example:** `propose_fix(run_id="...")` -> `{"diff": {"before": "<div class=\"pay-btn\"...>", "after": "<button type=\"submit\"...>"}, "warning": "This diff has not been applied. Human approval required."}`

## verify_fix
- **Inputs:** `run_id: str`, `patch: str`
- **Output:** `VerifyFixOutput` (`original_run_id`, `verify_run_id`, `patched_file`, `verdict`, `reason_code`, `agent_mode`, `step_count`, `message`) or `ToolError`
- **Example:** `verify_fix(run_id="...", patch="--- a/index.html...")` -> `{"verdict": "PASSED", "agent_mode": "scripted"}`

## list_regression_tests
- **Inputs:** none
- **Output:** `ListRegressionTestsOutput` (`tests[]`, `count`)
- **Example:** `list_regression_tests()` -> `{"count": 2, "tests": [...]}`
