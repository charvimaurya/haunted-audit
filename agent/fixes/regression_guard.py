"""Regression guard (journey-guard REQ-RG-01 to RG-04): prove the journey test catches the barrier when it comes back.

Takes the scripted Exorcist's fix for the planted barrier (a Scripted repair demonstration), writes three copies of
the bank under artifacts/regression/ (fix applied, fix removed, fix restored), and runs the keyboard journey test
tests/journeys/send-payment.spec.ts on each. GUARD_WORKS only for PASS, FAIL, PASS with the focus message on FAIL.

The guard result is not a checker verdict and never sets verdict or reason_code. Nothing outside artifacts/ is written.

    python -m agent.fixes.regression_guard [--runs N] [--test path/to/other.spec.ts]
"""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from agent.fixes.diffcheck import apply_reverse, check
from agent.fixes.exorcist import page_source, propose

REPO = Path(__file__).resolve().parents[2]
JOURNEYS = REPO / "tests" / "journeys"
DEFAULT_TEST = JOURNEYS / "send-payment.spec.ts"
OUT_ROOT = REPO / "artifacts" / "regression"
FOCUS_MESSAGE = "Send Payment is not keyboard focusable"
STEPS = ("fix applied", "fix removed", "fix restored")
EXPECTED = ("PASS", "FAIL", "PASS")
# The planted finding, as the checker reports it for the haunted bank.
PLANTED_FINDING = {"reason_code": "TARGET_NOT_FOCUSABLE", "blocked_element": {"tag": "div"}}


@dataclass
class StepResult:
    step: str
    result: str  # "PASS" or "FAIL"
    message: str | None


class SetupError(RuntimeError):
    """Node, the journey test packages or Chromium are missing. Nothing was measured."""


def judge(results: list[StepResult]) -> str:
    """Pure rule: PASS, FAIL, PASS, and the FAIL is the focus failure, not some other error."""
    if tuple(r.result for r in results) != EXPECTED:
        return "GUARD_BROKEN"
    if FOCUS_MESSAGE not in (results[1].message or ""):
        return "GUARD_BROKEN"
    return "GUARD_WORKS"


def build_copies(folder: Path) -> list[Path]:
    """The three pages. Each is opened with ?variant=broken, so only the patch differs between them."""
    proposal = propose(PLANTED_FINDING, "scripted")
    if proposal.status != "proposed" or proposal.checked is None:
        raise SetupError(f"The scripted Exorcist did not propose a fix: {proposal.error}")
    source = page_source()
    applied = check(proposal.checked.diff, source).patched
    removed = apply_reverse(proposal.checked.diff, applied)
    restored = check(proposal.checked.diff, removed).patched
    folder.mkdir(parents=True, exist_ok=True)
    paths = []
    for i, text in enumerate((applied, removed, restored), start=1):
        path = folder / f"{i}-{STEPS[i - 1].replace(' ', '-')}.html"
        path.write_text(text, encoding="utf-8")
        paths.append(path)
    return paths


def _npx() -> str:
    npx = shutil.which("npx")
    if npx is None:
        raise SetupError("Node is not installed (npx not found).")
    if not (JOURNEYS / "node_modules" / "@playwright" / "test").is_dir():
        raise SetupError("Run once: cd tests/journeys && npm install && npx playwright install chromium")
    return npx


def run_test(page: Path, test: Path = DEFAULT_TEST) -> tuple[str, str | None, str]:
    """Run one journey test on one page. Returns (PASS or FAIL, failure message, full output)."""
    env = {**os.environ, "JOURNEY_URL": f"{page.resolve().as_uri()}?variant=broken"}
    proc = subprocess.run(
        [_npx(), "playwright", "test", str(test.resolve()), "--reporter=line"],
        cwd=JOURNEYS, env=env, capture_output=True, text=True, timeout=120,
    )
    output = proc.stdout + proc.stderr
    if "Executable doesn't exist" in output or "npx playwright install" in output:
        raise SetupError("Chromium for Playwright is missing. Run: cd tests/journeys && npx playwright install chromium")
    if proc.returncode == 0:
        return "PASS", None, output
    message = next((ln.strip() for ln in output.splitlines() if ln.strip().startswith("Error:")), None)
    return "FAIL", message, output


def run_once(folder: Path, test: Path = DEFAULT_TEST) -> tuple[str, list[StepResult]]:
    results = []
    for step, page in zip(STEPS, build_copies(folder)):
        result, message, _ = run_test(page, test)
        results.append(StepResult(step, result, message))
    return judge(results), results


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--runs", type=int, default=1, help="repeat the PASS, FAIL, PASS sequence N times (1 to 20)")
    parser.add_argument("--test", type=Path, default=DEFAULT_TEST, help="journey test file to guard with")
    args = parser.parse_args(argv)
    if not 1 <= args.runs <= 20:
        parser.error("--runs must be 1 to 20")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    print("Regression guard. Fix: Scripted repair demonstration (Send Payment div -> <button type=\"submit\">).")
    print(f"Journey test: {args.test.relative_to(REPO) if args.test.is_relative_to(REPO) else args.test}")
    works = 0
    try:
        for n in range(1, args.runs + 1):
            guard_result, results = run_once(OUT_ROOT / f"{stamp}-{n}", args.test)
            works += guard_result == "GUARD_WORKS"
            print(f"\nRun {n} of {args.runs}  (copies in artifacts/regression/{stamp}-{n}/)")
            for r in results:
                print(f"  {r.step:<13} {r.result}" + (f"   {r.message}" if r.message else ""))
            print(f"  {guard_result}")
    except SetupError as exc:
        print(f"Not run: {exc}", file=sys.stderr)
        return 2
    print(f"\nGUARD_WORKS {works} of {args.runs}"
          " (counted from the runs above; the test catches the bug when it comes back)")
    return 0 if works == args.runs else 1


if __name__ == "__main__":
    sys.exit(main())
