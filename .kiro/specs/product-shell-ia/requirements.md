# Product Shell and Information Architecture - Requirements

**Spec version:** 1.0
**Steering applied:** `product-rules.md` (verdict authority, metrics, ghost states, motion), `product-ux.md` (SaaS feel, two shells, plain language, WCAG 2.2 AA, settings, real content, no sign-in)
**Design reference:** `design/Haunted_Audit_Final_UI_v7.png` (frozen look; this spec changes structure, not the visual language)
**Source material:** the Haunted Audit system design deck (trust boundaries, roadmap, team, sourced figures)
**Supersedes:** the route structure in `.kiro/specs/haunted-audit-frontend/` (routes `/journeys/send-payment`, `/agents`, `/fixes`, `/kiro`, `/reports`, `/scans`, `/demo`). Components, hooks and the API client from that spec are kept.

---

## Conventions

EARS notation: **WHEN** trigger **THE SYSTEM SHALL** response. **WHILE** state ... **IF** condition **THEN** ... **THE SYSTEM SHALL** (unconditional).

Terms used below:

- **Stub route:** a route that exists and is navigable but shows an honest "being built" page. Stubs never ship to production.
- **Not available yet:** the backend is online but does not offer the endpoint a page needs. This is different from **offline** (backend unreachable).
- **Measured value:** a number that came from a real backend result in this session. Anything else renders `--` with "not yet measured".
- **Sourced figure:** a number with a named source shown beside it.
- **Loop names:** the loop is shown as Find, Feel, Fix, Prove, Prevent. In the glossary, Feel = Experience and Prove = Verify, so the user-facing words and the steering words stay linked.

---

## REQ-IA - Information architecture and routes

### REQ-IA-01 Marketing routes
THE SYSTEM SHALL provide these marketing routes, each a separate React Router route (client-side, lazy-loaded): `/`, `/how-it-works`, `/try`, `/trust`, `/kiro`, `/roadmap`, `/about`, `/accessibility`, `/docs/quick-start`, `/glossary`.

### REQ-IA-02 App routes
THE SYSTEM SHALL provide these app routes, each a separate route: `/app`, `/app/scans`, `/app/scans/new`, `/app/scans/:id`, `/app/journeys`, `/app/journeys/:id`, `/app/agents`, `/app/fixes`, `/app/fixes/:id`, `/app/regression`, `/app/reports`, `/app/night-watch`, `/app/settings`.

### REQ-IA-03 Fixture route
THE SYSTEM SHALL serve the Haunted Bank test site at `/fixtures/haunted-bank/index.html?variant=broken|fixed` from the same file the keyboard agent audits. This route is outside both shells, is disallowed in `robots.txt`, and is labelled "Haunted Bank - Test site".

### REQ-IA-04 One route per nav item
THE SYSTEM SHALL give every navigation item its own URL, unique `<title>` and one `<h1>`. THE SYSTEM SHALL NOT hide any nav item's content in a tab, accordion or anchor section of another page.

### REQ-IA-05 Single route manifest
THE SYSTEM SHALL define every route once in `src/lib/routes.ts` (path, shell, title, H1, primary action, next link, status, lazy page import). Navigation, breadcrumbs, sitemap, the router, tests and the stub guard SHALL read from this manifest.

### REQ-IA-06 Stub guard
WHILE a route has `status: "stub"` THE SYSTEM SHALL render a PageTemplate with the real H1 and a plain "This page is being built" state.
IF a production build contains any stub route THEN THE SYSTEM SHALL fail the build.

### REQ-IA-07 Dynamic routes
WHEN `/app/scans/:id`, `/app/journeys/:id` or `/app/fixes/:id` is opened with an id the backend does not know THE SYSTEM SHALL show a not-found state inside the app shell with a link back to the list.

### REQ-IA-08 Old prototype
THE SYSTEM SHALL NOT use hash routing. The site is built in place in `dashboard/` (Vite + React + TypeScript). The single-page `App.tsx` is removed only after parity is checked (see tasks). The site SHALL NOT migrate to Next.js and SHALL NOT use server-side rendering.

---

## REQ-SHELL - Two shells

### REQ-SHELL-01 Marketing shell
THE SYSTEM SHALL wrap marketing routes in a shell with a top nav and a footer.
THE SYSTEM SHALL show these top-nav items: How it works, Try it, Trust, Kiro, Roadmap, About, and an "Open the app" link to `/app`.
THE SYSTEM SHALL show these footer links: Accessibility, Quick start, Glossary, Trust, and the plain text "Built with Kiro".

