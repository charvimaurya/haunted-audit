# Multi-page routing and working accessibility controls - Design

**Requirements:** `requirements.md` in this folder (IDs like REQ-CALM-02 are cited below).
**Stack:** Vite 8, React 19, TypeScript, Tailwind 3 in `dashboard/`. Add React Router (data router) and Playwright config. No Next.js, no server-side rendering.
**Facts below marked "code read" come from reading `dashboard/` and are confirmed in a browser in TASK-01. Nothing here has been run yet.**

---

## 1. Decisions and things to confirm

| # | Decision | Why |
|---|---|---|
| D1 | This is slice 1 of `product-shell-ia`. Same router design (`createBrowserRouter`, route `lazy`, one manifest). Differences are listed in the requirements. | One architecture, no two competing routers. |
| D2 | **`/glossary` is added** although it is not in your route list. | `product-ux.md` requires spooky terms to link to a glossary. Drop it only if you accept breaking that rule. |
| D3 | **The Sound button is removed**, not fixed. No audio exists (`src/lib/audio` is gone; nothing creates an `AudioContext`). | A toggle that does nothing is a dead control. Your list says "if audio exists". |
| D4 | **Text size Smaller = 87.5%** is allowed as an opt-in. Default stays 100%. | You asked for four steps. It conflicts with the 16px readable rule only if it were the default. |
| D5 | **System reduced motion locks Calm on.** The control shows on, `aria-disabled`, with an explanation. | `product-rules.md`: "Calm mode is on when the system prefers reduced motion, and a visible keyboard toggle can turn it on as well." The stricter reading wins. |
| D6 | **Controls live behind one "Accessibility" button in the header** (disclosure panel, not a modal), with a mirror on `/app/settings`. | Three controls plus Reset do not fit a 375px header. A disclosure keeps Tab order natural and is simple to test. If you prefer them always visible on desktop, say so. |
| D7 | **Add `GET /runs?limit=N`.** | `/results` and `/app/journeys` need a real list. Without it they could only show runs from this browser. It exposes fixture-only run records, no personal data. |
| D8 | **Remove fabricated content:** `GhostHuntSection` shows fixed "passed/failed" rows for Voice Agent and Ghost Hunter regardless of any run, and falls back to `'div.pay-btn'`. **Remove Approve/Reject** and the dead Haunted Bank sidebar links. | `product-rules.md`: never invent metrics; human approval needs a real backend. |
| D9 | **Colour tokens become CSS variables** (`rgb(var(--c-ink) / <alpha-value>)`), so Tailwind's opacity modifiers (`bg-base/95`, `border-violet-neon/50`) keep working and High contrast is a variable swap. | `tailwind.config.js` holds hex literals today, so a variable swap alone cannot restyle components. |
| D10 | **Run state moves into a `RunProvider` above the routes.** | Back/Forward and navigation must not kill a running journey (REQ-REAL-06). Today the run lives in `App`. |
| D11 | Scroll to top on every navigation including Back/Forward, as you asked. | Browser scroll restoration is turned off (no `ScrollRestoration`). |
| D12 | Marketing header shows Home, How it works, Try it, Results, Trust, Kiro and a "More" disclosure (Roadmap, About, Accessibility, Glossary). | Ten items do not fit one bar. Every item still has its own route and `aria-current`. |
| D13 | App shell has a sidebar (not only breadcrumbs). | `product-ux.md` defines the app shell as top bar + sidebar + breadcrumbs. |

---

## 2. What the code does today (code read, to confirm in TASK-01)

These seed the audit. Each gets an ID and a browser check in `docs/audit-before.md`.

**Sections on the single page** (`App.tsx`): Hero (`#home`), RunControls, PossessionMode (`#journeys`), GhostHuntSection (`#scans`), ResultsSection + OutcomeCard (`#reports`), PipelineSection (`#fixes`), KiroIntegrationSection (`#kiro`).

