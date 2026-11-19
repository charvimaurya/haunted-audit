# Staging deployment - Requirements

**Goal:** a public link that works from a private browser window and stays up until **29 January 2027**, inside a **$150** AWS budget, with no secrets in Git.
**Steering:** `product-rules.md` (verdict authority, no invented metrics, agents only on the bundled fixture, human approves anything that changes code), `product-ux.md` (real content only, "Built with Kiro").
**Builds on:** `agent/api/main.py`, `agent/keyboard_agent/{runner,agent}.py`, `fixtures/haunted_bank/`, `dashboard/`, `.github/workflows/tests.yml`.
**Related specs:** `product-shell-ia` (also writes `dashboard/vercel.json`; same content, whichever lands first wins), `llm-agent-eval` (Bedrock model choice), `fix-verify-prevent` (the evidence log this spec seeds).

## Conventions

EARS: WHEN trigger THE SYSTEM SHALL response. IF condition THEN ...

Terms:
- **Staging:** the one public environment. There is no separate production.
- **Express service:** an Amazon ECS Express Mode service (managed ALB, HTTPS URL, Fargate tasks, auto scaling).
- **Task role:** the IAM role the running container uses to call AWS APIs. **Execution role:** used by ECS to pull the image and write logs. **Infrastructure role:** used by ECS to create the ALB and related resources.
- **Deadline:** 29 January 2027 (inclusive).
- **Scan-only:** the system reads a public page and reports; it never submits forms, logs in, or changes anything on that site.

---

## REQ-LIVE - The live link

### REQ-LIVE-01 Works signed out
WHEN the Vercel production URL is opened in a private window with no cookies, no login and no extra headers THE SYSTEM SHALL load the dashboard and let the visitor start a run.

### REQ-LIVE-02 Stays up
THE SYSTEM SHALL keep the Vercel site and the Express service reachable from the day it is first verified until the Deadline. The service SHALL replace a failed task automatically.

### REQ-LIVE-03 Honest state
WHEN the backend is unreachable THE SYSTEM SHALL show the dashboard's existing offline state, not an empty or fake result.

### REQ-LIVE-04 URL change handling
THE SYSTEM SHALL document that a deleted-and-recreated Express service gets a new URL, and the runbook SHALL list every place the URL is used (Vercel `VITE_API_URL`, CORS variable, README link).

---

## REQ-API - Backend changes

### REQ-API-01 Health check
THE SYSTEM SHALL serve `GET /ping` returning HTTP 200 and `{"status":"ok"}` with no database, browser or AWS call. `/health` SHALL stay as is.

### REQ-API-02 SSE keep-alive
WHILE an event stream (`GET /runs/{id}/events`) is open and idle THE SYSTEM SHALL send an SSE comment line (`: keep-alive`) every 15 seconds. Comment lines SHALL NOT change event ids, event data or the `done` event.

### REQ-API-07 Stream resume
WHEN a client reconnects with a `Last-Event-ID` header THE SYSTEM SHALL continue after that event id instead of replaying earlier events.

### REQ-API-03 Stream headers
THE SYSTEM SHALL send `Cache-Control: no-cache` and `X-Accel-Buffering: no` on the event stream.

### REQ-API-04 CORS allow-list
THE SYSTEM SHALL read allowed origins from the `CORS_ALLOWED_ORIGINS` environment variable (comma separated exact origins). It SHALL NOT allow `*`. It SHALL allow only `GET`, `POST`, `OPTIONS` and the `Content-Type` header, and no credentials.

IF `CORS_ALLOWED_ORIGINS` is unset THEN the default SHALL be the local dev origins `http://localhost:5173` and `http://127.0.0.1:5173` only.

### REQ-API-05 Container binding
THE SYSTEM SHALL listen on `0.0.0.0:8000` in the container and honour the load balancer's forwarded client address (REQ-SAFE-04).

