# Multi-page routing and working accessibility controls - Requirements

**Goal:** turn the one-page dashboard into a real multi-page site (one URL per page), and make every accessibility control work on every page.
**Applies to:** `dashboard/` (Vite + React + TypeScript + Tailwind). Backend changes are limited to one read endpoint (REQ-REAL-05).
**Steering followed:** `product-rules.md` (verdict authority, no invented metrics, `agent_mode` beside every metric, ghost states, ambient rules, Calm mode, fps guard, sound off, "Built with Kiro") and `product-ux.md` (two shells, plain-English glossary, grade 8, WCAG 2.2 AA, settings on every page, real content only, no sign-in, built from specs). Where they and this spec differ, the stricter rule wins.
**Related specs:** `product-shell-ia` (the larger information-architecture spec; see "Relationship" below), `staging-deployment` (Vercel and CORS).

## Relationship to `product-shell-ia`

This spec is the **first delivery slice** of `product-shell-ia`. It covers the router, the two layouts, the route announcer, the settings system, and moving today's sections onto their own pages. When both specs touch the same item, this spec wins for the first delivery:

| Item | `product-shell-ia` | This spec |
|---|---|---|
| Text size steps | 100 / 125 / 150 | Smaller / Default / Larger / Largest (87.5 / 100 / 125 / 150) |
| Marketing routes | includes `/docs/quick-start` | adds `/results`; no `/docs/quick-start` yet |
| Settings key | `ha-settings` | `ha-settings` (same), plus data attributes listed below |
| Sound control | header slot | only if audio exists (REQ-SOUND-01) |

Everything in `product-shell-ia` not listed here (design system, shadcn components, full data pages, `/try` iframe stage, SEO files) stays planned there. No duplicated work: where a task here covers a `product-shell-ia` task, the task says so.

## Conventions

EARS: WHEN trigger THE SYSTEM SHALL response. IF condition THEN ...

Terms: **Control** = one accessibility setting UI element. **Calm mode** = no ambient or decorative motion. **Effective Calm** = Calm chosen by the visitor OR the system asks for reduced motion. **Page** = one route with its own URL.

---

## REQ-AUDIT - Audit before and after

### REQ-AUDIT-01 Audit first
BEFORE any code change THE SYSTEM SHALL have `docs/audit-before.md`, produced by reading the code and running the app in a real browser, listing:
1. every section on the single page and where it will live;
2. every accessibility control that exists, whether it works, and why not;
3. every button and link that does nothing, links to a hash anchor, or throws a console error or warning.

Each finding has an ID (`A-01`, `C-01`, `D-01`), the file and line, what happens, and the task that fixes it.

### REQ-AUDIT-02 Honest evidence
THE SYSTEM SHALL mark each finding as **observed in a browser** or **from reading code only**. A finding that was not reproduced SHALL NOT be called confirmed.

### REQ-AUDIT-03 Audit after
WHEN the work is done THE SYSTEM SHALL have `docs/audit-after.md` with the same checklist re-tested, every ID marked Fixed, Not fixed (with reason) or Removed (with reason). A finding SHALL NOT be marked Fixed without a test or a recorded manual check.

---

## REQ-ROUTE - Routes and routing

### REQ-ROUTE-01 Marketing routes
THE SYSTEM SHALL provide one React Router route per page for: `/` (Home), `/how-it-works`, `/try` (Possession Mode), `/results`, `/trust`, `/kiro`, `/roadmap`, `/about`, `/accessibility`, and `/glossary` (see REQ-PAGE-07).

### REQ-ROUTE-02 App routes
THE SYSTEM SHALL provide: `/app` (Overview), `/app/scans`, `/app/journeys`, `/app/agents`, `/app/fixes`, `/app/regression`, `/app/reports`, `/app/night-watch`, `/app/settings`.

### REQ-ROUTE-03 No scroll navigation
THE SYSTEM SHALL NOT use hash anchors, `scrollIntoView`, or in-page section links to move between pages or sections of the site. In-page jump links are allowed only for the skip link.

