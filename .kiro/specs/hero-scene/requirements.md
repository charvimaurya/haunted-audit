# Hero scene - Requirements

**Goal:** rebuild the Home page hero so it matches two reference images: the haunted graveyard in `design/Haunted_Audit_Final_UI_v7.png` (Home panel, top left) and the ghost, magnifier, moon and pumpkins on the title slide of `docs/Haunted Audit Judge Deck v7.pptx`. Everything is inline SVG in React. No raster image, no CDN.
**Steering followed:** `ui-fidelity.md` (match the look, sample colours, 16px text, no CDN, art as inline SVG), `product-rules.md` (ghost states, ambient rules, Calm mode, fps guard, no animation cycle under 334 ms, tokens only in `tailwind.config.js` and `src/index.css`), `product-ux.md`, `accessibility.md`, `tech.md`, `structure.md`.
**Touches:** `dashboard/src/components/` (new `hero/` folder, `GhostMascot`, `GhostIcon`, `HeroSection`), `dashboard/src/index.css` (generated token block), `design/hero-tokens.json`, `scripts/`, tests, `docs/ui-fidelity/`.
**Does not touch:** the API, the checker, the agents, the routing work, the bank page.
**Status:** DRAFT. Nothing is built.

## What the two references show

| Reference | What it gives this spec |
|---|---|
| v7 Home panel (a painted scene, 665 x 345 px in the PNG, soft) | The composition: gnarled bare trees at both edges, a pale full moon upper right, a castle with several pointed towers and a few warm lit windows on a hill at the right, bats, fog, tombstones and crosses in two depths, a worn path, a pumpkin in each lower corner. Ghost at the left, text in the centre. Sky goes from deep purple to near-black |
| Deck title slide (flat vector, original PNGs inside the .pptx at 920 x 1119 and 760 x 280) | The characters, drawn flat: a lavender-white ghost with two black oval eyes and a small smile, a dark purple witch hat with a lighter band and a gold buckle, a pale moon with two craters, a gold-ringed magnifier showing `</>`, orange pumpkins with dark carved faces and a green stem |

The v7 panel is painted with gradients and noise and is small. The slide assets are flat and full size. So: **composition and atmosphere come from v7; character shapes and flat colours come from the slide.**

## Conventions

EARS: WHEN trigger THE SYSTEM SHALL response. IF condition THEN ...
Every requirement has a **Check** (a test or a measurement that gives yes or no).
Terms: **Scene** = the whole `HeroScene` SVG. **Layer** = one `<g>` in it. **Calm** = effective Calm mode (the visitor's switch or the system's reduced-motion setting). **Quality** = `full`, `reduced` or `static` from `ImmersionProvider`.

---

## REQ-PAL - Palette sampled from the images

### REQ-PAL-01 Sampled, with positions
THE SYSTEM SHALL define every scene colour as a design token whose value was sampled from a reference image. `design/hero-tokens.json` SHALL record for each token: name, hex, source image, pixel position (x, y), the 5 x 5 median, the largest per-channel standard deviation, and alpha where the pixel is translucent.
**Check:** `scripts/sample-hero-tokens.py` regenerates the file from the images and the output equals the committed file.

### REQ-PAL-02 Flat areas only
Each sample SHALL come from a flat area: a standard deviation of 3 or less per channel. A colour that exists only as a gradient or a painted texture SHALL be recorded as gradient stops, each stop sampled from its own flat patch and labelled "stop", never as one invented mid colour.
**Check:** the script fails if a non-stop sample has a deviation above 3.

### REQ-PAL-03 Values measured so far (to be re-sampled by the script)
These were measured on 2026-11-20 from the original files, not guessed:

