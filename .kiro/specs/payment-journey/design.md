# Working payment journey and hidden test controls - Design

**Requirements:** `requirements.md` in this folder (IDs like REQ-BAR-06 are cited below).
**Diagnosis:** `docs/bug-payment.md`.
**Facts here come from reading the code and from the diagnosis runs. Nothing below has been built.**

---

## 1. Decisions

| # | Decision | Why |
|---|---|---|
| X1 | The dashboard shows the real bank page in an iframe. The React drawing is deleted. | Root cause in `docs/bug-payment.md`: the drawing has no behaviour and disagrees with the page the checker tests. One bank removes the gap. |
| X2 | The backend serves the bank page per session at `/bank/{session_id}/index.html` and injects the variant into it. | The visitor cannot change the state from the address bar (REQ-BANK-02), and the dashboard asks the backend which URL to show (your brief). |
| X3 | Internal names stay `broken` and `fixed`. Session states are `haunted`, `fixed`, `regressed`, `restored`. | `broken` is in the checker's contract, the API, the eval and `docs/evidence.md`. A rename would change all of them for no user benefit. |
| X4 | The state machine is a pure function plus a SQLite store. The Approve and regression handlers call it. A debug route exists only under `HAUNTED_AUDIT_DEBUG=1`. | Keeps "a human approves" true (REQ-SES-04) while the Exorcist and Verifier are not built. |
| X5 | The bank page reports focus to its parent with `postMessage`. | The dashboard and the API are on different origins in staging, so the dashboard cannot read the iframe's DOM. The live checklist needs focus events. |
| X6 | The page keeps one file, `fixtures/haunted_bank/index.html`, with both states in it. | The checker, the scripted walker and the tests use that path and the `?variant=` address. A second file would let the two drift. |
| X7 | Barrier 3 uses colour `#7a6a94` on the panel `#241338` in haunted (3.52:1 by my calculation) and `#cbbbe0` in fixed (9.57:1). | Weak but visible; both are well away from the 4.5:1 line, so a rounding difference cannot flip a test. The test measures the real value and PLANTED.md records it. |
| X8 | The fixed bank is the committed reference page until the Verifier exists. | The Verifier's patched copy repairs one finding only. See D1 and D2 in the requirements. |

---

## 2. Bank page (`fixtures/haunted_bank/index.html`)

### 2.1 What stays

`#recipient`, `#amount`, `#send-payment`, `#payment-confirmation[data-testid="payment-confirmation"]`, the class `pay-btn` (haunted target) and `btn-primary` (fixed target), the header label "Haunted Bank - test site", the nav, the "Pumpkin fee waived" panel, the footer. No other element gets those two classes.

### 2.2 What goes

- `#variant-badge` ("Variant: broken") and the line of script that fills it.
- The comments and class names that hint at barriers (none exist today; a test keeps it that way).

### 2.3 Variant source

```html
<!--BANK_CONFIG-->
<script>
  const cfg = window.__BANK__;               // injected by the API route
  const q = new URLSearchParams(location.search).get("variant");
  const variant = cfg ? cfg.variant : (q === "fixed" ? "fixed" : "broken");
  document.documentElement.dataset.bank = variant;   // for tests only; invisible
</script>
```

The API route replaces `<!--BANK_CONFIG-->` with `<script>window.__BANK__={"variant":"fixed"}</script>`. The page opened from a file (agents, tests) has no marker and reads `?variant=`. `data-bank` is not text, not an accessible name, and not returned by `read_page` (check in TASK-02).

### 2.4 The six barriers, haunted and repaired