### REQ-SHELL-02 App shell
THE SYSTEM SHALL wrap app routes in a shell with a top bar, a sidebar, and breadcrumbs above the page H1.
THE SYSTEM SHALL group sidebar items by loop stage: Overview; Find (Scans); Feel (Journeys, Agents); Fix and prove (Fixes); Prevent (Regression, Night Watch); Review (Reports); Settings.

### REQ-SHELL-03 Shared parts
THE SYSTEM SHALL render the skip link, the Settings control, the Help menu and the sound toggle in the same order and place in both shells and on 404 and error pages.

### REQ-SHELL-04 Landmarks
THE SYSTEM SHALL provide `header`, `nav`, `main` and `footer` landmarks on marketing routes, and `header`, `nav`, `aside` (sidebar), `main` and `footer` on app routes. Each repeated landmark type SHALL have a unique accessible name.

### REQ-SHELL-05 Skip link
THE SYSTEM SHALL make "Skip to main content" the first focusable element on every page. WHEN activated it SHALL move focus to `main`.

### REQ-SHELL-06 Sticky bars
WHILE a header is sticky THE SYSTEM SHALL set `scroll-padding-top` so a focused element is never hidden behind it (WCAG 2.4.11).

### REQ-SHELL-07 Mobile sidebar
WHILE the viewport is narrower than 1024px THE SYSTEM SHALL replace the sidebar with a "Menu" button that opens a labelled drawer. The drawer SHALL trap focus, close on Escape, and return focus to the button.

### REQ-SHELL-08 Current page
THE SYSTEM SHALL mark the current nav item with `aria-current="page"`.

### REQ-SHELL-09 No fake accounts
THE SYSTEM SHALL NOT render a sign-in, profile menu, avatar, workspace switcher or team name.

---

## REQ-TPL - Page template

### REQ-TPL-01 Structure
THE SYSTEM SHALL render every page, in this order, as: breadcrumbs (app shell only), PageHeader, content, "What happens next" block.

### REQ-TPL-02 PageHeader
THE SYSTEM SHALL render in PageHeader: one `<h1>`, a one-line "What this page shows" in plain English, and exactly one primary action.

### REQ-TPL-03 One main action
THE SYSTEM SHALL render exactly one element with the primary button style per page. Other actions SHALL use secondary or link styles.

### REQ-TPL-04 What happens next
THE SYSTEM SHALL end every page with a "What happens next" link to the next logical page.

### REQ-TPL-05 Breadcrumbs
THE SYSTEM SHALL render app-shell breadcrumbs from the route manifest. The last breadcrumb item SHALL match the page H1 text and carry `aria-current="page"`.

### REQ-TPL-06 Focus on navigation
WHEN the route changes by client navigation THE SYSTEM SHALL move focus to the page `<h1>` (made focusable with `tabindex="-1"`).

### REQ-TPL-07 Title announcement
WHEN the route changes THE SYSTEM SHALL update `document.title` and SHALL announce the new page through the `#route-announcer` live region (`role="status"`, `aria-live="polite"`) written by `useRouteAnnouncer`.

### REQ-TPL-08 Reading level
THE SYSTEM SHALL write page copy at about grade 8. Any term not at that level SHALL be a glossary term (REQ-GLOSS).

---

## REQ-MKT - Marketing pages

### REQ-MKT-01 Home `/`
THE SYSTEM SHALL show: a one-sentence promise; the tagline "The accessibility guardrail for AI-built applications."; the sub-line "Feel the barrier. Fix the cause. Prove the journey."; the Find, Feel, Fix, Prove, Prevent loop with one plain-English line per step; a short "Try it" block linking to `/try`; and a trust strip.
THE SYSTEM SHALL make "Try it" the single primary action.
THE SYSTEM SHALL fill the trust strip only with sourced figures from the content register (REQ-CONTENT-02), each with its source line beside it.
THE SYSTEM SHALL NOT show customers, logos, testimonials, prices or unmeasured results on Home.

