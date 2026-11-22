# Hero scene - Tasks

Order: palette -> mascot SVG (3 states) -> castle and graveyard layers -> moon, bats, fog -> pumpkins -> layout and text overlay -> animation and Calm mode -> screenshots and tests.

Effort numbers are my estimates in hours (not measured, not from your plan).

## Rules for every task

- Branch `feature/hero-<name>` from `main`; one small pull request each (or one for the spec); read every diff; template filled in.
- The site keeps working after every task. Home keeps rendering. After each: `cd dashboard && npm test && npm run build`.
- **Stops for your review** are marked STOP. The next task does not start without your OK (the scene is art; opinions matter before animation work).
- No hex or `rgb()` colour in scene TSX; `var(--hero-...)` only. No raster, no emoji, no filter/blur, no external request.
- Every part is checked against the reference in the gallery page at `/dev/art` (development only, excluded from the production build): the SVG piece at 50% opacity over the reference crop.
- Numbers (contrast, fps, element counts, delta E) are written down only as measured, with the machine and Chrome version.
- Anything that breaks goes into `evals/cases.yaml`; one line in `docs/devlog.md` per task.
- Nothing is committed without your approval.

---

## Phase 0

### TASK-00 Settle the open decisions (you)
**Effort:** 0.25 (your time)
Answer D1 (Ready ghost body colour), D2 (wordmark as font or drawn paths), D3, D4 (drop the roaming emoji ghosts from the hero), D5 (what to claim about frame rate), D7 (this spec replaces two tasks in `pixel-faithful-ui-v7`), D8.
**Verified by:** the table in `requirements.md` has an answer next to each row.

---

## Phase 1 - Palette

### TASK-01 Sample the palette into tokens
**Satisfies:** REQ-PAL-01 to REQ-PAL-05
**Effort:** 2.5
**Steps:**
1. `scripts/sample-hero-tokens.py`: extract the three deck PNGs from `docs/Haunted Audit Judge Deck v7.pptx` with `zipfile`; read pixels through Playwright and a canvas; list of `{name, image, x, y}` entries seeded with the positions in REQ-PAL-03; median of a 5 x 5 block, max deviation, alpha.
2. For the tokens marked "not yet sampled" (castle, hill, path, fog, window, stem, tombstones), crop and look at the v7 panel and the deck pumpkin PNG, pick flat patches (deviation 3 or less) or record gradient stops; write the chosen positions into the script.
3. Write `design/hero-tokens.json` and the block in `src/index.css` between `hero-tokens:start/end` (colour and channel forms). `--check` mode fails on drift.
4. Add `src/test/hero-tokens.test.ts`.
**Verified by:** running the script twice gives identical files; `--check` passes; the Vitest test passes; a source scan finds no hex in `src/components/hero/`; the table of tokens with positions and deviations is pasted into the pull request. Any token that could not be sampled flat is listed as a gradient stop, not as one invented colour.

---

## Phase 2 - Mascot

### TASK-02 `GhostMascot` (three states), `GhostIcon`, `HeroGhost`
**Satisfies:** REQ-MAS-01 to REQ-MAS-07
**Effort:** 5
**Steps:**
1. Gallery page `src/dev/ArtGallery.tsx` at `/dev/art` (dev only; removed from the production build by `import.meta.env.DEV`): shows every piece at 1x, 3x and at the sizes used today (24, 28, 32, 48, 76) next to the reference crop.
2. Rewrite `GhostMascot.tsx` as SVG (design section 4): ready (hat, rim, halo), blocked (angry), verified (happy). Props `state`, `size`, `animate`, `className`, `title`. Keep `data-ghost-state`, `data-semantic-ghost`, `data-testid="ghost-mascot"` and the old float behaviour behind `animate` with Calm honoured.
3. `GhostIcon.tsx`; replace the logo and the Kiro pill glyphs that use `lucide` `Ghost` or emoji where they stand for the product ghost.
4. `hero/HeroGhost.tsx`, `Laptop.tsx`, `Magnifier.tsx` (accessibility icon on the laptop, `</>` in the lens).
5. Trace against the deck PNG: overlay the SVG at scale 2 on `image-1-1.png` in the gallery and adjust until body, eyes, hat, buckle, ring and handle line up.
6. Replace the emoji at the six existing call sites (GhostHunt, Outcome, Pipeline, Possession, Hero) by the new component; update any existing test that names the emoji.
**Verified by:** unit tests for the three states (body variable, face markup, hat only in ready), props, `title` vs `aria-hidden`, old test ids; jest-axe zero; a source scan finds no emoji in `dashboard/src` outside tests; at 24 px each state is still distinguishable (checked in the gallery by eye and noted); all existing tests pass.
**STOP:** show the gallery page (`/dev/art`) with the three states and `HeroGhost`.

---

## Phase 3 - Scene layers (still, no animation yet)

