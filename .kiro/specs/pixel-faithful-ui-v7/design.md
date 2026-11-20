# Pixel-faithful UI v7 - Design

**Requirements:** `requirements.md` in this folder (IDs like REQ-POS-05 are cited below).
**Stack:** Vite 8, React 19, TypeScript, Tailwind 3, React Router (data router), Vitest, Playwright, `@axe-core/playwright`. No new backend code.
**Facts below marked "code read" come from reading `dashboard/` on 19 Nov 2026. Nothing here has been built or run.**

---

## 1. Decisions

The owner's open choices are in `requirements.md` under "Conflicts and decisions" (D1 to D20). Defaults used by this design are listed there. Design-only decisions:

| # | Decision | Why |
|---|---|---|
| X1 | A new folder `src/art/` holds all inline SVG (mascot, icons, scene). Components in `src/components/` import from it. | REQ-TYPE-04, REQ-TOK-03. One place where colour literals may live besides the two token files. |
| X2 | Token pipeline: `scripts/sample-tokens.py` reads the PNG and writes `design/tokens.json`; `scripts/build-tokens.mjs` writes the CSS variables block and a Tailwind colour map from it; both outputs are committed. | One source, no hand-typed hex. |
| X3 | Tailwind colours use `rgb(var(--c-name) / <alpha-value>)` so high contrast is a variable swap and opacity modifiers keep working. | Reuses the approach in `multipage-routing-controls` D9. |
| X4 | The route tree and the route announcer are the ones designed in `multipage-routing-controls` sections 5 and 6. If that work lands first, TASK-04 here only adds routes. | One implementation. |
| X5 | Run state lives in a `RunProvider` above the routes, so Back and Forward do not kill a running journey. | `multipage-routing-controls` D10. Needed by Possession, Agents, Fix and Results. |
| X6 | View-models are pure functions in `src/viewmodels/` (`agentRows(result)`, `ghostCard(result)`, `outcomeTicks(...)`). Components render them and never decide verdicts. | Testable tables; keeps rules out of JSX. |
| X7 | Screenshots for pages whose backend does not exist use Playwright `page.route` with responses typed from the contracts in `.kiro/specs/exorcist` and `fix-verify-prevent`. The mock lives in `dashboard/e2e/contract-mocks.ts` and is excluded from the build. | REQ-DATA-01, REQ-FID-04. |
| X8 | The fixture is served from the app at `/fixtures/haunted-bank/index.html`, copied by `scripts/copy-fixture.mjs` on `predev` and `prebuild` (git-ignored copy). | Same-origin iframe, one source of truth. |
| X9 | Scaling for the iframe: a 1280 x 800 stage scaled with `transform: scale(k)`, `k = min(1, containerWidth / 1280)`; below `k < 0.6` the stage becomes a labelled scroll region at `k = 1`. | Ghost coordinates are in the 1280 x 800 viewport (checker data). |

---

## 2. Image analysis and panel map

The image is 1866 x 779. The six screens occupy roughly the left 71% (the rest is the side panel, never rendered). TASK-01 measures exact boxes and writes `design/panels.json`:

```json
{ "image": {"w":1866,"h":779},
  "panels": [
    {"id":"home","route":"/","box":[x,y,w,h]},
    {"id":"possession","route":"/journeys/send-payment/possession","box":[...]},
    {"id":"agents","route":".../agents","box":[...]},
    {"id":"fix","route":".../fixes/fix","box":[...]},
    {"id":"kiro","route":"/kiro","box":[...]},
    {"id":"results","route":"/reports","box":[...]} ] }
```

(The numbers are filled by the task from the file, not guessed here.)

### Token plan (names; values come from sampling)

| Token | Where to sample (flat area) |
|---|---|
| `base` | page margin between panels |
| `panel` | inside the Possession panel body |
| `panel-border` / `glow` | panel outline (thin line, mid-stroke) |
| `header` | top bar of a panel |
| `code` | code block in Kiro panel |
| `ink`, `ink-muted` | body and caption text stroke centres at a heavy letter |
| `pill` / `pill-hover` | "Possess This App" button face, Kiro pill face |
| `ready`, `blocked`, `verified` | ghost body fill in each state |
| `parchment`, `parchment-dark`, `parchment-ink` | Outcome card face, edge, text |
| `diff-del`, `diff-add` | diff line backgrounds |