| Token | Hex | Source and position | Note |
|---|---|---|---|
| `hero-ghost-body` | `#f1e9ff` | slide mascot PNG (460, 840) | flat |
| `hero-ghost-eye` | `#0e0a1a` | slide mascot PNG (374, 552) | flat; also the smile |
| `hero-hat` | `#2b1b4d` | slide mascot PNG (460, 200) | flat |
| `hero-hat-band` | `#3a2668` | slide mascot PNG (260, 344) | flat |
| `hero-gold` | `#ffc56b` | slide mascot PNG (462, 344) buckle; same at the magnifier ring and handle | flat |
| `hero-lens` | `#1a0f33` | slide mascot PNG (770, 700) | flat |
| `hero-glyph` | `#c4a8ff` | slide mascot PNG, `</>` strokes | flat |
| `hero-moon` | `#cec3ed` at alpha 230/255 | slide mascot PNG (736, 124) | translucent |
| `hero-moon-crater` | `#c0b2e4` at alpha 245/255 | slide mascot PNG (706, 100) | translucent |
| `hero-ghost-glow` | `#895bf6` at alpha 27/255 | slide mascot PNG (100, 700) | a radial halo, alpha falls with distance |
| `hero-pumpkin` | `#e07a1f` | slide pumpkin PNG (most common opaque colour) | flat |
| `hero-pumpkin-face` | `#2a1302` | slide pumpkin PNG (second most common) | flat |
| `hero-bg-dark` | `#0e0a1a` | slide background PNG (30, 1050) | stop (bottom) |
| `hero-bg-mid` | `#140d27` | slide background PNG (300, 540) | stop |
| `hero-bg-glow` | `#361a66` | slide background PNG (1300, 250) | stop (centre-right glow) |
| `hero-sky-mid` | `#121432` | v7 PNG (300, 60), deviation 0.5 | stop |
| `hero-sky-high` | `#1b1942` | v7 PNG (520, 60), deviation 1.8 | stop |

Not yet sampled or not flat enough: the castle silhouette (`#101635` with deviation 5.9), the hill (`#192048`, 7.9), the path (`#3c2c6f`, 8.1), the fog (`#21234f`, 7.7), the warm window (`#e69a6b`, edge sample), the pumpkin stem and the tombstones. TASK-01 chooses better patches or records them as gradient stops.
**Check:** TASK-01 output.

### REQ-PAL-04 State colours come from the rules
THE SYSTEM SHALL use `#c9b6ff` (Ready rim and glow), `#ef4444` (Blocked) and `#22c55e` (Verified) for the mascot's states, as `product-rules.md` fixes them. The images show the Blocked and Verified ghosts in slightly different reds and greens (for example the v7 red ghost near `#da3951`); the difference is recorded in `docs/ui-fidelity.md`, not used.
**Check:** a test reads the three variables.

### REQ-PAL-05 One place for colours
THE SYSTEM SHALL NOT contain a hex or `rgb()` colour in any TSX file of the scene. SVG parts use `var(--hero-...)`. The variables are generated into `src/index.css` between `/* hero-tokens:start */` and `/* hero-tokens:end */`.
**Check:** a source scan.

---

## REQ-SCN - The scene

### REQ-SCN-01 One component, seven layers
THE SYSTEM SHALL provide `HeroScene` (inline SVG, `viewBox="0 0 1440 700"`, `preserveAspectRatio="xMidYMid slice"`) with these layers from back to front, each a `<g>` with a `data-layer` name:

| # | `data-layer` | Content |
|---|---|---|
| 1 | `sky` | gradient from deep purple to near-black (tokens above), 60 or more small stars of 2 sizes, a few twinkle in `full` quality |
| 2 | `moon` | large pale moon, upper right, with 3 or more craters and a soft glow made of stacked translucent circles (no blur filter) |
| 3 | `castle` | castle silhouette on a hill, lower right behind the graveyard: 4 or more towers with pointed roofs, 3 or more warm lit windows, one thin flag |
| 4 | `trees`, `bats`, `fog` | bare twisted tree at each edge; 3 to 5 bats; 2 or 3 fog bands |
| 5 | `graveyard` | tombstones and crosses in two depths (back smaller and darker, front larger), a dark fence, a worn path |
| 6 | `pumpkins` | two carved jack-o-lanterns in the lower corners, each with a faint inner glow |
| 7 | `mascot` | the ghost (REQ-MAS-05) |

