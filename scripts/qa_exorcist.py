"""Repeat the fix loop 5 times per Exorcist mode and report real numbers (exorcist REQ-X-18).

Usage: .venv/bin/python scripts/qa_exorcist.py [--runs 5]

Per run, through the real API in-process: a keyboard run on the haunted bank (scripted walker), then the Exorcist
proposes a fix, a scripted approval, the Verifier runs the walker on the patched copy, and the regression check runs
it on the copy with the bug put back.
- valid diff: the fix passed the deterministic checks (REQ-X-05)
- verified: the checker said PASSED on the patched copy
- caught: the checker said BLOCKED on the reintroduced copy
A mode passes at 4 of 5 valid diffs. "Verified" and "caught" are what the checker measured, not claims by this script.
A mode that cannot run is reported as "not run: <reason>".
"""
from __future__ import annotations

import argparse
import statistics
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from agent.api.limits import LimitSettings  # noqa: E402
from agent.api.main import create_app  # noqa: E402


def wait(client, run_id):
    for _ in range(600):
        rec = client.get(f"/runs/{run_id}").json()
        if rec["status"] != "running":
            return rec
        time.sleep(0.2)
    return rec


def one(client, mode):
    run_id = client.post("/runs", json={"variant": "broken", "mode": "scripted"}).json()["run_id"]
    if wait(client, run_id)["verdict"] != "BLOCKED":
        return {"valid": False, "error": "keyboard run was not BLOCKED"}
    fix = client.post(f"/runs/{run_id}/fixes", json={"exorcist_mode": mode}).json()
    if fix.get("status") != "proposed":
        return {"valid": False, "error": fix.get("error") or str(fix.get("detail")), "fix": fix}
    client.post(f"/fixes/{fix['fix_id']}/approve", json={"diff_sha256": fix["diff_sha256"], "note": "qa script"})
    v = wait(client, client.post(f"/fixes/{fix['fix_id']}/verify").json()["run_id"])
    caught = None
    if v["verdict"] == "PASSED":
        g = wait(client, client.post(f"/fixes/{fix['fix_id']}/regression").json()["run_id"])
        caught = g["verdict"] == "BLOCKED"
    return {"valid": True, "fix": fix, "verified": v["verdict"] == "PASSED", "caught": caught}


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("--runs", type=int, default=5)
    runs = ap.parse_args(argv).runs
    with tempfile.TemporaryDirectory() as tmp:
        # This script makes 4 runs per loop; lift the public rate limits for it (local only).
        settings = LimitSettings(per_minute=10_000, per_hour=10_000, max_concurrent=4)
        client = TestClient(create_app(Path(tmp) / "qa.db", seed_path=None, settings=settings))
        print("| exorcist_mode | runs | valid diffs | changed lines | verified (checker PASSED on patched copy) "
              "| caught (checker BLOCKED with bug put back) | tokens | cost usd | avg latency ms | passes |")
        print("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")
        for mode in ("scripted", "llm"):
            res = [one(client, mode) for _ in range(runs)]
            valid = [r for r in res if r["valid"]]
            if not valid and all(r.get("fix", {}).get("status") == "exorcist_failed" for r in res):
                print(f"| {mode} | {runs} | not run: {res[0]['error']} | -- | -- | -- | -- | -- | -- | not run |")
                continue
            lines = sorted({r["fix"]["changed_lines"] for r in valid})
            lat = statistics.mean(r["fix"]["latency_ms"] for r in valid) if valid else 0
            toks = sorted({(r["fix"]["input_tokens"], r["fix"]["output_tokens"]) for r in valid})
            cost = sorted({r["fix"]["cost_usd"] for r in valid})
            print(f"| {mode} | {runs} | {len(valid)} | {lines} | {sum(1 for r in valid if r['verified'])} "
                  f"| {sum(1 for r in valid if r['caught'])} | {toks} | {cost} | {lat:.1f} "
                  f"| {'yes' if len(valid) >= 4 else 'no'} |")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
