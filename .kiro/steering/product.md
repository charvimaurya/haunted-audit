# Product

Haunted Audit is an accessibility guardrail for AI-built apps. A keyboard-only agent tries a user journey, a deterministic checker decides pass or fail, a person approves any fix.
The full rules are in `product-rules.md` and `product-ux.md`. This file is the short version.

- The loop is Find, Experience, Fix, Verify, Prevent, in that order.
- The ghost is an accessibility barrier. Purple is Ready, red is Blocked, green is Verified.
- The checker (`agent/keyboard_agent/checker.py`) alone sets `verdict` and `reason_code`. An agent's claim is only `agent_claim`.
- Rules decide anything with one right answer. A model is used only where several answers are valid.
- A person approves anything that changes code. Nothing is applied without that approval.
- Agents run only on the bundled Haunted Bank (`fixtures/haunted_bank/`). Never on an outside site.
- Never show a number that was not measured. Show `--` and "not yet measured".
- Every result shows its `agent_mode` (`scripted` or `llm`).
- "Built with Kiro" is plain text wherever the project is credited.