**Navigation:** `TopNav` has six hash links (`#home #scans #journeys #fixes #kiro #reports`). Current page comes from the `activeSection` prop, which `App` sets to `'Journeys'` while running and `'Home'` otherwise, so it never follows the real position. The "Kiro" call-to-action duplicates the Kiro link and is primary-styled in the header (REQ-NAV-08). The skip link in `App.tsx` points to `#main-content`.

**Controls:**
- *Calm:* `ImmersionProvider` + `SenseControls`. Sets `html[data-calm]`. CSS stops CSS animations. `AmbientLayer` hides when Calm is on, but it is mounted only inside `HeroSection`. `HeroSection` has its own `usePrefersReducedMotion` (system setting only) and adds `animate-glow-pulse` unless the system prefers reduced motion, so the page-level Calm choice does not reach it. When the system prefers reduced motion, pressing the button can only turn Calm on.
- *Sound:* a toggle exists, nothing plays. Dead control.
- *High contrast, Text size:* do not exist. `html { font-size: 16px }` is fixed in px; `html, body { overflow-x: hidden }`.
- *Skip link:* exists in `App.tsx` as a hash link (will change the URL under a router).
- *Persistence:* keys `haunted-audit.calm` and `haunted-audit.sound`, no first-paint script.

**Dead or misleading controls:** four `href="#journeys"` links in the Possession Mode sidebar; "Approve Fix" and "Reject" in `PipelineSection` have no handler; the Pipeline tab buttons (`role="tab"`) need a handler check; "Possess This App" calls `handleRun` and does not navigate.

**Fixed text presented as results:** `GhostHuntSection` Voice Agent and Ghost Hunter rows.

**Hex colours outside the two token files:** `HeroSection` background gradient, `.code-block` in `index.css` (`#0d0714`), `.token-*` colours.

**px sizes that will not scale with text size:** 32 occurrences of `text-[..]`, `min-h-[..]`, `[..px]` or inline `style` in `components` and `immersion`; 10 are `text-[10px]` or `text-[11px]`.

**Backend:** only `POST /runs`, `GET /runs/{id}`, `GET /runs/{id}/events`, `/ping`, `/health`.

---

## 3. File layout

```
dashboard/
  index.html                  title, fonts, inline pre-paint settings script
  vercel.json                 SPA rewrite
  playwright.config.ts        webServers: API (uvicorn, temp DB) + vite preview
  e2e/                        Playwright tests
  src/
    main.tsx                  <RouterProvider>, top-level ErrorBoundary
    router.tsx                route tree from the manifest
    routes.ts                 the manifest (single source)
    layouts/
      RootLayout.tsx          providers, SkipLink, LiveRegion, route announcer, Outlet
      MarketingLayout.tsx     Header, Outlet, Footer
      AppLayout.tsx           TopBar, Sidebar, Breadcrumbs, Outlet, Footer
    pages/                    one file per route, default-exported component
    components/               one component per file (existing + new)
      shell/                  Header, PrimaryNav, MoreMenu, MobileMenu, Footer, SkipLink,
                              Breadcrumbs, Sidebar, LiveRegion, NavigationStatus
      settings/               AccessibilityMenu, CalmControl, ContrastControl, TextSizeControl,
                              ResetControl, SettingsPanel
      page/                   PageTemplate, PageHeader, NextStep
      state/                  OfflineState, NotAvailableState, EmptyState, LoadingState
      errors/                 RouteError, NotFoundPage, AppNotFoundPage
    settings/                 SettingsProvider, storage.ts, useSettings.ts, announce.ts
    motion/                   useMotionAllowed.ts, useMotionFrame.ts   (the only gate)
    runs/                     RunProvider, useRuns.ts, api.ts
    immersion/                existing; reads Calm from SettingsProvider
    index.css                 variables, data-attribute rules
```

---

## 4. Route manifest

