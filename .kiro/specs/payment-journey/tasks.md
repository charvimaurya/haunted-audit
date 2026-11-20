# Working payment journey and hidden test controls - Tasks

Order: diagnose -> fix payment -> barriers and PLANTED.md -> session state machine -> frontend wiring -> hide controls -> tests -> pull request.

Effort figures are my estimates in hours (not measured, not from your plan).

## Rules for every task

- One branch per task from the spec branch: `feature/payment-<name>`. One small pull request each, or one pull request for the whole spec if you prefer. Read every diff.
- The site and the agent keep working after every task. After each: `.venv/bin/python -m pytest -q`, and for dashboard tasks `cd dashboard && npm test`.
- Regression gate after any change to the bank page: `.venv/bin/python -m agent.eval.run_eval --modes scripted --runs 5` must give 5 of 5 on `broken` and 5 of 5 on `fixed`. Paste the output into the pull request. Update `docs/evidence.md` only with numbers that run produced.
- Do not edit `agent/keyboard_agent/checker.py` or the keyboard tools (REQ-REG-03).
- No keys, no real data. The payment is fake; nothing typed in the bank page is stored or sent.
- Every failure goes into `evals/cases.yaml`. One line per task in `docs/devlog.md`.
- Tests are reported as measured. A browser or path that was not run is reported as "not run".

---

## Phase 0 - Diagnose

### TASK-01 Diagnosis (done, no code changed)
**Satisfies:** REQ-DIAG-01
**Done:** `docs/bug-payment.md`, `docs/bug-payment/matrix.py`, `docs/bug-payment/dashboard.py`, `docs/bug-payment/matrix-output.json`.
**Result:** the test page pays by mouse in both variants (Chromium 156 and Chrome 157); the keyboard works only in fixed. The dashboard panel pays in no state, because it is a drawing with no handler.
**Verified by:** re-running the two scripts reproduces the tables. (The test page script was re-run from the copy in `docs/bug-payment/` and matched `matrix-output.json` exactly.)
**Not covered:** Safari, Firefox, WebKit and a person's hands. Say so in the pull request.

---

## Phase 1 - Fix the payment

### TASK-02 Working fake payment on the bank page
**Satisfies:** REQ-PAY-01 to REQ-PAY-09, REQ-REG-01, REQ-REG-04
**Effort:** 4
**Steps:**
1. In `fixtures/haunted_bank/index.html`: remove `#variant-badge`; add the `<!--BANK_CONFIG-->` marker and the variant source (design 2.3); put the pay logic in one `pay()` used by the div's click and the form's submit; add validation, the fake balance and `#balance` (design 2.5); add Cancel behaviour.
2. Keep every id and class in REQ-PAY-09. Add nothing that matches `div.pay-btn` or `button.btn-primary` except the two controls.
3. Add `agent/tests/test_bank_page.py` with a fixture that serves the page from a real local server and runs Playwright in the bundled Chromium (and Chrome if installed). Cover REQ-PAY-01 to REQ-PAY-08.
4. Run the regression gate.
**Verified by:** the validation table (12 inputs, exact messages); pay 50.00 twice, then 900.01 refused, then 900.00 gives balance 0.00; haunted: mouse completes and Tab never reaches `#send-payment` (20 tabs, both directions); fixed: mouse, Enter, Space and Enter-in-field complete; no network request and empty storage after a payment; `read_page` on both pages has no variant text; the eval gate is 5 of 5 and 5 of 5.

---

## Phase 2 - Barriers and the answer key

### TASK-03 Add barriers 2 to 6 and write PLANTED.md
**Satisfies:** REQ-BAR-01 to REQ-BAR-10
**Effort:** 4
**Steps:**
1. Add the five barriers to the haunted state and their repaired form to the fixed state, exactly as in design 2.4. One barrier per commit so each can be reverted alone.
2. Write `bank/PLANTED.md`: a table with number, what is wrong, selector, WCAG criterion, how found (axe rule or keyboard or manual), the testable criterion, the repaired form. Fill the measured numbers (contrast ratios of the haunted and fixed hint, the haunted focus style) from the test output, not from this spec.
3. Add `agent/tests/test_bank_barriers.py` with one present-in-haunted and one repaired-in-fixed assertion per barrier (12 in all), and the REQ-BAR-02 test: a copy of the haunted page with only barrier 1 repaired completes a keyboard-only payment and still has barriers 2 to 6.
4. Add `agent/tests/test_bank_axe.py` (design section 6): fixed has zero violations; haunted violates exactly `label`, `color-contrast`, `button-name`. A comment lists barriers 1, 4 and 6 as not detectable by axe and says where each is tested.
5. Run the regression gate. Add any scripted-walker difference you find to `evals/cases.yaml`.
**Verified by:** all 12 assertions pass; the exact-rule-set axe test passes; PLANTED.md has six complete rows and the numbers match the test output; a source scan finds no hint words in the served page; the eval gate is still 5 of 5 and 5 of 5.
**If the axe set is not exactly the three:** stop and report which rule appeared. Do not widen the expected set without a recorded reason.

