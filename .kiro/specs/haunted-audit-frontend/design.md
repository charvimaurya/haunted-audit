# Haunted Audit — Frontend Design

**Spec version:** 1.0  
**Stack:** Next.js 14 (App Router) · TypeScript 5 · Tailwind CSS 3 · Vercel  
**Backend:** FastAPI at `NEXT_PUBLIC_API_URL`  
**Design reference:** `design/Haunted_Audit_Final_UI_v7.png` (frozen)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js App Router (app/)                                       │
│                                                                  │
│  app/                                                            │
│  ├── layout.tsx              ← RootLayout: fonts, nav, skip link │
│  ├── page.tsx                ← / (Landing)                       │
│  ├── bank/page.tsx           ← /bank                             │
│  ├── journeys/               │                                   │
│  │   └── send-payment/       │                                   │
│  │       └── page.tsx        ← /journeys/send-payment            │
│  ├── agents/page.tsx         ← /agents                           │
│  ├── fixes/page.tsx          ← /fixes                            │
│  ├── kiro/page.tsx           ← /kiro                             │
│  ├── reports/page.tsx        ← /reports                          │
│  ├── scans/page.tsx          ← /scans                            │
│  └── demo/page.tsx           ← /demo                             │
│                                                                  │
│  lib/                                                            │
│  ├── api.ts                  ← typed API client (single file)    │
│  ├── types.ts                ← shared TS types (mirrors Pydantic)│
│  └── hooks/                                                      │
│      ├── useRun.ts           ← POST /runs + poll result          │
│      ├── useSSE.ts           ← GET /runs/{id}/events SSE         │
│      └── usePrefersReducedMotion.ts                              │
│                                                                  │
│  components/                                                     │
│  ├── layout/                 ← TopNav, SkipLink, Footer          │
│  ├── ghost/                  ← GhostSVG, GhostMascot             │
│  ├── ui/                     ← Panel, Badge, MetricTile, etc.    │
│  ├── bank/                   ← BankPage, PaySlot                 │
│  ├── journeys/               ← PossessionMode, ChecklistItem     │
│  ├── agents/                 ← AgentCard, LiveTimeline           │
│  ├── fixes/                  ← PipelineStepper, CodeDiff         │
│  ├── kiro/                   ← FileTree, HookCode, HookEvents    │
│  └── reports/                ← MetricTile, OutcomeCard           │
│                                                                  │
│  styles/                                                         │
│  └── globals.css             ← Tailwind directives, CSS vars,    │
│                                 reduced-motion block             │
└─────────────────────────────────────────────────────────────────┘
                          │ NEXT_PUBLIC_API_URL
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  FastAPI Backend                                                  │
│  POST /runs · GET /runs/{id} · GET /runs/{id}/events (SSE)       │
└─────────────────────────────────────────────────────────────────┘
```

The frontend is a **pure client of the backend API**. No Next.js API routes proxy backend calls — `lib/api.ts` calls `NEXT_PUBLIC_API_URL` directly from the browser. This avoids an extra hop, keeps SSE streaming simple, and matches Vercel's static-edge deployment model.

Server Components are used **only** for static layout (RootLayout, page shells). Every panel that fetches live data is a Client Component (`'use client'`).

---

## 2. Design Tokens

All tokens are defined once in `tailwind.config.ts` and mirrored as CSS custom properties in `styles/globals.css`. No hex values appear in component files.

### Color palette

| Token | Hex | Usage |
|---|---|---|
| `base.DEFAULT` | `#0d0714` | Page background |
| `base.panel` | `#1a0f2e` | Card/panel fill |
| `base.surface` | `#231540` | Elevated surface |
| `base.line` | `#3b2060` | Dividers, borders |
| `violet.600` | `#7c3aed` | Glowing panel border |
| `violet.neon` | `#a855f7` | Focus rings, hover glows |
| `ghost.ready` | `#c9b6ff` | Ghost in Ready state |
| `ghost.blocked` | `#ef4444` | Ghost in Blocked state |
| `ghost.verified` | `#22c55e` | Ghost in Verified state |
| `parchment.DEFAULT` | `#f5e6c8` | Outcome card background |
| `parchment.dark` | `#e8d0a0` | Outcome card gradient end |
| `parchment.ink` | `#3b2a0e` | Outcome card text |
| `ink.DEFAULT` | `#f0e8ff` | Primary text |
| `ink.muted` | `#9d89b8` | Secondary text, labels |
| `ink.faint` | `#6b5a8a` | Placeholder, disabled |

