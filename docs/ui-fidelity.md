# UI fidelity against v7 (plan item U2, UI)

Date: Sun 22 Nov 2026. Branch: `feature/ui-fidelity`. Source: `design/Haunted_Audit_Final_UI_v7.png`, cropped per panel into `docs/ui-fidelity/v7/` (A Home, B Possession, C Agents, D Fixes, E Kiro, F Results).
Screenshots at 1440 px: `docs/ui-fidelity/before/` (from `main` at `fb89404`) and `docs/ui-fidelity/after/`, made by `scripts/ui_screens.py`. The `run_*` shots follow a real haunted run (scripted keyboard walker).

Some v7 content is placeholder by the design's own note ("[x] and [n] are filled with measured results"). It is not drawn as if measured (`product-rules.md`, PR #11). Rows marked **kept** are deliberate differences.

## Differences found

| # | Page (v7 panel) | v7 | Before | Action |
|---|---|---|---|---|
| D1 | Home (A) | No emoji. Mascot drawn | Two emoji 👻 roam the hero: one crosses the title area, one sits at the right edge. Emoji look different on every device | **fix**: our own inline SVG ghost |
| D2 | Home (A) | Graveyard ground fades into the page | Hard edge at the hero's bottom, then empty space | **fix**: ground fades into the page colour |
| D3 | Home (A) | No caption | Visible developer caption "The start page. It explains…" | **fix**: visually hidden description on the hero |
| D4 | Home (A) | Path drawn as a path | A stray grey triangle (the "path" shape) under the step chips | **fix**: removed |
| D5 | Home (A) | Bright chips with coloured icons | Dim chips, muted text | **fix**: brighter border, text and icons |
| D6 | Home (A) | Painted art (ghost holding a laptop, full graveyard) | Our simpler inline SVG art | **kept**: `ui-fidelity.md` asks for inline SVG, not image files |
| D7 | Every page | Castle and fog band at the top of each panel | None outside Home | **fix**: slim decorative castle and fog band under the top menu |
| D8 | Every page | Mascot shown in Ready, Blocked, Verified | `GhostMascot` was an emoji, so its colour classes did nothing: it never showed purple, red or green | **fix**: SVG mascot coloured by state, plus a run-state badge (mascot + text) on every page |
| D9 | Every page | Glowing violet panel borders | Plain dark borders | **fix**: violet border and glow on `.panel` |
| D10 | Every page | Breadcrumbs | Only app pages had them | **fix**: breadcrumbs on public pages too (Home stays without, as in v7) |
| D11 | Journey pages | Left sidebar | Present (app shell) | no change |
| D12 | Agents (C) | Red "Critical Ghost Detected" card | Card shown only for BLOCKED, but its Barrier, Impact and WCAG lines were fixed text and its icon an emoji | **fix**: every line read from `reason_code` and `blocked_element` (mapping from `bank/PLANTED.md` and the `wcag-ghost-mapper` skill); SVG icons |
| D13 | Possession (B) | Recipient and Amount show what was typed | Fields stay empty after a run | **fix**: show the values the run typed, from its `step_events` (real data) |
| D14 | Possession (B) | Red "Live Test" chip | Shown only while running since PR #11 | **kept** |
| D15 | Fixes (D) | Arrows between the steps | No arrows | **fix**: decorative arrows |
| D16 | Fixes (D) | Example diff, ticks, "Journey Verified", "caught" | "Not available yet" (PR #11) | **kept**: the Exorcist and Verifier do not exist |
| D17 | Results (F) | Green tick on "Approved fixes verified" | Neutral wrench (PR #11, a tick beside `--` reads as a pass) | **kept** |
| D18 | Kiro (E) | "Kiro Hook (Live)" list | One recorded finding with its source (PR #11) | **kept** |
| D19 | Every page | High-contrast mode required by `product-ux.md` | Not built | **fix**: High contrast switch beside Calm mode, saved, applied before first paint |
| D20 | Every page | Text-size setting required by `product-ux.md` | Not built | **open**: not in this round |

## Checks for this round

- axe in real Chrome on every page: normal, Calm and high-contrast modes, zero violations.
- Home cropping at 1280 px and on a phone (390 px).
- Existing tests unchanged.

## Before / after checklist (1440 px unless stated)

| # | Before (`docs/ui-fidelity/before/`) | After (`docs/ui-fidelity/after/`) | Done |
|---|---|---|---|
| D1 | `home.png`: two 👻 emoji | `home.png`: our SVG ghost in both roaming spots | yes |
| D2 | `home.png`: hard ground edge | `home.png`: ground fades into the page | yes |
| D3 | `home.png`: visible caption | `home.png`: no caption; description is `sr-only` | yes |
| D4 | `home.png`: grey triangle under the chips | `home.png`: removed (also one bare tree over the castle) | yes |
| D5 | `home.png`: dim chips | `home.png`: bright chips, coloured icons | yes |
| D7 | `app_reports.png`: no band | every page except Home: castle and fog band behind the breadcrumbs | yes |
| D8 | `run_possession.png`: emoji mascot, no colour | `run_agents.png`: red SVG ghost in the run-state badge and the card; purple when no run | yes |
| D9 | plain panel borders | violet glowing borders | yes |
| D10 | `how-it-works.png`: no breadcrumbs | `how-it-works.png`: Home / How it works | yes |
| D12 | `run_agents.png`: fixed text, 🚫 emoji | `run_agents.png`: text from `reason_code` and `blocked_element`, mode and page stated | yes |
| D13 | `run_possession.png`: empty fields | `run_possession.png`: "Alex Carter" and "€50.00" from the run's steps | yes |
| D15 | `app_fixes_find.png`: no arrows | `app_fixes_find.png`: arrows between steps | yes |
| D19 | no high contrast | High contrast switch in the top bar (in the menu on a phone), saved, applied before first paint | yes |
| — | phone 390 px: top bar overflowed once the third switch was added | `home-phone.png`: settings move into the menu; no horizontal overflow | yes |
| — | 1280 px | `home-1280.png`: no horizontal overflow; H1 fully visible | yes |

Measured after the changes:
- **axe in real Chrome** (`e2e/axe-pages.e2e.ts`, WCAG 2.2 AA tags): 0 violations on all 20 pages in normal, Calm and high-contrast modes.
- **Keyboard walk:** 0 of 20 pages failing.
