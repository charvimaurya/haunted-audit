# Skill activation evidence

Date: Sun 22 Nov 2026. Client: Kiro IDE. Skills in `.kiro/skills/`.

## What was tested

| Request | Skill applied | How it was shown |
|---|---|---|
| "Explain this finding" (`label-594db4fb701f` from `scan_page` on the bank page) | `wcag-ghost-mapper` | The skill appeared in this session's skill catalogue after it was written. It was loaded and applied in the main Kiro chat. The answer has the skill's four-line format: Finding, WCAG 1.3.1 / 3.3.2 / 4.1.2, Severity serious, Impact. |
| "Review this UI: dashboard/src/components/RunControls.tsx" | `accessible-ui-review` | Asked in a **fresh Kiro sub-agent** with no mention of any skill. The sub-agent loaded `accessible-ui-review` itself. Its "Skills used" line reads `accessible-ui-review`, and it reported in the skill's format (rule numbers, serious/minor, "Not checked"). |

## Limits, stated plainly

- In the main chat I loaded `wcag-ghost-mapper` myself after writing it. That shows Kiro discovered it and that it works. It does not show automatic activation from a cold prompt. The sub-agent test does show that for `accessible-ui-review`.
- The owner can repeat both in a new Kiro chat and take a screenshot. Skill activation shows in the chat.
- `exorcise-fix` and `journey-test-writer` were not used and are not claimed. They are marked "needs the Exorcist and journey-test writer to be verified".

## What the review found (real issues, left for a follow-up)

In `RunControls.tsx` the sub-agent reported four serious issues:

1. `aria-label` replaces the visible "Run Journey" name (WCAG 2.5.3).
2. `disabled` on the focused button drops focus.
3. The Complete and Error badges have no icon.
4. The focus ring is 2px, not 3px.

All four were fixed in the same pull request and checked in Chrome: the button's name is "Run Journey", focus stays on it during a run (`aria-disabled`), the status shows an icon and "Run status: Complete", and the focus outline is solid 3px.
