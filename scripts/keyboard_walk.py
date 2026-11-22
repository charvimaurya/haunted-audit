"""Keyboard-only walk of every dashboard page in Chrome.

Usage: .venv/bin/python scripts/keyboard_walk.py  (dashboard dev server on DASHBOARD_URL, default http://localhost:5173)
Checks per page: skip link is the first stop, every stop has a visible focus ring,
Tab reaches the end without a trap, Shift+Tab goes back one stop. Then Enter on the hero link.
"""

import sys
from playwright.sync_api import sync_playwright

import os
import re
from pathlib import Path
BASE = os.environ.get('DASHBOARD_URL', 'http://localhost:5173')
# Every page in the route table (dashboard/src/routes.ts, PATHS), so this list cannot drift from the app.
_ROUTES = (Path(__file__).resolve().parent.parent / 'dashboard' / 'src' / 'routes.ts').read_text(encoding='utf-8')
_APP = re.search(r"const APP = '([^']+)'", _ROUTES).group(1)
_BLOCK = _ROUTES[_ROUTES.index('export const PATHS = {'):_ROUTES.index('} as const;')]
PAGES = [v.replace('${APP}', _APP) for v in re.findall(r":\s*[`']([^`']+)[`']", _BLOCK)]
PAGES = [_APP if p == 'APP' else p for p in PAGES] + ([_APP] if "'app-home': APP" in _BLOCK else [])
PAGES = list(dict.fromkeys(PAGES))
JS = """() => { const e = document.activeElement; if (!e || e === document.body) return null;
  const s = getComputedStyle(e); const r = e.getBoundingClientRect();
  const ring = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 || (s.boxShadow && s.boxShadow !== 'none');
  return {tag: e.tagName, name: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 40), ring, w: r.width, h: r.height}; }"""
fails = 0
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    pg = b.new_page(viewport={'width': 1280, 'height': 800})
    def load(path):
        pg.goto(BASE + path); pg.wait_for_selector('h1'); pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(300)

    for path in PAGES:
        load(path)
        # On first load focus stays at the top of the document, so the first Tab is the first stop.
        h1_focused = pg.evaluate("() => document.activeElement && document.activeElement.tagName") == 'H1'
        seen, first, no_ring, stops = [], None, [], 0
        for i in range(80):
            pg.keyboard.press('Tab'); f = pg.evaluate(JS)
            if f is None: break  # left the page at the end: no trap
            stops += 1
            key = (f['tag'], f['name'])
            if i == 0: first = f['name']
            if not f['ring']: no_ring.append(f['name'])
            if seen and key == seen[0] and i > 2: break  # wrapped round: no trap
            seen.append(key)
        # Shift+Tab mid-page must return to the element before
        load(path)
        pg.keyboard.press('Tab'); pg.keyboard.press('Tab'); a = pg.evaluate(JS)
        pg.keyboard.press('Tab'); pg.keyboard.press('Shift+Tab'); b2 = pg.evaluate(JS)
        back = b2 if (a and b2 and a['name'] == b2['name']) else None
        ok = first == 'Skip to main content' and not no_ring and back is not None and not h1_focused
        fails += 0 if ok else 1
        print(('PASS' if ok else 'FAIL'), path, f'stops={stops}', f'first={first!r}', f'no_visible_focus={no_ring[:4]}', f'h1_focused_on_load={h1_focused}')
    # Enter activates: focus the hero link by keyboard and press Enter
    pg.goto(BASE + '/'); pg.wait_for_selector('h1'); pg.wait_for_load_state('networkidle')
    for _ in range(30):
        pg.keyboard.press('Tab')
        if 'Possess This App' in (pg.evaluate(JS) or {}).get('name', ''): break
    pg.keyboard.press('Enter'); pg.wait_for_timeout(600)
    enter_ok = pg.url.endswith('/try')
    fails += 0 if enter_ok else 1
    print(('PASS' if enter_ok else 'FAIL'), 'Enter on "Possess This App" opens /try:', pg.url)
    b.close()
print('pages failing:', fails, 'of', len(PAGES))
sys.exit(1 if fails else 0)
