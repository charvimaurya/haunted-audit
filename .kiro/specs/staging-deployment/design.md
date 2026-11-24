# Staging deployment - Design

**Requirements:** `requirements.md` in this folder (IDs like REQ-SAFE-04 are cited below).
**Facts checked while writing:** the ECS Express Mode docs and the `aws-actions/amazon-ecs-deploy-express-service` README (inputs, roles, default health path `/ping`, URL shape `https://<name>.ecs.<region>.on.aws`, log groups never expire); Fargate x86 prices in us-east-1. **Not checked, marked "verify" below:** the Playwright image tag on MCR, exact CLI flag names for log config, task role and CPU units, ALB and public IPv4 prices, Bedrock IAM for the chosen inference profile.
**Placeholders:** `<ACCOUNT_ID>`, `<ALERT_EMAIL>`, `<VERCEL_ORIGIN>`, `<EXPRESS_URL>`. Never commit real values for the email.

---

## 1. Shape

```
Visitor (private window)
   |  https
   v
Vercel: dashboard (Vite static build, SPA rewrite)
   |  fetch + EventSource, https, CORS: only <VERCEL_ORIGIN>
   v
ECS Express Mode service (us-east-1)      <- GitHub Actions (OIDC) builds, pushes, deploys
   ALB (managed, HTTPS, health /ping)
   -> 1 Fargate task: FastAPI + Chromium, SQLite in /tmp
        task role  -> Bedrock InvokeModel (one model)       [llm mode only]
        logs       -> CloudWatch Logs (30 day retention)
ECR: haunted-audit-api (5 newest images)
AWS Budgets: $150, alerts 50/80/100%
```

The browser the agent drives opens only the bundled fixture file inside the container. The public internet is never an agent target.

---

## 2. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | **Seed the database from `docs/evidence-seed.json`; do not mount EFS.** | EFS adds a file system, mount targets and a custom task definition (Express Mode can't mount it through the simple path), and SQLite over NFS has locking risks. A seed file is one committed JSON file and zero new infrastructure. |
| D2 | **What D1 means:** every live run vanishes on redeploy, task replacement or restart. Only the seed rows survive, and they are labelled "Recorded run, not live". Evidence from live demos must be copied into the seed by hand (an export script helps) and committed. | Honest, simple, and consistent with "never invent metrics". |
| D3 | **Exactly one task** (min = max = 1). | Each task has its own SQLite file and its own in-flight runs. Two tasks would make `GET /runs/{id}` and the stream 404 half the time. The cost is no high availability; ECS still replaces a failed task. |
| D4 | **Rate limits and the concurrency cap live in the app** (in memory). | One task, so in-memory is correct. No Redis or WAF to pay for. WAF is named as an upgrade path, not built. |
| D5 | **LLM mode is off by default on staging** (`LLM_ENABLED=false`) and capped per day when on. | Anonymous visitors must not be able to spend Bedrock money. Scripted mode proves the product and costs nothing. The Bedrock task role is still created so the switch is a config change, not a rebuild. |
| D6 | **Bedrock permission.** Policy allows `bedrock:InvokeModel` on the model's inference-profile ARN and the foundation-model ARNs it routes to. Strands' `BedrockModel` streams by default; a streamed call is authorised by `bedrock:InvokeModelWithResponseStream`. Plan: test under the real task role. If `AccessDenied`, first try `streaming=False` in the model config (keeps a single action); only add the streaming action if that is not possible. | Meets "only InvokeModel" without guessing. **Verify** both the action mapping and that `BedrockModel` accepts `streaming`. |
| D7 | **Size the task from a measurement, not a guess** (section 9). Start from 0.5 vCPU / 1 GB if the smoke test's peak stays under about 700 MB; otherwise 1 vCPU / 2 GB. | The always-on bill is dominated by fixed ALB and IPv4 charges plus task size. 1 vCPU / 2 GB 24/7 probably does not fit in $150 (section 9). |
| D8 | **x86_64 image.** | Matches GitHub's default runners; no QEMU or ARM runner. ARM would save roughly 20% on Fargate compute; revisit only if the budget alert fires. |
| D9 | **Client address = the last `X-Forwarded-For` entry** (the one the ALB appended), not uvicorn's proxy-header rewriting. | The leftmost entries are client-supplied and spoofable. Falls back to the socket peer when the header is absent (local dev). |
| D10 | **Bootstrap with the CLI once; CI does every later deploy.** Settings (env, port, scaling) live in the workflow file as the single source after bootstrap. | Avoids two places drifting. |
| D11 | **CORS: one exact origin, the Vercel production alias.** Pick the Vercel project name first so the alias (`https://<project>.vercel.app`) is known before the first backend deploy. Preview deployments get no CORS access. | Matches "allow only the Vercel domain". If the origin changes, update `CORS_ALLOWED_ORIGINS` and redeploy. |
| D12 | **Recreating the service changes its URL.** Runbook lists the places to update. A custom domain is out of scope. | Express URLs include a generated suffix. |

