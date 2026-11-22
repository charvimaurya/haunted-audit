# Hero scene - Design

**Requirements:** `requirements.md` in this folder (IDs like REQ-MOT-05 are cited below).
**Facts here come from reading the code on `main` (`7042eb1`), from the two reference images, and from pixel measurements made on 2026-11-20. Nothing below has been built.**

---

## 1. Decisions

| # | Decision | Why |
|---|---|---|
| X1 | Colours are sampled by a script into `design/hero-tokens.json`, which also rewrites a marked block of CSS variables in `src/index.css`. TSX uses `var(--hero-...)` only. | `ui-fidelity.md`: sample, never guess. `product-rules.md`: no hex outside `tailwind.config.js` and `src/index.css`. |
| X2 | The sampling script reads pixels through Playwright and a `<canvas>`, and takes the deck's original PNGs out of the `.pptx` with `zipfile`. | Playwright is already a dependency. Pillow would be a new one. The original PNGs are flat and full size; a rendered slide is not. |
| X3 | Glows are stacked translucent circles and radial gradients. No `filter`, no `feGaussianBlur`, no `mix-blend-mode`. | REQ-MOT-04 and the frame budget. A blur on a large area repaints every frame. |
| X4 | Only `transform` and `opacity` animate, in CSS keyframes. Parallax writes `transform` directly from one rAF loop that stops when the layers have settled. | Compositor-only work; zero cost when idle. |
| X5 | `GhostMascot` keeps its name, file and test ids and becomes an SVG. `HeroGhost` adds the laptop and magnifier. | `product-rules.md` names `GhostMascot`. Six places already use it. |
| X6 | Layers live in `src/components/hero/` as one component per file. Styles for the scene live in `hero.css` next to them (no hex). | `product-rules.md`: one component per file. |
| X7 | `HeroSection` stops rendering `AmbientLayer` and the emoji bats and pumpkins. | The roaming emoji ghosts clash with the scene (D4). `AmbientLayer` and its tests stay. |
| X8 | Motion permission comes from `useImmersion()` (`calm`, `quality`) plus two local checks: `(pointer: fine)` for parallax and `document.visibilityState` for pause. | Reuses the existing Calm and fps-guard system instead of adding a second one. |
| X9 | The mascot's own viewBox is half the deck PNG: `0 0 460 560`. | The deck mascot is 920 x 1119; half scale keeps the coordinates small and the shape identical. |

---

## 2. Palette

Source files, with where each token comes from:

| File | How to get it |
|---|---|
| Deck mascot PNG | `docs/Haunted Audit Judge Deck v7.pptx` → `ppt/media/image-1-1.png`, 920 x 1119 RGBA |
| Deck pumpkins PNG | same → `ppt/media/image-1-2.png`, 760 x 280 RGBA |
| Deck background PNG | same → `ppt/media/Slide-background-1-image-1.png`, 1920 x 1080 |
| v7 Home panel | `design/Haunted_Audit_Final_UI_v7.png`, crop (0, 0, 665, 345) of 1866 x 779 |

Token list (values in `requirements.md` REQ-PAL-03):

```
--hero-ghost-body  --hero-ghost-eye  --hero-hat  --hero-hat-band  --hero-gold
--hero-lens  --hero-glyph  --hero-moon  --hero-moon-crater  --hero-ghost-glow
--hero-pumpkin  --hero-pumpkin-face  --hero-stem
--hero-bg-dark  --hero-bg-mid  --hero-bg-glow  --hero-sky-mid  --hero-sky-high
--hero-castle  --hero-hill  --hero-path  --hero-fog  --hero-window  --hero-tomb-back  --hero-tomb-front
```

Each is written twice: the colour (`--hero-gold: #ffc56b`) and a channel form (`--hero-gold-rgb: 255 197 107`) so overlays can use alpha (`rgb(var(--hero-bg-dark-rgb) / .7)`). The last eight come from the v7 panel and are re-sampled in TASK-01 from flat patches or recorded as gradient stops.

State colours: `--c-ready: #c9b6ff`, `--c-blocked: #ef4444`, `--c-verified: #22c55e` already exist in the rules and in `index.css`/`tailwind.config.js`.

