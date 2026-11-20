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


# ---- barrier 3: helper text under Recipient has low contrast (WCAG 1.4.3; axe rule: color-contrast) ----


def hint_ratio(page) -> float:
    colours = page.evaluate(
        """() => [getComputedStyle(document.getElementById('recipient-hint')).color,
                  getComputedStyle(document.getElementById('dashboard')).backgroundColor]"""
    )
    return contrast_ratio(colours[0], colours[1])


def test_barrier_3_present_in_haunted(browser, base_url) -> None:
    context, page, _ = open_bank(browser, base_url, "broken")
    ratio = hint_ratio(page)
    print(f"\nbarrier 3 haunted contrast: {ratio:.2f}:1")
    assert 2.5 <= ratio < 4.5, ratio   # visible but weak
    context.close()


def test_barrier_3_repaired_in_fixed(browser, base_url) -> None:
    context, page, _ = open_bank(browser, base_url, "fixed")
    ratio = hint_ratio(page)
    print(f"\nbarrier 3 fixed contrast: {ratio:.2f}:1")
    assert ratio >= 4.5, ratio
    context.close()


# ---- barrier 4: Recipient has its focus outline removed (WCAG 2.4.7; axe cannot see this) ----


def focus_style(page) -> dict:
    return page.evaluate(
        """() => { const c = getComputedStyle(document.getElementById('recipient'));
          return { outlineStyle: c.outlineStyle, outlineWidth: c.outlineWidth,
                   boxShadow: c.boxShadow, borderColor: c.borderColor }; }"""
    )


def test_barrier_4_present_in_haunted(browser, base_url) -> None:
    context, page, _ = open_bank(browser, base_url, "broken")
    before = focus_style(page)
    focus_by_keyboard(page, "recipient")
    after = focus_style(page)
    assert after["outlineStyle"] == "none" and after["boxShadow"] == "none"
    assert after["borderColor"] == before["borderColor"]    # nothing changes when focus arrives
    context.close()


def test_barrier_4_repaired_in_fixed(browser, base_url) -> None:
    context, page, _ = open_bank(browser, base_url, "fixed")
    focus_by_keyboard(page, "recipient")
    after = focus_style(page)
    assert after["outlineStyle"] == "solid" and after["outlineWidth"] == "3px"
    context.close()


# ---- barrier 5: Cancel is an icon-only button with no accessible name (WCAG 4.1.2; axe rule: button-name) ----


def test_barrier_5_present_in_haunted(browser, base_url) -> None:
    context, page, _ = open_bank(browser, base_url, "broken")
    facts = page.evaluate(
        """() => { const e = document.getElementById('cancel');
          return { tag: e.tagName, type: e.getAttribute('type'), text: e.textContent.trim(),
                   ariaLabel: e.getAttribute('aria-label'), labelledby: e.getAttribute('aria-labelledby'),
                   title: e.getAttribute('title'), cls: e.className,
                   iconHidden: e.querySelector('svg').getAttribute('aria-hidden') }; }"""
    )
    assert facts == {
        "tag": "BUTTON", "type": "button", "text": "", "ariaLabel": None, "labelledby": None,
        "title": None, "cls": "icon-btn", "iconHidden": "true",
    }
    assert snapshot(page, "#cancel") == "- button"            # no accessible name
    context.close()


def test_barrier_5_repaired_in_fixed(browser, base_url) -> None:
    context, page, _ = open_bank(browser, base_url, "fixed")
    assert snapshot(page, "#cancel") == '- button "Cancel"'
    assert page.locator("#cancel").get_attribute("class") == "icon-btn"   # never matches button.btn-primary
    context.close()