### REQ-API-06 Logging
THE SYSTEM SHALL write structured one-line JSON logs to stdout (request id, method, path, status, duration, run id when known). Logs SHALL NOT contain request bodies, credentials or tokens.

---

## REQ-IMG - Container image

### REQ-IMG-01 Base image
THE SYSTEM SHALL build from the official Playwright Python image (`mcr.microsoft.com/playwright/python`) whose tag matches the pinned `playwright` version in `requirements.txt`. A test SHALL fail if the two drift.

### REQ-IMG-02 Chromium launches
WHEN `HAUNTED_AUDIT_CONTAINER=1` THE SYSTEM SHALL launch Chromium with `--no-sandbox` and `--disable-dev-shm-usage`. Outside containers it SHALL keep the default sandboxed launch.

### REQ-IMG-03 Non-root, clean signals
THE SYSTEM SHALL run as the image's non-root user and run under an init process so Chromium children are reaped and SIGTERM stops the app.

### REQ-IMG-04 No secrets baked in
THE SYSTEM SHALL NOT copy `.env`, `data/`, `artifacts/`, `.git`, `.venv`, `node_modules` or any credential file into the image (`.dockerignore`). A CI step SHALL fail the build if `.env` is in the build context.

### REQ-IMG-05 Self-test
THE SYSTEM SHALL provide a container smoke test that starts the image, calls `/ping`, runs one scripted `broken` run and one scripted `fixed` run, and gets the correct verdicts from the checker.

---

## REQ-DATA - Run storage

### REQ-DATA-01 Ephemeral SQLite
THE SYSTEM SHALL keep SQLite on the task's ephemeral disk (`HAUNTED_AUDIT_DB=/tmp/runs.db`). It SHALL NOT mount EFS.

### REQ-DATA-02 Seed at startup
WHEN the database has no seeded rows at startup THE SYSTEM SHALL load `docs/evidence-seed.json`. Every seeded row SHALL be a real recorded run (exported from a real run by a script), carry `seeded: true`, its recorded date and its `agent_mode`, and the dashboard SHALL label it "Recorded run, not live".

### REQ-DATA-03 No invented seed
THE SYSTEM SHALL NOT include made-up runs, counts or timings in the seed. IF no real run has been exported THEN the seed file SHALL be `{"runs": []}` and the dashboard SHALL show its normal empty state.

### REQ-DATA-04 One task
THE SYSTEM SHALL run exactly one task (`minTaskCount = maxTaskCount = 1`) because each task has its own database and a run must be streamed from the task that started it.

### REQ-DATA-06 Housekeeping
THE SYSTEM SHALL delete unseeded runs older than 7 days and run artifacts (screenshots) older than 24 hours, at startup and after each run, so the ephemeral disk does not fill.

### REQ-DATA-05 Documented consequence
THE SYSTEM SHALL document in `docs/deploy.md` that runs made on the live site disappear on redeploy, task replacement or restart, and that only the seed file survives.

---

## REQ-AWS - AWS resources and identity

### REQ-AWS-01 Region and registry
THE SYSTEM SHALL use region `us-east-1` and one private ECR repository `haunted-audit-api` with image scanning on push and a lifecycle rule keeping the 5 most recent images.

### REQ-AWS-02 Express deploy
THE SYSTEM SHALL create the service with `aws ecs create-express-gateway-service` using an execution role and an infrastructure role, container port 8000, health check path `/ping`, and a `Project=haunted-audit` tag. `docs/deploy.md` SHALL give the exact commands.

### REQ-AWS-03 Task role, least privilege
THE SYSTEM SHALL attach a task role whose only permission is `bedrock:InvokeModel` (plus `bedrock:InvokeModelWithResponseStream` only if the chosen client call needs it, see design D6) on the chosen model's ARNs. It SHALL trust only `ecs-tasks.amazonaws.com`.