**Check:** a test counts the layers, their order in the DOM, and the minimum counts (stars, craters, towers, windows, bats, fog bands, tombstone depths, pumpkins).

### REQ-SCN-02 No raster, no external
THE SYSTEM SHALL draw every part as SVG paths, shapes and gradients. It SHALL NOT use `<image>`, `<img>`, CSS `url(...)` for art, `<foreignObject>`, emoji, or any request to another origin.
**Check:** a source scan and a Playwright run that fails on any non-document request other than the app's own scripts and styles.

### REQ-SCN-03 Hidden from assistive technology
THE SYSTEM SHALL mark the scene `aria-hidden="true"` and `focusable="false"`, with `pointer-events: none` on the whole scene, no `tabindex` on any node inside it, and no `<title>` or `<desc>`.
**Check:** axe plus a test that no node in the scene is focusable or has an accessible name.

### REQ-SCN-04 Under the controls
THE SYSTEM SHALL paint the scene below the text and the controls, and SHALL NOT let it take a click or a focus ring.
**Check:** `elementFromPoint` at the centre of the button and of each chip returns the control, never a scene node.

### REQ-SCN-05 Look
THE SYSTEM SHALL match the references in these points: the moon is the brightest large shape and sits upper right; the castle is a dark silhouette lower right with warm windows; trees frame both edges; the pumpkins glow orange in both lower corners; the ghost is lavender-white with black oval eyes, a small smile, a dark purple hat with a gold buckle, a laptop showing an accessibility icon and a gold-ringed magnifier showing `</>`; the sky is purple at the top and near-black at the bottom.
**Check:** the fidelity checklist (REQ-FID-02) with a Match, Differs or Not matched mark for each point.

---

## REQ-MAS - Mascot, reused on every page

### REQ-MAS-01 One SVG, three states
THE SYSTEM SHALL provide `GhostMascot` (same name and file as today, `src/components/GhostMascot.tsx`) as a single inline SVG whose `state` prop (`ready`, `blocked`, `verified`) picks colour and face:

| State | Body | Face | Extras |
|---|---|---|---|
| ready | `hero-ghost-body` with a `#c9b6ff` rim and glow | black oval eyes, small smile | dark purple witch hat with a lighter band and a gold buckle |
| blocked | `#ef4444` | angry brows, frown | red glow |
| verified | `#22c55e` | happy arc eyes, smile | green glow |

**Check:** unit tests render each state and assert the body variable, the face variant and the extras.

### REQ-MAS-02 Props
THE SYSTEM SHALL accept `state`, `size` (px, default 48; the width of the figure), `animate` (default false), `className`, and an optional `title`. WITHOUT `title` the SVG is `aria-hidden`; WITH `title` it has `role="img"` and a `<title>`.
**Check:** unit tests, axe.

### REQ-MAS-03 Keeps the old contract
THE SYSTEM SHALL keep `data-ghost-state`, `data-semantic-ghost="true"` and `data-testid="ghost-mascot"` on the root, and the place it is used today (Ghost Hunt, Outcome, Pipeline, Possession). The emoji implementation is removed.
**Check:** existing tests pass; a source scan finds no emoji in `src/`.

### REQ-MAS-04 Static by default
`GhostMascot` itself SHALL NOT animate unless `animate` is true, and then only a gentle float that Calm mode stops. The float is not the hero's float (REQ-MOT-02); the semantic ghost is never driven by the ambient layers.
**Check:** with `animate` false no CSS animation runs on it; with Calm on none runs either way.