### REQ-MKT-02 How it works `/how-it-works`
THE SYSTEM SHALL explain the loop step by step and list each agent role in plain English: Ghost hunter (rules, no AI), Keyboard user, Voice user (labelled "simulated"), Impact (rules), Exorcist (proposes a fix), Human (approves), Verifier (re-runs the journey).
THE SYSTEM SHALL show for each role whether it uses rules, AI or a person, and its build status (Built, Prototype, Planned) from `content/agents.ts`.
THE SYSTEM SHALL state "Rules where rules work, AI where judgement helps" and that the checker, not an AI, decides pass or fail.

### REQ-MKT-03 Trust `/trust`
THE SYSTEM SHALL state these boundaries: scans of public sites are scan-only (no clicks, no logins, no typing); private and local addresses are blocked; scans are rate-limited; page content is not stored; payments are synthetic and only inside the Haunted Bank test site; a human approves every fix; Haunted Audit does not claim WCAG certification or legal compliance.
IF a boundary is not yet enforced in code THEN THE SYSTEM SHALL label it "Planned" instead of stating it as fact.

### REQ-MKT-04 Kiro `/kiro`
THE SYSTEM SHALL describe how Kiro was used and link each claim to a real file or folder in the repository.
THE SYSTEM SHALL read links from `content/kiro-evidence.json`. A build step SHALL fail if an entry marked `exists` points to a path that is missing.
IF a claim has no file yet THEN THE SYSTEM SHALL show it as "Not in the repo yet" and SHALL NOT link it.
WHERE `VITE_REPO_URL` is unset THE SYSTEM SHALL show paths as plain text without links.

### REQ-MKT-05 Roadmap `/roadmap`
THE SYSTEM SHALL show MVP, Phase 2 and Phase 3 with their items and a "last reviewed" date.
THE SYSTEM SHALL state "Pricing comes after pilots" and SHALL NOT show prices or plan names with prices.
THE SYSTEM SHALL mark each MVP item Built, In progress or Planned from a reviewed data file.

### REQ-MKT-06 About `/about`
THE SYSTEM SHALL show the mission in two or three sentences and the team: Arohi (development), Shilpa (product), Charvi (testing).
THE SYSTEM SHALL NOT show photos, biographies, titles or quotes that are not supplied by the team.

### REQ-MKT-07 Accessibility `/accessibility`
THE SYSTEM SHALL state the target (WCAG 2.2 AA), the methods used (automated axe-core scans, keyboard walks), and known limitations.
THE SYSTEM SHALL show the self-scan result read from `public/a11y/self-scan.json` (date, tool version, routes scanned, violations). IF the file is absent THEN THE SYSTEM SHALL show `--` and "not yet measured".
THE SYSTEM SHALL state that automated scans find only part of the problems and that this page is not a compliance claim.
THE SYSTEM SHALL offer a way to report a problem (the repository issue link when `VITE_REPO_URL` is set).

### REQ-MKT-08 Quick start `/docs/quick-start`
THE SYSTEM SHALL show exactly three numbered steps to get started, each with the real command or link it needs.
THE SYSTEM SHALL mark any step that depends on something not yet published (for example the Kiro Power) as "Not published yet".

### REQ-MKT-09 Fixture notice
THE SYSTEM SHALL label every mention of the demo bank as "Haunted Bank - Test site" and "synthetic payments only".

---

## REQ-TRY - Possession Mode `/try`

### REQ-TRY-01 Layout
THE SYSTEM SHALL show the Haunted Bank test site in a same-origin iframe inside a fixed 1280 by 800 stage that scales to fit the page width, next to a "Keyboard-only demonstration" panel.
THE SYSTEM SHALL explain "Possession Mode = a keyboard-only run of a user journey" beside the term on first use.

### REQ-TRY-02 Variant choice
THE SYSTEM SHALL let the visitor choose between the broken and fixed test site, labelled "Test site with a ghost" and "Test site, fixed".

### REQ-TRY-03 Live checklist from the visitor's keys
WHEN the visitor presses Tab inside the test site THE SYSTEM SHALL fill the checklist ("Tab to Recipient", "Tab to Amount", "Tab to Send Payment") from real `focusin` events in the iframe document.
THE SYSTEM SHALL label this list "Your key presses" and SHALL mark an item as stuck only after one full Tab cycle ends without reaching the send control.
THE SYSTEM SHALL wrap the checklist in `aria-live="polite"` and show each state as icon plus text.