---

## 3. Backend changes (`agent/api/`)

### 3.1 `/ping`, headers, CORS, request logging

```python
def _origins() -> list[str]:
    raw = os.getenv("CORS_ALLOWED_ORIGINS", "")
    items = [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]
    if "*" in items:
        raise RuntimeError("CORS_ALLOWED_ORIGINS must list exact origins, not *")
    return items or ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins(),
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Last-Event-ID"],
    allow_credentials=False,
)

@app.get("/ping")
def ping() -> dict:            # no DB, no browser, no AWS
    return {"status": "ok"}
```

A small ASGI middleware writes one JSON line per request to stdout (request id from `X-Amzn-Trace-Id` when present). No bodies, no headers other than the trace id.

### 3.2 SSE keep-alive and resume

`_event_stream` already polls every 0.2 s. Add a monotonic timer; when 15 s pass with no event yielded, yield `: keep-alive\n\n` and reset. Also honour `Last-Event-ID` so a reconnect by `EventSource` does not replay steps the page already shows.

```python
KEEPALIVE_SECONDS = 15

async def _event_stream(store, run_id, start_after: int = 0, *, keepalive=KEEPALIVE_SECONDS, clock=time.monotonic):
    cursor, last_sent = start_after, clock()
    while True:
        page = store.events_after(run_id, cursor)
        ...
        for event in events:
            cursor = event["seq"]
            last_sent = clock()
            yield f"id: {cursor}\ndata: {event['json']}\n\n"
        ...
        if clock() - last_sent >= keepalive:
            last_sent = clock()
            yield ": keep-alive\n\n"
        await asyncio.sleep(0.2)
```

The route reads `Last-Event-ID` (integer, ignore if invalid) and sets `Cache-Control: no-cache`, `X-Accel-Buffering: no`. The `keepalive` and `clock` parameters exist so a unit test can run with a fake clock and a 0.01 s interval, not a 15 s sleep. The ALB idle timeout default is 60 s, so 15 s leaves a wide margin.

### 3.3 Chromium in the container

In `runner.py` replace the launch with:

```python
def _launch_args() -> list[str]:
    if os.getenv("HAUNTED_AUDIT_CONTAINER") == "1":
        # Fargate gives the container a small /dev/shm and no user namespaces.
        return ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    return []

browser = playwright.chromium.launch(headless=True, args=_launch_args())
```

