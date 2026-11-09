# Haunted Audit — Frontend Tasks

**Spec version:** 1.0  
**Execution order:** tasks are numbered and must be completed in sequence within each phase. Tasks in the same phase that have no inter-dependency may be worked in parallel.

Each task states:
- **Satisfies:** which requirement(s) it implements
- **Done when:** the concrete, verifiable completion criterion

---

## Phase 1 — Foundation (tokens · layout shell · API client)

### TASK-01 · Initialise Next.js project

**Satisfies:** REQ-11 (16px base, 375px responsive), REQ-13 (NEXT_PUBLIC_API_URL)  
**Depends on:** nothing

Steps:
1. Run `npx create-next-app@14 haunted-audit-next --typescript --tailwind --app --no-src-dir --import-alias '@/*'`.
2. Add `fonts.googleapis.com` to `next.config.ts` `images.remotePatterns` and load `Uncial Antiqua`, `Inter`, `JetBrains Mono` via `next/font/google` in `app/layout.tsx`.
3. Install: `lucide-react`, `clsx`, `axe-core`, `jest-axe`, `@types/jest-axe`, `vitest`, `@vitest/jsdom`, `@testing-library/react`, `@testing-library/jest-dom`.
4. Create `vitest.config.ts` with `environment: 'jsdom'` and `setupFiles: ['src/test/setup.ts']`. Add `matchMedia` polyfill to setup file.
5. Create `.env.local` with `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`.
6. Delete all boilerplate from `app/page.tsx` and `app/globals.css`.

**Done when:** `npm run dev` serves a blank page at `localhost:3000` without console errors; `npm test` runs with zero failures; TypeScript compiles clean.

---

### TASK-02 · Design tokens and global CSS

**Satisfies:** REQ-11 (contrast, font sizes, reduced-motion), all visual requirements  
**Depends on:** TASK-01

Steps:
1. Overwrite `tailwind.config.ts` with the full token set from `design.md §2` (colors, fontFamily, boxShadow, keyframes, animation). Extend only; do not replace Tailwind defaults.
2. Overwrite `styles/globals.css` with:
   - `@tailwind base/components/utilities` directives
   - CSS custom property block (all tokens as `--color-*`, `--font-*`, `--shadow-*`)
   - `html { font-size: 16px; overflow-x: hidden; }` and `body { overflow-x: hidden; }`
   - Global `:focus-visible` rule: `outline: 3px solid var(--color-violet-neon); outline-offset: 3px`
   - `prefers-reduced-motion` block: `animation: none !important`, `transition-duration: 0.01ms !important`, `box-shadow: none !important` on glow classes
   - `.panel` and `.panel-glow` CSS classes
   - `.code-block` class at `font-size: 0.875rem`
3. Verify: open `localhost:3000` in Chrome, go to Computed Styles, confirm `html` is `16px`, `--color-base` resolves to `#0d0714`.

**Done when:** Tailwind intellisense shows all custom tokens; `npm run build` succeeds; `styles/globals.css` passes stylelint if configured.

---

### TASK-03 · Shared TypeScript types (`lib/types.ts`)

**Satisfies:** REQ-13 (typed client), all data-dependent requirements  
**Depends on:** TASK-01

Steps:
1. Create `lib/types.ts` and define all types exactly mirroring the Python Pydantic models in `agent/keyboard_agent/models.py`:
   - `BoundingBox`, `FocusSnapshot`, `StepEvent`, `BlockedElement`, `TokenUsage`, `JourneyResult`, `RunRecord`, `RunCreate`, `EvalSummaryRow`
   - Literal type aliases: `Verdict`, `ReasonCode`, `AgentMode`, `Variant`, `RunStatus`, `GhostState`, `ClaimOutcome`
2. Export `MetricValue = number | null`.
3. Do not add any field that does not exist in the Python models. Do not fabricate defaults.

**Done when:** `tsc --noEmit` passes; no `any` in `lib/types.ts`; a colleague can read the file and verify it matches `models.py` field-for-field.