Each token row stores `x, y, panel` and the 5 x 5 median. Contrast is then checked (REQ-TOK-04).

---

## 3. File layout (additions and changes in `dashboard/`)

```
design/tokens.json  panels.json                      (repo root design/)
scripts/sample-tokens.py  build-tokens.mjs  contrast-check.mjs  ui-fidelity-sheet.py
          copy-fixture.mjs  gen-kiro-tree.mjs
dashboard/
  index.html                       no external URLs; pre-paint settings script
  public/fonts/                    self-hosted font files (copied by build from @fontsource)
  src/
    main.tsx  router.tsx  routes.ts
    art/            Ghost.tsx (3 states), GhostIcon.tsx, Icons.tsx, GraveyardScene.tsx,
                    Pumpkin.tsx, Bat.tsx, Parchment.tsx
    layouts/        RootLayout.tsx, SiteLayout.tsx (header, main, footer),
                    JourneyLayout.tsx (breadcrumb + sidebar)
    components/     Header, PrimaryNav, MobileMenu, SettingsMenu, Footer, SkipLink,
                    Breadcrumbs, JourneySidebar, PageHeading, LiveRegion, NavigationStatus,
                    HeroBlock, PillRow, BankFrame, PossessionPanel, GhostPin, TooltipCard,
                    AgentCard, GhostHuntCard, Timeline, StepStrip, FixCard, VerifyCard,
                    RegressionCard, DiffView, KiroTree, CodeView, HookCard, StatTile,
                    OutcomeCard, OfflineState, NotAvailableState
    pages/          Home, Possession, Agents, FixStep, Kiro, Reports, Scans, NotFound
    runs/           RunProvider.tsx, api.ts, useRun.ts
    viewmodels/     agentRows.ts, ghostCard.ts, outcomeTicks.ts, resultTiles.ts, tooltip.ts
    generated/      kiro-tree.json, kiro-hook.json (build output, committed or git-ignored: see 8)
    settings/       from multipage-routing-controls
    styles/         tokens.css (generated), index.css
  e2e/              routes, navigation, possession, agents, fix, kiro, results, keyboard,
                    axe, ui-fidelity.mjs, contract-mocks.ts
docs/ui-fidelity.md   docs/ui-fidelity/*.png
```

Existing components (`HeroSection`, `PossessionMode`, `GhostHuntSection`, `PipelineSection`, `KiroIntegrationSection`, `ResultsSection`, `OutcomeCard`, `AgentCard`, `GhostMascot`, `TopNav`) are replaced one page at a time. The old single page stays at `/` (as `LegacyHome`) until TASK-05, so the site works after every task.

---

## 4. Shell

### 4.1 Header (REQ-SHELL-01 to 03, 09)

`[GhostIcon] Haunted Audit (wordmark, display font, link to /)  [PrimaryNav: Home Scans Journeys Fixes Kiro Reports]  ... [Settings button] [Kiro pill link]`

- `PrimaryNav` renders from `routes.ts`, using `NavLink` (`aria-current="page"` on exact or section match) with bold + 2px underline for the active item.
- Active-section rule: Journeys is active for `/journeys/send-payment/possession` and `/agents`; Fixes is active for `/journeys/send-payment/fixes/*`. Only one item is marked.
- Kiro pill: violet fill, ghost icon + text "Kiro", `Link to="/kiro"`. It is a link styled as the pill; on the `/kiro` page it also has `aria-current="page"`.
- `SettingsMenu`: a disclosure button (icon + the visible word "Settings") with the panel from `multipage-routing-controls` section 9 (Calm, High contrast, Text size, Reset). Placed left of the pill.
- Below 1024px: Menu button; the sidebar items join the menu list (REQ-SHELL-08).
- Header height is a fixed rem value; `--header-h` drives `scroll-padding-top`.

