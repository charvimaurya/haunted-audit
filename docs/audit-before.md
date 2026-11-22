# Haunted Audit dashboard — Stage 0 audit (before rebuild)

**Date:** Sat 21 Nov 2026  
**Scope:** `dashboard/` only (read). This file is the Stage 0 deliverable.  
**Reference:** Final UI v7 collage (`design/Haunted_Audit_Final_UI_v7.png` / attached image).  
**App code changed in Stage 0:** none.

---

## 1. Routes inventory

Source of truth: `dashboard/src/routes.ts` + `dashboard/src/AppRoutes.tsx`.

| Path | Page component | H1 / notes |
|------|----------------|------------|
| `/` | `pages/Home.tsx` | Hero H1 “Haunted Audit”; also embeds Possession, Ghost Hunt, Pipeline, Kiro, Results panels (long scroll) |
| `/scans` | `pages/Scans.tsx` | “Scans” — placeholder “Not available yet” (needs `POST /scan`) |
| `/journeys/send-payment` | redirect → `possession` | |
| `/journeys/send-payment/possession` | `pages/Possession.tsx` | Run controls + PossessionMode |
| `/journeys/send-payment/agents` | `pages/Agents.tsx` | GhostHuntSection |
| `/journeys/send-payment/fixes` | redirect → `find` | |
| `/journeys/send-payment/fixes/:step` | `pages/FixStep.tsx` | `find` \| `fix` \| `verify` \| `regression` |
| `/kiro` | `pages/Kiro.tsx` | KiroIntegrationSection |
| `/reports` | `pages/Reports.tsx` | ResultsSection (metrics `--` until measured) |
| `*` | `pages/NotFound.tsx` | “Page not found” |

**Nav (`NAV` in `routes.ts`):** Home, Scans, Journeys → possession, Fixes → find, Kiro, Reports. Extra TopNav CTA also links to `/kiro`.

**Already present (Stage 1 partial):** React Router, lazy routes, shared `RootLayout`, SPA rewrite in `dashboard/vercel.json`, unique `document.title`, scroll-to-top + H1 focus + `aria-live` announce via `useRouteAnnouncer`, plain-English “shows” line via `Page` / `PageHeading`.

**Gap vs Stage 1 target:** No marketing routes (`/how-it-works`, `/try`, `/results`, `/trust`, `/roadmap`, `/about`, `/accessibility`). No `/app/*` shell. Home still stacks every panel as in-page sections (`#journeys`, `#scans`, `#fixes`, `#kiro`, `#reports`).

---

## 2. Components and state

### Providers / context

| Module | Role |
|--------|------|
| `immersion/ImmersionContext.tsx` | Calm mode, sound flag, quality budget (`full` / `reduced` / `static`), `motionAllowed`. Persists calm/sound to `localStorage`. Sets `html[data-calm]` / `html[data-quality]`. |
| `runs/RunProvider.tsx` + `runs/runContext.ts` | Live run: `variant`, `mode`, `runStatus`, `result`, `liveEvents`, `notice`, `run()`. `POST /runs` + SSE `/runs/{id}/events` + `GET /runs/{id}`. API base `VITE_API_URL` or `http://127.0.0.1:8000`. |
| `main.tsx` | Wraps `ImmersionProvider` → `BrowserRouter` → `AppRoutes`. |

### Layout / chrome

- `layouts/RootLayout.tsx` — skip link, TopNav, main, footer, live region  
- `components/TopNav.tsx` — desktop + mobile burger nav, SenseControls, Kiro CTA  
- `components/Page.tsx`, `PageHeading.tsx`, `NextStep.tsx`, `JourneyNav.tsx`

### Feature panels (v7 collage mapping)

| Design panel | Component(s) |
|--------------|--------------|
| Hero / landing | `HeroSection`, `HeroScene`, `HeroCastle`, `AmbientLayer` / `AmbientScene` |
| Possession / Haunted Bank | `PossessionMode`, `PossessionGhost`, `RunControls`, `RunNotice` |
| Ghost Hunt / agents | `GhostHuntSection`, `AgentCard` |
| Find → Fix → Verify → Regression | `PipelineSection`, `CodeBlock` |
| Kiro integration | `KiroIntegrationSection` |
| Results / Outcome | `ResultsSection`, `MetricValue`, `OutcomeCard` |
| Mascot | `GhostMascot` (ready / blocked / verified) |