| # | Haunted markup | Fixed markup |
|---|---|---|
| 1 | `<div class="pay-btn" id="send-payment" onclick="pay()">Send Payment</div>` in the actions row. No `tabindex`, no `role`. Clicking runs `pay()` with the form's values | `<button type="submit" class="btn-primary" id="send-payment">Send Payment</button>`; the form's `submit` handler runs `pay()` (Enter in a field also submits) |
| 2 | `<div class="field"><span class="fake-label">Amount (EUR)</span><input id="amount" inputmode="decimal" autocomplete="off"></div>`. No `label`, no `for`, no `aria-*`, no `placeholder` | `<label for="amount">Amount (EUR)</label><input id="amount" ...>` |
| 3 | `<p id="recipient-hint" style="color:#7a6a94">Use the name on the account.</p>` (3.52:1 on `#241338`) | same text, colour `#cbbbe0` (9.57:1) |
| 4 | `#recipient:focus, #recipient:focus-visible { outline: none; box-shadow: none; }` and the border does not change on focus | no override; the page-wide `input:focus-visible` 3px gold outline applies |
| 5 | `<button type="button" id="cancel" class="icon-btn"><svg aria-hidden="true" ...>x</svg></button>`, no text, no `aria-label` | same button with `aria-label="Cancel"` |
| 6 | `<p id="form-error" hidden>` filled with plain text. No `role`, no `aria-live`. Fields get no `aria-invalid` or `aria-describedby` | `<div id="form-error" role="alert" hidden>` holding one `<p id="recipient-error">` and `<p id="amount-error">`. Failing fields get `aria-invalid="true"` and `aria-describedby`. Focus moves to the first failing field |

The same inline script builds the haunted or the fixed pieces from `variant`. Static markup shared by both stays in the HTML. The class `icon-btn` is used for Cancel so it cannot match `button.btn-primary` (REQ-PAY-09).

Note on barrier 1 and the form: in haunted the form has no submit button, so Enter inside a field submits nothing (the browser needs a submit button for a two-field form). That is the diagnosed behaviour and is part of barrier 1, not a new bug.

### 2.5 Payment logic

```js
const cents = (s) => /^(0|[1-9]\d*)\.\d{2}$/.test(s) ? parseInt(s.replace(".", ""), 10) : null;
let balance = 100000;                         // EUR 1000.00 in cents, memory only

function validate(recipient, amountText) {
  const errors = {};
  const r = recipient.trim();
  const a = amountText.trim();
  if (!r) errors.recipient = "Enter a recipient.";
  else if (r.length > 60) errors.recipient = "Recipient must be 60 characters or fewer.";
  const c = a === "" ? null : cents(a);
  if (a === "") errors.amount = "Enter an amount.";
  else if (c === null || c <= 0) errors.amount = "Enter the amount as a positive number with two decimals, for example 50.00.";
  else if (c > balance) errors.amount = "The amount is more than your balance (EUR " + fmt(balance) + ").";
  return { errors, cents: c };
}
```

On success: `balance -= cents`; show `#payment-confirmation` (`role="status"`) with `Sent EUR <amount> to <recipient>.`; update `#balance` ("Demo balance: EUR 950.00 (not real money)"); clear the fields. No `fetch`, no storage calls anywhere in the file (a test scans for them).

### 2.6 Focus reporting

```js
document.addEventListener("focusin", (e) => {
  window.parent !== window &&
    window.parent.postMessage({ source: "haunted-bank", type: "focus", id: e.target.id || null }, "*");
});
```

Only the element id leaves the page; never a value. The dashboard checks `event.origin` and `event.source`.

---

## 3. Backend

### 3.1 New module `agent/api/sessions.py`

```python
TRANSITIONS = {
    ("haunted", "approve_fix"): "fixed",
    ("fixed", "start_regression"): "regressed",
    ("regressed", "restore_fix"): "restored",
    ("restored", "start_regression"): "regressed",
}
BANK_FOR = {"haunted": "haunted", "fixed": "fixed", "regressed": "haunted", "restored": "fixed"}
EVENTS = {"approve_fix", "start_regression", "restore_fix"}

def next_state(state: str, event: str) -> str | None:   # None means refused
    return TRANSITIONS.get((state, event))
```

`SessionStore` (same SQLite file as runs, same lock style as `RunStore`):

```sql
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY, state TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS session_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, from_state TEXT NOT NULL,
  event TEXT NOT NULL, to_state TEXT, at TEXT DEFAULT CURRENT_TIMESTAMP);   -- to_state NULL = refused
```

`apply(session_id, event)` runs in one transaction: read, `next_state`, update with `version = version + 1`, insert the history row (also for a refusal), return the new record or raise `Refused`. `touch` updates `updated_at` on every read; `prune(now)` deletes sessions idle for 24 hours and their events; `count_live()` enforces the 500 cap.