### REQ-TRY-04 Run the keyboard agent
THE SYSTEM SHALL make "Run the keyboard agent" the single primary action. WHEN activated it SHALL `POST /runs` and stream step events over SSE into a live timeline.
THE SYSTEM SHALL label the result "Checker verdict" and show `agent_mode` beside it.

### REQ-TRY-05 Semantic ghost
WHEN a completed run has `verdict = BLOCKED` and `blocked_element.bounding_box` THE SYSTEM SHALL place a red ghost beside the blocked control, using only that bounding box in stage coordinates, never over it, with a "Journey Blocked" label and a "Barrier detected" link to the details.
WHEN a completed run has `verdict = PASSED` THE SYSTEM SHALL show the green ghost state.
WHILE no completed run exists THE SYSTEM SHALL show the purple Ready state with no positioned ghost.
THE SYSTEM SHALL NOT position the ghost from any value other than `blocked_element.bounding_box`.

### REQ-TRY-06 Small screens
WHILE the viewport is narrower than the stage THE SYSTEM SHALL keep the stage inside a labelled, keyboard-scrollable region and keep the checklist, verdict and timeline readable as text.

### REQ-TRY-07 Offline
IF the backend is offline THEN THE SYSTEM SHALL keep the visitor's own Tab checklist working and SHALL show an offline state for the agent run and verdict.

---

## REQ-APP - App pages

Each app page follows REQ-TPL. "Data" lists what it reads; "Primary action" is its one main action.

### REQ-APP-01 Overview `/app`
Data: this browser's recent runs (REQ-DATA-06) and the latest run.
Primary action: "Start a journey" (to `/app/journeys`).
THE SYSTEM SHALL show the ghost state of the latest run, its verdict, `reason_code` and `agent_mode`, and metric tiles for planted barriers found `--` / 6, approved fixes verified, test scenarios, and user sessions. Tiles SHALL show `--` and "not yet measured" until a backend result supplies them.

### REQ-APP-02 Scans `/app/scans`
Data: `GET /scans`. Primary action: "New scan". THE SYSTEM SHALL show a sortable table of scans with URL, date, violation count and severity summary.

### REQ-APP-03 New scan `/app/scans/new`
Primary action: "Start scan" (form submit).
THE SYSTEM SHALL state "Scan only. No clicks, no logins. Rate-limited." beside the form and link to `/trust`.
THE SYSTEM SHALL accept only absolute `https` URLs and show an inline error for others.
WHEN the backend rejects a URL (private address, rate limit) THE SYSTEM SHALL show the backend's reason in plain English and keep the form values.
WHEN a scan is accepted THE SYSTEM SHALL go to `/app/scans/:id`.

### REQ-APP-04 Scan detail `/app/scans/:id`
Data: `GET /scans/{id}`. Primary action: "Run a keyboard journey" (to `/app/journeys`).
THE SYSTEM SHALL list findings with rule id, WCAG criterion, impact, and selector, sorted by impact. Impact SHALL come from the backend's rules, not from the frontend or an AI.

### REQ-APP-05 Journeys `/app/journeys`
Data: runs (REQ-DATA-06) and the journey catalogue (`content/journeys.ts`, currently Send Payment only). Primary action: "Run Send Payment".
THE SYSTEM SHALL let the visitor choose variant and mode and SHALL show `agent_mode` for every run in the table.
IF mode is `llm` and the backend reports missing AWS credentials THEN THE SYSTEM SHALL show that reason and SHALL NOT invent a result.

### REQ-APP-06 Journey detail `/app/journeys/:id`
Data: `GET /runs/{id}` and SSE. Primary action: "See the proposed fix" when BLOCKED, otherwise "Run it again".
THE SYSTEM SHALL show verdict, `reason_code`, blocked element, focus trail, step timeline, screenshots when served, `agent_mode`, tokens, cost and latency. Scripted runs SHALL show `0` tokens and cost, not `--`.
THE SYSTEM SHALL show `agent_claim_mismatch` when true, in plain English.

### REQ-APP-07 Agents `/app/agents`
Data: `content/agents.ts` and the latest run. Primary action: "Open the latest journey".
THE SYSTEM SHALL show one card per agent role with plain-English purpose, rules or AI or person, build status, and its last outcome from the latest run when the backend provides one. The Voice agent SHALL be labelled "simulated".

### REQ-APP-08 Fixes `/app/fixes`
Data: `GET /fixes`. Primary action: "Review the oldest open fix".
THE SYSTEM SHALL list fixes with status Proposed, Approved, Rejected, Verified or Failed verification.

