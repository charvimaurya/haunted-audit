# Pixel-faithful UI v7 - Requirements

**Goal:** rebuild the six screens of `design/Haunted_Audit_Final_UI_v7.png` as separate pages of the existing Vite + React + TypeScript dashboard, matching the image as closely as the rules allow, with real data and accessible behaviour.
**Source of truth:** `design/Haunted_Audit_Final_UI_v7.png` (1866 x 779 px; it includes the white side panel, which is never rendered).
**Steering followed:** `ui-fidelity.md`, `product-rules.md`, `product-ux.md`. Where rules conflict, the stricter one wins and the conflict is listed under "Conflicts and decisions" for the owner to settle before code changes.
**Backend:** no backend contract changes. Pages read `POST /runs`, `GET /runs/{id}`, `GET /runs/{id}/events`, `GET /ping` today, and `/fixes` and `/regression` shapes only as defined in `.kiro/specs/exorcist/` and `.kiro/specs/fix-verify-prevent/` once those exist.
**Status of this spec:** DRAFT. Nothing is built.

## Relationship to other specs

- `multipage-routing-controls` (draft): its router, route announcer and settings system are reused as designed (its design sections 5, 6, 8, 9, 10). Where it lists routes (`/try`, `/results`, `/app/*`), **this spec's routes replace them for the six v7 screens**. Its other pages (how it works, trust, roadmap, about, accessibility, glossary, `/app/*`) are out of scope here and stay planned there.
- `product-shell-ia` (draft): superseded for these six screens; its component and data ideas are reused where they do not conflict.
- `exorcist`, `fix-verify-prevent`: define the data the Fix pipeline page reads. Until they are built, that page shows "Not available yet" states, not made-up content.

## Conventions

EARS: WHEN trigger THE SYSTEM SHALL response. IF condition THEN ...
Every requirement has a **Check** that a test or a recorded manual comparison can answer.
"Image" means the v7 PNG. "Tokens" means entries in `design/tokens.json`, `tailwind.config.js` and `src/index.css`.

---

## REQ-TOK - Design tokens sampled from the image

### REQ-TOK-01 Sampled, not guessed
THE SYSTEM SHALL define every colour token from a pixel sampled in the image, and SHALL record in `design/tokens.json` the token name, the hex value, the pixel position (x, y), and the panel it came from. Positions SHALL be flat areas (no gradients, artwork, glow or text edges), measured as the median of a 5 x 5 pixel block.
**Check:** a script `scripts/sample-tokens.py` regenerates `tokens.json` from the PNG; a test fails if `tailwind.config.js` or `index.css` differs from `tokens.json`.

### REQ-TOK-02 Token set
THE SYSTEM SHALL provide tokens for at least: page base, panel fill, panel border (violet), glow violet, header fill, code block fill, text, muted text, violet pill, violet pill hover, ghost Ready purple, Blocked red, Verified green, parchment light, parchment dark, parchment ink, diff removed, diff added.
**Check:** `tokens.json` contains each name with a position.

### REQ-TOK-03 No stray colours
THE SYSTEM SHALL NOT contain a hex or `rgb()` colour outside `tailwind.config.js`, `src/index.css` and the SVG art files in `src/art/`. SVG art colours SHALL reference CSS variables where they carry state (purple, red, green).
**Check:** a source scan test.

### REQ-TOK-04 Contrast wins over a sample
IF a sampled text colour on its background is below 4.5:1 (body text) or 3:1 (large text, icons, borders that carry meaning) THEN THE SYSTEM SHALL use the nearest passing tone and SHALL record the sampled value, the used value and the reason in `docs/ui-fidelity.md`.
**Check:** `scripts/contrast-check.mjs` passes for every text and background pair in use and writes the list of adjusted tokens.

---

## REQ-TYPE - Type and assets

### REQ-TYPE-01 Fonts
THE SYSTEM SHALL use one spooky display font (Uncial Antiqua) for the "Haunted Audit" wordmark only, Inter for all other text, and JetBrains Mono for code. `MedievalSharp` SHALL be removed from the font stack.
**Check:** a test greps for `font-display` use outside the wordmark component.

### REQ-TYPE-02 Self-hosted
THE SYSTEM SHALL self-host all three fonts from the app's own files and SHALL NOT load anything from `fonts.googleapis.com`, `fonts.gstatic.com`, or any CDN.
**Check:** `index.html` has no external URL; a Playwright test fails on any request to another origin while every page loads.