Sampling method (`scripts/sample-hero-tokens.py`):
1. Open each image in a headless page as a data URL; draw it on a canvas; read `getImageData`.
2. For each entry in a list of `{name, image, x, y}`, take the 5 x 5 block, median per channel, maximum per-channel standard deviation, and median alpha.
3. Fail if a flat token has deviation above 3; write `design/hero-tokens.json`; rewrite the block between `/* hero-tokens:start */` and `/* hero-tokens:end */`.
4. `--check` mode re-samples and fails if the committed files differ.

---

## 3. Scene geometry

The scene is a 1440 x 700 SVG, drawn with `preserveAspectRatio="xMidYMid slice"` and 2% overscan on the moving layers so parallax never shows an edge. Positions below are from the v7 Home panel scaled to this box (x by 1.083, y by 1.014); the numbers are starting points to be checked in the gallery, not final.

| Layer | `data-layer` / depth | Placement (viewBox units) | Notes |
|---|---|---|---|
| Sky | `sky` / 0 | full rect, vertical gradient `hero-sky-high` → `hero-sky-mid` → `hero-bg-dark`, plus a radial `hero-bg-glow` at (1000, 150) | stars: 70, radii 0.8 and 1.4, fixed pseudo-random positions from a seeded list (no `Math.random` at render, so the SVG is stable) |
| Moon | `moon` / 0.2 | centre (1210, 185), r 85 | `hero-moon` at 0.9 alpha; 3 craters (r 14, 10, 8) in `hero-moon-crater`; halo = 3 stacked circles r 110, 140, 175 at 0.06, 0.04, 0.025 alpha in `hero-ghost-glow` |
| Castle | `castle` / 0.3 | hill: a closed path from (1060, 560) rising to (1190, 305) and flattening to the right edge; towers: 5 rectangles with triangular roofs between x 1190 and 1360, tops y 132 to 215; centre keep tallest | fill `hero-castle`; windows: 4 small rects `hero-window` (the lit ones); flag: a 2 x 26 pole and a small pennant on the tallest tower |
| Trees | `trees` / 0.45 | left tree: trunk from (0, 700) to (60, 80) with 6 to 8 branches reaching right; right tree: trunk near (1400, 560) with branches toward the castle | stroked paths with round caps, colour `hero-tomb-back` (no new colour is invented) |
| Bats | `bats` / 0.6 | 4 bats at y 90 to 260 | one `<symbol>` (body + two wings), reused with `<use>`; each wing group flaps with `scaleY` |
| Fog | `fog` / 0.5 | 3 bands, y 470, 540, 610, each a wide soft-edged shape built from a horizontal linear gradient (transparent → `hero-fog` at .35 → transparent) | 2 copies side by side so a 3% drift never shows a gap |
| Graveyard back | `graveyard` / 0.8 | 7 tombstones and 3 crosses, 30 to 60 units tall, y base 560 to 585 | fill `hero-tomb-back` |
| Graveyard front | `graveyard` / 1.0 | 5 larger tombstones and 2 crosses, 70 to 120 tall, y base 640 to 700, one at the far left (like v7) and one at the far right; dark fence of 40 pickets (rect + triangle top) at y 600 to 660 | fill `hero-tomb-front`; a lighter path (`hero-path`) winds from the bottom centre toward the castle hill |
| Pumpkins | `pumpkins` / 1.2 | right: centre (1365, 610), rx 72; left: centre (135, 650), rx 62; optional small one at (45, 590) | body `hero-pumpkin` with 5 vertical ribs (darker arcs using `hero-pumpkin-face` at .25 alpha), carved face (two triangle eyes, nose, jagged mouth) in `hero-pumpkin-face`, stem `hero-stem`; inner glow = 2 stacked ellipses of `hero-window` at .25 and .12 alpha behind the face (flicker target) |
| Mascot | `mascot` / 0.7 | `HeroGhost` centred near (315, 365), body width about 215 | float and blink wrappers (section 4) |

Depth is the parallax factor: layer shift = `depth * 10 px` at most, so the nearest layer (pumpkins, 1.2) moves 12 px at the screen edge and the sky 0 (REQ-MOT-01).

### Mobile composition (under 768 px)

CSS transforms on the groups (`@media (max-width: 767px)`): ghost scale .62 and moved to the lower left; castle scale .7 and moved up and left; right tree hidden; left pumpkin hidden; fireflies and bats halved. The overlay opacity rises (section 6).