### REQ-ROUTE-04 One definition
THE SYSTEM SHALL define every route once in a route manifest (path, shell, title, H1, "What this page shows" line, next step, lazy page import). The router, navigation, breadcrumbs, document titles and tests SHALL read from it.

### REQ-ROUTE-05 History
Browser Back, Forward, refresh and direct links to every route SHALL work. THE SYSTEM SHALL ship `dashboard/vercel.json` with a rewrite of all paths to `/index.html`, and SHALL honour the Vite `base` path for GitHub Pages.

### REQ-ROUTE-06 Lazy loading
THE SYSTEM SHALL load each route's code only when the route is first visited.

### REQ-ROUTE-07 Loading state
WHILE a route is loading THE SYSTEM SHALL show a visible "Loading page" state, mark the main region `aria-busy="true"`, and keep the current page and the shell in place. The loading state SHALL NOT animate when Effective Calm is on.

### REQ-ROUTE-08 Error boundary per route
IF a route fails to load or throws while rendering THEN THE SYSTEM SHALL show an error page inside the shell (header and footer stay), with an H1, a plain explanation, "Try again", and a link Home. No stack trace or internal message SHALL be shown. IF the failure is a chunk that could not load THEN the message SHALL say a new version may be available and offer Reload.

### REQ-ROUTE-09 Not found
WHEN no route matches THE SYSTEM SHALL show a spooky not-found page with an H1, a plain-English line, and clear ways back (Home and, under `/app`, the app Overview). Under `/app/...` it SHALL render inside the app shell.

### REQ-ROUTE-10 Navigation behaviour
On every navigation (link, Back, Forward) THE SYSTEM SHALL, in this order: render the new page; scroll to the top; set a unique `document.title`; move focus to the page H1; write "Navigated to {H1}" to a polite live region. It SHALL NOT steal focus on first load, on a search-only or hash-only change, or when the pathname did not change.

### REQ-ROUTE-11 No layout shift
THE SYSTEM SHALL keep the header height reserved, give the loading state and each page's main area a minimum height, and SHALL NOT shift the layout after an in-app navigation. Measured cumulative layout shift for an in-app navigation SHALL be at most 0.01.

---

## REQ-PAGE - Pages

### REQ-PAGE-01 Page template
Every page SHALL have: one `<h1>` (focus target, `data-page-title`), a plain-English "What this page shows" line, and one clear next step (a link). Every page SHALL have exactly one primary-styled action at most.

### REQ-PAGE-02 Home keeps only the hero
`/` SHALL contain only: the short hero, a loop summary (Find, Experience, Fix, Verify, Prevent, each with one plain line and a link to the page that explains it), and calls to action. It SHALL NOT contain the content of any other page.

### REQ-PAGE-03 "Possess This App"
"Possess This App" and every nav item SHALL be a real link that goes to its page. "Possess This App" goes to `/try`. It SHALL NOT start a run by itself.

### REQ-PAGE-04 Where the current sections go
THE SYSTEM SHALL move the existing sections as follows (final mapping confirmed in the audit):

| Today (single page) | Goes to |
|---|---|
| Hero | `/` |
| Pipeline pills | `/` (loop summary) |
| Run controls, Possession Mode, live steps | `/try` |
| Results and The Outcome card | `/results` |
| Agent cards | `/app/agents` and `/how-it-works` |
| Pipeline (Fix, Verify, Prevent) | `/app/fixes` |
| Kiro integration | `/kiro` |

### REQ-PAGE-05 New content pages
`/how-it-works`, `/trust`, `/roadmap`, `/about`, `/accessibility` SHALL contain real content only: statements that are true today, drawn from the steering files, specs and measured results. No invented customers, logos, quotes, prices, or statistics. Planned items SHALL be labelled "Planned".

### REQ-PAGE-06 Accessibility page
`/accessibility` SHALL explain each control and how to use it with a keyboard, and SHALL list known limitations taken from `docs/audit-after.md`. It SHALL NOT claim conformance that was not tested.

### REQ-PAGE-07 Glossary
THE SYSTEM SHALL provide `/glossary` with every spooky term and its plain-English meaning (at least Ghost, Possession Mode, Exorcist). WHERE a spooky term first appears on a page THE SYSTEM SHALL show its plain meaning beside it. This page is an addition required by `product-ux.md`; it is not in your list of routes.

