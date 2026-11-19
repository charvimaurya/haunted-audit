# Product Shell and Information Architecture - Tasks

Order follows your list: tokens and component library, two shells and navigation, page template, marketing pages, `/try`, app overview and list pages, detail pages, reports/regression/night-watch/settings, 404/error and glossary, metadata and SEO, tests.
The immersive layer is placed after Settings, and the cutover tasks come last.

## Rules for every task

- **The site stays navigable.** From TASK-07 on, every route in `src/lib/routes.ts` exists. Unfinished routes are `status: "stub"` pages with their real H1 and a plain "This page is being built" state. After every task `npm run check:nav` (a Vitest test over `createMemoryRouter`) must pass: every manifest route renders with one `<h1>` and no error element; every nav link resolves to a manifest route.
- **Dev builds may contain stubs. Production builds may not** (TASK-07 guard).
- **No mock data in app code.** Test fixtures live in `dashboard/e2e/fixtures` only.
- **Each task flips its routes from `stub` to `live` in the manifest** when it finishes.
- Each task lists the requirements it satisfies and how it is verified.

---

## Phase 1 - Foundation: tokens and component library

### TASK-01 Add the router and tooling to `dashboard/`
**Satisfies:** REQ-IA-08, REQ-UI-01, REQ-DATA-01
**Steps:**
1. Work in the existing `dashboard/` app (Vite + React + TypeScript + Tailwind). Add, pinned to exact versions: `react-router-dom`, Radix primitives and shadcn deps, `swr`, `class-variance-authority`/`clsx`/`tailwind-merge` as shadcn needs. Vitest, Testing Library, jest-axe, `@playwright/test` and `@axe-core/playwright` are already present; keep their versions.
2. Add the `@/` alias (Vite `resolve.alias` and `tsconfig` `paths`).
3. Add scripts: `typecheck`, `test:e2e` (builds, then runs Playwright against `vite preview`), `check:nav` (placeholder for now). `dev`, `build`, `test` already exist.
4. Update `.env.example`: `VITE_API_URL`, `VITE_SITE_URL`, `VITE_REPO_URL` (all optional, described).
5. Keep `vitest` config and the `matchMedia` polyfill in `src/test/setup.ts`.
**Verified by:** `npm run dev` serves the existing page; `typecheck`, `test` and `build` exit 0.

### TASK-02 Tokens, type scale, spacing, focus, high-contrast set
**Satisfies:** REQ-UI-01, REQ-UI-02, REQ-UI-03, REQ-SET-05, REQ-A11Y-02, REQ-A11Y-04
**Steps:**
1. Extend `dashboard/tailwind.config.js` (stays `.js`) with the v7 palette, lightened `ink-faint`, ambient, coral and parchment tokens. Many already exist; add only what is missing.
2. Add the rem type scale and 8px spacing steps from design section 7.
3. Extend `src/index.css`: CSS variables, `html{font-size:100%}`, focus ring, `scroll-padding-top: var(--header-h)`, reduced-motion rules, `[data-calm]`, `[data-contrast="high"]` overrides, `--header-h`, `--sidebar-w`.
4. Keep the Google Fonts links in `index.html` (display face on the wordmark class only).
5. Add `scripts/contrast-check.mjs` that computes contrast for listed text and background token pairs in both sets.
**Verified by:** `contrast-check` passes (text 4.5:1, UI 3:1) for default and high-contrast sets; a unit test confirms no hex values in `components/**`.

### TASK-03 Base primitives
**Satisfies:** REQ-UI-04, REQ-UI-08, REQ-UI-09, REQ-TPL-03
**Steps:** Add shadcn/Radix primitives: Button (`primary`, `secondary`, `ghost`, `link`; min 44px), Badge, Card, Input, FormField (label, hint, error with `aria-describedby`), Switch, RadioGroup, Select, Skeleton. Add `data-primary-action` to the `primary` variant.
**Verified by:** unit tests plus jest-axe for each; test that Button `primary` renders `data-primary-action`.

