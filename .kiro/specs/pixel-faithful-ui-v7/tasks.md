# Pixel-faithful UI v7 - Tasks

Order: tokens sampled from the image -> mascot and icon SVGs -> header, sidebar and breadcrumbs -> Home -> Possession Mode -> Agents -> Fix pipeline -> Kiro -> Results -> fidelity screenshots and checklist -> axe and keyboard tests.

Effort numbers are my estimates in hours (not measured, not from your plan). They are there so you can see the size; change them freely.

## Rules for every task

- **The site stays working after every task.** `/` keeps rendering the old single page (`LegacyHome`) until TASK-05. After each task: `npm run build`, `npm test`, and a manual check that a run can still be started.
- **Stop after each page** (TASK-05 to TASK-10) and show you: the page screenshot, the side-by-side image, and that page's checklist in `docs/ui-fidelity.md`. The next page does not start without your OK (REQ-FID-05).
- **Copy first.** Before each page task, read that panel from the image at native resolution and write its exact copy in `docs/ui-fidelity/copy.md`; raise any difference from this spec (REQ-FID-06).
- No invented values, no sample data in shipped code, `--` and "not yet measured" for anything unmeasured, `agent_mode` beside results.
- No colour literal outside `tailwind.config.js`, `src/index.css` and `src/art/`; no text under 16px; no emoji art; no external URLs; no `href="#"`.
- Use Spec mode per page where it grows past an hour, vibe mode for small edits. One branch per task: `feature/ui-v7-<name>`; one pull request each with the template filled in; read every diff.
- Every failure you find goes into `evals/cases.yaml`; one line per task in `docs/devlog.md`.
- No backend changes (REQ-DATA-05). If a page needs data that does not exist, show the "Not available yet" state and note it in `docs/ui-fidelity.md`.
- Nothing is committed without your approval.

---

## Phase 0 - Decisions

### TASK-00 Settle the open decisions (you)
**Effort:** 0.5 (your time)
Answer D2 (prefilled Alex Carter and amount), D4 and D20 (real fixture in an iframe, and whether the fixture may be restyled), D17 (plain-English lines hidden or visible), D16 (Settings button), D5 (sidebar placement), D12/D13, D18 (which routes win). Until D2/D4 are answered the Possession task cannot start.
**Verified by:** the table in `requirements.md` has an answer beside each row.

---

## Phase 1 - Tokens, type, art

### TASK-01 Sample tokens, panel boxes and copy from the image
**Satisfies:** REQ-TOK-01, REQ-TOK-02, REQ-TOK-04, REQ-FID-06
**Effort:** 3
**Steps:**
1. Measure the six panel boxes in `design/Haunted_Audit_Final_UI_v7.png` (zoom the PNG, note pixel corners) and write `design/panels.json`.
2. For each token in design section 2, choose a flat pixel position (check by cropping a 20 x 20 area and looking at it), then write `scripts/sample-tokens.py` that reads the PNG with Pillow, takes the 5 x 5 median at each recorded position, and writes `design/tokens.json` (`name, hex, x, y, panel`).
3. `scripts/build-tokens.mjs` writes `src/styles/tokens.css` (CSS variables as space-separated channels) and a Tailwind colour map; update `tailwind.config.js` to use `rgb(var(--c-...) / <alpha-value>)`; remove hex literals from `index.css` and components that carried them (the `HeroSection` gradient and `.code-block` are known).
4. `scripts/contrast-check.mjs`: for each text and background pair in use compute the ratio; write adjusted tokens to `docs/ui-fidelity.md` with sampled value, used value and reason (REQ-TOK-04).
5. Read every panel's copy at native resolution; write `docs/ui-fidelity/copy.md` including the Amount text ("EUR 50.00" or the euro sign form), and flag any difference from `requirements.md`.
**Verified by:** re-running `sample-tokens.py` gives an identical `tokens.json`; a Vitest test fails if `tailwind.config.js` or `tokens.css` differs from `tokens.json`; a source scan finds no hex outside the allowed files; the app still builds and looks as before except changed token values (spot check Home, `/`, run).