### Typography

| Role | Family | Usage |
|---|---|---|
| `font-display` | `Uncial Antiqua`, Papyrus, fantasy | Wordmark **only** |
| `font-ui` | Inter, system-ui | All UI text |
| `font-mono` | JetBrains Mono, Fira Code | Code, step numbers |

### Shadows

| Token | Value |
|---|---|
| `shadow-glow` | `0 0 12px 2px rgba(168,85,247,0.45)` |
| `shadow-glow-red` | `0 0 10px 2px rgba(239,68,68,0.40)` |
| `shadow-glow-green` | `0 0 10px 2px rgba(34,197,94,0.35)` |

### Animations

All animations are CSS `@keyframes` defined in `tailwind.config.ts` → emitted as Tailwind utilities. The `prefers-reduced-motion` block in `globals.css` sets `animation: none !important` on `*` — this stops every Tailwind animation class. The `usePrefersReducedMotion` hook provides a JS-level guard for conditional class application.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
  .panel-glow, .shadow-glow, .glow, .glow-red, .glow-green {
    box-shadow: none !important;
  }
}
```

---

## 3. Typed API Client (`lib/api.ts`)

```typescript
// Conceptual shape — not implementation
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function postRun(body: RunCreate): Promise<{ run_id: string }>;
export async function getRun(id: string): Promise<RunRecord>;
export function streamEvents(
  id: string,
  onEvent: (e: StepEvent) => void,
  onDone: (status: 'complete' | 'error') => void,
  onError: (msg: string) => void,
): () => void; // returns cleanup fn
```

- `postRun` sends `POST /runs` with `Content-Type: application/json`.
- `getRun` sends `GET /runs/{id}` and deserialises into `RunRecord`.
- `streamEvents` opens an `EventSource`, forwards `message` events as parsed `StepEvent`, handles the custom `done` event and `error` event, and returns a cleanup function that calls `sse.close()`.
- All functions throw `ApiError` on non-2xx responses. Callers handle errors; `lib/api.ts` never swallows them.

---

## 4. Custom Hooks

### `useRun()`

```typescript
// State machine: idle -> submitting -> running -> complete | error
function useRun(): {
  run: RunRecord | null;
  events: StepEvent[];
  status: 'idle' | 'submitting' | 'running' | 'complete' | 'error';
  error: string | null;
  startRun: (body: RunCreate) => void;
  reset: () => void;
};
```

Lifecycle:
1. `startRun` → calls `postRun` → transitions to `submitting`
2. On success → saves `run_id`, transitions to `running`, opens `streamEvents`
3. Each SSE event → appends to `events`
4. SSE `done` event → calls `getRun(run_id)` → sets `run`, transitions to `complete`
5. Any error → sets `error`, transitions to `error`
6. `reset` → closes SSE if open, clears all state back to `idle`

### `useSSE(url, handlers)`

Low-level hook. Opens `EventSource(url)`. Calls `handlers.onMessage`, `handlers.onDone`, `handlers.onError`. Closes on unmount.

### `usePrefersReducedMotion()`

```typescript
function usePrefersReducedMotion(): boolean;
```

Reads `window.matchMedia('(prefers-reduced-motion: reduce)')` on mount, subscribes to changes, returns current value. Returns `false` during SSR.

---

## 5. Component Inventory

One file per component. Props typed with explicit interfaces. No implicit `any`.

### Layout

| Component | File | Props |
|---|---|---|
| `RootLayout` | `app/layout.tsx` | children |
| `TopNav` | `components/layout/TopNav.tsx` | `activeSection?: string` |
| `MobileMenu` | `components/layout/MobileMenu.tsx` | `open, onClose, links` |
| `SkipLink` | `components/layout/SkipLink.tsx` | `targetId: string` |
| `Footer` | `components/layout/Footer.tsx` | — |

### Ghost

| Component | File | Props |
|---|---|---|
| `GhostSVG` | `components/ghost/GhostSVG.tsx` | `state: GhostState, size?: number, animate?: boolean, className?: string` |
| `GhostPositioned` | `components/ghost/GhostPositioned.tsx` | `state: GhostState, box: BoundingBox \| null, containerRef: RefObject<HTMLElement>` |

`GhostSVG` is an inline SVG (not an emoji) so the ghost shape matches the v7 design illustration exactly. The SVG has `aria-hidden="true"`. State drives `fill` and `filter: drop-shadow` via CSS custom properties. The float animation uses a CSS `@keyframes` translate, suppressed by the global reduced-motion rule.

`GhostPositioned` wraps `GhostSVG` and uses the `bounding_box` to compute absolute coordinates relative to a container element. Position is always derived from real backend data; never hardcoded.

### UI primitives

| Component | Props summary |
|---|---|
| `Panel` | `children, glowing?: boolean, className?` |
| `Badge` | `children, variant: 'violet'\|'red'\|'green'\|'muted'` |
| `MetricTile` | `value: number\|null, format?, label, agentMode` |
| `AgentModeBadge` | `mode: AgentMode` |
| `StatusIcon` | `status: 'pass'\|'fail'\|'pending', label: string` — always renders icon + sr-only text |
| `CodeBlock` | `lines: CodeLine[], language?, ariaLabel?` |
| `Skeleton` | `className?` — animated shimmer placeholder |
| `ErrorState` | `message, onRetry?` |
| `EmptyState` | `message` |
| `LiveBadge` | `running: boolean` |

### Bank

| Component | Props |
|---|---|
| `BankPage` | `variant: Variant` |
| `PaySlot` | `variant: Variant, onSubmit: (r,a) => void` |

`BankPage` is a self-contained React component that renders the Haunted Bank UI. It is used both in `/bank` (standalone) and embedded in `/journeys/send-payment` (read-only display). The `variant` prop controls which element is injected into `#pay-slot`.

