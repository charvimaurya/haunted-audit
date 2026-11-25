# UI v9 fidelity audit (25 Nov 2026)

Target: `design/v9/index.html` (all screens). App: `origin/main` `ab6fdac`, run from a clean worktree with a test API,
after a real scripted broken run, an approved scripted fix, Verify and the regression check. Both at 1366 x 657 in
Chrome. Images: `docs/ui-fidelity/v9-audit/side-<screen>.png` (v9 on the left, app on the right).

Every v9 screen fits 1366 x 657 inside one framed panel. No app screen does (page heights 1420 px to 1845 px).

| Screen | Matches v9 | Differs from v9 | Owner / status |
|---|---|---|---|
| Home (`side-home.png`) | v7 picture, live title, Possess This App, four chips, two roaming ghosts | No "Pause animation" button on `ab6fdac`. **Correction (25 Nov, later):** the thin title in `side-home.png` was a fault of the audit set-up, not the app: the audit's dev server could not serve the self-hosted fonts (its `node_modules` was a link outside the worktree, so Vite answered 403) and every font fell back. With the fonts served, the title uses Rubik Wet Paint as in v9 | Uncommitted Home work in the main checkout (owner unknown) touches `HeroSection.tsx` and `index.css`. Not changed here |
| Possession, Keyboard (`side-possession-keyboard.png`) | Keyboard / Voice switch, Tab steps, Run, red ghost beside Send Payment | v9 shows the bank and the Possession Mode panel together in one view with Variant in the panel top bar; the app puts a Test details form and selects above, and the bank below the fold; no "Journey Blocked" note or "Barrier Detected!" bar in view | Overlaps uncommitted voice work (`PossessionJourney.tsx`, `useVoiceRun.ts`). Not changed here |
| Possession, Voice (`side-possession-voice.png`) | Voice switch, Run voice journey, Push to talk | Same layout gap as Keyboard; v9 shows the said commands as ticked steps beside the bank | Same as above |
| Agents (`side-agents.png`) | Three cards, Critical Ghost card, real rows | v9 timeline is a row of chips under the cards; app has a "Live steps" column. Critical Ghost card is below the fold | Not changed |
| Fixes, Fix / Verify / Regression (`side-fixes*.png`) | Three cards side by side, step strip, Approve and Reject, voice row | Before this branch: old button names, purple caught ghost, no journey lines. **Fixed in `feature/ui-v9-fixes` (`side-after-fixes.png`).** Still different: long real diff (v9 shows a 3-line excerpt), extra evidence rows with run IDs, BLOCKED → VERIFIED line and Before and after panel (from plan items 4 and 5; v9 silent, kept) | This branch |
| Kiro (`side-kiro.png`) | Folder tree, real hook file, recorded finding with date | v9 has folder icons and a "Built with Kiro" button in the hook card; app tree is plain text | Not changed |
| Results (`side-results.png`) | Four tiles, Outcome parchment, measured numbers or `--` | v9 tiles are coloured (red, green, purple, blue) and sit in one row with the parchment and a large mascot; app tiles are plain, the parchment is below. Third tile: v9 "Journeys passing (keyboard + voice)", app "Test scenarios evaluated" | Not changed |
| Scans (`side-scans.png`) | Page exists in the menu | v9 shows "Scan a public URL (scan only)" with a Scan page button; the app says "Not available yet" because there is no scan endpoint. A public-URL scan also conflicts with the product rule that agents run only on the bundled Haunted Bank | **Owner decision needed** before any build. Not changed |

## Shell (every app page)
v9 frames each screen in one panel with a top bar: breadcrumb ("Kiro > Journey: Send Payment > Possession Mode"),
Variant, and a "Live Test" chip. The app has a castle band with breadcrumb and a run-state badge, and a separate H1.
Fitting each screen into 1366 x 657 needs this shell change first; it touches every page.

## Suggested order for the rest
1. Shell: v9 panel frame and top bar (then every screen can fit).
2. Results: coloured tiles in one row with the parchment.
3. Possession (after the voice work in the main checkout is handed over).
4. Home title font and Pause (after the Home work is handed over).
5. Agents timeline chips; Kiro folder icons.

All images in `v9-audit/` were taken with fallback fonts (see the correction in the Home row). Shapes, sizes and layout are still valid; letterforms are not.