### TASK-03 `HeroScene` shell, sky, castle, trees, graveyard
**Satisfies:** REQ-SCN-01 (layers 1, 3, 4 trees, 5), REQ-SCN-02, REQ-SCN-03
**Effort:** 6
**Steps:**
1. `hero/HeroScene.tsx`: the SVG (`viewBox 0 0 1440 700`, `slice`, `aria-hidden`, `focusable="false"`, `pointer-events: none`), layers in order with `data-layer` and `data-depth`.
2. `SkyLayer` (gradient, radial glow, 70 stars from a fixed list), `CastleLayer` (hill, 5 towers, roofs, 4 windows, flag), `TreesLayer` (left and right, round-capped strokes), `GraveyardLayer` (back and front depth, crosses, 40-picket fence, path).
3. Compare each layer to the v7 crop in the gallery at 50% opacity and adjust placement (design section 3 numbers are starting points).
4. Mount `HeroScene` in `HeroSection` behind the existing content (static for now). Keep the old hero decoration until TASK-06 so Home never breaks.
**Verified by:** layer order and counts (stars, towers, windows, tombstone depths) in a Vitest test; no `image`, `filter`, `foreignObject` or external URL (source scan); axe zero with the scene mounted; `elementFromPoint` at the button returns the button; the SVG element count so far is recorded.

### TASK-04 Moon, bats, fog
**Satisfies:** REQ-SCN-01 (layers 2, 4 bats and fog), REQ-MOT-04
**Effort:** 3
**Steps:** `MoonLayer` (disc, 3 craters, stacked-circle halo, no blur), `BatsLayer` (one `<symbol>`, 4 `<use>` with static mid-scene transforms), `FogLayer` (3 bands from linear gradients, 2 copies each, static at x 0). Still scene only.
**Verified by:** counts in a test; no `filter`, `feGaussianBlur` or `mix-blend-mode` anywhere in `src/components/hero/`; gallery overlay review; element count recorded.

### TASK-05 Pumpkins
**Satisfies:** REQ-SCN-01 (layer 6)
**Effort:** 2
**Steps:** `Pumpkin.tsx` (body, 5 ribs, carved face, stem, two-ellipse inner glow) and `PumpkinsLayer` placing the right and left corner pumpkins (and the optional small one). Compare with the deck pumpkins and the v7 corners.
**Verified by:** counts; colours only from variables; gallery review.
**STOP:** screenshot of the still scene at 1440 px (before any text overlay). Review the art against both references before layout work.

---

## Phase 4 - Layout and text

### TASK-06 Layout, overlay, content, font
**Satisfies:** REQ-LAY-01 to REQ-LAY-07, REQ-SCN-04, REQ-SCN-05
**Effort:** 4
**Steps:**
1. Rebuild `HeroSection` per design section 5: scene, overlay, content; remove `AmbientLayer` and the emoji bats and pumpkins from the hero (D4). Keep the button's behaviour (D8). Chips: static labelled list with inline SVG icons.
2. Wordmark: Uncial Antiqua self-hosted (`@fontsource/uncial-antiqua`, one weight, exact version) with a `text-shadow` glow; if `index.html` still loads Google Fonts, remove that link for this font only and note the rest for the font task of the pixel spec.
3. Overlay gradient (design section 7) at its starting opacities; `min-height` of 43.75rem; mobile composition transforms.
4. `scripts/hero-contrast.py` (design section 7). Tune the overlay to the lowest values that pass, in normal, `reduced` and Calm, at 1440 and 375.
**Verified by:** Playwright layout boxes at 375, 768, 1024, 1440 (ghost left, castle and moon right, pumpkins at both corners); the contrast table (every row 4.5:1, or 3:1 for large text and control borders; focus ring 3:1) pasted into `docs/ui-fidelity.md`; no horizontal scroll at 375 and at a 640 px viewport (200% zoom); text not clipped at 150% text size; axe zero.

---

## Phase 5 - Motion

### TASK-07 Animation, parallax, Calm, quality tiers, hidden tab
**Satisfies:** REQ-MOT-01 to REQ-MOT-10, REQ-A11Y-03, REQ-A11Y-05
**Effort:** 5
**Steps:**
1. `hero.css` keyframes (design 6.2): float, blink, fog, bats and wings, fireflies (`FirefliesLayer`, 12), pumpkin flicker, star twinkle. Only `transform` and `opacity`. Negative delays so the scene looks mid-motion at load.
2. `useHeroMotion` (design 6.1) and `usePageVisible`; `data-hero-motion` and `data-hero-paused` on the section; CSS rules for `off`, `paused`, `reduced`.
3. `useParallax` (design 6.3): listener only when allowed and `(pointer: fine)`; eased rAF loop that stops when settled; transforms on `[data-depth]` groups; cleanup clears transforms.
4. High contrast: hide fog, bats, fireflies and glow and darken the overlay (REQ-A11Y-03).
5. `contain: paint` on the hero; check no layout shift.
**Verified by:** Vitest: every keyframe cycle at least 334 ms, only transform and opacity animate, tiers (`full`, `reduced`, `off`) switch the right parts, coarse pointer attaches no listener, hidden tab pauses and visible resumes. Playwright: with Calm turned on while the hero runs, `document.getAnimations()` is empty, no `pointermove` listener on the hero, a rAF counter stays at 0 for 3 s, and the screenshot still shows all seven layers; parallax order by depth and a largest shift of 12 px or less; CLS 0.01 or less over 5 s of pointer movement; axe zero in normal, Calm and high contrast. The hidden-tab path is covered by the unit test only; say so.