---

## Phase 3 - Session state machine and bank route

### TASK-04 Sessions, state machine and bank route
**Satisfies:** REQ-SES-01 to REQ-SES-09, REQ-BANK-01 to REQ-BANK-05
**Effort:** 6
**Steps:**
1. `agent/api/sessions.py`: `TRANSITIONS`, `BANK_FOR`, `next_state`, `SessionStore` (design 3.1) with the `sessions` and `session_events` tables, expiry and the 500-session cap.
2. In `create_app`: `POST /sessions`, `GET /sessions/{id}/state`, `GET /bank/{id}/index.html` (marker replacement, CSP, `no-store`), and the debug route only when `HAUNTED_AUDIT_DEBUG=1`. Rate-limit `POST /sessions` with the existing limiter.
3. A helper `provenance_for(session, mode, origin)`.
4. Tests: `test_sessions.py` and `test_bank_route.py` (design section 6). Include "every route that changes a session's state is internal or debug-gated".
5. Update `.kiro/steering/data-contract.md` for the new routes and fields (REQ-PRV-04).
**Verified by:** all 12 (state, event) pairs give 4 allowed and 8 refused; versions rise by 1 per accepted event; refusals appear in the history; an expired session is 404; the 501st session is 429 with `Retry-After`; the debug route is 404 without the flag; the bank body switches haunted to fixed to haunted to fixed with the debug route; `?variant=fixed` does not change a haunted session; the iframe loads from an allowed origin and is refused from another.

### TASK-05 `POST /runs` takes a session; provenance is stored
**Satisfies:** REQ-HID-03 to REQ-HID-05, REQ-PRV-01, REQ-PRV-02, REQ-REG-02
**Effort:** 3
**Steps:**
1. Change `RunCreate` and the handler as in design 3.4. Resolve `variant` from the session's bank and `mode` from server settings.
2. Add the `runs.provenance` column (guarded `ALTER TABLE`), write it at run start, return it from `GET /runs/{id}`. Old rows return `null`.
3. Set `HAUNTED_AUDIT_DEBUG=1` in the existing API tests' fixtures so they still post `variant` and `mode`. List each changed existing test in the pull request.
4. `agent/tests/test_runs_session.py`: the table in design 3.4 with the flag off and on; the run's variant follows the session state; provenance keys and `null` handling.
5. Update `data-contract.md`.
**Verified by:** the whole existing suite passes with only the listed test edits; the 8 rows of the 3.4 table behave as written; a run on a haunted session is `BLOCKED` with `TARGET_NOT_FOCUSABLE` and on a fixed session is `PASSED` (scripted, measured by running them).

---

## Phase 4 - Frontend wiring

### TASK-06 Session provider and the real bank in the Possession screen
**Satisfies:** REQ-DIAG-02, REQ-FE-01 to REQ-FE-08
**Effort:** 6
**Depends on:** the Possession screen of the routing and v7 work (D7). If it is not merged, apply the same change to `PossessionMode.tsx` on `main` and note the difference.
**Steps:**
1. `SessionProvider` and `useSession` (design section 5). `sessionStorage` key `ha-session`. 404 handling with the "The demo was reset" announcement. Offline state with Retry.
2. `BankFrame`: iframe from the backend URL, scaled stage, reload on `version`, `postMessage` listener with the origin and source checks.
3. Delete the drawing (Send Payment control, bank sidebar, form fields) from `PossessionMode.tsx`; keep the v7 frame (breadcrumb, Live Test badge, checklist card, Journey Blocked card).
4. Fill the checklist from the frame's focus messages (pixel spec REQ-POS-05).
5. Unit tests (jest-axe) for `BankFrame` and the message filter (wrong origin and wrong source are ignored; no typed text is ever read).
**Verified by:** Playwright: the page creates a session, the iframe `src` matches the backend's `bank_url`, a debug transition changes `src` and content, deleting the session server-side shows the reset message and a new session, aborted requests show the offline state; a source scan finds no Send Payment control in `dashboard/src/components`; axe zero on the screen.

---

## Phase 5 - Hide the controls