### Journeys

| Component | Props |
|---|---|
| `PossessionMode` | `result: JourneyResult\|null, isRunning: boolean, liveSteps?: TabStep[]` |
| `ChecklistItem` | `label, status: 'pending'\|'pass'\|'fail'` |
| `JourneyBreadcrumb` | `steps: string[]` |
| `GhostOverlay` | `blocked_element: BlockedElement\|null, containerRef` |

### Agents

| Component | Props |
|---|---|
| `AgentCard` | `name, subtitle?, icon, outcomes: AgentOutcome[], isRunning?` |
| `CriticalGhostCard` | `result: JourneyResult` |
| `LiveTimeline` | `events: StepEvent[], isRunning: boolean` |
| `StepEventRow` | `event: StepEvent` |

### Fixes

| Component | Props |
|---|---|
| `PipelineStepper` | `activeStep: 1\|2\|3\|4, completedSteps: number[]` |
| `StepTab` | `step, label, active, completed` |
| `FindPanel` | `result: JourneyResult\|null` |
| `FixPanel` | `onApprove: () => void, onReject: () => void` |
| `VerifyPanel` | `runHook: UseRunReturn, onVerified: () => void` |
| `RegressionPanel` | — |
| `CodeDiff` | `before: string, after: string` |

### Kiro

| Component | Props |
|---|---|
| `FileTree` | `items: FileTreeItem[]` |
| `HookCodePanel` | `lines: CodeLine[]` |
| `HookEventList` | `events: HookEvent[]` |

### Reports

| Component | Props |
|---|---|
| `MetricStrip` | `results: JourneyResult[], agentMode: AgentMode` |
| `OutcomeCard` | `result: JourneyResult\|null` |

---

## 6. Data Flow

### Run lifecycle (sequence)

