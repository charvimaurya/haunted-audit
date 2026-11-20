"""The six planted barriers on the demo bank, one test pair for each (present, repaired).

Barrier 1 is the only one that can block the payment, and only for the keyboard.
Barriers 2 to 6 never stop a payment from completing. Answer key: bank/PLANTED.md.

Haunted page = ?variant=broken. Reference fixed page = ?variant=fixed (all six repaired).
"""

from __future__ import annotations

import pytest
from playwright.sync_api import sync_playwright

from agent.tests._bank import (
    BANK_DIR,
    BROWSERS,
    HAUNTED_SEND,
    REPAIRED_SEND,
    contrast_ratio,
    focus_by_keyboard,
    launch,
    open_bank,
    run_axe,
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


def snapshot(page, selector: str) -> str:
    """Accessibility-tree line for one element, for example '- textbox "Amount (EUR)"'."""
    return page.locator(selector).aria_snapshot().strip()


# ---- barrier 1: Send Payment is a div the keyboard cannot reach (WCAG 2.1.1, 4.1.2) ----------


def test_barrier_1_present_in_haunted(browser, base_url) -> None:
    context, page, _ = open_bank(browser, base_url, "broken")
    assert snapshot(page, "div.pay-btn") == "- text: Send Payment"   # plain text: it has no button role
    assert page.get_attribute("#send-payment", "tabindex") is None
    assert page.get_attribute("#send-payment", "role") is None
    assert "send-payment" not in tab_order(page, 20) + tab_order(page, 20, reverse=True)
    context.close()


def test_barrier_1_repaired_in_fixed(browser, base_url) -> None:
    context, page, _ = open_bank(browser, base_url, "fixed")
    assert snapshot(page, "#send-payment") == '- button "Send Payment"'
    focus_by_keyboard(page, "send-payment")
    context.close()


# ---- barrier 2: Amount has no accessible label (WCAG 1.3.1, 3.3.2, 4.1.2; axe rule: label) ----


def test_barrier_2_present_in_haunted(browser, base_url) -> None:
    context, page, _ = open_bank(browser, base_url, "broken")
    facts = page.evaluate(
        """() => { const e = document.getElementById('amount');
          return { labels: e.labels.length, ariaLabel: e.getAttribute('aria-label'),
                   labelledby: e.getAttribute('aria-labelledby'), title: e.getAttribute('title'),
                   placeholder: e.getAttribute('placeholder') }; }"""
    )
    assert facts == {"labels": 0, "ariaLabel": None, "labelledby": None, "title": None, "placeholder": None}
    assert snapshot(page, "#amount") == "- textbox"           # no accessible name
    assert page.get_by_label("Amount").count() == 0
    assert "Amount (EUR)" in page.inner_text("#amount-slot")  # the words are on screen, just not tied to the input
    context.close()


def test_barrier_2_repaired_in_fixed(browser, base_url) -> None:
    context, page, _ = open_bank(browser, base_url, "fixed")
    assert snapshot(page, "#amount") == '- textbox "Amount (EUR)"'
    assert page.get_by_label("Amount (EUR)").count() == 1
    context.close()


