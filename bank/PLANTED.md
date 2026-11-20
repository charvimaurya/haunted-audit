# Planted barriers (answer key)

The demo bank (`fixtures/haunted_bank/index.html`) carries six deliberate accessibility barriers in its **haunted** state (`?variant=broken`). The **reference fixed page** (`?variant=fixed`) repairs all six.

> **The reference fixed page is an interim stand-in.** The real "fixed" state is the patched copy the Verifier produces after a person approves a fix. That copy will repair only the finding the Exorcist was asked about (barrier 1), so barriers 2 to 6 would stay open in it. Until the Verifier exists, `variant=fixed` is what the agents and the tests use as "fixed".

Only barrier 1 can stop the journey, and only for the keyboard. A mouse click always completes the payment. Barriers 2 to 6 never stop a payment from completing by any route.

Every row below is checked by a test in `agent/tests/test_bank_barriers.py` (a "present in haunted" test and a "repaired in fixed" test for each barrier). The numbers in the criteria were measured by those tests in the bundled Chromium 156.0.8078.4 and Google Chrome 157.0.8103.79 on 2026-11-20.

| # | What is wrong (haunted) | Where | WCAG success criteria | Found by | Testable criterion (measured) | Repaired form (fixed) |
|---|---|---|---|---|---|---|
| 1 | Send Payment is a `div` with an `onclick`. It has no `tabindex` and no `role`, so the keyboard cannot reach it and a screen reader sees plain text | `div.pay-btn#send-payment` | 2.1.1 Keyboard, 4.1.2 Name, Role, Value | keyboard agent. Not axe | Tab forward 20 times and Shift+Tab 20 times: `#send-payment` is never the focused element. Its accessibility snapshot is `text: Send Payment`, not a button. A mouse click with valid input shows `[data-testid="payment-confirmation"]` | `<button type="submit" class="btn-primary" id="send-payment">`: reached by Tab after Amount; Enter, Space, a click and Enter inside a field all pay |
| 2 | The Amount field has no accessible name. The words "Amount (EUR)" are on screen in a `span` that is not tied to the input | `#amount` | 1.3.1 Info and Relationships, 3.3.2 Labels or Instructions, 4.1.2 | axe rule `label` | `#amount` has 0 labels, no `aria-label`, no `aria-labelledby`, no `title`, no `placeholder`. Its accessibility snapshot is `textbox` with no name. `getByLabel("Amount")` finds 0 elements | `<label for="amount">Amount (EUR)</label>`: snapshot `textbox "Amount (EUR)"` |
| 3 | The helper text under Recipient is too faint | `#recipient-hint` | 1.4.3 Contrast (Minimum) | axe rule `color-contrast` | Text `rgb(122, 106, 148)` on the panel `rgb(36, 19, 56)` measures **3.52:1** (below 4.5:1, above 2.5:1) | Text `rgb(203, 187, 224)`: **9.57:1** |
| 4 | The Recipient field loses its focus outline | `#recipient` (focus styles) | 2.4.7 Focus Visible | keyboard (manual). Not axe | With `#recipient` focused by Tab: computed `outline-style` is `none` and `box-shadow` is `none`, and the border colour (`rgb(74, 50, 112)`) is the same as before focus | The page-wide gold focus ring: `outline-style` solid, 3px |
| 5 | Cancel is an icon-only button with no accessible name | `button#cancel.icon-btn` | 4.1.2 Name, Role, Value | axe rule `button-name` | The button holds only an `aria-hidden` icon: no text, no `aria-label`, no `aria-labelledby`, no `title`. Its accessibility snapshot is `button` with no name | `aria-label="Cancel"`: snapshot `button "Cancel"`. The class stays `icon-btn`, so it never matches `button.btn-primary` |
| 6 | Validation messages are shown but not announced, and are not tied to their field | `#form-error`, `#recipient`, `#amount` | 4.1.3 Status Messages | manual / DOM check. Not axe | After a failed submit the two messages are visible, `#form-error` has no `role` and no `aria-live`, there are 0 elements matching `[role=alert], [aria-live]`, and neither field has `aria-invalid` or `aria-describedby` | `#form-error` has `role="alert"`; each failing field has `aria-invalid="true"` and `aria-describedby` pointing at its message; focus moves to the first failing field |

## What axe sees and what it cannot

On the haunted page axe-core (rules tagged `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) reports exactly three rules, on exactly these elements:

| Rule | Element | Barrier |
|---|---|---|
| `label` | `#amount` | 2 |
| `color-contrast` | `#recipient-hint` | 3 |
| `button-name` | `#cancel` | 5 |

Barriers 1, 4 and 6 cannot be found by axe. They are found by the keyboard agent (1), a computed-style check (4) and a DOM check (6). The same three axe rules appear on a copy of the haunted page in which only barrier 1 is repaired. The reference fixed page has no axe violations.

## Rules for changing this file or the page

- Never change a measured number here without re-running the tests that produce it.
- A new barrier needs a row here, a test pair, and a place in the axe list if axe can see it.
- Nothing in the page's visible text or source names a barrier (no words "barrier", "planted" or "ghost" in `index.html`; a test checks `read_page` and the visible text for the state words).