---

### TASK-04 · API client (`lib/api.ts`)

**Satisfies:** REQ-13  
**Depends on:** TASK-03

Steps:
1. Create `lib/api.ts`.
2. Define `ApiError extends Error` with `status: number`.
3. Implement `postRun(body: RunCreate): Promise<{ run_id: string }>` — `POST /runs`, throws `ApiError` on non-2xx.
4. Implement `getRun(id: string): Promise<RunRecord>` — `GET /runs/{id}`, throws `ApiError`.
5. Implement `streamEvents(id, onEvent, onDone, onError): () => void` — opens `EventSource`, handles `message` (parses as `StepEvent`), `done` event, and `error` event. Returns a cleanup function.
6. Export nothing else. `NEXT_PUBLIC_API_URL` is read once at module level.

**Done when:** `src/test/api.test.ts` — using `vi.stubGlobal('fetch', ...)` — asserts: `postRun` returns `run_id` on 202; throws `ApiError(404, ...)` on 404; `streamEvents` calls `onEvent` for each `message`, `onDone` on `event: done`, `onError` on `event: error`.

---

### TASK-05 · `usePrefersReducedMotion` hook

**Satisfies:** REQ-11 (reduced motion), REQ-01-02  
**Depends on:** TASK-01

Steps:
1. Create `lib/hooks/usePrefersReducedMotion.ts`. Returns `boolean`. Reads `matchMedia('(prefers-reduced-motion: reduce)')`, subscribes to changes, returns `false` during SSR.
2. Write unit test: `matchMedia` mock returns `true` → hook returns `true`.

**Done when:** Hook unit test passes; hook is importable from `lib/hooks/usePrefersReducedMotion`.

---

### TASK-06 · `useSSE` hook

**Satisfies:** REQ-03-04, REQ-04-03  
**Depends on:** TASK-04

Steps:
1. Create `lib/hooks/useSSE.ts`. Wraps `streamEvents` from `lib/api.ts`. Props: `url: string | null, handlers: { onEvent, onDone, onError }`. Opens only when `url` is not null. Closes on unmount.
2. Write unit test using `EventSource` stub.

**Done when:** Unit test passes; hook exports correctly typed.

---

### TASK-07 · `useRun` hook

**Satisfies:** REQ-03-04, REQ-04-03, REQ-09-02  
**Depends on:** TASK-04, TASK-06

Steps:
1. Create `lib/hooks/useRun.ts`. Implement the state machine: `idle → submitting → running → complete | error`.
2. `startRun(body)`: calls `postRun`, transitions states, opens SSE via `useSSE`.
3. `reset()`: closes SSE, clears state to `idle`.
4. Returns `{ run, events, status, error, startRun, reset }`.
5. Write unit test: mock `postRun` → `{ run_id: 'x' }`, mock SSE emitting two events then done → assert `events.length === 2`, `status === 'complete'`.
6. Error path test: `postRun` throws `ApiError(503)` → `status === 'error'`, `error` contains message.

**Done when:** All `useRun` unit tests pass; hook compiles with zero TypeScript errors.

---

### TASK-08 · Layout shell (TopNav, SkipLink, Footer, RootLayout)

**Satisfies:** REQ-11 (skip link, tab order), REQ-12  
**Depends on:** TASK-02

Steps:
1. Create `components/layout/SkipLink.tsx`. Props: `targetId`. Renders `<a href={`#${targetId}`}>`. Visible on focus, `sr-only` otherwise.
2. Create `components/layout/TopNav.tsx`. Nav links: Home (`/`), Scans (`/scans`), Journeys (`/journeys/send-payment`), Fixes (`/fixes`), Kiro (`/kiro`), Reports (`/reports`). Active link uses `aria-current="page"` based on `usePathname()`. Wordmark uses `font-display` only on the wordmark text. Focus rings on all links.
3. Create `components/layout/MobileMenu.tsx`. `aria-expanded`, `aria-controls`, closes on Escape. Only visible below `md`.
4. Create `components/layout/Footer.tsx`. Contains "Built with Kiro" plain text.
5. Assemble in `app/layout.tsx`: `SkipLink` → `TopNav` → `<main id="main-content" tabIndex={-1}>` → `Footer`. `font-ui` class on `<body>`.
6. Axe test: `components/layout/TopNav.tsx` renders zero violations.

