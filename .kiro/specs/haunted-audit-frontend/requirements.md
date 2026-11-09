# Haunted Audit — Frontend Requirements

**Spec version:** 1.0  
**Design reference:** `design/Haunted_Audit_Final_UI_v7.png` (frozen; do not redesign)  
**Steering:** `.kiro/steering/product-rules.md`  
**Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · Vercel

---

## Conventions

Acceptance criteria use **EARS** (Easy Approach to Requirements Syntax) notation:

- **WHEN** \<trigger\> **THE SYSTEM SHALL** \<response\>
- **WHILE** \<state\> **THE SYSTEM SHALL** \<response\>
- **IF** \<condition\> **THEN THE SYSTEM SHALL** \<response\>
- **THE SYSTEM SHALL** \<unconditional behaviour\>

Metrics: any numeric result from the backend renders as its measured value. Any result not yet measured renders as `--` with a visible "not yet measured" label and an `sr-only` equivalent. `agent_mode` (`llm` or `scripted`) is displayed alongside every metric. These rules are non-negotiable (product-rules.md §Metrics and Rendering).

Ghost states (product-rules.md §Ghost Mascot):
- **Ready** = purple `#c9b6ff` — no barrier found or journey not started
- **Blocked** = red `#ef4444` — barrier confirmed by checker
- **Verified** = green `#22c55e` — checker returned PASSED

Verdict authority: the deterministic checker, not the agent, decides every `verdict` and `reason_code`. The frontend never inverts, overrides, or edits these values.

---

## REQ-01 — Landing Page (`/`)

### REQ-01-01  Hero section

**THE SYSTEM SHALL** render the page heading "Haunted Audit" using the spooky display font (`Uncial Antiqua`) only for the wordmark.

**THE SYSTEM SHALL** render the tagline "The accessibility guardrail for AI-built applications." as body copy below the heading.

**THE SYSTEM SHALL** render the sub-line "Feel the barrier. Fix the cause. Prove the journey." as a secondary line below the tagline.

**THE SYSTEM SHALL** render a primary call-to-action button labelled "Possess This App".

**WHEN** the user activates "Possess This App" **THE SYSTEM SHALL** navigate to `/demo`.

**THE SYSTEM SHALL** render four pipeline chips in a horizontal row: Detect, Fix, Verify, Prevent. Chips are static labels (not interactive buttons); they carry no hover affordance and no `role="button"`.

**THE SYSTEM SHALL** render an inline-SVG ghost mascot in Ready state (purple) on the hero. The SVG is a first-class component (`<GhostSVG>`) with `state` prop driving fill and glow; it is `aria-hidden` because ghost state is also conveyed in visible text elsewhere.

**THE SYSTEM SHALL** render a graveyard illustration in the hero background (SVG or CSS). The illustration is `aria-hidden`.

### REQ-01-02  Ghost state machine

**THE SYSTEM SHALL** expose a `GhostState` type of `'ready' | 'blocked' | 'verified'`.

**WHILE** no run result is loaded **THE SYSTEM SHALL** display the ghost in Ready (purple) state.

**WHEN** a completed run result has `verdict === 'BLOCKED'` **THE SYSTEM SHALL** transition the ghost to Blocked (red) state.

**WHEN** a completed run result has `verdict === 'PASSED'` **THE SYSTEM SHALL** transition the ghost to Verified (green) state.

**THE SYSTEM SHALL** animate the ghost with a vertical float. **WHEN** `prefers-reduced-motion: reduce` is active **THE SYSTEM SHALL** suppress the float animation and all glow pulses without user action.

### REQ-01-03  Results strip

**THE SYSTEM SHALL** render four metric tiles at the bottom of the landing page:
- Planted barriers detected `[x] / 6`
- Approved fixes verified `[x]%`
- Test scenarios `[n]`
- User sessions `[n]`

**THE SYSTEM SHALL** render each tile value as `--` with label "not yet measured" until a real backend result provides the value.