### REQ-APP-09 Fix review `/app/fixes/:id`
Data: `GET /fixes/{id}`. Primary action: "Approve fix".
THE SYSTEM SHALL show the diff, the WCAG criterion it addresses, the plain-English reason, and the line "Nothing in your code changes until you apply it yourself."
THE SYSTEM SHALL show "Approve fix" and "Reject" only to a person pressing a button. Approving SHALL record the decision and start a verification run on a patched copy. THE SYSTEM SHALL NOT approve, apply or verify anything automatically.
THE SYSTEM SHALL show Find, Fix, Verify and Regression as a step list inside this page with one step's details visible at a time, each step linking to the real run or test output.
WHEN verification returns, THE SYSTEM SHALL show the checker's verdict and `agent_mode`.

### REQ-APP-10 Regression `/app/regression`
Data: `GET /regression/tests`. Primary action: "Re-run the regression check".
THE SYSTEM SHALL show each regression test with its last result and time, and the real failing output for any failed test. IF there are no tests THEN THE SYSTEM SHALL explain that a verified fix creates one, and link to `/app/fixes`.
THE SYSTEM SHALL show "The ghost is back. But this time, we caught it." only when a test with a recorded earlier pass has a recorded fail.

### REQ-APP-11 Reports `/app/reports`
Data: `GET /eval/latest`, recent runs. Primary action: "Download evidence (JSON)".
THE SYSTEM SHALL show metric tiles (planted barriers found, approved fixes verified, scenarios, sessions), an eval summary table with `agent_mode`, and "The Outcome" parchment card. All values SHALL come from backend results or show `--`.

### REQ-APP-12 Night Watch `/app/night-watch`
Data: `GET /night-watch/history`. Primary action: "Refresh history".
THE SYSTEM SHALL show the history table with date, journey, variant, mode, verdict, status, tokens, cost and latency, with status as icon plus text (pass, regression, fail, skipped, infrastructure failure).
WHEN history is empty THE SYSTEM SHALL show "No runs yet" with the command to run it once, and no placeholder rows.

### REQ-APP-13 Settings `/app/settings`
Primary action: "Check backend connection".
THE SYSTEM SHALL show Calm mode, High contrast, Text size and Sound, a reset-to-defaults link, and the backend connection status.

---

## REQ-DATA - Data, offline and empty states

### REQ-DATA-01 One client
THE SYSTEM SHALL call the backend only through `lib/api.ts`, reading `VITE_API_URL`.

### REQ-DATA-02 Five states
THE SYSTEM SHALL render every data view in one of: loading (skeleton), empty (with a clear next step), error (friendly, with retry), offline, or not available yet.

### REQ-DATA-03 Offline vs not available
WHEN the backend cannot be reached THE SYSTEM SHALL show the offline state.
WHEN the backend answers 404 or 405 for an endpoint this spec lists THE SYSTEM SHALL show the not-available-yet state with what the page will show once the endpoint exists.

### REQ-DATA-04 No fake data
THE SYSTEM SHALL NOT ship mock data, sample rows or placeholder numbers in production code. Test fixtures SHALL live under `tests/` only.

### REQ-DATA-05 Measured or dashes
THE SYSTEM SHALL render an unmeasured value as `--` plus "not yet measured". THE SYSTEM SHALL show `agent_mode` beside every result.

### REQ-DATA-06 Recent runs
UNTIL `GET /runs` exists, THE SYSTEM SHALL keep the ids of runs started from this browser in `localStorage` and read each with `GET /runs/{id}`, labelled "Runs started in this browser".

### REQ-DATA-07 Verdict authority
THE SYSTEM SHALL display `verdict` and `reason_code` exactly as returned. THE SYSTEM SHALL NOT compute, invert or soften them.

### REQ-DATA-08 Backend contract
THE SYSTEM SHALL document in the design the endpoints each page needs and whether they exist today. Missing endpoints are tracked as dependencies, not built by this spec.

---

## REQ-SET - Settings on every page

### REQ-SET-01 Where
THE SYSTEM SHALL render a Settings control in the header of both shells and on 404 and error pages, in the same position.

### REQ-SET-02 What
THE SYSTEM SHALL offer Calm mode, High contrast and Text size (100%, 125%, 150%), all keyboard operable, plus the Sound toggle.

