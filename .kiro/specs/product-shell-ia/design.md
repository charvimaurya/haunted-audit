# Product Shell and Information Architecture - Design

**Stack:** Vite + React + TypeScript + Tailwind in `dashboard/` (the existing app, refactored in place), React Router, shadcn/ui on Radix. Client-side rendering only, no server-side rendering. Deployed on Vercel. **This is not a Next.js migration.**
**Backend:** the existing FastAPI service at `VITE_API_URL`.
**Requirements:** `requirements.md` in this folder (IDs like REQ-SHELL-03 are cited below).

---

## 1. Decisions and things to confirm

| # | Decision | Why |
|---|---|---|
| D1 | The site is built **in place in `dashboard/`** (Vite + React + TypeScript). The single-page `App.tsx` is replaced by a React Router tree, and existing components are reused. No new app, no Next.js. | You chose the actual stack. In-place work keeps `src/immersion/`, the tests, CI and the Pages workflow working. |
| D9 | Routing uses React Router's data router (`createBrowserRouter`), one route per sitemap page, `lazy` route modules, two layout routes and catch-all not-found routes. A `useRouteAnnouncer` hook owns title, focus and announcements (section 4.5). | One route per page, code-split, with title and focus handled in one place. |
| D10 | Hosting: Vercel with `dashboard/vercel.json` (rewrite everything to `index.html`). The existing GitHub Pages workflow serves from `/haunted-audit/` and cannot rewrite, so deep links 404 there. Stopgap: copy `index.html` to `404.html` in the Pages build. Retire Pages once Vercel is live. | Deep links must work on every host we ship to. |
| D11 | Because there is no SSR, crawlers and social scrapers see only the static tags in `index.html`. Every URL shares one Open Graph preview. Per-route titles are set at runtime. | A limit of client rendering, stated so nobody expects per-page previews. |
| D2 | `/try` embeds the **real fixture file** in a same-origin iframe inside a fixed 1280x800 stage. | The checker measures `blocked_element.bounding_box` in a 1280x800 viewport. Only the same page at the same size makes the bounding box valid for placing the ghost (REQ-TRY-05). A React copy of the bank would not match pixel for pixel. |
| D3 | Added routes you did not list: `/glossary` (you asked for a glossary page) and `/fixtures/haunted-bank/index.html` (the test site). | `/try` needs the test site served from our origin. |
| D4 | The earlier `/demo` guided tour and `/bank` React page are dropped. `/try` covers the live demo. | One purpose per page. Confirm if you still want a timed tour. |
| D5 | The loop is shown as Find, Feel, Fix, Prove, Prevent. The glossary maps Feel to Experience and Prove to Verify. | Keeps your wording and the steering wording linked. |
| D6 | Many app pages need backend endpoints that do not exist yet (section 8). Pages show a "not available yet" state until they do. The frontend never fakes them. | Real content only. Backend work is a dependency, not part of this spec. |
| D7 | Sourced figures on Home come from the team deck. They are marked `to-verify`, and a production build fails until each has been checked against its primary source. | I could not verify them here. |
| D8 | Settings live in `localStorage` and a blocking script sets them before paint. | Meets "applied before first paint" with no account needed. |

---

## 2. Repository layout (in `dashboard/`)

```
dashboard/
  index.html                  static meta + Open Graph tags, favicon, settings script (before paint)
  vercel.json                 rewrite all paths to /index.html
  vite.config.ts              base from env, dev proxy, SEO plugin (section 12)
  public/
    favicon.svg  og-image.png  robots.txt  sitemap.xml (generated)
    fixtures/haunted-bank/index.html     copied from ../fixtures at build, git-ignored
    a11y/self-scan.json                  written by CI
  src/
    main.tsx                  ErrorBoundary > RouterProvider
    router.tsx                createBrowserRouter tree built from lib/routes.ts
    layouts/
      RootLayout.tsx          providers, SkipLink, route announcer region, ambient layer, Outlet
      MarketingLayout.tsx     header, main, footer
      AppLayout.tsx           top bar, sidebar, breadcrumbs, main
    pages/                    one lazy module per route; each exports `Component`
      Home.tsx  HowItWorks.tsx  Try.tsx  Trust.tsx  Kiro.tsx  Roadmap.tsx  About.tsx
      Accessibility.tsx  Glossary.tsx  QuickStart.tsx  NotFound.tsx
      app/Overview.tsx  Scans.tsx  ScanNew.tsx  ScanDetail.tsx  Journeys.tsx  JourneyDetail.tsx
          Agents.tsx  Fixes.tsx  FixDetail.tsx  Regression.tsx  Reports.tsx  NightWatch.tsx
          Settings.tsx  AppNotFound.tsx
    components/
      ui/            shadcn primitives (Button, Badge, Card, Dialog, Sheet, Popover, ...)
      shell/         Header, Sidebar, MobileMenu, Footer, SkipLink, Breadcrumbs, HelpMenu,
                     SettingsMenu, SoundToggle, StartHereGuide, RouteError
      page/          PageTemplate, PageHeader, WhatHappensNext
      data/          DataState, Skeletons, EmptyState, ErrorState, OfflineState, NotAvailableState,
                     DataTable, StatusBadge, MetricTile, AgentModeBadge, Stat, Term
      ghost/         GhostMascot (SVG), GhostPositioned
      try/           BankStage, PossessionPanel, ChecklistItem, RunTimeline
      fixes/         DiffViewer, FixStepList, DecisionBar
      marketing/     Hero, LoopDiagram, TrustStrip, AgentRoleCard, RoadmapPhase
    immersion/       existing: AmbientLayer, AmbientScene, ImmersionContext, SenseControls, motion.ts, scene3d.ts
    content/         sources.ts  glossary.ts  agents.ts  journeys.ts  roadmap.ts  microcopy.ts
                     kiro-evidence.json  trust.ts
    lib/             routes.ts  api.ts  types.ts  settings/  hooks/ (useRouteAnnouncer, useRecentRuns, ...)
    test/            existing vitest setup and tests
  e2e/               Playwright specs and fixtures (fixtures never imported by app code)
  scripts/           copy-fixture.mjs  generate-sitemap.mjs  verify-evidence.mjs
                     verify-sources.mjs  verify-no-stubs.mjs  readability.mjs
```