### TASK-04 Overlay primitives
**Satisfies:** REQ-UI-04, REQ-UI-07, REQ-SHELL-07
**Steps:** Add Dialog, Sheet, Popover, DropdownMenu and Toast (viewport `role="status"`, errors `role="alert"`, 8 second duration, pause on hover/focus, Close button).
**Verified by:** tests for focus trap, Escape to close, focus return to trigger, and toast announcement text in the live region.

### TASK-05 Data components
**Satisfies:** REQ-UI-05, REQ-UI-06, REQ-DATA-02, REQ-DATA-05, REQ-CONTENT-02
**Steps:**
1. `StatusBadge` (icon + text, table in design 7.5), `AgentModeBadge`, `VerdictBadge` (renders backend values as given).
2. `MetricTile` (null -> `--` and "not yet measured") and `Stat` with the `{source} | {measured}` union type.
3. `DataTable` (caption, `scope`, sort buttons with `aria-sort`, labelled focusable scroll region).
4. `DataState` with `Skeleton`, `EmptyState`, `ErrorState`, `OfflineState`, `NotAvailableState`.
**Verified by:** unit tests for all five states; a type test (`tsd` or `// @ts-expect-error`) that `Stat` without `source` or `measured` fails; axe per component.

### TASK-06 Ghost components
**Satisfies:** REQ-MOTION-03, REQ-TRY-05
**Steps:** Port `GhostMascot` to an inline SVG with `state` (ready, blocked, verified), `aria-hidden`. Add `GhostPositioned` using the formula in design 9.4. Neither imports from `src/immersion`.
**Verified by:** unit tests: three states render the right color token; `box = null` renders nothing; with a box, the ghost's left edge is greater than the box's right edge (and is placed to the left if it would overflow); lint rule or test that `components/ghost` has no import from `src/immersion`.

---

## Phase 2 - Routes, shells and navigation

### TASK-07 Route manifest, router, stubs, guards
**Satisfies:** REQ-IA-01, REQ-IA-02, REQ-IA-04, REQ-IA-05, REQ-IA-06, REQ-IA-07, REQ-IA-08
**Steps:**
1. Write `src/lib/routes.ts` with every route in design section 3, each with a lazy `page` import and `titleFor(params)`.
2. Write `src/router.tsx` (`createBrowserRouter`, `basename: import.meta.env.BASE_URL`): `RootLayout` > `MarketingLayout` / `AppLayout`, every route using `lazy`, catch-all `*` (NotFound) and `/app/*` (AppNotFound), `errorElement` on the root. Create each page as a `StubPage` that renders the manifest H1 and "This page is being built". Dynamic pages read `:id` with `useParams`.
3. Replace `App.tsx` in `main.tsx` with `<RouterProvider>`. Keep `App.tsx` until parity (TASK-46).
4. Implement `scripts/verify-no-stubs.mjs` (fails production builds with any `status: "stub"`) and make `check:nav` a Vitest test that renders every manifest route with `createMemoryRouter`.
**Verified by:** `check:nav` finds one H1 and no error element for every route; `verify-no-stubs` fails when run with `VERCEL_ENV=production`.

### TASK-08 Settings system
**Satisfies:** REQ-SET-01 to REQ-SET-06
**Steps:** `SettingsProvider`, the blocking inline script in `dashboard/index.html` `<head>` (design 6), `SettingsMenu` (Popover with Calm, High contrast, Text size), system-reduced-motion lock with explanation text.
**Verified by:** Vitest for persistence and the locked Calm state; Playwright test that after reload `html[data-contrast="high"]` and font-size are set before the first paint (script present in the served `index.html`, attributes present on `domcontentloaded`).