---

## 4. Mascot

`GhostMascot` (viewBox `0 0 460 560`, coordinates are half of the deck PNG):

| Part | Shape |
|---|---|
| Halo | circle centre (230, 330) r 250, radial gradient `hero-ghost-glow` (alpha .11 centre to 0) in ready; red or green equivalent from the state colour in other states |
| Body | `M92 520 V290 C92 215 140 165 230 165 C320 165 368 215 368 290 V520` then 5 hem teeth back to start (points at y 520 and notches at y 488, teeth between x 92 and 368) |
| Rim (ready) | the same path stroked 4 units with `#c9b6ff` through `--c-ready` |
| Eyes (ready) | ellipses at (187, 276) and (273, 276), rx 20, ry 27, `hero-ghost-eye`; class `ghost-eye` for the blink |
| Smile (ready) | quadratic from (205, 328) to (255, 328) with control (230, 345), stroke 6, round caps |
| Hat (ready) | cone: apex (230, 40) with curved sides to the band; band: rounded rect x 100 to 358, y 162 to 184; buckle: rect (215, 160) to (248, 187), `hero-gold` |
| Blocked | body `--c-blocked`; eyes same shape in `hero-ghost-eye`; angry brows: two thick lines (160, 240)→(210, 258) and (300, 240)→(250, 258); frown: quadratic (205, 345)→(255, 345) control (230, 322); no hat |
| Verified | body `--c-verified`; eyes as two upward arcs (stroke 8) instead of ovals; wide smile arc (195, 322)→(265, 322) control (230, 362); no hat; a small sparkle |

`HeroGhost` adds, in the same box:
- laptop: a tilted rounded rect (screen) at about (115, 360) to (255, 460) in `hero-lens` with a `hero-glyph` accessibility icon (a small circle for the head, a horizontal arms bar and two legs inside a ring), and a base wedge;
- magnifier: ring centre (383, 338) outer r 62, ring width 12 in `hero-gold`, lens r 48 in `hero-lens`, `</>` strokes in `hero-glyph`, handle from (425, 380) to (457, 415) width 12 with round caps;
- cheeks: two small ellipses of `hero-glyph` at .35 alpha, as in v7.

Because the deck ghost is 920 x 1119, the same shapes at scale 2 trace it exactly; TASK-02 compares the SVG against the PNG by overlay in the gallery page.

`GhostIcon`: a 24 x 24 silhouette (dome and a three-tooth hem, two eye holes cut out), `fill="currentColor"`.

---

## 5. Components and files

```
dashboard/src/components/
  GhostMascot.tsx           (replaces the emoji version; same props plus title)
  GhostIcon.tsx
  HeroSection.tsx           (section, scene, overlay, content)
  hero/
    HeroScene.tsx           the <svg>, layers in order, data-depth attributes
    SkyLayer.tsx  MoonLayer.tsx  CastleLayer.tsx  TreesLayer.tsx  BatsLayer.tsx
    FogLayer.tsx  GraveyardLayer.tsx  PumpkinsLayer.tsx  FirefliesLayer.tsx
    HeroGhost.tsx  Laptop.tsx  Magnifier.tsx  Pumpkin.tsx  Bat.tsx
    useHeroMotion.ts        { animate, parallax, paused }
    useParallax.ts
    hero.css                keyframes and layer rules (no hex)
dashboard/src/dev/ArtGallery.tsx   (development only route /dev/art, excluded from the build)
design/hero-tokens.json
scripts/sample-hero-tokens.py  hero-contrast.py  hero-perf.py  ui_fidelity_home.py
docs/ui-fidelity/home.png  home-calm.png  home-375.png  home-side-by-side.png
```

`HeroSection` structure:

```tsx
<section aria-labelledby="hero-heading" className="hero" data-hero-motion={mode}>
  <HeroScene motion={motion} />                 {/* aria-hidden svg, absolute, behind */}
  <div className="hero-overlay" aria-hidden="true" />
  <div className="hero-content">
    <h1 id="hero-heading" data-page-title tabIndex={-1}>Haunted Audit</h1>
    <p>The accessibility guardrail for AI-built applications.</p>
    <p>Feel the barrier. Fix the cause. Prove the journey.</p>
    <PossessButton />                           {/* behaviour unchanged (D8) */}
    <ul aria-label="Audit pipeline steps">…4 chips…</ul>
  </div>
</section>
```