### REQ-MAS-05 Hero composition
THE SYSTEM SHALL provide `HeroGhost`, which composes `GhostMascot` (ready) with the laptop (accessibility icon on the screen, a person-in-a-circle glyph) and the gold-ringed magnifier showing `</>`, as in the deck. It is aria-hidden and lives only in the hero. Its eyes can blink (REQ-MOT-03).
**Check:** unit test for the parts (laptop, accessibility glyph, magnifier ring, `</>`).

### REQ-MAS-06 Tiny icon
THE SYSTEM SHALL provide `GhostIcon` (a single-colour ghost outline or silhouette, `currentColor`, 16 to 32 px) for the logo, the Possess button and the Kiro pill. It is `aria-hidden` unless it has a `title`.
**Check:** unit test, axe.

### REQ-MAS-07 State is never colour alone
WHERE the mascot shows a state THE SYSTEM SHALL keep its meaning in visible text beside it (as the existing screens do) and SHALL use a different face for each state.
**Check:** a test that the three faces differ in markup.

---

## REQ-LAY - Layout and text over the scene

### REQ-LAY-01 Composition
AT 1440 px wide THE SYSTEM SHALL lay out the hero like the v7 panel: the ghost at the left (about the left third), the text block centred, the castle and moon at the right, a pumpkin in each lower corner, a tree at each edge. The scene fills the hero; the hero is at least 700 px tall at 1440 px wide.
**Check:** bounding boxes in Playwright: ghost centre x below 40% of the width, castle centre x above 70%, moon centre x above 75%, pumpkins within 12% of each side.

### REQ-LAY-02 Content
THE SYSTEM SHALL keep the hero content: the `<h1>` "Haunted Audit" (display font, wordmark only), the tagline "The accessibility guardrail for AI-built applications.", the line "Feel the barrier. Fix the cause. Prove the journey.", the "Possess This App" control with a ghost icon, and four chips Detect, Fix, Verify, Prevent with icons. The copy is the image's copy and is not changed.
**Check:** text assertions. The button's behaviour is whatever the current Home does; this spec changes only its look.

### REQ-LAY-03 Contrast over the scene
THE SYSTEM SHALL keep every piece of text and every control label at WCAG 2.2 AA over the scene: 4.5:1 for text below 24 px (or 18.66 px bold), 3:1 for large text, 3:1 for control borders and icons. THE SYSTEM SHALL use a soft dark overlay between the scene and the text (a gradient made from `hero-bg-dark`) where the numbers need it.
**Check:** `scripts/hero-contrast.py` renders the hero with text hidden, reads the pixels under each text box at 5 moments during the animation, and checks the worst case (the brightest 5% of pixels) against the text colour. It writes the table into `docs/ui-fidelity.md`. All rows 4.5:1 or 3:1 as above, in `full`, `reduced` and Calm.

### REQ-LAY-04 Chips and button are real controls
THE SYSTEM SHALL keep the button as a real focusable control with a visible 3px focus ring and a 44 px target, and the chips as static labels in a labelled list (as today).
**Check:** keyboard test; ring contrast against the scene is measured like text.

### REQ-LAY-05 Small screens
BELOW 768 px wide THE SYSTEM SHALL keep the moon, one pumpkin and the ghost visible, shrink the ghost and the castle, and make the overlay stronger so the numbers in REQ-LAY-03 still hold. No horizontal scroll at 375 px and at 200% zoom.
**Check:** Playwright at 375, 768, 1024 and 1440 px; the contrast script at 375 px.

### REQ-LAY-06 Text size and zoom
THE SYSTEM SHALL size the text in `rem` so the text-size setting and 200% zoom work; the scene is allowed to crop (`slice`) but the text is never clipped.
**Check:** Playwright at 150% text size and a 640 px viewport: every text box is inside the hero.

### REQ-LAY-07 Font
THE SYSTEM SHALL set the wordmark in Uncial Antiqua, self-hosted, with a soft violet glow made with `text-shadow`. The reference wordmark is drawn lettering with drips; this difference is recorded in `docs/ui-fidelity.md`.
**Check:** computed font family; no request to a font CDN.