### Immersion helpers

- `immersion/SenseControls.tsx`, `motion.ts`, `scene3d.ts`, `AmbientLayer.tsx`, `AmbientScene.tsx`

### Lib / types / styles

- `lib/announce.ts`, `lib/useRouteAnnouncer.ts`  
- `types/index.ts` — mirrors backend journey/run types  
- `index.css` — tokens, reduced-motion + calm CSS, focus-visible, ambient keyframes  
- Tests under `src/test/` (routes, a11y, immersion, hero-castle, runnotice)

---

## 3. Dead / inert controls

Controls that look interactive but do nothing useful (or only toggle cosmetic state):

| Control | Location | Behaviour |
|---------|----------|-----------|
| **Approve Fix** | `PipelineSection` | `<button>` with no `onClick` / no API |
| **Reject** | `PipelineSection` | Same — dead |
| **Sound on/off** | `SenseControls` | Toggles `aria-pressed` + `localStorage`; **no audio element, no playback** anywhere |
| **Haunted Bank sidebar links** (Dashboard / Send Payment / Accounts / Transactions) | `PossessionMode` | All `href="#journeys"` — do not change bank “pages”; demo chrome only |
| **Send Payment** (broken demo) | `PossessionMode` | `role="button"` + `aria-disabled`; Enter/Space only `preventDefault` — intentional fixture, not a real submit |
| **Send Payment** (fixed demo) | `PossessionMode` | Real `<button>` with no submit handler |
| **Recipient / Amount inputs** | `PossessionMode` | Local typing only; “not sent to the agent run” (comment in source) |
| **Hero Detect / Fix / Verify / Prevent pills** | `HeroSection` | Static `<li>` labels (not buttons) — look like chips; not linked |
| **Kiro file tree / editor tab** | `KiroIntegrationSection` | Decorative illustration; not interactive |
| **Kiro Hook (Live) events** | `KiroIntegrationSection` | Hardcoded `DEFAULT_EVENTS` — not live |
| **Ghost Hunt agent outcome rows** | `GhostHuntSection` | Hardcoded pass/fail copy even with disclaimer when `result === null`; not driven by measured agent data until a run (and still mostly static labels) |
| **Pipeline verification checklist** | `PipelineSection` | First three steps hardcoded `done: true` even with no run — misleading |
| **Outcome card checks** | `OutcomeCard` | Always shows green checks for three outcomes regardless of `result` |
| **Regression FAILED banner** | `PipelineSection` | Always shown as failed demo copy; not wired to a live regression run |

**Working controls (for contrast):** TopNav links, Possess This App, JourneyNav, NextStep, Pipeline step tabs (navigate via `onSelectStep`), Run Journey + variant/mode selects, Calm mode, mobile burger, skip link, 404 links.

---

## 4. Accessibility controls — status

| Control | Works? | Notes |
|---------|--------|-------|
| **Skip to main content** | Yes | First focusable; `preventDefault` + focuses `#main-content` |
| **Calm mode** | Yes (partial vs Stage 2) | Button + `aria-pressed`; sets `data-calm`; CSS kills animations/transitions; unmounts ambient scene when `motionAllowed` false; persists. **Missing vs Stage 2:** no high contrast, text size steps, mute-as-settings, Reset, `SettingsProvider`, change announcements |
| **Sound / mute** | Partial | UI works; **audio does nothing** (by design today; Stage 2 wants real mute wiring) |
| **prefers-reduced-motion** | Yes | Forces calm (`systemReduce`); CSS `@media (prefers-reduced-motion: reduce)`; hero glow class guarded in JS |
| **Visible focus** | Yes | Global `:focus-visible` + many component rings |
| **16px base / rem zoom** | Mostly | `html { font-size: 16px }`; some labels/code still `text-xs` / `text-[10px]` / `text-[11px]` |
| **Route focus + announce** | Yes | `useRouteAnnouncer` → H1 focus + polite live region |
| **One H1 per page** | Yes on routed pages | Home uses hero H1; nested panels use H2 |
| **Colour-not-only status** | Mostly | sr-only / text labels on steps and events; Outcome icons use `aria-label="achieved"` even when unverified (accuracy issue) |