### REQ-SET-03 Saved and early
THE SYSTEM SHALL save choices on the device and apply them before first paint using a small blocking script, so there is no flash of the wrong setting.

### REQ-SET-04 Calm default
WHILE the system prefers reduced motion THE SYSTEM SHALL show Calm mode as on and locked, with the reason in text.

### REQ-SET-05 High contrast
WHILE High contrast is on THE SYSTEM SHALL switch to the high-contrast token set and hide ambient effects.

### REQ-SET-06 Text size
WHILE Text size is 150% THE SYSTEM SHALL keep every page usable with no horizontal scroll at 200% browser zoom on top of it.

---

## REQ-GLOSS - Glossary, tooltips, Start here

### REQ-GLOSS-01 Glossary page
THE SYSTEM SHALL provide `/glossary` listing every themed or technical term with a plain-English definition, including at least: ghost, possession mode, exorcist, ghost hunter, verdict, checker, agent mode, scripted, llm, WCAG, axe-core, focus trap, regression, Night Watch, blocked element.

### REQ-GLOSS-02 Inline terms
THE SYSTEM SHALL render each themed or technical term as a `Term` component. At its first use on a page the plain-English meaning SHALL appear beside it in text. Later uses SHALL open the definition in a keyboard and touch operable popover with a link to `/glossary#term`.

### REQ-GLOSS-03 Theme mapping
THE SYSTEM SHALL define "Ghost = an accessibility barrier", "Possession Mode = a keyboard-only run of a user journey", "Exorcist = the agent that proposes a fix (a human approves it)".

### REQ-GLOSS-04 Start here
WHEN a visitor opens the site for the first time THE SYSTEM SHALL show a dismissible, non-modal "Start here" guide with three steps. Dismissal SHALL be saved on the device.

### REQ-GLOSS-05 Reopen
THE SYSTEM SHALL let the visitor reopen the guide from the Help menu in the header, in the same place on every page.

### REQ-GLOSS-06 Microcopy
THE SYSTEM SHALL write empty states, toasts and 404 text with one spooky line followed by one plain instruction.

---

## REQ-ERR - Not-found and error pages

### REQ-ERR-01 Pages
THE SYSTEM SHALL provide `NotFound` (catch-all), `RouteError` (route error element) and a top-level `ErrorBoundary` page in the spooky theme, each with an `<h1>`, a plain explanation, and a clear way back (Home and, where relevant, the app Overview).

### REQ-ERR-02 App scope
THE SYSTEM SHALL show a not-found page inside the app shell for unknown `/app/...` paths.

### REQ-ERR-03 Reset
THE SYSTEM SHALL offer "Try again" on `error` pages that retries the failed route. WHEN the failure is a lazy-route chunk that could not load (for example after a new deploy) THE SYSTEM SHALL say a new version is available and offer Reload.

### REQ-ERR-04 No details
THE SYSTEM SHALL NOT show stack traces or internal messages to visitors.

---

## REQ-UI - Design system

### REQ-UI-01 Tokens
THE SYSTEM SHALL define color, type, spacing, radius, shadow and motion tokens once in `tailwind.config.ts` and CSS variables, taken from the UI v7 palette. Components SHALL NOT contain hex values.

### REQ-UI-02 Type scale
THE SYSTEM SHALL use a rem type scale with a 1rem minimum for content text. The display face SHALL be used for the wordmark only.

### REQ-UI-03 Spacing grid
THE SYSTEM SHALL use an 8px spacing grid (multiples of 0.5rem).

### REQ-UI-04 Component library
THE SYSTEM SHALL build UI from one library on accessible primitives (shadcn/ui on Radix): Button, Link, Badge, StatusBadge, Card, Table, DataTable, Dialog, Sheet, Popover, DropdownMenu, Tabs (inside pages only), Tooltip-free `Term`, Toast, Form field, Input, Select, RadioGroup, Switch, Skeleton, EmptyState, ErrorState, OfflineState, NotAvailableState.

### REQ-UI-05 Status badges
THE SYSTEM SHALL render every status as icon plus text. THE SYSTEM SHALL NOT use color alone.

### REQ-UI-06 Data tables
THE SYSTEM SHALL render tables as semantic `<table>` with caption, `scope` headers, sort buttons that set `aria-sort`, and row links reachable by Tab. A table wider than its container SHALL scroll inside a labelled, focusable region.

