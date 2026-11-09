# Haunted Audit — Product Rules

These rules govern every part of the Haunted Audit codebase and UI.  
Built with Kiro.

---

## Identity

**Haunted Audit** is an AI accessibility engineer for the Kiroween 2026 Costume Contest.

---

## Audit Flow

Every feature and every agent session must follow this five-stage pipeline, in order:

1. **Find** — detect the accessibility barrier
2. **Experience** — simulate what a keyboard user encounters
3. **Fix** — apply or propose a repair
4. **Verify** — confirm the barrier is gone with the deterministic checker
5. **Prevent** — surface the pattern so it cannot recur

---

## Ghost Mascot

The ghost IS the accessibility barrier. The mascot is functional, never purely decorative.

| State | Colour | Meaning |
|---|---|---|
| Ready | Purple (`#c9b6ff`) | No barrier detected; the agent is waiting or the journey has not started |
| Blocked | Red | A barrier was found; the ghost is pinned to the `BlockedElement.bounding_box` |
| Verified | Green | The checker returned PASSED; the barrier has been resolved |

Rules:
- Ghost position comes from `BlockedElement.bounding_box` (measured by the checker). Never invent coordinates.
- The mascot `<div>` in `fixtures/haunted_bank/index.html` carries `aria-hidden="true"` because it is visual shorthand. The real information is conveyed in text and structured data.

---

## Verdict Authority

- **Agents never decide pass/fail.** The deterministic checker (`checker.py`) holds sole authority over `verdict` and `reason_code`.
- An agent's `declare_done` call is recorded as `agent_claim` only. Mismatches are flagged in `agent_claim_mismatch`.
- Rules that have only one correct answer are enforced by deterministic code. AI judgement is reserved for tasks where multiple valid answers exist.
- A human approves anything that changes code.

---

## Metrics and Rendering

- **Never hardcode or invent metrics.** If a value has not been measured in the current run, render it as `--` with the label "not yet measured".
- Every result display must show `agent_mode` (`"llm"` or `"scripted"`) alongside the metrics.
- `TokenUsage` fields (`input_tokens`, `output_tokens`, `total_tokens`) are `0` for scripted mode. Display `0`, not `--`, when scripted mode ran successfully.
- `cost_usd` follows the same rule: `0.0` for scripted, measured value for LLM.
- `latency_ms` is always measured from wall clock; it is never estimated.

---

## Information Barrier

- `target_selector` and `success_selector` live in `JourneyConfig` and are **checker-only**.
- They must never appear in any agent prompt (enforced by `_reject_leaked_selectors` in `agent.py`).
- The scripted walker must not read `config.target_selector` or `config.success_selector` at any point.

---

## Agent Mode Contract

- Both `"llm"` and `"scripted"` modes must use the same nine keyboard tools and the same checker.
- LLM mode uses Amazon Bedrock (Strands Agents SDK). Missing AWS credentials raise `RuntimeError`; no fake token counts or reliability scores are invented.
- Scripted mode is the deterministic baseline. It always produces the correct verdict and records zero tokens and zero cost.

---

## Reliability Gate (Eval)

- A mode is **reliable** only when ≥ 4 of 5 runs produce the correct verdict for each variant.
  - `broken` correct = `BLOCKED` / `TARGET_NOT_FOCUSABLE` with a measured bounding box on `div.pay-btn`
  - `fixed` correct = `PASSED` with no reason code
- The GO/NO-GO decision applies to the LLM mode only. The scripted walker does not require a reliability gate.
- Every number in the eval report is computed from the runs just executed. Historical numbers are never reused.

---

## Dashboard (dashboard/)

The React/Tailwind dashboard at `dashboard/` implements the v7 frozen design. Rules:

- **Do not redesign.** Match layout, palette, copy, and components from `design/Haunted_Audit_Final_UI_v7.png`.
- Colors are extracted into Tailwind tokens (`tailwind.config.js`) and CSS variables (`src/index.css`). Do not hardcode hex values outside those two files.
- Spooky display font (`Uncial Antiqua`) is used **for the wordmark only**. All other UI text uses `Inter`. Code uses `JetBrains Mono`.
- One component per file in `src/components/`. All component props are typed (TypeScript interfaces).
- Unmeasured metrics render as `--` (never a fabricated number). `agent_mode` is shown beside every metric.
- Ghost mascot: `GhostMascot` component, `state` prop drives colour — purple (`#c9b6ff`) = Ready, red (`#ef4444`) = Blocked, green (`#22c55e`) = Verified.
- "The Outcome" card uses parchment colours (`#f5e6c8` / `#e8d0a0`) with ink text (`#3b2a0e`).
- All interactive elements have visible focus indicators (3px `#a855f7` outline, WCAG 2.4.7).
- Reduced-motion preference respected via `@media (prefers-reduced-motion: reduce)`.

## Attribution

Say **"Built with Kiro"** as plain text wherever the project is credited.
