# Haunted Audit dashboard

Vite, React, and TypeScript UI for the Costume Contest demo. It calls the FastAPI keyboard agent and draws the live focus trail, the ghost, and the checker verdict.

The checker is the only source of `verdict` and `reason_code`. Unmeasured numbers render as `--`.

```bash
npm install
npm run dev
```

The dev server is `http://127.0.0.1:5173` and proxies `/runs` and `/health` to `http://127.0.0.1:8000`. Start the API from the repo root first:

```bash
.venv/bin/python -m uvicorn agent.api.main:app --host 127.0.0.1 --port 8000
```

```bash
npm test
npm run build
```