Existing `src/components/*` files are moved or rewritten per section 15; `src/App.tsx` is deleted when the router replaces it.

---

## 3. Route manifest (`lib/routes.ts`)

Single source for nav, breadcrumbs, sitemap, tests and the stub guard.

```ts
type Shell = 'marketing' | 'app' | 'bare';
interface RouteDef {
  path: string;            // '/app/scans/:id' for dynamic
  shell: Shell;
  title: string;           // page title part, "{title} · Haunted Audit"
  h1: string;
  shows: string;           // "What this page shows" one-liner
  primary: { label: string; href?: string; form?: string } | null;
  next: { label: string; href: string };
  navGroup?: 'find' | 'feel' | 'fix' | 'prevent' | 'review' | 'settings';
  status: 'live' | 'stub';
  indexable: boolean;
}
```

| Route | Shell | H1 | Primary action | What happens next |
|---|---|---|---|---|
| `/` | marketing | Haunted Audit | Try it | See how it works |
| `/how-it-works` | marketing | How Haunted Audit works | Try it | Read the safety boundaries |
| `/try` | marketing | Try Possession Mode | Run the keyboard agent | Open the app to run more journeys |
| `/trust` | marketing | Safety boundaries | See how it works | Read the quick start |
| `/kiro` | marketing | How we used Kiro | Open the .kiro folder | See the roadmap |
| `/roadmap` | marketing | Roadmap | Try the MVP | Meet the team |
| `/about` | marketing | About Haunted Audit | Try it | Read our accessibility statement |
| `/accessibility` | marketing | Accessibility statement | Report an accessibility problem | Read the glossary |
| `/docs/quick-start` | marketing | Quick start | Open the demo | Open the app |
| `/glossary` | marketing | Glossary | Back to how it works | Try it |
| `/app` | app | Overview | Start a journey | Open Journeys |
| `/app/scans` | app | Scans | New scan | Open a scan to see findings |
| `/app/scans/new` | app | New scan | Start scan (form submit) | See your scan |
| `/app/scans/:id` | app | Scan {short id} | Run a keyboard journey | Review fixes |
| `/app/journeys` | app | Journeys | Run Send Payment | Open a run |
| `/app/journeys/:id` | app | Journey run {short id} | See the proposed fix / Run it again | Review fixes |
| `/app/agents` | app | Agents | Open the latest journey | See how it works |
| `/app/fixes` | app | Fixes | Review the oldest open fix | Check regression |
| `/app/fixes/:id` | app | Fix {short id} | Approve fix | Check regression |
| `/app/regression` | app | Regression | Re-run the regression check | See Night Watch |
| `/app/reports` | app | Reports | Download evidence (JSON) | Open Night Watch |
| `/app/night-watch` | app | Night Watch | Refresh history | Open Reports |
| `/app/settings` | app | Settings | Check backend connection | Go to Overview |
| `/fixtures/haunted-bank/index.html` | bare | Send Payment (test site) | n/a | n/a |

`primary: null` is allowed only for `bare`. The `bare` fixture is a static file in `public/`, not a React route, so the router never renders it.

`RouteDef` also carries `page: () => Promise<{ Component: ComponentType }>` (the lazy import) and `titleFor(params)`, which returns the H1 and title text (for example `Scan ${shortId}` for `/app/scans/:id`). `router.tsx` builds the route tree from the manifest, so a route cannot exist without an entry.

Titles use `{title} · Haunted Audit`. Home uses `Haunted Audit · Accessibility guardrail for AI-built apps`.

