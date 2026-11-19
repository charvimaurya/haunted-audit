# Multi-page routing and working accessibility controls - Tasks

Order: audit -> router and layouts -> page components moved out -> navigation and route announcer -> SettingsProvider and global styles -> each control in turn -> error and not-found pages -> tests -> audit-after.

## Rules for every task

- **The site stays working after every task.** After each task: `npm run build`, `npm test` and a manual check that `/` loads and a run can be started. Until TASK-09, `/` renders the old single page unchanged (`LegacyHome`).
- **No code changes in TASK-01.** Only `docs/audit-before.md` is written. Throwaway scripts live outside the repo.
- Every task lists the audit IDs it closes (`A-`, `C-`, `D-`). IDs come from TASK-01; until then the task names the kind of finding.
- Every task lists requirements satisfied and how it is verified. Tests are written in the task that changes the behaviour; the Playwright suites in Phase 9 gather and complete them.
- One component per file, typed props, no hex colours or `px` text sizes in new code, "Built with Kiro" where the project is credited (steering).
- No sign-in, no invented numbers, no fake rows. Unmeasured is `--` with "not yet measured".
- Nothing is committed without your approval. Changes sit on a feature branch.

---

## Phase 0 - Audit

### TASK-01 Audit before (no code changes)
**Satisfies:** REQ-AUDIT-01, REQ-AUDIT-02
**Steps:**
1. Read every file under `dashboard/src` and `dashboard/index.html`.
2. Run the app (`npm run dev` plus the API) and drive it in a real browser with a throwaway Playwright script kept in `/tmp` (not committed). Record console errors and warnings on load, on each click, while running `broken` and `fixed`, and with the API stopped. Check every button and link, each control with the keyboard, the skip link, Tab order, 200% zoom, and `prefers-reduced-motion`.
3. Write `docs/audit-before.md` with three tables:
   - **Sections** on the single page, file and line, and the destination page (REQ-PAGE-04).
   - **Accessibility controls**: Calm, Sound, skip link, high contrast (missing), text size (missing), reset (missing), persistence, first-paint, anything else found. For each: exists? works? why not?
   - **Dead or broken things**: every button or link that does nothing, links to a hash anchor, throws a console error or warning, or shows fixed text as a result.
   Each row: ID, file:line, what happens, evidence (**observed in a browser** or **from reading code only**), fix task.
4. Seed the tables with design section 2 and correct anything the browser shows differently.
**Verified by:** every finding in design section 2 appears or is marked "not reproduced"; every row has an evidence label and a fix task; `git status` shows only `docs/audit-before.md` added.
**Stop:** show you the audit before TASK-02 starts.

---

## Phase 1 - Router and layouts

### TASK-02 Tooling, manifest, router, empty layouts
**Satisfies:** REQ-ROUTE-01, REQ-ROUTE-02, REQ-ROUTE-04, REQ-ROUTE-05, REQ-ROUTE-06, REQ-NAV-01
**Steps:**
1. Add `react-router-dom` pinned to an exact version. Add `dashboard/vercel.json` (rewrite) unless it exists.
2. Write `src/routes.ts` (design section 4) with every route, titles, H1, `shows`, `next`, lazy `page`.
3. Write `router.tsx` per design section 5 with `RootLayout`, `MarketingLayout`, `AppLayout` (plain wrappers for now: a placeholder header and `<Outlet/>`), `basename` from `BASE_URL`, a catch-all that renders a minimal "Page not found" heading.
4. Every route renders a `StubPage` (manifest H1, `shows`, "This page is being built") except `/`, which renders `LegacyHome` (the current `App`, unchanged). Move `ImmersionProvider` into `RootLayout`.
5. `main.tsx` renders `<RouterProvider>`.
**Verified by:** `npm run build`; `npm test` still passes; Vitest: manifest paths unique, titles unique, each route has `h1` and `shows`; manual: `/` works as before, `/try` shows its stub, refresh on `/app/scans` works under `vite preview`.