### REQ-TYPE-03 16px floor
THE SYSTEM SHALL render all text at 16px (1rem) or larger at the default text size, including labels, chips, badges, code and captions. Sizes SHALL be in `rem`.
**Check:** a Playwright test walks every text node on every page and fails if its computed font size is under 16px; a source scan fails on `text-xs`, `text-sm`, `text-[Npx]` and px font sizes.

### REQ-TYPE-04 Art is inline SVG
THE SYSTEM SHALL build all artwork (mascot, icons, scene, pumpkins, bats, tombstones, parchment, magnifier, laptop) as inline SVG in React components. It SHALL NOT use emoji as art, raster images or an icon CDN.
**Check:** a source scan finds no emoji characters in `src/` (except tests) and no `<img src=` for art.

---

## REQ-ART - Mascot and icons

### REQ-ART-01 Mascot, three states
THE SYSTEM SHALL provide `GhostMascot` as inline SVG: a round-bodied ghost in three states: **Ready** (purple, with a witch hat), **Blocked** (red, angry), **Verified** (green, happy). The `state` prop picks colour and face. It SHALL be `aria-hidden` when decorative.
**Check:** unit tests render each state and assert the colour token and the face variant; a snapshot of the SVG markup per state.

### REQ-ART-02 Tiny ghost icon
THE SYSTEM SHALL provide a tiny ghost icon used by the logo, the "Possess This App" button, Detect/Fix/Verify/Prevent where the image shows it, and the Kiro pill.
**Check:** unit test.

### REQ-ART-03 Icon set
THE SYSTEM SHALL provide inline SVG icons for: keyboard, microphone, target, magnifier with `</>`, laptop with accessibility symbol, check, cross, warning, bank, folder, file, bolt, code, play, arrow, bats, pumpkin, tombstone, moon, castle. Each icon SHALL accept a `title` for meaning or be `aria-hidden` when paired with visible text.
**Check:** a test renders every icon and runs jest-axe.

### REQ-ART-04 State is never colour alone
Every red, green or purple status SHALL also carry an icon shape and text (for example red cross + "Could not reach Send Payment", green check + "Navigated form").
**Check:** a test asserts each status element contains both an icon and text.

