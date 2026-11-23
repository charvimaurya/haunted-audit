"""Repeat the voice journey on the haunted and fixed bank and report the real pass rate (voice-agent REQ-VA-10).

Usage: .venv/bin/python -m agent.eval.run_voice_eval [--runs 5]

Correct on the haunted page: BLOCKED / NO_ACTIVATION, with the step message
"Could not activate Send Payment: no accessible role or name" and a measured box for the element.
Correct on the fixed page: PASSED, every step done.
A variant is reliable at 4 of 5 or more. Every number comes from the runs just made.
"""
from __future__ import annotations

import argparse
import statistics
import sys

from agent.voice_agent.runner import run_voice_journey

COMMANDS = ['type "Alex Carter" in Recipient', "type 50.00 in Amount", "click Send Payment"]
HAUNTED_MESSAGE = "Could not activate Send Payment: no accessible role or name"


def correct(variant: str, result) -> bool:
    if variant == "broken":
        last = result.step_events[-1].args if result.step_events else {}
        box = (last.get("element") or {}).get("bounding_box") or {}
        return (result.verdict == "BLOCKED" and result.reason_code == "NO_ACTIVATION"
                and last.get("message") == HAUNTED_MESSAGE and box.get("width", 0) > 0)
    return result.verdict == "PASSED" and all(e.args.get("outcome") == "done" for e in result.step_events)


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--runs", type=int, default=5)
    runs = ap.parse_args(argv).runs
    print("| agent_kind | agent_mode | variant | runs | correct | avg latency ms | reliable |")
    print("| --- | --- | --- | --- | --- | --- | --- |")
    ok = True
    for variant in ("broken", "fixed"):
        results = [run_voice_journey(variant, COMMANDS, "typed") for _ in range(runs)]
        n = sum(correct(variant, r) for r in results)
        reliable = n >= 4 if runs == 5 else n >= round(runs * 0.8)
        ok = ok and reliable
        lat = statistics.mean(r.latency_ms for r in results)
        print(f"| voice | {results[0].agent_mode} | {variant} | {runs} | {n} | {lat:.1f} | {'yes' if reliable else 'no'} |")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
