# User-typed test details: requirements
Asked for by the owner on 24 Nov 2026. It replaces `.kiro/specs/recipient-input/` (one name field, 60 characters).

## Goal
No test person's name appears anywhere on a screen until the tester types it. The tester types made-up details, the agents type exactly those, and every screen shows only what the real run used.

## Terms
- **Test details**: Recipient, Amount and Reference, typed by the tester before a run.
- **Internal default**: the details the API uses when a direct caller (tests, eval scripts, the CLI, Night Watch) sends none. It is one constant in code and never reaches a screen.

## Requirements
**REQ-TD-01: Run setup form.**
- Before a run, Possession Mode and the Try page show a "Test details" group with three labelled, empty fields: Recipient, Amount, Reference. The hint "Use made-up details. This is a test bank." is under the group heading.
- Labels are always visible. A placeholder is a hint, never the label. Placeholders are generic: "Test recipient name", "e.g. 10.00", "Optional, e.g. Test payment". No placeholder looks like a real person.
- No field is ever filled in by the app.
- Reference is optional. Recipient and Amount are required.
- Amount follows the bank's own rule: two decimals, more than 0.00, at most 1000.00 (the test balance). Its hint says "Use two decimals, like 10.00, up to 1000.00." (added 24 Nov after fail-007: an amount like "100" reached the bank and the fixed page ended BLOCKED / NO_ACTIVATION).

**REQ-TD-02: Missing details stop the run.**
- Run Journey (keyboard) and Run voice journey (voice, when its commands come from the form) check Recipient, then Amount.
- If Recipient is empty, the run does not start. Under the field: a cross icon and "Type a made-up name to continue". For Amount: "Type a made-up amount to continue", and for an amount the bank would refuse: "Use two decimals, like 10.00". The message is tied to the field (`aria-describedby`, `aria-invalid`) and announced (`role="alert"`). Focus moves to the first field with a problem.
- Possess This App opens the setup form (it is a link to Try). It never starts a run, so it can never start one without the details.

**REQ-TD-03: The typed values are what the agents type.**
- The dashboard sends `recipient`, `amount` and `reference` in `POST /runs`.
- The scripted walker types them into the first, second and third editable fields in tab order. It skips Reference when no reference was given. The LLM agent is given them as quoted values.
- The voice agent's commands are built from the same values (`type "<Recipient>" in Recipient`, and so on) until the tester edits the commands. Edited commands are sent as typed.
- The Verifier and the regression check use the details of the run the fix came from.
- Nothing else is typed.

**REQ-TD-04: The bank page.**
- The bank (`fixtures/haunted_bank/`) has a labelled Reference field after Amount on both variants (merged with spec `reference-field`: label "Reference", `maxlength` 60; the API still caps typed values at 40). It is optional. It is not a planted barrier, and the planted barriers do not change.
- Every field on the bank, and on the bank drawing in Possession Mode, loads empty. A judge who tabs through it types their own details.

**REQ-TD-05: Replay from the run record.**
- The run record has `test_details` (`{recipient, amount, reference}`) when the tester typed them, and `null` otherwise.
- After a run, each Possession checklist row for a field says what the agent typed there, read from the run's `type_text` steps. The value is shown only when `test_details` is not `null`, so an internal default never shows.
- The checklist always has a "Tab to Reference" row (spec `reference-field` REQ-RF-06); its typed value shows only for a run whose details the tester typed.
- Every other screen shows only values from the real run.

**REQ-TD-06: API compatibility (plan item 20, NW-S1).**
- `POST /runs` without the new fields works as before and uses the internal default. `GET /runs/{id}` keeps every existing field; `test_details` is added.
- The internal default lives in one constant, `INTERNAL_DEFAULT_DETAILS` in `agent/keyboard_agent/models.py`. Its reference is "Electricity bill" (spec `reference-field` REQ-RF-04); a tester's run with an empty Reference types no reference. It is never put in `test_details`, never sent to the dashboard as a value, and never used to fill in a field.

**REQ-TD-07: Safety.**
- Each value is trimmed and must be 1 to 40 characters (Reference may be left out or empty). A value with a control or format character (Unicode category C, or a line or paragraph separator) is a `422`.
- Typed values are stored only in the run record (the `runs` row and its step events). They are never written to the log. They are shown only to the session that started the run: the dashboard keeps the run id in memory, and a run id is a random UUID. There is no run list.
- Unseeded runs are deleted after 7 days, and screenshots after 24 hours (existing pruning).

**REQ-TD-08: Recorded fallback.**
- `scripts/record_seed.py` checks Amount with the bank's rule before any run, and writes the seed only when broken is BLOCKED / TARGET_NOT_FOCUSABLE and fixed is PASSED. Otherwise the existing file is left unchanged.
- `docs/evidence-seed.json` is re-exported from runs made with values the owner typed. `test_details` is in the export.
- A note says that recorded replays show the values typed when they were recorded.

**REQ-TD-09: Remove visible "Alex Carter".**
- `docs/user-typed-test-details-audit.md` lists every hit as visible or internal.
- Every visible hit is removed: the unused drawing, the design pages, the README, docs and seed data. Recorded output that cannot be re-run honestly is redacted with a visible marker, not rewritten.
- Internal hits (tests, eval scripts, the constant) stay. The README "Known issues" says so.

**REQ-TD-10: Tests.**
- Browser test with the real API: on first load no field holds a value; Run Journey with Recipient empty shows the error and moves focus to the field; a typed name is what the agent typed and what the checklist shows; the flow works by keyboard only.
- A test fails if "Alex Carter" appears in `dashboard/src`, `dashboard/public` or the built bundle.
- API tests: an old request without the fields still works; a value over 40 characters is rejected; a control character is rejected; typed values never appear in the log, in the fix view or in any list.
- The 5-run scripted check: broken BLOCKED / TARGET_NOT_FOCUSABLE 5 of 5, fixed PASSED 5 of 5.
- axe: zero violations on the setup form, empty and with errors.