### 4.2 Breadcrumbs and sidebar (REQ-SHELL-05, 06)

- `JourneyLayout` renders `Breadcrumbs` ("Haunted Audit" > "Journey: Send Payment") and `JourneySidebar` (`aside > nav aria-label="Journey sections"`), the active item violet-filled with a left bar mark.
- The Possession route uses `SiteLayout` plus its own breadcrumb "Kiro > Journey: Send Payment > Possession Mode" (as in the image).
- The sidebar item order and targets are in REQ-SHELL-06.

### 4.3 Footer

Plain footer with "Built with Kiro" text only (the image has no footer; the 16px text and one line are the smallest addition that satisfies `product-rules.md`). Listed as a difference.

### 4.4 Router

Same tree as `multipage-routing-controls` 5, with these routes:

```
SiteLayout:   /  /scans  /journeys/send-payment/possession  /kiro  /reports  *
JourneyLayout:/journeys/send-payment/agents  /journeys/send-payment/fixes/:step
redirects:    /journeys/send-payment -> .../possession ; .../fixes -> .../fixes/find ; bad :step -> find
```

`useRouteAnnouncer` runs in `RootLayout`: title, scroll to top, focus the visible `h1[data-page-title]`, polite announcement.

---

## 5. Art (inline SVG)

### 5.1 `Ghost` (REQ-ART-01)

One SVG component with three states controlled by a `state` prop. Common body: a round-bodied ghost (large circle top, wavy hem, two arms). The parts per state:

| State | Fill var | Face | Extras |
|---|---|---|---|
| ready | `--c-ready` | calm open eyes, small smile | witch hat (brim + cone + buckle) |
| blocked | `--c-blocked` | angry brows, frown | glow ring |
| verified | `--c-verified` | happy closed-arc eyes, smile | small sparkle |

Props: `state`, `size`, `title?`. Decorative by default (`aria-hidden`); with `title` it gets `role="img"` and `<title>`. The tiny `GhostIcon` is a separate simple outline used in the logo and buttons.

### 5.2 `Icons`

A flat file of small functional SVGs, each `currentColor`: keyboard, microphone, target, magnifier-with-`</>`, laptop-with-accessibility, check, cross, warning, bank, folder, file, bolt, code, play, arrow, plus art parts (bat, pumpkin, tombstone, moon, castle). Meaning is carried by neighbouring text or a `title`.

### 5.3 `GraveyardScene` (Home)

A single wide SVG (`viewBox` 0 0 1440 640, `preserveAspectRatio="xMidYMid slice"`) in layers, each a `<g data-art="...">`:

1. sky gradient (token stops) and stars;
2. big pale moon (circle with soft glow filter);
3. haunted castle silhouette on a hill, lit windows;
4. bats (3 to 5, `Bat` symbol reused);
5. tombstones and bare trees at both sides;
6. pumpkins in both lower corners (`Pumpkin`, glowing faces);
7. witch-hat ghost holding a laptop (`Ghost` ready state + `Laptop` with accessibility symbol on screen) and a magnifier showing `</>`.

Animation: slow bat drift and moon glow using CSS keyframes on `[data-art="bat"]`; cycle at least 334 ms; paused by `html[data-calm="true"]` and by `prefers-reduced-motion`. The SVG is `aria-hidden`, `pointer-events: none`, painted under the content.

---

## 6. Pages

### 6.1 Home (REQ-HOME)

```
<main>
  <GraveyardScene/>   (absolute, under content)
  <HeroBlock>
    <h1 data-page-title class="font-display glow">Haunted Audit</h1>
    <p>The accessibility guardrail for AI-built applications.</p>
    <p>Feel the barrier. Fix the cause. Prove the journey.</p>
    <Link class="pill-primary" to="/journeys/send-payment/possession"><GhostIcon/> Possess This App</Link>
    <PillRow items=[Detect, Fix, Verify, Prevent] />   (ul of static pills)
  </HeroBlock>
</main>
```

Plain meaning for "Possess" and "Ghost" goes in a visually hidden paragraph referenced by `aria-describedby` on the `<main>` (D17).

