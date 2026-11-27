"""Run the keyboard agent N times and write results.json plus results.md (llm-agent-eval).

A mode is reliable only when at least 4 of 5 runs reach the correct verdict:
broken -> BLOCKED with the pay control as the blocked element, fixed -> PASSED.
GO requires the LLM mode to be reliable on both variants. Every number in the
report is computed from the runs just executed.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from agent.eval.preflight import PreflightError, run_preflight
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
INCOMPLETE_SENTENCE = (
    "INCOMPLETE. Fewer than 5 scored LLM runs executed on one or both variants "
    "(broken {broken_done} of {broken_n}, fixed {fixed_done} of {fixed_n})."
)
NOT_RUN_SENTENCE = (
    "NOT RUN. Preflight failed before scored evaluation: {reason}"
)


def _git_metadata(repo_root: Path | None = None) -> tuple[str, bool]:
    root = repo_root or Path(__file__).resolve().parents[2]
    commit = "unknown"
    dirty = True
    try:
        c = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=root,
            capture_output=True,
            text=True,
            timeout=5,
        )
        if c.returncode == 0 and c.stdout.strip():
            commit = c.stdout.strip()
        s = subprocess.run(
            ["git", "status", "--porcelain", "--", "agent", "fixtures"],
            cwd=root,
            capture_output=True,
            text=True,
            timeout=5,
        )
        if s.returncode == 0:
            dirty = bool(s.stdout.strip())
    except OSError:
        pass
    return commit, dirty


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


def serialize_run(result: JourneyResult) -> dict[str, Any]:
    """Convert JourneyResult to the design section 4 per-run object with setup_error."""
    setup_error = result.error if (result.error and len(result.step_events) == 0) else None
    return {
        "run_id": result.run_id,
        "mode": result.agent_mode,
        "variant": result.variant,
        "verdict": result.verdict,
        "reason_code": result.reason_code,
        "correct": False if setup_error else is_correct(result),
        "steps": len(result.step_events),
        "latency_ms": round(float(result.latency_ms or 0.0), 1),
        "input_tokens": int(result.tokens.input_tokens or 0),
        "output_tokens": int(result.tokens.output_tokens or 0),
        "total_tokens": int(result.tokens.total_tokens or 0),
        "cost_usd": float(result.cost_usd or 0.0),
        "agent_claim": result.agent_claim,
        "agent_claim_mismatch": bool(result.agent_claim_mismatch),
        "stop_reason": result.stop_reason,
        "error": None if setup_error else result.error,
        "setup_error": setup_error,
    }


def _summarize(mode: str, variant: str, batch: list[JourneyResult], *, requested: int) -> dict[str, Any]:
    executed = [r for r in batch if not _is_not_run(r)]
    correct = sum(1 for r in executed if is_correct(r))
    mismatches = sum(1 for r in executed if r.agent_claim_mismatch)
    not_run_reason = next(
        (r.error for r in batch if r.error and len(r.step_events) == 0),
        None,
    )
    return {
        "mode": mode,
        "variant": variant,
        "runs_requested": requested,
        "runs_completed": len(executed),
        "correct_verdicts": correct,
        "average_steps": _mean([float(len(r.step_events)) for r in executed]),
        "average_latency_ms": _mean([float(r.latency_ms) for r in executed]),
        "average_cost_usd": _mean([float(r.cost_usd) for r in executed]),
        "total_tokens": sum(int(r.tokens.total_tokens or 0) for r in executed),
        "total_cost_usd": round(sum(float(r.cost_usd or 0.0) for r in executed), 8),
        "mismatches": mismatches,
        "reliable": bool(len(executed) >= 5 and correct >= 4 and (correct / len(executed)) >= 0.8),
        "not_executed_reason": not_run_reason,
    }


def _is_not_run(result: JourneyResult) -> bool:
    """True for placeholder not-run records OR pre-step setup errors (before first step event)."""
    return result.run_id.startswith("not-run-") or bool(result.error and len(result.step_events) == 0)


def compute_totals(runs: list[dict[str, Any]], *, preflight_cost_usd: float = 0.0) -> dict[str, Any]:
    executed = [r for r in runs if r.get("setup_error") is None and not str(r.get("run_id", "")).startswith("not-run-")]
    in_tok = sum(int(r.get("input_tokens") or 0) for r in runs)
    out_tok = sum(int(r.get("output_tokens") or 0) for r in runs)
    tot_tok = sum(int(r.get("total_tokens") or 0) for r in runs)
    run_cost = sum(float(r.get("cost_usd") or 0.0) for r in runs)
    return {
        "runs_executed": len(executed),
        "runs_not_executed": len(runs) - len(executed),
        "input_tokens": in_tok,
        "output_tokens": out_tok,
        "total_tokens": tot_tok,
        "runs_cost_usd": round(run_cost, 8),
        "preflight_cost_usd": round(float(preflight_cost_usd or 0.0), 8),
        "cost_usd": round(run_cost + float(preflight_cost_usd or 0.0), 8),
    }


def _decision(
    summaries: list[dict[str, Any]],
    *,
    requested: int,
    cost_guard_triggered: bool = False,
    preflight_error: str | None = None,
) -> tuple[str, str]:
    if preflight_error is not None:
        return "NOT RUN", NOT_RUN_SENTENCE.format(reason=preflight_error)

    broken = _mode_variant(summaries, "llm", "broken")
    fixed = _mode_variant(summaries, "llm", "fixed")
    broken_done = broken["runs_completed"] if broken else 0
    fixed_done = fixed["runs_completed"] if fixed else 0
    broken_ok = broken["correct_verdicts"] if broken else 0
    fixed_ok = fixed["correct_verdicts"] if fixed else 0
    broken_n = broken["runs_requested"] if broken else requested
    fixed_n = fixed["runs_requested"] if fixed else requested

    if (broken or fixed) and (cost_guard_triggered or broken_done < 5 or fixed_done < 5):
        sentence = INCOMPLETE_SENTENCE.format(
            broken_done=broken_done,
            broken_n=broken_n,
            fixed_done=fixed_done,
            fixed_n=fixed_n,
        )
        if cost_guard_triggered:
            sentence += " Stopped by --max-cost-usd guard."
        return "INCOMPLETE", sentence

    llm_go = bool(broken and fixed and broken["reliable"] and fixed["reliable"])
    template = GO_SENTENCE if llm_go else NO_GO_SENTENCE
    sentence = template.format(
        broken_ok=broken_ok,
        broken_n=broken_n,
        fixed_ok=fixed_ok,
        fixed_n=fixed_n,
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


def build_report_payload(
    all_results: list[JourneyResult],
    *,
    requested: int,
    max_steps: int,
    timeout_seconds: float,
    max_cost_usd: float,
    model_id: str,
    region: str,
    preflight_info: dict[str, Any] | None = None,
    preflight_error: str | None = None,
    cost_guard_triggered: bool = False,
    commit: str | None = None,
    commit_dirty: bool | None = None,
    generated_at: str | None = None,
) -> dict[str, Any]:
    """Assemble results.json payload from JourneyResult objects (pure/testable)."""
    if commit is None or commit_dirty is None:
        git_commit, git_dirty = _git_metadata()
        commit = commit or git_commit
        commit_dirty = git_dirty if commit_dirty is None else commit_dirty

    seen: list[tuple[str, str]] = []
    for r in all_results:
        pair = (r.agent_mode, r.variant)
        if pair not in seen:
            seen.append(pair)
    summaries = [
        _summarize(
            mode,
            variant,
            [r for r in all_results if r.agent_mode == mode and r.variant == variant],
            requested=requested,
        )
        for mode, variant in seen
    ]
    decision, sentence = _decision(
        summaries,
        requested=requested,
        cost_guard_triggered=cost_guard_triggered,
        preflight_error=preflight_error,
    )
    serialized_runs = [serialize_run(r) for r in all_results]
    preflight_cost = float((preflight_info or {}).get("cost_usd") or 0.0)
    totals = compute_totals(serialized_runs, preflight_cost_usd=preflight_cost)

    return {
        "generated_at": generated_at or datetime.now(timezone.utc).isoformat(),
        "commit": commit,
        "commit_dirty": bool(commit_dirty),
        "model_id": model_id,
        "region": region,
        "settings": {
            "runs": requested,
            "max_steps": max_steps,
            "timeout_seconds": timeout_seconds,
            "temperature": float(os.getenv("BEDROCK_TEMPERATURE", "0.1")),
            "max_tokens": int(os.getenv("BEDROCK_MAX_TOKENS", "1024")),
            "max_cost_usd": max_cost_usd,
        },
        "preflight": preflight_info,
        "preflight_error": preflight_error,
        "rule": "4 of 5 correct verdicts on each variant",
        "decision": decision,
        "sentence": sentence,
        "summary": summaries,
        "runs": serialized_runs,
        "totals": totals,
    }


def render_markdown(payload: dict[str, Any]) -> str:
    """Format results.md and docs/eval.md consistently from a results payload."""
    settings = payload.get("settings") or {}
    totals = payload.get("totals") or {}
    lines = [
        "# Keyboard agent eval",
        "",
        f"- **Date:** {payload.get('generated_at', '--')}",
        f"- **Commit:** `{payload.get('commit', 'unknown')}` (dirty: {'yes' if payload.get('commit_dirty') else 'no'})",
        f"- **Model / Region:** `{payload.get('model_id', '--')}` (`{payload.get('region', '--')}`)",
        (
            f"- **Settings:** runs={settings.get('runs', '--')}, max_steps={settings.get('max_steps', '--')}, "
            f"timeout={settings.get('timeout_seconds', '--')}s, temp={settings.get('temperature', '--')}, "
            f"max_cost_usd={settings.get('max_cost_usd', '--')}"
        ),
        "",
        f"Decision: **{payload['decision']}**",
        "",
        f"> {payload['sentence']}",
        "",
        "## Summary",
        "",
        "| mode | variant | runs | correct verdicts | avg steps | avg latency ms | avg cost usd | mismatches | reliable |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for row in payload.get("summary", []):
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

    lines.extend(
        [
            "",
            "## Per-run results",
            "",
            "| run_id | mode | variant | verdict | reason_code | correct | steps | latency ms | tokens | cost usd | setup_error |",
            "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
        ]
    )
    for r in payload.get("runs", []):
        lines.append(
            "| {run_id} | {mode} | {variant} | {verdict} | {reason} | {correct} | {steps} | {latency} | {tokens} | {cost} | {setup_error} |".format(
                run_id=r.get("run_id", "--"),
                mode=r.get("mode", "--"),
                variant=r.get("variant", "--"),
                verdict=r.get("verdict") or "--",
                reason=r.get("reason_code") or "--",
                correct="not run" if r.get("setup_error") else ("yes" if r.get("correct") else "no"),
                steps=r.get("steps", 0),
                latency=_fmt(r.get("latency_ms")),
                tokens=r.get("total_tokens", 0),
                cost=f"{float(r.get('cost_usd') or 0.0):.6f}",
                setup_error=(r.get("setup_error") or "--").replace("|", "/"),
            )
        )

    lines.extend(
        [
            "",
            "## Totals & Cost Basis",
            "",
            f"- **Executed runs:** {totals.get('runs_executed', 0)} (not executed: {totals.get('runs_not_executed', 0)})",
            f"- **Tokens:** {totals.get('input_tokens', 0)} in + {totals.get('output_tokens', 0)} out = {totals.get('total_tokens', 0)} total",
            f"- **Estimated total cost:** ${float(totals.get('cost_usd') or 0.0):.6f} USD (preflight ${float(totals.get('preflight_cost_usd') or 0.0):.6f} + runs ${float(totals.get('runs_cost_usd') or 0.0):.6f})",
            "- **Cost basis:** Token counts measured from Strands `accumulated_usage` multiplied by configured `.env` list rates (`BEDROCK_INPUT_USD_PER_MTOK`, `BEDROCK_OUTPUT_USD_PER_MTOK`); estimate only, not an AWS invoice.",
            "",
        ]
    )
    return "\n".join(lines)


def _run_batch(
    mode: str,
    variant: str,
    *,
    runs: int,
    max_steps: int,
    timeout_seconds: float,
    artifacts_dir: str,
    max_cost_usd: float,
    spent_cost_usd: float,
) -> tuple[list[JourneyResult], float, bool]:
    batch: list[JourneyResult] = []
    running_cost = spent_cost_usd
    cost_guard_hit = False
    for _index in range(runs):
        if mode == "llm" and running_cost >= max_cost_usd:
            cost_guard_hit = True
            break
        config = build_journey_config(
            variant,
            mode,
            max_steps=max_steps,
            timeout_seconds=timeout_seconds,
            artifacts_dir=artifacts_dir,
        )
        result = run_journey(config)
        if mode == "llm":
            running_cost += float(result.cost_usd or 0.0)
        batch.append(result)
    return batch, running_cost, cost_guard_hit


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Evaluate keyboard-agent reliability.")
    parser.add_argument("--modes", default="llm,scripted")
    parser.add_argument("--variants", default="broken,fixed")
    parser.add_argument("--runs", type=int, default=5)
    parser.add_argument("--max-steps", type=int, default=25)
    parser.add_argument("--timeout", type=float, default=90)
    parser.add_argument("--max-cost-usd", type=float, default=10.0)
    parser.add_argument("--out", default="artifacts/eval")
    args = parser.parse_args(argv)

    modes = [item.strip() for item in args.modes.split(",") if item.strip()]
    variants = [item.strip() for item in args.variants.split(",") if item.strip()]
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    model_id = os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-6")
    region = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-1"

    preflight_info: dict[str, Any] | None = None
    if "llm" in modes:
        try:
            preflight_info = run_preflight(region=region, model_id=model_id)
        except PreflightError as exc:
            print(exc.instruction, file=sys.stderr)
            payload = build_report_payload(
                [],
                requested=args.runs,
                max_steps=args.max_steps,
                timeout_seconds=args.timeout,
                max_cost_usd=args.max_cost_usd,
                model_id=model_id,
                region=region,
                preflight_error=exc.instruction,
            )
            (out_dir / "results.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
            (out_dir / "results.md").write_text(render_markdown(payload), encoding="utf-8")
            return 2

    all_results: list[JourneyResult] = []
    spent_cost = float((preflight_info or {}).get("cost_usd") or 0.0)
    cost_guard_triggered = False

    for mode in modes:
        for variant in variants:
            batch, spent_cost, hit = _run_batch(
                mode,
                variant,
                runs=args.runs,
                max_steps=args.max_steps,
                timeout_seconds=args.timeout,
                artifacts_dir=str(out_dir / "runs"),
                max_cost_usd=args.max_cost_usd,
                spent_cost_usd=spent_cost,
            )
            all_results.extend(batch)
            if hit:
                cost_guard_triggered = True

    payload = build_report_payload(
        all_results,
        requested=args.runs,
        max_steps=args.max_steps,
        timeout_seconds=args.timeout,
        max_cost_usd=args.max_cost_usd,
        model_id=model_id,
        region=region,
        preflight_info=preflight_info,
        cost_guard_triggered=cost_guard_triggered,
    )
    json_path = out_dir / "results.json"
    md_path = out_dir / "results.md"
    md = render_markdown(payload)
    json_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    md_path.write_text(md, encoding="utf-8")
    print(md)
    print(f"Wrote {json_path}")
    print(f"Wrote {md_path}")
    return 0


def _mode_variant(summaries: list[dict[str, Any]], mode: str, variant: str) -> dict[str, Any] | None:
    for row in summaries:
        if row["mode"] == mode and row["variant"] == variant:
            return row
    return None


def _mean(values: list[float]) -> float | None:
    if not values:
        return None
    return sum(values) / len(values)


def _fmt(value: float | None, digits: int = 1) -> str:
    if value is None:
        return "n/a"
    return f"{value:.{digits}f}"


if __name__ == "__main__":
    raise SystemExit(main())