### REQ-UI-07 Toasts
THE SYSTEM SHALL announce toasts through `aria-live="polite"` (errors `assertive`), keep them on screen long enough to read, and let a keyboard user dismiss them.

### REQ-UI-08 Targets
THE SYSTEM SHALL give interactive controls at least 44 by 44 CSS pixels where layout allows, and never less than 24 by 24.

### REQ-UI-09 Forms
THE SYSTEM SHALL label every input, show errors in text linked with `aria-describedby`, and move focus to the first error on a failed submit.

---

## REQ-MOTION - Ambient and immersive layer

### REQ-MOTION-01 Reuse
THE SYSTEM SHALL reuse the immersive layer (fog, wisps, ambient ghost, graveyard scene, fps guard, capability detection, sound) under the rules in `product-rules.md`.

### REQ-MOTION-02 Decorative
THE SYSTEM SHALL render ambient effects with `aria-hidden="true"`, `pointer-events: none`, never focusable, and below page content.

### REQ-MOTION-03 Separate from semantic ghosts
THE SYSTEM SHALL keep the ambient ghost a different component from `GhostMascot`. Ambient animation SHALL NOT affect semantic ghosts.

### REQ-MOTION-04 Off conditions
WHILE Calm mode or High contrast is on THE SYSTEM SHALL stop roaming, particles, 3D and parallax. WHILE the device is mobile or low-power THE SYSTEM SHALL NOT load 3D code.

### REQ-MOTION-05 Quality guard
IF frames stay under 40fps for 2 seconds THEN THE SYSTEM SHALL drop 3D and particles, then the roam.

### REQ-MOTION-06 Lazy
THE SYSTEM SHALL lazy-load all 3D code. Content and navigation SHALL work before animations load.

### REQ-MOTION-07 Sound
THE SYSTEM SHALL keep sound off until the visitor turns it on and SHALL never autoplay audio.

### REQ-MOTION-08 Counters
THE SYSTEM SHALL animate a counter only toward a measured number. An unmeasured metric stays `--`.

---

## REQ-SEO - Metadata, discovery and hosting

### REQ-SEO-01 Per-page metadata
THE SYSTEM SHALL set a unique `document.title` for every route from the manifest through `useRouteAnnouncer`. Dynamic routes SHALL use the short id from the URL and SHALL NOT wait for the backend. `index.html` SHALL hold static `title` and `description` for the product.

### REQ-SEO-02 Open Graph
THE SYSTEM SHALL provide static Open Graph and Twitter card tags and `public/og-image.png` (1200x630) in `index.html`. All URLs share this one preview because there is no server-side rendering. WHERE `VITE_SITE_URL` is unset THE SYSTEM SHALL remove the absolute `og:url` and `og:image` tags rather than guess.

### REQ-SEO-03 Sitemap and robots
THE SYSTEM SHALL ship a committed `public/robots.txt` that disallows `/app/` and `/fixtures/`, and a `public/sitemap.xml` generated at build time from the marketing routes in the manifest.
WHERE `VITE_SITE_URL` is unset THE SYSTEM SHALL omit absolute URLs rather than guess one.

### REQ-SEO-04 Icons
THE SYSTEM SHALL provide `public/favicon.svg` and an Apple touch icon drawn from the ghost mark, linked in `index.html`.

### REQ-SEO-05 App not indexed
THE SYSTEM SHALL mark `/app/**` and the not-found page `noindex` at runtime through `useRouteAnnouncer`, and SHALL disallow `/app/` and `/fixtures/` in `robots.txt`. The fixture file carries its own `noindex` meta tag.

### REQ-SEO-06 Deep links

THE SYSTEM SHALL ship `dashboard/vercel.json` with a rewrite of all paths to `/index.html`, so any route loads when opened directly. Real files (`robots.txt`, `sitemap.xml`, assets, the fixture) SHALL still be served as files. Unknown paths render the NotFound page (the host returns 200; this soft 404 is documented).

WHERE the site is served from GitHub Pages THE SYSTEM SHALL copy `index.html` to `404.html` in that build so deep links load.

---

## REQ-A11Y - Accessibility of this site (WCAG 2.2 AA)

### REQ-A11Y-01 Text and zoom
THE SYSTEM SHALL render content text at 1rem or larger, work at 200% zoom with no horizontal scroll (tables and the Try stage excepted inside labelled scroll regions), and work from 375px wide up to wide desktop.