---

## REQ-MOT - Motion, Calm and quality

### REQ-MOT-01 Parallax
WHEN the pointer moves over the hero in `full` quality THE SYSTEM SHALL move the layers by different amounts: far layers (sky, moon, castle) the least, near layers (front tombstones, fence, pumpkins) the most. The largest shift SHALL be 12 px at the screen edge, the movement SHALL be smoothed, and it SHALL use `transform` only.
**Check:** a Playwright test moves the pointer from the centre to a corner and reads each layer's transform: monotonic order by depth and a maximum shift of 12 px or less.

### REQ-MOT-02 Ambient motion
THE SYSTEM SHALL animate with CSS only: the hero ghost floats (6 s cycle, 8 px), fog bands drift slowly (40 s or longer), bats cross the scene (20 s or longer per pass) with a wing flap, fireflies (about 12) pulse and drift, pumpkin glows flicker softly (3 s or longer), a few stars twinkle (4 s or longer). Every cycle SHALL be 334 ms or longer.
**Check:** a test parses all animation durations in the scene's CSS and asserts the minimum.

### REQ-MOT-03 Blink
THE SYSTEM SHALL blink the hero ghost's eyes by squashing them for 150 ms once every 5 s to 7 s. (The cycle is the 5 s or longer interval; only the closed part is short.)
**Check:** computed animation duration at least 5 s.

### REQ-MOT-04 Only cheap properties
THE SYSTEM SHALL animate only `transform` and `opacity`. It SHALL NOT animate `filter`, `box-shadow`, `width`, `height`, `top`, `left`, `d` or `fill`. It SHALL NOT use `filter` blur on any layer. Glows are stacked translucent shapes or radial gradients.
**Check:** a CSS scan of the scene's keyframes and a source scan for `filter`, `feGaussianBlur`, `mix-blend-mode`.