### TASK-03 Page template, layouts and navigation chrome
**Satisfies:** REQ-NAV-01 to REQ-NAV-08, REQ-PAGE-01
**Closes:** hash-link nav, duplicated Kiro CTA, `activeSection` state.
**Steps:**
1. `PageTemplate`, `PageHeader` (H1 with `data-page-title`, `tabIndex=-1`, "What this page shows"), `NextStep`.
2. `Header`, `PrimaryNav` (`NavLink`, `aria-current`, underline for current), `MoreMenu` disclosure, `MobileMenu`, `Footer` (links + "Built with Kiro"), `Sidebar`, `Breadcrumbs`.
3. `MarketingLayout` and `AppLayout` use them. Header has a placeholder slot for the Accessibility button (filled in TASK-12). The header "Kiro" CTA is gone. `LegacyHome` no longer renders `TopNav`.
4. `--header-h` and `scroll-padding-top` in CSS.
**Verified by:** Vitest: nav renders from the manifest; exactly one `aria-current="page"` per location (`MemoryRouter` per route); breadcrumb last item equals H1; More disclosure opens, Escape closes and returns focus; jest-axe on header, footer, sidebar, breadcrumbs; manual: every link goes to its stub page.

---

## Phase 2 - Move page components out of the single page

Each task moves one group, makes the page real, deletes the matching part of `LegacyHome`, and closes the audit rows for those components.

### TASK-04 Run state and `/try`
**Satisfies:** REQ-PAGE-04, REQ-REAL-01, REQ-REAL-03, REQ-REAL-04, REQ-REAL-06, REQ-REAL-07, REQ-REAL-08
**Steps:**
1. `RunProvider` (design section 11) in `RootLayout`, using the existing fetch and `EventSource` code from `App.tsx`, including `RunNotice`.
2. `/try`: `RunControls`, `PossessionMode`, `GhostHuntSection`, live steps. "Primary action" is the Run button.
3. Fix D8: remove fixed Voice Agent and Ghost Hunter outcome rows and the `'div.pay-btn'` fallback; derive Keyboard Agent rows from events and verdict; Voice Agent "Planned, not run". Replace the four Possession Mode sidebar links with plain list items.
4. `OfflineState` shown when the API does not answer, with Retry.
**Verified by:** Vitest: provider survives unmount of a page component, offline gives the offline state, 429 and 403 give notices, no fixed outcome rows in markup without a result; manual: run `broken` and `fixed`, navigate away and back mid-run, stop the API and see the offline state; no console output.

### TASK-05 Runs list endpoint and `/results`
**Satisfies:** REQ-REAL-05, REQ-PAGE-04, REQ-REAL-03
**Steps:** add `GET /runs?limit=` to `agent/api/main.py` with tests in `agent/tests`; `useRuns`; `/results` page with `ResultsSection`, `OutcomeCard` and a runs table (`agent_mode`, verdict, reason code, "Recorded run, not live" for seeded rows). Metrics from the latest run only; others `--`.
**Verified by:** pytest: ordering, limit cap at 50, seeded flag, no `result` body in the list; Vitest: empty state, offline state, `--` for unmeasured; manual: shows the two runs just made.

### TASK-06 Home
**Satisfies:** REQ-PAGE-02, REQ-PAGE-03, REQ-STEER-01
**Steps:** `HeroSection` shortened (remove the Run button); `LoopSummary` (Find, Experience, Fix, Verify, Prevent, one plain line each, link to the page that explains it); calls to action: "Possess This App" as a `Link` to `/try`, "How it works" secondary. Glossary meaning beside "Ghost" and "Possession Mode" at first use. Remove `LegacyHome` render of these parts.
**Verified by:** Vitest: no content of other pages on Home; "Possess This App" is an `<a href="/try">`; a click navigates and does not start a run (API not called); manual check at 375px.