**Verified in browser (21 Nov 2026):** Calm toggles to pressed, `data-calm="true"`, `localStorage` `haunted-audit.calm=on`, survives navigation. Sound toggles pressed + storage with **0 `<audio>` elements**.

---

## 5. Console errors

**Method:** Vite `npm run dev` on `http://localhost:5173/`; Cursor browser + CDP `Runtime.evaluate` / console hooks; visited `/`, `/journeys/send-payment/possession`, `/scans`, unknown 404 path.

| Finding | Detail |
|---------|--------|
| React/app console errors | **None observed** on home, possession, scans, 404 after load |
| Vite terminal | Started cleanly (`VITE v8.3.6 ready`); no compile errors during audit |
| Backend / network | Not exercised with a live Run (no forced `POST /runs` in this audit). Offline path exists in `RunProvider` (`RunNotice` kind `offline`) |
| Caveat | Console hooks installed after first paint on some navigations; full hard-reload instrumented capture was limited. No redbox / uncaught errors appeared in snapshots |

---

## 6. Gaps vs Final UI v7 (design fidelity)

- Hero: castle / moon / bats / pumpkins / witch-hat ghost exist in SVG pieces (`HeroScene`, `HeroCastle`) but Stage 4 wants a fuller layered scene + gold magnifier mascot alignment with deck slide.  
- Possession: simulated bank UI in-dashboard, not real bank iframe + sessions API (Stage 3).  
- Pipeline: tabs navigate; Approve/Reject dead; timeline shows multiple panels at once (design note D: one step at a time — partially: tabpanel content shows Fix+Verify+Regression columns together).  
- Results: metrics correctly `--` when unmeasured; Outcome card always “achieved”.  
- Mascot legend (purple/red/green) implemented in `GhostMascot`.

---

## 7. Proposed file plan — Stages 1–7

No implementation in Stage 0. Paths are under `dashboard/` unless noted. Prefer edit-in-place over new deps.

### Stage 1 — Real multi-page site

**Create**

- `src/layouts/MarketingLayout.tsx` — header/footer for marketing routes  
- `src/layouts/AppLayout.tsx` — sidebar + breadcrumbs for `/app/*`  
- `src/pages/marketing/` — `HowItWorks.tsx`, `Try.tsx`, `Results.tsx`, `Trust.tsx`, `Roadmap.tsx`, `About.tsx`, `Accessibility.tsx` (plus keep/adapt Home)  
- `src/pages/app/` — `AppHome.tsx`, `Scans.tsx`, `Journeys.tsx`, `Agents.tsx`, `Fixes.tsx`, `Regression.tsx`, `Reports.tsx`, `Settings.tsx`  
- Expand `src/routes.ts` (or split `routes/marketing.ts` + `routes/app.ts`) with new `PageDef`s  

**Change**

- `src/AppRoutes.tsx` — wire marketing + app trees; keep lazy loading + NotFound  
- `src/components/TopNav.tsx` → split or replace with marketing header + app sidebar nav  
- `src/pages/Home.tsx` — remove stacked panels; hero + CTAs only (no scroll-to-section demos)  
- `src/layouts/RootLayout.tsx` — shared skip link / live region only, or compose both shells  
- `src/test/routes.test.tsx` — cover new paths, titles, H1 focus  
- `vercel.json` — keep SPA rewrite (already present)

**Retire / redirect**

- Map old `/journeys/...` and `/scans` etc. to `/app/...` via `<Navigate>` if deep links must survive

### Stage 2 — Accessibility controls that work

**Create**

- `src/settings/SettingsContext.tsx` (or `SettingsProvider.tsx`) — calm, high contrast, text size (4 rem steps), mute, Reset; `localStorage` in try/catch; announce changes  
- `src/settings/SettingsControls.tsx` — real buttons, `aria-pressed`  
- CSS variables / `html` data attributes for contrast + text scale in `index.css`

**Change**