### TASK-02 Self-host fonts and set the 16px type scale
**Satisfies:** REQ-TYPE-01, REQ-TYPE-02, REQ-TYPE-03
**Effort:** 2
**Steps:**
1. Install `@fontsource/uncial-antiqua`, `@fontsource/inter`, `@fontsource/jetbrains-mono` at exact versions; import only the weights in use from `main.tsx`.
2. Remove the Google Fonts links from `index.html`; remove `MedievalSharp` from `tailwind.config.js`; keep the display font on the wordmark component only.
3. Set the base to 1rem and convert every `text-xs`, `text-sm` and `text-[Npx]` in `src/components` and `src/immersion` to a 16px-or-larger step. List the places where cards had to grow.
**Verified by:** a network check (Playwright `page.on('request')`) shows no request to another origin; a source scan finds no `text-xs`, `text-sm`, px font sizes, or `font-display` outside the wordmark; a Playwright check finds no text node under 16px on `/`; `npm test` still passes.

### TASK-03 Mascot and icon SVGs
**Satisfies:** REQ-ART-01, REQ-ART-02, REQ-ART-03, REQ-ART-04, REQ-TYPE-04
**Effort:** 5
**Steps:**
1. `src/art/Ghost.tsx` (ready with witch hat, blocked angry, verified happy), `GhostIcon.tsx`.
2. `src/art/Icons.tsx`: keyboard, microphone, target, magnifier with `</>`, laptop with accessibility symbol, check, cross, warning, bank, folder, file, bolt, code, play, arrow.
3. `Pumpkin.tsx`, `Bat.tsx`, `Parchment.tsx` (scroll), plus moon, castle and tombstone parts (finished in TASK-05).
4. Replace every emoji in `src/` with the matching SVG (11 places: `GhostMascot`, `HeroSection`, `AmbientScene`, `PossessionMode`, `KiroIntegrationSection`).
5. A small gallery route `/dev/art` (development only, not in the build) to look at every SVG at 1x and 3x next to the image crops.
**Verified by:** unit tests per state and per icon (colour variable, face, `aria-hidden` or title); jest-axe on each; a source scan finds no emoji outside tests; compare the three mascot states and the tiny icon with the image crops by eye and note differences in `docs/ui-fidelity.md`.

---

## Phase 2 - Shell

### TASK-04 Router, layouts, header, breadcrumbs, sidebar, footer, announcer, settings
**Satisfies:** REQ-SHELL-01 to REQ-SHELL-10, REQ-NAV-01 to REQ-NAV-04
**Effort:** 6 (less if `multipage-routing-controls` TASK-02, 10 and 12 are already built)
**Steps:**
1. Add `react-router-dom` (exact version) and `dashboard/vercel.json` (SPA rewrite) if not present. `routes.ts` with the seven routes, titles, H1s, and redirects (REQ-NAV-01). Every route except `/` renders a stub with its H1 until its task.
2. `RootLayout` (providers, `SkipLink`, `LiveRegion`, `useRouteAnnouncer`), `SiteLayout` (header, main, footer), `JourneyLayout` (breadcrumb + sidebar + main).
3. `Header`, `PrimaryNav`, `MobileMenu`, `SettingsMenu` (Calm, High contrast, Text size, Reset) per `multipage-routing-controls` sections 8 and 9, `Footer` with "Built with Kiro", `Breadcrumbs`, `JourneySidebar`.
4. `/scans` page with `NotAvailableState` (REQ-SHELL-04). `NotFound` page with ways back.
5. The old single page stays at `/` as `LegacyHome` (its own `TopNav` removed; the new header replaces it).
**Verified by:** Vitest: `aria-current` exactly once per route, breadcrumb text, sidebar targets, nav targets, redirects; jest-axe on header, footer, sidebar; Playwright: every route loads by direct link and refresh, focus on the H1 after in-app navigation, Back and Forward, live-region text; manual: keyboard through header and Settings; compare header with the image (stop only if the header differs a lot; the page-level stops start at TASK-05).

---

## Phase 3 - Pages (stop after each one)