### TASK-09 Marketing shell
**Satisfies:** REQ-SHELL-01, REQ-SHELL-03, REQ-SHELL-04, REQ-SHELL-05, REQ-SHELL-06, REQ-SHELL-08, REQ-SHELL-09
**Steps:** `SkipLink`, `Header` with nav from the manifest and `Open the app` outline link, `MobileMenu` (Sheet), `Footer` (with "Built with Kiro"), `HelpMenu` (links to Quick start and Glossary for now), `SettingsMenu` slot. Build `layouts/MarketingLayout.tsx`.
**Verified by:** Playwright: skip link is first Tab stop and moves focus to `main`; `aria-current="page"` on the current item; Menu sheet traps focus and returns it; focused links are not hidden under the sticky header.

### TASK-10 App shell
**Satisfies:** REQ-SHELL-02, REQ-SHELL-03, REQ-SHELL-04, REQ-SHELL-07, REQ-TPL-05, REQ-SHELL-09
**Steps:** `layouts/AppLayout.tsx` with top bar, grouped `Sidebar` (`aside` > `nav`), `Breadcrumbs` from the manifest (dynamic ids shown short), mobile Sheet menu. Same Help and Settings slots in the same order as the marketing header.
**Verified by:** Playwright at 375px and 1280px: sidebar vs Menu button; landmark names unique; last breadcrumb equals H1; no profile or sign-in element exists.

### TASK-11 `useRouteAnnouncer`: titles, focus, announcements
**Satisfies:** REQ-TPL-06, REQ-TPL-07, REQ-IA-04, REQ-SEO-01, REQ-SEO-05
**Steps:** write `src/hooks/useRouteAnnouncer.ts` and call it once in `RootLayout` (design 4.6). It sets `document.title` to `{titleFor(params)} · Haunted Audit`; toggles `<meta name="robots" content="noindex">` for `/app/**` and not-found; on pathname change only (not on search, hash or first load) waits for the navigation to be idle, then focuses `h1[data-page-title]` and scrolls to top; writes "Navigated to {H1}" into `<div id="route-announcer" role="status" aria-live="polite" aria-atomic="true" class="sr-only">` (cleared, then set on the next animation frame). If the H1 is missing, focus `main` and warn in development.
**Verified by:** Vitest with a memory router: title, noindex and announcer text per route; Playwright: navigate Home -> Try -> Scans with link clicks; after each, `document.activeElement` is the H1 and `#route-announcer` reads "Navigated to {H1}"; all titles are unique; back and forward behave the same.

### TASK-12 Page template
**Satisfies:** REQ-TPL-01 to REQ-TPL-05
**Steps:** `PageTemplate`, `PageHeader` (H1, "What this page shows", one primary action with `href`, `onClick` or `form`), `WhatHappensNext`. Switch every stub page to render inside it using manifest data.
**Verified by:** unit test: exactly one `[data-primary-action]`, one H1; Playwright over all routes confirms the same; `check:nav` still passes.

---

## Phase 3 - Content system

### TASK-13 Content registers and verification scripts
**Satisfies:** REQ-CONTENT-01 to REQ-CONTENT-04, REQ-MKT-04, REQ-GLOSS-01, REQ-GLOSS-03, REQ-GLOSS-06
**Steps:**
1. Write `content/sources.ts` (three entries from design 10.1, all `to-verify`), `glossary.ts` (all terms in REQ-GLOSS-01), `microcopy.ts`, `agents.ts`, `journeys.ts` (Send Payment only), `roadmap.ts`, `trust.ts`, `kiro-evidence.json` (only existing files as `exists`).
2. Build the `Term` component (first-use inline meaning; popover afterwards; link to `/glossary#id`).
3. Scripts: `verify-sources.mjs`, `verify-evidence.mjs`.
**Verified by:** unit tests for `Term` first use and popover keyboard operation; `verify-evidence` fails for a missing path (tested with a temp manifest); `verify-sources` fails in production mode while any source is `to-verify`; banned-string test passes.

---

## Phase 4 - Marketing pages