```ts
export interface RouteDef {
  path: string;                       // "/try", "/app/scans"
  shell: 'marketing' | 'app';
  title: string;                      // document title part
  h1: string;
  shows: string;                      // "What this page shows" line
  next: { label: string; to: string };
  nav?: { group: 'primary' | 'more' | 'app'; label: string; order: number };
  page: () => Promise<{ default: React.ComponentType }>;   // lazy import
}
```

| Route | Shell | H1 | Next step |
|---|---|---|---|
| `/` | marketing | Haunted Audit | Try it on the demo site (`/try`) |
| `/how-it-works` | marketing | How it works | Try it (`/try`) |
| `/try` | marketing | Possession Mode | See the results (`/results`) |
| `/results` | marketing | Results | Open the app (`/app`) |
| `/trust` | marketing | Trust and safety | Read how it works (`/how-it-works`) |
| `/kiro` | marketing | Built with Kiro | See the roadmap (`/roadmap`) |
| `/roadmap` | marketing | Roadmap | About the project (`/about`) |
| `/about` | marketing | About | Try it (`/try`) |
| `/accessibility` | marketing | Accessibility | Open settings (`/app/settings`) |
| `/glossary` | marketing | Glossary | How it works (`/how-it-works`) |
| `/app` | app | Overview | Start a journey (`/app/journeys`) |
| `/app/scans` | app | Scans | Journeys (`/app/journeys`) |
| `/app/journeys` | app | Journeys | Agents (`/app/agents`) |
| `/app/agents` | app | Agents | Fixes (`/app/fixes`) |
| `/app/fixes` | app | Fixes | Regression (`/app/regression`) |
| `/app/regression` | app | Regression | Reports (`/app/reports`) |
| `/app/reports` | app | Reports | Night Watch (`/app/night-watch`) |
| `/app/night-watch` | app | Night Watch | Settings (`/app/settings`) |
| `/app/settings` | app | Settings | Overview (`/app`) |

Titles: `{h1} · Haunted Audit`; Home is `Haunted Audit`; not found is `Page not found · Haunted Audit`. A unit test asserts uniqueness. The "What this page shows" lines are written in plain language during TASK-04 to 08.

---

## 5. Router

```tsx
createBrowserRouter([
  { element: <RootLayout />, errorElement: <TopLevelError />, children: [
    { element: <MarketingLayout />, children: [
      { errorElement: <RouteError />, children: [          // errors stay inside the shell
        ...marketingRoutes.map(r => ({ path: r.path, lazy: () => loadPage(r) })),
        { path: '*', element: <NotFoundPage /> },
      ]},
    ]},
    { path: '/app', element: <AppLayout />, children: [
      { errorElement: <RouteError />, children: [
        ...appRoutes.map(r => ({ index or path, lazy: () => loadPage(r) })),
        { path: '*', element: <AppNotFoundPage /> },
      ]},
    ]},
  ]},
], { basename: import.meta.env.BASE_URL });
```

- `loadPage(r)` wraps `r.page()` and returns `{ Component: () => <PageTemplate route={r}><Page/></PageTemplate> }`. The template renders the H1, "What this page shows" and the next step so pages cannot forget them.
- **Loading:** a data router keeps the old page on screen while a lazy route loads. `NavigationStatus` reads `useNavigation()` and, when `state !== 'idle'`, shows a visible "Loading page" text bar under the header and sets `aria-busy` on `main`. It has no animation (static text, plus a progress bar only when motion is allowed). First load uses `HydrateFallback` with the same text.
- **Error boundary per route:** the pathless `errorElement` route sits inside each layout, so the header, sidebar and footer survive an error. `RouteError` detects `ChunkLoadError` / "Failed to fetch dynamically imported module" and offers Reload.
- **`vercel.json`:** `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`.
- **GitHub Pages:** `basename` comes from `BASE_URL` (`/haunted-audit/`). Pages cannot rewrite; the Pages build copies `index.html` to `404.html`. (Same stopgap as `product-shell-ia`.)

---

