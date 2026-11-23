"""Screenshots of every dashboard page at 1440 px, for docs/ui-fidelity/ (Phase 4).

Usage: .venv/bin/python scripts/ui_screens.py <out-dir>
Needs the dashboard on DASHBOARD_URL (default http://localhost:5173) and the API running, so the
"after a run" shots show a real haunted run (scripted keyboard walker). Pages come from routes.ts.
"""
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = os.environ.get('DASHBOARD_URL', 'http://localhost:5173')
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else 'docs/ui-fidelity/after')
ROUTES = (Path(__file__).resolve().parent.parent / 'dashboard' / 'src' / 'routes.ts').read_text(encoding='utf-8')
APP = re.search(r"const APP = '([^']+)'", ROUTES).group(1)
BLOCK = ROUTES[ROUTES.index('export const PATHS = {'):ROUTES.index('} as const;')]
PAGES = list(dict.fromkeys(
    [m[0] if m[0] else APP for m in re.findall(r":\s*(?:[`']([^`']+)[`']|(APP)\s*,)", BLOCK)]
))
PAGES = [p.replace('${APP}', APP) for p in PAGES]


def name(path: str) -> str:
    return 'home' if path == '/' else path.strip('/').replace('/', '_')


OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    pg = b.new_page(viewport={'width': 1440, 'height': 900})
    for path in PAGES:
        pg.goto(BASE + path); pg.wait_for_selector('h1'); pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(700)
        pg.screenshot(path=str(OUT / f'{name(path)}.png'), full_page=True)
    # After a real haunted run: Possession, then the same app session on Agents and Find
    pg.goto(BASE + f'{APP}/journeys/send-payment/possession'); pg.wait_for_selector('h1')
    pg.get_by_label('Recipient name').fill('Test recipient')  # the tester types the name (recipient-input)
    pg.get_by_role('button', name='Run Journey').click()
    pg.wait_for_function("() => /Complete|Error|failed/.test(document.getElementById('run-status').textContent)", timeout=90000)
    pg.wait_for_timeout(900)
    pg.screenshot(path=str(OUT / 'run_possession.png'), full_page=True)
    nav = pg.get_by_role('navigation', name='App').first
    for label, file in [('Agents', 'run_agents'), ('Fixes', 'run_fixes_find'), ('Reports', 'run_reports')]:
        nav.get_by_role('link', name=label).click(); pg.wait_for_timeout(900)
        pg.screenshot(path=str(OUT / f'{file}.png'), full_page=True)
    b.close()
print(f'{len(PAGES)} pages + 4 run states -> {OUT}')
