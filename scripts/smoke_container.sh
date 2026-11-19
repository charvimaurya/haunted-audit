#!/usr/bin/env bash
# Start the image, check /ping, run one scripted broken and one fixed journey,
# check the checker's verdicts, print memory use. No --shm-size on purpose: it
# proves --disable-dev-shm-usage works with the default 64 MB.
# Usage: scripts/smoke_container.sh <image>
set -euo pipefail

IMAGE="${1:?usage: smoke_container.sh <image>}"
NAME="haunted-audit-smoke-$$"
PORT="${SMOKE_PORT:-18000}"
BASE="http://127.0.0.1:${PORT}"

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --name "$NAME" -p "${PORT}:8000" \
  -e RATE_PER_MINUTE=50 -e RATE_PER_HOUR=500 "$IMAGE" >/dev/null

for i in $(seq 1 40); do
  if curl -fsS "$BASE/ping" >/dev/null 2>&1; then break; fi
  [ "$i" = 40 ] && { echo "FAIL: /ping never answered"; docker logs "$NAME"; exit 1; }
  sleep 1
done
echo "ok: /ping"

run_variant() {
  local variant="$1" want_verdict="$2" want_reason="$3"
  local id
  id=$(curl -fsS -X POST "$BASE/runs" -H 'Content-Type: application/json' \
        -d "{\"variant\":\"$variant\",\"mode\":\"scripted\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["run_id"])')
  for _ in $(seq 1 90); do
    body=$(curl -fsS "$BASE/runs/$id")
    status=$(printf '%s' "$body" | python3 -c 'import sys,json;print(json.load(sys.stdin)["status"])')
    [ "$status" != "running" ] && break
    sleep 1
  done
  verdict=$(printf '%s' "$body" | python3 -c 'import sys,json;print(json.load(sys.stdin)["verdict"])')
  reason=$(printf '%s' "$body" | python3 -c 'import sys,json;print(json.load(sys.stdin)["reason_code"] or "")')
  if [ "$verdict" != "$want_verdict" ] || [ "$reason" != "$want_reason" ]; then
    echo "FAIL: $variant gave verdict=$verdict reason=$reason (wanted $want_verdict/$want_reason)"
    docker logs "$NAME" | tail -40
    exit 1
  fi
  echo "ok: $variant -> $verdict ${reason}"
}

run_variant broken BLOCKED TARGET_NOT_FOCUSABLE
run_variant fixed PASSED ""

echo "memory after both runs:"
docker stats --no-stream --format '  {{.MemUsage}} (cpu {{.CPUPerc}})' "$NAME"
echo "smoke test passed"
