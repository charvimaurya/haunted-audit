"""Export real finished runs from a local runs.db into docs/evidence-seed.json.

Rows come straight from the database. Nothing is edited or invented. A run
without a stored result is refused. Usage:

    python scripts/export_seed.py --db data/runs.db --out docs/evidence-seed.json
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path


def export(db: Path, out: Path, *, limit_per_variant: int = 1, modes: tuple[str, ...] = ("scripted", "llm")) -> int:
    conn = sqlite3.connect(db)
    conn.row_factory = sqlite3.Row
    runs = []
    for variant in ("broken", "fixed"):
        rows = conn.execute(
            """SELECT run_id, variant, mode, status, json, created_at FROM runs
               WHERE variant = ? AND status = 'complete' AND json IS NOT NULL AND seeded = 0
               ORDER BY created_at DESC""",
            (variant,),
        ).fetchall()
        taken = 0
        for row in rows:
            if row["mode"] not in modes:
                continue
            result = json.loads(row["json"])
            if not result.get("verdict"):
                continue  # no checker verdict, not a real finished run
            events = [json.loads(r["json"]) for r in conn.execute(
                "SELECT json FROM events WHERE run_id = ? ORDER BY seq", (row["run_id"],))]
            runs.append({
                "run_id": row["run_id"],
                "variant": row["variant"],
                "mode": row["mode"],
                "status": row["status"],
                "recorded_at": row["created_at"].replace(" ", "T") + "Z",
                "result": result,
                "events": events,
            })
            taken += 1
            if taken >= limit_per_variant:
                break
    payload = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "scripts/export_seed.py",
        "runs": runs,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n")
    return len(runs)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=Path("data/runs.db"))
    parser.add_argument("--out", type=Path, default=Path("docs/evidence-seed.json"))
    parser.add_argument("--per-variant", type=int, default=1)
    args = parser.parse_args()
    if not args.db.exists():
        print(f"No database at {args.db}. Make real runs first.", file=sys.stderr)
        return 1
    count = export(args.db, args.out, limit_per_variant=args.per_variant)
    print(f"Wrote {count} recorded run(s) to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