### TASK-07 Kiro, How it works, Agents, Fixes
**Satisfies:** REQ-PAGE-04, REQ-PAGE-05, REQ-PAGE-08, REQ-REAL-01
**Steps:** `/kiro` with `KiroIntegrationSection` limited to evidence that exists; `/how-it-works` with the loop and `AgentCard` roles from `content/agents.ts`; `/app/agents`; `/app/fixes` with `NotAvailableState` naming the endpoint, the illustrative diff clearly labelled, and no Approve/Reject buttons (D8). Delete `PipelineSection` tabs unless the audit shows they are keyboard complete and tied to real data; if kept, add arrow-key handling.
**Verified by:** Vitest: no handler-less buttons on these pages; jest-axe; manual keyboard pass.

### TASK-08 Remaining pages
**Satisfies:** REQ-PAGE-05, REQ-PAGE-06, REQ-PAGE-07, REQ-PAGE-08, REQ-STEER-03
**Steps:** `/trust`, `/roadmap`, `/about` (with "Built with Kiro"), `/accessibility` (control guide now, limitations filled in TASK-18), `/glossary`; `/app` Overview (latest run, tiles `--`), `/app/journeys` (start link to `/try` and runs on this server), `/app/scans`, `/app/regression`, `/app/reports`, `/app/night-watch` (not-available states).
**Verified by:** content scan test: no lorem ipsum, no invented numbers (numbers must be read from data or `--`); writing check by eye at about grade 8; jest-axe per page.

### TASK-09 Retire the single page
**Satisfies:** REQ-ROUTE-03, REQ-REAL-01
**Steps:** delete `App.tsx`, `LegacyHome`, `TopNav.tsx` and `id="home"|"scans"|"journeys"|"fixes"|"kiro"|"reports"` anchors; confirm no `href="#...` remains except the skip link.
**Verified by:** Vitest source scan finds no `href="#`; build passes; every audit row for hash navigation is closed.

---

## Phase 3 - Navigation and route announcer

### TASK-10 `useRouteAnnouncer`, live region, skip link, loading status
**Satisfies:** REQ-ROUTE-07, REQ-ROUTE-10, REQ-ROUTE-11, REQ-SKIP-01, REQ-SKIP-02
**Steps:** `LiveRegion` and `announce()` (with the small queue); `useRouteAnnouncer` (design section 6); `SkipLink` as first focusable with `preventDefault` and `main.focus()`; `NavigationStatus` for the loading state and `aria-busy`; reserve heights.
**Verified by:** Vitest with memory router: title, focus on H1, announcer text, no focus move on first load or hash change; Playwright smoke (full suites come later): Home to Try to Results, Back, Forward: focus on the H1, scroll 0, unique titles; skip link is the first Tab stop and the URL does not change.

---

## Phase 4 - SettingsProvider and global styles

### TASK-11 Tokens to variables, `rem` sizing, data attributes
**Satisfies:** REQ-SET-04, REQ-CONTRAST-02, REQ-TEXT-02, REQ-TEXT-03
**Closes:** hard-coded hex, px text sizes, `overflow-x: hidden`.
**Steps:**
1. Convert `tailwind.config.js` colours to `rgb(var(--c-...) / <alpha-value>)`; define channels in `index.css` for the normal set. Move remaining hex (Hero gradient, `.code-block`, tokens) into variables.
2. Convert `[Npx]`, `min-h-[Npx]` and inline px sizes to rem. Information-carrying labels at least 0.875rem.
3. `html { font-size: var(--text-scale) }`; delete `overflow-x: hidden`; fix the overflows that appear.
4. Add `data-text-size` and `data-contrast` rule blocks (values filled in TASK-13/14).
**Verified by:** the look at default settings is unchanged (side-by-side screenshots of Home, `/try`, `/results` before and after, checked by eye); Vitest source scan: no hex outside `tailwind.config.js` and `index.css`, no px font sizes; build and existing 27 tests pass.

