"""Run the keyboard agent N times and write results.json plus results.md.

A mode is reliable only when at least 4 of 5 runs reach the correct verdict:
broken -> BLOCKED with the pay control as the blocked element, fixed -> PASSED.
GO requires the LLM mode to be reliable on both variants. Every number in the
report is computed from the runs just executed.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from agent.keyboard_agent.models import JourneyResult
from agent.keyboard_agent.runner import BROKEN_TARGET, build_journey_config, run_journey

GO_SENTENCE = (
    "GO. The LLM keyboard agent reached the correct verdict in at least 4 of 5 "
    "runs on both variants (broken {broken_ok} of {broken_n}, fixed {fixed_ok} of {fixed_n}). "
    "The deterministic checker, not the model, decided whether each journey passed."
)
NO_GO_SENTENCE = (
    "NO-GO for the LLM keyboard agent: it did not reach the correct verdict in "
    "4 of 5 runs on both variants (broken {broken_ok} of {broken_n}, fixed {fixed_ok} of {fixed_n}). "
    "Switch the demo to the scripted walker. It uses the same keyboard-only tools, "
    "and the deterministic checker — not the model — decides whether the journey passed."
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Evaluate keyboard-agent reliability.")
    parser.add_argument("--modes", default="llm,scripted")
    parser.add_argument("--variants", default="broken,fixed")
    parser.add_argument("--runs", type=int, default=5)
    parser.add_argument("--max-steps", type=int, default=25)
    parser.add_argument("--timeout", type=float, default=90)
    parser.add_argument("--out", default="artifacts/eval")
    args = parser.parse_args(argv)

    modes = [item.strip() for item in args.modes.split(",") if item.strip()]
    variants = [item.strip() for item in args.variants.split(",") if item.strip()]
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    all_results: list[JourneyResult] = []
    summaries: list[dict] = []
    for mode in modes:
        for variant in variants:
            batch = _run_batch(
                mode,
                variant,
                runs=args.runs,
                max_steps=args.max_steps,
                timeout_seconds=args.timeout,
                artifacts_dir=str(out_dir / "runs"),
            )
            all_results.extend(batch)
            summaries.append(_summarize(mode, variant, batch, requested=args.runs))

    decision, sentence = _decision(summaries)
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "rule": "4 of 5 correct verdicts on each variant",
        "decision": decision,
        "sentence": sentence,
        "summary": summaries,
        "runs": [result.model_dump(mode="json") for result in all_results],
    }
    json_path = out_dir / "results.json"
    md_path = out_dir / "results.md"
    json_path.write_text(json.dumps(payload, indent=2) + "\n")
    md_path.write_text(_markdown(payload))
    print(_markdown(payload))
    print(f"Wrote {json_path}")
    print(f"Wrote {md_path}")
    return 0


def is_correct(result: JourneyResult) -> bool:
    """The verdict the demo is allowed to claim for this variant."""
    if result.error:
        return False
    if result.variant == "fixed":
        return result.verdict == "PASSED" and result.reason_code is None
    return (
        result.verdict == "BLOCKED"
        and result.reason_code == "TARGET_NOT_FOCUSABLE"
        and result.blocked_element is not None
        and result.blocked_element.selector == BROKEN_TARGET
        and result.blocked_element.bounding_box is not None
        and result.blocked_element.bounding_box.width > 0
        and result.blocked_element.bounding_box.height > 0
    )


def _run_batch(mode, variant, *, runs, max_steps, timeout_seconds, artifacts_dir) -> list[JourneyResult]:
    batch: list[JourneyResult] = []
    credential_error = _llm_preflight(mode)
    for index in range(runs):
        if credential_error and mode == "llm":
            batch.append(_unrun_result(mode, variant, credential_error, index))
            continue
        config = build_journey_config(
            variant,
            mode,
            max_steps=max_steps,
            timeout_seconds=timeout_seconds,
            artifacts_dir=artifacts_dir,
        )
        result = run_journey(config)
        if mode == "llm" and result.error and _is_credential_error(result.error):
            credential_error = result.error
        batch.append(result)
    return batch


def _llm_preflight(mode: str) -> str | None:
    """Return a credential error without launching a browser when Bedrock is unavailable."""
    if mode != "llm":
        return None
    try:
        from agent.keyboard_agent.agent import _require_boto_session

        region = __import__("os").getenv("AWS_REGION") or __import__("os").getenv("AWS_DEFAULT_REGION") or "us-east-1"
        _require_boto_session(region)
    except RuntimeError as exc:
        return str(exc)
    except Exception as exc:
        return str(exc)
    return None


def _unrun_result(mode: str, variant: str, error: str, index: int) -> JourneyResult:
    """A run that was not executed. It is not scored as a model failure."""
    return JourneyResult(
        run_id=f"not-run-{mode}-{variant}-{index}",
        verdict="BLOCKED",
        reason_code=None,
        agent_mode=mode,  # type: ignore[arg-type]
        variant=variant,
        goal="",
        stop_reason="error",
        error=error,
    )


def _summarize(mode: str, variant: str, batch: list[JourneyResult], *, requested: int) -> dict:
    completed = [result for result in batch if not _was_not_executed(result)]
    correct = sum(1 for result in completed if is_correct(result))
    mismatches = sum(1 for result in completed if result.agent_claim_mismatch)
    return {
        "mode": mode,
        "variant": variant,
        "runs_requested": requested,
        "runs_completed": len(completed),
        "correct_verdicts": correct,
        "average_steps": _mean([len(result.step_events) for result in completed]),
        "average_latency_ms": _mean([result.latency_ms for result in completed]),
        "average_cost_usd": _mean([result.cost_usd for result in completed]),
        "mismatches": mismatches,
        "reliable": bool(requested >= 5 and correct >= 4 and (correct / requested) >= 0.8),
        "not_executed_reason": _not_executed_reason(batch),
    }


def _was_not_executed(result: JourneyResult) -> bool:
    return result.run_id.startswith("not-run-")


def _not_executed_reason(batch: list[JourneyResult]) -> str | None:
    for result in batch:
        if result.error and _is_credential_error(result.error):
            return result.error
    return None


def _is_credential_error(message: str) -> bool:
    text = message.lower()
    return "credentials are not configured" in text or "unable to locate credentials" in text


def _decision(summaries: list[dict]) -> tuple[str, str]:
    broken = _mode_variant(summaries, "llm", "broken")
    fixed = _mode_variant(summaries, "llm", "fixed")
    broken_ok = broken["correct_verdicts"] if broken else 0
    fixed_ok = fixed["correct_verdicts"] if fixed else 0
    broken_n = broken["runs_requested"] if broken else 0
    fixed_n = fixed["runs_requested"] if fixed else 0
    llm_go = bool(broken and fixed and broken["reliable"] and fixed["reliable"])
    template = GO_SENTENCE if llm_go else NO_GO_SENTENCE
    sentence = template.format(
        broken_ok=broken_ok,
        broken_n=broken_n,
        fixed_ok=fixed_ok,
        fixed_n=fixed_n,
    )
    if broken and broken.get("not_executed_reason"):
        sentence += (
            " LLM runs did not execute because Amazon Bedrock credentials were missing, "
            "so this is not a measured model accuracy."
        )
    scripted_broken = _mode_variant(summaries, "scripted", "broken")
    scripted_fixed = _mode_variant(summaries, "scripted", "fixed")
    if scripted_broken and scripted_fixed:
        sentence += (
            " Scripted walker, measured this run: "
            f"broken {scripted_broken['correct_verdicts']} of {scripted_broken['runs_requested']}, "
            f"fixed {scripted_fixed['correct_verdicts']} of {scripted_fixed['runs_requested']}."
        )
    return ("GO" if llm_go else "NO-GO"), sentence


def _mode_variant(summaries: list[dict], mode: str, variant: str) -> dict | None:
    for row in summaries:
        if row["mode"] == mode and row["variant"] == variant:
            return row
    return None


def _mean(values: list[float]) -> float | None:
    if not values:
        return None
    return sum(values) / len(values)


def _markdown(payload: dict) -> str:
    lines = [
        "# Keyboard agent eval",
        "",
        f"Decision: **{payload['decision']}**",
        "",
        f"> {payload['sentence']}",
        "",
        "| mode | variant | runs | correct verdicts | avg steps | avg latency ms | avg cost usd | mismatches | reliable |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for row in payload["summary"]:
        lines.append(
            "| {mode} | {variant} | {runs} | {correct} | {steps} | {latency} | {cost} | {mismatches} | {reliable} |".format(
                mode=row["mode"],
                variant=row["variant"],
                runs=f"{row['runs_completed']}/{row['runs_requested']}",
                correct=row["correct_verdicts"],
                steps=_fmt(row["average_steps"]),
                latency=_fmt(row["average_latency_ms"]),
                cost=_fmt(row["average_cost_usd"], digits=6),
                mismatches=row["mismatches"],
                reliable="yes" if row["reliable"] else "no",
            )
        )
    lines.append("")
    return "\n".join(lines)


def _fmt(value: float | None, digits: int = 1) -> str:
    if value is None:
        return "n/a"
    return f"{value:.{digits}f}"


if __name__ == "__main__":
    raise SystemExit(main())