### REQ-AWS-04 No keys in the container
THE SYSTEM SHALL NOT set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` or `AWS_SESSION_TOKEN` in the image, task or service. The AWS SDK SHALL get credentials from the task role.

### REQ-AWS-05 Other secrets
IF the service needs any other secret THEN it SHALL come from Secrets Manager or SSM Parameter Store through the service's `secrets` setting, readable by the execution role only for those ARNs. Plain configuration (model id, origins, limits) SHALL be ordinary environment variables.

### REQ-AWS-06 Logs
THE SYSTEM SHALL send container logs to CloudWatch Logs. The log group SHALL have a retention of 30 days (Express Mode creates groups that never expire).

### REQ-AWS-07 Tagging
THE SYSTEM SHALL tag every resource it creates with `Project=haunted-audit` and `Environment=staging` where tagging is supported.

---

## REQ-WEB - Frontend on Vercel

### REQ-WEB-01 Project
THE SYSTEM SHALL deploy `dashboard/` as a Vercel project (Root Directory `dashboard`, framework Vite, build `npm run build`, output `dist`).

### REQ-WEB-02 API URL
THE SYSTEM SHALL set `VITE_API_URL` in Vercel's Production environment to the Express service's `https://` URL with no trailing slash. This is configuration, not a secret.

### REQ-WEB-03 SPA rewrite
THE SYSTEM SHALL ship `dashboard/vercel.json` with a rewrite of all paths to `/index.html`.

### REQ-WEB-04 Public access
THE SYSTEM SHALL have Vercel Deployment Protection set so the Production domain is public. The verification SHALL be done in a private window.

### REQ-WEB-05 No secrets in the bundle
THE SYSTEM SHALL NOT put any secret in a `VITE_` variable. A CI check SHALL grep the built `dist/` for `AKIA`, `ASIA`, `aws_secret` and `BEGIN PRIVATE KEY`.

---

## REQ-CI - Pipeline

### REQ-CI-01 Triggers
WHEN a commit is pushed to `main` THE SYSTEM SHALL run `pytest`, then build the image, push it to ECR, and deploy it. Pull requests SHALL run tests only. `workflow_dispatch` SHALL be allowed for a manual redeploy.

### REQ-CI-02 Order and gating
THE SYSTEM SHALL deploy only if tests and the container smoke test pass.

### REQ-CI-03 OIDC only
THE SYSTEM SHALL authenticate to AWS with `aws-actions/configure-aws-credentials` and `role-to-assume` over GitHub OIDC. The repository SHALL hold no AWS access keys. The role's trust policy SHALL allow only this repository and the `main` branch (`repo:charvimaurya/haunted-audit:ref:refs/heads/main`).

### REQ-CI-04 Deploy action
THE SYSTEM SHALL deploy with `aws-actions/amazon-ecs-deploy-express-service`, passing the image tagged with the commit SHA (never `latest`).

### REQ-CI-05 Least privilege for CI
THE SYSTEM SHALL give the CI role only the ECR push permissions for the one repository, the ECS Express actions the deploy action lists, and `iam:PassRole` for the three named roles.

### REQ-CI-06 Config as variables
THE SYSTEM SHALL keep account id, role ARNs and names in GitHub repository **variables** (not secrets, not in files). The workflow SHALL fail with a clear message if one is missing.

### REQ-CI-07 Concurrency
THE SYSTEM SHALL allow one deploy at a time (`concurrency` group, no cancel of a running deploy).

---

## REQ-SAFE - Cost and safety

### REQ-SAFE-01 Budget
THE SYSTEM SHALL have an AWS Budget of $150 with email alerts at 50%, 80% and 100% of actual spend. The alert address SHALL be set at creation time and not committed to the repository.

### REQ-SAFE-02 Cost visibility
`docs/deploy.md` SHALL include a cost estimate with its inputs and the date prices were checked, and SHALL say which lines were measured and which were assumed. After 7 days of running, the real figure from Cost Explorer SHALL replace the estimate in the devlog.