### REQ-MOT-05 Calm shows a still scene
WHEN Calm is on (the visitor's switch or `prefers-reduced-motion`) THE SYSTEM SHALL show the scene with no animation at all: no CSS animation or transition running, no parallax listener attached, no `requestAnimationFrame` loop, no blink. The still scene SHALL show every layer in a fixed, designed pose (eyes open, bats mid-scene, fog at rest, fireflies dim).
**Check:** `document.getAnimations()` is empty; `getEventListeners`-style probe (a wrapped `addEventListener`) shows no `pointermove` listener on the hero; a rAF counter stays at 0 for 3 s; a screenshot shows all seven layers.

### REQ-MOT-06 Turning Calm on stops it at once
WHEN Calm turns on while the hero is animating THE SYSTEM SHALL stop every animation and detach the parallax without a reload.
**Check:** Playwright toggles Calm and asserts the same four probes.

### REQ-MOT-07 Quality tiers
THE SYSTEM SHALL read `quality` from `ImmersionProvider`: `full` runs everything; `reduced` (mobile, low-power, or fps below 40 for 2 s) turns off parallax and fireflies and keeps float, blink, fog and bats; `static` equals Calm. THE SYSTEM SHALL NOT load any 3D code.
**Check:** a test per tier of which probes are on.

### REQ-MOT-08 Hidden tab
WHEN the document is hidden (`visibilitychange`) THE SYSTEM SHALL pause every scene animation (`animation-play-state: paused`) and any parallax frame loop, and resume them when it is visible again.
**Check:** a Vitest test that sets `document.visibilityState` and fires the event, then reads the paused state; Playwright cannot hide a tab reliably, so this path is covered by the unit test only. Say so.

### REQ-MOT-09 Pointer devices only
THE SYSTEM SHALL attach the parallax listener only where the pointer is fine and hovering (`(pointer: fine)`), and never on touch.
**Check:** a test with `(pointer: coarse)` emulated.

### REQ-MOT-10 No effect on the rest of the page
THE SYSTEM SHALL keep its animations inside the hero (`contain: paint` on the hero root) and SHALL NOT start a layout or paint outside it.
**Check:** a Chrome trace or a layout-shift check shows no layout shift from the hero (cumulative layout shift 0.01 or less during 5 s of pointer movement).

---

## REQ-PERF - Performance

### REQ-PERF-01 Budget
THE SYSTEM SHALL keep the scene to at most 1200 SVG elements and at most 40 concurrently animated elements, and at most 8 layers that get `will-change: transform`.
**Check:** counted in a Playwright run and reported.

### REQ-PERF-02 Frame rate, measured
`scripts/hero-perf.py` SHALL load the Home page in Chrome, move the pointer in circles for 5 s, and report the mean frame rate from `requestAnimationFrame` and the 5th-percentile frame time, with and without the scene, at normal speed and at 4x CPU throttle (`Emulation.setCPUThrottlingRate`). The target is a mean of 55 fps or more at normal speed and 45 fps or more at 4x throttle.
**Check:** the script's output goes into the pull request. The numbers are labelled with the machine and Chrome version they came from. THE SYSTEM SHALL NOT claim 60 fps "on a mid laptop"; only the measured numbers are claimed.

### REQ-PERF-03 If the target is missed
IF the 4x-throttle mean is below 45 fps THEN the `reduced` tier SHALL be tuned (fewer fireflies, fewer bats, no pumpkin flicker) until it meets the target, and the result SHALL be re-measured and recorded. The existing fps guard (under 40 fps for 2 s drops to `reduced`) stays.
**Check:** measured before and after.

### REQ-PERF-04 Weight
THE SYSTEM SHALL keep the scene's source under 60 kB (uncompressed TSX plus generated CSS) and add nothing to the first paint beyond it. The scene loads with the Home route, not the whole app.
**Check:** the build's output size for the Home chunk before and after.

---

## REQ-A11Y - Accessibility

### REQ-A11Y-01 Page
THE SYSTEM SHALL pass axe-core with zero violations on the Home page in normal, Calm and high-contrast modes, with the scene present.
**Check:** Playwright axe, tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`.

### REQ-A11Y-02 Scene is aria-hidden
See REQ-SCN-03. In addition, THE SYSTEM SHALL show the page's one `<h1>` and keep the reading order: heading, tagline, line, button, chips.
**Check:** accessibility-tree snapshot has no scene node.

### REQ-A11Y-03 High contrast
WHEN high contrast is on THE SYSTEM SHALL hide the scene's busy parts (fog, bats, fireflies, glow) and darken the overlay so every text row passes at 7:1 for normal text.
**Check:** the contrast script in that mode.

### REQ-A11Y-04 Focus ring
Controls over the scene SHALL keep the 3px focus ring at 3:1 or better against the scene behind them.
**Check:** measured as in REQ-LAY-03.

### REQ-A11Y-05 Flashing
THE SYSTEM SHALL NOT flash more than 3 times in any second (nothing animates faster than 334 ms; the blink is one flash every 5 s or more).
**Check:** REQ-MOT-02, REQ-MOT-03.

---

## REQ-FID - Fidelity record

### REQ-FID-01 Screenshots
`scripts/ui_fidelity_home.py` SHALL write, at 1440 px wide, `docs/ui-fidelity/home.png` (full motion at a fixed moment), `home-calm.png` (Calm on), and `home-375.png`, plus `home-side-by-side.png`: the v7 Home panel crop, the deck title slide, and `home.png` in one image.
**Check:** the four files exist after running the script. The side-by-side sheet is built in a throwaway HTML page screenshotted by Playwright, so no new dependency is added.

### REQ-FID-02 Checklist against both images
`docs/ui-fidelity.md` SHALL have a Home section with a checklist for each reference: layout, colours, copy, icons, characters, atmosphere; each row marked Match, Differs (with the reason) or Not checked. The known differences go in: Uncial Antiqua instead of the drawn wordmark (REQ-LAY-07); Ready ghost colour (D1); the 16px text floor; no painted texture; reduced detail in the trees and graveyard.
**Check:** every row has a mark; every Differs has a reason.

### REQ-FID-03 A number, not only an opinion
THE SYSTEM SHALL report, for the 1440 px screenshot against the v7 Home crop, the mean colour distance (CIE76 delta E) over an 8 x 4 grid of cells, and the same grid for each reference palette. It is a report, not a gate.
**Check:** the script prints the grid and its mean; the value goes in the checklist with the sentence "this compares average colours only, not shapes".

### REQ-FID-04 Stop for review
THE SYSTEM SHALL stop after the first full-motion screenshot and again after the Calm screenshot for the owner's review before the animation and test tasks continue.
**Check:** the task list has those two stops.

---

## REQ-TEST - Tests

### REQ-TEST-01 Unit
Vitest SHALL cover: token variables, the three mascot states and faces, `GhostIcon`, `HeroGhost` parts, layer count and order, `aria-hidden`, quality tiers, hidden-tab pause, source scans (hex, emoji, `filter`, `<image>`, external URLs, animated properties).

### REQ-TEST-02 Playwright
Playwright SHALL run on the Home page: screenshot script, layout boxes (REQ-LAY-01), parallax order (REQ-MOT-01), Calm probes (REQ-MOT-05, 06), pointer-coarse (REQ-MOT-09), keyboard walk to the button and chips, no console errors or warnings, no cross-origin request.

### REQ-TEST-03 Axe
Playwright axe SHALL report zero violations in normal, Calm and high-contrast modes.

### REQ-TEST-04 Measurements
`hero-contrast.py` and `hero-perf.py` SHALL be run and their output pasted into the pull request.

### REQ-TEST-05 Existing tests
`cd dashboard && npm test` SHALL pass. Existing tests that name the emoji mascot or the old hero decoration are updated and listed in the pull request.

---

## Decisions needed (owner)

| # | Question | Default in this spec |
|---|---|---|
| D1 | `product-rules.md` says Ready is purple `#c9b6ff`. Both images show the Ready ghost as near-white lavender (`#f1e9ff`). | Body `#f1e9ff` (sampled), with a `#c9b6ff` rim and glow so "purple Ready" is still visible. Blocked and Verified bodies use the rule colours. Say if you want the whole body `#c9b6ff` |
| D2 | The reference wordmark is custom dripping lettering. `ui-fidelity.md` allows only the spooky display font for it. | Uncial Antiqua with a glow (REQ-LAY-07); listed as a difference. Drawing the lettering as SVG paths is possible but would be a separate piece of art |
| D3 | The hero ghost holds a laptop and a magnifier; the reusable mascot does not. | `GhostMascot` is the body, face, hat and glow; `HeroGhost` adds the props |
| D4 | The current hero has two roaming emoji ghosts (`AmbientLayer`). They clash with the scene. | The hero stops using `AmbientLayer`. The component and its tests stay in the repo for other pages |
| D5 | You asked for 60 fps on a mid laptop. I cannot measure a mid laptop. | Measure on this machine, with and without 4x CPU throttle, and claim only those numbers (REQ-PERF-02) |
| D6 | The v7 panel is small and painted. The castle, trees and graveyard cannot be traced exactly. | Redraw them in the same composition with simpler shapes; list the loss of detail as a difference |
| D7 | This spec covers the Home scene and the mascot, which the `pixel-faithful-ui-v7` spec also lists (its TASK-03 mascot, TASK-05 Home). | Do them here once; mark those two tasks done by this spec when it lands |
| D8 | "Possess This App" is a button that starts a run on `main` and a link in the unmerged routing work. | This spec changes only its look and keeps whichever behaviour is on the branch |
