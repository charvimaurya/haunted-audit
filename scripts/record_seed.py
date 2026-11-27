"""Record the fallback runs with details you type, then export them (user-typed-test-details TASK-06).

Asks for a made-up Recipient, Amount and Reference. The Amount is checked with the bank's own rule
(two decimals, more than 0.00, at most 1000.00) before anything runs. Then it makes one real scripted
run on the broken page and one on the fixed page through the API, with a fresh database.

docs/evidence-seed.json is written only when the checker gave the expected verdicts:
broken BLOCKED / TARGET_NOT_FOCUSABLE and fixed PASSED. Otherwise nothing is written and the
existing file is left as it was. Nothing is typed for you and nothing is edited after the runs.

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
from agent.keyboard_agent.models import AMOUNT_HINT, INTERNAL_DEFAULT_DETAILS, clean_amount, clean_detail  # noqa: E402
from scripts.export_seed import export  # noqa: E402

OUT = Path(__file__).resolve().parents[1] / "docs" / "evidence-seed.json"
EXPECTED = {"broken": ("BLOCKED", "TARGET_NOT_FOCUSABLE"), "fixed": ("PASSED", None)}


def ask(label: str, required: bool, check=clean_detail) -> str | None:
    while True:
        raw = input(f"{label}{'' if required else ' (optional, Enter to skip)'}: ")
        try:
            return check(raw, required=required)
        except ValueError as exc:
            print(f"  {label} {exc}. Use made-up details. This is a test bank.")


def run_one(client: TestClient, variant: str, details: dict) -> dict:
    """One scripted run through the API. Returns the finished run record."""
    body = {"variant": variant, "mode": "scripted", **{k: v for k, v in details.items() if v is not None}}
    created = client.post("/runs", json=body)
    if created.status_code != 202:
        return {"status": "refused", "verdict": None, "reason_code": None, "detail": created.json().get("detail")}
    run_id = created.json()["run_id"]
    deadline = time.time() + 120
    record = client.get(f"/runs/{run_id}").json()
    while record["status"] == "running" and time.time() < deadline:
        time.sleep(0.3)
        record = client.get(f"/runs/{run_id}").json()
    return record


def problems(records: dict[str, dict]) -> list[str]:
    """Why the runs may not become the recorded fallback. Empty when they may."""
    out = []
    for variant, (verdict, reason) in EXPECTED.items():
        r = records.get(variant) or {}
        if r.get("status") != "complete" or (r.get("verdict"), r.get("reason_code")) != (verdict, reason):
            want = f"{verdict} / {reason}" if reason else verdict
            got = f"{r.get('status')} {r.get('verdict')} / {r.get('reason_code')}"
            out.append(f"{variant} should be {want}, got {got}")
    return out


def record(details: dict, out: Path = OUT) -> int:
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        db = Path(tmp) / "runs.db"
        client = TestClient(create_app(db, seed_path=None))
        records = {}
        for variant in EXPECTED:
            records[variant] = run_one(client, variant, details)
            r = records[variant]
            print(f"{variant}: {r['status']} {r['verdict']} {r['reason_code']}")
        wrong = problems(records)
        if wrong:
            print("Not written: " + "; ".join(wrong) + f". {out} is unchanged.", file=sys.stderr)
            return 1
        staged = Path(tmp) / "seed.json"
        count = export(db, staged, modes=("scripted",))
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(staged.read_text())
    print(f"Wrote {count} recorded run(s) to {out}")
    return 0


def main() -> int:
    print("Use made-up details. This is a test bank.")
    details = {
        "recipient": ask("Recipient", True),
        "amount": ask(f"Amount ({AMOUNT_HINT}, up to 1000.00)", True, check=clean_amount),
        "reference": ask("Reference", False),
    }
    if details["recipient"] == INTERNAL_DEFAULT_DETAILS["recipient"]:
        print("That is the internal default name. Type a different made-up name.", file=sys.stderr)
        return 1
    return record(details)


if __name__ == "__main__":
    raise SystemExit(main())
