"""Record the fallback runs with details you type, then export them (user-typed-test-details TASK-06).

Asks for a made-up Recipient, Amount and Reference, makes one real scripted run on the broken page and
one on the fixed page through the API with a fresh database, and writes docs/evidence-seed.json with
scripts/export_seed.py. Nothing is typed for you and nothing is edited after the runs.

    .venv/bin/python scripts/record_seed.py
"""
from __future__ import annotations

import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from agent.api.main import create_app  # noqa: E402
from agent.keyboard_agent.models import INTERNAL_DEFAULT_DETAILS, clean_detail  # noqa: E402
from scripts.export_seed import export  # noqa: E402

OUT = Path(__file__).resolve().parents[1] / "docs" / "evidence-seed.json"


def ask(label: str, required: bool) -> str | None:
    while True:
        raw = input(f"{label}{'' if required else ' (optional, Enter to skip)'}: ")
        try:
            return clean_detail(raw, required=required)
        except ValueError as exc:
            print(f"  {label} {exc}. Use made-up details. This is a test bank.")


def main() -> int:
    print("Use made-up details. This is a test bank.")
    details = {"recipient": ask("Recipient", True), "amount": ask("Amount, e.g. 10.00", True), "reference": ask("Reference", False)}
    if details["recipient"] == INTERNAL_DEFAULT_DETAILS["recipient"]:
        print("That is the internal default name. Type a different made-up name.", file=sys.stderr)
        return 1
    with tempfile.TemporaryDirectory() as tmp:
        db = Path(tmp) / "runs.db"
        client = TestClient(create_app(db, seed_path=None))
        for variant in ("broken", "fixed"):
            body = {"variant": variant, "mode": "scripted", **{k: v for k, v in details.items() if v is not None}}
            run_id = client.post("/runs", json=body).json()["run_id"]
            deadline = time.time() + 120
            record = client.get(f"/runs/{run_id}").json()
            while record["status"] == "running" and time.time() < deadline:
                time.sleep(0.3)
                record = client.get(f"/runs/{run_id}").json()
            print(f"{variant}: {record['status']} {record['verdict']} {record['reason_code']}")
        count = export(db, OUT, modes=("scripted",))
    print(f"Wrote {count} recorded run(s) to {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