### REQ-PAGE-08 App shell pages with no backend
WHERE a page needs an endpoint that does not exist yet (`/app/scans`, `/app/fixes`, `/app/regression`, `/app/reports`, `/app/night-watch`) THE SYSTEM SHALL show a "Not available yet" state that names the missing endpoint and what the page will show. It SHALL NOT show example data as if it were real, and SHALL NOT show buttons that do nothing.

---

## REQ-NAV - Layouts and navigation

### REQ-NAV-01 Two layouts
THE SYSTEM SHALL provide `MarketingLayout` (header, main, footer) and `AppLayout` (top bar, sidebar, breadcrumbs, main, footer), both under one root layout that holds the skip link, the live region and the providers.

### REQ-NAV-02 Current page
THE SYSTEM SHALL mark the current page in the header navigation (and the sidebar in `/app`) with `aria-current="page"` and a visible style that does not rely on colour alone. The mark SHALL follow the real URL, not component state.

### REQ-NAV-03 Header
THE SYSTEM SHALL show, on every page and in the same place: wordmark link, primary navigation, and the accessibility controls (REQ-SET-01). Marketing pages that do not fit in the bar SHALL be reachable from a "More" disclosure whose links also carry `aria-current`.

### REQ-NAV-04 Footer
THE SYSTEM SHALL show a footer on every page with links to Accessibility, Glossary, Trust, Roadmap and About, and the plain text "Built with Kiro".

### REQ-NAV-05 Breadcrumbs
Under `/app` THE SYSTEM SHALL show breadcrumbs above the H1. The last item is plain text with `aria-current="page"` and equals the H1.

### REQ-NAV-06 Small screens
Below 1024px THE SYSTEM SHALL collapse navigation into a Menu button (`aria-expanded`, `aria-controls`) that closes on Escape and returns focus to the button.

### REQ-NAV-07 Landmarks
Each page SHALL have `header`, `nav` (named), `main`, `footer`, and `aside` for the app sidebar. The skip link is the first focusable element.

### REQ-NAV-08 Single primary action
THE SYSTEM SHALL NOT style the header "Kiro" call to action as a primary button. The page's own main action is the only primary-styled control.

---

## REQ-SET - Settings system (all controls)

### REQ-SET-01 One provider
THE SYSTEM SHALL have one `SettingsProvider` holding: `calm`, `contrast`, `textSize`. All controls read and write it. No other component SHALL keep its own copy of these settings or its own storage key. The old keys `haunted-audit.calm` and `haunted-audit.sound` SHALL be read once, migrated, and removed.

### REQ-SET-02 Where the controls are
THE SYSTEM SHALL put the controls in the header on every page, reachable by keyboard, in the same order on every page. `/app/settings` SHALL show the same controls larger, driven by the same provider.

### REQ-SET-03 Control semantics
Each control SHALL be a real `<button>` with `aria-pressed` (on/off settings) or a proper radio group (`fieldset` + `legend` + radio inputs, or `role="radiogroup"` with roving focus). Each SHALL have a visible label, a visible 3px focus indicator, and operate with Enter/Space (buttons) or arrow keys (radios).

### REQ-SET-04 Applied globally by attributes
THE SYSTEM SHALL apply settings through `data-calm`, `data-contrast` and `data-text-size` on `<html>` and CSS variables. Components SHALL NOT read the settings to restyle themselves. JavaScript behaviours (animation loops, 3D, timers) SHALL read the settings only through the motion gate (REQ-CALM-03).

### REQ-SET-05 Persistence
THE SYSTEM SHALL save the settings to `localStorage` (key `ha-settings`, versioned JSON) inside `try/catch`. IF storage is blocked or full THEN the controls SHALL still work for the current page view, and a short note SHALL say "Your choice could not be saved on this device".

### REQ-SET-06 Before first paint
THE SYSTEM SHALL apply saved settings with a small inline script in `index.html` before the app loads, so there is no flash of the default look.