### 6.2 Possession Mode (REQ-POS)

```
Breadcrumbs ("Kiro > Journey: Send Payment > Possession Mode") + LiveTestBadge
h1 "Possession Mode"  p "Keyboard-only demonstration"
<div class="grid lg:grid-cols-[1fr_20rem]">
  <BankFrame/>   (iframe stage + GhostPin + TooltipCard)
  <PossessionPanel/>   (checklist, RunControls, BarrierButton)
</div>
```

**BankFrame**
- `<iframe title="Haunted Bank - Test site" src={BASE_URL + 'fixtures/haunted-bank/index.html?variant=' + variant}>` inside a 1280 x 800 stage scaled by X9. The frame header ("Haunted Bank / Test site") sits in the React panel above the iframe.
- On `load`, attach `focusin` and `keydown` listeners to `iframe.contentDocument` and dispatch to `useJudgeFocus()`.
- `useJudgeFocus` tracks: set of distinct focused element ids/identities, the first focused element, and a "stuck" flag per REQ-POS-05 (>= 8 distinct elements and the first one was returned to with `#send-payment` never focused). It emits `recipientReached`, `amountReached`, `sendPaymentStuck`. It never uses `success_selector` or `target_selector` as config.
- The fixture id strings `recipient`, `amount`, `send-payment` are constants in one file with a test that they exist in the copied fixture.

**GhostPin**
- Input: `box: BoundingBox | null` (from `result.blocked_element.bounding_box`), `scale: k`, `state`.
- Placement: stage coordinates `x' = box.x * k`, `y' = box.y * k`. The ghost is placed to the right of the control (`left = (box.x + box.width) * k + gap`), vertically centred on the control; if it would leave the stage it goes to the left. It never overlaps the box. If `box` is null it renders the purple Ready ghost at the panel's top-right corner, outside the form.
- The `TooltipCard` ("Journey Blocked", sentence) is attached to the ghost with `aria-describedby`.

**PossessionPanel**
- Title "Possession Mode" and "Keyboard-only demonstration" as in the image; the H1 is the page heading, so this panel title is an `h2` with the same words.
- Checklist `ul` of three items: icon (pending, check or cross) + text, `aria-live="polite"` for changes. Caption "Your key presses".
- When `result.verdict === 'BLOCKED'`: red outlined "Barrier Detected!" (a real `button`? In the image it is a label-like button. It has no action, so it is rendered as a non-interactive status element styled as the button, with icon and text, not focusable.) Before that: "Run the checker" (a real `<button>`).
- `RunControls`: variant select (broken/fixed), mode select (scripted/llm), the run button. All real controls with labels. Status text shows `agent_mode`.
- Offline: `OfflineState` with Retry.

### 6.3 Agents (REQ-AGT)

`JourneyLayout`. `h1` The Ghost Hunt - Agent Investigation. A grid of three `AgentCard`s and the `GhostHuntCard`, then `Timeline`.

`agentRows(result, voice?)` is a pure function returning rows per card:

```ts
type Row = { tone: 'ok' | 'bad'; text: string; why: string };   // why = the data fact that earned the row
agentRows(result): { keyboard: Row[]; voice: Row[] | 'not-run'; hunter: Row[] }
```

Rules (REQ-AGT-02): keyboard ok if `focus_trail` identities include the recipient and amount controls (matched by `selector_hint` / accessible name from the trail, not by target_selector); keyboard bad if `verdict==='BLOCKED' && reason_code==='TARGET_NOT_FOCUSABLE'`; hunter ok if `blocked_element`; hunter bad if the blocked element's tag is not a native interactive tag and reason is TARGET_NOT_FOCUSABLE. Voice returns `'not-run'` today.

`ghostCard(result)`: from a table keyed by `reason_code`:

