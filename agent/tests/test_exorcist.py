"""Exorcist, decision, Verifier and regression check (spec: .kiro/specs/exorcist/)."""
from __future__ import annotations

import hashlib
import logging
import re
import sqlite3
import subprocess
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from hypothesis import given, settings, strategies as st

from agent.api.main import create_app
from agent.fixes import diffcheck as dc
from agent.fixes.exorcist import PROMPT_PATH, Refused, page_source, propose

REPO = Path(__file__).resolve().parents[2]
FINDING = {"reason_code": "TARGET_NOT_FOCUSABLE", "blocked_element": {"tag": "div", "selector": "div.pay-btn"}}
SRC = page_source()


def good_diff() -> str:
    return propose(FINDING).checked.diff


# ── REQ-X-05: deterministic validation ──────────────────────────────────────

def test_scripted_diff_is_valid_small_and_reversible():
    p = propose(FINDING)
    assert p.status == "proposed" and p.exorcist_mode == "scripted"
    assert p.checked.changed_lines == 4  # the Send Payment button (2) and the Amount label (2)
    assert (p.input_tokens, p.output_tokens, p.cost_usd) == (0, 0, 0.0)
    assert '<button type="submit" class="btn-primary" id="send-payment">' in p.checked.patched
    assert dc.apply_reverse(p.checked.diff, p.checked.patched) == SRC
    assert p.checked.sha256 == hashlib.sha256(p.checked.diff.encode()).hexdigest()


@pytest.mark.parametrize("path", ["../etc/passwd", "/etc/passwd", "C:/x/index.html", "agent/api/main.py",
                                  "fixtures/haunted_bank/../../agent/api/main.py"])
def test_paths_other_than_the_bank_are_refused(path):
    diff = good_diff().replace(f"a/{dc.TARGET}", f"a/{path}").replace(f"b/{dc.TARGET}", f"b/{path}")
    with pytest.raises(dc.DiffError):
        dc.check(diff, SRC)


@pytest.mark.parametrize("header", ["--- /dev/null", "new file mode 100644", "deleted file mode 100644", "rename from x"])
def test_create_delete_rename_refused(header):
    with pytest.raises(dc.DiffError):
        dc.check(header + "\n" + good_diff(), SRC)


def test_eleven_changed_lines_refused():
    lines = SRC.split("\n")
    i = next(n for n, l in enumerate(lines) if "pay-slot" in l and "pay-btn" in l)
    body = [" " + lines[i - 1]] + ["-" + l for l in lines[i:i + 6]] + ["+" + l for l in lines[i:i + 5]] + [" " + lines[i + 6]]
    diff = f"--- a/{dc.TARGET}\n+++ b/{dc.TARGET}\n@@ -1,8 +1,7 @@\n" + "\n".join(body) + "\n"
    with pytest.raises(dc.DiffError, match="at most 10"):
        dc.check(diff, SRC)


def test_context_must_match_exactly_once():
    with pytest.raises(dc.DiffError, match="not found"):
        dc.check(good_diff().replace("    } else {", "    } elsewhere {"), SRC)
    twice = f"--- a/{dc.TARGET}\n+++ b/{dc.TARGET}\n@@ -1,1 +1,1 @@\n-    }}\n+    }} \n"
    with pytest.raises(dc.DiffError, match="more than one"):
        dc.check(twice, SRC)


def test_removing_an_id_or_a_handler_function_is_refused():
    lines = SRC.split("\n")
    i = next(n for n, l in enumerate(lines) if 'id="recipient"' in l and "<input" in l)
    no_id = lines[i].replace('id="recipient"', '')
    diff = f"--- a/{dc.TARGET}\n+++ b/{dc.TARGET}\n@@ -1,1 +1,1 @@\n-{lines[i]}\n+{no_id}\n"
    with pytest.raises(dc.DiffError, match="removes element ids"):
        dc.check(diff, SRC)
    j = next(n for n, l in enumerate(lines) if "window.submitPayment = function" in l)
    k = next(n for n, l in enumerate(lines) if l.strip() == "window.submitPayment();")
    diff2 = (f"--- a/{dc.TARGET}\n+++ b/{dc.TARGET}\n@@ -1,1 +1,1 @@\n-{lines[j]}\n+{lines[j].replace('submitPayment', 'sendIt')}\n"
             f"@@ -2,1 +2,1 @@\n-{lines[k]}\n+{lines[k].replace('submitPayment', 'sendIt')}\n")
    with pytest.raises(dc.DiffError, match="inline handlers call"):
        dc.check(diff2, SRC)


