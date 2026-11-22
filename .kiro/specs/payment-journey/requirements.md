# Working payment journey and hidden test controls - Requirements

**Goal:** a visitor can send a (fake) payment on the demo bank, the planted barriers are real and testable, and the visitor never sees or chooses the bank state or the agent mode.
**Diagnosis:** `docs/bug-payment.md` (done, no code changed). Root cause: the dashboard's "Haunted Bank" panel is a drawing with no code behind its Send Payment control, so no payment can be sent in any state. The test page itself works by mouse in both variants.
**Steering followed:** `product-rules.md`, `product-ux.md`, `ui-fidelity.md` (UI changes keep the v7 look), `data-contract.md`, `accessibility.md`, `tech.md`, `structure.md`, `product.md`. Where they conflict, the stricter one wins and the conflict is listed in "Decisions needed".
**Touches:** `fixtures/haunted_bank/index.html`, `bank/PLANTED.md`, `agent/api/` (sessions, bank route), `dashboard/` (Possession and Reports screens, run controls), `.kiro/steering/data-contract.md`, `README.md` (judge steps), tests.
**Does not touch:** the checker's verdict logic, the keyboard tools, the scripted walker's rules.
**Status (scope reduced 2026-11-20):** the diagnosis is done, and the working payment and the six barriers are built on branch `feature/bank-payment-barriers` (not merged). Everything else is **deferred until the Fix, Verify, Prevent spec lands**, and the session state machine is cut to its four transitions. See "Scope" below.

## Scope (reduced 2026-11-20)