### 3.2 Routes (in `create_app`)

| Route | Notes |
|---|---|
| `POST /sessions` | 201 `{session_id, state: "haunted", bank, bank_url, version, updated_at, provenance}`. Per-address rate limit using the existing `SlidingWindow`; 429 with `Retry-After` at the cap of 500 |
| `GET /sessions/{id}/state` | 200 as in REQ-SES-03, 404 if unknown or expired |
| `GET /bank/{id}/index.html` | HTML with `Cache-Control: no-store`, the CSP, `nosniff`, `no-referrer`; injects `window.__BANK__`; 404 for an unknown session |
| `POST /sessions/{id}/debug/event` | Only registered when `HAUNTED_AUDIT_DEBUG=1`; body `{"event": "approve_fix" \| ...}`; 409 when refused |
| `POST /runs` | `RunCreate` gains `session_id: str \| None`. Rules in 3.4 |

`bank_url` is `"/bank/{id}/index.html?v={version}"`, a path. The dashboard resolves it against `VITE_API_URL`. A path avoids guessing the public scheme behind the load balancer.

`frame-ancestors` is built from `CORS_ALLOWED_ORIGINS` (plus `http://localhost:5173 http://127.0.0.1:5173` when it is unset, same default as CORS).

### 3.3 Hooks for later specs

The Approve handler (exorcist spec) calls `sessions.apply(session_id, "approve_fix")` after it stores the decision. The regression handler (fix-verify-prevent) calls `start_regression` before the reverse patch and `restore_fix` after re-applying. Until they exist, tests call `apply` directly or use the debug route. When the Verifier makes a patched copy, `bank_source` becomes `verifier_patched_copy` and `GET /bank/{id}` serves `data/sessions/{id}/bank/index.html` for the fixed bank.

### 3.4 `POST /runs`

```python
class RunCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    session_id: str | None = None
    variant: Literal["broken", "fixed"] | None = None
    mode: Literal["llm", "scripted"] | None = None
    max_steps: int = Field(default=25, ge=1, le=80)
    timeout_seconds: float = Field(default=90, ge=0, le=300)
```