```
User clicks "Run agent" / "Possess This App" / auto-trigger
  │
  ▼
useRun.startRun({ variant, mode })
  │
  ├── POST /runs  ──────────────────► { run_id }
  │                                     │
  │   status: submitting → running       │
  │                                     │
  ├── EventSource /runs/{id}/events ◄──┘
  │     │
  │     ├── message: StepEvent → append to events[]
  │     │   → LiveTimeline re-renders
  │     │   → ChecklistItem updates (focus events)
  │     │   → GhostPositioned updates
  │     │
  │     └── event: done
  │           │
  │           └── GET /runs/{id} → RunRecord
  │                 │
  │                 └── status: complete
  │                     → GhostSVG state change
  │                     → MetricTile values render
  │                     → CriticalGhostCard appears if BLOCKED
  │
  └── [error] → status: error, display ErrorState
```

### Ghost state derivation

```typescript
function ghostStateFromResult(
  result: JourneyResult | null,
  isRunning: boolean,
): GhostState {
  if (isRunning || result === null) return 'ready';
  if (result.verdict === 'PASSED') return 'verified';
  return 'blocked'; // covers all BLOCKED reason codes
}
```

### Ghost positioning

Ghost position is always derived from `blocked_element.bounding_box`:

```typescript
function ghostOffsetFromBox(
  box: BoundingBox,
  containerRect: DOMRect,
): { top: number; left: number } {
  // Offset right of the element so ghost sits BESIDE it, never overlapping
  return {
    top:  box.y - containerRect.top + box.height / 2 - GHOST_SIZE / 2,
    left: box.x - containerRect.left + box.width + GHOST_MARGIN,
  };
}
```

`GHOST_MARGIN` = 12px. If the computed `left` would overflow the container, clamp to `containerRect.width - GHOST_SIZE - 4`.

`blocked_element.bounding_box` comes from the backend checker and is never fabricated. If it is `null`, no positioned ghost is rendered.

### Possession Mode checklist live-fill

The checklist fills from real `StepEvent`s:

```typescript
useEffect(() => {
  const recipientStep = events.find(
    e => e.tool === 'press_tab' && e.focused_after?.selector_hint?.includes('recipient')
  );
  const amountStep = events.find(
    e => e.tool === 'press_tab' && e.focused_after?.selector_hint?.includes('amount')
  );
  const submitStep = events.find(
    e => e.tool === 'press_enter' || e.tool === 'declare_done'
  );
  // derive pass/fail from final result verdict and blocked_element
}, [events, result]);
```

If the judge is pressing Tab themselves (no agent run), the checklist fills from a `keydown` listener on the embedded `<iframe>` or document:

```typescript
useEffect(() => {
  function onTab(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    const active = document.activeElement;
    // map active element to checklist item
  }
  window.addEventListener('keydown', onTab);
  return () => window.removeEventListener('keydown', onTab);
}, []);
```

---

## 7. Page-Level Designs

### `/` Landing

Layout: full-width hero with radial gradient background (`radial-gradient(ellipse at 50% 0%, #3a1a6e, transparent), #0d0714`). Graveyard SVG in background layer. Ghost SVG centred above wordmark. Wordmark in `font-display`. Below hero: results strip (4 metric tiles + parchment Outcome card). Footer: "Built with Kiro".

The hero section occupies `min-height: 80vh`. Responsive: single column from 375px; decorative SVG elements shrink with `clamp()` sizing.

### `/bank`

Two-column layout: 176px sidebar + main panel. Sidebar: Haunted Bank label, nav links. Main: "Send Payment" form. `PaySlot` renders the variant-appropriate element. Standalone page with its own `document.title`.

### `/journeys/send-payment`

Three-column at `lg`, single column at mobile. Left: read-only BankPage. Right: PossessionMode checklist. Header: breadcrumb + Live badge + Run agent control. GhostOverlay absolutely positioned relative to the BankPage container.

### `/agents`

Two rows. Row 1: three `AgentCard`s side by side (collapse to single column at `md`). Row 2: `CriticalGhostCard` (full width) + `LiveTimeline` (aside, 280px).

### `/fixes`

`PipelineStepper` across the top. Below: single `<section>` per active step, swapped by step state (not hidden — removed from DOM). Fix step: `CodeDiff` + Approve/Reject buttons. Verify step: mini `LiveTimeline`.

### `/kiro`