### TASK-14 Home `/`
**Satisfies:** REQ-MKT-01, REQ-GLOSS-03
**Steps:** `Hero` (wordmark, tagline, sub-line, static `GraveyardSilhouette` placeholder if the ambient task is not done), `LoopDiagram` (Find, Feel, Fix, Prove, Prevent, each with a plain line, `Term` for Feel/Prove), "Try it" block, `TrustStrip` using `Stat` with the three registered sources.
**Verified by:** e2e: primary action is "Try it" and goes to `/try`; each stat shows its source and year; no number on the page lacks a source (content test); axe passes.

### TASK-15 How it works `/how-it-works`
**Satisfies:** REQ-MKT-02
**Steps:** step-by-step loop section; `AgentRoleCard` per role from `content/agents.ts` with rules/AI/person badge and Built/Prototype/Planned status; "Voice user (simulated)"; the line "Rules where rules work, AI where judgement helps".
**Verified by:** unit: every agent in `agents.ts` has a plain description and a status; e2e: page shows the Voice card labelled simulated; axe.

### TASK-16 Trust `/trust`
**Satisfies:** REQ-MKT-03
**Steps:** boundary cards from `content/trust.ts`; each has `enforced: 'yes' | 'planned'` and renders "Planned" when not yet in code. Include the no-certification statement.
**Verified by:** unit: `planned` items render the Planned label; e2e text check for "scan-only", "synthetic", "human approves"; axe.

### TASK-17 Kiro `/kiro`
**Satisfies:** REQ-MKT-04, REQ-CONTENT-04
**Steps:** four-apps summary (IDE, CLI, Web, Crew) with honest limits; evidence table from `kiro-evidence.json`; file tree of the real `.kiro/` folder generated at build time by scanning the repo (not hand-typed); "Built with Kiro" plain text.
**Verified by:** `verify-evidence` in CI; unit: with `VITE_REPO_URL` unset the paths are plain text; the file tree lists only directories that exist (test against the repo); axe.

### TASK-18 Roadmap and About
**Satisfies:** REQ-MKT-05, REQ-MKT-06
**Steps:** `RoadmapPhase` components from `content/roadmap.ts` (MVP, Phase 2, Phase 3, last reviewed date, item status); "Pricing comes after pilots". About: mission and the three team members with roles only.
**Verified by:** content test: no currency symbols or plan prices on `/roadmap`; no `img` on `/about` unless supplied; axe.

### TASK-19 Accessibility statement and Quick start
**Satisfies:** REQ-MKT-07, REQ-MKT-08, REQ-MKT-09
**Steps:** statement with target, methods, limitations, report link; reader for `public/a11y/self-scan.json` (absent -> `--`); Quick start with three numbered steps and "Not published yet" markers where needed.
**Verified by:** unit: missing JSON renders `--` and "not yet measured"; present JSON renders date and counts; e2e: Quick start has exactly three `<ol>` items; axe.

---

## Phase 5 - `/try` (Possession Mode)

### TASK-20 API client, backend state, recent runs
**Satisfies:** REQ-DATA-01, REQ-DATA-03, REQ-DATA-06, REQ-DATA-07
**Steps:** port `lib/api.ts` and types; add `getHealth`, `postRun`, `getRun`, `streamEvents`; SWR fetcher mapping failures to `BackendState`; `useRecentRuns` (design 8.3).
**Verified by:** unit with `fetch` stubs: network failure -> offline, 404 -> unavailable, 500 -> error; recent runs cap at 50 and survive reload.

### TASK-21 Fixture serving and `BankStage`
**Satisfies:** REQ-IA-03, REQ-TRY-01, REQ-TRY-02, REQ-TRY-06
**Steps:** `scripts/copy-fixture.mjs` on predev/prebuild, writing to `dashboard/public/fixtures/haunted-bank/index.html` (git-ignored); iframe `src` built from `import.meta.env.BASE_URL`; `robots.txt` disallow; `BankStage` with scaled 1280x800 stage and `ResizeObserver`; variant `RadioGroup` ("Test site with a ghost" / "Test site, fixed"); small-screen scroll region.
**Verified by:** unit: the copied file contains ids `recipient`, `amount`, `send-payment`; e2e: stage scale is 1 at 1280px and below 1 at 600px; at 375px the labelled scroll region exists and is keyboard focusable.

