# Bug: a payment cannot be sent on the demo bank

Diagnosed 2026-11-20. No product code was changed. The two scripts that produced these results are in `docs/bug-payment/` (diagnostic only, not product code).

## Short answer

There are two things called "Haunted Bank", and only one of them is a bank.

1. **The test page** `fixtures/haunted_bank/index.html`. A payment **can** be sent on it by mouse in both variants. By keyboard it works only in the `fixed` variant. That is the planted barrier and it behaves as designed.
2. **The "Haunted Bank" panel in the dashboard** (`dashboard/src/components/PossessionMode.tsx`, the Possession Mode screen). It is a React drawing of a bank, not the test page. **No payment can be sent on it in any state, by mouse or by keyboard.** This is the bug you hit.

**Root cause:** the dashboard panel's Send Payment control has no code behind it. It has no click handler, it is not inside a form, and nothing in `dashboard/src` ever shows a payment confirmation. In the haunted state it is also marked `aria-disabled="true"` and its Enter and Space keys are cancelled on purpose. In the fixed state it is a real `<button type="button">` that does nothing when pressed.

## How it was reproduced

| | |
|---|---|
| Browsers | Playwright's bundled Chromium 156.0.8078.4 and the installed Google Chrome 157.0.8103.79 (driven through Playwright, headless). The test page was run in both and gave identical results. The dashboard was run in Google Chrome only |
| Not run | Safari, Firefox, WebKit, a real person's hands on a real keyboard |
| Test page | `fixtures/haunted_bank/index.html?variant=broken` and `?variant=fixed`, opened as a file |
| Dashboard | the live dev server at `http://127.0.0.1:5173/journeys/send-payment/possession` (current working tree) with the API on `:8000`, scripted mode |
| Repeat | `.venv/bin/python docs/bug-payment/matrix.py` (test page) and `.venv/bin/python docs/bug-payment/dashboard.py` (dashboard). Raw output: `docs/bug-payment/matrix-output.json` |

Mouse clicks on the dashboard were sent at the control's coordinates. Playwright's normal click refuses the haunted control with "element is not enabled", which is the `aria-disabled` setting.

## Result on every state

### A. The test page (`fixtures/haunted_bank/index.html`)

| State | Action | Result |
|---|---|---|
| broken | mouse click, both fields filled | **Works.** `Sent EUR 50.00 to [test name removed].` in `[data-testid="payment-confirmation"]` |
| broken | mouse click, fields empty | Error "Enter a recipient and an amount." |
| broken | Tab from the page start | Order: skip link, 4 nav links, `#recipient`, `#amount`, `#cancel`, `#offer-terms`, `#privacy`, then back to the start. **`#send-payment` is never focused** |
| broken | Enter after Tabbing as far as possible | Nothing happens |
| broken | Enter inside the Amount field | Nothing happens (the form has no submit button, so the browser does not submit it) |
| fixed | mouse click, both fields filled | **Works** (same confirmation) |
| fixed | mouse click, fields empty | Error "Enter a recipient and an amount." |
| fixed | Tab order | skip link, 4 nav links, `#recipient`, `#amount`, `#send-payment` |
| fixed | Enter on the button, Space on the button, Enter inside Amount | **All work** |

Element facts: broken is `<div class="pay-btn" id="send-payment" onclick="window.submitPayment()">`, 148 x 40 px, no `tabindex`, no `role`, nothing covering it at its centre, `pointer-events: auto`. Fixed is `<button type="submit" class="btn-primary" id="send-payment">`. No console errors or warnings in either.

### B. The dashboard panel (`PossessionMode.tsx`)

| State | What the control is | Mouse click | Keyboard |
|---|---|---|---|
| before any run | `<div role="button" tabindex="0" aria-disabled="true">`, cursor `not-allowed` | Nothing. No request, no confirmation | Tab from Amount **lands on it** (it has `tabindex="0"`). Enter and Space do nothing |
| after a `broken` run | same | Nothing | same |
| after a `fixed` run | `<button type="button" aria-label="Send Payment">` | **Nothing.** No request, no confirmation | not exercised past focus; the button has no handler, so Enter and Space cannot do anything either |

Facts that cause this (the dashboard at `7042eb1` on `main` has the same logic; lines in `PossessionMode.tsx`):
- the haunted control has `role="button"`, `tabIndex={0}`, `aria-disabled="true"` and an `onKeyDown` that calls `preventDefault()` for Enter and Space, and no `onClick`;
- the fixed control is `<button type="button">` with no `onClick` and no enclosing `<form>`;
- there is no `data-testid="payment-confirmation"` anywhere in `dashboard/src`;
- the dashboard never loads the test page (there is no iframe). The panel only draws a bank and switches its look from the result of the last run.

## Why it was built this way

The dashboard panel was written as a picture of the bank for the Possession Mode screen. It was meant to show the barrier, not to be a working bank. Two later changes made the gap visible: the fields became empty and editable (so they invite typing), and the title stayed "Haunted Bank / Test site", the same label as the real test page. Nobody had decided that the demo should let a person pay.

## Other findings

- **The haunted control is keyboard-focusable in the dashboard panel but not on the test page.** On the test page the keyboard cannot reach it (the planted barrier). On the dashboard panel Tab lands on it. The two disagree about what the haunted state is.
- **The page tells the visitor which state they are in.** The test page shows a badge "Variant: broken" or "Variant: fixed", and the dashboard shows variant and agent-mode selectors. For a demo where the ghost should be a surprise this gives it away.
- **The test page's error message is already announced to screen readers** (`role="alert"`). The plan wants that to be one of the planted barriers, so it will need to be removed from the haunted state.
- **The test page has no validation beyond "not empty."** Amount "abc" or "-5" is accepted and produces "Sent EUR abc to ...". There is no balance.
- **The agent journey is not affected.** The scripted walker gets `BLOCKED` / `TARGET_NOT_FOCUSABLE` on broken and `PASSED` on fixed (5 of 5 each, `docs/evidence.md`), which matches table A.
- **Not reproduced:** one 404 console message appeared once during a full dashboard run and did not recur (the likely cause, the favicon, is unconfirmed). A `429` from `POST /runs` appeared after several runs within a minute. That is the API's limit of 5 runs a minute per address, working as designed, and not the cause of this bug.

## What this means for the spec

- Make the **test page** the one bank, and show it in the dashboard instead of the drawing, so the thing a person clicks is the thing the checker tests.
- Keep barrier 1 on the test page exactly as is: mouse works, keyboard cannot reach it.
- Remove the badge and the two selectors from user screens; the state is chosen by the backend.
- The fix is specified in `.kiro/specs/payment-journey/`.

_Redaction, 24 Nov 2026 (user-typed-test-details REQ-TD-09): the test person's name in the quoted confirmation and in `bug-payment/matrix-output.json` was replaced with "[test name removed]". Nothing else in the recorded output was changed. The scripts now type "Test recipient"._
