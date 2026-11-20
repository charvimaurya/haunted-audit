# UI fidelity rules

Source of truth: `design/Haunted_Audit_Final_UI_v7.png` ("Final UI design v7"). It is frozen and approved by the panel review. These rules sit beside `product-rules.md` and `product-ux.md`. If two rules conflict, the stricter one wins, and the conflict is raised with the owner before code changes.

## Fidelity

- Reproduce the image exactly: layout, spacing, colours, icons, wording, button labels and states.
- Do not restyle, add features, or reword copy.
- The A to E badges and the white side panel in the image are design notes. Never render them.
- Sample colours directly from the image into design tokens (`tailwind.config.js` and `src/index.css`). Do not guess. Sample flat areas, not gradients or artwork, and record the pixel position for each token.

## Type

- The spooky display font is for the "Haunted Audit" wordmark only.
- Everything else uses a clean sans. Code uses a monospace.
- Text is 16px minimum.

## Accessibility

- Visible focus on everything.
- Status is never shown by colour alone: icon plus text.

## Numbers

- "[x]" and "[n]" in the image are placeholders. Show the real measured value, or `--` until it is measured.
- Never show the literal brackets. Never invent a number.

## Assets

- Self-host fonts and assets. No external CDNs.
- Build art as inline SVG.

## What the image says is already applied (keep it)

- The bank is labelled "Haunted Bank · Test site".
- Possession Mode is labelled "Keyboard-only demonstration".
- The Regression Guard shows the real failing test.
- Copy: "The ghost is back. But this time, we caught it."
- Results are placeholders until measured.
- "Built with Kiro" is plain text (garbled text fixed).

## What the image says happens in the real app

| Mark | Behaviour |
|---|---|
| A | The red ghost sits beside Send Payment and never on it. |
| B | Judges press Tab themselves; the panel fills in live. |
| C | Agent cards plus a live timeline during the run. |
| D | Fix, Verify and Regression are shown one step at a time. |
| E | 16px text, 200% zoom, visible focus, reduced motion. |

Mascot: purple is Ready, red is Blocked, green is Verified.

Image caption: "[x] and [n] are filled with measured results before submission."