**Done when:** Keyboard-only navigation: Tab from page load reaches skip link first, then nav links in DOM order; burger opens menu on mobile; Escape closes it; axe test passes.

---

## Phase 2 — GhostSVG

### TASK-09 · `GhostSVG` and `GhostPositioned` components

**Satisfies:** REQ-01-02, REQ-03-03  
**Depends on:** TASK-02, TASK-05

Steps:
1. Create `components/ghost/GhostSVG.tsx`. Inline SVG ghost shape matching v7 design image. Props: `state: GhostState, size?: number, animate?: boolean, className?: string`.
   - `state` drives: fill colour, drop-shadow glow colour (via CSS custom props on the SVG element).
   - `animate` prop: adds `animate-float` class only when `!usePrefersReducedMotion()`.
   - `aria-hidden="true"`, `role="presentation"`, `data-ghost-state={state}`, `data-testid="ghost-mascot"`.
   - No `title` attribute (redundant on aria-hidden).
2. Create `components/ghost/GhostPositioned.tsx`. Props: `state, box: BoundingBox | null, containerRef: RefObject<HTMLElement>`. Uses `useLayoutEffect` to read `containerRef.current.getBoundingClientRect()` and compute `top`/`left` offsets per `design.md §6`. Clamps position so ghost never overflows container. Renders `null` when `box` is null.
3. Axe tests: GhostSVG all three states → zero violations.
4. Unit test: `GhostPositioned` with `box={null}` renders nothing; with a box renders at a non-zero offset.

**Done when:** All tests pass; ghost float animation is suppressed in a jsdom test where `matchMedia` mock returns `reduce`.

---

## Phase 3 — `/bank`

### TASK-10 · `BankPage` and `PaySlot` components

**Satisfies:** REQ-02  
**Depends on:** TASK-02, TASK-09

Steps:
1. Create `components/bank/PaySlot.tsx`. Props: `variant: Variant`. Renders the variant-appropriate element inside a `div#pay-slot`:
   - `broken`: `<div class="pay-btn" id="send-payment" onclick="...">Send Payment</div>` — no tabindex, no role.
   - `fixed`: `<button type="submit" class="btn-primary" id="send-payment">Send Payment</button>`.
   - `submitPayment()` handler validates recipient + amount; shows `#payment-confirmation` or `#form-error`.
2. Create `components/bank/BankPage.tsx`. Props: `variant: Variant`. Renders full Haunted Bank UI: sidebar nav, "Send Payment" form with Recipient input (`id="recipient"`), Amount input (`id="amount"`), `PaySlot`, `#form-error` (`role="alert"`), `#payment-confirmation` (`data-testid="payment-confirmation"`, `role="status"`, hidden until submit). Wraps form in `<form id="payment-form" novalidate>`.
3. Create `app/bank/page.tsx`. Server Component that reads `searchParams.variant`, validates it, passes to `<BankPage>`.
4. Add `SkipLink targetId="payment-form"` as first element.

**Done when:** Playwright test `bank.spec.ts`:
- `?variant=broken`: 20× Tab presses from body never move `document.activeElement` to `#send-payment`.
- `?variant=fixed`: Tab reaches `#send-payment`, Enter submits, `[data-testid="payment-confirmation"]` is visible.
- Axe scan of both variants: zero violations.

---

## Phase 4 — Possession Mode + SSE

### TASK-11 · UI primitives needed by Possession Mode

**Satisfies:** REQ-10, REQ-11  
**Depends on:** TASK-02