| reason_code | barrier line | impact line | WCAG line |
|---|---|---|---|
| TARGET_NOT_FOCUSABLE | Payment button inaccessible to keyboard navigation | Customer cannot complete payment | 2.1.1 Keyboard, 4.1.2 Name, Role, Value |
| FOCUS_TRAP | Keyboard focus is trapped | (plain sentence) | 2.1.2 No Keyboard Trap |
| NO_ACTIVATION | The control cannot be activated with the keyboard | (plain sentence) | 2.1.1 Keyboard |
| STEP_LIMIT / TIMEOUT | The journey did not finish | Inconclusive: not shown as a ghost | none |

The rows for other reason codes are written in TASK-07 and reviewed (they are not in the image). STEP_LIMIT and TIMEOUT never show "Critical". Severity "Critical" appears only for TARGET_NOT_FOCUSABLE on the payment journey (rule: blocks the payment). This is a temporary fixed table (D8).

`Timeline`: `ol` of step events from the stream (`tool`, key, focused before/after name), appended live, `aria-live="polite" aria-relevant="additions"`.

### 6.4 Fix pipeline (REQ-FIX)

`/journeys/send-payment/fixes/:step`. `StepStrip` is a `nav aria-label="Fix pipeline"` with an ordered list of four links (`aria-current="step"` on the current). Below: the single current card, then Back and Next (links).

| Step | Card | Data |
|---|---|---|
| find | `GhostHuntCard` ("Critical Ghost Detected") | current run result |
| fix | `FixCard` | `GET /fixes/{id}` (when the Exorcist exists) |
| verify | `VerifyCard` | fix record verify fields (Verifier) |
| regression | `RegressionCard` | regression result |

- `DiffView`: `pre` with `role="group"` and `aria-label`, each line prefixed by `-` or `+` and also given a visually hidden "removed" or "added", background from `diff-del`/`diff-add`.
- `FixCard` buttons: "Approve Fix" (green outline + check icon) and "Reject" (cross icon), real `<button>`s. After a decision both are disabled with an explanation and the decision, time and diff hash are shown. A live region announces the result. Text under the card: "Nothing is applied until you approve." No call is made until the click. The approve request sends `diff_sha256` as the Exorcist spec requires.
- `VerifyCard`: rows from the verify result; "Journey Verified" green button (non-interactive status element with check icon) only if `after_verdict === 'PASSED'`.
- `RegressionCard`: red border; the file name, the failing line and the sentence appear only if `before_pass && after_fail` data exists.
- Until each backend exists the card is `NotAvailableState` ("Needs POST /fixes. Not built yet.") with a plain description. Back and Next still work.

### 6.5 Kiro (REQ-KIRO)

- `scripts/gen-kiro-tree.mjs` (runs on `prebuild` and `predev`) runs `git ls-files .kiro` (fallback: reads the directory) and writes `src/generated/kiro-tree.json` of real folders and files, and `kiro-hook.json` with `{path, content}` of `.kiro/hooks/axe-on-save.json`. The tree shows folders only to depth 2, with `hooks/` highlighted as in the image.
- `KiroTree`: ARIA tree pattern (`role="tree"`, `treeitem`, roving tabindex, arrow keys, Home/End, Enter/Space toggles), one tab stop.
- `CodeView`: tab list with one tab (the real file name); `pre` in a focusable labelled scroll region; JetBrains Mono at 1rem.
- `HookCard`: lines 1 and 2 come from the hook JSON's `trigger` and `description`; line 3 "Accessibility issue found: Missing accessible label" has a red icon and an "Example result" tag.
- "Built with Kiro" pill: a `<p>` styled as a violet pill, not focusable.

### 6.6 Results (REQ-RES)

- `resultTiles()` returns four tiles `{label, value: number | null, unit?, source?: string}`. All four `null` until a source exists. `StatTile` shows the number or `--` + "not yet measured", and `agent_mode` where applicable.
- `outcomeTicks({ latestFixedRun, regression })` returns three tick states `'yes' | 'unknown'`, and the mascot state.
- `OutcomeCard`: parchment SVG scroll (`Parchment.tsx`) with ink text; ticks use check icon + text, unknown ticks a dash icon + "not yet shown".

---

## 7. Data and state

