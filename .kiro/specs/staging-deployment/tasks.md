# Staging deployment - Tasks

Order: Dockerfile -> /ping and SSE keep-alive -> ECR push -> IAM roles -> deploy -> Vercel -> CI -> budget alerts -> verification.

## Rules for every task

- **Secrets stay out of Git.** Nothing with an account-specific secret, email or key is committed. Account ids and role ARNs go in GitHub repository variables; placeholders in docs.
- **Write down only what ran.** Commands in `docs/deploy.md` are pasted from commands that worked. If a flag differed from the design, the doc uses the working one and the design is corrected.
- **Never record a verification step that was not performed** (`docs/devlog.md`).
- **Human approval:** anything that creates AWS resources, spends money, or changes IAM is run by you; I prepare the files and commands. I do not run `aws`, `docker push`, or `vercel` commands on my own.
- Each task lists the requirements it satisfies and how it is verified.
- Unit tests are for new code (limits, guard, keep-alive, seed). No test is written for config that cannot be tested locally; those are verified by the checks listed.

---

## Phase 1 - Dockerfile

### TASK-01 Pin Playwright and add container files
**Satisfies:** REQ-IMG-01, REQ-IMG-04
**Steps:**
1. Change `requirements.txt` to `playwright==<installed version>` (read it with `importlib.metadata`; it is 1.64.1 in `.venv` today). Keep `pyproject.toml` as `>=`.
2. Confirm the matching image tag exists: `docker manifest inspect mcr.microsoft.com/playwright/python:v<version>-noble`. If not, use the nearest tag whose Playwright version equals the pip pin, or pin pip to that version. Record which in the devlog.
3. Write `Dockerfile` (design 4), `.dockerignore`, and add `.env` to the ignore list there.
4. Add `tests/unit/test_dockerfile_matches_playwright.py` (compare the `FROM` tag with the pin).
**Verified by:** the new test passes; `docker build` succeeds locally (needs Docker; it is not installed on this machine, so you run it or install Docker Desktop); `docker run --rm haunted-audit-api ls /app` shows no `.env`, `data`, `.git`.

### TASK-02 Chromium launches in the container
**Satisfies:** REQ-IMG-02, REQ-IMG-03, REQ-IMG-05
**Steps:**
1. In `runner.py` add `_launch_args()` (design 3.3) gated on `HAUNTED_AUDIT_CONTAINER=1`.
2. Install `tini` in the image; run as `pwuser`.
3. Write `scripts/smoke_container.sh <image>`: start the container (no `--shm-size`), wait for `/ping`, POST scripted `broken` and `fixed`, poll `GET /runs/{id}` until finished, check `BLOCKED`/`TARGET_NOT_FOCUSABLE` and `PASSED`, print `docker stats --no-stream` memory, stop the container.
4. Unit test for `_launch_args()` with and without the env var.
**Verified by:** the smoke script exits 0 locally. The printed peak memory is written in the devlog and used for the size decision in TASK-10.

---

## Phase 2 - Backend: /ping, SSE keep-alive, CORS, limits, guards

### TASK-03 `/ping`, CORS allow-list, request logs
**Satisfies:** REQ-API-01, REQ-API-04, REQ-API-05, REQ-API-06
**Steps:** add `/ping`; replace `allow_origins=["*"]` per design 3.1; JSON request-log middleware; update `.env.example` (`CORS_ALLOWED_ORIGINS`, `LLM_ENABLED`, `LLM_DAILY_RUN_CAP`, `RATE_PER_MINUTE`, `RATE_PER_HOUR`, `MAX_CONCURRENT_RUNS`, all empty or safe defaults; remove nothing else).
**Verified by:** unit tests: `/ping` is 200 and touches no DB; `*` raises at startup; a request with `Origin: https://evil.example` gets no `access-control-allow-origin`; the configured origin does; preflight allows only the listed methods; the log line contains no body.

