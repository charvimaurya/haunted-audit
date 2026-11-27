---
name: haunted-audit
version: "1.0"
description: "Keyboard and accessibility barrier detection for AI-built UIs"
keywords:
  - accessibility
  - keyboard
  - WCAG
  - focus
  - screen reader
  - aria
  - tabindex
  - a11y
  - barrier
  - contrast
---

# Haunted Audit Kiro Power

Haunted Audit connects Kiro directly to axe-core component scanning, real keyboard-only Playwright journeys, deterministic patch proposals, temporary-copy fix verification, and regression test discovery inside this workspace.

## Tools

| Tool | Description | Key inputs |
| --- | --- | --- |
| `scan_url` | Run axe-core WCAG scan against a running URL via Node subprocess | `url`, `tags` |
| `scan_file` | Map a workspace component file path to dev-server routes and scan | `path` |
| `run_journey` | Start a keyboard-only journey (`broken` or `fixed`) on Haunted Bank | `journey_id`, `variant`, `mode` |
| `get_run` | Fetch journey status, deterministic verdict, steps, and blocked element | `run_id` |
| `propose_fix` | Propose a deterministic accessibility patch diff for human approval | `run_id` |
| `verify_fix` | Apply an approved patch on a temporary copy and replay the journey | `run_id`, `patch` |
| `list_regression_tests` | Discover keyboard & E2E regression tests and cached CI outcomes | *(none)* |

## Mandatory Workflow Constraints

1. **Agents propose:** `propose_fix` computes a patch diff without modifying workspace source files.
2. **Humans approve:** A developer explicitly reviews and approves the diff before verification.
3. **Verify on a copy:** `verify_fix` applies the patch to an isolated temporary copy, never live code.

Built with Kiro
