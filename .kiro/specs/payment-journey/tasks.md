# Working payment journey and hidden test controls - Tasks

Scope reduced 2026-11-20. Built: TASK-01 (diagnosis), TASK-02 and TASK-03 (the working payment and the six barriers). Every other task is **deferred until the Fix, Verify, Prevent spec lands**, and the session machine in TASK-04 is cut to its four transitions.

Effort figures are my estimates in hours (not measured, not from your plan). "Actual" hours were not tracked.

## Status and effort

| Task | What | Status | Branch | Estimate before | Estimate now |
|---|---|---|---|---|---|
| TASK-01 | Diagnosis | **Done** (PR #1) | `feature/payment-journey` | 0 left | 0 |
| TASK-02 | Working fake payment on the real bank page | **Built**, not merged | `feature/bank-payment-barriers` | 4 | 0 left |
| TASK-03 | Six planted barriers and `bank/PLANTED.md` | **Built**, not merged | `feature/bank-payment-barriers` | 4 | 0 left |
| (PR) | Open the pull request for TASK-02 and TASK-03 | Not started | `feature/bank-payment-barriers` | n/a | 1 |
| TASK-04 | Session state machine, four transitions, and the bank route | Deferred until the Fix, Verify, Prevent spec lands | | 6 | 3.5 |
| TASK-05 | `POST /runs` takes a session | Deferred until the Fix, Verify, Prevent spec lands | | 3 | 2 |
| TASK-06 | Session provider and the real bank in the Possession screen | Deferred until the Fix, Verify, Prevent spec lands | | 6 | 6 |
| TASK-07 | Hide the selectors, add the debug panel | Deferred until the Fix, Verify, Prevent spec lands | | 3 | 2.5 |
| TASK-08 | "How this run was produced" block on Reports | Deferred until the Fix, Verify, Prevent spec lands | | 2 | 1.5 |
| TASK-09 | Full browser suite and the state-machine round trip | Deferred until the Fix, Verify, Prevent spec lands | | 3 | 2 |
| TASK-10 | Close out the deferred work and open its pull request | Deferred until the Fix, Verify, Prevent spec lands | | 1.5 | 1.5 |
| | **Total** | | | **32.5** | **8 built + 1 PR + 19 deferred = 28** |

Why the numbers moved (deferred tasks only):
- TASK-04: 6 to 3.5. Cut: SQLite tables and the history (about 1), expiry, cap and limiter (about 1.5), the debug route (0.5). Added: the variant injection and the bank route's headers that were first listed under TASK-02.
- TASK-05: 3 to 2. Cut: the `provenance` column and its tests and contract text.
- TASK-07: 3 to 2.5. Cut: the transition buttons in the debug panel.
- TASK-08: 2 to 1.5. Reads existing run fields only; no `provenance` object.
- TASK-09: 3 to 2. Cut: debug-route tests; the round trip calls the store directly.
- TASK-06 and TASK-10: unchanged.

Left to do now: the PR for the built work (1 h). Left deferred: 19 h. Original total 32.5 h; reduced scope total 28 h of which 8 are built.

## Rules for every task

- One branch per task; one small pull request each, or one for the spec if you prefer. Read every diff.
- The agent keeps working after every task. After each: `.venv/bin/python -m pytest -q`, and for dashboard tasks `cd dashboard && npm test`.
- Regression gate after any change to the bank page: `.venv/bin/python -m agent.eval.run_eval --modes scripted --runs 5` must give 5 of 5 on `broken` and 5 of 5 on `fixed`. Paste the output into the pull request.
- Do not edit `agent/keyboard_agent/checker.py` or the keyboard tools.
- No keys, no real data. The payment is fake; nothing typed in the bank page is stored or sent.
- Every failure goes into `evals/cases.yaml`; one line in `docs/devlog.md` per task (both files are seeded by the unmerged `chore/unblock` branch, so add lines after it merges).
- Tests are reported as measured. A browser or path that was not run is reported as "not run".

---

## TASK-01 Diagnosis `[DONE]`
**Satisfies:** REQ-DIAG-01
**Done:** `docs/bug-payment.md`, `docs/bug-payment/` (PR #1).
**Result:** the test page pays by mouse in both variants (Chromium 156, Chrome 157); the keyboard works only in fixed. The dashboard panel pays in no state, because it is a drawing with no handler.
**Not covered:** Safari, Firefox, WebKit, and a person's hands.

---

## TASK-02 Working fake payment on the bank page `[BUILT, not merged]`
**Satisfies:** REQ-PAY-01 to REQ-PAY-09, REQ-REG-01, REQ-REG-04 (bank page part)
**Where:** branch `feature/bank-payment-barriers`, commit `24cfd75` (and the commits after it).
**Done:** `fixtures/haunted_bank/index.html` (validation, whole-cent demo balance in memory, Cancel, no variant badge, the haunted keyboard barrier kept); `agent/tests/_bank.py`; `agent/tests/test_bank_page.py`.
**Measured:** 109 test cases in `test_bank_page.py` (run in both the bundled Chromium 156.0.8078.4 and Google Chrome 157.0.8103.79); the full Python suite passes (247 tests); scripted eval 5 of 5 on `broken` and 5 of 5 on `fixed` (18.0 and 14.0 average steps, unchanged).
**Not built here (belongs to the deferred session work):** the injected variant (`window.__BANK__`) and the focus `postMessage`.

## TASK-03 Six planted barriers and PLANTED.md `[BUILT, not merged]`
**Satisfies:** REQ-BAR-01 to REQ-BAR-10, D3 (accepted)
**Where:** same branch, commits `a24cb12` (barrier 2), `66e6982` (3), `0f5ae5e` (4), `526edb7` (5), `7fc8bbe` (6), `fe32f17` (answer key and axe).
**Done:** barriers 2 to 6 in the haunted state (each repaired in the reference fixed page); `bank/PLANTED.md`; `agent/tests/test_bank_barriers.py` (35 test cases across both browsers): one present and one repaired test for each barrier, the copy with only barrier 1 repaired completes by keyboard, axe finds exactly `label`, `color-contrast`, `button-name` on the haunted page and nothing on the fixed page, the source names no barrier.
**Measured:** barrier 3 contrast 3.52:1 haunted, 9.57:1 fixed; axe targets `#amount`, `#recipient-hint`, `#cancel`.
**Known gap:** the axe tests skip ("not run") where `dashboard/node_modules` is absent, as in the current CI pytest job.

## (PR) Open the pull request for TASK-02 and TASK-03 `[NOT STARTED]`
**Estimate:** 1
Push `feature/bank-payment-barriers`, open a PR with the template headings filled in (spec link, what changed, QA report with the three outputs and browsers run and not run, reviewer notes, Definition of done). Wait for your OK before doing it.

---

## Deferred until the Fix, Verify, Prevent spec lands

Everything below waits for the Approve decision, the Verifier's patched copy and the regression demo, because those are what move a session from one state to the next. The text is kept so the work can resume. Do not start any of it now.

### TASK-04 Session state machine (four transitions) and the bank route `[DEFERRED]`
**Satisfies:** REQ-SES-01 to REQ-SES-05, REQ-BANK-01 to REQ-BANK-05
**Estimate:** 3.5 (was 6)
**Steps:**
1. `agent/api/sessions.py`: `TRANSITIONS` (the four), `BANK_FOR`, `next_state`, and an in-memory `SessionStore` with `create`, `get`, `apply` (design 3.1).
2. In `create_app`: `POST /sessions`, `GET /sessions/{id}/state`, `GET /bank/{id}/index.html` (inject the variant, CSP, `no-store`). No route changes a state. No debug route. No limiter, no expiry, no cap.
3. Add the `<!--BANK_CONFIG-->` marker and the injected variant to the bank page.
4. `agent/tests/test_sessions.py` and `test_bank_route.py` (design section 6). The round trip calls `apply` directly.
5. Update `.kiro/steering/data-contract.md`.
**Verified by:** 12 (state, event) pairs give 4 allowed and 8 refused with the state unchanged; version rises by 1 per accepted event; `404` for an unknown session; the bank body is haunted, fixed, haunted, fixed through the round trip; `?variant=fixed` does not change a haunted session; headers present.
**Open risk to close before the demo is public:** a cap on sessions.

### TASK-05 `POST /runs` takes a session `[DEFERRED]`
**Satisfies:** REQ-HID-03 to REQ-HID-05, REQ-REG-02
**Estimate:** 2 (was 3)
**Steps:** `RunCreate` gains `session_id`; variant comes from the session's bank, mode from server settings; `variant` and `mode` are refused without `HAUNTED_AUDIT_DEBUG=1`; set that flag in the existing API tests' fixtures; test the table in design 3.4. No `provenance` column.
**Verified by:** existing suite passes with only the listed edits; a run on a haunted session is `BLOCKED`, on a fixed session `PASSED` (scripted, measured).

### TASK-06 Session provider and the real bank in the Possession screen `[DEFERRED]`
**Satisfies:** REQ-DIAG-02, REQ-FE-01 to REQ-FE-08
**Estimate:** 6 (unchanged)
**Depends on the unmerged dashboard routing and v7 work (step 5 lists exactly which files).** If it is still unmerged, apply the same change to `PossessionMode.tsx` on `main` and note the difference.
**Steps:** `SessionProvider`; `BankFrame` (iframe from the backend URL, scaled stage, reload on `version`, origin-checked `postMessage`); delete the React drawing; fill the checklist from the frame's focus messages; handle `404` by starting a new session; offline state.
**Verified by:** Playwright: the iframe `src` matches the backend's `bank_url`; a state change in the store changes `src` and content; a deleted session shows the reset message and a new session; aborted requests show the offline state; no Send Payment control in `dashboard/src/components`; axe zero.

### TASK-07 Hide the selectors, add the debug panel `[DEFERRED]`
**Satisfies:** REQ-HID-01, REQ-HID-02, REQ-HID-06, REQ-FE-05
**Estimate:** 2.5 (was 3)
**Steps:** delete the variant and mode selects; one "Run the checker" button posting `{session_id}`; `DebugPanel` for `?debug=1` only, with variant and mode and **no transition buttons**; update the README judge steps.
**Verified by:** Playwright scans every route without the flag (no variant or mode control or label); with the flag the panel appears; it disappears after navigating away from the flag.

### TASK-08 "How this run was produced" on Reports `[DEFERRED]`
**Satisfies:** REQ-PRV-03 (existing fields only)
**Estimate:** 1.5 (was 2)
**Steps:** a closed `<details>` block listing agent mode, tokens, cost, latency, run id, verdict and reason code from the run record (`--` where not measured). `agent_mode` stays next to every metric tile.
**Verified by:** Playwright opens it with Enter; the values equal the run record; axe zero closed and open; a scan confirms `agent_mode` is still in `JourneyResult`, the run record and the evidence seed.

### TASK-09 Full browser suite and the round trip `[DEFERRED]`
**Satisfies:** REQ-TEST-04, 05, 07
**Estimate:** 2 (was 3)
**Steps:** the round trip through the store and the bank route; `dashboard/e2e/debug-panel.spec.ts`; run in Chromium and Chrome; CI job (Playwright, `npm ci` so the axe tests run).
**Verified by:** all pass; browsers run and not run listed.

### TASK-10 Close out the deferred work `[DEFERRED]`
**Satisfies:** REQ-REG-01, REQ-REG-02, REQ-PRV-04, REQ-TEST-09
**Estimate:** 1.5 (unchanged)
**Steps:** run the three gates and paste the real output; update `data-contract.md`; one line per task in `docs/devlog.md`; cases in `evals/cases.yaml`; open the pull request with the template filled in.

---

## Traceability

| Requirement group | Tasks | State |
|---|---|---|
| REQ-DIAG | 01 (and 06 for DIAG-02) | 01 done; DIAG-02 deferred |
| REQ-PAY | 02 | built |
| REQ-BAR | 03 | built |
| REQ-SES | 04 | deferred, cut |
| REQ-BANK | 04 | deferred |
| REQ-HID | 05, 07 | deferred |
| REQ-PRV | 08 (and `agent_mode` kept now) | partly applies now, rest deferred |
| REQ-FE | 06, 07 | deferred |
| REQ-REG | 02, 03, 05, 10 | built for the bank page |
| REQ-TEST | 02, 03 built; 04, 05, 07 via 09 | partly built |