### TASK-04 SSE keep-alive, resume, headers
**Satisfies:** REQ-API-02, REQ-API-03, REQ-API-07
**Steps:** implement design 3.2 (injectable `keepalive` and `clock`); read `Last-Event-ID`; add headers.
**Verified by:** unit tests with a fake clock: a comment line appears after the interval and never changes `id:` values or the `done` event; `Last-Event-ID: 3` skips events 1 to 3; invalid id is ignored. Manual: `curl -N` against a local server shows `: keep-alive` on a slow run. Existing `test_api.py` still passes.

### TASK-05 Rate limits, run gate, LLM cap
**Satisfies:** REQ-SAFE-04, REQ-SAFE-08
**Steps:** `agent/api/limits.py` (design 3.4); wire into `POST /runs`; gate released in `finally`; dashboard shows the 429 and "LLM paused" messages using `Retry-After`.
**Verified by:** unit tests with a fake clock: 6th request in a minute is 429 with `Retry-After`; the 31st in an hour is 429; the third concurrent run is 429 and a slot frees after a run ends, including after an exception; spoofed leftmost `X-Forwarded-For` does not change the key; `llm` is refused when `LLM_ENABLED` is not `true` and after the cap, and `scripted` still works; dashboard unit test renders the messages.

### TASK-06 Bundled-site-only agents
**Satisfies:** REQ-SAFE-07, REQ-SAFE-09
**Steps:** `RunCreate` forbids extra fields; install the Playwright route guard in `run_journey` (design 3.5).
**Verified by:** tests: `POST /runs` with `url` gives 422; a test page that requests `http://example.com/` and `http://169.254.170.2/` has both aborted; the normal scripted runs still give the correct verdicts (existing runner and checker tests pass).

### TASK-07 URL guard
**Satisfies:** REQ-SAFE-03, REQ-SAFE-05, REQ-SAFE-06
**Steps:** `agent/api/url_guard.py` and the table of cases in design 3.6 (resolver stubbed, no network); `tests/unit/test_scan_routes_use_guard.py`. No scan route is added.
**Verified by:** every blocked case in the table raises with a plain reason; public example passes; mixed public/private DNS answers are blocked; a redirect to a private address is blocked; the route-guard test passes now (nothing to check) and fails if a `scan` route appears without the import.

### TASK-08 Seed and housekeeping
**Satisfies:** REQ-DATA-01 to REQ-DATA-06
**Steps:**
1. `scripts/export_seed.py`: read finished rows from a local `runs.db`; refuse rows without a result; write `docs/evidence-seed.json`.
2. Run it against real local runs (one `broken`, one `fixed`, scripted). If no real rows exist, run the API locally first and make them; never hand-write rows.
3. `RunStore.load_seed`, `seeded` column, `seeded` in `GET /runs/{id}`, pruning (design 3.7). Dashboard label "Recorded run, not live".
4. Default `HAUNTED_AUDIT_DB` stays `data/runs.db` locally; the image sets `/tmp/runs.db`.
**Verified by:** unit tests: seed loads once and is idempotent; a malformed seed fails loudly at startup; an empty seed gives the empty state; prune removes old unseeded rows and old artifact folders but never seeded rows; the dashboard shows the label for a seeded row and not for a live one.

---

## Phase 3 - ECR push

### TASK-09 ECR repository and first push
**Satisfies:** REQ-AWS-01
**Steps:** you run design 5.1 (create repo, lifecycle policy, login, build, push `manual-1`). I write the commands into `docs/deploy.md` as you confirm they work.
**Verified by:** `aws ecr describe-images --repository-name haunted-audit-api` lists `manual-1`; scan-on-push result checked and any HIGH finding noted in the devlog; lifecycle policy visible in the console.

### TASK-10 Decide task size
**Satisfies:** REQ-SAFE-02
**Steps:** read the peak memory from TASK-02's smoke run. If under about 700 MB choose 0.5 vCPU / 1 GB, else 1 vCPU / 2 GB. Re-do the cost table in `docs/deploy.md` with the prices re-checked on the AWS pricing pages (ALB hour, public IPv4, Fargate) and the date. Tell me the result; if the total is over $150 we pick a lever from design 9 before deploying.
**Verified by:** the doc shows inputs, the date, and which lines are measured versus assumed.