**THE SYSTEM SHALL** render a "The Outcome" parchment card (`background: linear-gradient(160deg, #f5e6c8, #e8d0a0)`, ink `#3b2a0e`) containing three outcome statements from the most recent completed run, or placeholder copy until a run completes.

**THE SYSTEM SHALL** render "Built with Kiro" as plain text (not a link, not a logo) in the footer.

---

## REQ-02 — Demo Bank (`/bank`)

### REQ-02-01  Page structure

**THE SYSTEM SHALL** render a page titled "Haunted Bank — Test site".

**THE SYSTEM SHALL** render a left sidebar with navigation items: Dashboard, Send Payment, Accounts, Transactions. "Send Payment" is the active page.

**THE SYSTEM SHALL** render a main panel titled "Send Payment" with: a Recipient field (pre-filled "Alex Carter"), an Amount field (pre-filled "€50.00"), and a send control in a `#pay-slot` div.

**THE SYSTEM SHALL** read the `?variant` query parameter. Accepted values: `broken`, `fixed`. If absent or invalid, default to `broken`.

### REQ-02-02  Broken variant

**WHEN** `?variant=broken` **THE SYSTEM SHALL** inject into `#pay-slot` a `<div class="pay-btn" id="send-payment">Send Payment</div>` — no `tabindex`, no `role`, no `type`.

**THE SYSTEM SHALL** attach an `onclick` handler to `div.pay-btn` that calls `submitPayment()`.

**THE SYSTEM SHALL** verify that `div.pay-btn` is not reachable by Tab keyboard navigation (this is the barrier the agent must detect).

### REQ-02-03  Fixed variant

**WHEN** `?variant=fixed` **THE SYSTEM SHALL** inject into `#pay-slot` a `<button type="submit" class="btn-primary" id="send-payment">Send Payment</button>`.

**WHEN** the user activates the send button with a valid recipient and amount **THE SYSTEM SHALL** show `<div id="payment-confirmation" data-testid="payment-confirmation" role="status">Sent EUR {amount} to {recipient}.</div>`.

**WHEN** the user activates the send button with an empty recipient or amount **THE SYSTEM SHALL** show `<p id="form-error" role="alert">Enter a recipient and an amount.</p>` and keep the confirmation hidden.

### REQ-02-04  Skip link

**THE SYSTEM SHALL** render a skip-to-content link as the first focusable element, targeting `#payment-form`. The link is visible on focus, hidden otherwise.

---

## REQ-03 — Possession Mode (`/journeys/send-payment`)

### REQ-03-01  Layout

**THE SYSTEM SHALL** render a breadcrumb "Haunted Audit › Journey: Send Payment › Possession Mode" at the top of the panel.

**THE SYSTEM SHALL** embed the Haunted Bank sidebar and payment form (read-only display) in the left portion of the panel.

**THE SYSTEM SHALL** render a "Possession Mode — Keyboard-only demonstration" panel on the right with a three-item checklist:
1. Tab to Recipient
2. Tab to Amount
3. Tab to Send Payment (stuck)

**THE SYSTEM SHALL** display a "Live Test" badge with a pulsing red dot. **WHEN** `prefers-reduced-motion: reduce` **THE SYSTEM SHALL** suppress the pulse animation.

### REQ-03-02  Live checklist from real focus events

**WHEN** the page mounts **THE SYSTEM SHALL** attach a `keydown` listener for Tab to the embedded bank iframe or the page document.

**WHEN** a Tab keypress moves focus to the Recipient input **THE SYSTEM SHALL** mark checklist item 1 "Tab to Recipient" as passed (green check + "Passed" sr-only text).

**WHEN** a Tab keypress moves focus to the Amount input **THE SYSTEM SHALL** mark checklist item 2 "Tab to Amount" as passed.