### TASK-22 Live checklist from the visitor's keys
**Satisfies:** REQ-TRY-03
**Steps:** attach `focusin` to the iframe document on load; `ChecklistItem` list in `aria-live="polite"`; "stuck" rule (design 9.2); label "Your key presses"; first-use `Term` for Possession Mode.
**Verified by:** e2e: Tab inside the iframe ticks Recipient then Amount; on the broken variant a full cycle ends with "Tab to Send Payment" marked stuck; on the fixed variant Send Payment is reached; every state has icon and text.

### TASK-23 Agent run, timeline, verdict, semantic ghost
**Satisfies:** REQ-TRY-04, REQ-TRY-05, REQ-TRY-07, REQ-DATA-05, REQ-DATA-07
**Steps:** primary action "Run the keyboard agent" (scripted); `RunTimeline` over SSE; `VerdictBadge` + `AgentModeBadge` under "Checker verdict"; `GhostPositioned` from `blocked_element.bounding_box` with scale; green state on PASSED; offline state while keeping the checklist.
**Verified by:** e2e with `page.route` returning a BLOCKED result with a bounding box: ghost left edge is greater than the box's right edge times scale, and it does not overlap the box; PASSED shows green; aborted network shows offline and the Tab checklist still works; a real-backend smoke test (manual or CI with the FastAPI app) is documented in the README.

---

## Phase 6 - App: overview and list pages

### TASK-24 Overview `/app`
**Satisfies:** REQ-APP-01, REQ-DATA-02, REQ-DATA-05
**Steps:** latest-run card (ghost state, verdict, reason code, agent mode), `MetricTile`s (all `--` until a result supplies them), recent runs strip, primary action "Start a journey".
**Verified by:** unit/e2e: no runs -> empty state with next step; tiles show `--`; with a stubbed run -> verdict shown; offline state works; axe.

### TASK-25 Scans list and New scan
**Satisfies:** REQ-APP-02, REQ-APP-03, REQ-UI-09
**Steps:** scans `DataTable` (`GET /scans`, not-available until it exists); new-scan form with https validation, scan-only notice linking `/trust`, error summary and backend reasons; submit goes to `/app/scans/:id`.
**Verified by:** e2e: http URL shows an inline error and focus moves to the error summary; a stubbed 429 shows a plain-English rate-limit message and keeps the input; 404 on `GET /scans` shows not-available naming `GET /scans`.

### TASK-26 Journeys list
**Satisfies:** REQ-APP-05
**Steps:** catalogue header from `content/journeys.ts`; start form (variant, mode); table of runs started in this browser; `agent_mode` column; credential error shown plainly for `llm`.
**Verified by:** e2e: starting a run adds a row and links to `/app/journeys/:id`; stubbed credential error shows its reason and no result.

### TASK-27 Agents
**Satisfies:** REQ-APP-07
**Steps:** cards from `content/agents.ts`; latest-run outcome per agent when the run data covers it (keyboard agent, checker); other agents show only their status.
**Verified by:** unit: no hardcoded outcomes in the component (test greps for pass/fail strings); e2e: Voice labelled simulated; axe.

### TASK-28 Fixes list
**Satisfies:** REQ-APP-08
**Steps:** fixes table with status badges (`GET /fixes`, not-available until it exists); primary action "Review the oldest open fix" (disabled with reason when none).
**Verified by:** e2e with stubbed list: statuses render icon plus text; sorting by status works with keyboard; empty and not-available states.

---

## Phase 7 - App: detail pages

### TASK-29 Scan detail
**Satisfies:** REQ-APP-04, REQ-IA-07
**Steps:** findings `DataTable` (rule id, WCAG criterion, impact, selector), impact badges with shapes and text, sorted by impact; unknown id -> in-shell not-found.
**Verified by:** e2e with stubbed scan: order is critical first; unknown id shows not-found with a link to `/app/scans`.