`--disable-dev-shm-usage` is the shared-memory answer on Fargate: Chromium uses `/tmp` instead of `/dev/shm`. (Docker's `--shm-size` and `--ipc=host` are for local docker runs only; Fargate does not let a task set shared memory.) `--no-sandbox` is acceptable here because the page is our own fixture, the container is non-root, and requests are restricted (3.5).

### 3.4 Rate limit, concurrency cap, LLM cap

`agent/api/limits.py`:

```python
class SlidingWindow:            # thread-safe, per key
    def hit(self, key: str, *, limit: int, window_s: float, now: float) -> float | None:
        """Return None if allowed, else seconds until the oldest hit expires."""

def client_ip(request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff: return xff.split(",")[-1].strip()
    return request.client.host

class RunGate:                  # semaphore-like: max concurrent runs, global
    def try_acquire(self) -> bool: ...
    def release(self) -> None: ...

class DailyCap:                 # UTC-day counter for llm mode
    def try_take(self, now: datetime) -> bool: ...
```

`POST /runs` order: validate body (extra fields forbidden) -> LLM checks (`mode == "llm"` needs `LLM_ENABLED` and `DailyCap`) -> per-IP minute and hour windows -> `RunGate.try_acquire`. Any refusal is HTTP 429 (or 403 for "LLM disabled" with a plain message) with `Retry-After` where it applies; the gate is released in a `finally` inside `_execute_run`. Settings: `RATE_PER_MINUTE=5`, `RATE_PER_HOUR=30`, `MAX_CONCURRENT_RUNS=2`, `LLM_ENABLED=false`, `LLM_DAILY_RUN_CAP=20`. These defaults are my proposals; none is measured.

Dashboard: map 429 and the LLM-paused response to a visible plain message ("Too many runs right now. Try again in N seconds.") using `Retry-After`. No fake result.

### 3.5 Bundled-site-only agents (REQ-SAFE-07)

- `RunCreate` gets `model_config = ConfigDict(extra="forbid")`. A `url` field gives 422.
- In `run_journey`, right after creating the page, install a route guard:

```python
def _only_fixture(route):
    url = route.request.url
    if url.startswith(FIXTURE_PATH.parent.as_uri()) or url.startswith("data:") or url == "about:blank":
        route.continue_()
    else:
        route.abort()
page.route("**/*", _only_fixture)
```

- A test points the fixture at a page that references `http://example.com/x.png` and `fetch("http://169.254.170.2/")` and asserts both are aborted.

### 3.6 URL guard (`agent/api/url_guard.py`)

For the scan feature (not built yet). Pure functions plus one resolver seam so tests don't touch DNS.

```python
class BlockedTarget(ValueError): reason: str   # machine code + plain message

def check_url(url: str, *, resolve=socket.getaddrinfo) -> ResolvedTarget:
    # 1. urlsplit; scheme in {http, https}; no userinfo; host present; no "localhost"/".internal"/".local" names
    # 2. port in {80, 443} or the default for the scheme (no 22, 6379, 169 etc.)
    # 3. resolve ALL A/AAAA records; if ANY is blocked -> BlockedTarget
    # 4. return the chosen IP + original host so the caller connects to that IP (Host/SNI preserved)

def is_blocked_ip(ip: ipaddress._BaseAddress) -> bool:
    ip = ip.ipv4_mapped or ip  (for IPv6-mapped)
    return (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast
            or ip.is_reserved or ip.is_unspecified
            or ip in CGNAT_100_64_0_0_10)
```

Redirects: the fetcher follows at most 3, calling `check_url` on every `Location`. Response body capped (for example 2 MB) and total time capped (for example 20 s). Extra explicit deny list for `169.254.169.254` and `169.254.170.2` (already link-local, listed for clarity and tests). A test table covers: `127.0.0.1`, `localhost`, `10.0.0.1`, `172.16.0.1`, `192.168.1.1`, `169.254.169.254`, `169.254.170.2`, `100.64.0.1`, `0.0.0.0`, `::1`, `fe80::1`, `fc00::1`, `::ffff:127.0.0.1`, `http://user:pw@example.com`, `file:///etc/passwd`, `ftp://x`, decimal/hex/octal IP forms (`2130706433`, `0x7f000001`, `0177.0.0.1`), a hostname resolving to a private address, a hostname with one public and one private record, and a redirect from public to private. Public example (resolver stubbed) passes.

Why this matters on Fargate: the task credentials endpoint is reachable from inside the container, so an unguarded fetch could be turned into a way to read the task role's temporary credentials. The guard plus the one-model task role limit that blast radius.

Wiring: no scan route exists, so none is exposed. `tests/unit/test_scan_routes_use_guard.py` scans `agent/api/` for any route path containing `scan` and fails unless the module imports `check_url`.

### 3.7 Seed and housekeeping

- `docs/evidence-seed.json`: `{"generated_at": "...", "source": "scripts/export_seed.py", "runs": [ {run record as stored, plus "seeded": true, "recorded_at": "..."} ]}`.
- `scripts/export_seed.py` reads real finished rows from a local `runs.db` and writes the file. It refuses to write a row whose `result` is missing. It never edits numbers.
- On startup `RunStore.load_seed(path)` inserts rows whose `run_id` is not present, with `status` as recorded and `seeded=1` (new column, added with `ALTER TABLE ... ADD COLUMN` guarded by a check). `GET /runs/{id}` returns `"seeded": true/false`. The dashboard shows "Recorded run, not live" for seeded rows.
- A startup and post-run prune deletes unseeded rows older than 7 days and artifact folders older than 24 hours (screenshots live on the 20 GiB ephemeral disk).

---

## 4. Container

`Dockerfile` (repo root):

```dockerfile
# Tag must equal the pinned playwright version in requirements.txt.   [verify the tag exists on MCR]
FROM mcr.microsoft.com/playwright/python:v1.64.1-noble

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HAUNTED_AUDIT_CONTAINER=1 \
    HAUNTED_AUDIT_DB=/tmp/runs.db

RUN apt-get update \
 && apt-get install -y --no-install-recommends tini \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agent ./agent
COPY fixtures ./fixtures
COPY docs/evidence-seed.json ./docs/evidence-seed.json
RUN mkdir -p /app/artifacts && chown -R pwuser:pwuser /app

USER pwuser
EXPOSE 8000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["uvicorn", "agent.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
```

- `requirements.txt` changes `playwright>=1.49` to `playwright==1.64.1` (the version installed in `.venv` today). The browsers already in the image match that version only if the pip version is identical, which is why it is pinned. `tests/unit/test_dockerfile_matches_playwright.py` parses both files and compares.
- `.dockerignore`: `.git`, `.venv`, `.env*` (except `.env.example` is also excluded, not needed), `data`, `artifacts`, `dashboard`, `node_modules`, `.hypothesis`, `.pytest_cache`, `__pycache__`, `design`, `docs/*.docx`, `docs/*.pptx`.
- The `docs/*.docx` and `.pptx` files are excluded so team documents are never shipped in the image.

Local run: `docker build -t haunted-audit-api . && docker run --rm -p 8000:8000 --shm-size=1g haunted-audit-api`.

---

## 5. AWS setup (commands to be copied into `docs/deploy.md`)

All commands use `--region us-east-1`. Run them as an admin user on your own machine (not CI). Replace placeholders.

### 5.1 ECR

```bash
aws ecr create-repository --repository-name haunted-audit-api \
  --image-scanning-configuration scanOnPush=true \
  --tags Key=Project,Value=haunted-audit Key=Environment,Value=staging

aws ecr put-lifecycle-policy --repository-name haunted-audit-api --lifecycle-policy-text '{
  "rules":[{"rulePriority":1,"description":"keep 5","selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":5},"action":{"type":"expire"}}]}'
```

First manual push (before CI exists):

```bash
aws ecr get-login-password | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
docker build -t <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/haunted-audit-api:manual-1 .
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/haunted-audit-api:manual-1
```

### 5.2 Roles (infrastructure and execution from the AWS getting-started page)

**Who runs this:** an IAM administrator, not the deployment permission set (`HauntedAuditDeployer` has no IAM write permissions). Kiro writes the files in `iam/`; the IAM administrator runs the commands; the deployment operator runs the read-only checks in TASK-11. Who the IAM administrator is has not been approved yet (proposed: Charvi; see TASK-11).

**Permissions the IAM administrator needs:** `iam:CreateRole`, `iam:TagRole` (`create-role` with `--tags` checks both), `iam:AttachRolePolicy`, `iam:PutRolePolicy`, and `iam:CreateServiceLinkedRole` only if the ECS service-linked role is missing.

**Before the roles:** check that the ECS service-linked role exists. If the first command prints `NoSuchEntity`, create it once with the second.

```bash
aws iam get-role --role-name AWSServiceRoleForECS
aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com   # only if missing
```

```bash
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Execution role (pull image, write logs). Managed policy only; no inline policy.
aws iam create-role --role-name haunted-audit-execution \
  --assume-role-policy-document file://iam/trust-ecs-tasks.json --tags Key=Project,Value=haunted-audit Key=Environment,Value=staging
aws iam attach-role-policy --role-name haunted-audit-execution \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Infrastructure role (creates the ALB, target group, security groups, scaling). Managed policy only; no inline policy.
aws iam create-role --role-name haunted-audit-infrastructure \
  --assume-role-policy-document file://iam/trust-ecs.json --tags Key=Project,Value=haunted-audit Key=Environment,Value=staging
aws iam attach-role-policy --role-name haunted-audit-infrastructure \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSInfrastructureRoleforExpressGatewayServices

# Task role (what the container itself may do). No managed policy; one inline policy.
aws iam create-role --role-name haunted-audit-task \
  --assume-role-policy-document file://iam/trust-ecs-tasks.json --tags Key=Project,Value=haunted-audit Key=Environment,Value=staging
# The committed file holds <ACCOUNT_ID>; fill it in a temporary copy that is never committed.
sed "s/<ACCOUNT_ID>/$ACCOUNT_ID/g" iam/task-bedrock.json > "${TMPDIR:-/tmp}/task-bedrock.json"
aws iam put-role-policy --role-name haunted-audit-task --policy-name bedrock-invoke-one-model \
  --policy-document "file://${TMPDIR:-/tmp}/task-bedrock.json"
```

`iam/trust-ecs-tasks.json` has principal `ecs-tasks.amazonaws.com`; `iam/trust-ecs.json` has `ecs.amazonaws.com`. Both use only `sts:AssumeRole`. Wait about a minute after creating roles before the first deploy (the docs warn about eventual consistency).

**Before 5.4 (deployment operator, not a role step):** create the log group the service writes to, then set its retention. Neither role can create a log group with this name: the execution role's managed policy can only create streams and write events, and the infrastructure role's managed policy only creates groups tagged `AmazonECSManaged=true`.

```bash
aws logs create-log-group --log-group-name /haunted-audit/api --region us-east-1
aws logs put-retention-policy --log-group-name /haunted-audit/api --retention-in-days 30 --region us-east-1
```

`HauntedAuditDeployer` allows both commands on this one group but no tagging (`logs:TagResource`, `logs:TagLogGroup`), so the group is created without the REQ-AWS-07 tags. Whether to accept that, have the IAM administrator tag it, or extend the permission set is an open decision.

`iam/task-bedrock.json` (model id comes from `BEDROCK_MODEL_ID`; **verify the profile and model ids with `aws bedrock list-inference-profiles`** and that the account has model access enabled):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "InvokeOneModel",
    "Effect": "Allow",
    "Action": ["bedrock:InvokeModel"],
    "Resource": [
      "arn:aws:bedrock:us-east-1:<ACCOUNT_ID>:inference-profile/us.anthropic.claude-sonnet-4-6",
      "arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-6"
    ]
  }]
}
```

The task role has no other statement: no S3, no Secrets Manager, no `bedrock:List*`. If D6 shows streaming needs it, one more action is added to this same statement and the decision is recorded.

If a secret is ever needed: create it in Secrets Manager, give only the **execution** role `secretsmanager:GetSecretValue` on that secret's ARN, and reference it in the service's `secrets` list. Nothing today needs one.

### 5.3 GitHub OIDC for CI

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com
aws iam create-role --role-name haunted-audit-github-deploy --assume-role-policy-document file://iam/trust-github.json
aws iam put-role-policy --role-name haunted-audit-github-deploy --policy-name deploy --policy-document file://iam/github-deploy.json
```