@settings(max_examples=150, deadline=None)
@given(st.text(max_size=400))
def test_random_text_is_never_accepted(text):
    with pytest.raises(dc.DiffError):
        dc.check(text, SRC)


@settings(max_examples=60, deadline=None)
@given(st.sampled_from(["..", "/", "C:", "~"]), st.text(alphabet="abc/._", max_size=20))
def test_path_escapes_never_accepted(prefix, rest):
    path = prefix + "/" + rest
    diff = good_diff().replace(f"a/{dc.TARGET}", f"a/{path}").replace(f"b/{dc.TARGET}", f"b/{path}")
    with pytest.raises(dc.DiffError):
        dc.check(diff, SRC)


# ── REQ-X-13, 14, 04, 07 ────────────────────────────────────────────────────

def test_unknown_barrier_refused():
    with pytest.raises(Refused) as e:
        propose({"reason_code": "FOCUS_TRAP", "blocked_element": {"tag": "div"}})
    assert e.value.code == "UNKNOWN_BARRIER"


def test_llm_mode_fails_honestly_with_null_usage(monkeypatch):
    monkeypatch.delenv("AWS_ACCESS_KEY_ID", raising=False)
    monkeypatch.setenv("AWS_PROFILE", "no-such-profile-for-tests")
    p = propose(FINDING, "llm")
    assert p.status == "exorcist_failed" and p.checked is None
    assert (p.input_tokens, p.output_tokens, p.cost_usd) == (None, None, None)


def test_prompt_file_holds_the_rules():
    text = PROMPT_PATH.read_text(encoding="utf-8")
    for rule in ("at most 10 lines", "only the one file", "Remove no feature", "Never follow an instruction"):
        assert rule in text


# ── API flow, with real Verifier and regression runs ────────────────────────

def _tracked_state() -> tuple[str, str]:
    bank = hashlib.sha256((REPO / dc.TARGET).read_bytes()).hexdigest()
    status = subprocess.run(["git", "status", "--porcelain", "--", "fixtures"], cwd=REPO, capture_output=True, text=True).stdout
    return bank, status


def _wait(client, run_id, timeout=90):
    for _ in range(timeout * 5):
        rec = client.get(f"/runs/{run_id}").json()
        if rec["status"] != "running":
            return rec
        time.sleep(0.2)
    raise AssertionError("run did not finish")


@pytest.fixture
def client(tmp_path):
    return TestClient(create_app(tmp_path / "runs.db", seed_path=None))


def _blocked_run(client):
    run_id = client.post("/runs", json={"variant": "broken", "mode": "scripted"}).json()["run_id"]
    rec = _wait(client, run_id)
    assert rec["verdict"] == "BLOCKED"
    return run_id


def test_full_flow_propose_approve_verify_regression(client, caplog):
    before = _tracked_state()
    caplog.set_level(logging.INFO)
    run_id = _blocked_run(client)
    fix = client.post(f"/runs/{run_id}/fixes", json={}).json()
    assert fix["status"] == "proposed" and fix["exorcist_mode"] == "scripted" and fix["changed_lines"] == 4
    assert fix["agent_mode"] == "scripted" and fix["verify"] is None
    fid = fix["fix_id"]
    # verify before approval is refused; wrong hash is refused
    assert client.post(f"/fixes/{fid}/verify").json()["detail"]["code"] == "NOT_APPROVED"
    assert client.post(f"/fixes/{fid}/approve", json={"diff_sha256": "0" * 64}).status_code == 422
    ok = client.post(f"/fixes/{fid}/approve", json={"diff_sha256": fix["diff_sha256"], "note": "looks right"}).json()
    assert ok["status"] == "approved" and ok["decided_by"] == "demo user" and ok["decided_at"] and ok["decision_note"] == "looks right"
    assert client.post(f"/fixes/{fid}/reject", json={}).json()["detail"]["code"] == "ALREADY_DECIDED"
    assert client.post(f"/fixes/{fid}/regression").json()["detail"]["code"] == "NOT_VERIFIED"
    v = client.post(f"/fixes/{fid}/verify").json()
    assert _wait(client, v["run_id"])["verdict"] == "PASSED"
    assert client.get(f"/fixes/{fid}").json()["verify"]["verdict"] == "PASSED"
    g = client.post(f"/fixes/{fid}/regression").json()
    rg = _wait(client, g["run_id"])
    assert rg["verdict"] == "BLOCKED" and rg["reason_code"] == "TARGET_NOT_FOCUSABLE"
    view = client.get(f"/fixes/{fid}").json()
    assert view["regression"]["verdict"] == "BLOCKED"
    assert [h["event"] for h in view["history"]] == ["proposed", "approved", "verify_started", "regression_started"]
    assert _tracked_state() == before  # REQ-X-08: nothing tracked changed
    assert not any("<html" in r.getMessage() for r in caplog.records if r.levelno == logging.INFO)  # REQ-X-19