---

## 4. Shells

### 4.1 Root layout
`RootLayout` is the parent of every route. It renders the providers (`SettingsProvider`, `ImmersionProvider` from `src/immersion`, `ToastProvider`), `SkipLink`, `StartHereGuide`, the ambient layer, the route announcer live region (section 4.6), and an `<Outlet />`. `index.html` already holds `<html lang="en">` and the blocking settings script (section 6). The layouts render `header`, `nav`, `main`, `footer`.

Stacking contexts:

```
z 0    AmbientLayer (fixed, aria-hidden, pointer-events none)
z 10   page content wrapper (relative)
z 40   SettingsMenu / popovers (Radix portals)
z 50   sticky header
z 60   Sheet / Dialog overlay
```

### 4.2 MarketingLayout
Header: wordmark link, nav (How it works, Try it, Trust, Kiro, Roadmap, About), `Open the app` as an outline link (not primary, so the page's single primary action stays clear), then Help, Settings, Sound. Below 1024px the nav collapses into a Menu button that opens a `Sheet`. Footer: Accessibility, Quick start, Glossary, Trust, "Built with Kiro".

### 4.3 AppLayout
Top bar: wordmark, Help, Settings, Sound. Sidebar (`aside` > `nav aria-label="App sections"`):

```
Overview
Find      Scans
Feel      Journeys, Agents
Fix       Fixes
Prevent   Regression, Night Watch
Review    Reports
          Settings
```

Group labels use the loop names with their plain meaning on hover and in the glossary. Under 1024px the sidebar is a `Sheet` opened by a "Menu" button. Breadcrumbs render from the manifest above the H1: `Overview > Scans > Scan 4f3a`. The last item is plain text with `aria-current="page"` and equals the H1.

### 4.4 Shared behaviours
- `SkipLink`: first focusable, visible on focus. On activation it calls `preventDefault()` and focuses `#main-content` in script, so the router never treats it as a navigation. `main` has `id="main-content" tabIndex={-1}`.
- `scroll-padding-top: var(--header-h)` on `html`, plus `scroll-margin-top` on headings.
- Title, focus and announcements are handled by `useRouteAnnouncer` (section 4.6).
- Not-found and error pages render inside the layouts (section 4.5), so Settings and Help stay in place.
- A top-level `ErrorBoundary` wraps `RouterProvider` in `main.tsx` for failures outside any route. It uses plain markup and token CSS, with the wordmark, a Home link and a Reload button.

### 4.5 Routing (React Router)

```tsx
// router.tsx (shape)
createBrowserRouter([
  { element: <RootLayout />, errorElement: <RouteError />, children: [
    { element: <MarketingLayout />, children: [
        ...marketingRoutes,                    // from lib/routes.ts, each with lazy + handle
        { path: '*', lazy: () => import('./pages/NotFound') },
    ]},
    { path: 'app', element: <AppLayout />, children: [
        ...appRoutes,                          // index = Overview, 'scans', 'scans/new', 'scans/:id', ...
        { path: '*', lazy: () => import('./pages/app/AppNotFound') },   // unknown /app/... stays in the app shell
    ]},
  ]},
], { basename: import.meta.env.BASE_URL });
```

- Every route has `lazy` (code-split by page) and `handle: { def }` so hooks can read the manifest entry for the matched route.
- `basename` comes from Vite's `BASE_URL` (`/` on Vercel, `/haunted-audit/` on Pages).
- `RouteError` is the layout-level `errorElement`. It shows the spooky error page with "Try again". For a failed lazy chunk (a new deploy replaced old files) it shows "A new version is available" and a Reload button, because retrying a missing chunk cannot work.
- Navigation uses React Router `<Link>` and `<NavLink>` (`aria-current="page"` is set by `NavLink`).
- The fixture (`/fixtures/haunted-bank/index.html`) is a static file, so the host serves it before any rewrite.

### 4.6 `useRouteAnnouncer`

Called once in `RootLayout`. It returns nothing; it owns three jobs:

1. **Title.** On every location change it sets `document.title` to `{titleFor(params)} · Haunted Audit` from the matched route's manifest entry (Home uses its own full title; the catch-all uses "Page not found · Haunted Audit"). It also sets or removes `<meta name="robots" content="noindex">` for `/app/**` and the not-found routes.
2. **Focus.** When the **pathname** changes (not for search-string or hash-only changes, and not on first load) it waits until `useNavigation().state === 'idle'`, meaning the lazy route module has loaded and rendered, then focuses `h1[data-page-title]` in a layout effect and scrolls to the top. The first page load is left to the browser.
3. **Announcement.** It writes `Navigated to {H1 text}` into a visually hidden live region rendered by `RootLayout`:

```html
<div id="route-announcer" role="status" aria-live="polite" aria-atomic="true" class="sr-only"></div>
```

The text is cleared first and set in the next animation frame so repeat visits to the same page still announce. Back and forward navigation behave like links.

If a route's H1 is missing (a bug), the hook focuses `main` and logs a development warning; the route walk test fails on it.

---

## 5. Page template

```tsx
<PageTemplate route={route}>   // reads manifest: h1, shows, primary, next
  {children}
</PageTemplate>
```

Renders, in order: `Breadcrumbs` (app), `PageHeader`, children, `WhatHappensNext`.

`PageHeader`:
- `<h1 data-page-title tabIndex={-1}>` with outline suppressed only when focused by script (still visible via `:focus-visible` ring for keyboard).
- `<p class="shows">` the one-line "What this page shows".
- One primary action. Accepts `href`, `onClick`, or `{ form: id }` for submit. It sets `data-primary-action`. A unit test and the route walk test assert exactly one per page.

`WhatHappensNext`: a `nav aria-label="What happens next"` with one link plus one sentence.

Data views inside use `DataState`:

```tsx
<DataState
  status={status}                  // 'loading'|'empty'|'error'|'offline'|'unavailable'|'ready'
  skeleton={<TableSkeleton rows={5} />}
  empty={{ spooky, plain, action }}
  unavailable={{ needs: 'GET /scans', willShow: 'a table of past scans' }}
  onRetry={mutate}
>
  {...}
</DataState>
```

---

## 6. Settings

```ts
interface Settings {
  calm: boolean;                       // saved choice; system reduced-motion forces on
  contrast: 'normal' | 'high';
  textSize: 100 | 125 | 150;
}
```

Storage key `ha-settings` (JSON). Sound is not stored; it always starts off.

Blocking script inline in `dashboard/index.html` `<head>` before the module script (tiny, try/catch). It is plain HTML, not a framework feature:

```js
(function(){try{var s=JSON.parse(localStorage.getItem('ha-settings')||'{}');
var d=document.documentElement;
if(s.contrast==='high')d.dataset.contrast='high';
if(s.textSize)d.style.fontSize=s.textSize+'%';
var sys=matchMedia('(prefers-reduced-motion: reduce)').matches;
d.dataset.calm=String(sys||s.calm===true);}catch(e){}})();
```

CSS:
- `html { font-size: 100%; }` and all sizes in `rem`, so Text size scales the whole site.
- `[data-contrast="high"]` overrides color tokens (text `#ffffff`-class on black, 2px borders, focus ring in a high-visibility token, panels flat with no glow).
- `[data-calm="true"] .ambient-motion, .animate-float, .animate-glow-pulse, .animate-pulse { animation: none !important }`.
- `[data-contrast="high"] .ambient-layer { display: none }`.

`SettingsMenu` is a Radix `Popover` with a `Switch` (Calm), a `Switch` (High contrast), a `RadioGroup` (Text size), a link to `/app/settings`. When the system prefers reduced motion the Calm switch is on and `aria-disabled`, with text "On because your device asks for less motion."

`/app/settings` shows the same controls larger, plus Sound and backend status.

---

## 7. Design system

### 7.1 Tokens (from UI v7)
Reuse `dashboard/tailwind.config.js` colors: `base`, `base-panel`, `base-surface`, `base-line`, `violet-*`, `ghost-ready/blocked/verified`, `parchment-*`, `ink-*` (with the lightened `ink-faint`), `ambient-*`, `coral-*`. Add:

- `contrast-high` set for `[data-contrast=high]`.
- `--header-h` (4rem), `--sidebar-w` (16rem).
- Focus ring: 3px `violet-neon`, 3px offset; high-contrast set swaps the color.

### 7.2 Type scale (rem, ratio 1.25)
| Token | Size | Use |
|---|---|---|
| `text-body` | 1rem | all content, tables, forms |
| `text-lead` | 1.25rem | page "What this page shows" |
| `text-h3` | 1.25rem / 600 | card titles |
| `text-h2` | 1.5rem / 600 | sections |
| `text-h1` | clamp(2rem, 4vw, 2.5rem) / 700 | page title |
| `text-eyebrow` | 0.875rem uppercase | non-essential labels only |
| `font-display` | clamp(2.5rem, 7vw, 4rem) | wordmark only |

No content text below 1rem.

### 7.3 Spacing and shape
8px grid: use Tailwind spacing steps 2, 4, 6, 8, 12, 16 (0.5rem multiples). Radius `rounded-lg` (8px) cards, `rounded-full` pills. Glow shadows only on `panel-glow`, off in high contrast and Calm.

### 7.4 Components (shadcn on Radix)
Button (variants: `primary` once per page, `secondary`, `ghost`, `link`; min 44px height), Badge, StatusBadge (icon + text, mapping in 7.5), Card, Table/DataTable, Dialog, Sheet, Popover, DropdownMenu, Switch, RadioGroup, Select, Input and FormField, Skeleton, Toast.

`Term` is deliberately **not** a hover tooltip. Tooltips fail on touch and are not reliably operable by keyboard. `Term` is a `Popover` trigger button (click, Enter, Space, tap), and the first use on a page prints the meaning inline.

### 7.5 Status badges
| Status | Icon | Text |
|---|---|---|
| PASSED / pass | check-circle | Passed |
| BLOCKED / fail | x-circle | Blocked |
| regression | x-circle | Regression |
| skipped | minus | Skipped |
| infra_failure | triangle-alert | Infrastructure failure |
| running | loader (static in Calm) | Running |
| proposed / approved / rejected / verified | distinct icons | text |
| critical/serious/moderate/minor | distinct shapes | text |

### 7.6 DataTable
Native `<table>`, `<caption>`, `<th scope="col">`. Sortable header is a `<button>` inside `<th aria-sort>`. Cells that open a detail use a real link in the first column. Wrapper: `div role="region" aria-label="{caption} (scrolls sideways)" tabIndex={0}`.

Decision: **no arrow-key row navigation.** Overriding arrows inside a table fights screen reader browse commands. Tab reaches sort buttons and row links, and every row link has a visible focus ring with `scroll-margin` for the sticky header.

### 7.7 Toasts
Radix Toast with a `role="status"` viewport (`aria-live="polite"`); errors use `role="alert"`. Duration 8 seconds, pauses on focus and hover, always has a Close button. Use toasts for confirmations (Fix decision recorded, Run started). They never carry the only copy of an error.

---

## 8. Data layer and backend contract

### 8.1 Client
`lib/api.ts`: `ApiError { status }`, typed functions, `VITE_API_URL`. The dev proxy in `vite.config.ts` today covers only `/runs` and `/health`; add `/scans`, `/fixes`, `/regression`, `/eval`, `/night-watch`. None collide with client routes because those all live under `/app`. Data hooks use SWR (exact version pinned) with a shared fetcher that maps failures to a `BackendState`:

```ts
type BackendState = 'ok' | 'offline' | 'unavailable' | 'error';
// TypeError/fetch failure -> offline ; 404/405 on a listed endpoint -> unavailable ; other non-2xx -> error
```

`DataState` turns that into the five visible states (REQ-DATA-03).

### 8.2 Endpoints each page needs
| Page | Needs | Exists today |
|---|---|---|
| `/try`, `/app/journeys`, `/app/journeys/:id` | `POST /runs`, `GET /runs/{id}`, `GET /runs/{id}/events` (SSE) | Yes |
| `/app/journeys`, `/app` (list) | `GET /runs` (list, filters) | **No** (interim: runs started in this browser, REQ-DATA-06) |
| Screenshots in run detail | `GET /runs/{id}/screenshots/{step}` | **No** (API stores file paths only) |
| `/app/scans`, `/new`, `/:id` | `GET /scans`, `POST /scans`, `GET /scans/{id}` | **No** |
| `/app/fixes`, `/:id` | `GET /fixes`, `GET /fixes/{id}`, `POST /fixes/{id}/decision` | **No** |
| `/app/regression` | `GET /regression/tests`, `POST /regression/runs` | **No** |
| `/app/reports`, `/app` tiles | `GET /eval/latest` | **No** (eval writes `artifacts/eval/results.json` to disk) |
| `/app/night-watch` | `GET /night-watch/history` | **No** (specified in `.kiro/specs/night-watch`) |
| `/app/settings` | `GET /health` | Yes |

Each missing endpoint is a tracked dependency. Until it exists the page shows the not-available state naming what it needs and what the page will show.

### 8.3 Recent runs (interim)
`lib/hooks/useRecentRuns.ts` stores run ids from `POST /runs` in `localStorage['ha-recent-runs']` (max 50) and reads each with `GET /runs/{id}`. The table caption says "Runs started in this browser".

### 8.4 Rules enforced in code
- `MetricTile` and `Stat` accept `value: number | null`; null renders `--` and "not yet measured".
- `AgentModeBadge` is a required prop on result components.
- `VerdictBadge` takes backend `verdict` and `reason_code` and renders them as given. No logic.

---

## 9. `/try` design

```
+--------------------------------------+  +------------------------------+
| BankStage (scaled 1280x800 stage)     |  | Keyboard-only demonstration  |
|  <iframe src=/fixtures/...?variant=>  |  |  Your key presses (live)     |
|  + GhostPositioned overlay (z above)  |  |  Checker verdict + agent_mode|
+--------------------------------------+  |  Live steps (SSE timeline)   |
                                          +------------------------------+
```

### 9.1 BankStage
- Stage `div` is 1280x800 CSS px, wrapped in a container measured with `ResizeObserver`; `transform: scale(k)` with `transform-origin: top left`, `k = min(1, containerWidth / 1280)`. The wrapper height is `800 * k`.
- Below `k < 0.6` the wrapper becomes a labelled scroll region at `k = 1` (REQ-TRY-06) and the checklist and verdict stay as text.
- `<iframe title="Haunted Bank - Test site" src={`${import.meta.env.BASE_URL}fixtures/haunted-bank/index.html?variant=broken`}>` is same-origin so the parent can read `contentDocument`.

### 9.2 Live checklist from the visitor's keys
On iframe `load`, attach `focusin` to `contentDocument`. Map `event.target.id` (`recipient`, `amount`, `send-payment`) to checklist items. "Stuck" is set when the visitor has Tabbed through 8 or more distinct focusable elements and returned to the first one without `send-payment` ever receiving focus. This is the page's own observation, labelled "Your key presses". It is **not** the verdict.

### 9.3 Agent run and verdict
`POST /runs {variant, mode: 'scripted'}` -> run id saved to recent runs -> SSE steps appended to `RunTimeline` (`aria-live="polite"`) -> on `done`, `GET /runs/{id}` -> `VerdictBadge` + `AgentModeBadge`. The checklist stays separate from the verdict.

### 9.4 Semantic ghost
`GhostPositioned` takes `{ state, box: BoundingBox | null, scale }`:

```ts
left = (box.x + box.width + GHOST_GAP) * scale
top  = (box.y + box.height / 2 - GHOST_H / 2) * scale
```

- Rendered inside the stage coordinate space (a sibling of the iframe, above it), never over the control: `left` is to the right of the box. If it would pass the stage edge, it moves to the left of the box.
- `null` box -> no positioned ghost; Ready state shown in the panel.
- It is a different component from `AmbientGhost` and carries a visible "Journey Blocked" label and the plain sentence "The Send Payment control cannot be reached with the keyboard."

### 9.5 Offline
The iframe and the visitor's checklist work without the backend. Verdict and timeline show `OfflineState`.

### 9.6 Fixture sync
`scripts/copy-fixture.mjs` copies `../fixtures/haunted_bank/index.html` to `dashboard/public/fixtures/haunted-bank/index.html` on `predev` and `prebuild`. One source of truth. The copied file is git-ignored.

---

## 10. Content system

### 10.1 Sourced figures
```ts
// content/sources.ts
interface Source { id: string; name: string; year: number; url?: string; status: 'verified' | 'to-verify' }
// <Stat figure="95.9%" label="of the top one million home pages had detectable WCAG 2 failures" source={sources.webaim2026} />
```
`Stat` props are a union: `{ source: Source } | { measured: number | null }`. Anything else fails type-check. `verify-sources.mjs` fails production builds on `to-verify`.

Initial register (all `to-verify`, taken from the team deck):

| id | Figure | Source named in deck |
|---|---|---|
| webaim2026 | 95.9% of top one million home pages had detectable WCAG 2 failures (average 56 errors per page) | WebAIM Million 2026 |
| who2022 | 1 in 6 people worldwide live with a significant disability | WHO 2022 |
| eaa | EU Accessibility Act covers banking since June 2025 | EU Directive 2019/882 |

The Home trust strip uses these three. Other deck figures (UK shopper stats, lawsuits, FTC fine) can be added the same way later.

### 10.2 Evidence manifest
`content/kiro-evidence.json`:
```json
[{ "claim": "Steering rules guide every session", "path": ".kiro/steering/product-rules.md", "status": "exists" },
 { "claim": "Seven custom agents", "path": ".kiro/agents", "status": "planned" }]
```
`verify-evidence.mjs` checks each `exists` path against the repo root and fails otherwise. Links use `VITE_REPO_URL + /blob/main/ + path`. Unset: plain text.

Only claims backed by files that exist today may be `exists`. Today that is steering, specs, hooks and scripts under `.kiro/`. Agents, Power, Web and Crew claims start as `planned`.

### 10.3 Glossary and microcopy
`content/glossary.ts`: `{ id, term, plain, theme?: 'spooky' | 'technical', related?: string[] }`. `Term id="ghost"` reads from it. A `first` flag is set explicitly per page by the author, and a test checks that the first `[data-term]` of each id on a page has an adjacent plain meaning.

`content/microcopy.ts` holds `{ spooky, plain }` pairs, for example:

| Place | Spooky line | Plain instruction |
|---|---|---|
| Scans empty | No ghosts have been summoned yet. | Start a scan of a public page to look for accessibility barriers. |
| Night Watch empty | The watch has not walked its rounds. | No runs yet. Run it once by hand with the command below. |
| Offline | The ghosts cannot reach their crypt. | The Haunted Audit backend is not reachable. Start it and try again. |
| Not available | This room is still being built. | This page needs `GET /scans`, which the backend does not offer yet. |
| 404 | You have wandered off the path. | This page does not exist. Go back to Home or the app Overview. |
| Toast: fix recorded | The Exorcist has your answer. | Your decision is saved. The check runs on a copy of your code. |

### 10.4 Start here guide
Three steps: (1) Try the demo on `/try`, (2) Open the app Overview, (3) Read the safety boundaries. Rendered as a `section aria-label="Start here"` banner under the header, not a modal. Dismiss saves `ha-start-guide=dismissed`. HelpMenu item "Start here" clears it and focuses the guide.

---

## 11. Immersive layer reuse

The layer already exists and is reused, not rebuilt:

- `src/immersion/`: `ImmersionProvider` and `useImmersion` / `useMotionAllowed` (Calm, quality tier, sound), `AmbientLayer`, lazy `AmbientScene` (3D), `SenseControls`, `motion.ts` (thresholds, storage, `deviceQuality`, `nextQuality`, `resolveCalm`), `scene3d.ts`.
- `src/lib/motion/*` and `src/lib/audio/windSound.ts`: fps meter, capabilities, wisps, wind sound.

Changes needed to fit the shell:

- Calm has two storage keys today (`haunted-audit.calm` in `immersion/motion.ts`, `ha-settings.calm` in section 6). One wins: `SettingsProvider` owns Calm and `ImmersionProvider` reads it. The old key is read once and migrated, then dropped.
- `ImmersionProvider` sits in `RootLayout`. It sets `data-quality` on `<html>`.
- `SenseControls` content moves into `SettingsMenu` (Calm) and `SoundToggle` (Sound); no second control for the same setting.
- Add only what is missing: `AnimatedCounter`, `GraveyardSilhouette` and `Wisps` if absent. Check first.

Where used: Hero on Home (silhouette always, 3D lazy and only when allowed), `AmbientLayer` on marketing shell and app shell (fog only in app shell), cobwebs on a few panels. App data pages stay calm and quiet.

Rules enforced by structure: ambient components render `aria-hidden`, `pointer-events-none`, `-z-10`/`z-0` under `isolate` parents; `GhostMascot` and `GhostPositioned` live in `components/ghost` and import nothing from `immersion`.

---

## 12. Metadata, SEO and hosting

No server-side rendering. Everything below is static files plus a runtime hook.

- `dashboard/index.html`: static `<title>`, `description`, `og:title`, `og:description`, `og:type`, `og:image`, `twitter:card` (`summary_large_image`), `theme-color`, favicon links. These describe the product, not any one page.
- Runtime: `useRouteAnnouncer` sets `document.title` and toggles `noindex` per route (section 4.6). Crawlers that do not run JavaScript see the static title only.
- `public/og-image.png` (1200x630, ghost mark and tagline). A small Vite `transformIndexHtml` plugin writes absolute `og:url` and `og:image` from `VITE_SITE_URL`; when it is unset those two tags are removed rather than guessed.
- `public/robots.txt` (committed): allow `/`, disallow `/app/` and `/fixtures/`. A `Sitemap:` line is added by the generator only when `VITE_SITE_URL` is set.
- `public/sitemap.xml`: generated by `scripts/generate-sitemap.mjs` at `prebuild` from the route manifest (marketing routes only). Skipped with a warning when `VITE_SITE_URL` is unset.
- `public/favicon.svg` (exists) and `public/apple-touch-icon.png` (180x180).
- `dashboard/vercel.json`:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

  Vercel serves real files first, so `robots.txt`, `sitemap.xml`, assets and the fixture are not shadowed. Project Root Directory is `dashboard`.
- GitHub Pages cannot rewrite. The Pages build copies `index.html` to `404.html` so deep links load the app (status is 404, which is a stopgap).

Known limits, stated plainly: all URLs share one social preview; unknown paths return HTTP 200 on Vercel (soft 404) while the app shows the not-found page and sets `noindex`.

---

## 13. Accessibility approach

- Native elements first. Radix supplies tested focus management for Dialog, Sheet, Popover, DropdownMenu and Toast.
- Focus never hides behind sticky bars (`scroll-padding-top`, `scroll-margin-top`).
- Target size: buttons and links in nav at `min-h-11 min-w-11` (44px).
- Forms: `FormField` wires label, hint and error ids with `aria-describedby`; on a failed submit focus goes to the first invalid field and an error summary appears above the form.
- Live regions: `RunTimeline`, `ChecklistItem` lists, toasts.
- Reduced motion: CSS global rule plus `data-calm`; JS hooks check `AtmosphereProvider`.
- Reflow: the only horizontal scroll regions are labelled and focusable (tables, Try stage).
- 200% zoom and 150% text tested together.

---

## 14. Testing

| Layer | Tool | What |
|---|---|---|
| Unit | Vitest + Testing Library + jest-axe | PageHeader (one H1, one primary), StatusBadge text, DataState five states, Stat type and runtime, Term first-use, Settings persistence, FpsMeter, capabilities |
| Route walk | Vitest (`createMemoryRouter`) | `check:nav`: every manifest route renders one H1 and no error element |
| Direct load | Playwright against `vite build && vite preview` | `page.goto` of every route, including deep links (`/app/scans/abc123`, `/docs/quick-start`); unknown path shows NotFound title and H1 |
| Route walk | Playwright | every manifest route: unique title, one H1, landmarks, skip link first and working, exactly one `[data-primary-action]` |
| Axe | `@axe-core/playwright` | every route, zero violations, normal and Calm (Calm set with `localStorage['ha-settings']` in `addInitScript`; assert `html[data-calm=true]`); also High contrast and 150% text |
| Keyboard walk | Playwright | Home -> Try -> Fixes -> Reports with keys only |
| Focus + title | Playwright | after each client nav: `document.activeElement` is the H1; `#route-announcer` reads "Navigated to {H1}" |
| Data states | Playwright `page.route` | loading, empty, error, offline (abort), unavailable (404), ready; fixtures from `e2e/fixtures` only |
| Content | Vitest | banned strings (lorem ipsum, "testimonial"), `Stat` without source, evidence path missing, readability report (target grade 8; advisory) |
| Try | Playwright | Tab inside iframe fills checklist; stubbed run returns BLOCKED with a bounding box and the ghost's left edge is greater than the box's right edge |
| Hosting | Vitest | `vercel.json` has the catch-all rewrite; `/robots.txt` and `/sitemap.xml` responses are not HTML |
| Build guards | Node scripts | no stub routes, no `to-verify` sources, evidence paths exist |

CI order: type-check -> unit (incl. `check:nav`) -> build (runs guards) -> Playwright on `vite preview` -> write `public/a11y/self-scan.json` from the axe run.

---

## 15. Reuse map (in place)

| Current file in `dashboard/src` | New location in `dashboard/src` | Change |
|---|---|---|
| `components/GhostMascot.tsx` | `components/ghost/GhostMascot.tsx` | emoji -> inline SVG, same `state` prop, `aria-hidden` |
| `components/MetricValue.tsx` | `components/data/MetricTile.tsx` | keep `--` semantics; counter via `AnimatedCounter` |
| `components/AgentCard.tsx`, `GhostHuntSection.tsx` | `/app/agents`, `AgentRoleCard`, `RunTimeline` | remove hardcoded outcomes; read latest run |
| `components/PossessionMode.tsx` | `components/try/*` | replace fake form with real iframe stage |
| `components/PipelineSection.tsx` | `fixes/FixStepList` | steps live inside `/app/fixes/:id`; real data |
| `components/CodeBlock.tsx` | `fixes/DiffViewer` | text markers plus color |
| `components/OutcomeCard.tsx` | `/app/reports` | unchanged parchment look |
| `components/KiroIntegrationSection.tsx` | `/kiro` | file tree from evidence manifest |
| `components/HeroSection.tsx` | `marketing/Hero` | remove emoji decor, use SVG and ambient layer |
| `components/TopNav.tsx` | `shell/Header` | real links, Sheet for mobile |
| `lib/motion/*`, `lib/audio/*`, `immersion/*` | same place | keep; see section 11 |
| `types/index.ts` | `lib/types.ts` | add Scan, Fix, NightWatchRow, EvalSummary |
| `tailwind.config.js` | same file | stays `.js`; add contrast set |
| `src/test/a11y.test.tsx` | same place | extend to layouts and pages |
| `App.tsx` | `router.tsx` + `layouts/*` | delete after parity |

Also update: `.kiro/scripts/axe-on-save.mjs` (routes from `lib/routes.ts`, real paths instead of hash anchors, default dev server `http://localhost:5173`) and the `README.md` run instructions. `product-rules.md` already says "Dashboard (dashboard/)".

---

## 16. Risks

| Risk | Mitigation |
|---|---|
| Many pages wait on missing endpoints | Not-available state names the endpoint; endpoint table is the backend to-do list; interim recent-runs fallback |
| Scaled iframe is small on phones | Scroll region at full scale plus text checklist and verdict |
| Same-origin iframe reads break if the fixture changes ids | Test asserts ids `recipient`, `amount`, `send-payment` exist in the copied file |
| Sourced figures are wrong or stale | `to-verify` build gate; source name and year shown |
| Spooky tone hurts clarity | Term popovers plus plain line first; microcopy always ends with a plain instruction |
| Too many settings controls clutter the header | One Settings button opens a popover; Sound is a single icon button with visible state text |
| Soft 404: unknown paths return 200 on Vercel | App shows NotFound and sets `noindex`; stated in section 12 |
| One social preview for every URL (no SSR) | Accepted; static OG tags describe the product |
| Stale chunk after a deploy breaks a lazy route | `RouteError` detects chunk-load failure and offers Reload |
| Pages deep links and `/haunted-audit/` base path | `404.html` copy stopgap, `basename` from `BASE_URL`; retire Pages |
| Radix/shadcn upgrade churn | Pin exact versions; components copied in, not hidden in a package |