`iam/trust-github.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"},
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        "token.actions.githubusercontent.com:sub": "repo:charvimaurya/haunted-audit:ref:refs/heads/main"
      }
    }
  }]
}
```

`iam/github-deploy.json` (actions as listed in the deploy action's README; `iam:CreateServiceLinkedRole` is added only if the first create asks for it):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {"Effect":"Allow","Action":"ecr:GetAuthorizationToken","Resource":"*"},
    {"Effect":"Allow",
     "Action":["ecr:BatchCheckLayerAvailability","ecr:InitiateLayerUpload","ecr:UploadLayerPart","ecr:CompleteLayerUpload","ecr:PutImage","ecr:BatchGetImage","ecr:GetDownloadUrlForLayer"],
     "Resource":"arn:aws:ecr:us-east-1:<ACCOUNT_ID>:repository/haunted-audit-api"},
    {"Effect":"Allow",
     "Action":["ecs:CreateCluster","ecs:RegisterTaskDefinition","ecs:CreateExpressGatewayService","ecs:UpdateExpressGatewayService","ecs:DescribeExpressGatewayService","ecs:DescribeClusters","ecs:DescribeServices","ecs:ListServiceDeployments","ecs:DescribeServiceDeployments","ecs:TagResource","ecs:UntagResource"],
     "Resource":"*"},
    {"Effect":"Allow","Action":"iam:PassRole",
     "Resource":["arn:aws:iam::<ACCOUNT_ID>:role/haunted-audit-execution","arn:aws:iam::<ACCOUNT_ID>:role/haunted-audit-infrastructure","arn:aws:iam::<ACCOUNT_ID>:role/haunted-audit-task"]}
  ]
}
```

The `sub` pins this repo and the `main` branch only. A pull request from a fork cannot assume the role.

### 5.4 Create the Express service (bootstrap)

```bash
aws ecs create-express-gateway-service \
  --service-name haunted-audit-api \
  --execution-role-arn arn:aws:iam::<ACCOUNT_ID>:role/haunted-audit-execution \
  --infrastructure-role-arn arn:aws:iam::<ACCOUNT_ID>:role/haunted-audit-infrastructure \
  --task-role-arn arn:aws:iam::<ACCOUNT_ID>:role/haunted-audit-task \
  --primary-container '{
    "image":"<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/haunted-audit-api:manual-1",
    "containerPort":8000,
    "environment":[
      {"name":"AWS_REGION","value":"us-east-1"},
      {"name":"BEDROCK_MODEL_ID","value":"us.anthropic.claude-sonnet-4-6"},
      {"name":"CORS_ALLOWED_ORIGINS","value":"<VERCEL_ORIGIN>"},
      {"name":"LLM_ENABLED","value":"false"},
      {"name":"LLM_DAILY_RUN_CAP","value":"20"},
      {"name":"RATE_PER_MINUTE","value":"5"},
      {"name":"RATE_PER_HOUR","value":"30"},
      {"name":"MAX_CONCURRENT_RUNS","value":"2"}
    ],
    "awsLogsConfiguration":{"logGroup":"/haunted-audit/api","logStreamPrefix":"api"}
  }' \
  --cpu <CPU> --memory <MEMORY> \
  --health-check-path /ping \
  --scaling-target '{"minTaskCount":1,"maxTaskCount":1}' \
  --tags key=Project,value=haunted-audit key=Environment,value=staging \
  --monitor-resources