### TASK-12 `SettingsProvider`, storage, pre-paint script, panel shell
**Satisfies:** REQ-SET-01, REQ-SET-02, REQ-SET-05, REQ-SET-06, REQ-SET-07, REQ-SET-08
**Steps:** `settings/` module (design section 8): store, migration of old keys, storage failure handling, system reduced-motion listener, `storage` event, announcer calls; inline script in `index.html`; `AccessibilityMenu` disclosure in the header slot and `SettingsPanel` on `/app/settings` (empty control list filled by TASK-13 to 17); `ImmersionProvider` reads Calm from the provider; `SenseControls.tsx` deleted.
**Verified by:** Vitest: defaults, persist, migrate `haunted-audit.calm=on`, blocked storage (setter throws) keeps working and flags `saveFailed`, system reduced motion gives effective Calm, `storage` event syncs; Playwright smoke: set value, reload, attribute present on `domcontentloaded` (script ran before app).

---

## Phase 5 - Each control in turn

Each task adds one control to the panel, its CSS, its announcements, its tests, and re-tests the audit rows for that control.

### TASK-13 Calm mode
**Satisfies:** REQ-CALM-01 to REQ-CALM-05
**Closes:** Hero reduced-motion hook, dead pulses, Calm not reaching running layers.
**Steps:** `CalmControl` (button, `aria-pressed`, system lock text); `src/motion/` gate (`useMotionAllowed`, `useMotionFrame`); replace `usePrefersReducedMotion` in `HeroSection`; make AmbientLayer/Scene unmount on Calm; `document.getAnimations()` cancel sweep on change; source-scan test.
**Verified by:** Vitest: control states, lock, scan test; Playwright: with the ambient layer running, turning Calm on leaves zero running animations and no ambient scene node; the 3D chunk is not requested with Calm on; `emulateMedia({reducedMotion:'reduce'})` loads with Calm on and disabled; persists across reload and navigation.

### TASK-14 High contrast
**Satisfies:** REQ-CONTRAST-01 to REQ-CONTRAST-04
**Steps:** `ContrastControl`; high-contrast channel values in `index.css`; `scripts/contrast-check.mjs` computing ratios for each text and background pair (7:1 text, 4.5:1 UI and focus ring); flat panels, no glow, solid 2px borders, no ambient; check ghost states keep text labels and different icon shapes; check the parchment Outcome card.
**Verified by:** `contrast-check` passes for both sets; Vitest: attribute toggles; Playwright: computed colours equal tokens; screenshots of Home, `/try`, `/results`, `/app` looked at by eye; jest-axe `color-contrast` is not reliable in jsdom, so axe in Playwright (TASK-19) is the real gate.

### TASK-15 Text size
**Satisfies:** REQ-TEXT-01 to REQ-TEXT-04
**Steps:** `TextSizeControl` (`fieldset` + four radios); variables for 87.5, 100, 125, 150; fix every layout that breaks at Largest and at 200% zoom (wrapping, grids, fixed heights, header height); labelled scroll regions for code blocks.
**Verified by:** Playwright: root font-size is 14, 16, 20, 24 px for the four steps; no horizontal overflow at Largest and at 200% zoom on every route; persists.

### TASK-16 Sound
**Satisfies:** REQ-SOUND-01, REQ-SOUND-02
**Steps:** confirm by search that no audio code exists; leave no Sound control; add a one-line note in `docs/audit-after.md` and in the `/accessibility` page ("No sound is played on this site"). If you decide to add audio later, a new spec covers it.
**Verified by:** source scan: no `AudioContext`, `new Audio(`, `<audio`; no element named Sound in the header.

### TASK-17 Skip link and Reset
**Satisfies:** REQ-SKIP-01, REQ-SKIP-02, REQ-SET-09
**Steps:** finish `ResetControl`; check skip link visibility on every layout, not covered by the header, and that the next Tab lands inside `main`.
**Verified by:** Vitest: reset restores defaults, clears storage, announces; Playwright: skip link first and visible on focus, focus moves to `main`, URL unchanged, Tab then reaches the first control in `main`.

