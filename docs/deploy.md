# Haunted Audit — Deployment Runbook

> Status note: Render + Vercel container/frontend wiring and `render.yaml` are configured in this repo. AWS ECR/ECS Express, IAM role provisioning, GitHub OIDC, and AWS Budgets commands below are prepared from `.kiro/specs/staging-deployment/` and marked **not yet run locally** until executed in an AWS-authenticated environment with Docker.

## 1. Architecture Overview

- **Dashboard (`dashboard/`):** Static React + Vite + HeroUI SPA hosted on **Vercel** (`Root Directory: dashboard`, rewrite rule in `dashboard/vercel.json`).
- **API (`agent/api/main.py` + `backend/` + `night_watch/`):** Containerized FastAPI + Playwright Chromium service (`Dockerfile`, `HAUNTED_AUDIT_CONTAINER=1`, `HAUNTED_AUDIT_DB=/tmp/runs.db`).
- **Live URL caveat:** Container ephemeral storage resets `/tmp/runs.db` across container redeploys; only seeded replays in `docs/evidence-seed.json` are restored on startup (`RunStore.load_seed`).
- **Split-origin places where URLs must match:**
  - Vercel Environment Variable `VITE_API_URL` -> your backend origin (no trailing `/`), set before building/redeploying Vercel.
  - Backend Environment Variable `CORS_ALLOWED_ORIGINS` -> exact comma-separated dashboard origin(s), e.g. `https://haunted-audit.vercel.app` (never `*`).

## 2. Local Container Smoke Test (not run — requires Docker Desktop)

```bash
docker build -t haunted-audit-api .
bash scripts/smoke_container.sh haunted-audit-api
```

## 3. Render + Vercel Split Deployment

1. **Backend (Render Docker service from repo root `.`):**
   - Uses `Dockerfile` / `render.yaml`, health check `/ping`, dynamic `--port ${PORT:-8000}`.
   - Env vars: `HAUNTED_AUDIT_DB=/tmp/runs.db`, `LLM_ENABLED=false`, `CORS_ALLOWED_ORIGINS=https://<your-vercel-domain>`.
2. **Frontend (Vercel `Root Directory: dashboard`):**
   - Env var: `VITE_API_URL=https://<your-backend-domain>`.
   - Trigger **Redeploy** so Vite embeds `VITE_API_URL`.

## 4. AWS ECS Express Staging Commands (not run locally)

Requires IAM admin / `aws configure --profile haunted-audit` (`us-east-1`):

```bash
# 4a. ECR repository and push (not run)
aws ecr create-repository --repository-name haunted-audit-api --image-scanning-configuration scanOnPush=true --region us-east-1
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
docker tag haunted-audit-api:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/haunted-audit-api:manual-1
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/haunted-audit-api:manual-1

# 4b. IAM roles from iam/*.json (not run)
# Replace <ACCOUNT_ID> at runtime only; never commit real account IDs.
aws iam create-role --role-name haunted-audit-execution --assume-role-policy-document file://iam/trust-ecs-tasks.json
aws iam attach-role-policy --role-name haunted-audit-execution --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
aws iam create-role --role-name haunted-audit-infra --assume-role-policy-document file://iam/trust-ecs.json
aws iam create-role --role-name haunted-audit-task --assume-role-policy-document file://iam/trust-ecs-tasks.json
aws iam put-role-policy --role-name haunted-audit-task --policy-name bedrock-invoke-one-model --policy-document file://iam/task-bedrock.json

# 4c. CloudWatch log group & Express service (not run)
aws logs create-log-group --log-group-name /haunted-audit/api --region us-east-1
aws logs put-retention-policy --log-group-name /haunted-audit/api --retention-in-days 30 --region us-east-1
aws ecs create-express-gateway-service --service-name haunted-audit-api --region us-east-1

# 4d. Budget notifications (not run; copy budget-notifications.example.json -> budget-notifications.json)
aws budgets create-notification --account-id <ACCOUNT_ID> --budget-name haunted-audit-monthly --notifications-with-subscribers file://budget-notifications.json
```

## 5. Verification Checklist

1. `GET <API_URL>/ping` returns `200 {"status":"ok"}`.
2. `GET <API_URL>/openapi.json` includes `/runs`, `/voice-runs`, `/scan`, `/sandbox/{scenario_id}`, `/night-watch/history`.
3. Private browser window opens `<VERCEL_URL>`, reloads deep links without 404, sends `POST /runs` & `POST /scan` to `<API_URL>` with matching `access-control-allow-origin`.
4. Rapid `POST /runs` bursts return `429` with `Retry-After`.