**WHEN** a Tab cycle completes without focus reaching `button.btn-primary` or `div.pay-btn` **THE SYSTEM SHALL** mark checklist item 3 "Tab to Send Payment (stuck)" as failed (red × + "Failed" sr-only text).

**THE SYSTEM SHALL** wrap the checklist `<ol>` in `aria-live="polite" aria-atomic="false"` so AT announces each update as it arrives.

**THE SYSTEM SHALL** convey checklist item status through icon + visible text label, never through colour alone (WCAG 1.4.1).

### REQ-03-03  Ghost positioning

**WHEN** a run result contains `blocked_element.bounding_box` **THE SYSTEM SHALL** position the ghost SVG in Blocked (red) state beside — never overlapping — the Send Payment control, offset by the `bounding_box` coordinates.

**THE SYSTEM SHALL** derive ghost position exclusively from `blocked_element.bounding_box`. Coordinates are never hardcoded or invented.

**WHEN** `blocked_element.bounding_box` is null **THE SYSTEM SHALL** render the ghost in Ready (purple) state with no absolute positioning.

**WHEN** the ghost is in Blocked state **THE SYSTEM SHALL** render a tooltip "Journey Blocked" adjacent to the ghost.

**WHEN** the ghost is in Blocked state **THE SYSTEM SHALL** render a "Barrier Detected!" button that, when activated, scrolls to the detailed barrier card.

### REQ-03-04  Agent replay

**THE SYSTEM SHALL** render a "Run agent" control that POSTs to `POST /runs` with the selected variant and mode.

**WHILE** a run is in progress **THE SYSTEM SHALL** stream `StepEvent`s from `GET /runs/{id}/events` (SSE) and render each event in the live timeline as it arrives.

**WHEN** the SSE stream closes with status `complete` **THE SYSTEM SHALL** fetch `GET /runs/{id}` and update the checklist and ghost state from the final `JourneyResult`.

**WHEN** the SSE stream closes with status `error` **THE SYSTEM SHALL** display an error state with the `error` field text and a "Retry" control.

**IF** the backend is unreachable **THEN THE SYSTEM SHALL** display "Backend offline — no live data available" and never render fabricated results.

---

## REQ-04 — Agent Investigation (`/agents`)

### REQ-04-01  The Ghost Hunt panel

**THE SYSTEM SHALL** render a section heading "The Ghost Hunt — Agent Investigation".

**THE SYSTEM SHALL** render three agent cards in a row:
- **Keyboard Agent** — outcomes: "Navigated form" (pass), "Could not reach Send Payment" (fail). When a result is loaded, the fail detail is `result.reason_code`.
- **Voice Agent** — labelled "(simulated)" in the card subtitle. Outcomes: "Found by name 'Send Payment'" (pass), "Could not activate button" (fail).
- **Ghost Hunter** — outcomes: "Identified root cause" (pass), "Custom element not keyboard accessible" (fail), detail: `result.blocked_element.selector`.

**WHEN** a run is in progress **THE SYSTEM SHALL** show a loading spinner in each agent card header.

### REQ-04-02  Critical Ghost Detected card

**THE SYSTEM SHALL** render a "Critical Ghost Detected" alert card **only when** `result.verdict === 'BLOCKED'` and `result.blocked_element !== null`.

**THE SYSTEM SHALL** include in the card:
- Ghost mascot in Blocked (red) state
- "Barrier: Payment button inaccessible to keyboard navigation"
- "Impact: Customer cannot complete payment"
- "WCAG: 2.1.1 Keyboard, 4.1.2 Name, Role, Value"
- The `blocked_element.text` or `blocked_element.selector` as a chip label
- A screenshot of the step that triggered the block, if `step_events` contains a `screenshot_path`

**THE SYSTEM SHALL** use `role="alert"` and `aria-live="assertive"` on the Critical Ghost Detected card.

### REQ-04-03  Live step timeline

**THE SYSTEM SHALL** render a live timeline panel labelled "Live steps".