---

## Phase 6 - Error and not-found pages

### TASK-18 Error boundary, not found, `/accessibility` limitations
**Satisfies:** REQ-ROUTE-08, REQ-ROUTE-09, REQ-PAGE-06, REQ-REAL-02
**Steps:** `RouteError` (inside the shell; chunk-load message and Reload; Try again; no stack text), `NotFoundPage`, `AppNotFoundPage`, top-level `ErrorBoundary` in `main.tsx` for failures outside any route; spooky line plus plain line; links Home and Overview. Fill the `/accessibility` limitations from what the tests found.
**Verified by:** Vitest: a throwing page shows the in-shell error with header intact and no stack; chunk failure shows the Reload text; Playwright: unknown path and `/app/nope` show the right pages with one H1 and unique titles.

---

## Phase 7 - Tests

### TASK-19 Playwright setup
**Satisfies:** REQ-TEST-09
**Steps:** `playwright.config.ts` with two web servers (design section 12); console/pageerror/request-failure fixture; `npm run test:e2e`; CI job update; `npx playwright install` note in README.
**Verified by:** a trivial spec passes locally and in CI.

### TASK-20 Route, navigation and keyboard suites
**Satisfies:** REQ-TEST-01, REQ-TEST-02, REQ-TEST-04
**Steps:** `routes.spec.ts`, `navigation.spec.ts` (including layout shift), `keyboard.spec.ts`, `hosting.spec.ts`.
**Verified by:** all pass on a production build; deliberately breaking focus placement or `aria-current` fails them (checked once, then reverted).

### TASK-21 Control suites
**Satisfies:** REQ-TEST-03
**Steps:** `controls.spec.ts` for Calm, high contrast, text size, skip, reset, blocked storage, system reduced motion.
**Verified by:** all pass; each assertion checks the visible effect, reload persistence and persistence across a route change.

### TASK-22 Axe, dead controls, live backend
**Satisfies:** REQ-TEST-05, REQ-TEST-06, REQ-TEST-07, REQ-TEST-08, REQ-REAL-02
**Steps:** `axe.spec.ts` (every route x normal, Calm, high contrast, zero violations); `dead-controls.spec.ts`; `live.spec.ts` with the real API and the offline case; remaining Vitest source scans.
**Verified by:** zero violations in all 3 modes on all routes; zero console output; real `broken` gives `BLOCKED/TARGET_NOT_FOCUSABLE` and `fixed` gives `PASSED` from the API; offline state appears when requests are aborted.

---

## Phase 8 - Audit after

### TASK-23 Re-test and write `docs/audit-after.md`
**Satisfies:** REQ-AUDIT-03
**Steps:** re-run the TASK-01 browser pass on the finished site; copy the checklist and mark each ID Fixed (test or manual check named), Not fixed (reason) or Removed (reason: Sound button, Approve/Reject, fixed outcome rows, header Kiro CTA); list any new findings; add a short entry to `docs/devlog.md` with the date and what was actually seen; update `product-shell-ia` tasks with a note on which of its tasks this spec covers.
**Verified by:** every ID from `audit-before.md` appears; no "Fixed" without evidence; full suite green in CI; you review the two audit files.

---

## Traceability

| Requirement group | Tasks |
|---|---|
| REQ-AUDIT | 01, 23 |
| REQ-ROUTE | 02, 09, 10, 18 |
| REQ-PAGE | 03, 04, 05, 06, 07, 08 |
| REQ-NAV | 03 |
| REQ-SET | 11, 12, 17 |
| REQ-CALM | 13 |
| REQ-CONTRAST | 11, 14 |
| REQ-TEXT | 11, 15 |
| REQ-SOUND | 16 |
| REQ-SKIP | 10, 17 |
| REQ-REAL | 04, 05, 07, 09, 18, 22 |
| REQ-TEST | 19 to 22 |
| REQ-STEER | all (checked in 23) |