Steps:
1. `components/ui/Skeleton.tsx` — animated shimmer div, `prefers-reduced-motion` aware.
2. `components/ui/ErrorState.tsx` — props: `message: string, onRetry?: () => void`. Uses `role="alert"`.
3. `components/ui/EmptyState.tsx` — props: `message: string`.
4. `components/ui/StatusIcon.tsx` — props: `status: 'pass'|'fail'|'pending', label: string`. Always renders icon + `<span className="sr-only">{label}</span>`. Never colour alone.
5. `components/ui/LiveBadge.tsx` — pulsing dot + "Live Test" text. Pulse suppressed by reduced-motion.
6. Axe tests for all five components.

**Done when:** All five components render with zero axe violations; `StatusIcon` renders sr-only label in all three states.

---

### TASK-12 · `ChecklistItem` and `PossessionMode`

**Satisfies:** REQ-03-01, REQ-03-02, REQ-03-03  
**Depends on:** TASK-11, TASK-09

Steps:
1. Create `components/journeys/ChecklistItem.tsx`. Props: `label, status: 'pending'|'pass'|'fail'`. Uses `StatusIcon`. No colour-alone conveyance.
2. Create `components/journeys/PossessionMode.tsx`. Props: `result: JourneyResult|null, isRunning: boolean, liveSteps?: TabStep[]`. Renders: breadcrumb, Live badge, read-only BankPage, checklist `<ol aria-live="polite" aria-atomic="false">`, `GhostOverlay`, "Barrier Detected!" button (only when `result.verdict === 'BLOCKED'`).
3. Create `components/journeys/GhostOverlay.tsx`. Props: `blocked_element: BlockedElement|null, containerRef`. Wraps `GhostPositioned` + tooltip "Journey Blocked".
4. Create `app/journeys/send-payment/page.tsx`. Client Component. Uses `useRun`. Renders `PossessionMode`. Renders "Run agent" button that calls `startRun`.
5. Live checklist logic: derive step statuses from `events` array and final `result` (see `design.md §6`).
6. Keyboard listener for judges pressing Tab themselves (no agent run).

**Done when:** Playwright `possession-mode.spec.ts`:
- Load page, Tab manually: checklist items fill in live.
- Click "Run agent" (scripted, broken): SSE events stream, checklist fills, ghost appears beside `div.pay-btn` at coordinates from `blocked_element.bounding_box`.
- Ghost position never overlaps the button itself.
- Axe scan: zero violations.

---

## Phase 5 — Remaining route pages

### TASK-13 · `/agents` — Agent Investigation

**Satisfies:** REQ-04  
**Depends on:** TASK-07, TASK-11, TASK-09

Steps:
1. `components/agents/StepEventRow.tsx` — props: `event: StepEvent`. Renders step number, tool name, `focused_after.accessible_name` if present.
2. `components/agents/LiveTimeline.tsx` — props: `events: StepEvent[], isRunning: boolean`. `<ol aria-live="polite" aria-atomic="false">` of `StepEventRow`s. Empty state. Loading spinner when `isRunning && events.length === 0`.
3. `components/agents/AgentCard.tsx` — props: `name, subtitle?, icon, outcomes: AgentOutcome[], isRunning?`. Uses `StatusIcon`. Spinner in header when `isRunning`.
4. `components/agents/CriticalGhostCard.tsx` — props: `result: JourneyResult`. Visible only when `verdict === 'BLOCKED' && blocked_element !== null`. `role="alert"`, `aria-live="assertive"`. Contains: ghost Blocked state, barrier text, WCAG criteria, `blocked_element.text`, screenshot `<img>` if `screenshot_path` present (alt text: "Screenshot of blocked step").
5. `app/agents/page.tsx` — Client Component, `useRun`, renders three `AgentCard`s + `CriticalGhostCard` + `LiveTimeline` + "Run agent" control.

