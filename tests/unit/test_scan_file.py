"""Unit tests for backend/scan_file.py (spec: .kiro/specs/scan-on-save/)."""
import io
import json
import subprocess
import sys
import time
from pathlib import Path

import pytest

from backend import scan_file as sf

REPO = Path(__file__).resolve().parents[2]
BANK = REPO / "fixtures" / "haunted_bank" / "index.html"


def html(body: str) -> list[dict]:
    return sf.scan_html(f"<html><body>{body}</body></html>", "x.html")


def tsx(body: str) -> list[dict]:
    return sf.scan_tsx(f"export function C() {{ return (<form>{body}</form>); }}", "x.tsx")


# ── REQ-SCAN-02: the ways to be labelled ────────────────────────────────────

@pytest.mark.parametrize("body", [
    '<label for="a">Amount</label><input id="a">',
    '<label>Amount <input id="a"></label>',
    '<input id="a" aria-label="Amount">',
    '<span id="t">Amount</span><input id="a" aria-labelledby="t">',
    '<input id="a" title="Amount">',
    '<input id="a" placeholder="Amount">',
    '<input type="hidden" name="t">',
    '<input type="submit" value="Send">',
    '<input type="button" value="Go">',
])
def test_html_labelled_or_exempt_gives_no_finding(body):
    assert html(body) == []


@pytest.mark.parametrize("body,element", [
    ('<input id="a">', "input#a"),
    ('<span>Amount</span><input id="a">', "input#a"),
    ('<label for="other">Other</label><input id="a">', "input#a"),
    ('<input id="a" aria-label="  ">', "input#a"),
    ('<select name="s"><option>1</option></select>', "select[name=s]"),
    ("<textarea></textarea>", "textarea"),
    ("<label></label><input>", "input"),
])
def test_html_unlabelled_gives_one_finding(body, element):
    out = html(body)
    assert [f["element"] for f in out] == [element]


@pytest.mark.parametrize("body", [
    '<label htmlFor="a">Amount</label><input id="a" />',
    '<label>Amount <input id="a" /></label>',
    '<input id="a" aria-label="Amount" />',
    '<input aria-labelledby="t" />',
    '<input type="hidden" name="t" />',
])
def test_tsx_labelled_gives_no_finding(body):
    assert tsx(body) == []


def test_tsx_unlabelled_gives_finding_with_line():
    src = 'export function C() {\n  return (\n    <input id="amt" type="text" />\n  );\n}\n'
    out = sf.scan_tsx(src, "x.tsx")
    assert [(f["element"], f["line"]) for f in out] == [("input#amt", 3)]


# ── REQ-SCAN-03: only certain answers ───────────────────────────────────────

@pytest.mark.parametrize("body", [
    "<input {...props} />",
    "<input aria-label={label} />",
    "<input id={id} />",
    "<input type={kind} />",
    '<label htmlFor={fieldId}>Name</label><input id="n" />',
])
def test_tsx_undecidable_gives_no_finding(body):
    assert tsx(body) == []


def test_tsx_ignores_markup_in_comments():
    src = "/** Fields are real <input> elements. */\n// <input>\nexport const C = () => <div />;\n"
    assert sf.scan_tsx(src, "x.tsx") == []


# ── REQ-SCAN-01, 04: the bank page ──────────────────────────────────────────

def test_bank_page_reports_amount_only():
    out = sf.scan_file(BANK)
    assert [f["element"] for f in out] == ["input#amount"]
    lines = BANK.read_text(encoding="utf-8").splitlines()
    n = out[0]["line"]
    # the haunted assignment is reported: its text is a <span>, not a <label>
    assert '<input id="amount"' in lines[n - 1]
    assert '<span class="field-title">' in lines[n - 2]


def test_innerhtml_fragment_with_its_own_label_is_clean():
    page = """<div id="slot"></div><script>
      if (fixed) { slot.innerHTML = '<label for="amt">Amount</label>' +
        '<input id="amt">'; }
      else { slot.innerHTML = '<span>Amount</span>' +
        '<input id="amt">'; }
    </script>"""
    out = sf.scan_html(page, "x.html")
    assert len(out) == 1 and out[0]["element"] == "input#amt"
    assert out[0]["line"] == 5


# ── REQ-SCAN-05: finding shape ──────────────────────────────────────────────

def test_finding_shape_and_stable_id():
    a = html('<input id="a">')[0]
    assert set(a) == {"finding_id", "source", "rule", "wcag", "severity", "file", "line", "element", "message"}
    assert a["source"] == "scan_file" and a["rule"] == "label" and a["severity"] == "serious"
    assert a["finding_id"].startswith("label-") and len(a["finding_id"]) == len("label-") + 12
    assert html('<input id="a">')[0]["finding_id"] == a["finding_id"]


# ── REQ-SCAN-06: quiet hook ─────────────────────────────────────────────────

def run_hook(event: dict) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, str(REPO / "backend" / "scan_file.py"), "--hook"],
                          input=json.dumps(event), capture_output=True, text=True, cwd=REPO, timeout=20)


def test_hook_prints_finding_for_bank_page():
    r = run_hook({"event": "PostFileSave", "file": {"path": "fixtures/haunted_bank/index.html"}})
    assert r.returncode == 0
    data = json.loads(r.stdout)
    assert data["file"] == "fixtures/haunted_bank/index.html"
    assert [f["element"] for f in data["findings"]] == ["input#amount"]


@pytest.mark.parametrize("path", [
    "README.md",
    "agent/keyboard_agent/checker.py",
    "dashboard/src/test/a11y.test.tsx",
    "dashboard/src/components/RunControls.tsx",  # in scope but clean
    "../outside.html",
])
def test_hook_is_quiet(path):
    r = run_hook({"filePath": path})
    assert r.returncode == 0 and r.stdout == ""


def test_hook_with_absolute_path():
    r = run_hook({"paths": [str(BANK)]})
    assert json.loads(r.stdout)["findings"][0]["element"] == "input#amount"


# ── REQ-SCAN-07: speed of the scan itself ───────────────────────────────────

def test_scan_is_fast():
    start = time.perf_counter()
    sf.scan_file(BANK)
    assert time.perf_counter() - start < 1.0


def test_rejects_other_file_types(tmp_path):
    p = tmp_path / "a.css"
    p.write_text("a{}")
    with pytest.raises(ValueError):
        sf.scan_file(p)


# ── review fixes (22 Nov 2026) ──────────────────────────────────────────────

@pytest.mark.parametrize("body", ['<input placeholder="abc', "<input value={x", "<input {...props"])
def test_tsx_half_typed_tag_does_not_hang(body):
    start = time.perf_counter()
    assert sf.scan_tsx(f"const C = () => ({body}", "x.tsx") == []
    assert time.perf_counter() - start < 1.0


def test_html_aria_labelledby_to_missing_id_is_a_finding():
    assert [f["element"] for f in html('<input id="a" aria-labelledby="missing">')] == ["input#a"]
    assert html('<span id="t">Amount</span><input id="a" aria-labelledby="t">') == []
