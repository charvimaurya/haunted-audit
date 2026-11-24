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

SAMPLES="$(mktemp)"
SAMPLER_PID=""

# Memory sampler: `docker stats --no-stream` in a loop, one value (MiB) per line.
# Each call takes a second or two itself, so the real interval is about 2 to 3 s.
mem_mib() {
  docker stats --no-stream --format '{{.MemUsage}}' "$NAME" 2>/dev/null | awk '{
    v = $1; u = v; sub(/^[0-9.]+/, "", u); n = v + 0
    if (u == "GiB") n *= 1024; else if (u == "KiB" || u == "kB") n /= 1024; else if (u == "B") n /= 1048576
    printf "%.2f\n", n }'
}
# Cgroup v2 high-water mark of the whole container, in MiB. The kernel tracks it
# continuously from container start and it cannot be reset from inside the
# container, so every reading is cumulative (startup included). Prints nothing
# when the file is missing, unreadable, not a positive integer, or the container
# is gone (cgroup v1 hosts, kernels before 5.19). Never prints 0 for "unknown".
cgroup_peak_mib() {
  docker exec "$NAME" cat /sys/fs/cgroup/memory.peak 2>/dev/null | awk '
    /^[0-9]+$/ && $1 > 0 { printf "%.2f\n", $1 / 1048576 }'
}
LAST_CGROUP_PEAK=""
report_cgroup_peak() {
  local label="$1" mib
  mib=$(cgroup_peak_mib || true)
  if [ -n "$mib" ]; then
    LAST_CGROUP_PEAK="$mib"
    echo "cgroup memory.peak, cumulative, $label: ${mib} MiB"
  else
    echo "cgroup memory.peak, cumulative, $label: not measured (memory.peak unreadable)"
  fi
}
start_sampler() {
  : > "$SAMPLES"
  ( while :; do mem_mib >> "$SAMPLES" || true; sleep 1; done ) &
  SAMPLER_PID=$!
}
stop_sampler() {
  if [ -n "$SAMPLER_PID" ]; then
    kill "$SAMPLER_PID" >/dev/null 2>&1 || true
    wait "$SAMPLER_PID" 2>/dev/null || true
    SAMPLER_PID=""
  fi
}

# Runs on every exit, including a failed assertion. INT and TERM exit through it too.
cleanup() {
  stop_sampler
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  rm -f "$SAMPLES"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

docker run -d --name "$NAME" -p "${PORT}:8000" \
  -e RATE_PER_MINUTE=50 -e RATE_PER_HOUR=500 "$IMAGE" >/dev/null

for i in $(seq 1 40); do
  if curl -fsS "$BASE/ping" >/dev/null 2>&1; then break; fi
  [ "$i" = 40 ] && { echo "FAIL: /ping never answered"; docker logs "$NAME"; exit 1; }
  sleep 1
done
echo "ok: /ping"
report_cgroup_peak "after startup"

run_variant() {
  local variant="$1" want_verdict="$2" want_reason="$3"
  local id peak count
  start_sampler
  id=$(curl -fsS -X POST "$BASE/runs" -H 'Content-Type: application/json' \
        -d "{\"variant\":\"$variant\",\"mode\":\"scripted\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["run_id"])')
  for _ in $(seq 1 90); do
    body=$(curl -fsS "$BASE/runs/$id")
    status=$(printf '%s' "$body" | python3 -c 'import sys,json;print(json.load(sys.stdin)["status"])')
    [ "$status" != "running" ] && break
    sleep 1
  done
  stop_sampler
  report_cgroup_peak "after $variant journey"
  count=$(grep -c . "$SAMPLES" || true)
  if [ "${count:-0}" -gt 0 ]; then
    peak=$(sort -n "$SAMPLES" | tail -1)
    echo "peak memory, $variant journey: ${peak} MiB (${count} samples)"
  else
    peak=""
    echo "peak memory, $variant journey: not measured (no samples)"
  fi
  PEAKS="${PEAKS:-} ${peak}"
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

if [ -n "$LAST_CGROUP_PEAK" ]; then
  echo "peak memory, whole run (cgroup memory.peak, includes startup and page cache): ${LAST_CGROUP_PEAK} MiB"
else
  echo "peak memory, whole run (cgroup memory.peak): not measured, using docker stats samples below"
fi
overall=$(printf '%s\n' $PEAKS | sort -n | tail -1)
echo "peak memory, both journeys: ${overall:-not measured} MiB"
echo "memory after both runs (single snapshot, not a peak):"
docker stats --no-stream --format '  {{.MemUsage}} (cpu {{.CPUPerc}})' "$NAME"
echo "smoke test passed"
