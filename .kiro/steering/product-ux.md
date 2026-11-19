# Haunted Audit - Product UX Rules

These rules apply to every page and component. They sit beside `product-rules.md`
(verdict authority, metrics, ghost states, motion) and do not replace it.
If two rules conflict, the stricter one wins.

---

## Feel: a real SaaS product

- Consistent layout, real navigation, one clear purpose per page.
- Every nav item is its own route with its own URL, page title and H1.
- Nothing is hidden in tabs on one long page. A stepper or tab control may exist
  inside a page, but it never replaces a route.

## Two shells

| Shell | Used for | Parts |
|---|---|---|
| Marketing shell | Landing and public pages | Top nav + footer |
| App shell | Everything you use to audit | Top bar + sidebar + breadcrumbs |

- Both shells share the same skip link, settings control and help placement.
- The breadcrumb's last item matches the page H1.

## Spooky but readable

- The theme lives in visuals, microcopy and the mascot. It never gets in the way of understanding.
- Every spooky term has a plain-English line beside it. Show it where the term first appears on the page.

| Spooky term | Plain English |
|---|---|
| Ghost | An accessibility barrier |
| Possession Mode | A keyboard-only run of a user journey |
| Exorcist | The agent that proposes a fix (a human approves it) |

- Add new terms to this table and to the glossary page when they are introduced.

## Plain language

- Write at about grade 8.
- No jargon without a tooltip or a glossary link.
- One main action per page. It is the only primary-styled button on the page.

## Accessibility: WCAG 2.2 AA minimum

- Touch targets are 44px where possible.
- Visible focus is never hidden behind sticky bars (use `scroll-padding-top`).
- Navigation and the help link sit in the same place on every page.
- On route change, focus moves to the page H1.
- Every page has a unique `<title>`.
- Landmarks: header, nav, main, footer (and aside for the sidebar). A skip link comes first.

## Settings on every page

Three settings are reachable from every page, in the same place, with a keyboard:

1. **Calm mode** (see the motion rules in `product-rules.md`)
2. **High contrast**
3. **Text size**

Choices are saved on the device and applied before first paint where possible.

## Real content only

- No lorem ipsum.
- No invented customers, logos, testimonials, prices or statistics.
- A number is either sourced (with a source line next to it) or measured.
  Until it is measured it shows `--` with "not yet measured".

## Scope

- No sign-in in the MVP. Accounts are Phase 2. Do not build a fake login, a fake profile menu or a fake "your workspace".
- Built only with Kiro, from specs. A feature needs a spec in `.kiro/specs/` before code is written.

## Attribution

Say **"Built with Kiro"** as plain text wherever the project is credited.
