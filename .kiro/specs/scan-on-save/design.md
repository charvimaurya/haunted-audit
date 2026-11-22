# Scan on save: design

## Files

| File | What |
|---|---|
| `backend/scan_file.py` | CLI and `scan_file(path) -> list[dict]`. Standard library only |
| `.kiro/hooks/scan-on-save.json` | `PostFileSave` command hook, relative paths |
| `tests/unit/test_scan_file.py` | unit tests with small fixture strings |
| `.kiro/steering/data-contract.md` | new "File finding" section |

## How the scanner works

1. **Path in.** Path from `argv[1]`. If none, read the hook's JSON from STDIN and take the first string value that ends in `.html` or `.tsx` (the STDIN field names are not documented in detail, so the scanner does not depend on one key).
2. **Scope check.** Resolve the path relative to the repo root. Out of scope (wrong folder, wrong extension, a test file, or outside the repo): print nothing, exit 0.
3. **HTML.** `html.parser.HTMLParser` collects labels (`for` ids, open `<label>` depth) and form controls with their line. Script bodies are searched for `.innerHTML = <string literals joined with +>;` and each fragment is parsed on its own, with the page's static `for` ids added.
4. **TSX.** A small scanner finds JSX tags `<input`, `<select`, `<textarea` and `<label`, reads attributes while respecting `{ }` nesting and quotes, and tracks open `<label>` elements. `htmlFor="x"` anywhere in the file labels `id="x"`. Spread props or computed name attributes make the element undecidable, so it is skipped.
5. **Out.** JSON: `{"file", "findings": [...]}`. With no finding and when run by the hook, print nothing.

## Finding shape

```json
{
  "finding_id": "label-3f9c1a2b7d10",
  "source": "scan_file",
  "rule": "label",
  "wcag": ["1.3.1", "3.3.2", "4.1.2"],
  "severity": "serious",
  "file": "fixtures/haunted_bank/index.html",
  "line": 188,
  "element": "input#amount",
  "message": "This input has no accessible name. Add <label for=\"amount\">, aria-label or aria-labelledby."
}
```

`finding_id` is `label-` plus the first 12 hex digits of SHA-256 of `file|line|rule|element`.

## Exit codes

0 always for the hook (a finding is information, not a hook error). `--strict` exits 1 when there is a finding, for CI use.