**Done when:** Playwright `agents.spec.ts`:
- Start scripted broken run; LiveTimeline appends events in real time.
- After run: `CriticalGhostCard` visible; `AgentCard` for Keyboard Agent shows `reason_code` in fail detail.
- Axe scan: zero violations.

---

### TASK-14 · `/fixes` — Fix Pipeline

**Satisfies:** REQ-05  
**Depends on:** TASK-07, TASK-11

Steps:
1. `components/ui/CodeDiff.tsx` — props: `before: string, after: string`. Renders removed line(s) in red, added line(s) in green. Icon + sr-only "removed"/"added" per line. `role="figure"`, `<figcaption>` sr-only.
2. `components/fixes/StepTab.tsx` — `role="tab"`, `tabIndex` roving, `aria-controls`, `aria-selected`. `<button>` element. Completed state: green ring + sr-only "completed".
3. `components/fixes/PipelineStepper.tsx` — `role="tablist"`. Manages which step panel is in DOM.
4. `components/fixes/FindPanel.tsx` — displays `blocked_element.selector`, `reason_code`, WCAG text, ghost Blocked.
5. `components/fixes/FixPanel.tsx` — `CodeDiff` + "Approve Fix" / "Reject" buttons. No state change without human approval.
6. `components/fixes/VerifyPanel.tsx` — triggers `startRun({variant:'fixed',...})` on mount (after approval). Shows `LiveTimeline` mini. On PASSED: "Journey Verified". On BLOCKED: `ErrorState` + Retry.
7. `components/fixes/RegressionPanel.tsx` — static content: filename, "FAILED: button not focusable", ghost Blocked, quote.
8. `app/fixes/page.tsx` — manages active step state. Approval callback advances stepper.

**Done when:** Playwright `fixes.spec.ts`:
- Load with a completed blocked run; stepper shows Find step.
- Navigate to Fix; click Approve Fix; stepper advances to Verify.
- Click Reject; stepper stays on Fix.
- Verify step triggers a real fixed run; on complete shows "Journey Verified".
- Regression step shows "FAILED" text and quote.
- Axe scan: zero violations.

---

### TASK-15 · `/kiro` — Kiro Integration

**Satisfies:** REQ-06  
**Depends on:** TASK-11

Steps:
1. `components/kiro/FileTree.tsx` — static `<ul role="list">` of `.kiro/` items. `aria-current="true"` on `hooks/`. Not a tree widget.
2. `components/kiro/HookCodePanel.tsx` — decorative editor illustration. Active file tab as a plain div (not `role="tablist"`). Code listing with line numbers (`aria-hidden`), muted/highlighted lines.
3. `components/kiro/HookEventList.tsx` — three static event rows. `aria-live="polite"`. `StatusIcon` for each event type. sr-only event type prefix. "Built with Kiro" plain text footer.
4. `app/kiro/page.tsx` — two-column layout.

**Done when:** Axe scan: zero violations. Visually matches v7 design §Kiro Integration.

---

### TASK-16 · `/reports` — Reports and Metric Strip

**Satisfies:** REQ-07  
**Depends on:** TASK-07, TASK-09

Steps:
1. `components/ui/MetricTile.tsx` — props: `value: MetricValue, format?, label, agentMode`. Renders `--` + "not yet measured" when `value === null`. `agentMode` badge always shown. sr-only "not yet measured" when null.
2. `components/ui/AgentModeBadge.tsx` — props: `mode: AgentMode`. Visual badge.
3. `components/reports/MetricStrip.tsx` — four `MetricTile`s. Derives values from `JourneyResult[]` passed as prop (never fabricated).
4. `components/reports/OutcomeCard.tsx` — parchment card. Ghost Verified beside card only when latest result is PASSED.
5. `app/reports/page.tsx` — shows `MetricStrip` + `OutcomeCard`. "No results yet" empty state.

**Done when:** Render with `result=null`: all tiles show `--`; render with a PASSED result: tiles show real values; axe scan: zero violations.

---

### TASK-17 · `/scans` — Scan view

