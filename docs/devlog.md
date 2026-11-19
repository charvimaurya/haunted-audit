# Devlog

Built from git history and the README only. Dates are commit dates.

- 2026-11-06: Initial commit with a one-line README.
- 2026-11-08: Repo skeleton. Placeholder folders for `backend`, `bank`, `dashboard`, `evals`, `power`, `prompts`, `skills`, `tests` and `.kiro` (agents, hooks, specs, steering), plus docs files (`decision-log.md`, `devlog.md`, `evidence.md`) and empty GitHub issue, pull request and workflow templates.
- 2026-11-09: Keyboard agent added. Nine keyboard-only tools, a scripted walker, an LLM agent (Strands on Amazon Bedrock), a deterministic checker that decides `PASSED` or `BLOCKED`, a runner, a FastAPI run API with Server-Sent Events, an eval script with a 4-of-5 reliability gate, and the Haunted Bank test site with `broken` and `fixed` variants. pytest and Hypothesis tests came with it. The README reports the scripted walker at 5 of 5 correct on both variants; LLM mode was not scored because Bedrock credentials were not configured.
- 2026-11-09: Dashboard added (Vite and React), with axe accessibility tests, in the same commit as the agent.
- 2026-11-09: Kiro setup committed: steering rules (`product-rules.md`), an axe-on-save hook and script, and specs for the frontend, the Kiro integration, and Night Watch (requirements only).
- 2026-11-09: GitHub Actions workflow added to run the keyboard-agent and dashboard tests on every push.
- 2026-11-09: Immersive layer added to the dashboard (decorative ghost and particles loaded lazily, ambient ghost sent slowly from left to right, Calm mode and sound switches, with tests), plus a GitHub Pages workflow to publish the dashboard and four new lines in the steering rules.
- 2026-11-09: Vite dev server configured to accept the live preview host.
