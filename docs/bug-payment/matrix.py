"""Diagnostic for docs/bug-payment.md. Not product code.

Drives fixtures/haunted_bank/index.html in the bundled Chromium and in Google Chrome
(if installed) and prints what happens by mouse and by keyboard in both variants.
Run from the repo root:  .venv/bin/python docs/bug-payment/matrix.py
"""
import json, sys, pathlib
from playwright.sync_api import sync_playwright

FIX = (pathlib.Path(__file__).resolve().parents[2] / "fixtures" / "haunted_bank" / "index.html").as_uri()
OUT = {}

def focus_id(pg):
    return pg.evaluate("""() => { const a=document.activeElement; if(!a) return null;
        return (a.id? '#'+a.id : a.tagName.toLowerCase()+(a.className? '.'+String(a.className).split(' ')[0]:'')) }""")

def state(pg):
    return pg.evaluate("""() => { const c=document.getElementById('payment-confirmation'), e=document.getElementById('form-error');
      return {confirmation: !c.hidden ? c.textContent : null, error: !e.hidden ? e.textContent : null,
              testid: c.getAttribute('data-testid')} }""")

def run(browser_name, browser):
    res = {}
    for variant in ("broken", "fixed"):
        url = f"{FIX}?variant={variant}"
        # --- mouse, fields filled
        pg = browser.new_page(); errs=[]
        pg.on("console", lambda m: errs.append(m.text) if m.type in ("error","warning") else None)
        pg.on("pageerror", lambda e: errs.append("pageerror: "+str(e)))
        pg.goto(url)
        pg.fill("#recipient", "Test recipient"); pg.fill("#amount", "50.00")
        pg.click("#send-payment")
        res[f"{variant}/mouse/filled"] = state(pg)
        pg.close()
        # --- mouse, fields empty
        pg = browser.new_page(); pg.goto(url); pg.click("#send-payment")
        res[f"{variant}/mouse/empty"] = state(pg); pg.close()
        # --- keyboard: tab order and whether we can pay
        pg = browser.new_page(); pg.goto(url)
        order=[]
        pg.keyboard.press("Tab")
        for _ in range(14):
            order.append(focus_id(pg)); 
            if order[-1] == "#recipient": pg.keyboard.type("Test recipient")
            if order[-1] == "#amount": pg.keyboard.type("50.00")
            if order[-1] == "#send-payment":
                pg.keyboard.press("Enter"); break
            pg.keyboard.press("Tab")
        res[f"{variant}/keyboard/tab-order"] = order
        res[f"{variant}/keyboard/after-enter-on-control"] = state(pg)
        pg.close()
        # --- keyboard: Enter inside a field (implicit submission)
        pg = browser.new_page(); pg.goto(url)
        pg.fill("#recipient", "Test recipient"); pg.fill("#amount", "50.00")
        pg.focus("#amount"); pg.keyboard.press("Enter")
        res[f"{variant}/keyboard/enter-in-amount-field"] = state(pg); pg.close()
        # --- keyboard: Space on the control (fixed only reachable)
        if variant == "fixed":
            pg = browser.new_page(); pg.goto(url)
            pg.fill("#recipient", "Test recipient"); pg.fill("#amount", "50.00")
            pg.focus("#send-payment"); pg.keyboard.press("Space")
            res["fixed/keyboard/space-on-button"] = state(pg); pg.close()
        # --- element facts
        pg = browser.new_page(); pg.goto(url)
        res[f"{variant}/element"] = pg.evaluate("""() => { const e=document.getElementById('send-payment'); const r=e.getBoundingClientRect();
            const top=document.elementFromPoint(r.x+r.width/2, r.y+r.height/2);
            return {tag:e.tagName, cls:e.className, tabindex:e.getAttribute('tabindex'), role:e.getAttribute('role'),
                    type:e.getAttribute('type'), onclick:e.getAttribute('onclick'), clickable_at_center: top===e,
                    cs_pointer: getComputedStyle(e).pointerEvents, w:Math.round(r.width), h:Math.round(r.height)} }"""); pg.close()
        res[f"{variant}/console"] = errs
    return res

with sync_playwright() as p:
    for name, kw in (("bundled-chromium", {}), ("google-chrome", {"channel": "chrome"})):
        try:
            b = p.chromium.launch(headless=True, **kw)
        except Exception as e:
            OUT[name] = {"error": str(e)[:200]}; continue
        OUT[name] = {"version": b.version, **run(name, b)}
        b.close()
print(json.dumps(OUT, indent=1))