### REQ-SET-07 Survive navigation and reload
Settings SHALL survive in-app navigation, reload, Back/Forward, and a second browser tab (via the `storage` event).

### REQ-SET-08 Announce changes
WHEN a setting changes THE SYSTEM SHALL write a short message to the polite live region, for example "Calm mode on", "High contrast off", "Text size larger", "Settings reset".

### REQ-SET-09 Reset
THE SYSTEM SHALL provide a "Reset settings" button that returns Calm to the system default, contrast to normal and text size to default, clears the saved value, and announces it. It does not ask for confirmation (it is reversible and local).

---

## REQ-CALM - Calm mode

### REQ-CALM-01 Effective Calm
Effective Calm SHALL be on WHEN the visitor turned Calm on OR `prefers-reduced-motion: reduce` matches. WHILE the system prefers reduced motion THE Calm control SHALL show on, be marked `aria-disabled`, and say "On because your device asks for less motion".

### REQ-CALM-02 Immediate and total
WHEN Effective Calm turns on THE SYSTEM SHALL stop all ambient and decorative motion at once, including layers already running: the roaming ghosts, particles, fog, parallax, tilt, cursor trail, page transitions, glow pulses, floats and spinners that are purely decorative, and any 3D scene. No reload SHALL be needed. Where a thing does not exist yet, the rule still binds any future one.

Stopped means: no running CSS animation, no running Web Animation, no `requestAnimationFrame` loop owned by decoration, no mounted 3D canvas, and the 3D code chunk is not requested.

### REQ-CALM-03 One gate
THE SYSTEM SHALL provide one motion gate (`useMotionAllowed`, a CSS rule on `html[data-calm="true"]`, and a helper for animation loops). Any decorative motion SHALL use it. A test SHALL fail if `requestAnimationFrame`, `setInterval`, `.animate(`, or a new `@keyframes` is used outside the gate's allow-list.

### REQ-CALM-04 Meaning is not lost
WHILE Calm is on THE SYSTEM SHALL still show status by text and static icon (running, blocked, verified), and SHALL keep the semantic ghost beside the control it describes, static. Loading and progress SHALL appear as text, not as spinning or pulsing only.

### REQ-CALM-05 Existing rules kept
THE SYSTEM SHALL keep: ambient layers `aria-hidden`, `pointer-events: none`, never focusable, painted under controls; no animation cycle under 334 ms; the 2-second under-40-fps guard dropping 3D and particles, then the roam; no 3D on mobile or low-power devices; counters animate only toward a measured number.

---

## REQ-CONTRAST - High contrast

### REQ-CONTRAST-01 Token set
WHEN High contrast is on THE SYSTEM SHALL switch every colour token (background, panel, text, muted text, borders, accent, status colours, focus ring, the parchment Outcome card) to a high-contrast set by changing CSS variables only. Normal text SHALL reach at least 7:1 and non-text UI parts and focus indicators at least 4.5:1 against their backgrounds.

### REQ-CONTRAST-02 Everything reacts
Every component SHALL react, including those using opacity-modified tokens (such as `bg-base/95`). No colour SHALL be hard-coded outside `tailwind.config.js` and `src/index.css`. (Today `HeroSection` and `.code-block` contain hex values; these are findings in the audit.)

### REQ-CONTRAST-03 Flat in high contrast
WHILE High contrast is on THE SYSTEM SHALL remove glow shadows and ambient layers, use solid borders at least 2px on controls, and never convey state by colour alone.

### REQ-CONTRAST-04 Status stays
Ghost colours (purple Ready, red Blocked, green Verified) SHALL stay distinguishable, each with a text label and a different icon shape, in both sets.

---

## REQ-TEXT - Text size

### REQ-TEXT-01 Four steps
THE SYSTEM SHALL offer Smaller (87.5%), Default (100%), Larger (125%), Largest (150%) as a radio group.

### REQ-TEXT-02 Everything scales
THE SYSTEM SHALL set the size on `html` only and size all text, spacing that holds text, and component dimensions in `rem` (or `em`). No fixed `px` font sizes or fixed `px` heights/widths that contain text (today there are `text-[10px]` and `min-h-[340px]` style values; these are findings).