### TASK-08 Performance measurement and tuning
**Satisfies:** REQ-PERF-01 to REQ-PERF-04
**Effort:** 2.5
**Steps:** `scripts/hero-perf.py` (design section 8); run on this machine at 1x and 4x CPU throttle, scene on and off; count SVG and animated elements; record the Home chunk size before and after. If the 4x mean is under 45 fps, tune the `reduced` tier (fewer fireflies and bats, no flicker) and measure again.
**Verified by:** the printed table goes into the pull request with the machine name and Chrome version; element counts within budget (1200 and 40); chunk size reported; nothing is claimed beyond the measured numbers.

---

## Phase 6 - Record and tests

### TASK-09 Screenshots, side-by-side, checklist
**Satisfies:** REQ-FID-01 to REQ-FID-04
**Effort:** 3
**Steps:**
1. `scripts/ui_fidelity_home.py`: build the app (`npm run build`), serve with `vite preview`, screenshot at 1440 px (`docs/ui-fidelity/home.png`, Calm `home-calm.png`, 375 px `home-375.png`), and write `home-side-by-side.png` (v7 Home crop, deck title slide, our screenshot) by screenshotting a throwaway HTML page.
2. Grid colour distance (CIE76 delta E, 8 x 4 cells) against the v7 crop, computed in the page with canvas; print the grid and the mean.
3. Fill the Home section of `docs/ui-fidelity.md`: checklist per reference (layout, colours, copy, icons, characters, atmosphere) with Match, Differs and a reason, or Not checked; list the known differences (D1, D2, D6, 16px floor, no painted texture).
**Verified by:** the four images exist; every checklist row has a mark and every Differs has a reason; the delta E mean is printed with "average colours only, not shapes".
**STOP:** review the screenshots and the checklist.

### TASK-10 Test suite, existing tests, close out
**Satisfies:** REQ-TEST-01 to REQ-TEST-05, REQ-A11Y-01, REQ-A11Y-02, REQ-A11Y-04
**Effort:** 3
**Steps:**
1. `agent/tests/test_home_hero.py` (pytest + Python Playwright, skipped with "not run" if `dashboard/dist` is missing): layout boxes, parallax, Calm probes, coarse pointer, keyboard walk to the button and chips, console errors and warnings, cross-origin requests, axe (normal, Calm, high contrast; axe-core from `dashboard/node_modules`).
2. Run: `cd dashboard && npm test && npm run build`, `.venv/bin/python -m pytest -q`, the contrast and perf scripts, the screenshot script. Update only the existing tests that name the emoji mascot or the old hero decoration and list them in the pull request.
3. Mark the two overlapping tasks (`pixel-faithful-ui-v7` TASK-03 mascot and TASK-05 Home scene) as covered, in that spec's `tasks.md` (one line each, in its own commit).
4. Add a line per task to `docs/devlog.md`; update `docs/plan-status.md` rows 1.6 and 3.5 with evidence only.
5. Open the pull request with the template: spec link, what changed, QA report (all outputs above with browsers and machine), reviewer notes, Definition of done.
**Verified by:** all suites pass; the PR body has every section; every number in it appears in a pasted output; the browsers run (bundled Chromium, Chrome) and not run (Safari, Firefox) are listed.

---

## Effort summary (estimates)

| Phase | Hours |
|---|---|
| Decisions (you) | 0.25 |
| Palette | 2.5 |
| Mascot | 5 |
| Scene layers (3, 4, 5) | 11 |
| Layout and text | 4 |
| Motion and performance | 7.5 |
| Screenshots and tests | 6 |
| **Total** | **36.25** |

If time is short: TASK-01, 02, 03 and 06 give a still hero with the right look and AA text; TASK-04, 05 add the moon, bats, fog and pumpkins; TASK-07 and 08 add motion and measurements and can follow. Calm mode shows the still scene, so the still version is also the Calm version.

## Traceability

| Requirement group | Tasks |
|---|---|
| REQ-PAL | 01 |
| REQ-MAS | 02 |
| REQ-SCN | 03, 04, 05, 06 |
| REQ-LAY | 06 |
| REQ-MOT | 04, 07 |
| REQ-PERF | 08 |
| REQ-A11Y | 03, 06, 07, 10 |
| REQ-FID | 09 |
| REQ-TEST | 01 to 10 |
