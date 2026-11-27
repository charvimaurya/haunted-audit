---
name: keyboard-journey
description: Run a keyboard-only payment journey on Haunted Bank and report focus barriers
tools:
  - run_journey
  - get_run
---

# Keyboard Journey

## When to use

Use when verifying whether a user can complete Send Payment using only keyboard navigation (`Tab`, `Enter`, typing).

## Steps

1. Call `run_journey(journey_id="send-payment", variant=variant, mode="scripted")`.
2. Poll `get_run(run_id)` every 2 seconds until `status` is `"complete"` or `"error"`.
3. Report `blocked_element.selector`, `reason_code`, and `step_count`.
4. Map status to ghost state:
   - Purple -> running (`status == "running"`)
   - Red -> `BLOCKED`
   - Green -> `PASSED`
5. Include the affected WCAG criteria when `verdict == "BLOCKED"` (for example WCAG 2.1.1 Keyboard / 4.1.2 Name, Role, Value).
6. End with an explicit `agent_mode` attribution line (`agent_mode: scripted` or `llm`).

## Output format

Structured journey summary showing verdict, ghost state, blocked selector, step count, and `agent_mode`.

## Constraints

- Note that `mode="llm"` requires configured AWS Bedrock credentials (`AWS_REGION`, `BEDROCK_MODEL_ID`); scripted mode runs locally without AWS credentials.