### REQ-TEXT-03 Reflow
THE SYSTEM SHALL have no loss of content or function and no horizontal scrolling at 200% browser zoom (1280px wide viewport reduced to 640 CSS px) and at Largest text size, on every route, except inside labelled scroll regions (code blocks, tables). The global `overflow-x: hidden` on `html` and `body` SHALL be removed because it hides reflow failures.

### REQ-TEXT-04 Readable default
At Default size THE SYSTEM SHALL render body copy at 1rem (16px) or larger. Information-carrying labels SHALL be at least 0.875rem. The Smaller step is an opt-in choice by the visitor and does not change the default.

---

## REQ-SOUND - Sound

### REQ-SOUND-01 Only if audio exists
WHERE no audio is played anywhere in the dashboard THE SYSTEM SHALL NOT show a sound control (a control that does nothing is a dead control). The current "Sound off" button is removed until audio is added.

### REQ-SOUND-02 When audio is added
WHERE audio is added THE SYSTEM SHALL keep it off by default, never autoplay, show a Sound toggle in the same header group with `aria-pressed`, persist the choice, announce it, create no `AudioContext` before the first activation, and stop all sound immediately when turned off. Calm and High contrast do not change sound; it has its own control.

---

## REQ-SKIP - Skip link

### REQ-SKIP-01 First and visible
THE SYSTEM SHALL make "Skip to main content" the first focusable element on every page, visible when focused, and not covered by sticky bars.

### REQ-SKIP-02 Moves focus
WHEN activated THE SYSTEM SHALL move focus to `<main id="main-content" tabindex="-1">`, without changing the URL or adding a history entry, and the next Tab SHALL land on the first control inside `main`.

---

## REQ-REAL - Everything actually works

### REQ-REAL-01 No dead controls
THE SYSTEM SHALL have no button or link that does nothing, links to a bare or same-page hash, or is a visual-only control. A control that cannot work yet SHALL be removed or replaced by a "Not available yet" state (REQ-PAGE-08). This includes the current "Approve Fix" and "Reject" buttons (no backend) and the four Haunted Bank sidebar links in the Possession Mode panel.

### REQ-REAL-02 No console noise
THE SYSTEM SHALL produce no `console.error` and no `console.warn` and no uncaught exception on any route, during navigation, while running a journey, and when the backend is offline.

### REQ-REAL-03 Real data only
Pages SHALL read the real backend (`/runs`, `/runs/{id}`, `/runs/{id}/events`, `/ping`). Content that is not read from a run or the backend (the "Voice Agent" and "Ghost Hunter" outcome rows in `GhostHuntSection`, which are fixed text today, and the fallback `'div.pay-btn'`) SHALL be removed or derived from the real result. Unmeasured values show `--` with "not yet measured". Every metric display shows `agent_mode`.

### REQ-REAL-04 Offline state
WHEN the backend does not answer THE SYSTEM SHALL show a clear offline state on pages that need it (what failed, what still works, a Retry button), and no fake or stale result.

### REQ-REAL-05 Runs list
THE SYSTEM SHALL add `GET /runs?limit=N` (newest first, N at most 50, default 20) returning run id, variant, mode, status, verdict, reason code, `seeded`, and `recorded_at` or created time. `/results` and `/app/journeys` read it. This is the only backend change in this spec.

### REQ-REAL-06 Runs survive navigation
A journey started on `/try` SHALL keep running and keep its live steps when the visitor moves to another page and back. The run state lives above the routes.

### REQ-REAL-07 Verdict authority
THE SYSTEM SHALL show `verdict` and `reason_code` only as returned by the checker through the API, never computed in the dashboard. An agent's own claim is shown as `agent_claim` if present, and a mismatch is flagged.

### REQ-REAL-08 Ghost position
THE SYSTEM SHALL position the semantic ghost only from `blocked_element.bounding_box` in the result. It SHALL NOT invent coordinates.

---

## REQ-TEST - Tests

