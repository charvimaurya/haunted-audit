# Structure

Where things live. Match by purpose; do not move files to fit an older plan.

| Path | What |
|---|---|
| `agent/keyboard_agent/` | agent, scripted walker, tools, checker, runner, models |
| `agent/api/` | FastAPI app, rate limits, URL guard |
| `agent/eval/` | repeated-run eval and its GO or NO-GO report |
| `agent/tests/` | pytest and Hypothesis tests |
| `fixtures/haunted_bank/` | the test bank page (`?variant=broken` or `fixed`) |
| `dashboard/` | Vite + React app and its tests |
| `evals/cases.yaml` | one case per planted barrier and per failure seen |
| `docs/` | `devlog.md`, `decision-log.md`, `evidence.md`, plans |
| `scripts/` | helper scripts (seed export, container smoke test) |
| `.kiro/steering/` | rules Kiro reads on every request |
| `.kiro/specs/` | one folder per feature: requirements, design, tasks |
| `.kiro/agents/` | the seven agent files |
| `.kiro/hooks/` | hooks and `.kiro/scripts/` for their scripts |

Placeholders (a README only, no code yet): `backend/`, `bank/`, `prompts/`, `skills/`, `power/`, `tests/journeys/`, `tests/unit/`.

Rules:
- Keep the existing layout. Say so in the pull request if a task needs a new folder.
- A feature needs a spec in `.kiro/specs/<name>/` before code.
- Prompts for agents go in `prompts/`, not inside code, once an agent is built.
- One component per file in `dashboard/src/components/`, props typed.
- Generated output (`artifacts/`, `data/`, `dist/`) is git-ignored.