**WHILE** an agent run is in progress **THE SYSTEM SHALL** append each incoming `StepEvent` to the timeline in real time via the SSE stream.

**THE SYSTEM SHALL** wrap the timeline list in `aria-live="polite" aria-atomic="false"`.

**THE SYSTEM SHALL** display for each event: step number, tool name, and — where present — the `focused_after.accessible_name`.

**WHEN** no run has been started **THE SYSTEM SHALL** display "No steps yet" in the timeline.

---

## REQ-05 — Fix Pipeline (`/fixes`)

### REQ-05-01  Stepper

**THE SYSTEM SHALL** render a horizontal stepper with four steps: Find (1), Fix (2), Verify (3), Regression (4).

**THE SYSTEM SHALL** show one step panel at a time. Inactive step panels are not in the DOM (not just hidden).

**THE SYSTEM SHALL** implement the stepper as a `role="tablist"` / `role="tab"` / `role="tabpanel"` ARIA pattern with roving `tabindex`.

**WHEN** a step is completed **THE SYSTEM SHALL** mark it with a green checkmark and "completed" sr-only text.

### REQ-05-02  Find step

**THE SYSTEM SHALL** display the barrier details from the most recent run: `blocked_element.selector`, `reason_code`, WCAG criteria, and the ghost in Blocked state.

### REQ-05-03  Fix step

**THE SYSTEM SHALL** display a code diff panel with the broken HTML in red and the proposed fixed HTML in green.

**THE SYSTEM SHALL** render an "Approve Fix" button and a "Reject" button.

**WHEN** the user activates "Approve Fix" **THE SYSTEM SHALL** record the approval, advance to step 3 (Verify), and trigger a fresh run with `variant=fixed`.

**WHEN** the user activates "Reject" **THE SYSTEM SHALL** keep the stepper on step 2 and display a "Fix rejected" notice.

**THE SYSTEM SHALL NOT** advance the stepper or change the application state without explicit human approval. Agents propose; humans approve.

### REQ-05-04  Verify step

**THE SYSTEM SHALL** automatically trigger a run with `variant=fixed` when the step becomes active after approval.

**WHILE** the verification run is in progress **THE SYSTEM SHALL** stream step events into a mini timeline.

**WHEN** the verification run completes with `verdict === 'PASSED'` **THE SYSTEM SHALL** show "Journey Verified" in green and advance to step 4.

**WHEN** the verification run completes with `verdict === 'BLOCKED'` **THE SYSTEM SHALL** show the reason code and a "Retry verification" control; the stepper does not advance.

### REQ-05-05  Regression step

**THE SYSTEM SHALL** display the regression guard scenario: filename `send_payment.spec.ts`, test output "FAILED: button not focusable", and the ghost in Blocked state.

**THE SYSTEM SHALL** display the message "The ghost is back. But this time, we caught it."

**THE SYSTEM SHALL** display "Journey Verified" in green alongside the regression failure to show both states are expected in a regression guard demonstration.

---

## REQ-06 — Kiro Integration (`/kiro`)

### REQ-06-01  File tree

**THE SYSTEM SHALL** render a decorative file tree of the actual `.kiro/` folder structure in this repository: `.kiro/`, `agents/`, `specs/`, `hooks/`, `powers/`, `steering/`. The tree is a visual illustration, not an interactive widget; it uses `<ul role="list">` with `<li>`, not `role="tree"`.

**THE SYSTEM SHALL** highlight the `hooks/` directory as the active item with `aria-current="true"`.

### REQ-06-02  Hook code panel

**THE SYSTEM SHALL** render an editor-style panel with an active file tab "accessibility-hook.ts" and a code listing of the on-save hook. Code is displayed with monospace font and syntax highlighting (muted lines, highlighted string). The panel is a decorative illustration, not an interactive editor.

### REQ-06-03  Live Kiro Hook card