```ts
interface RunState { status: 'idle'|'running'|'complete'|'error'|'offline'; runId?: string;
                     events: StepEvent[]; result?: JourneyResult; notice?: RunNotice }
```

`RunProvider` wraps `POST /runs`, `EventSource`, and `GET /runs/{id}` (existing `App.tsx` code, moved). It keeps the last `fixed` and last `broken` result separately so Results can read "latest fixed run passed". No `localStorage` of results. API base from `VITE_API_URL`.

Contract mocks (X7) are typed against TypeScript interfaces generated by hand from the two specs and stay under `e2e/`.

---

## 8. Build scripts

- `copy-fixture.mjs`: copies `../fixtures/haunted_bank/index.html` to `public/fixtures/haunted-bank/index.html`. A test asserts the ids `recipient`, `amount`, `send-payment` exist in the copy.
- `gen-kiro-tree.mjs`: as 6.5. Generated JSON is git-ignored and built on `predev` and `prebuild`; CI builds it.
- Fonts: `@fontsource/uncial-antiqua`, `@fontsource/inter`, `@fontsource/jetbrains-mono` pinned to exact versions; only the weights in use (Inter 400, 500, 600, 700; mono 400, 500) imported; files served from the app's origin. `index.html` Google Fonts links removed.

---

## 9. Fidelity workflow

1. `scripts/sample-tokens.py` and `design/panels.json` (TASK-01).
2. For each page task: build, run `npm run ui:shots -- --page <id>` (Playwright, 1440 px wide, real API or mocks), then `scripts/ui-fidelity-sheet.py` to make the side-by-side image, fill that page's section of `docs/ui-fidelity.md`, then **stop for the owner's review**.
3. Screenshot states: Possession in Ready, judge-stuck and Blocked-with-ghost and Verified; Agents blocked; Fix step 2 to 4 with mocked contract data; Kiro; Results with `--` and with mocked numbers.

---

## 10. Testing

| Layer | Tool | What |
|---|---|---|
| Unit | Vitest + Testing Library + jest-axe | Ghost states, icons, view-models, tooltip table, outcome ticks, StatTile `--`, StepStrip, DiffView |
| Source scans | Vitest | hex outside token files, px text sizes, emoji, external URLs, `[x]`/`[n]`, `href="#`, `target_selector`/`success_selector` |
| Routes and focus | Playwright | every route direct and by link, title unique, one H1, focus on H1, announcer, Back/Forward |
| Possession | Playwright + real API | Tab in iframe fills the checklist; stuck after 8 distinct stops; run `broken` then `fixed`; ghost not overlapping the control; "Barrier Detected!" only after BLOCKED |
| Fix pipeline | Playwright + mocks | one step at a time, Back/Next, Approve/Reject by keyboard, not-available states |
| Kiro | Playwright | tree equals `git ls-files .kiro`; arrow keys |
| Keyboard | Playwright | header, Settings, nav, each page's controls |
| Axe | Playwright | zero violations, every route x normal, Calm, high contrast |
| No console noise | Playwright | fixture fails on `console.error/warn`, pageerror, cross-origin requests |
| Fidelity | script | seven screenshots, seven side-by-side images, checklist file |

CI: `npm test`, build, `npm run test:e2e` (starts the real API with a temporary database).

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| 16px floor changes spacing and card size, so "pixel-faithful" cannot be exact | Preserve proportions; list each difference with the reason in `ui-fidelity.md` |
| The bank panel inside the iframe cannot match the image's look | D4/D20: owner decision; difference listed |
| Home illustration is the largest piece of hand-built art | Layered SVG built in stages with review after the page; reuse symbols |
| Sampled colours may fail contrast | Adjust the text token minimally and record it (REQ-TOK-04) |
| Fix, Verify and Regression show "Not available yet" until other specs are built | Mock-labelled screenshots; real data when the endpoints land |
| Two specs both define routing | X4 and the Relationship section; build once |
| Iframe focus events differ across browsers | Playwright run in Chromium; fall back to the checker for the verdict (the checklist is only the judge's own view) |
| `git ls-files` unavailable in CI build | Fallback to directory scan; test compares both |