**Satisfies:** REQ-08  
**Depends on:** TASK-07, TASK-11

Steps:
1. `app/scans/page.tsx` — URL input `<form>`. "Keyboard-only scan. No clicks, no logins. Rate-limited." notice. On submit: calls `startRun`. Loading skeleton while running. Result panel after complete.
2. `app/api/scans/route.ts` — Next.js API route that enforces rate limiting (1 req / 10s per IP using a simple in-memory `Map` with timestamps). Returns 429 with JSON `{ error: "Rate limit reached." }` when exceeded.
3. Frontend handles 429 `ApiError` specially: renders "Rate limit reached. Please wait before scanning again."

**Done when:** Submit twice rapidly: second submission shows rate-limit message. Axe scan: zero violations.

---

## Phase 6 — Landing Polish

### TASK-18 · Landing page (`/`)

**Satisfies:** REQ-01  
**Depends on:** TASK-09, TASK-16, TASK-08

Steps:
1. `app/page.tsx` — full landing layout.
2. Hero: `GhostSVG` state=ready, wordmark (`font-display`), tagline, sub-line, "Possess This App" `<button>` (navigates to `/demo`), four static pipeline chips as `<ul>/<li>` (no hover affordance, not interactive), graveyard SVG in background layer (`aria-hidden`).
3. Ghost state reactive: if a stored latest `JourneyResult` is available from `sessionStorage`, initialise ghost state from it. Otherwise `ready`.
4. Results strip: `MetricStrip` + `OutcomeCard`. All values null on first load → all `--`.
5. "Built with Kiro" in `Footer`.
6. Responsive: hero at 375px (single column), graveyard SVG scaled down, no overflow.

**Done when:** Playwright `landing.spec.ts`:
- "Possess This App" → navigates to `/demo`.
- All metric tiles render `--` on first load.
- At 375px viewport: no horizontal scroll.
- At 200% zoom: no horizontal scroll.
- Axe scan: zero violations.

---

## Phase 7 — axe + Playwright tests

### TASK-19 · Unit and axe tests for all components

**Satisfies:** REQ-11 (axe zero violations), all REQs  
**Depends on:** TASK-10 through TASK-18

Steps:
1. For every component file in `components/`, ensure a corresponding `*.test.tsx` file exists in the same directory (or `src/test/`).
2. Each test file must include: `render(<Component {...minimalProps} />)` + `expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()`.
3. `AXE_OPTIONS` targets `wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice`.
4. Consolidate shared prop factories in `src/test/fixtures.ts`.
5. Run `npm test` — all tests must pass.

**Done when:** `npm test` exits 0; test output shows zero axe violations across all components; coverage report shows ≥ 80% statement coverage on `lib/` and `components/`.

---

### TASK-20 · Playwright end-to-end tests

**Satisfies:** REQ-11 (every route passes axe), REQ-02, REQ-03, REQ-04, REQ-05, REQ-09  
**Depends on:** TASK-19

Steps:
1. Install `@playwright/test`, `@axe-core/playwright`. Add `playwright.config.ts` targeting `localhost:3000`.
2. `e2e/a11y.spec.ts`: visit each route; run `checkA11y` from `@axe-core/playwright`; assert zero violations. Routes: `/`, `/bank?variant=broken`, `/bank?variant=fixed`, `/journeys/send-payment`, `/agents`, `/fixes`, `/kiro`, `/reports`, `/scans`, `/demo`.
3. `e2e/bank.spec.ts`: Tab 20× on broken variant; assert focus never lands on `#send-payment`. Tab to submit on fixed; assert confirmation visible.
4. `e2e/possession-mode.spec.ts`: Tab manually; assert checklist updates. Click "Run agent"; assert ghost position is non-zero and beside (not on) the button.
5. `e2e/agents.spec.ts`: start run; assert LiveTimeline rows appear; assert `CriticalGhostCard` appears when run is BLOCKED.
6. `e2e/fixes.spec.ts`: click Approve Fix; assert stepper advances. Click Reject; assert it does not.
7. `e2e/demo.spec.ts`: complete all 5 beats; assert no fabricated data; assert offline banner when API is mocked down with `msw`.
8. `e2e/landing.spec.ts`: metric tiles `--` on load; CTA navigates to `/demo`; no scroll at 375px; no scroll at 200% zoom.