`hero` has `position: relative; overflow: hidden; contain: paint; min-height: 43.75rem` (700 px at the default root size).

---

## 6. Motion

### 6.1 Permission (`useHeroMotion`)

```ts
const { calm, quality } = useImmersion();
const fine = useMediaQuery('(pointer: fine)');
const visible = usePageVisible();               // document.visibilityState === 'visible'
animate  = !calm && quality !== 'static';
parallax = animate && quality === 'full' && fine && visible;
paused   = !visible;
```

The root gets `data-hero-motion="full" | "reduced" | "off"` and `data-hero-paused`. CSS keys everything off those attributes:

```css
.hero[data-hero-motion="off"] * { animation: none !important; }
.hero[data-hero-paused="true"] * { animation-play-state: paused !important; }
.hero[data-hero-motion="reduced"] .hero-fireflies { display: none; }
```

(Pausing uses `animation-play-state`, not `none`, so the pose does not jump.) The global `html[data-calm='true'] *` rule in `index.css` already sets `animation: none !important`; `data-hero-motion="off"` is the second guard.

### 6.2 Keyframes

| Name | Target | Property | Cycle | Notes |
|---|---|---|---|---|
| `hero-float` | `HeroGhost` wrapper | `translateY` 0 → -8 px → 0 | 6 s ease-in-out | |
| `hero-blink` | `.ghost-eye` | `scaleY` 1 → .1 → 1 | 6 s | closed from 95% to 97% (about 120 ms); `transform-box: fill-box; transform-origin: center` |
| `hero-fog-a/b` | fog bands | `translateX` 0 → 3% | 48 s and 64 s, alternate | |
| `hero-bat-path-n` | each bat | `translate` along the scene | 24 s to 36 s, linear, with negative delays so bats are already mid-scene | |
| `hero-wing` | bat wings | `scaleY` 1 → .55 | 0.8 s | |
| `hero-firefly` | each of 12 | `opacity` .15 → .9 and a 6 px drift | 3 s to 6 s, staggered | removed in `reduced` |
| `hero-flicker` | pumpkin glow ellipses | `opacity` .8 → 1 | 3.2 s | |
| `hero-twinkle` | 8 of the stars | `opacity` .5 → 1 | 4 s to 7 s | |

Smallest cycle: 0.8 s (wing). Nothing is below 334 ms. The blink is one dim frame pair every 6 s.

### 6.3 Parallax (`useParallax`)

- Attach `pointermove` to the hero section only when `parallax` is true; remove it when it becomes false.
- On move: `target = { x: (e.clientX - rect.left) / rect.width * 2 - 1, y: ... }`.
- A rAF loop eases `current += (target - current) * 0.08` and writes, for each `[data-depth]` group, `style.transform = translate3d(${current.x * -depth * 10}px, ${current.y * -depth * 6}px, 0)`; the loop stops when both axes are within 0.01 of the target and restarts on the next move.
- `pointerleave` sets the target to 0.
- Calm: the effect cleanup removes the listener and cancels the frame; the groups' inline transform is cleared so the still scene is the designed pose.

### 6.4 Visibility

`usePageVisible` listens to `visibilitychange`. When hidden: `paused` true, the rAF loop is cancelled; when visible again the loop restarts only after the next pointer move.

### 6.5 Still scene

Rules for `off`: eyes open (no transform), bats at their `animation-delay` pose is not used (animation is none), so each bat has an explicit static `transform` attribute that puts it mid-scene; fog bands at x 0; fireflies at .35 opacity; pumpkin glow at .9. These static poses are the SVG's base attributes; animations only add offsets, so removing them leaves the designed pose.

---

## 7. Text over the scene

```css
.hero-overlay {
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 46% 56% at 50% 47%, rgb(var(--hero-bg-dark-rgb) / .80) 0%, rgb(var(--hero-bg-dark-rgb) / .58) 55%, transparent 100%);
}
@media (max-width: 767px) {
  .hero-overlay { background: linear-gradient(rgb(var(--hero-bg-dark-rgb) / .72), rgb(var(--hero-bg-dark-rgb) / .80)); }
}
```

These opacities are starting values. `scripts/hero-contrast.py` measures and TASK-06 adjusts them to the smallest values that pass; the final numbers go in the doc.