## 6. Navigation behaviour: `useRouteAnnouncer`

Called once in `RootLayout`. On `location.pathname` change only (not search/hash, not first load):

1. wait until `useNavigation().state === 'idle'` (the page has rendered);
2. `window.scrollTo(0, 0)`;
3. `document.title = titleFor(route)`;
4. focus `h1[data-page-title]` (`tabIndex={-1}`, `preventScroll: true`); if missing, focus `main` and warn in development (the route test fails on it);
5. write `Navigated to {H1}` to the live region.

Title is also set on first load (no focus move). Back and Forward take the same path. The live region is one `<div id="live-region" role="status" aria-live="polite" aria-atomic="true" class="sr-only">` in `RootLayout`. `announce(message)` clears it, then sets the text on the next animation frame so a repeated message is still read. A small queue spaces messages 250 ms apart so a route message and a setting message do not overwrite each other. (The announcer's rAF is functional, not decorative, and is on the gate's allow-list.)

**Skip link:** `onClick` calls `preventDefault()`, then `main.focus()`. No URL change, no history entry. Focus styling comes from the global `:focus-visible` rule; `scroll-padding-top: var(--header-h)` keeps focus clear of the sticky header.

**Layout shift:** `--header-h` is reserved with `padding-top` on the layout; the header height does not depend on loaded fonts (fixed rem height); `main` has `min-height: calc(100vh - header - footer)`; `LoadingState` and page skeletons use the same minimum height. In-app navigation only swaps the Outlet.

---

## 7. Layouts and navigation

**Header (both shells):** `[Wordmark] [PrimaryNav] ... [Open the app (outline link)] [Accessibility button] [Menu button below 1024px]`.
- `PrimaryNav` renders from the manifest; the item whose `path` equals the current location gets `aria-current="page"`. `Link` from React Router does this with `NavLink`; the visible style adds an underline so it is not colour-only.
- `MoreMenu` is a disclosure button (`aria-expanded`, `aria-controls`); Escape closes it and returns focus to the button; links inside carry `aria-current`. When the current page is inside More, the button gets `data-current` (underline) and the visually hidden text "(current page: About)".
- The header "Kiro" CTA is removed; Kiro is a normal nav item. This keeps the page's own action the only primary button (REQ-NAV-08).
- `Open the app` goes to `/app`; in `/app` the same slot reads `Back to site` (to `/`).

**AppLayout:** top bar as above, `aside > nav aria-label="App sections"` with the nine app items (`aria-current`), `Breadcrumbs` above the H1 (`Overview` > `Scans`), footer. Under 1024px the sidebar becomes the Menu disclosure.

**Footer:** Accessibility, Glossary, Trust, Roadmap, About links and "Built with Kiro" plain text.

**Landmarks:** `header`, `nav aria-label="Primary"`, `main#main-content`, `aside` (app), `footer`.

---

## 8. SettingsProvider

```ts
type TextSize = 'small' | 'default' | 'large' | 'xlarge';   // 87.5 | 100 | 125 | 150 %
interface StoredSettings { v: 1; calm: boolean | null; contrast: 'normal' | 'high'; textSize: TextSize }
```

- `calm: null` means "no choice, follow the system". Effective Calm = `calm === true || systemReduce`. The visitor can turn Calm on; they cannot turn it off while the system asks for reduced motion (D5).
- State: `useSyncExternalStore` over a tiny store that reads and writes `localStorage['ha-settings']` in `try/catch`; `storage` events sync tabs; `matchMedia('(prefers-reduced-motion: reduce)')` is listened to for changes.
- **Apply:** one effect writes `html[data-calm]`, `html[data-contrast]`, `html[data-text-size]`. Components never branch on these.
- **Pre-paint script** (inline in `index.html`, before the module script):