**THE SYSTEM SHALL** render a "Kiro Hook (Live)" card showing three event rows:
1. "File saved: SendPayment.tsx" (success icon)
2. "Haunted Audit scan triggered" (trigger icon)
3. "Accessibility issue found: Missing accessible label" (error icon)

**THE SYSTEM SHALL** wrap the event list in `aria-live="polite"`.

**THE SYSTEM SHALL** convey each event type through icon + sr-only text label, never through colour alone.

**THE SYSTEM SHALL** render "Built with Kiro" as plain text at the bottom of this section.

---

## REQ-07 — Reports (`/reports`) and Results Strip

### REQ-07-01  Metric tiles

**THE SYSTEM SHALL** render four metric tiles: planted barriers detected, approved fixes verified (%), test scenarios, user sessions.

**THE SYSTEM SHALL** derive all metric values exclusively from real backend `JourneyResult` records.

**IF** a metric has not been measured **THEN THE SYSTEM SHALL** render `--` with visible label "not yet measured" and a corresponding `sr-only` announcement.

**THE SYSTEM SHALL** display `agent_mode` (`llm` or `scripted`) as a badge adjacent to every metric tile.

### REQ-07-02  The Outcome card

**THE SYSTEM SHALL** render "The Outcome" on a parchment-coloured card (`#f5e6c8` → `#e8d0a0`, ink `#3b2a0e`) listing three outcomes with green check icons:
- "Customer can complete the payment"
- "A regression test prevents it from breaking again"
- "Accessibility built into the dev workflow with Kiro"

**THE SYSTEM SHALL** render the ghost mascot in Verified (green) state beside the card **only when** the most recent run result is `PASSED`.

---

## REQ-08 — Scans (`/scans`)

**THE SYSTEM SHALL** render a scan-initiation view that accepts a public URL.

**THE SYSTEM SHALL** display a notice: "Keyboard-only scan. No clicks, no logins. Rate-limited."

**THE SYSTEM SHALL** rate-limit scan submissions to one per IP per 10 seconds on the server (Next.js API route or middleware). **WHEN** the limit is exceeded **THE SYSTEM SHALL** return HTTP 429 and display "Rate limit reached. Please wait before scanning again."

**THE SYSTEM SHALL** display a loading skeleton **WHILE** a scan is in progress.

**WHEN** the scan completes **THE SYSTEM SHALL** display the full `JourneyResult` with the ghost in the appropriate state.

---

## REQ-09 — Demo Tour (`/demo`)

### REQ-09-01  Story structure

**THE SYSTEM SHALL** render a guided story with five narrative beats in sequence, each triggered by advancing the demo:
1. Payment blocked — broken variant run
2. Agent finds it — agent investigation panel
3. Human approves fix — Approve Fix step (requires real human click)
4. Payment succeeds — fixed variant run
5. Bug reintroduced, regression catches it — regression guard panel

**THE SYSTEM SHALL** complete the full tour in under 3 minutes when agent runs are pre-loaded. A visible timer showing elapsed time is optional but the 3-minute target governs pacing decisions.

### REQ-09-02  Real backend

**THE SYSTEM SHALL** execute all runs against the real backend at `NEXT_PUBLIC_API_URL`.

**IF** the backend is unreachable at page load **THEN THE SYSTEM SHALL** display a persistent "Backend offline — live data unavailable" banner and disable the "Run agent" controls.

**THE SYSTEM SHALL NOT** render any fabricated metric, verdict, or agent output when the backend is offline.

**WHEN** the backend comes back online **THE SYSTEM SHALL** clear the offline banner and re-enable controls without requiring a page reload.

### REQ-09-03  Navigation

**THE SYSTEM SHALL** render a "Next" button to advance through demo beats. The "Approve Fix" beat requires an explicit Approve Fix action; the "Next" button is not sufficient.

**THE SYSTEM SHALL** render a "Restart" button that resets the demo to beat 1 without reloading the page.

---

