"""The demo bank takes a (fake) payment. Real browser, real local server.

Haunted page (variant=broken): a mouse click pays; the keyboard cannot reach Send Payment.
Fixed page (variant=fixed): mouse and keyboard both pay.
"""

from __future__ import annotations

import re

import pytest
from playwright.sync_api import sync_playwright

from agent.keyboard_agent import tools
from agent.tests._bank import (
    BANK_DIR,
    BROWSERS,
    focus_by_keyboard,
    launch,
    money,
    open_bank,
    serve,
    tab_order,
)


@pytest.fixture(scope="module")
def base_url():
    with serve(BANK_DIR) as url:
        yield url


@pytest.fixture(scope="module", params=BROWSERS)
def browser(request):
    with sync_playwright() as playwright:
        instance = launch(playwright, request.param)
        yield instance
        instance.close()


def fill(page, recipient: str, amount: str) -> None:
    page.fill("#recipient", recipient)
    page.fill("#amount", amount)


def confirmation(page) -> str | None:
    box = page.locator("[data-testid='payment-confirmation']")
    return box.inner_text() if box.is_visible() else None


# ---- the haunted state ------------------------------------------------------------------


def test_haunted_mouse_click_completes_the_payment(browser, base_url) -> None:
    context, page, problems = open_bank(browser, base_url, "broken")
    fill(page, "Alex Carter", "50.00")
    page.click("#send-payment")
    box = page.locator("[data-testid='payment-confirmation']")
    assert box.is_visible()
    assert box.get_attribute("role") == "status"
    assert box.inner_text().startswith("Sent EUR 50.00 to Alex Carter.")
    assert problems == []
    context.close()


def test_haunted_keyboard_never_reaches_send_payment(browser, base_url) -> None:
    context, page, _ = open_bank(browser, base_url, "broken")
    forward = tab_order(page, 20)
    backward = tab_order(page, 20, reverse=True)
    assert "send-payment" not in forward + backward
    # The rest of the form is reachable, so the barrier is the control, not the page.
    assert {"recipient", "amount"} <= set(forward)
    context.close()


def test_haunted_send_control_is_the_planted_div(browser, base_url) -> None:
    context, page, _ = open_bank(browser, base_url, "broken")
    facts = page.evaluate(
        """() => { const e = document.getElementById('send-payment');
          return { tag: e.tagName, cls: e.className, tabindex: e.getAttribute('tabindex'),
                   role: e.getAttribute('role'), onclick: e.getAttribute('onclick') }; }"""
    )
    assert facts == {
        "tag": "DIV",
        "cls": "pay-btn",
        "tabindex": None,
        "role": None,
        "onclick": "window.submitPayment()",
    }
    context.close()


def test_haunted_enter_in_a_field_does_not_submit(browser, base_url) -> None:
    # The form has no submit button, so the browser does not submit it (part of the planted barrier).
    context, page, _ = open_bank(browser, base_url, "broken")
    fill(page, "Alex Carter", "50.00")
    page.focus("#amount")
    page.keyboard.press("Enter")
    assert confirmation(page) is None
    context.close()


# ---- the fixed state --------------------------------------------------------------------


@pytest.mark.parametrize("how", ["mouse", "enter_on_button", "space_on_button", "enter_in_field"])
def test_fixed_every_path_completes_the_payment(browser, base_url, how) -> None:
    context, page, problems = open_bank(browser, base_url, "fixed")
    fill(page, "Alex Carter", "50.00")
    if how == "mouse":
        page.click("#send-payment")
    elif how == "enter_on_button":
        page.focus("#send-payment")
        page.keyboard.press("Enter")
    elif how == "space_on_button":
        page.focus("#send-payment")
        page.keyboard.press("Space")
    else:
        page.focus("#amount")
        page.keyboard.press("Enter")
    assert (confirmation(page) or "").startswith("Sent EUR 50.00 to Alex Carter.")
    assert problems == []
    context.close()


def test_fixed_keyboard_reaches_send_payment_after_amount(browser, base_url) -> None:
    context, page, _ = open_bank(browser, base_url, "fixed")
    order = tab_order(page, 12)
    assert order.index("amount") < order.index("send-payment") < order.index("cancel")
    context.close()


def test_fixed_send_control_is_a_submit_button(browser, base_url) -> None:
    context, page, _ = open_bank(browser, base_url, "fixed")
    facts = page.evaluate(
        """() => { const e = document.getElementById('send-payment');
          return { tag: e.tagName, type: e.getAttribute('type'), cls: e.className,
                   inForm: !!e.closest('form') }; }"""
    )
    assert facts == {"tag": "BUTTON", "type": "submit", "cls": "btn-primary", "inForm": True}
    context.close()


# ---- both states ------------------------------------------------------------------------


@pytest.mark.parametrize("variant", ["broken", "fixed"])
def test_page_looks_normal_and_never_names_its_state(browser, base_url, variant) -> None:
    context, page, _ = open_bank(browser, base_url, variant)
    text = page.inner_text("body").lower().replace("haunted bank", "")
    for word in ("variant", "broken", "fixed", "haunted"):
        assert word not in text, f"visible text names the state: {word!r}"
    assert page.title() == "Haunted Bank - test site"
    context.close()