### REQ-SAFE-03 Public URLs are scan-only
WHEN a visitor submits a URL to be scanned THE SYSTEM SHALL accept only `http` and `https`, fetch with read-only methods, never submit forms or execute actions, and apply the address checks in REQ-SAFE-05.

### REQ-SAFE-04 Rate limits
THE SYSTEM SHALL rate-limit by client address (the address the load balancer appended, not a client-supplied one): at most 5 `POST /runs` per minute and 30 per hour per address, and at most 2 runs executing at once for the whole service. Over the limit it SHALL return HTTP 429 with `Retry-After` and a plain-English message. The numbers are settings with these defaults.

### REQ-SAFE-05 Private and local addresses blocked
THE SYSTEM SHALL block any scan target that resolves to loopback, private (RFC 1918), link-local (including `169.254.169.254` and the ECS credential endpoint `169.254.170.2`), carrier-grade NAT, multicast, reserved or unspecified addresses, IPv6 equivalents, and IPv4-mapped IPv6 forms. It SHALL reject URLs with embedded credentials (`user:pass@`), non-standard schemes, and hostnames like `localhost`.

THE SYSTEM SHALL resolve the name once, connect to that resolved address, and re-check every redirect hop (no DNS-rebinding gap). It SHALL cap redirects, response size and time.

### REQ-SAFE-06 Guard exists before any scan endpoint
THE SYSTEM SHALL implement the guard and its tests in this spec. WHERE no scan endpoint exists yet THE SYSTEM SHALL NOT expose one; any future scan route SHALL call the guard first (a test enforces that the route module imports it).

### REQ-SAFE-07 Agents only on the bundled site
THE SYSTEM SHALL NOT accept a URL, path or selector in `POST /runs` (unknown fields are rejected with 422). THE SYSTEM SHALL start the agent's browser only on the bundled Haunted Bank file and SHALL abort every browser request that is not that file.

### REQ-SAFE-08 LLM mode is capped
WHILE staging is public THE SYSTEM SHALL default to `scripted` mode. `llm` mode SHALL run only when `LLM_ENABLED=true` and SHALL be limited to `LLM_DAILY_RUN_CAP` runs per UTC day (default 20). Over the cap it SHALL return 429 and the dashboard SHALL say LLM mode is paused, with the cap's reason. Scripted mode keeps working.

### REQ-SAFE-09 Verdict authority unchanged
THE SYSTEM SHALL keep the checker as the only source of `verdict` and `reason_code`. Seeded and live results SHALL both show `agent_mode`. Unmeasured figures stay `--`.

### REQ-SAFE-10 Secrets out of Git
THE SYSTEM SHALL keep `.env` ignored, SHALL commit only `.env.example` with empty values, and a CI step SHALL run a secret scan (gitleaks) on every push. IF a secret is ever committed THEN the runbook says to rotate it first and clean history second.

---

## REQ-VER - Verification and runbook

### REQ-VER-01 Live check
THE SYSTEM SHALL be verified, once after the first deploy and again after the last change before the Deadline, by: opening the Vercel URL in a private window; running `broken` then `fixed`; confirming the event stream delivers steps live; calling `/ping` on the Express URL; and confirming CloudWatch shows the run's log lines. Each step SHALL be recorded in `docs/devlog.md` with the date and what was actually seen.

### REQ-VER-02 Honest record
THE SYSTEM SHALL NOT record a verification step that was not performed. A step that fails SHALL be recorded as failed with the fix.

### REQ-VER-03 Runbook
`docs/deploy.md` SHALL contain: first-time setup, the exact commands, a redeploy procedure, a teardown procedure (delete the service, its ALB resources, the log group, ECR images, roles, budget), a rollback procedure, a cost check, and a "what to do on the budget alert" section.

### REQ-VER-04 Teardown tested
THE SYSTEM SHALL be torn down and redeployed once from the runbook before the Deadline, and the result recorded in the devlog.

### REQ-VER-05 Attribution
THE SYSTEM SHALL say "Built with Kiro" in the deploy doc footer.
