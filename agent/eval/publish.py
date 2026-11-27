"""Publish verified artifacts/eval/results.json to docs/eval.md (llm-agent-eval TASK-05).

Refuses when status is NOT RUN or INCOMPLETE, or when commit_dirty is true.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from agent.eval.run_eval import render_markdown

DEFAULT_INPUT = Path("artifacts/eval/results.json")
DEFAULT_OUTPUT = Path("docs/eval.md")


class PublishRefused(RuntimeError):
    """Raised when results.json is incomplete, unrun, or produced on a dirty tree."""


def publish_report(results_json: Path = DEFAULT_INPUT, output_md: Path = DEFAULT_OUTPUT) -> Path:
    if not results_json.is_file():
        raise PublishRefused(f"Refused: missing eval file {results_json}.")
    payload = json.loads(results_json.read_text(encoding="utf-8"))
    decision = str(payload.get("decision") or "")
    if decision in {"NOT RUN", "INCOMPLETE"}:
        raise PublishRefused(f"Refused: cannot publish eval with decision '{decision}'.")
    if payload.get("commit_dirty"):
        raise PublishRefused("Refused: cannot publish eval produced on a dirty git tree (commit_dirty=true).")
    if decision not in {"GO", "NO-GO"}:
        raise PublishRefused(f"Refused: unrecognised decision '{decision}'.")

    md = render_markdown(payload)
    output_md.parent.mkdir(parents=True, exist_ok=True)
    output_md.write_text(md, encoding="utf-8")
    return output_md


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Publish eval results.json into docs/eval.md.")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args(argv)
    try:
        dest = publish_report(args.input, args.output)
    except PublishRefused as exc:
        print(str(exc), file=sys.stderr)
        return 1
    print(f"Published {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