## REQ-10 — Loading, Empty, and Error States

**THE SYSTEM SHALL** render a loading skeleton for every data panel **WHILE** a fetch is in flight. Skeletons match the shape of the panel they replace.

**WHEN** a `GET /runs/{id}` call returns a non-200 status **THE SYSTEM SHALL** display an error message containing the HTTP status code and a "Retry" control.

**WHEN** a `POST /runs` call fails **THE SYSTEM SHALL** display "Could not start run. Check that the backend is running." and a "Retry" control.

**WHEN** an SSE stream emits an `event: error` frame **THE SYSTEM SHALL** close the stream, display the error text from the frame data, and offer a "Retry" control.

**THE SYSTEM SHALL** display an empty state with explanatory copy **WHEN** any list (focus trail, step events, agent cards) has zero items and no run is in progress.

---

## REQ-11 — Accessibility (non-negotiable, all routes)

**THE SYSTEM SHALL** render body copy at a minimum computed size of 16px. Font sizes use `rem` units throughout so user zoom preferences are respected.

**THE SYSTEM SHALL** render the page without horizontal scrolling at 200% browser zoom on a 1280px viewport (WCAG 1.4.10 Reflow).

**THE SYSTEM SHALL** render the page without horizontal scrolling on a 375px viewport.

**THE SYSTEM SHALL** provide a visible skip-to-main-content link as the first focusable element on every page.

**THE SYSTEM SHALL** ensure all interactive elements have a visible focus ring: `outline: 3px solid #a855f7; outline-offset: 3px`.

**THE SYSTEM SHALL** maintain logical tab order: skip link → global nav → main content → footer.

**THE SYSTEM SHALL** use semantic HTML elements. ARIA roles and properties are added only where no semantic element covers the requirement.

**THE SYSTEM SHALL** meet WCAG 2.1 Level AA contrast ratios for all text and interactive element boundaries.

**THE SYSTEM SHALL** never convey status using colour as the sole channel. Every colour-coded state has an accompanying text label or icon with sr-only text.

**THE SYSTEM SHALL** suppress all animations (ghost float, glow pulse, pulse dot) when `prefers-reduced-motion: reduce` is active. Both CSS (`animation: none !important`) and JS (`usePrefersReducedMotion` hook) guards are required.

**THE SYSTEM SHALL** wrap all live-updating lists and status regions in the appropriate `aria-live` politeness level: `assertive` for blocking errors, `polite` for non-urgent updates.

**EVERY** route **SHALL** pass `axe-core` WCAG 2.1 AA scan with zero violations, verified by automated Playwright + axe tests in CI.

---

## REQ-12 — Navigation

**THE SYSTEM SHALL** render a fixed top navigation bar present on all routes with links: Home, Scans, Journeys, Fixes, Kiro, Reports.

**THE SYSTEM SHALL** mark the active nav link with `aria-current="page"`.

**THE SYSTEM SHALL** render a "Kiro" CTA badge in the top-right corner of the nav bar.

**THE SYSTEM SHALL** provide a mobile hamburger menu for viewports narrower than `md` (768px). The hamburger uses `aria-expanded` and `aria-controls`. The menu closes on Escape, with focus returned to the burger button.

---

## REQ-13 — API Client

**THE SYSTEM SHALL** route all backend calls through a single typed client module at `lib/api.ts`.

**THE SYSTEM SHALL** read the backend base URL exclusively from `NEXT_PUBLIC_API_URL`. No other location may contain the base URL.

**THE SYSTEM SHALL** export typed functions: `postRun(body)`, `getRun(id)`, `streamEvents(id, onEvent, onDone, onError)`.

**THE SYSTEM SHALL** type all request and response shapes against the interfaces in `lib/types.ts` (mirroring the Python Pydantic models).

**THE SYSTEM SHALL** throw a typed `ApiError` (with `status: number` and `message: string`) on any non-2xx response, never swallowing errors silently.