### TASK-30 Journey detail
**Satisfies:** REQ-APP-06, REQ-IA-07, REQ-DATA-05
**Steps:** result card, focus trail, `RunTimeline` (SSE while running), blocked element, claim-mismatch note, tokens/cost/latency (scripted shows 0), screenshots when `GET /runs/{id}/screenshots/{step}` exists else a not-available note.
**Verified by:** e2e: scripted result shows tokens `0` and cost `0`; running -> complete transition updates the live region; mismatch note appears only when true.

### TASK-31 Fix review
**Satisfies:** REQ-APP-09
**Steps:** `DiffViewer` (text markers plus color), `FixStepList` (Find, Fix, Verify, Regression with one step's details open at a time), `DecisionBar` ("Approve fix", "Reject") posting `POST /fixes/{id}/decision`, toast on success, then show the verification run's verdict and `agent_mode`. Add the "Nothing in your code changes until you apply it yourself" line.
**Verified by:** e2e: no decision request is sent on page load or on timers; clicking Approve sends exactly one request; Reject sends one; both buttons are real buttons reachable by keyboard; the step list opens one panel at a time.

---

## Phase 8 - App: reports, regression, night-watch, settings

### TASK-32 Reports
**Satisfies:** REQ-APP-11, REQ-DATA-05, REQ-MOTION-08
**Steps:** tiles from `GET /eval/latest` (all `--` until present), eval summary table with `agent_mode`, parchment Outcome card, "Download evidence (JSON)" built client-side from loaded data.
**Verified by:** unit: unmeasured tile renders `--`; counter animates only to a measured number; e2e: download contains only fetched data.

### TASK-33 Regression
**Satisfies:** REQ-APP-10
**Steps:** tests table (`GET /regression/tests`), failing output block, the "ghost is back" line shown only when an earlier pass and a later fail exist, empty state pointing to `/app/fixes`.
**Verified by:** e2e with stubbed data for each case, including the condition for the "ghost is back" line.

### TASK-34 Night Watch
**Satisfies:** REQ-APP-12
**Steps:** history table (`GET /night-watch/history`) with status icon plus text including infrastructure failure; "No runs yet" empty state with the manual-run command; "Refresh history".
**Verified by:** e2e: `{rows: [], count: 0}` shows "No runs yet" and zero table rows; stubbed rows show statuses with text; unavailable endpoint shows not-available.

### TASK-35 Settings page
**Satisfies:** REQ-APP-13, REQ-SET-01 to REQ-SET-06
**Steps:** large-format controls reusing `SettingsMenu` parts; Sound toggle; reset link; backend status via `GET /health` with "Check backend connection".
**Verified by:** e2e: changing text size to 150% changes root font size and persists; Calm locked when the browser emulates `prefers-reduced-motion`; backend check shows ok, offline and error states.

---

## Phase 9 - Immersive layer

### TASK-36 Adapt the existing immersive layer to the shell
**Satisfies:** REQ-MOTION-01 to REQ-MOTION-08, REQ-A11Y-08
**Steps:** reuse `src/immersion/*` (`ImmersionProvider`, `AmbientLayer`, lazy `AmbientScene`, `SenseControls`, `motion.ts`) and `src/lib/motion/*`, `lib/audio/windSound.ts` (design 11). Make `SettingsProvider` the single owner of Calm (migrate the old `haunted-audit.calm` key once); mount `ImmersionProvider` in `RootLayout`; move `SenseControls` behavior into `SettingsMenu` (Calm) and `SoundToggle` (header slot, same place in both shells); add `AnimatedCounter`, `GraveyardSilhouette` and `Wisps` only if missing; wire the ambient layer into both layouts and the 3D scene into Hero.
**Verified by:** existing `immersion.test.tsx` still passes; unit: fps guard fires after 2 seconds below 40fps; ambient layer has `aria-hidden`, no focusable children; e2e: with Calm or High contrast on, no ambient elements animate and the 3D chunk is not requested; sound is off after load and no `AudioContext` is created before the toggle.

---

## Phase 10 - 404, error, glossary, help

### TASK-37 Not-found and error pages
**Satisfies:** REQ-ERR-01 to REQ-ERR-04, REQ-GLOSS-06
**Steps:** `NotFound` (marketing catch-all), `AppNotFound` (inside the app shell for `/app/*`), `RouteError` (route `errorElement`; "Try again" retries; chunk-load failure says a new version is available and offers Reload), and a top-level `ErrorBoundary` in `main.tsx` with plain markup, a Home link and Reload. Spooky line then plain instruction; links to Home and Overview; Settings and Help present on all except `ErrorBoundary`.
**Verified by:** e2e: unknown marketing path -> themed not-found with H1 and a link home; unknown `/app/x` -> in-shell not-found; a thrown error in a test route shows the `RouteError` UI and "Try again" works; a blocked chunk request shows the Reload message; no stack text visible.

### TASK-38 Glossary page, Start here, Help menu
**Satisfies:** REQ-GLOSS-01, REQ-GLOSS-02, REQ-GLOSS-04, REQ-GLOSS-05, REQ-SHELL-03
**Steps:** `/glossary` with anchors per term; `StartHereGuide` (three steps, non-modal, dismiss saved); complete `HelpMenu` (Start here, Quick start, Glossary).
**Verified by:** e2e: first visit shows the guide; dismiss persists after reload; Help > Start here reopens and focuses it; every glossary term from REQ-GLOSS-01 exists; first-use inline meaning present for `Term`s on Home and Try.

---

## Phase 11 - Metadata and SEO

### TASK-39 Static SEO files, hosting config, icons
**Satisfies:** REQ-SEO-01 to REQ-SEO-06
**Steps:**
1. `dashboard/index.html`: static `title`, `description`, Open Graph and Twitter tags, `theme-color`, favicon and apple-touch-icon links.
2. `public/og-image.png` (1200x630), `public/apple-touch-icon.png` (180x180); `public/favicon.svg` exists.
3. `public/robots.txt` (committed): disallow `/app/` and `/fixtures/`.
4. `scripts/generate-sitemap.mjs` on `prebuild`: marketing routes from the manifest into `public/sitemap.xml` when `VITE_SITE_URL` is set; otherwise skip with a warning.
5. Vite `transformIndexHtml` plugin: absolute `og:url` and `og:image` from `VITE_SITE_URL`, or remove those tags.
6. `dashboard/vercel.json` with the rewrite of `/(.*)` to `/index.html`.
7. Pages build step: copy `dist/index.html` to `dist/404.html`.
8. Dev proxy in `vite.config.ts`: add `/scans`, `/fixes`, `/regression`, `/eval`, `/night-watch` next to `/runs` and `/health`.
9. `noindex` is handled by TASK-11; add `noindex` meta to the fixture file only if the fixture owner agrees (otherwise `robots.txt` covers it).
**Verified by:** Playwright against `vite preview`: `/robots.txt` and `/sitemap.xml` are not HTML and list the right paths (sitemap marketing only); a vitest check that `vercel.json` holds the rewrite; `/app` has `noindex` after render; with `VITE_SITE_URL` unset no absolute URL is emitted.

---

## Phase 12 - Tests and gates

### TASK-40 Route walk, direct loads and landmarks
**Satisfies:** REQ-TEST-01, REQ-IA-04, REQ-TPL-03, REQ-SHELL-04, REQ-SHELL-05
**Steps:** Playwright test run against `vite build && vite preview` (SPA fallback). For every manifest route (a stubbed id for dynamic routes) use `page.goto` directly, including deep links `/app/scans/abc123` and `/docs/quick-start`; check the title equals the manifest title, exactly one H1, required landmarks with unique names, skip link first and working, exactly one primary action. An unknown path shows the NotFound title and H1.
**Verified by:** the test passes on a production build with no stubs.

### TASK-41 Axe in normal, Calm and High contrast
**Satisfies:** REQ-TEST-02, REQ-A11Y-01 to REQ-A11Y-06
**Steps:** `@axe-core/playwright` over every route (loaded directly) with tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`; run in normal and Calm mode (Calm set by `addInitScript` writing `localStorage['ha-settings']={"calm":true}`; assert `html[data-calm=true]`), plus High contrast and once at Text size 150%; write `public/a11y/self-scan.json` (date, axe version, routes, violation count).
**Verified by:** zero violations in all runs; the JSON file is produced and read by `/accessibility`.

### TASK-42 Keyboard walk and focus
**Satisfies:** REQ-TEST-03, REQ-TEST-04, REQ-TPL-06, REQ-TPL-07
**Steps:** keyboard-only test Home -> Try -> Fixes -> Reports (Tab, Shift+Tab, Enter, Space); after each navigation assert H1 focus and `#route-announcer` reads "Navigated to {H1}".
**Verified by:** test passes; failing focus placement fails the test.

### TASK-43 Data state and content tests
**Satisfies:** REQ-TEST-05, REQ-TEST-06, REQ-CONTENT-01 to REQ-CONTENT-03
**Steps:** Playwright state matrix for every data page (loading, empty, error, offline, unavailable, ready) using `e2e/fixtures`; Vitest content tests (banned strings, `Stat` source, evidence paths); optional `scripts/readability.mjs` reporting grade per content file (advisory, target 8).
**Verified by:** all pass; the readability report is attached to CI output.

### TASK-44 Update the axe-on-save hook
**Satisfies:** REQ-TEST-08
**Steps:** change `.kiro/hooks/axe-on-save.json` matcher to `dashboard/src/(pages|layouts|components|immersion|lib|content)/.*\.(tsx?|css)$`; update `.kiro/scripts/axe-on-save.mjs` to read routes from `dashboard/src/lib/routes.ts` (JSON export) and map component files to real paths, default dev server `http://localhost:5173`.
**Verified by:** saving a file under `dashboard/src/components/shell/` triggers a scan of the routes that use it; the script prints real paths (no `#hash` routes).

---

## Phase 13 - Cutover

### TASK-45 Docs and steering
**Satisfies:** REQ-IA-08, REQ-CONTENT-04
**Steps:** update `README.md` (run `dashboard/`, env vars, fixture copy, Vercel root directory `dashboard`, backend endpoints table); confirm the "Dashboard (dashboard/)" section in `.kiro/steering/product-rules.md` still matches; add the backend endpoint table from design 8.2 as a to-do list.
**Verified by:** a new reader can start backend and web from the README; README and steering name the same app directory.

### TASK-46 Remove the single-page prototype (needs your OK)
**Satisfies:** REQ-IA-08
**Steps:** run the reuse map checklist (design 15) and confirm each item exists under the new pages and components; then delete `src/App.tsx` and the old single-page section components that are no longer imported. No archive of `dashboard/` (it is the live app).
**Verified by:** parity checklist ticked in the PR; `typecheck`, unit tests, build and Playwright pass with the old files gone.

---

## Traceability

| Requirement group | Tasks |
|---|---|
| REQ-IA | 01, 07, 21, 46 |
| REQ-SHELL | 09, 10, 38, 40 |
| REQ-TPL | 11, 12, 40, 42 |
| REQ-MKT | 14 to 19 |
| REQ-TRY | 21 to 23 |
| REQ-APP | 24 to 35 |
| REQ-DATA | 05, 20, 24 to 34 |
| REQ-SET | 08, 35 |
| REQ-GLOSS | 13, 38 |
| REQ-ERR | 37 |
| REQ-UI | 02 to 05 |
| REQ-MOTION | 06, 32, 36 |
| REQ-SEO | 11, 39 |
| REQ-A11Y | 02, 41, 42 |
| REQ-CONTENT | 05, 13, 43 |
| REQ-TEST | 40 to 44 (REQ-TEST-09 in 39) |