### TASK-05 Home
**Satisfies:** REQ-HOME-01 to REQ-HOME-06
**Effort:** 6
**Steps:** build `GraveyardScene` in layers (design 5.3), `HeroBlock`, the primary link, the four pills, decorative animation tied to Calm; remove `LegacyHome` for `/`; plain-English text per D17.
**Verified by:** Vitest text and structure tests (the `data-art` layers, one H1, one primary action, four non-focusable pills); Playwright: click "Possess This App" navigates and sends no request; with Calm on no running animation; axe zero in three modes; screenshot at 1440 px + side-by-side + checklist.
**STOP:** review Home.

### TASK-06 Possession Mode
**Satisfies:** REQ-POS-01 to REQ-POS-10, REQ-ART-05, REQ-DATA-01 to REQ-DATA-04
**Effort:** 10 (add 3 if the fixture restyle D20 is approved)
**Steps:**
1. `scripts/copy-fixture.mjs` and the `predev`/`prebuild` hooks; test that the copy has `recipient`, `amount`, `send-payment`.
2. Move run logic from `App.tsx` into `RunProvider` (X5), keeping `RunNotice` for 429, 403 and offline.
3. `BankFrame` (iframe stage, scale rule X9), `useJudgeFocus`, `PossessionPanel`, `RunControls`, `GhostPin`, `TooltipCard`, `tooltip.ts` table, `OfflineState`.
4. Optional, only if you approved D20: a separate branch that restyles the fixture's CSS and layout to the image, keeping every id, role, handler and variant behaviour; a test compares the id list before and after; the Verifier and agent tests must still pass.
5. Replace the Possession part of the old page; keep the rest working.
**Verified by:** Vitest for `useJudgeFocus` (8 distinct stops, return to first, send-payment never focused) and for the tooltip table; Playwright with the real API: Tab inside the iframe turns "Tab to Recipient" and "Tab to Amount" green at the right key presses and the third item red when stuck; "Barrier Detected!" absent before a BLOCKED result; run `broken` then `fixed` gives red then green states; ghost box does not intersect the control box; offline state with aborted requests; axe in three modes; screenshots for Ready, judge-stuck, Blocked and Verified; side-by-side + checklist.
**STOP:** review Possession Mode.

### TASK-07 Agents
**Satisfies:** REQ-AGT-01 to REQ-AGT-07
**Effort:** 5
**Steps:** `agentRows.ts` and `ghostCard.ts` (design 6.3, with the rows for FOCUS_TRAP, NO_ACTIVATION, STEP_LIMIT and TIMEOUT written and reviewed), `AgentCard`, `GhostHuntCard`, the drawn tile (REQ-AGT-05), `Timeline`, "Run a journey first" and offline states; Voice Agent "voice-command simulation, not run yet".
**Verified by:** table-driven Vitest from three stored results (broken, fixed, none); no image row appears without its data; Playwright with a real scripted run: Keyboard and Ghost Hunter rows appear, the timeline fills live; axe; screenshots; side-by-side + checklist.
**STOP:** review Agents.

### TASK-08 Fix pipeline
**Satisfies:** REQ-FIX-01 to REQ-FIX-07
**Effort:** 7
**Steps:** `StepStrip` (links, `aria-current="step"`, check marks), Back/Next, `FixCard` with `DiffView` and Approve/Reject wired to the contract in `.kiro/specs/exorcist/`, `VerifyCard`, `RegressionCard`, `NotAvailableState` for each missing backend, `contract-mocks.ts` for tests only.
**Verified by:** Vitest for `DiffView` (sign and word on each line), strip states, and not-available states; Playwright with mocked contract data: one step at a time, Back/Next by keyboard, Approve and Reject work by keyboard and a second decision is refused; the "ghost is back" sentence is absent unless pass-then-fail data exists; without mocks the three cards show "Not available yet" and no buttons; axe; screenshots labelled "mocked contract data"; side-by-side + checklist.
**STOP:** review the Fix pipeline.

### TASK-09 Kiro
**Satisfies:** REQ-KIRO-01 to REQ-KIRO-05
**Effort:** 4
**Steps:** `scripts/gen-kiro-tree.mjs` and generated JSON, `KiroTree` (ARIA tree), `CodeView`, `HookCard`, the "Built with Kiro" pill as plain text.
**Verified by:** a test compares the tree with `git ls-files .kiro`; the displayed code equals `.kiro/hooks/axe-on-save.json`; the word "Live" appears nowhere unless real data exists; keyboard test (arrows, Home, End); axe; screenshot; side-by-side + checklist.
**STOP:** review Kiro.

