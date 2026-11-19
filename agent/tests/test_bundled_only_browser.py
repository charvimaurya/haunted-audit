"""A page that reaches for the network gets nothing. Uses the real Chromium the other tests use."""
from __future__ import annotations

from playwright.sync_api import sync_playwright

from agent.keyboard_agent import runner


def test_requests_outside_the_fixture_are_aborted(tmp_path) -> None:
    page_file = runner.FIXTURE_PATH.parent / "index.html"
    results: dict[str, str] = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=runner._launch_args())
        context = browser.new_context()
        context.route("**/*", runner._only_bundled_fixture)
        page = context.new_page()
        page.goto(page_file.as_uri() + "?variant=broken", wait_until="domcontentloaded")
        assert page.title()  # the bundled page itself still loads
        for name, url in {
            "external": "http://example.com/x.png",
            "credentials": "http://169.254.170.2/v2/credentials",
            "metadata": "http://169.254.169.254/latest/meta-data/",
        }.items():
            results[name] = page.evaluate(
                "async (u) => { try { await fetch(u, {mode: 'no-cors'}); return 'reached'; } "
                "catch (e) { return 'blocked'; } }",
                url,
            )
        browser.close()
    assert results == {"external": "blocked", "credentials": "blocked", "metadata": "blocked"}