```

**Verify before relying on this block** with `aws ecs create-express-gateway-service help` on your CLI version: (a) the flag for the task role, (b) the exact shape of the log setting, (c) the unit for `--cpu` and `--memory` (the AWS tutorial uses `--cpu 2 --memory 4` for 2 vCPU and 4 GB, while the GitHub Action documents `1024`/`2048` units), (d) the tag syntax. If the CLI cannot set a custom log group, let Express Mode create it and set retention afterwards:

```bash
aws logs put-retention-policy --log-group-name <GROUP_FROM_DESCRIBE> --retention-in-days 30
```

Read the URL: `aws ecs describe-express-gateway-service --service-arn <ARN> --query 'service.activeConfigurations[0].ingressPaths[0].endpoint'` (path **verify**; the printed JSON also contains it). The URL is `<EXPRESS_URL>`.

### 5.5 Budget

```bash
aws budgets create-budget --account-id <ACCOUNT_ID> \
  --budget '{"BudgetName":"haunted-audit-150","BudgetType":"COST","TimeUnit":"MONTHLY","BudgetLimit":{"Amount":"150","Unit":"USD"}}' \
  --notifications-with-subscribers file://budget-notifications.json
```

`budget-notifications.json` (kept out of Git because it holds the email; a `budget-notifications.example.json` with a fake address is committed). Three entries, each `NotificationType: ACTUAL`, `ComparisonOperator: GREATER_THAN`, `ThresholdType: PERCENTAGE`, thresholds 50, 80, 100, subscriber `{"SubscriptionType":"EMAIL","Address":"<ALERT_EMAIL>"}`.

Two limits to state in the doc: the budget alerts, it does not stop spending; and a `MONTHLY` budget resets on the 1st, so it measures each month against $150, not the whole window. For a total-window cap use `TimeUnit: CUSTOM`-style budgets if the account supports them (**verify**) or watch the sum in Cost Explorer. I also recommend one extra `FORECASTED` 100% alert because the first real overrun signal otherwise arrives after the money is spent. That is an addition beyond the three you asked for; drop it if you prefer.

---

## 6. CI/CD (`.github/workflows/deploy.yml`)

```yaml
name: deploy
on:
  push:
    branches: [main]
  workflow_dispatch:
concurrency:
  group: deploy-staging
  cancel-in-progress: false
permissions:
  contents: read
  id-token: write
jobs:
  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
        env: { GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}" }
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - run: pip install -r requirements.txt
      - run: python -m playwright install --with-deps chromium
      - run: python -m pytest
  deploy:
    needs: [secrets-scan, test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Require config
        run: |
          for v in AWS_ROLE_TO_ASSUME ECS_EXECUTION_ROLE_ARN ECS_INFRA_ROLE_ARN ECS_TASK_ROLE_ARN CORS_ALLOWED_ORIGINS; do
            [ -n "${!v}" ] || { echo "Missing repository variable $v"; exit 1; }
          done
        env:
          AWS_ROLE_TO_ASSUME: ${{ vars.AWS_ROLE_TO_ASSUME }}
          ECS_EXECUTION_ROLE_ARN: ${{ vars.ECS_EXECUTION_ROLE_ARN }}
          ECS_INFRA_ROLE_ARN: ${{ vars.ECS_INFRA_ROLE_ARN }}
          ECS_TASK_ROLE_ARN: ${{ vars.ECS_TASK_ROLE_ARN }}
          CORS_ALLOWED_ORIGINS: ${{ vars.CORS_ALLOWED_ORIGINS }}
      - name: Refuse a .env in the build context
        run: test ! -e .env
      - uses: aws-actions/configure-aws-credentials@v5
        with:
          role-to-assume: ${{ vars.AWS_ROLE_TO_ASSUME }}
          aws-region: us-east-1
      - id: ecr
        uses: aws-actions/amazon-ecr-login@v2
      - name: Build
        run: docker build -t "${{ steps.ecr.outputs.registry }}/haunted-audit-api:${{ github.sha }}" .
      - name: Container smoke test
        run: bash scripts/smoke_container.sh "${{ steps.ecr.outputs.registry }}/haunted-audit-api:${{ github.sha }}"
      - name: Push
        run: docker push "${{ steps.ecr.outputs.registry }}/haunted-audit-api:${{ github.sha }}"
      - id: deploy
        uses: aws-actions/amazon-ecs-deploy-express-service@v1
        with:
          service-name: haunted-audit-api
          image: ${{ steps.ecr.outputs.registry }}/haunted-audit-api:${{ github.sha }}
          execution-role-arn: ${{ vars.ECS_EXECUTION_ROLE_ARN }}
          infrastructure-role-arn: ${{ vars.ECS_INFRA_ROLE_ARN }}
          task-role-arn: ${{ vars.ECS_TASK_ROLE_ARN }}
          container-port: 8000
          cpu: ${{ vars.ECS_CPU }}
          memory: ${{ vars.ECS_MEMORY }}
          health-check-path: /ping
          min-task-count: 1
          max-task-count: 1
          environment-variables: |
            [
              {"name":"AWS_REGION","value":"us-east-1"},
              {"name":"BEDROCK_MODEL_ID","value":"${{ vars.BEDROCK_MODEL_ID }}"},
              {"name":"CORS_ALLOWED_ORIGINS","value":"${{ vars.CORS_ALLOWED_ORIGINS }}"},
              {"name":"LLM_ENABLED","value":"${{ vars.LLM_ENABLED }}"}
            ]
          tags: |
            Project=haunted-audit
            Environment=staging
      - name: Check /ping on the deployed URL
        run: curl --fail --silent --show-error --retry 5 --retry-delay 5 "${{ steps.deploy.outputs.endpoint }}/ping"
```

Notes:
- Pin each third-party action to a release tag at implementation time (and prefer a commit SHA for non-AWS actions such as gitleaks). Tag names above are the ones the AWS README shows; **verify** they exist when writing the file.
- The existing `tests.yml` keeps running on pull requests. `deploy.yml` re-runs the tests because the deploy must be gated on them.
- `endpoint` is the action's documented output; confirm whether it includes `https://` and adjust the curl.
- The smoke test script starts the container, waits for `/ping`, then POSTs a scripted `broken` and `fixed` run and checks verdicts (`BLOCKED` with `TARGET_NOT_FOCUSABLE`, and `PASSED`). It runs with `--shm-size` unset (the default 64 MB) so it proves `--disable-dev-shm-usage` works.
- A rollback is a re-run of the workflow on an earlier commit via `workflow_dispatch` with that ref; ECR keeps 5 images. (Express Mode also rolls back automatically on a 5XX alarm during canary.)

---

## 7. Frontend on Vercel

- Vercel project name chosen first (D11). Settings: Root Directory `dashboard`, Framework Preset Vite, Install `npm ci`, Build `npm run build`, Output `dist`.
- Environment variable (Production only): `VITE_API_URL=<EXPRESS_URL>` (no trailing slash). Not a secret. Because Vite inlines it at build time, changing it needs a new Vercel deploy.
- `dashboard/vercel.json`:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

  Same content as `product-shell-ia` TASK-39; if that file already exists, leave it.
- Deployment Protection: set so Production is public (Vercel Authentication off for the production domain). The private-window test is the proof.
- GitHub integration: Vercel's Git integration builds on push to `main`. No Vercel token is stored in GitHub, so there is nothing to leak. Vercel Hobby plans are for non-commercial use; a hackathon demo fits, but check the current terms when you create the project (**not verified**).
- Dashboard fixes needed: the 429 and "LLM paused" messages (3.4), the "Recorded run, not live" label (3.7). `App.tsx` already reads `VITE_API_URL` and uses `EventSource`.
- Build check in CI: after `npm run build`, `grep -R -E "AKIA|ASIA|aws_secret|BEGIN PRIVATE KEY" dashboard/dist` must find nothing.
- The existing GitHub Pages workflow cannot reach the API (no `VITE_API_URL`, and CORS would block it). Leave it alone or disable it; the live link is the Vercel one. README is updated so it points to Vercel only.

---

## 8. Observability

- `aws logs tail /haunted-audit/api --follow` (or the group Express Mode created) is the live view.
- One log line per request plus one per run start/finish (`run_id`, `variant`, `mode`, `verdict`, `latency_ms`). No bodies.
- Optional (not in scope): CloudWatch alarm on 5XX, Container Insights (extra cost).

---

## 9. Cost (estimate, not a measurement)

Window: 7 Nov 2026 to 29 Jan 2027, about 84 days = 2,016 hours, running 24/7.

| Line | Rate used | Source | Estimate |
|---|---|---|---|
| Fargate vCPU | $0.04048 / vCPU-hour | checked (us-east-1, Linux x86) | |
| Fargate memory | $0.004445 / GB-hour | checked | |
| 1 vCPU + 2 GB | $0.04937 / hour | computed | **about $99.5** |
| 0.5 vCPU + 1 GB | $0.02469 / hour | computed | **about $49.8** |
| ALB base hour | $0.0225 / hour | from memory, **verify** | about $45.4 |
| Public IPv4 (assume 2 ALB addresses + 1 task) | $0.005 / address-hour | from memory, **verify**; count of ALB addresses is an assumption | about $30.2 |
| ALB LCU, CloudWatch logs, ECR, data transfer | | not estimated | small, **measure** |
| Bedrock (llm mode) | tokens x rate | not measured | `LLM_DAILY_RUN_CAP` x measured cost per run x days; get tokens per run from `llm-agent-eval` |

Totals before the unmeasured lines: about **$175 at 1 vCPU / 2 GB** and about **$125 at 0.5 vCPU / 1 GB**. So at 1 vCPU / 2 GB the always-on plan likely breaks the $150 budget; at 0.5 vCPU / 1 GB it may fit, with about $25 of headroom for everything unmeasured. That is why D7 sizes from a measurement and why the 50% alert ($75) is expected to fire around the middle of the window.

Levers, in order of preference if the numbers are worse than the estimate:
1. Smaller task (if Chromium stays stable).
2. ARM64 image (about 20% less Fargate compute; needs an ARM build in CI).
3. Delete the service outside a known judging window and redeploy for it (runbook; the URL changes, D12).
4. Accept ending early. Say so in the doc rather than quietly overspending.

The estimate goes into `docs/deploy.md` with the date prices were checked. After 7 days, replace it with the Cost Explorer figure, filtered by tag `Project=haunted-audit` (activate the cost allocation tag first; it takes about a day to appear).

---

## 10. Verification and runbook

`docs/deploy.md` sections: Overview and diagram; Prerequisites; One-time AWS setup (5.1 to 5.5 as copyable commands); Vercel setup; GitHub variables to set (names only); Redeploy; Rollback; Teardown; What survives a redeploy (only the seed); Cost check; When the budget alert fires; Rotating anything that leaked; "Built with Kiro".

Teardown (order matters):

```bash
aws ecs delete-express-gateway-service --service-arn <ARN> --monitor-resources
# then, after it reports deleted:
aws logs delete-log-group --log-group-name <GROUP>      # Express Mode keeps log groups after deletion
aws ecr delete-repository --repository-name haunted-audit-api --force
aws iam delete-role-policy ... ; aws iam delete-role ...   # four roles
aws iam delete-open-id-connect-provider --open-id-connect-provider-arn <ARN>
aws budgets delete-budget --account-id <ACCOUNT_ID> --budget-name haunted-audit-150
```

Then in Vercel remove or pause the project. The doc ends with a check: `aws resourcegroupstaggingapi get-resources --tag-filters Key=Project,Values=haunted-audit` should return nothing.

Live verification checklist (each line written to `docs/devlog.md` with date and what was seen): private window opens the Vercel URL; run `broken` -> BLOCKED / TARGET_NOT_FOCUSABLE; run `fixed` -> PASSED; steps appear while the run is going (not all at once); `curl <EXPRESS_URL>/ping` -> 200; 6 rapid `POST /runs` -> the sixth gets 429 with `Retry-After`; CloudWatch shows the run's log lines; an `llm` request with `LLM_ENABLED=false` gets the paused message; a request from `https://example.com` origin gets no CORS allow header.

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Always-on cost exceeds $150 | Section 9 sizing, tag-filtered cost check at day 7, levers, 50/80/100 alerts, forecast alert |
| Chromium crashes or runs out of memory in a small task | `--disable-dev-shm-usage`, run cap of 2, memory measured in smoke test, fall back to 1 vCPU / 2 GB and apply a lever |
| Bedrock denies a streamed call under an InvokeModel-only policy | D6 test under the real task role; documented fix |
| Anonymous traffic burns Bedrock money | `LLM_ENABLED=false` default, daily cap, rate limits |
| SSRF reaches the task credential endpoint | URL guard, no scan route until guarded, fixture-only agent browser, one-model task role |
| CORS origin changes (new Vercel alias or new Express URL) | D11/D12 and the runbook list; CORS is an env var, redeploy is one workflow run |
| Deploy overlap drops an in-flight run (canary runs two tasks briefly) | Accepted; a run started during a deploy may 404; note in the doc |
| In-memory limits reset on restart | Accepted for one task; the cap on concurrent runs still protects memory |
| A secret reaches Git or the Vercel bundle | `.gitignore`, `.dockerignore`, gitleaks, `dist` grep, OIDC (no keys exist to leak) |
| Vercel or AWS account issues near the Deadline | Verify twice (after first deploy and in the last week), keep teardown tested |
| Express Mode is new; flags or outputs differ from docs | Tasks verify with `help` output before writing the runbook; commands in the final doc are the ones that actually ran |