Text colours: wordmark and tagline `--c-ink` (existing), second line `--hero-glyph`-family lavender only if it passes (otherwise `--c-ink`); chips keep the existing dark fill with a 1px border from the existing line token.

Contrast script:
1. Load the page (Chrome), set Calm, wait; for each text element set `visibility: hidden` on all text and controls, take a screenshot, read pixels inside each element's box.
2. Compute, for each box, the colour at the 95th percentile of luminance (the bright worst case) and compare with the element's computed text colour.
3. Repeat for `full` at five timepoints (t = 0, 1, 2, 3, 4 s) and for `reduced` and 375 px.
4. Print a table and exit non-zero on a failure. The ratio uses the WCAG relative luminance formula.

---

## 8. Performance method

`scripts/hero-perf.py` (Playwright, Google Chrome):

1. For `scene on` and `scene off` (a query flag `?scene=off` honoured only when `import.meta.env.DEV` or `?debug=1`, so production has no switch), and for CPU throttle 1x and 4x (`Emulation.setCPUThrottlingRate`):
2. Inject a rAF counter; move the pointer along a circle (60 steps per second) for 5 s; collect frame timestamps.
3. Report mean fps, 5th percentile frame time, number of long tasks, SVG element count, animated element count (`document.getAnimations().length`), CLS.
4. Print the machine (`sysctl -n machdep.cpu.brand_string`) and the Chrome version.

No claim is made beyond those printed numbers.

---

## 9. Testing

| File | Runner | What |
|---|---|---|
| `src/test/hero-tokens.test.ts` | Vitest | each `--hero-*` in `index.css` equals the JSON; state colours equal the rules; no hex in the scene TSX |
| `src/test/ghost-mascot.test.tsx` | Vitest + jest-axe | three states (body variable, face markup, extras), props, `title`, old test ids, no emoji |
| `src/test/hero-scene.test.tsx` | Vitest + jest-axe | layer order and counts; aria-hidden; no focusable node; no `image`, `filter`, `foreignObject`; keyframes parse (min 334 ms, only transform and opacity) |
| `src/test/hero-motion.test.tsx` | Vitest | tiers, Calm, `(pointer: coarse)`, hidden tab (set `document.visibilityState`, dispatch `visibilitychange`) |
| `scripts/ui_fidelity_home.py` | Playwright | the screenshots and the side-by-side sheet |
| `scripts/hero-contrast.py`, `hero-perf.py` | Playwright | the measurements above |
| `agent/tests` | pytest | untouched; run for safety |

For the Playwright layout, parallax, Calm, console and axe checks (REQ-TEST-02, 03) the repo has no dashboard e2e setup on `main`, so they are written as a pytest module `agent/tests/test_home_hero.py` that starts `vite preview` (needs `npm run build` first) and uses the project's Python Playwright. If `dashboard/dist` is missing the test is skipped and reports "not run". axe-core comes from `dashboard/node_modules/axe-core` and is injected into the page.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| The v7 panel is small, so castle and graveyard detail cannot be copied exactly | Redraw the composition with simpler shapes; list the loss of detail (D6); review at the first screenshot stop |
| Hand-drawn SVG paths take time to look right | A gallery page overlays the SVG on the reference crop at 50% opacity for each piece; the first review is only the still scene (before animation) |
| 1200 elements and 40 animated nodes are not enough for a lively scene, or are too many for frame rate | Counted and measured (REQ-PERF); `reduced` tier is the release valve |
| Text contrast varies with moving bats and fog | The contrast script samples five moments and uses the bright 5%; the overlay sits above all moving layers |
| `slice` crops the ghost or castle on unusual widths | Layout checks at 375, 768, 1024, 1440 and a 2560 case; per-breakpoint transforms |
| The mascot replaces an emoji used in six places at very different sizes (24 to 76 px) | Render each use at its size in the gallery; the face stays legible at 24 px (eyes are at least 3 px) |
| The hero needs the self-hosted wordmark font; `index.html` still loads Google Fonts on `main` | If the font task from the pixel spec has not landed, this spec's TASK-06 self-hosts Uncial Antiqua (`@fontsource`, one weight) so REQ-LAY-07 holds |
| The Home button's behaviour differs between `main` and the routing branch | Only its style changes (D8) |