**Done when:** `npx playwright test` exits 0 against `npm run dev`; all axe scans pass; bank Tab tests pass.

---

## Phase 8 — `/demo`

### TASK-21 · `/demo` — Guided tour

**Satisfies:** REQ-09  
**Depends on:** TASK-12, TASK-13, TASK-14, TASK-07, TASK-20

Steps:
1. `app/demo/page.tsx` — Client Component.
2. Five-beat state machine: `beat: 1|2|3|4|5`. Each beat renders the appropriate panel (PossessionMode, AgentInvestigation, FixPanel, VerifyPanel, RegressionPanel).
3. "Next" button advances beat (except beat 3 requires `onApprove` from `FixPanel`).
4. "Restart" resets to beat 1 without reload.
5. Each run call uses `useRun`. Beats 1 and 4 trigger different variant runs (`broken` and `fixed`).
6. Offline detection: `navigator.onLine` + catch on first `postRun`. If offline: persistent banner "Backend offline — live data unavailable"; run controls disabled.
7. Online recovery: `window.addEventListener('online', ...)` clears banner and re-enables controls.
8. Beat timer: start a `Date.now()` counter when demo begins; display elapsed time if > 2m30s as a gentle "almost at 3 minutes" notice.
9. No fabricated data: if `result.error !== null` or backend is offline, show `ErrorState`. Never render metrics from hardcoded values.

**Done when:** Playwright `demo.spec.ts`:
- Full tour runs end-to-end; beat 3 only advances via Approve Fix click.
- Mock API offline → banner visible; no fabricated metrics.
- Restart → resets to beat 1.
- Axe scan at every beat: zero violations.

---

## Summary Table

| Task | Phase | Requirement(s) | Blocking |
|---|---|---|---|
| TASK-01 | 1 | REQ-11, REQ-13 | All |
| TASK-02 | 1 | REQ-11, visual | TASK-01 |
| TASK-03 | 1 | REQ-13 | TASK-01 |
| TASK-04 | 1 | REQ-13 | TASK-03 |
| TASK-05 | 1 | REQ-11, REQ-01-02 | TASK-01 |
| TASK-06 | 1 | REQ-03-04, REQ-04-03 | TASK-04 |
| TASK-07 | 1 | REQ-03-04, REQ-04-03, REQ-09 | TASK-04, TASK-06 |
| TASK-08 | 1 | REQ-11, REQ-12 | TASK-02 |
| TASK-09 | 2 | REQ-01-02, REQ-03-03 | TASK-02, TASK-05 |
| TASK-10 | 3 | REQ-02 | TASK-02, TASK-09 |
| TASK-11 | 4 | REQ-10, REQ-11 | TASK-02 |
| TASK-12 | 4 | REQ-03 | TASK-11, TASK-09 |
| TASK-13 | 5 | REQ-04 | TASK-07, TASK-11, TASK-09 |
| TASK-14 | 5 | REQ-05 | TASK-07, TASK-11 |
| TASK-15 | 5 | REQ-06 | TASK-11 |
| TASK-16 | 5 | REQ-07 | TASK-07, TASK-09 |
| TASK-17 | 5 | REQ-08 | TASK-07, TASK-11 |
| TASK-18 | 6 | REQ-01 | TASK-09, TASK-16, TASK-08 |
| TASK-19 | 7 | REQ-11, all | TASK-10–18 |
| TASK-20 | 7 | REQ-11, REQ-02–05, REQ-09 | TASK-19 |
| TASK-21 | 8 | REQ-09 | TASK-12–14, TASK-07, TASK-20 |