@pytest.mark.parametrize("variant", ["broken", "fixed"])
def test_checker_contract_is_kept(browser, base_url, variant) -> None:
    context, page, _ = open_bank(browser, base_url, variant)
    for element_id in ("recipient", "amount", "send-payment", "payment-confirmation"):
        assert page.locator(f"#{element_id}").count() == 1
    assert page.locator("[data-testid='payment-confirmation']").count() == 1
    expected_div, expected_button = (1, 0) if variant == "broken" else (0, 1)
    assert page.locator("div.pay-btn").count() == expected_div
    assert page.locator("button.btn-primary").count() == expected_button
    context.close()


VALIDATION = [
    # recipient, amount, expected recipient message, expected amount message
    ("", "", "Enter a recipient.", "Enter an amount."),
    ("   ", "50.00", "Enter a recipient.", None),
    ("A" * 61, "50.00", "Recipient must be 60 characters or fewer.", None),
    ("Alex Carter", "", None, "Enter an amount."),
    ("Alex Carter", "50", None, "Enter the amount as a positive number with two decimals, for example 50.00."),
    ("Alex Carter", "50.0", None, "Enter the amount as a positive number with two decimals, for example 50.00."),
    ("Alex Carter", "50.000", None, "Enter the amount as a positive number with two decimals, for example 50.00."),
    ("Alex Carter", "0.00", None, "Enter the amount as a positive number with two decimals, for example 50.00."),
    ("Alex Carter", "-5.00", None, "Enter the amount as a positive number with two decimals, for example 50.00."),
    ("Alex Carter", "5e1", None, "Enter the amount as a positive number with two decimals, for example 50.00."),
    ("Alex Carter", "abc", None, "Enter the amount as a positive number with two decimals, for example 50.00."),
    ("Alex Carter", "050.00", None, "Enter the amount as a positive number with two decimals, for example 50.00."),
    ("Alex Carter", "1000.01", None, "The amount is more than your balance (EUR 1000.00)."),
    ("", "abc", "Enter a recipient.", "Enter the amount as a positive number with two decimals, for example 50.00."),
]


@pytest.mark.parametrize("variant", ["broken", "fixed"])
@pytest.mark.parametrize("recipient,amount,want_recipient,want_amount", VALIDATION)
def test_validation_messages(browser, base_url, variant, recipient, amount, want_recipient, want_amount) -> None:
    context, page, _ = open_bank(browser, base_url, variant)
    fill(page, recipient, amount)
    page.evaluate("window.submitPayment()")  # the same function the click and the form call
    got_recipient = page.locator("#recipient-error").inner_text() if page.locator("#recipient-error").count() else None
    got_amount = page.locator("#amount-error").inner_text() if page.locator("#amount-error").count() else None
    assert (got_recipient, got_amount) == (want_recipient, want_amount)
    assert confirmation(page) is None
    assert money(page) == "Demo balance: EUR 1000.00 (not real money)"
    context.close()


@pytest.mark.parametrize("valid", [("Alex Carter", "50.00"), ("A" * 60, "0.01"), ("Alex", "1000.00")])
def test_valid_input_is_accepted(browser, base_url, valid) -> None:
    context, page, _ = open_bank(browser, base_url, "broken")
    fill(page, *valid)
    page.click("#send-payment")
    assert confirmation(page) is not None
    assert page.locator("#form-error .msg").count() == 0
    context.close()


@pytest.mark.parametrize("variant", ["broken", "fixed"])
def test_balance_uses_whole_cents(browser, base_url, variant) -> None:
    context, page, _ = open_bank(browser, base_url, variant)
    pay = "#send-payment"
    fill(page, "Alex Carter", "50.00")
    page.click(pay)
    fill(page, "Alex Carter", "50.00")
    page.click(pay)
    assert money(page) == "Demo balance: EUR 900.00 (not real money)"
    fill(page, "Alex Carter", "900.01")
    page.click(pay)
    assert page.locator("#amount-error").inner_text() == "The amount is more than your balance (EUR 900.00)."
    assert money(page) == "Demo balance: EUR 900.00 (not real money)"
    fill(page, "Alex Carter", "900.00")
    page.click(pay)
    assert money(page) == "Demo balance: EUR 0.00 (not real money)"
    fill(page, "Alex Carter", "0.01")
    page.click(pay)
    assert page.locator("#amount-error").inner_text() == "The amount is more than your balance (EUR 0.00)."
    # a float would show 0.1 + 0.2 style drift; whole cents do not
    context.close()


def test_balance_resets_on_reload(browser, base_url) -> None:
    context, page, _ = open_bank(browser, base_url, "broken")
    fill(page, "Alex Carter", "50.00")
    page.click("#send-payment")
    page.reload()
    assert money(page) == "Demo balance: EUR 1000.00 (not real money)"
    context.close()


