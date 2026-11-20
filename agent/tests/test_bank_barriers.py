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


# ---- barrier 6: validation messages are not announced (WCAG 4.1.3; axe cannot see this) ----


def submit_empty(page) -> None:
    page.evaluate("window.submitPayment()")        # empty form: both messages appear


def live_regions(page) -> int:
    return page.locator("[role=alert], [aria-live]").count()


def test_barrier_6_present_in_haunted(browser, base_url) -> None:
    context, page, _ = open_bank(browser, base_url, "broken")
    submit_empty(page)
    assert page.locator("#recipient-error").is_visible() and page.locator("#amount-error").is_visible()
    assert page.get_attribute("#form-error", "role") is None
    assert page.get_attribute("#form-error", "aria-live") is None
    assert live_regions(page) == 0
    for field in ("recipient", "amount"):
        assert page.get_attribute(f"#{field}", "aria-invalid") is None
        assert page.get_attribute(f"#{field}", "aria-describedby") is None
    context.close()


def test_barrier_6_repaired_in_fixed(browser, base_url) -> None:
    context, page, _ = open_bank(browser, base_url, "fixed")
    submit_empty(page)
    assert page.get_attribute("#form-error", "role") == "alert"
    for field in ("recipient", "amount"):
        assert page.get_attribute(f"#{field}", "aria-invalid") == "true"
        assert page.get_attribute(f"#{field}", "aria-describedby") == f"{field}-error"
    assert page.evaluate("document.activeElement.id") == "recipient"   # focus goes to the first failing field
    # a live-region probe: the alert region receives the text, so a screen reader will say it
    context.close()


# ---- only barrier 1 may block the journey ----------------------------------------------------


def _only_barrier_1_repaired(tmp_path):
    source = (BANK_DIR / "index.html").read_text()
    assert source.count(HAUNTED_SEND) == 1, "the haunted send control must appear exactly once in the page source"
    (tmp_path / "index.html").write_text(source.replace(HAUNTED_SEND, REPAIRED_SEND))
    return tmp_path


def test_with_only_barrier_1_repaired_the_keyboard_finishes_the_payment(browser, tmp_path) -> None:
    with serve(_only_barrier_1_repaired(tmp_path)) as url:
        context, page, problems = open_bank(browser, url, "broken")   # still the haunted page otherwise
        focus_by_keyboard(page, "recipient")
        page.keyboard.type("Alex Carter")
        focus_by_keyboard(page, "amount")
        page.keyboard.type("50.00")
        focus_by_keyboard(page, "send-payment")
        page.keyboard.press("Enter")
        assert page.locator("[data-testid='payment-confirmation']").inner_text().startswith(
            "Sent EUR 50.00 to Alex Carter."
        )
        assert problems == []
        # barriers 2 to 6 are all still there on this copy
        assert snapshot(page, "#amount") == "- textbox"
        assert snapshot(page, "#cancel") == "- button"
        assert page.get_attribute("#form-error", "role") is None
        assert 2.5 <= hint_ratio(page) < 4.5
        context.close()


def test_barriers_2_to_6_never_stop_a_mouse_payment(browser, base_url) -> None:
    context, page, _ = open_bank(browser, base_url, "broken")
    page.fill("#recipient", "Alex Carter")
    page.fill("#amount", "50.00")
    page.click("#send-payment")
    assert page.locator("[data-testid='payment-confirmation']").is_visible()
    context.close()


# ---- axe: the haunted page fails exactly the three rules axe can see; the fixed page fails none ----
#
# Expected on the haunted page: label (barrier 2), color-contrast (barrier 3), button-name (barrier 5).
# Barriers 1, 4 and 6 cannot be seen by axe and are covered above: 1 and 4 by the Tab-order and
# computed-style tests, 6 by the role and aria checks. If axe reports any other rule, this test fails
# and names it: fix the page, or record why the rule belongs on the list. Do not widen the list silently.

AXE_PLANTED = {"label", "color-contrast", "button-name"}


def _rules(violations) -> set[str]:
    return {v["id"] for v in violations}


def test_axe_on_the_fixed_page_finds_nothing(browser, base_url) -> None:
    context, page, _ = open_bank(browser, base_url, "fixed")
    violations = run_axe(page)
    assert violations == [], violations
    context.close()


def test_axe_on_the_haunted_page_finds_exactly_the_planted_rules(browser, base_url) -> None:
    context, page, _ = open_bank(browser, base_url, "broken")
    violations = run_axe(page)
    assert _rules(violations) == AXE_PLANTED, violations
    by_rule = {v["id"]: v["targets"] for v in violations}
    assert by_rule["label"] == ["#amount"]
    assert by_rule["button-name"] == ["#cancel"]
    assert by_rule["color-contrast"] == ["#recipient-hint"]
    context.close()


def test_axe_on_the_copy_with_only_barrier_1_repaired_finds_the_same_three(browser, tmp_path) -> None:
    with serve(_only_barrier_1_repaired(tmp_path)) as url:
        context, page, _ = open_bank(browser, url, "broken")
        assert _rules(run_axe(page)) == AXE_PLANTED
        context.close()


# ---- the page does not point at its own barriers -------------------------------------------------


def test_page_source_names_no_barrier() -> None:
    source = (BANK_DIR / "index.html").read_text().lower()
    for word in ("barrier", "planted", "ghost"):
        assert word not in source, word
