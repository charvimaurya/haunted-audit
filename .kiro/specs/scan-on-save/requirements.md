# Scan on save: requirements

Plan item 13 (finish the hook form check). Status: approved by the owner on 22 Nov 2026 ("make all the decisions").

## Goal

When a developer saves an HTML or TSX file in the bank or the dashboard, Kiro shows any form field that has no label within 10 seconds, without spending model credits on unrelated saves.

## Requirements

**REQ-SCAN-01: One file, one command.** `python backend/scan_file.py <path>` scans exactly one saved `.html` or `.tsx` file and prints its findings as JSON. It uses the Python standard library only, so it runs the same on Windows and macOS.
- Acceptance: running it on `fixtures/haunted_bank/index.html` prints one finding for `#amount` (planted barrier 2) and no finding for `#recipient`.

**REQ-SCAN-02: Missing form labels.** A finding is raised for an `input` (except `hidden`, `submit`, `reset`, `button`, `image`), `select` or `textarea` that has none of: a non-empty `aria-label`, an `aria-labelledby`, a `<label for>` (HTML) or `htmlFor` (TSX) that names its `id`, or a wrapping `<label>`.
- Acceptance: unit tests cover each of the five ways to be labelled and each way to be unlabelled.

**REQ-SCAN-03: Only certain answers.** When the scanner cannot decide (a TSX element that spreads props with `{...}`, or a computed `aria-label={...}` expression), it raises no finding. A rule with one right answer is code; nothing is guessed.
- Acceptance: a unit test with `{...props}` returns no finding.

**REQ-SCAN-04: Markup inside scripts.** Markup assigned with `.innerHTML = '...'` in a `<script>` is scanned one assignment at a time, together with the page's static labels. This is how the bank page builds its haunted and fixed variants.
- Acceptance: the fixed-variant assignment of `#amount` (which includes its label) raises no finding; the haunted one does.

**REQ-SCAN-05: Data-contract shape.** Each finding has `finding_id`, `source`, `rule`, `wcag`, `severity`, `file`, `line`, `element`, `message`. `finding_id` is stable for the same file, line, rule and element. The shape is added to `.kiro/steering/data-contract.md` in the same pull request.

**REQ-SCAN-06: Quiet hook.** A `PostFileSave` command hook runs the scanner only for `.html` and `.tsx` files under `bank/`, `fixtures/haunted_bank/` and `dashboard/src/` (tests excluded). It uses relative paths only. When there is no finding it prints nothing and exits 0, so nothing is added to the agent's context. A command action never calls a model.
- Acceptance: a unit test shows that an out-of-scope path and a clean file both print nothing.

**REQ-SCAN-07: Speed.** The scan itself finishes in under 1 second on the bank page. The end-to-end target (save to finding visible in Kiro) is under 10 seconds and is measured by hand in Kiro IDE, then recorded in `docs/devlog.md`.

## Out of scope

Contrast, focus and keyboard checks (the keyboard agent and axe cover those); auto-fixing; URLs.

## Note on folders

`bank/` holds only `PLANTED.md` and a README today. The bank page itself is `fixtures/haunted_bank/index.html`, so the hook also covers that folder.