### REQ-ART-05 Ghost beside, never on
THE SYSTEM SHALL place the semantic ghost beside the control it describes and never over it (no overlap with the control's box). It is a different component from any ambient decoration.
**Check:** Playwright test: with the bounding box of the control and of the ghost, no intersection.

---

## REQ-SHELL - Header, breadcrumbs, sidebar

### REQ-SHELL-01 Header on every page
THE SYSTEM SHALL show on every page: the ghost logo and "Haunted Audit", navigation Home, Scans, Journeys, Fixes, Kiro, Reports, and a violet pill button "Kiro" with an icon at the right.
**Check:** the same header markup renders on all seven routes; screenshot compare in the fidelity doc.

### REQ-SHELL-02 Current page marked
THE SYSTEM SHALL mark the current page with `aria-current="page"`, bold text and an underline (not colour alone), following the real URL.
**Check:** a test per route: exactly one nav item has `aria-current="page"`.

### REQ-SHELL-03 Nav targets
THE SYSTEM SHALL link: Home to `/`; Scans to `/scans`; Journeys to `/journeys/send-payment/possession`; Fixes to `/journeys/send-payment/fixes/find`; Kiro to `/kiro`; Reports to `/reports`. The "Kiro" pill goes to `/kiro`. No link is a hash anchor or does nothing.
**Check:** a test clicks each and asserts the URL and the H1.

### REQ-SHELL-04 Scans page
THE SYSTEM SHALL provide `/scans` with the same header and an H1 "Scans" and a "Not available yet" state naming the missing endpoint (`POST /scan`), because the image has no Scans screen and the backend has no scan endpoint.
**Check:** route test; no invented rows.

### REQ-SHELL-05 Breadcrumbs
Journey pages SHALL show breadcrumbs "Haunted Audit > Journey: Send Payment" and, on the Possession page, "Kiro > Journey: Send Payment > Possession Mode" exactly as the image shows. The last item is plain text with `aria-current="page"`.
**Check:** unit test per page.

### REQ-SHELL-06 Journey sidebar
Journey pages other than Possession SHALL show a left sidebar: Overview, Agents, Findings, Fixes, Verification, Regression, Kiro, Reports; the current item highlighted in violet with a visible non-colour mark. Targets: Overview to Possession; Agents to Agents; Findings to Fix pipeline step find; Fixes to step fix; Verification to step verify; Regression to step regression; Kiro to `/kiro`; Reports to `/reports`.
**Check:** a test clicks each and asserts the URL.

### REQ-SHELL-07 Landmarks
Each page SHALL have `header`, named `nav`, `main`, `footer`, an `aside` for the sidebar where present, and a skip link as the first focusable element.
**Check:** axe and a landmark test.

### REQ-SHELL-08 Small screens
Below 1024px THE SYSTEM SHALL collapse the navigation into a Menu button (`aria-expanded`, `aria-controls`, Escape closes and returns focus) and move the sidebar into the same menu.
**Check:** Playwright at 375px.

### REQ-SHELL-09 Accessibility settings
THE SYSTEM SHALL provide, on every page and in the same place, a control for Calm mode, high contrast and text size (and Reset), reached by keyboard, as designed in `multipage-routing-controls`. It is shown as one icon button with a visible text label "Settings" beside the Kiro pill. This control is not in the image; the difference is listed in `docs/ui-fidelity.md`.
**Check:** present on every page; Calm turns off all ambient motion; high contrast switches tokens.

### REQ-SHELL-10 Footer and attribution
THE SYSTEM SHALL show "Built with Kiro" as plain text in the footer of every page.
**Check:** text present, not a link or logo.

---

## REQ-NAV - Navigation behaviour

### REQ-NAV-01 One route per screen
THE SYSTEM SHALL provide React Router routes: `/`, `/scans`, `/journeys/send-payment/possession`, `/journeys/send-payment/agents`, `/journeys/send-payment/fixes/:step` (`find`, `fix`, `verify`, `regression`), `/kiro`, `/reports`, and a not-found route. `/journeys/send-payment/fixes` and an unknown `:step` SHALL redirect to `.../fixes/find`. `/journeys/send-payment` redirects to the Possession route. `vercel.json` has the SPA rewrite.
**Check:** routes test, including a direct load of every route and refresh.

### REQ-NAV-02 On every navigation
THE SYSTEM SHALL scroll to the top, set a unique `document.title`, move focus to the page's visible `<h1>`, and announce "Navigated to {H1}" in a polite live region. It SHALL NOT move focus on first load.
**Check:** Playwright for each route, including Back and Forward.

### REQ-NAV-03 Lazy and safe
THE SYSTEM SHALL lazy-load each route, show a "Loading page" state without animation when Calm is on, and show an error page inside the shell when a route fails.
**Check:** tests with a failing import.

### REQ-NAV-04 Visible H1 per page
Each page SHALL have exactly one visible `<h1>`: Home "Haunted Audit"; Possession "Possession Mode"; Agents "The Ghost Hunt - Agent Investigation"; Fix pipeline the current step's card title ("Critical Ghost Detected", "Proposed Fix (by Exorcist Agent)", "Verification (by Verifier Agent)", "Regression Guard (The Returning Ghost)"); Kiro "Kiro Integration - Accessibility in Your Workflow"; Results "Results"; Scans "Scans".
**Check:** one-H1 test per route.

---

## REQ-HOME - Home `/` (top-left panel)

### REQ-HOME-01 Scene
THE SYSTEM SHALL draw as inline SVG a night graveyard: purple sky, a big pale moon, a haunted castle silhouette, bats, tombstones, pumpkins at both lower corners, and the witch-hat ghost holding a laptop that shows an accessibility icon on its screen, with a magnifier showing `</>`.
**Check:** a test asserts the SVG contains elements with `data-art` ids for moon, castle, bats, tombstones, two pumpkins, ghost, laptop, magnifier; screenshot compared with the image panel.

### REQ-HOME-02 Copy
THE SYSTEM SHALL show, in this order: the wordmark "Haunted Audit" in the display font with a glow (the page `<h1>`); "The accessibility guardrail for AI-built applications."; "Feel the barrier. Fix the cause. Prove the journey."
**Check:** text assertions.

### REQ-HOME-03 Primary action
THE SYSTEM SHALL show a glowing violet pill link with a ghost icon, "Possess This App", that navigates to `/journeys/send-payment/possession`. It is a real link (`<a>`), starts no run, and is the only primary-styled control on the page.
**Check:** click test; no request to `POST /runs`; exactly one primary action.

### REQ-HOME-04 Pills
THE SYSTEM SHALL show under it four small dark pills with icons: Detect, Fix, Verify, Prevent. They are static labels, not links (as in the image), in a list with an accessible name.
**Check:** four list items with icon and text; none focusable.

### REQ-HOME-05 Plain English
THE SYSTEM SHALL provide the plain-English meaning of "Possess" and "Ghost" for assistive technology on this page (see decision D17) and SHALL NOT add visible copy not in the image unless the owner chooses that option.
**Check:** `aria-describedby` target text exists.

### REQ-HOME-06 Motion
Any animation on the scene (for example slow bat drift or moon glow) SHALL be decorative, `aria-hidden`, `pointer-events: none`, stopped by Calm mode and reduced motion, and no cycle shorter than 334 ms.
**Check:** with Calm on, `document.getAnimations()` has no running animation on the page.

---

## REQ-POS - Possession Mode `/journeys/send-payment/possession` (top-right panel)

### REQ-POS-01 Frame
THE SYSTEM SHALL show the breadcrumb "Kiro > Journey: Send Payment > Possession Mode" and a red "Live Test" badge with an icon and text, and the H1 "Possession Mode" with the sub-line "Keyboard-only demonstration".
**Check:** text assertions.

### REQ-POS-02 Bank panel
THE SYSTEM SHALL show the Haunted Bank test site titled "Haunted Bank" and "Test site", with its own sidebar (Dashboard, Send Payment active, Accounts, Transactions), the heading "Send Payment", the fields Recipient and Amount, and a "Send Payment" control drawn with a red dashed outline in the broken state.
**Check:** DOM assertions; screenshot compared with the image.

### REQ-POS-03 Real page, real keys
THE SYSTEM SHALL render the bank panel as the real fixture (`fixtures/haunted_bank/index.html`, `?variant=broken`) in a same-origin `<iframe title="Haunted Bank - Test site">`, scaled to fit, so that the judge's own Tab key presses go to real controls. (Decision D4; the alternative is a React replica, which cannot place the ghost from real coordinates.) The fixture file is not edited unless the owner approves D20.
**Check:** the iframe loads from the app's own origin; pressing Tab inside it moves real focus.

### REQ-POS-04 Field values
THE SYSTEM SHALL show Recipient "Alex Carter" and Amount "EUR 50.00" only as the values the journey uses, read from the journey definition shown on the page (the run's `goal`), and SHALL NOT type into the fixture by itself. The judge can type their own values. The fields do not claim to hold real data. (Decision D2: you earlier asked to remove prefilled demo names; the image shows them.)
**Check:** field values come from one constant `JOURNEY` defined in one file, labelled in the UI as the test journey.

### REQ-POS-05 Live checklist from real focus
THE SYSTEM SHALL fill the right-hand panel "Possession Mode, Keyboard-only demonstration" live from real focus events inside the iframe: "Tab to Recipient" turns green with a check when `#recipient` receives focus; "Tab to Amount" likewise for `#amount`; "Tab to Send Payment (stuck)" turns red with a cross when the judge has Tabbed through at least 8 distinct focusable elements and returned to the first without `#send-payment` receiving focus. Until then each item shows a neutral "pending" icon and text. A list item never turns green or red without the matching event.
**Check:** Playwright presses Tab in the iframe and asserts each item changes at the right key press; a test with no key presses shows all pending.

### REQ-POS-06 Labelled as the judge's own observation
THE SYSTEM SHALL label the checklist "Your key presses" (it is not the checker's verdict) and SHALL show the red outlined "Barrier Detected!" button only after the checker's result arrives with `verdict = BLOCKED` (see REQ-POS-08). Before that the button is replaced by "Run the checker" (a real button that starts a scripted run).
**Check:** the "Barrier Detected!" text is absent before a BLOCKED result.

### REQ-POS-07 Run controls
THE SYSTEM SHALL provide a "Run the checker" button (variant `broken` or `fixed`, mode `scripted` or `llm`), call `POST /runs`, stream `GET /runs/{id}/events`, and read `GET /runs/{id}`. It SHALL show `agent_mode` beside the result. IF the API is offline THEN it SHALL show an offline state with Retry and no result.
**Check:** tests with the real API and with aborted requests.

### REQ-POS-08 Ghost from the checker
THE SYSTEM SHALL pin the red ghost, and the tooltip card "Journey Blocked: The payment button cannot be reached using keyboard navigation.", using only `blocked_element.bounding_box` from the API result, scaled by the iframe's scale from the 1280 x 800 viewport. The ghost sits beside the control and never over it (REQ-ART-05). WHEN there is no result THE SYSTEM SHALL show the purple Ready ghost away from the form and SHALL NOT invent coordinates.
**Check:** Playwright: the ghost's box does not intersect the control's box and its left edge is greater than the control's right edge (or it is on the other side if there is no room).

### REQ-POS-09 States
THE SYSTEM SHALL show Ready (purple), Blocked (red, from a BLOCKED verdict) and Verified (green, from a PASSED verdict on the `fixed` variant), each with icon and text. Verdict and `reason_code` are shown as the checker returned them.
**Check:** three state tests.

### REQ-POS-10 Tooltip text source
The tooltip sentence is the image's copy, shown only for `reason_code = TARGET_NOT_FOCUSABLE`. For other reason codes THE SYSTEM SHALL show a plain sentence for that code from a fixed table (FOCUS_TRAP, NO_ACTIVATION, STEP_LIMIT, TIMEOUT).
**Check:** table-driven test.

---

## REQ-AGT - Agents `/journeys/send-payment/agents` (middle-left panel)

### REQ-AGT-01 Frame
THE SYSTEM SHALL show the H1 "The Ghost Hunt - Agent Investigation", the journey sidebar with Agents active, and the breadcrumb "Haunted Audit > Journey: Send Payment".
**Check:** text and `aria-current` assertions.

### REQ-AGT-02 Three agent cards
THE SYSTEM SHALL show three cards: Keyboard Agent (keyboard icon), Voice Agent (microphone icon), Ghost Hunter (target icon), each with a green-check row and a red-cross row using the image's copy where real data supports it:

| Card | Green row (shown only when true) | Red row (shown only when true) |
|---|---|---|
| Keyboard Agent | "Navigated form" when the run's focus trail contains `#recipient` and `#amount` | "Could not reach Send Payment" when verdict is BLOCKED and reason is TARGET_NOT_FOCUSABLE |
| Voice Agent | none until the voice agent exists | none until it exists |
| Ghost Hunter | "Identified root cause" when `blocked_element` is present | "Custom element not keyboard accessible" when `blocked_element.tag` is not a native interactive element and reason is TARGET_NOT_FOCUSABLE |

**Check:** table-driven tests from three stored results (broken, fixed, none); no row appears without its data.

### REQ-AGT-03 Voice Agent honesty
THE SYSTEM SHALL label the Voice Agent "voice-command simulation". Until a voice agent result exists it SHALL show "Not run yet" and `--`, not the image's "Found by name 'Send Payment'" and "Could not activate button" rows (those would be invented). The image's rows are shown only from a real voice result.
**Check:** with no voice data, the image's two rows are absent.

### REQ-AGT-04 Critical Ghost card
THE SYSTEM SHALL show, when `verdict = BLOCKED`, a red card "Critical Ghost Detected" with a red ghost, "Barrier: Payment button inaccessible to keyboard navigation", "Impact: Customer cannot complete payment", "WCAG: 2.1.1 Keyboard, 4.1.2 Name, Role, Value". The text comes from a fixed table keyed by `reason_code` (D8) until the API returns severity and WCAG fields, and the card says nothing else. WHEN verdict is PASSED or there is no result the card is replaced by a neutral "No ghost detected yet" or "No barrier found" state.
**Check:** table test; no card for PASSED.

### REQ-AGT-05 Thumbnail
THE SYSTEM SHALL show, in place of the image's screenshot thumbnail, a small drawn tile of the blocked control built from `blocked_element.text` and `tag` with a red dashed outline and a blocked icon, because the API does not serve screenshots. The difference is listed in `docs/ui-fidelity.md`.
**Check:** tile text equals `blocked_element.text`.

### REQ-AGT-06 Live timeline
THE SYSTEM SHALL show a live timeline of step events during a run (tool, key, focused element before and after) in a polite live region, appended as events arrive, and keep it after the run.
**Check:** a real scripted run shows events while running.

### REQ-AGT-07 Offline and empty
WHEN the API is offline or there is no run THE SYSTEM SHALL show an offline or "Run a journey first" state with a link to Possession Mode, not placeholder results.
**Check:** both states.

---

## REQ-FIX - Fix pipeline `/journeys/send-payment/fixes/:step` (middle-right panel)

### REQ-FIX-01 Strip
THE SYSTEM SHALL show a four-step strip: 1 Find, 2 Fix, 3 Verify, 4 Regression. The current step is filled violet and also marked with `aria-current="step"` and a visible text/shape mark. Completed steps show a check. The strip is a list of links to the four step routes.
**Check:** per-step test.

### REQ-FIX-02 One step at a time, Back and Next
THE SYSTEM SHALL show only the current step's card, with Back and Next buttons (links to the neighbouring routes; Back is absent on Find, Next absent on Regression).
**Check:** navigation tests including keyboard.

### REQ-FIX-03 Find
THE SYSTEM SHALL show the "Critical Ghost Detected" card of REQ-AGT-04 as step 1 (the image shows no separate Find card).
**Check:** step 1 equals the Agents card content.

### REQ-FIX-04 Fix
THE SYSTEM SHALL show "Proposed Fix (by Exorcist Agent)": the diff from `GET /fixes/{id}` as text with `-` and `+` markers (red removed line, green added line, also marked by sign and word, not colour alone), buttons "Approve Fix" (green outline, check icon) and "Reject" (cross icon). Approve and Reject call `POST /fixes/{id}/approve` and `/reject`; nothing is applied until a person clicks Approve Fix; the page states this. The diff shows `exorcist_mode`. IF no fix exists THEN a "Not available yet" state (or a "Propose a fix" button when the Exorcist API exists) replaces the card.
**Check:** with a mocked contract response: diff renders, Approve and Reject work by keyboard, a second decision is refused; without data: not-available state and no buttons.

### REQ-FIX-05 Verify
THE SYSTEM SHALL show "Verification (by Verifier Agent)": rows "Replaying journey...", "Tab to Send Payment", "Activate with Enter", "Payment successful", each with a check or cross from the Verifier's real result, and a green "Journey Verified" button (check icon) only when the checker's verdict on the patched copy is PASSED. Until the Verifier exists, THE SYSTEM SHALL show "Not available yet" and `--` rows.
**Check:** states test.

### REQ-FIX-06 Regression
THE SYSTEM SHALL show "Regression Guard (The Returning Ghost)" in a red-bordered card: "Bug reintroduced on purpose", `send_payment.spec.ts`, a red "FAILED: button not focusable" line with cross icon and text, a ghost, and "The ghost is back. But this time, we caught it." The file name, failing line and sentence appear only from a real regression result in which an earlier run passed and the later run failed. Until then: "Not available yet".
**Check:** the sentence is absent unless pass-then-fail data exists.

### REQ-FIX-07 Contrast and focus on cards
Red-bordered and green-outlined cards SHALL keep AA contrast and visible focus on their buttons.
**Check:** axe.

---

## REQ-KIRO - Kiro integration `/kiro` (bottom-left panel)

### REQ-KIRO-01 Frame
THE SYSTEM SHALL show the H1 "Kiro Integration - Accessibility in Your Workflow".
**Check:** text.

### REQ-KIRO-02 File tree from the repo
THE SYSTEM SHALL show a file tree with `.kiro/` and its real sub-folders (agents/, specs/, hooks/ highlighted, powers/ or the real equivalent, steering/) generated at build time from the repository's actual folders. A folder that does not exist SHALL NOT be shown. The tree is keyboard navigable (arrow keys, Home, End) with one tab stop.
**Check:** a build script writes `src/generated/kiro-tree.json`; a test compares it with `git ls-files .kiro`; a keyboard test.

### REQ-KIRO-03 Code view
THE SYSTEM SHALL show a code view with a tab named after the real hook file and showing its real content (`.kiro/hooks/axe-on-save.json`), included at build time, in a labelled scroll region with JetBrains Mono. The image's tab name "accessibility-hook.ts" is not used because no such file exists (decision D12).
**Check:** the displayed code equals the file's content.

### REQ-KIRO-04 Hook card
THE SYSTEM SHALL show a "Kiro Hook" card with three lines: "File saved", "Haunted Audit scan triggered" (taken from the hook's `trigger` and `description`) and the result line "Accessibility issue found: Missing accessible label" with a red icon, marked as "Example result" because no live hook feed exists. It SHALL NOT claim "(Live)" unless a real hook result is available.
**Check:** the word "Live" is absent unless real data is shown; "Example result" label present.

### REQ-KIRO-05 Attribution
THE SYSTEM SHALL show a violet pill reading "Built with Kiro" as plain, non-interactive text (not a link or button).
**Check:** the element is not focusable.

---

## REQ-RES - Results `/reports` (bottom-right panel)

### REQ-RES-01 Tiles
THE SYSTEM SHALL show four tiles with icons: "Planted barriers detected" (x / 6), "Approved fixes verified" (x %), "Test scenarios evaluated" (n), "User sessions" (n). Each tile shows a real measured value or `--` with "not yet measured", and `agent_mode` where the value comes from runs. The literal brackets "[x]" and "[n]" SHALL never appear.
**Check:** with no data all four show `--`; with mocked contract data they show numbers.

### REQ-RES-02 Sources
Tile values come only from stored results: approved fixes verified from the fixes table, planted barriers and test scenarios from a benchmark result, user sessions from a recorded count. Where no source exists the tile stays `--`. THE SYSTEM SHALL NOT invent the denominator 6; it is shown only when a planted-barrier count has been measured.
**Check:** source scan finds no numeric literal used as a metric.

### REQ-RES-03 The Outcome card
THE SYSTEM SHALL show a parchment scroll card "The Outcome" (parchment tokens, ink text) with a mascot and three ticks: "Customer can complete the payment", "A regression test prevents it from breaking again", "Accessibility built into the dev workflow with Kiro". Tick 1 is green with a check only when the latest `fixed` run is PASSED; tick 2 only when a regression result shows the guard works; tick 3 is a product statement (always shown, green check). A tick without evidence is a neutral "not yet shown" icon with text. The mascot is green (Verified) only when tick 1 is true, otherwise purple.
**Check:** four-state test.

---

## REQ-A11Y - Accessibility

### REQ-A11Y-01 Baseline
THE SYSTEM SHALL meet WCAG 2.2 AA on every page: 16px text floor, visible 3px focus on every interactive element and not hidden by sticky bars, touch targets 44px where possible, contrast AA or better (REQ-TOK-04), one H1, landmarks, logical Tab order, no keyboard traps.
**Check:** axe zero violations on each page in normal, Calm and high contrast.

### REQ-A11Y-02 Zoom and reflow
THE SYSTEM SHALL work at 200% zoom and at the largest text size with no loss of content and no horizontal scroll except labelled scroll regions (the code view, the scaled iframe on small screens).
**Check:** Playwright at 640 px viewport and Largest text size.

### REQ-A11Y-03 Motion
THE SYSTEM SHALL honour `prefers-reduced-motion` and the Calm switch: all decorative animation stops at once, including ambient layers already running. Status stays visible as text.
**Check:** `document.getAnimations()` is empty with Calm on.

### REQ-A11Y-04 Icons with text
Icons that carry meaning have a text equivalent; decorative icons are `aria-hidden`.
**Check:** axe and an icon test.

### REQ-A11Y-05 Keyboard only
THE SYSTEM SHALL let a person do every action on every page with Tab, Shift+Tab, Enter, Space and arrow keys where the pattern needs them.
**Check:** the keyboard walk test.

---

## REQ-DATA - Real data only

### REQ-DATA-01 No invented values
THE SYSTEM SHALL show a value only if it was returned by the API or computed from returned values by a rule in code. Everything else is `--` with "not yet measured" or a "Not available yet" state. THE SYSTEM SHALL NOT ship sample runs, fake timings, fake counts or sample diffs.
**Check:** a scan test for numeric literals in components; screenshots of "mocked contract data" are labelled (REQ-FID-04).

### REQ-DATA-02 Verdict authority
THE SYSTEM SHALL display `verdict` and `reason_code` only as the checker returned them. An agent's claim is shown as `agent_claim` with a mismatch flag, never as the result.
**Check:** a test with a mismatching claim.

### REQ-DATA-03 `agent_mode` everywhere
Every result and metric display SHALL show `agent_mode` (`llm` or `scripted`) beside it. Scripted runs show `0` tokens and `0.0` cost; unmeasured values show `--`.
**Check:** test per display.

### REQ-DATA-04 Information barrier
THE SYSTEM SHALL NOT display or send `target_selector` or `success_selector` config values. The blocked element's selector from the checker result may be shown.
**Check:** source scan for those two names in dashboard code.

### REQ-DATA-05 Backend untouched
THE SYSTEM SHALL NOT require any change to API request or response shapes in this spec. The `/fixes` and `/regression` shapes are consumed as defined in their own specs.
**Check:** no file under `agent/api/` is changed in the PRs of this spec.

---

## REQ-FID - Fidelity check

### REQ-FID-01 Screenshots
THE SYSTEM SHALL provide `dashboard/e2e/ui-fidelity.mjs` (Playwright) that screenshots every page at 1440 px wide into `docs/ui-fidelity/{page}.png`, using the real API where an endpoint exists, and a mocked contract response (test only, never shipped) where it does not.
**Check:** running the script writes seven PNG files.

### REQ-FID-02 Side by side
THE SYSTEM SHALL provide `scripts/ui-fidelity-sheet.py` that crops each panel from the image (boxes in `design/panels.json`) and writes `docs/ui-fidelity/{page}-side-by-side.png` (image crop left, screenshot right) for review.
**Check:** seven side-by-side files.

### REQ-FID-03 Checklist
THE SYSTEM SHALL provide `docs/ui-fidelity.md` with, per page, a checklist of: layout, colours, copy, icons, states; each item marked Match, Differs (with the reason) or Not checked, plus any adjustment forced by contrast or the 16px floor.
**Check:** every page has all five lines and every "Differs" has a reason.

### REQ-FID-04 Data honesty in screenshots
Each screenshot SHALL be labelled in the document as "real API" or "mocked contract data".
**Check:** the label exists for every image.

### REQ-FID-05 Stop and review
THE SYSTEM SHALL stop after each page for the owner's review: the page's screenshot, side-by-side sheet and checklist are shown, and the next page does not start without an OK.
**Check:** the PR history shows one review point per page.

### REQ-FID-06 Copy transcript
THE SYSTEM SHALL record the exact copy of every screen read from the image at native resolution in `docs/ui-fidelity/copy.md` (including the Amount text, "EUR 50.00" or "€50.00") before the page is built, and any difference from this spec's copy is raised.
**Check:** the file exists before each page task starts.

---

## REQ-TEST - Tests

### REQ-TEST-01 Unit
Vitest SHALL cover tokens, mascot states, icon set, the view-model functions that turn API results into card rows, the Outcome four states, and source scans (hex, px text, emoji, CDN, `[x]`/`[n]`, hash links).

### REQ-TEST-02 Routes and focus
Playwright SHALL load every route directly and by link, and check title, one H1, focus on the H1 after in-app navigation, live-region text, Back and Forward.

### REQ-TEST-03 Real run
Playwright SHALL run the real API (scripted mode, temporary database) and a `broken` then `fixed` journey from Possession Mode, checking the live checklist, ghost position, verdict, Agents rows and Results.

### REQ-TEST-04 Keyboard
A keyboard-only Playwright test SHALL walk header, navigation, Settings, each page's controls, the Fix pipeline Back/Next and Approve/Reject (mocked contract), and the tree in `/kiro`.

### REQ-TEST-05 Axe
Axe-core SHALL report zero violations on every route in normal, Calm and high contrast modes.

### REQ-TEST-06 No console noise
Every route SHALL load and run without `console.error`, `console.warn` or uncaught exceptions.

---

## Conflicts and decisions (owner to settle before the design is approved)

| # | Conflict | Default in this spec |
|---|---|---|
| D2 | You earlier asked to remove the demo names ("I will fill it manually"); the image shows Alex Carter and the amount. | The image is the source of truth, so the page shows the journey's values as labelled test-journey values (REQ-POS-04). **Please choose: show them, or leave the fields empty.** |
| D4 | The image's bank panel is a custom dark design; the real fixture has its own gold look. A React replica would match the picture but cannot put the ghost from real checker coordinates. | Real fixture in an iframe. The look inside the frame differs from the image (listed). |
| D20 | Matching the bank panel exactly needs the fixture's CSS and layout changed. The fixture is the checker's test page and the plan's answer key. | Not changed. If you approve, a separate task restyles CSS and layout only, keeps every id, role, handler and variant behaviour, and a test compares the id list before and after. |
| D17 | `product-ux.md` wants a visible "What this page shows" line and plain-English meaning beside spooky terms; the image has neither and `ui-fidelity.md` says do not add copy. | Plain meanings and "what this page shows" are provided for assistive technology (`aria-describedby`), not shown. **Owner may choose visible lines instead.** |
| D16 | The image has no accessibility controls; `product-ux.md` requires Calm, high contrast and text size on every page. | One "Settings" button added beside the Kiro pill. Listed as a difference. |
| D1 | Fidelity says 16px minimum; the image uses small labels. | 16px floor wins; cards grow; listed in `ui-fidelity.md`. |
| D5 | The image's sidebar appears only on the Agents panel. You asked for the sidebar on journey pages. | Sidebar on Agents and the four Fix steps; Possession uses breadcrumb and Live Test badge only, as in the image. |
| D8 | Severity, impact and WCAG text on the "Critical Ghost Detected" card are not in the API. | A fixed table keyed by `reason_code` (rule, not measurement), replaced by API fields when activity 1.3 exists. |
| D11 | Fix, Verify and Regression data do not exist yet. | Shipped code shows "Not available yet". Screenshots use mocked contract responses and are labelled. |
| D12 | The image shows "accessibility-hook.ts" and a "(Live)" hook card; no such file or live feed exists. | Real file name and content; "Example result" label; no "Live". |
| D13 | The Results tiles "x / 6", "x%", "n", "n" have no data source today. | All `--` and "not yet measured" until sources exist. |
| D3 | The nav has Scans but there is no scan page or endpoint. | `/scans` shows a "Not available yet" state. |
| D6 | The Outcome card shows three green ticks always. | Ticks 1 and 2 turn green only with evidence; tick 3 is a product statement. |
| D14 | The wordmark in the image is a custom spooky lettering. | Uncial Antiqua (the steering's font), self-hosted; difference listed. |
| D18 | `multipage-routing-controls` lists different routes. | This spec's routes win for the six screens (see Relationship). |
