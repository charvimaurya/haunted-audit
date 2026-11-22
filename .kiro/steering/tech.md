# Tech

The stack as it is in the repo today.

| Part | Choice |
|---|---|
| Language (backend) | Python 3.11 in `.venv`, created with `uv` |
| API | FastAPI + uvicorn (`agent/api/main.py`) |
| Browser control | Playwright for Python, Chromium. Version pinned in `requirements.txt` |
| Agent (LLM mode) | Strands Agents on Amazon Bedrock (Claude), through boto3 |
| Agent (scripted mode) | `agent/keyboard_agent/scripted_walker.py`, same nine keyboard tools |
| Storage | SQLite through the standard `sqlite3` module (`HAUNTED_AUDIT_DB`) |
| Python tests | pytest and Hypothesis (`agent/tests/`) |
| Dashboard | Vite + React + TypeScript + Tailwind in `dashboard/` |
| Dashboard tests | Vitest, Testing Library, jest-axe |
| CI | GitHub Actions `tests.yml`: pytest and dashboard tests |
| Container | `Dockerfile` on the official Playwright Python image. Not deployed yet |

Rules:
- Add a dependency only when the task needs it. Pin it in `requirements.txt` or `dashboard/package.json`.
- Secrets live in `.env` (git-ignored) or the cloud secret store. Never in code, logs or commits. Copy `.env.example` to start.
- AWS credentials come from a profile or a role. Never put keys in the repo or an image.
- The existing hook script (`.kiro/scripts/axe-on-save.mjs`) is Node. New hook scripts are Python.
- Before writing new agent instructions, check whether a skill already covers it. Skills live in `.kiro/skills/<name>/SKILL.md`.
- Run tests before a pull request: `.venv/bin/python -m pytest -q` and `cd dashboard && npm test`.