Two-column: left IDE illustration (FileTree + HookCodePanel), right HookEventList. Header: section title. Footer: "Built with Kiro".

### `/reports`

`MetricStrip` (4 tiles). Below: `OutcomeCard` + ghost Verified.

### `/scans`

URL input form + submit button. Rate-limit notice. Results panel (Skeleton → JourneyResult display).

### `/demo`

Full-screen guided tour. Progress dots (5 beats). Back/Next controls. Beat 4 (Approve Fix) requires `FixPanel` Approve action. Offline banner when `NEXT_PUBLIC_API_URL` is unreachable.

---

## 8. Error Handling Strategy

| Scenario | Detection | UI Response |
|---|---|---|
| `POST /runs` fails | `ApiError` thrown | `ErrorState` with status code + Retry |
| `GET /runs/{id}` fails | `ApiError` thrown | `ErrorState` with status code + Retry |
| SSE `event: error` frame | EventSource handler | Close stream, `ErrorState`, Retry |
| SSE connection lost | `EventSource.onerror` | Auto-reconnect once; if second fail, `ErrorState` |
| Backend unreachable (DNS/network) | `fetch` throws `TypeError` | "Backend offline" banner, disable run controls |
| Backend returns `error: true` in `RunRecord` | `result.error !== null` | Render `ErrorState` with `result.error` text |
| Rate limit (429) | `ApiError.status === 429` | "Rate limit reached. Please wait." (no Retry timer needed) |

No error silently discarded. Every catch block either renders an `ErrorState` or re-throws to a React Error Boundary at the page level.

Each page-level route wraps its primary data panel in a React Error Boundary (`components/ui/ErrorBoundary.tsx`) that renders a full-panel `ErrorState` on uncaught render errors.

---

## 9. State Management

No global state library. State is co-located:

- `useRun()` encapsulates all run lifecycle state. It is instantiated at the page level and props-drilled one level to panels. Pages that need the run state (journeys, agents, fixes, demo) each create their own `useRun()` instance.
- Ghost state is derived inside each component from `result` and `isRunning` — not stored separately.
- Metric values are derived from the `JourneyResult` array held in the reports page component.
- No `localStorage` or `sessionStorage` is used. Demo state resets on page reload.

---

## 10. Routing and Navigation

All routes are Next.js App Router file-based routes. No dynamic segments needed except `app/bank/page.tsx` which reads `searchParams.variant` (a Server Component that passes the parsed value to the `BankPage` Client Component).

| Route | Page file | Key query params |
|---|---|---|
| `/` | `app/page.tsx` | — |
| `/bank` | `app/bank/page.tsx` | `variant` |
| `/journeys/send-payment` | `app/journeys/send-payment/page.tsx` | — |
| `/agents` | `app/agents/page.tsx` | — |
| `/fixes` | `app/fixes/page.tsx` | — |
| `/kiro` | `app/kiro/page.tsx` | — |
| `/reports` | `app/reports/page.tsx` | — |
| `/scans` | `app/scans/page.tsx` | — |
| `/demo` | `app/demo/page.tsx` | — |

---

## 11. Testing Strategy

### Unit tests (Vitest + Testing Library + jest-axe)

- Every component that accepts props has a test file at `components/**/*.test.tsx`.
- Tests cover: renders without error, renders correct text, ARIA attributes, axe zero-violation scan.
- `usePrefersReducedMotion` and `useRun` have dedicated hook tests with a `window.matchMedia` mock and a `fetch` mock respectively.

### axe-core automated accessibility tests

- `src/test/a11y.test.tsx` renders every component with representative props and asserts `toHaveNoViolations()` against WCAG 2.1 AA rules.
- The `matchMedia` polyfill in `setupTests.ts` ensures jsdom compatibility.
- These tests run in CI on every pull request. A failing axe test blocks merge.

### Playwright end-to-end tests

Located at `e2e/`. Each test file maps to one route.