| Request | `HAUNTED_AUDIT_DEBUG` off | on |
|---|---|---|
| `session_id` only | OK. Variant from the session's bank, mode from server setting | OK |
| `session_id` + `variant` or `mode` | 422 "variant and mode are chosen by the server" | OK, explicit values win; `origin: "debug"` |
| no `session_id`, `variant` or `mode` set | 422 same text | OK (this is today's behaviour, used by tests); `origin: "debug"` |
| no `session_id`, nothing else | 422 "start a session first" | defaults `broken` / `scripted` |

Defaults used to be `broken` and `scripted`; they move to the server. Mode: `scripted` unless `LLM_ENABLED=true` and `DEFAULT_AGENT_MODE=llm`. The existing LLM refusal rules (403 and daily cap) stay.

Provenance is written when the run starts and stored in a new `runs.provenance` JSON column (added with the same guarded `ALTER TABLE` pattern as `seeded`). `GET /runs/{id}` returns it. Old rows return `null`.

### 3.5 Runner

`_execute_run` receives the resolved `variant` and passes it to `build_journey_config` unchanged, so agents still open `fixtures/haunted_bank/index.html?variant=...` as a file. The agent's browser guard is untouched (REQ-BANK-05).

---

## 4. Contract changes (`.kiro/steering/data-contract.md`, same pull request)

Add: the four session routes, the bank route, `session_id` on `POST /runs`, the refusal text, `provenance` on the run record, and the session state record. Remove the `variant` and `mode` rows from the public request table and move them to a "debug only" note.

---

## 5. Dashboard

The Possession and Reports screens exist in the unmerged routing work. These changes are described against that structure and land when it does (D7).

| Part | Change |
|---|---|
| `SessionProvider` | On mount: read `sessionStorage["ha-session"]`; `GET /sessions/{id}/state`; if missing or 404, `POST /sessions`. Exposes `{state, bankUrl, version, refresh}`. Announces "The demo was reset" in the live region after a 404 |
| `BankFrame` | Replaces the drawing. `<iframe title="Haunted Bank - Test site" src={API_BASE + bank_url}>` in the 1280 x 800 scaled stage from the pixel spec. Reloads when `version` changes. Listens to `message`, checks `origin === new URL(src).origin` and `source === iframe.contentWindow`, then calls `useJudgeFocus` |
| `RunControls` | Variant and mode selects deleted. One "Run the checker" button. `POST /runs {session_id}` |
| `DebugPanel` | Rendered when `new URLSearchParams(location.search).get("debug") === "1"`. Variant select, mode select, buttons for the three events (calls the debug route), and a line showing the current state. If the server answers 404 it says "Debug is off on this server". Not in the router, nav or sitemap |
| `ProvenanceBlock` | `<details>` closed by default on Reports: "How this run was produced". Reads `provenance` and the run record. `--` for unmeasured values |
| README | Judge steps lose the variant and mode instructions (REQ-HID-06) |

Nothing in the dashboard shows or stores the recipient or amount: the bank page is a separate document.

---

## 6. Tests

| File | Runner | What |
|---|---|---|
| `agent/tests/test_sessions.py` | pytest | all 12 (state, event) pairs; version increments; history incl. refusals; expiry and the 500 cap with a fake clock; debug route 404 without the flag |
| `agent/tests/test_bank_route.py` | pytest + TestClient | body changes after a transition; `?variant=` ignored; headers; 404; no variant words in visible text |
| `agent/tests/test_runs_session.py` | pytest | the table in 3.4, both flag settings; run variant follows the session; provenance stored |
| `agent/tests/test_bank_page.py` | pytest + Playwright (bundled Chromium, and Chrome if installed) against a real server started in a fixture | REQ-TEST-01, 02, 03, the validation table, balance, no storage, no network, REQ-BAR-02 (copy with only barrier 1 repaired), REQ-REG-04 (`read_page` shows no variant text) |
| `agent/tests/test_bank_axe.py` | pytest + Playwright + axe-core | fixed: zero violations. Haunted: rule set equals `{label, color-contrast, button-name}`; comment names the three undetectable barriers |
| `dashboard/e2e/debug-panel.spec.ts` | `@playwright/test` | REQ-TEST-05, no selectors on routes (REQ-HID-01), session reload (REQ-FE-03), offline (REQ-FE-04), provenance block (REQ-PRV-03) |
| `dashboard/src/test/*.test.tsx` | Vitest + jest-axe | `RunControls` has no selects; `DebugPanel` flag logic; `ProvenanceBlock` values |

axe-core for the Python tests is loaded from the `axe-core` npm package already in `dashboard/node_modules` (injected with `page.add_script_tag`), so no new Python dependency is needed. If `node_modules` is absent the test is skipped and reports "not run".

Regression gate: `python -m agent.eval.run_eval --modes scripted --runs 5` must still give 5 of 5 and 5 of 5.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| The five new barriers change what the scripted walker and the LLM agent see (a new focusable Cancel button; `#amount` with no accessible name) | The walker picks editable fields by tag and the submit control by name tokens; the eval gate and a walker test on both pages catch a regression. `button.btn-primary` stays unique (REQ-PAY-09) |
| The page now carries a message channel to its parent | Ids only, origin and source checked, a test proves no typed text is sent |
| Hidden state can still be reached by someone who finds the debug route | Route not registered unless `HAUNTED_AUDIT_DEBUG=1`; staging never sets it; a test lists every route that changes a session |
| FIXED cannot be reached from the UI until Approve exists | Said plainly in D1; tests use the debug transition; the UI path is added in the Exorcist spec's task for the Fix screen |
| Session rows vanish on the ephemeral container disk | REQ-FE-03 restarts a session; cost is a reset demo |
| Cross-origin iframe blocked by a wrong CSP | A test loads the page from an allowed and a disallowed origin |
| Axe finds a rule on the haunted page that is not planted (for example `landmark` or `region`) | The test fails and names it; fix the page or drop the unplanned rule only with a recorded reason |
| The fake balance looks like account data | Labelled "Demo balance ... (not real money)", memory only |
