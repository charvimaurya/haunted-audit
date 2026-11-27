# Night Watch

Scheduled nightly regression monitoring for Haunted Audit (`Send Payment` journeys on `broken` and `fixed` variants across `scripted` and optional `llm` modes).

## Quick Run

```bash
python -m night_watch.run_journeys --dry-run
python night_watch/run_journeys.py
```

## Running 24/7 with Docker

Use the official Kiro Crew Docker image (`ghcr.io/kirodotdev/kirocrew:stable`) so nightly `02:00 UTC` checks are not missed when your laptop is closed:

1. Mount the Haunted Audit repository workspace directory into the container so `night_watch/run_journeys.py` can reach the project files and SQLite database (`HAUNTED_AUDIT_DB`, default `data/runs.db`).
2. Mount a persistent `kirocrew-home` Docker volume so Kiro Crew retains memory and cron registrations (`night_watch/app.json`).
3. Ensure the Haunted Audit FastAPI backend is reachable from inside the Kiro Crew container (either join the same Docker network, e.g. `--network haunted-net` with `HAUNTED_AUDIT_API_URL=http://haunted-audit-api:8000`, or expose the API on a non-loopback address instead of `127.0.0.1`).

Example command:

```bash
docker run -d --name haunted-night-watch \
  --network haunted-net \
  -p 3100:3100 \
  -v "$(pwd):/workspace" \
  -v kirocrew-home:/root/.kirocrew \
  -e HAUNTED_AUDIT_API_URL=http://haunted-audit-api:8000 \
  -e HAUNTED_AUDIT_DB=/workspace/data/runs.db \
  ghcr.io/kirodotdev/kirocrew:stable
```