---

## Phase 4 - IAM roles

### TASK-11 Create the roles
**Satisfies:** REQ-AWS-03, REQ-AWS-04, REQ-AWS-05, REQ-AWS-07
**Who does what (three separate parts):**
1. **Kiro authors the files.** `iam/trust-ecs-tasks.json` (trusts only `ecs-tasks.amazonaws.com`), `iam/trust-ecs.json` (trusts only `ecs.amazonaws.com`) and `iam/task-bedrock.json` (`bedrock:InvokeModel` only, `<ACCOUNT_ID>` placeholder). The real account id is never committed. Kiro runs no AWS command.
2. **An IAM administrator creates the roles** with design 5.2: three roles, each tagged `Project=haunted-audit` and `Environment=staging`; the two managed policies; the one inline policy. They need `iam:CreateRole`, `iam:TagRole` (because `create-role` passes `--tags`), `iam:AttachRolePolicy` and `iam:PutRolePolicy`. The deployment permission set `HauntedAuditDeployer` has none of these, by design.
3. **The deployment operator verifies** the roles with the read-only checks below, and records in `docs/deploy.md` only the commands that ran.

**Owner: not yet approved.** This task said "You run design 5.2" (Sukhada) and plan Appendix A step 4 also has Sukhada run the commands, but the plan says Charvi owns AWS access and `HauntedAuditDeployer` has no IAM write permissions. Proposed: Charvi, or another IAM administrator, runs part 2. This is a proposal until the owner and Charvi confirm it.

