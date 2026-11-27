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
| `docs/` | `devlog.md`, `decision-log.md`, `evidence.md`, archived notes (`docs/archive/`), plans |
| `scripts/` | helper scripts (seed export, planted export, container smoke test) |
| `.kiro/` | steering, specs, agents, hooks, skills, and scripts |
| `backend/` | `mcp_server.py` and `scan_file.py` (shared with `power/server/`) |
| `bank/` | `PLANTED.md` barrier answer key |
| `prompts/` | agent prompt templates |
| `power/` | Kiro Power package (`mcp.json`, `hooks/`, `server/`, `skills/`) |
| `tests/` | `journeys/` Playwright regression tests and `unit/` Python unit tests |

Rules:
- Keep the existing layout. Say so in the pull request if a task needs a new folder.
- A feature needs a spec in `.kiro/specs/<name>/` before code.
- Prompts for agents go in `prompts/`, not inside code, once an agent is built.
- One component per file in `dashboard/src/components/`, props typed.
- Generated output (`artifacts/`, `data/`, `dist/`) is git-ignored.