### TASK-10 Results
**Satisfies:** REQ-RES-01 to REQ-RES-03
**Effort:** 4
**Steps:** `resultTiles.ts`, `outcomeTicks.ts`, `StatTile`, `OutcomeCard` with `Parchment` and the mascot state rule.
**Verified by:** with no data all four tiles show `--` and "not yet measured" and the denominator 6 never appears; with mocked contract data they show numbers; four-state test for the Outcome ticks and mascot colour; source scan finds no numeric metric literals and no "[x]"/"[n]"; axe; screenshots; side-by-side + checklist.
**STOP:** review Results.

---

## Phase 4 - Fidelity record and tests

### TASK-11 Fidelity screenshots and checklist
**Satisfies:** REQ-FID-01 to REQ-FID-04
**Effort:** 3
**Steps:** `dashboard/e2e/ui-fidelity.mjs` (1440 px wide, real API where it exists, mocks otherwise), `scripts/ui-fidelity-sheet.py` (crops from `panels.json`), finish `docs/ui-fidelity.md` with the five-line checklist per page, the list of differences and reasons (16px floor, contrast adjustments, Settings button, footer, fixture look, wordmark font, Voice Agent rows, thumbnail tile, Kiro tab name, Example result label, Results `--`), and the label "real API" or "mocked contract data" per image.
**Verified by:** seven screenshots and seven side-by-side images exist; every page has all five checklist lines; every "Differs" has a reason; you review the sheet.

### TASK-12 Axe, keyboard, zoom, motion, console
**Satisfies:** REQ-A11Y-01 to REQ-A11Y-05, REQ-TEST-01 to REQ-TEST-06
**Effort:** 5
**Steps:** Playwright suites per design section 10; axe on every route in normal, Calm and high contrast; keyboard-only walk; 200% zoom (640 px viewport) and Largest text size with no horizontal scroll except labelled regions; reduced motion; console and cross-origin fixture; CI job runs the suite with the real API.
**Verified by:** all pass in CI; breaking focus placement or removing an `aria-current` makes a test fail (checked once, then reverted).

### TASK-13 Retire the old page and close out
**Satisfies:** REQ-NAV-01, REQ-DATA-01
**Effort:** 1.5
**Steps:** delete `App.tsx`, `LegacyHome`, the old `PossessionMode`, `GhostHuntSection`, `PipelineSection`, `KiroIntegrationSection`, `ResultsSection`, `HeroSection`, `TopNav`, `GhostMascot` that are no longer imported; update `README.md` (routes, `npm run ui:shots`); add a line to `docs/devlog.md`; update `docs/plan-status.md` rows 1.6 and 2.5 with evidence; record the waits in `docs/waiting-on.md`.
**Verified by:** the build and all suites pass with the old files gone; a scan finds no `href="#`.

---

## Effort summary (estimates)

| Phase | Hours |
|---|---|
| Decisions (you) | 0.5 |
| Tokens, fonts, art | 10 |
| Shell | 6 |
| Pages (Home 6, Possession 10, Agents 5, Fix 7, Kiro 4, Results 4) | 36 |
| Fidelity, tests, close out | 9.5 |
| **Total (without fixture restyle)** | **62** |

That is more than the time left before Wed 25 Nov in `docs/plan-status.md`. Suggested order if time is short: TASK-01 to 04, then Possession (06), Agents (07) and Home (05), because they carry the demo; Fix, Kiro and Results can ship as "Not available yet" states with their frames.

---

## Traceability

| Requirement group | Tasks |
|---|---|
| REQ-TOK | 01 |
| REQ-TYPE | 02, 03 |
| REQ-ART | 03, 06 |
| REQ-SHELL | 04 |
| REQ-NAV | 04 |
| REQ-HOME | 05 |
| REQ-POS | 06 |
| REQ-AGT | 07 |
| REQ-FIX | 08 |
| REQ-KIRO | 09 |
| REQ-RES | 10 |
| REQ-A11Y | 04 to 12 |
| REQ-DATA | 06 to 10 |
| REQ-FID | 01, 05 to 11 |
| REQ-TEST | 12 |