```js
(function(){try{
  var s=JSON.parse(localStorage.getItem('ha-settings')||'{}'),d=document.documentElement;
  var sys=matchMedia('(prefers-reduced-motion: reduce)').matches;
  d.dataset.calm=String(sys||s.calm===true);
  d.dataset.contrast=s.contrast==='high'?'high':'normal';
  d.dataset.textSize=({small:1,large:1,xlarge:1})[s.textSize]?s.textSize:'default';
}catch(e){document.documentElement.dataset.calm='false';document.documentElement.dataset.contrast='normal';document.documentElement.dataset.textSize='default';}})();
```

- **Migration:** on first load, if `ha-settings` is missing, read `haunted-audit.calm` (`'on'` becomes `calm: true`), write the new key, remove both old keys (`haunted-audit.sound` is removed with no replacement).
- **Storage failure:** `save()` returns false; the provider sets `saveFailed`, shown as a note in the panel and announced once. The in-memory state still applies.
- **Announce:** `calm on`, `calm off`, `contrast high/normal`, `text size larger`, `settings reset`.
- **Reset:** `calm: null`, `contrast: 'normal'`, `textSize: 'default'`, remove the stored key.

### CSS

```css
:root { --c-base: 13 7 20; --c-ink: 240 232 255; /* ... space-separated channels for every token */ --text-scale: 100%; }
html { font-size: var(--text-scale); }
html[data-text-size='small']  { --text-scale: 87.5%; }
html[data-text-size='large']  { --text-scale: 125%; }
html[data-text-size='xlarge'] { --text-scale: 150%; }
html[data-contrast='high'] { /* override every channel: black base, white ink, 7:1+ pairs, thicker focus ring, no glow */ }
html[data-contrast='high'] .ambient-layer { display: none; }
html[data-contrast='high'] .panel, .panel-glow { box-shadow: none; border-width: 2px; }
html[data-calm='true'] *, ::before, ::after { animation: none !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
```

Tailwind: `colors.base.DEFAULT = 'rgb(var(--c-base) / <alpha-value>)'` and so on for every token. Hex literals move to `index.css` variables only. `html, body { overflow-x: hidden }` is deleted. All `[Npx]` sizes become `rem`.

The high-contrast values are chosen with a script (`scripts/contrast-check.mjs`) that computes ratios for each text/background pair in both sets and fails below 7:1 (normal text) and 4.5:1 (UI parts, focus ring). The chosen numbers are in the code, not invented in this spec.

---

## 9. The controls

`AccessibilityMenu` is a disclosure: a `<button aria-expanded aria-controls="a11y-panel">Accessibility</button>` and a panel (`role="group" aria-label="Accessibility settings"`, not a dialog, so focus is not trapped). Escape closes and returns focus to the button; clicking outside closes. The panel holds:

1. **Calm mode:** `<button aria-pressed>`; label "Calm mode: on/off". When the system forces it: `aria-disabled="true"`, `aria-pressed="true"`, and a visible line "On because your device asks for less motion."
2. **High contrast:** `<button aria-pressed>`.
3. **Text size:** `<fieldset><legend>Text size</legend>` with four native radio inputs (Smaller, Default, Larger, Largest), arrow keys supplied by the browser.
4. **Reset settings:** `<button>`.
5. `Sound` is not rendered (D3). When audio is added, the toggle goes in this panel's sibling group in the header.

Each control calls `useSettings()` setters. Focus ring is the global 3px rule. Touch targets are 44px.

`/app/settings` renders the same `SettingsPanel` component inline (always open) plus the saved-or-not note. One source, two places.

---

## 10. Calm mode: how everything stops

Four layers, so nothing "already running" survives:

1. **CSS:** the `html[data-calm='true']` rule sets `animation: none !important` and near-zero transitions on everything. This stops CSS animations the moment the attribute changes (roaming ghosts, particles, glow pulse, float, pulse dot, spinner).
2. **React gate:** `useMotionAllowed()` returns false when Effective Calm is on (or quality is `static`). `AmbientLayer`/`AmbientScene` unmount, which disposes the 3D scene (`scene3d` cleanup) and ends any `requestAnimationFrame` loop. The fps guard in `ImmersionProvider` stops because `motionAllowed` is false.
3. **JS loops:** `useMotionFrame(callback)` is the only way to start a decorative `requestAnimationFrame`/interval; it does nothing while Calm is on and cancels on change. A Vitest source scan fails if `requestAnimationFrame`, `setInterval`, `.animate(` or a new `@keyframes` appears outside `src/motion/`, `src/immersion/`, and the announcer.
4. **Safety sweep:** when Calm turns on, the provider calls `document.getAnimations().forEach(a => a.cancel())` once, which also catches Web Animations created by any library.

`ImmersionProvider` no longer has its own Calm state or storage. It gets `calm` from `useSettings()`, keeps `quality` and the fps guard, and exposes `motionAllowed`. `SenseControls.tsx` is deleted. `HeroSection`'s own reduced-motion hook is replaced with `useMotionAllowed`.

Page transitions: none exist and none are added. Parallax, tilt and cursor trail: none exist (the code read found no pointer or scroll listeners). The gate and the source scan bind any future one.

While Calm is on: status stays visible as text and static icons. Running state shows the words "Running" and a static icon; `Loader2 animate-spin` is replaced by the same icon without spin (the CSS rule already freezes it, and the text carries meaning).

---

## 11. Pages

Each page is a small component inside `PageTemplate`. Existing section components are reused and cleaned; they are not redesigned.

| Page | Content | Data |
|---|---|---|
| `/` | `HeroSection` (short), `LoopSummary` (five stages, one line and a link each), CTAs: "Possess This App" is a `Link` to `/try`, styled primary; "How it works" secondary | none |
| `/how-it-works` | Loop explanation, `AgentCard` per role (real status: Built / Prototype / Planned), rules-vs-AI line | static content from `content/agents.ts` |
| `/try` | `RunControls`, `PossessionMode`, live steps, verdict | `RunProvider` (POST /runs, SSE, GET /runs/{id}) |
| `/results` | `ResultsSection`, `OutcomeCard`, runs table with `agent_mode` | `GET /runs`, `GET /runs/{id}` |
| `/trust` | Scan-only, no form submission, fixture-only agents, checker decides verdict, human approves changes, data kept (runs reset on redeploy) | static, true statements |
| `/kiro` | `KiroIntegrationSection` | evidence list limited to files that exist |
| `/roadmap` | Done, in progress, planned (from specs; labelled) | static |
| `/about` | Project, Kiroween 2026, "Built with Kiro" | static |
| `/accessibility` | Control guide, keyboard shortcuts, known limitations from `audit-after.md` | static |
| `/glossary` | Terms table | `content/glossary.ts` |
| `/app` | Latest run card, tiles (`--` until measured), recent runs | `GET /runs` |
| `/app/journeys` | Start a journey, runs on this server | `GET /runs` |
| `/app/agents` | Agent roles and status | static |
| `/app/fixes`, `/scans`, `/regression`, `/reports`, `/night-watch` | `NotAvailableState` naming the endpoint it needs, and a plain description of what it will show. For fixes, the example diff can appear only under the label "Example of a proposed fix (not from a run)" and with no Approve/Reject buttons | none |
| `/app/settings` | `SettingsPanel` | local |

**GhostHuntSection fix (D8):** agent outcome rows come from the result: Keyboard Agent rows from the step events and the verdict; Ghost Hunter from `blocked_element` (selector shown only if present); Voice Agent shows "Planned, not run" with no pass/fail. The `?? 'div.pay-btn'` fallback is removed; an absent value renders `--`.

**Possession Mode panel:** the sidebar of the fake bank becomes plain text list items (not links), since the page is a description of the test site, not working navigation. The recipient and amount fields stay empty and editable per the earlier change and are not sent to the run.

