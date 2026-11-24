# User-typed test details: design

## Data
- `agent/keyboard_agent/models.py`
  - `INTERNAL_DEFAULT_DETAILS`: the only place the internal default lives.
  - `JourneyConfig` gains `reference: str | None = None`. Its `recipient` and `amount` defaults read from the constant.
  - `clean_detail(value, required)`: trim, 1 to 40 characters, no Unicode category C, U+2028 or U+2029. The API validator and `build_journey_config` both use it.
- `agent/api/main.py`
  - `RunCreate` gains optional `recipient`, `amount`, `reference`, each checked with `clean_detail`. An unknown field is still a `422`.
  - The `runs` table gains `test_details TEXT` (JSON or NULL). On start-up it is added with `ALTER TABLE` if missing. The column can be null, so no data is lost.
  - `test_details` is written only when the request carried at least one detail, and `GET /runs/{id}` returns it.
  - The Verifier and the regression check read the original run's `test_details` and send them again.
  - The seed export carries `test_details`, and `load_seed` stores it.
- `log_event` is unchanged and never gets a body. A test reads the log lines to check this.

## Agents
- Scripted walker: types the recipient into the first editable field, the amount into the second, and the reference (if any) into the third. Then it goes on to Send Payment.
- LLM prompt: `Recipient to enter: "<json-quoted>"`, and the same for Amount and Reference. Control characters are already rejected, so a value cannot add a line to the prompt.
- Voice: unchanged on the server. The dashboard builds the commands from the form. A value with `"` is quoted with `'`.

## Bank
- `fixtures/haunted_bank/index.html`: a Reference field after Amount, labelled `<label for="reference">Reference</label>` on both variants, `maxlength="40"`. The confirmation adds "Reference: X." only when a reference was given. Cancel and success clear it too.

## Dashboard
- `components/TestDetailsForm.tsx` (new): a fieldset with the legend "Test details", the hint, three fields and inline errors. It exports `detailsProblem()`.
- `RunControls` renders it in place of the single Recipient name field and runs the check before `onRun`.
- `runs/runContext.ts`: `details` and `setDetails` replace `recipient`. The run's `test_details` comes from the record.
- `PossessionMode`: a Reference input in the bank drawing (empty). Checklist rows show "Typed: <value>" from the `type_text` steps, only when `testDetails` is set.
- `pages/app/Possession.tsx`: the voice commands come from the details until they are edited.

## Tests
- `dashboard/playwright.api.config.ts`: starts uvicorn on port 8099 with a temporary database, and vite on port 5198 with `VITE_API_URL` pointing at it. It runs `e2e/*.api-e2e.ts`. CI runs it in the pytest job, which has Python and Node.
- `dashboard/src/test/no-test-name.test.ts` scans `src` and `public`. `scripts/check_bundle_names.mjs` scans `dist` after `npm run build`, and CI runs it.

## Trade-offs
- Built-in internal default vs required fields in the API: required fields would break Night Watch and the old requests (NW-S1). A default that never reaches a screen keeps both.
- Redacting `docs/bug-payment/matrix-output.json` vs re-running it: the page has been fixed since that diagnostic, so a re-run would record different behaviour under the old story. A visible "[test name removed]" marker is honest.
