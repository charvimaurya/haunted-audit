# Haunted Audit Rules

- **Checker authority:** The deterministic Python checker sets every `verdict` and `reason_code`. Models never override verdicts.
- **No invented metrics:** Unmeasured values always remain `--` (or `null` in JSON). Never fabricate scan or benchmark scores.
- **`agent_mode` in every result:** Every journey result and `get_run` output explicitly includes `agent_mode` (`"scripted"` or `"llm"`).
- **No auto-mutation:** MCP tools never modify source files, open PRs, or push commits. Human approval is mandatory before `verify_fix`.

## Ghost Mascot States

| State | Color | Meaning |
| --- | --- | --- |
| Ready | Purple | Idle or run in progress; no finding yet |
| Blocked | Red | Deterministic checker recorded `BLOCKED` on a focus/activation barrier |
| Verified | Green | Deterministic checker recorded `PASSED` |