| Group | Status |
|---|---|
| REQ-DIAG | DONE (`docs/bug-payment.md`, PR #1) |
| REQ-PAY, REQ-BAR | BUILT on `feature/bank-payment-barriers` (7 commits, tests pass in Chromium 156 and Chrome 157; not merged) |
| REQ-REG-01 to 03, REQ-TEST-01 to 03, 06, 08, 09 | BUILT for the bank page (same branch). The pieces about sessions, the dashboard and the debug panel are deferred |
| REQ-SES | DEFERRED, and **cut**: only SES-01 to SES-05 remain (the four transitions). SES-06 to SES-09 are cut (see "Cut from the machine") |
| REQ-BANK, REQ-HID, REQ-FE, REQ-PRV (the new `provenance` object and the Reports block), REQ-TEST-04, 05, 07 | DEFERRED until the Fix, Verify, Prevent spec lands |
| `agent_mode` stays | applies now: nothing that exists today is removed (REQ-PRV-01, first sentence) |

"Deferred until the Fix, Verify, Prevent spec lands" is because the Approve decision, the Verifier's patched copy and the regression demo are what move a session from one state to the next. Without them the machine has nothing to listen to.

## Conventions

EARS: WHEN trigger THE SYSTEM SHALL response. IF condition THEN ...
Every requirement has a **Check** (a test or a measurement that gives yes or no).
Terms:
- **Haunted state**: the bank page with the planted barriers. Inside the code its variant name stays `broken` (the API, the checker and `docs/evidence.md` use it). Screens say "haunted" or nothing.
- **Fixed state**: the bank page after the keyboard barrier is repaired.
- **Session**: one visitor's run through the demo, with one state machine.
- **Barrier 1**: the Send Payment control the keyboard cannot reach. **Barriers 2 to 6**: the five that do not stop a payment.
- **Reference fixed page**: the committed page for `variant=fixed` in which all six barriers are repaired.

---

## REQ-DIAG - The bug is recorded `[DONE]`

### REQ-DIAG-01 Diagnosis exists
`docs/bug-payment.md` SHALL record the reproduction (browsers, states, mouse and keyboard), the root cause, and what was not tested.
**Check:** the file exists and names the browsers and versions; the repeat scripts in `docs/bug-payment/` run and reproduce `matrix-output.json`.

### REQ-DIAG-02 One bank
THE SYSTEM SHALL show, in the dashboard, the same bank page the checker tests, not a separate drawing of it.
**Check:** the Possession screen contains an `<iframe>` whose address comes from the backend (REQ-FE-02), and no React component renders its own Send Payment control.

---

## REQ-PAY - A working fake payment `[BUILT]`

### REQ-PAY-01 Haunted: the mouse completes
WHILE the bank is in the haunted state and the form is valid THE SYSTEM SHALL complete the payment when a mouse click lands on Send Payment, and SHALL show a confirmation element with `data-testid="payment-confirmation"` and `role="status"`, containing the text `Sent EUR <amount> to <recipient>.`.
**Check:** Playwright, bundled Chromium and Google Chrome: click completes; the confirmation is visible.

### REQ-PAY-02 Haunted: the keyboard cannot reach it (planted, keep)
WHILE the bank is in the haunted state THE SYSTEM SHALL keep Send Payment as `<div class="pay-btn" id="send-payment">` with no `tabindex`, no `role`, and an `onclick` handler.
**Check:** Tab through the whole page 20 times, in order and in reverse: `#send-payment` is never `document.activeElement`.

### REQ-PAY-03 Fixed: mouse and keyboard complete
WHILE the bank is in the fixed state THE SYSTEM SHALL render Send Payment as `<button type="submit" class="btn-primary" id="send-payment">` inside the form, and a payment SHALL complete by mouse click, by Enter on the button, by Space on the button, and by Enter inside a field.
**Check:** Playwright, four paths, each shows the confirmation.

### REQ-PAY-04 Looks normal
THE SYSTEM SHALL NOT show the variant, the state or the words "broken", "fixed" or "haunted" anywhere on the bank page (the "Variant: ..." badge is removed). The page title and header keep the label "Haunted Bank - test site".
**Check:** the visible text of both states contains none of those three words, except inside the label "Haunted Bank".

### REQ-PAY-05 Validation
WHEN the form is submitted THE SYSTEM SHALL check:
- Recipient is required (blank or spaces only is an error), at most 60 characters.
- Amount is required, is a positive number with exactly two decimal places (for example `50.00`, not `50`, `50.0`, `0.00`, `-5.00`, `5e1`, `abc`), and is not larger than the fake balance.
Each failing field SHALL get its own message that names the field and says how to fix it. Both fields are checked and all messages shown.
**Check:** table-driven test over at least 12 inputs, with the exact message for each.

### REQ-PAY-06 Fake balance
THE SYSTEM SHALL start every page load with a fake balance of EUR 1000.00 shown as "Demo balance: EUR 1000.00 (not real money)" and SHALL reduce it by the amount after each completed payment, using whole cents (no floating point rounding). The balance lives only in the page's memory and is reset on reload.
**Check:** pay 50.00 twice: balance reads 900.00; pay 900.01: error; pay 900.00: balance 0.00.

### REQ-PAY-07 Nothing real is stored
THE SYSTEM SHALL NOT send the recipient or the amount anywhere, write them to storage (cookie, `localStorage`, `sessionStorage`, IndexedDB), log them, or return them from the API.
**Check:** a test captures network requests during a payment (none leave the page after load) and lists the storage areas (all empty).

### REQ-PAY-08 Cancel
WHEN Cancel is activated THE SYSTEM SHALL clear both fields and the messages, and show "Payment cancelled. Nothing was sent.".
**Check:** Playwright.

### REQ-PAY-09 Checker contract unchanged
THE SYSTEM SHALL keep `#recipient`, `#amount`, `#send-payment`, the confirmation test id, the target `div.pay-btn` (haunted) and `button.btn-primary` (fixed). No other element on the page SHALL match `div.pay-btn` or `button.btn-primary`.
**Check:** a test counts matches of both selectors in both states (exactly one each in its own state, none in the other).

---

## REQ-BAR - Six planted barriers and the answer key `[BUILT]`

### REQ-BAR-01 The six
WHILE the bank is in the haunted state THE SYSTEM SHALL contain exactly these six barriers and no other deliberate one:

| # | Barrier | WCAG | Blocks the payment? |
|---|---|---|---|
| 1 | Send Payment is a `div` the keyboard cannot reach | 2.1.1 Keyboard, 4.1.2 Name, Role, Value | Keyboard only. Mouse completes |
| 2 | Amount has no accessible label | 1.3.1, 3.3.2, 4.1.2 | No |
| 3 | Helper text under Recipient has low contrast | 1.4.3 Contrast (Minimum) | No |
| 4 | Recipient has its focus outline removed | 2.4.7 Focus Visible | No |
| 5 | Cancel is an icon-only button with no accessible name | 4.1.2 Name, Role, Value | No |
| 6 | Validation messages are not announced to screen readers | 4.1.3 Status Messages | No |

**Check:** REQ-BAR-04.

### REQ-BAR-02 Only barrier 1 may block
THE SYSTEM SHALL let a payment complete in the haunted state with barriers 2 to 6 present. THE SYSTEM SHALL let a keyboard-only payment complete on a copy of the haunted page in which only barrier 1 is repaired.
**Check:** Playwright on both.

### REQ-BAR-03 PLANTED.md
`bank/PLANTED.md` SHALL list each barrier with: number, what is wrong, where (a selector), the WCAG success criterion, how it is found (an axe rule id, or "keyboard" or "manual"), a **testable criterion** (a check that gives yes or no, with the measured value filled in after the build), and what the repaired form looks like.
**Check:** six rows, none empty; each criterion is also an assertion in a test (REQ-TEST-03).

### REQ-BAR-04 Each barrier is present and each is repairable
For every barrier THE SYSTEM SHALL have a test that passes on the haunted page (barrier present) and a test that passes on the reference fixed page (barrier repaired).
**Check:** 12 assertions.

### REQ-BAR-05 Barrier 2 criterion
In the haunted state `#amount` SHALL have an empty accessible name (no `<label>` pointing at it, no `aria-label`, no `aria-labelledby`, no `title`, no `placeholder`), while the text "Amount (EUR)" is visible next to it.
**Check:** axe rule `label` reports `#amount`; `getByLabel("Amount")` finds nothing.

### REQ-BAR-06 Barrier 3 criterion
In the haunted state the helper text SHALL have a measured contrast ratio below 4.5:1 and at least 2.5:1 against its background (visible but weak). In the fixed state it SHALL be 4.5:1 or better.
**Check:** computed from the page's real colours in the test; axe rule `color-contrast` reports it in haunted and not in fixed. The measured numbers are written into PLANTED.md.

### REQ-BAR-07 Barrier 4 criterion
In the haunted state, with `#recipient` focused by keyboard, its computed `outline-style` SHALL be `none` and its `box-shadow` `none`, and its border colour SHALL equal the unfocused border colour. In the fixed state it SHALL show a 3px outline.
**Check:** computed-style assertions.

### REQ-BAR-08 Barrier 5 criterion
In the haunted state the Cancel control SHALL be a `<button type="button" id="cancel">` containing only an `aria-hidden` icon, with an empty accessible name. In the fixed state it SHALL have the accessible name "Cancel". Its class SHALL NOT be `btn-primary`.
**Check:** axe rule `button-name` reports `#cancel` in haunted and not in fixed.

### REQ-BAR-09 Barrier 6 criterion
In the haunted state, after a failed submit, the message text SHALL be visible and `#form-error` SHALL have no `role`, no `aria-live`, and the failing field SHALL have no `aria-invalid` and no `aria-describedby`. In the fixed state the messages SHALL be in a `role="alert"` region, the failing field SHALL have `aria-invalid="true"` and `aria-describedby` pointing at its message, and focus SHALL move to the first failing field.
**Check:** DOM assertions; and a live-region probe: a `MutationObserver` registered on `[role=alert]` sees the text in fixed and there is no live region in haunted.

### REQ-BAR-10 No hint on the page
THE SYSTEM SHALL NOT mark the barriers on the page (no comments, class names or text such as "barrier", "planted", "ghost" in the bank's markup).
**Check:** a source scan of the served page. (The class `pay-btn` is the checker's target and stays.)

---

## REQ-SES - Session state machine owned by the backend `[DEFERRED, CUT TO FOUR TRANSITIONS]`

### REQ-SES-01 Start a session
THE SYSTEM SHALL provide `POST /sessions` (no body) returning `201` with `{"session_id": str, "state": "haunted"}` and the first state record (REQ-SES-03).
**Check:** API test.

### REQ-SES-02 States and transitions
THE SYSTEM SHALL implement this machine and no other transition:

| From | Event | To | Bank shown |
|---|---|---|---|
| (new) | session created | `haunted` | haunted |
| `haunted` | `approve_fix` | `fixed` | fixed |
| `fixed` | `start_regression` | `regressed` | haunted |
| `regressed` | `restore_fix` | `restored` | fixed |
| `restored` | `start_regression` | `regressed` | haunted |

Any other event in any state SHALL be refused with `409 {"detail": ...}` and the state SHALL NOT change.
**Check:** a test over every (state, event) pair (4 states x 3 events = 12 pairs): 4 allowed, 8 refused.

### REQ-SES-03 Read the state
THE SYSTEM SHALL provide `GET /sessions/{id}/state` returning `{"session_id", "state", "bank": "haunted"|"fixed", "bank_url": str, "version": int}`. `bank_url` SHALL be a path (starting with `/`) that includes `?v=<version>`, and `version` SHALL increase by 1 on every accepted transition. An unknown session SHALL return `404`.
**Check:** API tests including version increments and 404.

### REQ-SES-04 Approve is the only way to FIXED
THE SYSTEM SHALL move a session to `fixed` only as the effect of a recorded human Approve decision on a fix for that session's run (the Approve endpoint defined in `.kiro/specs/exorcist/`). No endpoint, header or query string alone SHALL cause that transition on a normal server.
**Check:** a test that no route changes a session's state except the internal function that the approve and regression handlers call. There is no public or debug route that moves a state.

### REQ-SES-05 Regression demo
WHEN the regression demo starts THE SYSTEM SHALL apply `start_regression`, and WHEN it ends with the fix restored SHALL apply `restore_fix`. Both are called by the regression handler (`.kiro/specs/fix-verify-prevent/`), not by the browser.
**Check:** a test with a stub handler that calls both and reads the states.

### Cut from the machine (not required, deferred with the rest)

The machine is the four transitions above, held in memory, and nothing else. These were in the first draft and are cut:

| Was | Cut because | What remains true without it |
|---|---|---|
| REQ-SES-06 append-only history of accepted and refused events | The loop needs only the current state and its version | A refused event still returns `409` and leaves the state alone |
| REQ-SES-07 24-hour expiry, 500-session cap, per-address limiter on `POST /sessions` | Not needed to make the loop work | **Open risk:** until a bound exists, a public `POST /sessions` can grow memory without limit. Add a cap before the demo is public |
| REQ-SES-08 `POST /sessions/{id}/debug/event` and its flag | The tests can call the store's function directly, in the same process as the server | No route can move a session's state (REQ-SES-04) |
| REQ-SES-09 SQLite persistence | In-memory sessions are enough for a demo on an ephemeral container | A server restart loses sessions. The browser gets `404` and starts a new one (REQ-FE-03, deferred) |
| `updated_at` and `provenance` in the state record | Only used by expiry and the Reports block | The state record is `session_id`, `state`, `bank`, `bank_url`, `version` |

---

## REQ-BANK - Serving the bank for a session `[DEFERRED]`

### REQ-BANK-01 One URL per session
THE SYSTEM SHALL serve the bank page for a session at `GET /bank/{session_id}/index.html`, returning the haunted page or the fixed page according to the session's bank, with `Cache-Control: no-store`. An unknown session SHALL return `404`.
**Check:** API test: the body changes after a transition; `ETag` or `v` makes the browser reload.

### REQ-BANK-02 The page learns its variant from the server
THE SYSTEM SHALL inject the variant into the served page (not read it from the address), so a visitor cannot change it by editing the address. The file-based address `?variant=` used by agent runs and tests SHALL keep working.
**Check:** open `/bank/{id}/index.html?variant=fixed` on a haunted session: still haunted.

### REQ-BANK-03 Safe to frame
THE SYSTEM SHALL send `Content-Security-Policy` with `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; frame-ancestors` followed by the allowed dashboard origins (from `CORS_ALLOWED_ORIGINS`, plus the local dev origins when it is unset), `X-Content-Type-Options: nosniff`, and `Referrer-Policy: no-referrer`.
**Check:** header test; the page loads inside an iframe from an allowed origin and is refused from another.

### REQ-BANK-04 Focus events for the dashboard
THE SYSTEM SHALL have the bank page send `window.parent.postMessage({source: "haunted-bank", type: "focus", id: <element id or null>}, "*")` when focus moves, so a dashboard on another address can fill the live checklist. The dashboard SHALL accept a message only if `event.origin` equals the bank's origin and `event.source` is its own iframe. The message carries no recipient, amount or other typed value.
**Check:** a test types into the form and asserts no message contains the typed text.

### REQ-BANK-05 Agents unchanged
THE SYSTEM SHALL keep agent runs on the bundled file (`fixtures/haunted_bank/index.html`) and SHALL keep the rule that the agent's browser may open only that folder.
**Check:** existing tests pass; a run started with a `session_id` still opens the bundled file with the variant of the session's bank (REQ-HID-05).

---

## REQ-HID - Hidden controls `[DEFERRED]`

### REQ-HID-01 No selectors on user screens
THE SYSTEM SHALL NOT render a variant selector or an agent-mode selector, or any text naming them, on any screen reachable without `?debug=1`.
**Check:** a Playwright scan of every route: no `select` for variant or mode, and no label matching /variant|agent mode/i, in the accessible tree.

### REQ-HID-02 Debug panel only with the flag
THE SYSTEM SHALL render a developer panel only when the address has `?debug=1` exactly. The panel is not linked from anywhere, not in the navigation, not in the sitemap, and not mentioned on user screens. It offers: variant and agent mode (no transition buttons: the state is not changed from the browser).
**Check:** without the flag the panel and its controls are absent from the DOM; with the flag they are present; the flag is not saved anywhere (a reload without it hides the panel).

### REQ-HID-03 Debug is also gated on the server
WHERE `HAUNTED_AUDIT_DEBUG` is not `1`, THE SYSTEM SHALL ignore `variant` and `mode` in `POST /runs` for a request that has a `session_id`, and SHALL refuse a request that has no `session_id` and sets either (`422 {"detail": "variant and mode are chosen by the server"}`).
**Check:** API tests with the flag on and off. (The current tests post `variant` and `mode` directly; they run with the flag on.)

### REQ-HID-04 Agent mode is chosen by the server
THE SYSTEM SHALL use `scripted` unless the server has `LLM_ENABLED=true` and a configured default mode of `llm`. The chosen mode SHALL be recorded in the run and shown only in the provenance block (REQ-PRV-03).
**Check:** API tests.

### REQ-HID-05 Run uses the session's bank
WHEN a run is created with a `session_id` THE SYSTEM SHALL run the journey on the session's current bank (`broken` for haunted, `fixed` for fixed).
**Check:** a test per state; the stored run's variant matches.

### REQ-HID-06 Docs match
THE SYSTEM SHALL update the README "Judge quick start" so it no longer tells the visitor to choose a variant or mode.
**Check:** the steps mention neither word.

---

## REQ-PRV - Provenance stays `[PARTLY APPLIES NOW, REST DEFERRED]`

### REQ-PRV-01 Kept everywhere
**Applies now:** THE SYSTEM SHALL keep `agent_mode` in every JourneyResult, the run record, the evidence log and `docs/eval.md` (when it exists). Nothing that exists today is removed.

**Deferred:** THE SYSTEM SHALL add `provenance` to the run record: `{"agent_mode", "model_id" (null unless llm), "bank_state" ("haunted"|"fixed"), "bank_source" ("committed_variant" | "reference_fixed" | "verifier_patched_copy"), "session_id" (null for runs without one), "origin" ("session" | "debug" | "eval")}`.
**Check:** API tests; the old fields are all still present.

### REQ-PRV-02 No fake provenance
WHERE a value is unknown THE SYSTEM SHALL store `null`, not a guess. `bank_source` is `reference_fixed` until the Verifier (`.kiro/specs/fix-verify-prevent/`) produces a patched copy, then `verifier_patched_copy`.
**Check:** tests.

### REQ-PRV-03 Reports page block
THE SYSTEM SHALL show, on the Reports page, a collapsed block titled "How this run was produced" (`<details>`, closed by default, reachable by keyboard) listing for the latest run: agent mode, model (or "none"), bank state, bank source, tokens and cost (`0` for scripted, `--` where not measured), latency, run id, and verdict and reason code as the checker returned them. A visitor can open it without any flag.
**Check:** Playwright opens it with Enter and reads the values; they equal the run record.

### REQ-PRV-04 Contract
THE SYSTEM SHALL update `.kiro/steering/data-contract.md` in the same pull request for every field added (sessions, state, provenance, the new `POST /runs` rules).
**Check:** review checklist item; a test lists the documented fields.

---

## REQ-FE - Dashboard wiring `[DEFERRED]`

### REQ-FE-01 Session on first visit
WHEN the dashboard needs a bank THE SYSTEM SHALL create a session with `POST /sessions` and keep its id in `sessionStorage` for the tab. The id is not shown.
**Check:** Playwright.

### REQ-FE-02 Preview from the backend's URL
THE SYSTEM SHALL render the bank preview as an iframe titled "Haunted Bank - Test site" whose `src` is the API base plus the `bank_url` from `GET /sessions/{id}/state`, and SHALL reload it when `version` changes.
**Check:** after a debug transition the iframe `src` changes and the new content loads.

### REQ-FE-03 Lost session
IF `GET /sessions/{id}/state` returns `404` THEN THE SYSTEM SHALL create a new session and tell the visitor in plain words ("The demo was reset") in a polite live region.
**Check:** Playwright with the session deleted.

### REQ-FE-04 Offline
IF the API does not answer THEN THE SYSTEM SHALL show the existing offline state with Retry, not an empty frame.
**Check:** Playwright with aborted requests.

### REQ-FE-05 Run without choosing
THE SYSTEM SHALL start a run with `POST /runs {"session_id": ...}` and no variant or mode.
**Check:** the request body in Playwright.

### REQ-FE-06 The drawing is removed
THE SYSTEM SHALL remove the React drawing of the bank (Send Payment control, bank sidebar, form fields) from the Possession screen. The v7 frame around it (breadcrumb, Live Test badge, the checklist card, the "Journey Blocked" card) stays and follows `ui-fidelity.md`.
**Check:** a source scan finds no `Send Payment` control in `dashboard/src/components`.

### REQ-FE-07 Live checklist from the frame
THE SYSTEM SHALL fill the "Tab to Recipient / Tab to Amount / Tab to Send Payment (stuck)" list from `postMessage` focus events of the framed bank (REQ-BANK-04), under the rules of `.kiro/specs/pixel-faithful-ui-v7/` REQ-POS-05.
**Check:** Playwright presses Tab in the frame and the list changes.

### REQ-FE-08 Keyboard and accessibility
Every control added SHALL be a real element, keyboard operable, with a visible focus ring, text at 16px or more, and no axe violations on the dashboard pages.
**Check:** jest-axe and Playwright axe.

---

## REQ-REG - Nothing else regresses `[BUILT FOR THE BANK PAGE]`

### REQ-REG-01 Agent results
THE SYSTEM SHALL keep the scripted walker correct on the new pages: `broken` gives `BLOCKED` / `TARGET_NOT_FOCUSABLE` with a measured box on `div.pay-btn`, and `fixed` gives `PASSED`, 5 of 5 each, measured by `python -m agent.eval.run_eval --modes scripted --runs 5`.
**Check:** the eval output is pasted into the pull request; it replaces the numbers in `docs/evidence.md` only if they were re-measured.

### REQ-REG-02 Existing tests
`.venv/bin/python -m pytest -q` and `cd dashboard && npm test` SHALL pass, with edits limited to tests that name the removed badge or the old error text.
**Check:** both commands pass; the diff of existing tests is listed in the pull request.

### REQ-REG-03 Checker untouched
THE SYSTEM SHALL NOT change `agent/keyboard_agent/checker.py` or the keyboard tools.
**Check:** `git diff` shows no change in those files.

### REQ-REG-04 Info barrier
THE SYSTEM SHALL NOT expose the variant or any barrier note to the agent through `read_page`, the prompt, or the page. Variant information on the page SHALL be limited to a server-injected value read only by the page's own script.
**Check:** a test captures what `read_page` returns on both pages and asserts it contains no variant or barrier text.

---

## REQ-TEST - Playwright and other tests `[01 to 03, 06, 08, 09 BUILT; 04, 05, 07 DEFERRED]`

### REQ-TEST-01 Haunted
Playwright SHALL check on the haunted page: a mouse click with valid input completes the payment and shows the confirmation; the keyboard Tab order, forward and back, never focuses `#send-payment`.

### REQ-TEST-02 Fixed
Playwright SHALL check on the fixed page: mouse, Enter on the button, Space on the button and Enter in a field each complete the payment.

### REQ-TEST-03 Barriers
Playwright SHALL assert every criterion in REQ-BAR-05 to REQ-BAR-09 on the haunted page and its repaired form on the fixed page, and REQ-BAR-02 on a page with only barrier 1 repaired.

### REQ-TEST-04 State machine round trip
Tests SHALL walk `haunted -> fixed -> regressed -> restored -> regressed` by calling the store's transition function in the same process as the server, and assert after each step the state, bank and version read from `GET /sessions/{id}/state`, and that `GET /bank/{id}/index.html` returns the haunted page, then the fixed page, then the haunted page, then the fixed page. There is no debug route.

### REQ-TEST-05 Debug panel
Playwright SHALL check that the debug panel is absent without `?debug=1`, present with it, and absent again after navigating away from the flag.

### REQ-TEST-06 Axe on the bank pages
Playwright with axe-core (tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) SHALL scan both bank pages:
- fixed (reference): zero violations;
- haunted: the set of violated rules SHALL equal exactly the axe-detectable planted rules `{label, color-contrast, button-name}` and nothing else. Barriers 1, 4 and 6 are not detectable by axe and are covered by REQ-TEST-01 and REQ-TEST-03.
The test SHALL state in a comment which rules are expected and why.

### REQ-TEST-07 Dashboard
Playwright SHALL scan the Possession and Reports routes with axe in normal mode: zero violations, with the provenance block closed and open.

### REQ-TEST-08 Browsers
The bank tests SHALL run in the bundled Chromium and, where installed, Google Chrome. Browsers not run SHALL be listed in the pull request.

### REQ-TEST-09 Honest reporting
THE SYSTEM SHALL report every test result as measured. A browser or a path that was not run is reported as "not run".

---

## Decisions (owner)

| # | Question | Answer |
|---|---|---|
| D1 | "Fixed" is meant to be the Verifier's patched copy, which does not exist yet. | **Accepted 2026-11-20.** The committed reference page is an **interim stand-in** and is labelled so in `bank/PLANTED.md` (done), in a comment in the page's source and in the README (step 4) |
| D2 | A Verifier copy repairs only barrier 1; the reference fixed page repairs all six. | **Accepted.** After a real Approve the fixed bank will still show barriers 2 to 6 until the page is changed. PLANTED.md says so |
| D3 | The haunted page fails three axe rules, not one. | **Accepted as written (2026-11-20):** the tests assert the exact set `label`, `color-contrast`, `button-name` (BUILT) |
| D4 | The dashboard is on another origin from the API, so it cannot read the bank iframe's focus. | Deferred. The bank would post focus ids with `postMessage` (REQ-BANK-04) |
| D5 | The machine needs four states (`haunted`, `fixed`, `regressed`, `restored`). | Kept: four states, four transitions |
| D6 | The fake balance resets on reload. | Yes (BUILT) |
| D7 | The dashboard routing and v7 Possession work is uncommitted on another branch. | Open. Step 5 lists exactly which uncommitted changes the frontend tasks depend on |
| D8 | `variant` and `mode` stay in the API for tests and evals but are refused without `HAUNTED_AUDIT_DEBUG=1`. | Deferred with the hidden controls |
| D9 | Cut the session machine to the four transitions the loop needs. | **Done in this revision** (see "Cut from the machine"). Open risk: no session bound until a cap is added |
