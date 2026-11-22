"""Diagnostic for docs/bug-payment.md. Not product code.

Drives the dashboard's "Haunted Bank" panel (Possession Mode) by mouse and keyboard in three states:
before a run, after a broken run, after a fixed run. Needs the API on :8000 and the dashboard on :5173.
Run from the repo root:  .venv/bin/python docs/bug-payment/dashboard.py
"""
import json, re, time
from playwright.sync_api import sync_playwright
B="http://127.0.0.1:5173"
OUT={}
def click_center(pg, loc):
    box = loc.bounding_box()
    pg.mouse.click(box['x']+box['width']/2, box['y']+box['height']/2)

def snap(pg, label):
    sec = pg.locator("section#journeys")
    info = pg.evaluate("""() => {
      const sec=document.querySelector('section#journeys');
      const cands=[...sec.querySelectorAll('*')].filter(e=>e.textContent.trim()==='Send Payment' && e.children.length===0);
      return cands.map(e=>({tag:e.tagName,role:e.getAttribute('role'),tabindex:e.getAttribute('tabindex'),
         ariaDisabled:e.getAttribute('aria-disabled'),ariaLabel:e.getAttribute('aria-label'),
         className:String(e.className).slice(0,60), inForm: !!e.closest('form'), cursor:getComputedStyle(e).cursor}));
    }""")
    return info
with sync_playwright() as p:
    for name, kw in (("google-chrome",{"channel":"chrome"}),):
        b=p.chromium.launch(headless=True, **kw); pg=b.new_page(viewport={"width":1440,"height":900})
        errs=[]; pg.on("console", lambda m: errs.append(m.text) if m.type in("error","warning") else None)
        pg.on("response", lambda r: print("HTTP", r.status, r.url) if r.status>=400 else None); reqs=[]; pg.on("request", lambda r: reqs.append((r.method, r.url)) if "/runs" in r.url else None)
        pg.goto(B+"/journeys/send-payment/possession", wait_until="networkidle")
        sec=pg.locator("section#journeys")
        # state 1: before any run
        OUT["before-run/elements"]=snap(pg,"before")
        OUT["before-run/inputs"]=pg.evaluate("[...document.querySelectorAll('section#journeys input')].map(i=>({id:i.id,readOnly:i.readOnly,value:i.value}))")
        # fill and click with mouse
        pg.fill("#pm-recipient","Alex Carter"); pg.fill("#pm-amount","50.00")
        n0=len(reqs)
        click_center(pg, sec.get_by_text("Send Payment", exact=True).last)
        time.sleep(.5)
        OUT["before-run/mouse-click"]={"confirmation_in_dom": pg.locator("[data-testid=payment-confirmation]").count(),
            "text_has_Sent": "Sent EUR" in sec.inner_text(), "new_requests": reqs[n0:]}
        # keyboard: tab through the panel and see where focus lands; press Enter/Space on the Send Payment div
        order=[]
        pg.locator("#pm-amount").focus()
        for _ in range(4):
            pg.keyboard.press("Tab"); order.append(pg.evaluate("(()=>{const a=document.activeElement;return a.tagName+(a.id?'#'+a.id:'')+' '+(a.getAttribute('aria-label')||a.textContent||'').slice(0,40)})()"))
        OUT["before-run/keyboard-after-amount"]=order
        pg.keyboard.press("Enter"); pg.keyboard.press("Space"); time.sleep(.3)
        OUT["before-run/keyboard-enter-space"]={"confirmation_in_dom": pg.locator("[data-testid=payment-confirmation]").count(), "text_has_Sent":"Sent EUR" in sec.inner_text()}
        # run broken
        pg.get_by_role("button", name=re.compile("Run", re.I)).first.click()
        pg.wait_for_function("/Journey Blocked/.test(document.body.innerText)", timeout=60000)
        OUT["blocked/elements"]=snap(pg,"blocked")
        n0=len(reqs)
        click_center(pg, sec.get_by_text("Send Payment", exact=True).last); time.sleep(.4)
        OUT["blocked/mouse-click"]={"text_has_Sent":"Sent EUR" in sec.inner_text(),"confirmation_in_dom": pg.locator("[data-testid=payment-confirmation]").count(),"new_requests":reqs[n0:]}
        # fixed run
        pg.select_option("select#variant-select","fixed") if pg.locator("select#variant-select").count() else None
        pg.get_by_role("button", name=re.compile("Run", re.I)).first.click()
        pg.wait_for_function("document.body.innerText.includes('PASSED') || !document.body.innerText.includes('Journey Blocked')", timeout=60000); time.sleep(1.5)
        OUT["fixed/elements"]=snap(pg,"fixed")
        pg.locator("#pm-recipient").fill("Alex Carter"); pg.locator("#pm-amount").fill("50.00")
        n0=len(reqs)
        btn=sec.get_by_role("button", name="Send Payment")
        OUT["fixed/send-buttons"]=btn.count()
        if btn.count(): btn.first.click(); time.sleep(.4)
        OUT["fixed/mouse-click"]={"text_has_Sent":"Sent EUR" in sec.inner_text(),"confirmation_in_dom": pg.locator("[data-testid=payment-confirmation]").count(),"new_requests":reqs[n0:]}
        OUT["console"]=errs
        pg.screenshot(path="/tmp/diag/dash_fixed.png")
        b.close()
print(json.dumps(OUT, indent=1))