### TASK-07 Remove the selectors, add the debug panel
**Satisfies:** REQ-HID-01, REQ-HID-02, REQ-HID-06, REQ-FE-05
**Effort:** 3
**Steps:**
1. `RunControls`: delete the variant and mode selects and their labels; one "Run the checker" button posting `{session_id}`.
2. `DebugPanel` (design section 5), shown only for `?debug=1`; not in the router, the navigation, or any link.
3. Update the README "Judge quick start" and any dashboard README line that mentions choosing a variant or a mode.
4. Search the repo for the words "variant" and "agent mode" in `dashboard/src` user text and remove them from visible strings and accessible names.
**Verified by:** Playwright scans every route without the flag (no select for variant or mode; no label matching /variant|agent mode/i in the accessible tree); with the flag the panel is present and its buttons call the debug route; navigating away from the flag hides it; with the server flag off the panel says "Debug is off on this server".

### TASK-08 Provenance block on the Reports page
**Satisfies:** REQ-PRV-03, REQ-PRV-01
**Effort:** 2
**Steps:** `ProvenanceBlock` as a closed `<details>` titled "How this run was produced" with the values in REQ-PRV-03. Unmeasured values show `--`. Keep `agent_mode` next to every metric tile (product rules).
**Verified by:** Playwright opens it by keyboard (Enter on the summary) and the values equal the run record from the API; closed by default; axe zero with it closed and open; a source scan confirms `agent_mode` is still in `JourneyResult`, the run record and the evidence seed.

---

## Phase 6 - Tests and close out

### TASK-09 Full Playwright suite and the state-machine round trip
**Satisfies:** REQ-TEST-01 to REQ-TEST-09
**Effort:** 3
**Steps:**
1. Add the round-trip test (REQ-TEST-04) that walks `haunted -> fixed -> regressed -> restored -> regressed` with the debug route and checks the state, bank, version, and the framed page after each step.
2. Add `dashboard/e2e/debug-panel.spec.ts` and the dashboard Playwright config (web servers: the API with `HAUNTED_AUDIT_DEBUG=1` and a temporary database, and the Vite preview).
3. Run everything in the bundled Chromium and in Google Chrome. Record the versions.
4. Add the CI job (Playwright install, API start, `pytest`, dashboard e2e). If CI cannot run Chrome, say "Chrome: local only".
**Verified by:** all tests pass; the report lists browsers run and not run; a deliberately broken assertion (tabindex added to the haunted control) makes REQ-TEST-01 fail (checked once, then reverted).

### TASK-10 Close out and pull request
**Satisfies:** REQ-REG-01, REQ-REG-02, REQ-PRV-04, REQ-TEST-09
**Effort:** 1.5
**Steps:**
1. Run the three gates and paste the real output: `.venv/bin/python -m pytest -q`; `cd dashboard && npm test`; `.venv/bin/python -m agent.eval.run_eval --modes scripted --runs 5`.
2. Add one line per task to `docs/devlog.md`; update `docs/plan-status.md` rows 0.6 and 1.6 only with evidence; add cases to `evals/cases.yaml` for anything that broke.
3. Open the pull request with `.github/pull_request_template.md` filled in: spec link (`.kiro/specs/payment-journey/requirements.md`), what changed, QA report (the three outputs, browsers run and not run, `agent_mode` of every number), reviewer notes, the Definition-of-done checklist. If the template on `main` is still empty, fill the same headings by hand and say so.
**Verified by:** the pull request body has every section; every number in it appears in a pasted output.

---

## Effort summary (estimates)

| Phase | Hours |
|---|---|
| Diagnose (done) | 0 left |
| Fix the payment | 4 |
| Barriers and PLANTED.md | 4 |
| Sessions, bank route, runs | 9 |
| Frontend wiring | 6 |
| Hide controls and provenance | 5 |
| Full suite, close out | 4.5 |
| **Total** | **32.5** |

If time is short, the smallest useful slice is TASK-02 and TASK-03 (a working payment and the six barriers). It fixes the bug you reported once the dashboard shows that page, which is TASK-06.

## Traceability

| Requirement group | Tasks |
|---|---|
| REQ-DIAG | 01, 06 |
| REQ-PAY | 02 |
| REQ-BAR | 03 |
| REQ-SES | 04 |
| REQ-BANK | 04 |
| REQ-HID | 05, 07 |
| REQ-PRV | 04, 05, 08, 10 |
| REQ-FE | 06, 07 |
| REQ-REG | 02, 03, 05, 10 |
| REQ-TEST | 02, 03, 04, 05, 06, 07, 08, 09 |