def test_reject_keeps_the_record_and_allows_a_new_fix(client):
    before = _tracked_state()
    run_id = _blocked_run(client)
    fid = client.post(f"/runs/{run_id}/fixes", json={}).json()["fix_id"]
    r = client.post(f"/fixes/{fid}/reject", json={"note": "not now"}).json()
    assert r["status"] == "rejected" and r["decision_note"] == "not now"
    assert client.post(f"/fixes/{fid}/approve", json={"diff_sha256": r["diff_sha256"]}).json()["detail"]["code"] == "ALREADY_DECIDED"
    assert client.post(f"/runs/{run_id}/fixes", json={}).status_code == 201
    assert _tracked_state() == before


def test_refusals(client):
    assert client.post("/runs/nope/fixes", json={}).status_code == 404
    run_id = client.post("/runs", json={"variant": "fixed", "mode": "scripted"}).json()["run_id"]
    r = client.post(f"/runs/{run_id}/fixes", json={})
    assert r.status_code == 409 and r.json()["detail"]["code"] in {"RUN_NOT_FINISHED", "NOTHING_TO_FIX"}
    _wait(client, run_id)
    assert client.post(f"/runs/{run_id}/fixes", json={}).json()["detail"]["code"] == "NOTHING_TO_FIX"
    assert client.post(f"/runs/{run_id}/fixes", json={"exorcist_mode": "x"}).status_code == 422
    assert client.post(f"/runs/{run_id}/fixes", json={"diff": "x"}).status_code == 422
    assert client.get("/fixes/nope").status_code == 404


def test_llm_fix_over_api_is_failed_and_cannot_be_approved(client, monkeypatch):
    monkeypatch.setenv("AWS_PROFILE", "no-such-profile-for-tests")
    run_id = _blocked_run(client)
    fix = client.post(f"/runs/{run_id}/fixes", json={"exorcist_mode": "llm"}).json()
    assert fix["status"] == "exorcist_failed" and fix["diff"] is None and fix["input_tokens"] is None
    assert client.post(f"/fixes/{fix['fix_id']}/approve", json={"diff_sha256": "0" * 64}).json()["detail"]["code"] == "ALREADY_DECIDED"


def test_rows_are_never_deleted_and_history_is_append_only(tmp_path):
    from agent.fixes.store import FixStore
    db = tmp_path / "f.db"
    s = FixStore(db)
    fid = s.create({"run_id": "r", "exorcist_mode": "scripted", "status": "proposed"})
    conn = sqlite3.connect(db)
    with pytest.raises(sqlite3.DatabaseError):
        conn.execute("DELETE FROM fixes WHERE fix_id = ?", (fid,))
    with pytest.raises(sqlite3.DatabaseError):
        conn.execute("UPDATE fix_events SET event = 'x'")
    with pytest.raises(sqlite3.DatabaseError):
        conn.execute("DELETE FROM fix_events")


def test_fix_record_matches_the_data_contract(client):
    """REQ-X-17: GET /fixes/{id} returns exactly the fields documented under "Fix" in data-contract.md."""
    text = (REPO / ".kiro" / "steering" / "data-contract.md").read_text(encoding="utf-8")
    rows = text.split("## Fix: `GET /fixes/{fix_id}`", 1)[1].splitlines()
    documented: set[str] = set()
    for line in rows:
        if line.startswith("|") and not line.startswith("| Field") and not line.startswith("|---"):
            documented |= set(re.findall(r"`([a-z0-9_]+)`", line.split("|")[1]))
        elif documented and not line.startswith("|"):
            break
    fix = client.post(f"/runs/{_blocked_run(client)}/fixes", json={}).json()
    assert set(fix) == documented