**RunProvider (D10):** holds `{ status, liveEvents, result, runId, notice }`, starts a run, owns the `EventSource`, and survives route changes. It closes the stream on provider unmount only. A run started on `/try` is still shown when returning. `notice` carries the 429/403/offline messages already built (`RunNotice`).

**Backend (REQ-REAL-05):** `GET /runs?limit=` returns `[ { run_id, variant, mode, status, verdict, reason_code, seeded, recorded_at | created_at } ]`, newest first, capped at 50. It does not return the `result` body. Tests in `agent/tests`.

**Offline:** `OfflineState` with "The audit service did not answer", what still works (the site, settings, glossary), and Retry. `useRuns` maps fetch failure to it. No cached or fake rows.

---

## 12. Testing

Playwright config: two web servers. API: `HAUNTED_AUDIT_DB=<tmp> CORS_ALLOWED_ORIGINS=http://127.0.0.1:4173 uvicorn agent.api.main:app --port 8000` (scripted mode only, real Chromium). Web: `vite build && vite preview --port 4173` with `VITE_API_URL=http://127.0.0.1:8000`. A fixture collects `console` (error and warning), `pageerror` and failed same-origin requests and fails the test on any.

| File | Covers |
|---|---|
| `routes.spec.ts` | REQ-TEST-01, not-found, app not-found, titles unique, one H1 |
| `navigation.spec.ts` | REQ-TEST-02: click, Back, Forward; focus, live region, scroll, `aria-current`, CLS via `PerformanceObserver('layout-shift')` |
| `controls.spec.ts` | REQ-TEST-03 for Calm, contrast, text size, skip, reset, blocked storage |
| `keyboard.spec.ts` | REQ-TEST-04 |
| `axe.spec.ts` | REQ-TEST-05: every route x {normal, Calm, high} |
| `dead-controls.spec.ts` | REQ-TEST-06 |
| `live.spec.ts` | REQ-TEST-07 real API, and offline via `page.route(...).abort()` |
| `hosting.spec.ts` | `vercel.json` has the rewrite; deep links work under `vite preview` |

Calm assertions use `page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length)` after the toggle, with the ambient layer visible before. The 3D chunk check uses `page.on('request')` for `scene3d`. High contrast checks computed `color`/`background-color` and the focus ring `outline-color` and computes the ratio in the test. Text size checks `getComputedStyle(documentElement).fontSize` is `14px`, `16px`, `20px`, `24px` and `document.documentElement.scrollWidth <= clientWidth` at Largest and at 200% zoom (viewport 640px wide).

Vitest: provider, manifest, source scans (`href="#`, hex outside token files, `px` font sizes, rAF/interval/animate outside the gate), contrast script, existing 27 tests updated.

CI: `.github/workflows/tests.yml` dashboard job adds `npx playwright install --with-deps chromium`, installs Python deps, runs `npm test`, `npm run build`, `npm run test:e2e`.

---

## 13. Risks

| Risk | Mitigation |
|---|---|
| Converting tokens to variables touches every colour | Do it in one task with the build and axe tests as the check; no per-component edits; screenshot before/after of key pages (visual spot check, not an automated diff) |
| `px` to `rem` changes layout subtly | Convert in place at 1:1 (`10px` = `0.625rem`), then raise information-carrying labels to 0.875rem in a separate step with a visual check |
| Removing `overflow-x: hidden` exposes real overflow | Tests at Largest and 200% zoom find it; fix each overflow properly |
| A tab or tooltip pattern (Pipeline tabs) is not keyboard complete | Audit checks it; if tabs are kept, add arrow-key handling, otherwise replace with headings |
| Lazy routes flash empty content | `NavigationStatus` keeps the old page until the new one is ready; CLS test |
| Dev proxy lacks new paths | Only `/runs` and `/health` exist today and `/runs` covers the list endpoint |
| Two specs disagree later | Relationship table above; update `product-shell-ia` when this lands |
| Playwright needs a browser and a backend in CI | Install step and a second web server; both are already used in the repo's Python job |
