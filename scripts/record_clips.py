"""Record short demo clips of the real app in Chrome (docs/evidence/clips/).

Usage: .venv/bin/python scripts/record_clips.py
Needs the dashboard on http://localhost:5173 and the API on http://127.0.0.1:8000.
Clips: the voice agent on the haunted bank (fails honestly) and on the fixed bank (pays); the fix loop by keyboard
(propose, approve, verify, regression). Plus a high-contrast screenshot. Everything shown is a real run.
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'
OUT = Path(__file__).resolve().parent.parent / 'docs' / 'evidence' / 'clips'
OUT.mkdir(parents=True, exist_ok=True)
CMDS = 'type "Test recipient" in Recipient\ntype 50.00 in Amount\nclick Send Payment'


def clip(browser, name, steps):
    ctx = browser.new_context(viewport={'width': 1280, 'height': 800}, record_video_dir=str(OUT / 'tmp'),
                              record_video_size={'width': 1280, 'height': 800})
    page = ctx.new_page()
    steps(page)
    page.wait_for_timeout(1500)
    video = page.video
    ctx.close()
    target = OUT / f'{name}.webm'
    if target.exists():
        target.unlink()
    Path(video.path()).rename(target)
    print('wrote', target.relative_to(OUT.parent.parent.parent))


def voice(variant):
    def steps(pg):
        pg.goto(BASE + '/app/journeys/send-payment/possession'); pg.wait_for_selector('h1')
        pg.get_by_label('Variant').select_option(variant)
        pg.get_by_role('navigation', name='App').first.get_by_role('link', name='Agents').click()
        panel = pg.get_by_role('article', name='Voice Agent')
        panel.get_by_text('Runs your commands on the Haunted Bank').wait_for(timeout=40000)
        box = panel.get_by_label('Command')
        box.click(); pg.keyboard.type(CMDS, delay=25)
        panel.get_by_role('button', name='Run command').focus(); pg.keyboard.press('Enter')
        panel.get_by_text('Checker:').wait_for(timeout=60000)
        panel.get_by_text('Checker:').scroll_into_view_if_needed()
    return steps


def fix_loop(pg):
    pg.goto(BASE + '/app/journeys/send-payment/possession'); pg.wait_for_selector('h1')
    pg.get_by_label('Recipient name').focus(); pg.keyboard.type('Test recipient', delay=60)  # typed by keyboard, like a tester
    pg.get_by_role('button', name='Run Journey').focus(); pg.keyboard.press('Enter')
    pg.wait_for_function("() => /Complete|Error/.test(document.getElementById('run-status').textContent)", timeout=90000)
    pg.wait_for_timeout(1200)
    pg.get_by_role('navigation', name='App').first.get_by_role('link', name='Fixes').click()
    pg.wait_for_selector('h1:has-text("Fixes: Find")')
    for name, wait in [('Propose a fix (scripted Exorcist)', 'Approve Fix'), ('Approve Fix', 'Verify on a patched copy'),
                       ('Verify on a patched copy', 'Put the bug back and check'), ('Put the bug back and check', None)]:
        pg.get_by_role('button', name=name).focus(); pg.wait_for_timeout(400); pg.keyboard.press('Enter')
        if wait:
            pg.get_by_role('button', name=wait).wait_for(timeout=90000)
    pg.get_by_text('The ghost is back. But this time, we caught it.').wait_for(timeout=90000)
    pg.get_by_text('The ghost is back. But this time, we caught it.').scroll_into_view_if_needed()


with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    clip(b, 'voice-haunted', voice('broken'))
    clip(b, 'voice-fixed', voice('fixed'))
    clip(b, 'fix-loop-keyboard', fix_loop)
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    ctx.add_init_script("localStorage.setItem('haunted-audit.contrast','on')")
    pg = ctx.new_page(); pg.goto(BASE + '/app/journeys/send-payment/possession'); pg.wait_for_selector('h1'); pg.wait_for_timeout(700)
    pg.screenshot(path=str(OUT / 'high-contrast-possession.png'))
    print('wrote docs/evidence/clips/high-contrast-possession.png')
    b.close()
for f in (OUT / 'tmp').glob('*'):
    f.unlink()
(OUT / 'tmp').rmdir()