- `main.tsx` — wrap SettingsProvider (may absorb/replace ImmersionProvider calm/sound)  
- `immersion/ImmersionContext.tsx`, `SenseControls.tsx`, `motion.ts` — align with Settings or deprecate duplicate calm/sound  
- `layouts/*` — mount settings controls (app Settings page + chrome)  
- Tests: extend `immersion.test.tsx` / new `settings.test.tsx`

### Stage 3 — Payment iframe + hidden debug + fix approve (frontend only)

**Create**

- `src/sessions/sessionApi.ts` — `POST /sessions`, `GET /sessions/{id}/state` (fail soft → “not available yet”)  
- `src/components/BankFrame.tsx` — iframe + `postMessage` origin/source checks; checklist from element ids  
- `src/components/DebugRunControls.tsx` — variant/mode only when `?debug=1`  
- `src/fixes/fixApi.ts` — `POST /fixes/{id}/approve` \| `/reject` or “not available yet” UI  

**Change**

- `pages` Possession (app) — embed `BankFrame`; remove public RunControls variant/mode  
- `PossessionMode.tsx` — slim to checklist + semantic ghost beside control; drop fake bank chrome or keep as fallback offline state  
- `PipelineSection.tsx` — wire Approve/Reject; empty/unavailable states, no fake success  
- `Reports` — collapsed “How this run was produced” (`agent_mode`, provenance)  
- `RunProvider.tsx` — only as needed for existing `/runs` if still used behind debug  

**Do not** change backend contracts from the dashboard; if endpoints missing, UI says not available yet.

### Stage 4 — Hero scene with castle

**Create / expand**

- `src/components/HeroScene.tsx` — full layer stack (stars, moon, castle, tree, bats, fog, tombstones, fence, pumpkins, witch-hat ghost + laptop + magnifier)  
- `src/components/Mascot.tsx` — three states from one SVG (or evolve `GhostMascot.tsx`)  
- Parallax helper (pointer) gated by Calm  

**Change**

- `HeroSection.tsx`, `HeroCastle.tsx` — compose into single scene or merge castle into HeroScene  
- `index.css` — scene/parallax styles; static under calm  
- `test/hero-castle.test.tsx` → scene/mascot tests  

### Stage 5 — Roaming ghosts (ambient layer)

**Create**

- `src/immersion/useRoamingGhosts.ts` — rAF + delta time, cursor reactions, mood from app state, fps cap, visibility pause  
- `src/components/CallAGhostButton.tsx` — visible, keyboard-accessible; ghosts never focused  

**Change**

- `AmbientLayer.tsx` / `AmbientScene.tsx` — full-viewport fixed layer; 3–5 / 1–2 / 0 by breakpoint + Calm  
- Ensure semantic `PossessionGhost` stays beside control and is not moved by ambient  
- `index.css` — transform-only motion; flash rate ≥ 334ms cycle  

### Stage 6 — Voice panel

**Create**

- `src/components/VoiceAgentPanel.tsx` — typed command + push-to-talk; `SpeechRecognition` feature detect; live transcript `aria-live`; Chrome speech disclaimer  
- Optional `src/voice/voiceApi.ts` — call existing voice endpoint or “not available yet”  

**Change**

- App Agents page — mount VoiceAgentPanel alongside Keyboard / Ghost Hunter cards  
- `GhostHuntSection.tsx` / `AgentCard.tsx` — stop hardcoding unverified outcomes; show `--` / pending until measured  

### Stage 7 — Tests + fidelity docs

**Create**

- `dashboard/e2e/` (or `playwright/`) — route titles, H1 focus, settings persist, Calm stops ambient, semantic vs ambient ghost, keyboard walk, axe in normal/Calm/high-contrast  
- `docs/ui-fidelity/` — 1440px screenshots + checklist vs v7 / deck slide  

**Change**

- `package.json` scripts only if Playwright already a dep (it is in `devDependencies`) — **ask before adding new packages**  
- Extend unit tests under `src/test/`

---

## 8. Stage 0 checklist

- [x] Inventory routes  
- [x] Inventory components and state  
- [x] List dead controls  
- [x] List a11y controls + whether they work  
- [x] Check console (Vite + browser)  
- [x] Write this file  
- [x] Propose Stages 1–7 file plan  
- [x] No application code changes  

**Waiting for go-ahead before Stage 1.**
