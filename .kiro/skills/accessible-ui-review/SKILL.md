---
name: accessible-ui-review
description: Review a UI component, page or diff in this repo against the Haunted Audit accessibility rules (16px text, visible focus, keyboard only, contrast, status not by colour alone, decorative art hidden, ghost beside not on a control, one H1, no invented numbers). Use when asked to review this UI, check a screen or component for accessibility, or as the reviewer agent's accessibility step.
metadata:
  project: haunted-audit
  rules-from: .kiro/steering/accessibility.md, .kiro/steering/product-rules.md
---

# Accessible UI review

Check each rule below in order. For every problem give the file, the line, the rule, and the smallest fix. Mark each one **serious** (someone is blocked or misled) or **minor**. End with "No serious issue open" or the list of serious issues.

Do not edit files. Do not run the app unless asked. Say what you could not check (for example, real contrast on a gradient, or focus order without a browser).

## The rules, each with one good and one bad example from this repo

### 1. Text is 16px (1rem) or larger
- Good: `PossessionMode.tsx` labels use `text-base`.
- Bad (fixed in PR #6): `GhostHuntSection.tsx` used `text-[10px]` for "Live steps". About 50 `text-xs` and `text-sm` uses were raised to `text-base`.

### 2. Every interactive element has a visible 3px focus outline
- Good: `Fixes.tsx` links use `focus-visible:ring-2 focus-visible:ring-violet-neon`, and `scripts/keyboard_walk.py` found a visible ring on every stop of all 19 pages.
- Bad: the haunted bank's `#recipient` sets `outline: none` with no replacement (bank barrier 4).

### 3. Everything works with Tab, Shift+Tab, Enter and Space
- Good: the fixed bank page uses `<button type="submit">Send Payment</button>`.
- Bad: the haunted bank uses `<div class="pay-btn" onclick=...>`, which Tab never reaches (bank barrier 1).

### 4. Text contrast 4.5:1, icons and borders 3:1
- Good: the fixed-variant Send Payment button measures 5.37:1 to 6.9:1 (`bank/PLANTED.md`).
- Bad (fixed in PR #5): the first version was 2.57:1 to 4.25:1 on a gradient. Axe skips gradients, so calculate by hand.

### 5. Status is never colour alone (icon plus text)
- Good: `AgentCard.tsx` shows a red cross icon with "failed" for screen readers, next to the text "Could not reach Send Payment".
- Bad: the haunted bank's validation errors are red text only, with no icon and no live region (bank barrier 6).

### 6. Decorative art is `aria-hidden`, ignores the pointer, never focusable; Calm mode stops it
- Good: `HeroCastle.tsx` is `aria-hidden="true"`, `pointer-events: none`, and only adds its pointer listener when `useMotionAllowed()` is true.
- Bad: an emoji in a `<span>` with no `aria-hidden` is read out ("ghost") by a screen reader.

### 7. The ghost sits beside the control it describes, placed only from `blocked_element.bounding_box`
- Good: `PossessionGhost.tsx` takes its position from the checker's bounding box.
- Bad: a ghost drawn at fixed coordinates, or on top of Send Payment.

### 8. One `<h1>` per page, focus moves to it after navigation, unique title
- Good: `Page.tsx` renders the page H1 from `routes.ts`; `routes.test.tsx` checks one H1 and the title on every page.
- Bad: two H1s, or a route change that leaves focus on the old link.

### 9. No invented numbers; unmeasured is `--` with "not yet measured"; `agent_mode` beside every result
- Good: `ResultsSection` shows `--` and "not yet measured" until a run measures a value.
- Bad (fixed in PR #6): `fixesVerifiedPct` was set to 100 after one PASSED run, and Ghost Hunt showed example outcomes before any run.

## How to report

```
1. [serious] dashboard/src/components/X.tsx:42. Rule 1 (16px). `text-xs` on the status line. Fix: `text-base`.
...
No serious issue open
```
