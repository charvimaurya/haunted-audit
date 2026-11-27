# Notes for Shilpa — Kiro Integration Write-Up

Compiled directly from `.kiro/`, `docs/pr/`, `backend/`, and `power/`.

- **Specs vs. Vibe (`specs/`):** Feature workflows live under [`.kiro/specs/`](../../.kiro/specs/), including [`ui-review`](../../.kiro/specs/ui-review/tasks.md), [`amount-whole-euros`](../../.kiro/specs/amount-whole-euros/tasks.md), [`exorcist`](../../.kiro/specs/exorcist/), [`voice-agent`](../../.kiro/specs/voice-agent/), and [`user-typed-test-details`](../../.kiro/specs/user-typed-test-details/requirements.md).
- **Steering Rules:** Constraints governing honesty (`--` until measured), accessibility (WCAG 2.2 AA), structure, and data contracts live in [`.kiro/steering/`](../../.kiro/steering/).
- **Hooks (`scan-on-save`):** Automatic missing-label scans run via [`backend/scan_file.py`](../../backend/scan_file.py) and [`.kiro/hooks/`](../../.kiro/hooks/).
- **MCP Server & Power:** [`backend/mcp_server.py`](../../backend/mcp_server.py) and [`power/server/mcp_server.py`](../../power/server/mcp_server.py) expose read-only `scan_page` and bundled-only `run_journey` configured in [`.kiro/settings/mcp.json`](../../.kiro/settings/mcp.json) and [`power/mcp.json`](../../power/mcp.json).
- **Property-Based & Guard Tests:** [`agent/keyboard_agent/models.py`](../../agent/keyboard_agent/models.py), [`agent/api/url_guard.py`](../../agent/api/url_guard.py), and [`agent/tests/test_scan_routes_use_guard.py`](../../agent/tests/test_scan_routes_use_guard.py) enforce safety invariants automatically under `pytest`.
- **What Needed Cloud Access:** Live Amazon Bedrock LLM evaluations and AWS ECS / Vercel deployments require external cloud credentials not configured in local offline testing.
