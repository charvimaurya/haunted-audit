---
name: journey-test-writer
description: "UNVERIFIED: needs the Exorcist and journey-test writer to be verified. Write a keyboard-only Playwright regression test for one user journey on the Haunted Bank so a fixed barrier cannot come back. Use only when asked to write a journey or regression test for a fixed finding."
metadata:
  project: haunted-audit
  status: unverified
  needs: journey-test writer agent, Exorcist agent
---

# Journey test writer (unverified draft)

**Status: needs the Exorcist and journey-test writer to be verified.** Neither exists yet. Do not claim this skill has written a working regression test, and do not count it as used in any report.

## Rules

1. Keyboard only: `Tab`, `Shift+Tab`, `Enter`, `Space`, typing. Never `click()`.
2. Find controls by role and name (`get_by_role`, `get_by_label`), never by CSS class. That is what makes the test fail when the name or role is lost.
3. Run on the bundled bank only (`fixtures/haunted_bank/index.html`), never an outside site.
4. The test must pass on the fixed page and fail on the haunted page. Show both results. A test that has not been run both ways is not done.
5. Put it in `tests/journeys/`.

## Example from this repo (bank barrier 1, Send Payment)

```python
# tests/journeys/test_send_payment_keyboard.py (draft; not yet run both ways)
def test_send_payment_by_keyboard(page, bank_url):
    page.goto(bank_url + "?variant=fixed")
    page.get_by_label("Recipient").focus()
    page.keyboard.type("Alex Carter")
    page.keyboard.press("Tab")
    page.keyboard.type("50")
    for _ in range(10):
        if page.evaluate("document.activeElement.id") == "send-payment":
            break
        page.keyboard.press("Tab")
    assert page.get_by_role("button", name="Send Payment").evaluate("e => e === document.activeElement")
    page.keyboard.press("Enter")
```

On `?variant=broken` the role lookup fails, because Send Payment is a `div` with no button role.