@pytest.mark.parametrize("variant", ["broken", "fixed"])
def test_a_payment_stores_nothing_and_sends_nothing(browser, base_url, variant) -> None:
    context, page, _ = open_bank(browser, base_url, variant)
    sent: list[str] = []
    page.on("request", lambda r: sent.append(r.url))
    fill(page, "Alex Carter", "50.00")
    page.click("#send-payment")
    assert confirmation(page) is not None
    assert sent == [], f"the page made requests after load: {sent}"
    stored = page.evaluate(
        """async () => ({
          local: localStorage.length, session: sessionStorage.length, cookie: document.cookie,
          idb: (await indexedDB.databases()).length })"""
    )
    assert stored == {"local": 0, "session": 0, "cookie": "", "idb": 0}
    context.close()


def test_page_source_has_no_storage_or_network_calls() -> None:
    source = (BANK_DIR / "index.html").read_text()
    for needle in ("fetch(", "XMLHttpRequest", "sendBeacon", "localStorage", "sessionStorage", "document.cookie", "indexedDB", "WebSocket"):
        assert needle not in source, needle


@pytest.mark.parametrize("variant", ["broken", "fixed"])
def test_cancel_clears_the_form(browser, base_url, variant) -> None:
    context, page, _ = open_bank(browser, base_url, variant)
    fill(page, "", "abc")
    page.evaluate("window.submitPayment()")
    assert page.locator("#form-error .msg").count() == 2
    fill(page, "Alex", "10.00")
    page.click("#cancel")
    assert page.input_value("#recipient") == "" and page.input_value("#amount") == ""
    assert page.locator("#form-error .msg").count() == 0
    assert page.locator("#cancelled").inner_text() == "Payment cancelled. Nothing was sent."
    assert page.locator("#cancelled").is_visible()
    assert money(page) == "Demo balance: EUR 1000.00 (not real money)"
    context.close()


@pytest.mark.parametrize("variant", ["broken", "fixed"])
def test_read_page_does_not_leak_the_state(browser, base_url, variant) -> None:
    context, page, _ = open_bank(browser, base_url, variant)
    listing = page.evaluate(tools._JS_READ_PAGE)
    text = str(listing).lower()
    for word in ("variant", "broken", "fixed", "barrier", "planted", "haunted"):
        assert word not in text, word
    assert bool(re.search(r"send-payment", text)) == (variant == "fixed")  # only the fixed control is listed
    context.close()
# ---- the Reference field (spec reference-field, REQ-RF-01 to 03) --------------------------------
@pytest.mark.parametrize("variant", ["broken", "fixed"])
def test_reference_has_a_label_in_both_variants(browser, base_url, variant) -> None:
    context, page, _ = open_bank(browser, base_url, variant)
    assert page.get_by_label("Reference").count() == 1
    assert page.locator("label[for=reference]").inner_text() == "Reference"
    context.close()
@pytest.mark.parametrize("variant", ["broken", "fixed"])
def test_reference_sits_between_amount_and_the_send_control_in_tab_order(browser, base_url, variant) -> None:
    context, page, _ = open_bank(browser, base_url, variant)
    order = tab_order(page, 12)
    assert order.index("recipient") < order.index("amount") < order.index("reference")
    if variant == "fixed":
        assert order.index("reference") < order.index("send-payment")
    context.close()
@pytest.mark.parametrize("variant", ["broken", "fixed"])
def test_reference_is_shown_in_the_confirmation_and_cleared(browser, base_url, variant) -> None:
    context, page, problems = open_bank(browser, base_url, variant)
    fill(page, "Alex Carter", "50.00")
    page.fill("#reference", "Electricity bill")
    page.click("#send-payment")
    text = confirmation(page) or ""
    assert text.startswith("Sent EUR 50.00 to Alex Carter.")
    assert text.endswith("Reference: Electricity bill.")
    assert page.input_value("#reference") == ""
    assert problems == []
    context.close()
@pytest.mark.parametrize("variant", ["broken", "fixed"])
def test_an_empty_reference_never_blocks_the_payment(browser, base_url, variant) -> None:
    context, page, _ = open_bank(browser, base_url, variant)
    fill(page, "Alex Carter", "50.00")
    page.click("#send-payment")
    text = confirmation(page) or ""
    assert text.startswith("Sent EUR 50.00 to Alex Carter.")
    assert "Reference" not in text
    context.close()
@pytest.mark.parametrize("variant", ["broken", "fixed"])
def test_cancel_clears_the_reference(browser, base_url, variant) -> None:
    context, page, _ = open_bank(browser, base_url, variant)
    page.fill("#reference", "Electricity bill")
    page.click("#cancel")
    assert page.input_value("#reference") == ""
    context.close()
def test_reference_is_limited_to_sixty_characters(browser, base_url) -> None:
    context, page, _ = open_bank(browser, base_url, "fixed")
    page.focus("#reference")
    page.keyboard.type("x" * 80)
    assert len(page.input_value("#reference")) == 60
    context.close()