### REQ-A11Y-02 Focus
THE SYSTEM SHALL show a visible focus indicator on every interactive element with at least 3:1 contrast, and keep a logical tab order.

### REQ-A11Y-03 Semantics first
THE SYSTEM SHALL use native elements first and ARIA only where no native element fits.

### REQ-A11Y-04 Contrast
THE SYSTEM SHALL meet AA contrast for text and UI boundaries in default and high-contrast sets.

### REQ-A11Y-05 Not by colour alone
THE SYSTEM SHALL pair every colour signal with an icon or text.

### REQ-A11Y-06 Live regions
THE SYSTEM SHALL use `aria-live="polite"` for timelines, checklists and toasts.

### REQ-A11Y-07 Consistent help
THE SYSTEM SHALL place navigation and the Help menu in the same position on every page (WCAG 3.2.3, 3.2.6).

### REQ-A11Y-08 Reduced motion
THE SYSTEM SHALL disable ghost floating, glow pulses, particles and page transitions under `prefers-reduced-motion`, and under Calm mode. No animation SHALL flash more than 3 times per second, and none SHALL cycle faster than 334ms.

### REQ-A11Y-09 Drag and pointer
THE SYSTEM SHALL NOT require dragging or path-based gestures for any action.

---

## REQ-CONTENT - Real content only

### REQ-CONTENT-01 No filler
THE SYSTEM SHALL NOT contain lorem ipsum, invented customers, logos, testimonials, prices or statistics.

### REQ-CONTENT-02 Sourced figures
THE SYSTEM SHALL render a statistic only through a `Stat` component that requires either a `source` from `content/sources.ts` or a `measured` value. The type system SHALL reject any other use.
THE SYSTEM SHALL show the source name and year beside the figure.
IF a source has `status: "to-verify"` THEN a production build SHALL fail.

### REQ-CONTENT-03 Deck placeholders
THE SYSTEM SHALL treat bracket placeholders from the deck (for example "[x] of 6") as unmeasured and render `--`.

### REQ-CONTENT-04 Attribution
THE SYSTEM SHALL write "Built with Kiro" as plain text in the footer and on `/kiro`.

### REQ-CONTENT-05 No sign-in
THE SYSTEM SHALL NOT include login, sign-up or account pages. Accounts are Phase 2 and appear only as a roadmap item.

---

## REQ-TEST - Verification

### REQ-TEST-01 Route walk
THE SYSTEM SHALL have a Playwright test, run against `vite build && vite preview`, that loads every route in the manifest directly with `page.goto` (including deep links such as `/app/scans/abc123` and `/docs/quick-start`, and an unknown path that shows NotFound) and checks a unique non-empty title, exactly one H1, the required landmarks, a first-focus skip link that works, and exactly one primary action.

### REQ-TEST-02 Axe
THE SYSTEM SHALL have an axe-core test over every route in normal mode and in Calm mode (set through saved settings, with `html[data-calm=true]` asserted), failing on any violation, so zero errors are required in both. It SHOULD also run in High contrast mode and at Text size 150%.

### REQ-TEST-03 Keyboard walk
THE SYSTEM SHALL have a keyboard-only Playwright test from Home to Try to Fixes to Reports using only Tab, Shift+Tab, Enter and Space.

### REQ-TEST-04 Focus and title
THE SYSTEM SHALL have a test that after each client navigation focus is on the H1 and `#route-announcer` reads "Navigated to" plus the new H1.

### REQ-TEST-05 Data states
THE SYSTEM SHALL have tests that each data view renders its loading, empty, error, offline and not-available states, using test fixtures that are not shipped.

### REQ-TEST-06 Content rules
THE SYSTEM SHALL have tests that fail on banned filler strings, on a `Stat` without a source or measurement, and on a Kiro evidence link to a missing path.

### REQ-TEST-07 Settings
THE SYSTEM SHALL have tests that settings persist across reload and are applied before first paint.

### REQ-TEST-09 Hosting config
THE SYSTEM SHALL have a test that `vercel.json` contains the catch-all rewrite and that `/robots.txt` and `/sitemap.xml` are served as non-HTML.

### REQ-TEST-08 Hook
THE SYSTEM SHALL update the `axe-on-save` hook so it scans the real routes of the new site (default dev server `http://localhost:5173`).