| Test file | Coverage |
|---|---|
| `e2e/landing.spec.ts` | Hero renders, CTA navigates to /demo, ghost state changes |
| `e2e/bank.spec.ts` | `?variant=broken`: Tab never reaches div.pay-btn. `?variant=fixed`: Enter on button shows confirmation |
| `e2e/possession-mode.spec.ts` | Tab sequence fills checklist; ghost appears beside button; Retry works |
| `e2e/agents.spec.ts` | Live timeline populates from SSE; Critical Ghost card appears on BLOCKED |
| `e2e/fixes.spec.ts` | Stepper advances only after Approve Fix; Verify triggers real run |
| `e2e/demo.spec.ts` | Full tour completes; offline banner shows when API is mocked down |
| `e2e/a11y.spec.ts` | `@axe-core/playwright` scan of every route; asserts zero violations |

Playwright tests run against a local `next dev` server with the real FastAPI backend (or a mock server for offline scenarios). The offline mock is an `msw` (Mock Service Worker) handler that returns `net::ERR_CONNECTION_REFUSED`.

### Contrast and zoom

Manual verification checklist:
- [ ] 200% browser zoom on 1280px viewport: no horizontal scroll on any route
- [ ] 375px viewport: no horizontal scroll on any route
- [ ] All text passes WCAG AA contrast in Chrome DevTools accessibility panel
- [ ] Tab through every page with keyboard only; every interactive element is reachable and has a visible focus ring
- [ ] VoiceOver (macOS) + Safari: live regions announce checklist updates and timeline events

---

## 12. Deployment

Vercel. Single `next.config.ts`:

```typescript
const nextConfig = {
  // No API routes needed; all calls go client-side to NEXT_PUBLIC_API_URL
};
```

Environment variables:

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Client + Server | FastAPI base URL, e.g. `https://api.haunted-audit.example.com` |

The `/bank` page is a standalone HTML document. It must be served from the Next.js app (not a separate static file) so the `<GhostSVG>` component and Tailwind tokens are available. The Playwright test for `?variant=broken` verifies that `div.pay-btn` is not in the tab order by asserting that pressing Tab 20 times from `document.body` never moves focus to `#send-payment`.

---

## 13. File Structure (complete)

```
app/
  layout.tsx
  page.tsx
  bank/
    page.tsx
  journeys/
    send-payment/
      page.tsx
  agents/
    page.tsx
  fixes/
    page.tsx
  kiro/
    page.tsx
  reports/
    page.tsx
  scans/
    page.tsx
  demo/
    page.tsx

components/
  layout/
    TopNav.tsx
    MobileMenu.tsx
    SkipLink.tsx
    Footer.tsx
    ErrorBoundary.tsx
  ghost/
    GhostSVG.tsx
    GhostPositioned.tsx
  ui/
    Panel.tsx
    Badge.tsx
    MetricTile.tsx
    AgentModeBadge.tsx
    StatusIcon.tsx
    CodeBlock.tsx
    CodeDiff.tsx
    Skeleton.tsx
    ErrorState.tsx
    EmptyState.tsx
    LiveBadge.tsx
  bank/
    BankPage.tsx
    PaySlot.tsx
  journeys/
    PossessionMode.tsx
    ChecklistItem.tsx
    JourneyBreadcrumb.tsx
    GhostOverlay.tsx
  agents/
    AgentCard.tsx
    CriticalGhostCard.tsx
    LiveTimeline.tsx
    StepEventRow.tsx
  fixes/
    PipelineStepper.tsx
    StepTab.tsx
    FindPanel.tsx
    FixPanel.tsx
    VerifyPanel.tsx
    RegressionPanel.tsx
  kiro/
    FileTree.tsx
    HookCodePanel.tsx
    HookEventList.tsx
  reports/
    MetricStrip.tsx
    OutcomeCard.tsx

lib/
  api.ts
  types.ts
  hooks/
    useRun.ts
    useSSE.ts
    usePrefersReducedMotion.ts

styles/
  globals.css

tailwind.config.ts
next.config.ts
tsconfig.json

e2e/
  landing.spec.ts
  bank.spec.ts
  possession-mode.spec.ts
  agents.spec.ts
  fixes.spec.ts
  demo.spec.ts
  a11y.spec.ts

src/test/
  setup.ts
  a11y.test.tsx
  api.test.ts
  useRun.test.ts
  useSSE.test.ts
```
