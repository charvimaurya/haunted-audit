# Haunted Audit — Project Handover

Credits: Built by **Shilpa, Sukhda & Charvi** with **Kiro** and Claude AI.

## What Is Built & Working Locally

1. **FastAPI Guardrail Backend (`agent/api/main.py`)**
   - `POST /runs`, `GET /runs/{id}`, `GET /runs/{id}/events` (SSE keyboard journey runs).
   - `POST /voice-runs` (voice-command accessible-name simulation).
   - `POST /runs/{id}/fixes`, `POST /fixes/{id}/approve`, `POST /fixes/{id}/reject`, `POST /fixes/{id}/verify`, `POST /fixes/{id}/regression`.
   - `POST /scan` (`backend/scanner/axe_scanner.py` + `agent/api/url_guard.py` SSRF guard + 1/min rate limit).
2. **React + HeroUI Dashboard (`dashboard/`)**
   - Responsive dark Halloween interface with HeroUI `Navbar`, grouped desktop sidebar, compact tablet icon rail, mobile drawer + iOS bottom dock (hidden on Home), interactive ghost + cursor trail, Web Audio cavern drone + button click SFX, and per-page spotlight Live Tour (`InteractiveTour.tsx`).
   - Whole-euro & two-decimal test amounts (`90`, `90.5`, `90.55` -> `90.00`, `90.50`, `90.55`) across `TestDetailsForm.tsx`, `models.py`, and `fixtures/haunted_bank/index.html`.
3. **MCP Server, Power & Codespaces**
   - `backend/mcp_server.py` and `power/server/mcp_server.py` expose `scan_page` and `run_journey` (refusing external URLs).
   - `.devcontainer/devcontainer.json` supports one-click GitHub Codespaces setup.

## How to Run Locally

```bash
# Terminal 1 — API
.venv\Scripts\python -m uvicorn agent.api.main:app --host 127.0.0.1 --port 8000

# Terminal 2 — Dashboard
cd dashboard && npm run dev -- --host 127.0.0.1 --port 5173
```

## Unfinished / External Cloud Items (`Sukhda plan v5.7`)

- **AWS ECS + Vercel public deploy (Items 8, 9, 11, 34):** Requires AWS account/IAM permissions, Docker image push to ECR, Vercel repository approval, and production release tagging (`not checked` locally).
- **Bedrock LLM evals:** Requires valid AWS Bedrock credentials (`LLM_ENABLED=true`). Local scripted mode and scripted Exorcist run without cloud credentials.
- **Recorded-run automatic UI switch:** Live dashboard shows `Offline` status when `/health` fails cleanly without spoofing results; recorded seed fixtures remain in `docs/evidence-seed.json`.

## Known Issues

- **Internal test details default:** Direct API/CLI callers to `POST /runs` that omit `recipient`/`amount` fall back to `INTERNAL_DEFAULT_DETAILS` in `agent/keyboard_agent/models.py` (never displayed in the UI or pre-filled in form inputs).
- **Frozen v7 reference image:** `design/Haunted_Audit_Final_UI_v7.png` shows an illustrative name in its mockup; live code starts inputs empty.