**Steps:**
1. Before creating anything, the IAM administrator confirms the Bedrock model and inference-profile ids with `aws bedrock list-inference-profiles` (or `get-inference-profile`) and that model access is enabled; Kiro fixes `iam/task-bedrock.json` if the ids differ.
2. Check that the ECS service-linked role exists: `aws iam get-role --role-name AWSServiceRoleForECS`. If it does not, the IAM administrator creates it once with `aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com`. `HauntedAuditDeployer` cannot create it, so the first `create-express-gateway-service` would fail without it. (The load balancer and auto scaling service-linked roles are created by the infrastructure role's managed policy; no manual step.)
3. The IAM administrator runs design 5.2.
4. Wait about a minute for IAM to propagate before TASK-13.

**Hand-off to TASK-13 (prerequisite, not a role step):** the log group `/haunted-audit/api` must exist before `create-express-gateway-service`. Neither role can create it under that name: the execution role's managed policy has only `logs:CreateLogStream` and `logs:PutLogEvents`, and the infrastructure role's managed policy creates log groups only when they carry the tag `AmazonECSManaged=true`. The deployment operator creates it with `aws logs create-log-group --log-group-name /haunted-audit/api --region us-east-1`, then sets 30-day retention. `HauntedAuditDeployer` allows `logs:CreateLogGroup` and `logs:PutRetentionPolicy` on that one group, but **not** tagging: creating a group with `--tags` also needs `logs:TagResource` and `logs:TagLogGroup`, which the permission set does not grant. So, with the current permission set, the group is created **untagged**, which falls short of REQ-AWS-07. Open decision: accept an untagged log group, or have the IAM administrator tag it, or extend the permission set (a change that needs approval).

**Not part of this task:** testing the task role against Bedrock and any streaming permission (TASK-12). `bedrock:InvokeModelWithResponseStream` is not added here.

**Verified by:** `aws iam get-role` for each role shows its one trusted service and the two tags; `aws iam get-role-policy --role-name haunted-audit-task --policy-name bedrock-invoke-one-model` shows one statement with only `bedrock:InvokeModel`; `aws iam list-attached-role-policies` shows only `AmazonECSTaskExecutionRolePolicy` for the execution role, only `AmazonECSInfrastructureRoleforExpressGatewayServices` for the infrastructure role, and nothing for the task role; `aws iam list-role-policies` shows no inline policy for the execution and infrastructure roles; `AWSServiceRoleForECS` exists. (Roles cannot have access keys, so there is nothing to check for keys.)

### TASK-12 Test the task role against Bedrock
**Satisfies:** REQ-AWS-03, design D6
**Steps:** assume the task role from your admin session (`aws sts assume-role`) and run one `llm` call locally with those temporary credentials (a single short run, to keep cost near zero). If `AccessDenied` appears for the streamed call, try `streaming=False` in `_bedrock_model` (check the Strands `BedrockModel` parameter name in the installed version first); only if that fails add `bedrock:InvokeModelWithResponseStream` and record why.
**Verified by:** one llm run completes with real token counts (copy them into the devlog); the final policy is written down. If it cannot be tested yet (no model access), `LLM_ENABLED` stays `false` and the task is marked "not verified".

---

## Phase 5 - Deploy to ECS Express Mode

### TASK-13 Create the service
**Satisfies:** REQ-AWS-02, REQ-AWS-06, REQ-DATA-04, REQ-LIVE-02
**Steps:**
1. Run `aws ecs create-express-gateway-service help`; settle the four open flag questions in design 5.4 and update the design file.
2. Pick the Vercel project name first so `CORS_ALLOWED_ORIGINS` can be set to its production alias now. (Create the empty Vercel project in TASK-14 with that exact name.)
3. You run the create command with `--monitor-resources`. Set log retention to 30 days.
4. Save `<EXPRESS_URL>` for TASK-14.
**Verified by:** `curl -i <EXPRESS_URL>/ping` returns 200; `describe-express-gateway-service` shows ACTIVE, 1 task; `aws logs tail` shows startup lines; a scripted `broken` run through curl returns BLOCKED; `curl -N <EXPRESS_URL>/runs/<id>/events` streams steps live; 6 rapid POSTs show a 429.

---

## Phase 6 - Vercel

### TASK-14 Deploy the dashboard
**Satisfies:** REQ-WEB-01 to REQ-WEB-05, REQ-LIVE-01
**Steps:** add `dashboard/vercel.json` (or leave it if `product-shell-ia` already added it); create the Vercel project (Root Directory `dashboard`); set Production `VITE_API_URL=<EXPRESS_URL>`; confirm Deployment Protection leaves Production public; add the `dist` secret-pattern grep to `tests.yml`'s dashboard job; update README live link and remove the claim that the Pages demo reaches the API.
**Verified by:** private window opens the Vercel URL signed out; a deep link path reloads without a 404; the browser network tab shows `fetch` to `<EXPRESS_URL>` succeeding with an `access-control-allow-origin` equal to the Vercel origin; an `EventSource` stream stays open.

---

## Phase 7 - CI/CD

### TASK-15 GitHub OIDC and variables
**Satisfies:** REQ-CI-03, REQ-CI-05, REQ-CI-06
**Steps:** you run design 5.3 (OIDC provider, deploy role, trust limited to `repo:charvimaurya/haunted-audit:ref:refs/heads/main`). Set repository variables: `AWS_ROLE_TO_ASSUME`, `ECS_EXECUTION_ROLE_ARN`, `ECS_INFRA_ROLE_ARN`, `ECS_TASK_ROLE_ARN`, `ECS_CPU`, `ECS_MEMORY`, `BEDROCK_MODEL_ID`, `CORS_ALLOWED_ORIGINS`, `LLM_ENABLED`. No repository secrets are needed for AWS.
**Verified by:** `aws iam get-role --role-name haunted-audit-github-deploy` shows the `sub` condition; the repo's Settings show no AWS secrets.

### TASK-16 Deploy workflow
**Satisfies:** REQ-CI-01, REQ-CI-02, REQ-CI-04, REQ-CI-07, REQ-SAFE-10, REQ-IMG-04
**Steps:** write `.github/workflows/deploy.yml` (design 6) with action tags checked against their repositories; keep `tests.yml` as is; add `.gitleaks.toml` only if the default rules need an allowlist for `.env.example`.
**Verified by:** a pull request runs tests only and cannot assume the AWS role; a push to `main` runs secret scan, tests, build, smoke test, push and deploy in that order; the run ends with `/ping` 200 on the deployed endpoint; the new image tag equals the commit SHA in ECR and in `describe-express-gateway-service`; a deliberately failing test (on a throwaway branch) stops before the push.

### TASK-17 Redeploy and rollback rehearsal
**Satisfies:** REQ-VER-03
**Steps:** run the workflow twice (a normal push, then `workflow_dispatch` on the previous commit) and time both.
**Verified by:** the older SHA is running after the second run; live link still works; times recorded in the devlog.

---

## Phase 8 - Budget alerts

### TASK-18 AWS Budget
**Satisfies:** REQ-SAFE-01
**Steps:** I add `budget-notifications.example.json` (fake address) and ignore `budget-notifications.json`. You create the real file and run design 5.5. Decide whether to add the extra forecast alert and whether your account supports a window-wide budget.
**Verified by:** `aws budgets describe-notifications-for-budget` lists 50, 80 and 100 percent; the confirmation email arrives and is accepted. (A real alert cannot be forced; the devlog says "configured, not triggered".)

### TASK-19 Cost tags and first cost check
**Satisfies:** REQ-SAFE-02, REQ-AWS-07
**Steps:** activate the `Project` cost allocation tag; after 7 days read Cost Explorer filtered by it (and the unfiltered total); replace the estimate in `docs/deploy.md` and the devlog with the measured figure and the projection to 29 Jan.
**Verified by:** the doc shows a measured number with its date range; if the projection is over $150, a lever is chosen and noted.

---

## Phase 9 - Verification and runbook

### TASK-20 `docs/deploy.md`
**Satisfies:** REQ-VER-03, REQ-LIVE-04, REQ-DATA-05, REQ-VER-05
**Steps:** write the runbook from the commands that actually ran (design section 10 lists the sections). Include the list of places the URL appears and the consequence that live runs vanish on redeploy.
**Verified by:** a read-through by someone who has not seen the setup can follow it; every command was run at least once, or is marked "not run".

### TASK-21 Live verification
**Satisfies:** REQ-VER-01, REQ-VER-02, REQ-LIVE-01
**Steps:** do the checklist in design section 10 in a private window; append dated entries to `docs/devlog.md` with what was seen (verdicts, reason code, the 429, the CORS header result, log lines found). Note failures as failures.
**Verified by:** every checklist item has a dated line; none is claimed without being done.

### TASK-22 Teardown and redeploy rehearsal
**Satisfies:** REQ-VER-04
**Steps:** from the runbook, tear down everything (including the budget and roles) in a way you can afford to repeat, then rebuild from scratch. Update `VITE_API_URL` and `CORS_ALLOWED_ORIGINS` for the new URL; redo TASK-21 quickly. Do this before 15 January 2027 so there is time to fix the doc.
**Verified by:** tagged-resource listing is empty after teardown; the rebuilt site passes the private-window check; the time taken and doc fixes are in the devlog.

### TASK-23 Final check before the Deadline
**Satisfies:** REQ-LIVE-02, REQ-VER-01
**Steps:** in the week before 29 Jan 2027: repeat TASK-21, check Cost Explorer, check ECR image age, check the Vercel project and AWS account are in good standing.
**Verified by:** dated devlog entry.

---

## Traceability

| Requirement group | Tasks |
|---|---|
| REQ-LIVE | 13, 14, 20, 21, 23 |
| REQ-API | 03, 04 |
| REQ-IMG | 01, 02, 16 |
| REQ-DATA | 08, 13, 20 |
| REQ-AWS | 09, 11, 12, 13, 19 |
| REQ-WEB | 14 |
| REQ-CI | 15, 16, 17 |
| REQ-SAFE | 05, 06, 07, 10, 16, 18, 19 |
| REQ-VER | 17, 20, 21, 22, 23 |