### REQ-TEST-01 Routes
A Playwright test SHALL visit every route in the manifest, once by direct link (`page.goto`) and once after refresh, and check: the title equals the manifest and is unique across routes, exactly one `<h1>`, the unknown path shows the not-found page, and `/app/nope` shows the app not-found page.

### REQ-TEST-02 Navigation behaviour
A Playwright test SHALL navigate in-app and with Back and Forward, and after each navigation check: focus is on the H1, the live region reads "Navigated to {H1}", scroll position is 0, the title changed, `aria-current="page"` is on exactly the current item, and the cumulative layout shift is at most 0.01.

### REQ-TEST-03 Controls
For each control a Playwright test SHALL toggle it and assert the visible effect, reload and assert it persisted, navigate to another route and assert it persisted, and use Reset:
- **Calm:** `html[data-calm=true]`; `document.getAnimations()` has no running animation; no `[data-testid=ambient-scene]`; the 3D chunk is not requested; it applies to an already-running ambient layer without reload; it is forced on and disabled with `emulateMedia({reducedMotion:'reduce'})`.
- **High contrast:** `html[data-contrast=high]`; computed colours of body, a panel, a link and the focus ring equal the high-contrast tokens and meet the ratios in REQ-CONTRAST-01.
- **Text size:** each step changes `html` computed font-size to 14, 16, 20, 24 px and a heading's rendered height; no horizontal scroll at Largest and at 200% zoom on every route.
- **Skip link:** first Tab stop, visible, moves focus to `main`, URL unchanged.
- **Reset:** all return to defaults and storage is cleared.
- **Storage blocked:** with `localStorage` throwing, controls still work and the note appears.

### REQ-TEST-04 Keyboard walk
A keyboard-only Playwright test SHALL Tab from the page start through the skip link, the header controls and the navigation, activate each with Enter or Space or arrow keys, open and close the menu and the "More" disclosure with Escape returning focus, and reach and operate the Run button on `/try`. No mouse.

### REQ-TEST-05 Axe
An axe-core Playwright test SHALL scan every route in normal, Calm and High contrast modes with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, and require zero violations.

### REQ-TEST-06 No console noise and no dead controls
For every route the tests SHALL fail on any `console.error`, `console.warn`, `pageerror`, or failed same-origin request (except the deliberate offline test), and SHALL click or activate every visible button and link once (skipping external links) and assert something observable happened (URL, state, or live-region text).

### REQ-TEST-07 Real backend
One Playwright test SHALL start the real API (scripted mode, a temporary database), run `broken` then `fixed` from `/try`, and assert `BLOCKED / TARGET_NOT_FOCUSABLE` and `PASSED` shown from the API, live steps visible while running, the run still present after navigating to `/results` and back, and `/results` listing both runs. A second test SHALL abort the API requests and assert the offline state.

### REQ-TEST-08 Unit tests
Vitest SHALL cover: the settings provider (persist, migrate old keys, storage failure, system reduced motion, reset, announcements), the manifest (unique paths, titles, one H1 each), the motion-gate source scan (REQ-CALM-03), and a source scan that fails on `href="#`, hex colours outside the two token files, and `px` font sizes in components.

### REQ-TEST-09 CI
CI SHALL run Vitest, build, and the Playwright suite on every push and pull request.

---

## REQ-STEER - Steering compliance

### REQ-STEER-01 Theme and tone
Spooky copy SHALL come with a plain-English line where the term first appears; writing is about grade 8; "Possession Mode", "Ghost" and "Exorcist" follow the glossary table.

### REQ-STEER-02 Scope
THE SYSTEM SHALL NOT add sign-in, a profile menu, or "your workspace".

### REQ-STEER-03 Attribution
THE SYSTEM SHALL show the plain text "Built with Kiro" in the footer and on `/about`.

### REQ-STEER-04 Design
THE SYSTEM SHALL NOT redesign the v7 look. Layout, palette, copy and components stay; changes are structural (pages), token plumbing (variables) and sizing units.

### REQ-STEER-05 Components
One component per file in `src/components/`; props typed with TypeScript interfaces; `Uncial Antiqua` only on the wordmark; Inter for UI; JetBrains Mono for code.
