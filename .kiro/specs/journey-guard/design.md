# Design: journey test and regression guard

## Parts

| Part | File | Notes |
|---|---|---|
| Journey test | `tests/journeys/send-payment.spec.ts` | Playwright Test, Chromium, headless. URL from `JOURNEY_URL` |
| Node setup | `tests/journeys/package.json`, `playwright.config.ts` | `@playwright/test` pinned `1.64.1` (same as `dashboard/` and `requirements.txt`, so the cached Chromium build is reused) |
| Guard | `agent/fixes/regression_guard.py` | CLI `python -m agent.fixes.regression_guard [--runs N]` |
| Tests | `agent/tests/test_regression_guard.py` | pure logic tests always; the real Playwright run is skipped only when `tests/journeys/node_modules` is missing, with that reason |

## Journey test
1. `page.goto(JOURNEY_URL)`.
2. Fill `#recipient` with "Test Recipient" and `#amount` with "10.00". The test is a developer's test, not an agent,
   so ids are allowed. Amount has no label on the broken page (barrier 2), so a name lookup would hide barrier 1.
3. Focus starts on the body. Press Tab up to 30 times. After each press read the focused element's accessible
   name through `page.evaluate` (text content, `aria-label`, or label) and stop when it is "Send Payment" and the
   element is a control the keyboard can reach. This reads only the page, never checker config.
4. If it was never reached: `expect(reached, "Send Payment is not keyboard focusable: 30 presses of Tab never reached it").toBe(true)`.
5. Press Enter. Expect the element with `role="status"` to be visible within 5 s with the message
   `Send Payment has keyboard focus but Enter did not confirm the payment`.

## Guard
```
proposal = exorcist.propose({"reason_code": "TARGET_NOT_FOCUSABLE", "blocked_element": {"tag": "div"}}, "scripted")
applied   = check(diff, source).patched          -> 1-applied.html
removed   = apply_reverse(diff, applied)         -> 2-removed.html   (equals today's source)
restored  = check(diff, removed).patched         -> 3-restored.html
```
Each copy is opened with `?variant=broken`, so the only difference between the copies is the patch.
For each copy: `npx playwright test` in `tests/journeys/` with `JOURNEY_URL=<file uri>`, reporter `line`.
Result is PASS when the exit code is 0, FAIL otherwise; the first line containing "Send Payment" in the
output is kept as the message.

`judge(results)` is a pure function: `GUARD_WORKS` when the list is `[PASS, FAIL, PASS]` and the FAIL message
contains `Send Payment is not keyboard focusable`; else `GUARD_BROKEN`. A `--test` option points at another spec
file so the always-pass case can be tested.

Folder: `artifacts/regression/<utc stamp>-<n>/`. Nothing else is written.

## Reuse
- `agent.fixes.exorcist.propose` and `agent.fixes.diffcheck.check / apply_reverse`, unchanged.
- No API change.

## Risks
- Node or Chromium missing: the guard prints how to install and exits 2. It does not report a result it did not measure.
