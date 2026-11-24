# Item 12: where each rule from `.cursor/rules/haunted-audit-dashboard.mdc` lives now

The Cursor rule file is removed because the plan says Cursor files go and Kiro steering is the single source.
Each rule in the old file, checked against `.kiro/steering/` on this branch.

| Cursor rule | Now lives in | Status |
|---|---|---|
| Vite + React + TypeScript + React Router in `/dashboard` | `tech.md` (Dashboard row), `structure.md` | covered |
| Touch only `/dashboard`; do not change backend, bank page or API contract | nowhere, on purpose | dropped. It limited one Cursor worker to one folder and conflicts with full-stack tasks. The API contract is still protected by `data-contract.md` ("A new or changed field means editing this file in the same pull request") and by plan item 20 |
| If a backend change is needed, stop and tell the user | nowhere, on purpose | dropped with the rule above |
| Real data only, no invented results | `product-rules.md` (Metrics and Rendering), `product-ux.md` (Real content only), `data-contract.md` | covered |
| Show `--` until measured | same three files | covered |
| Show a clear "backend offline" state when the API is down | `product-ux.md` (Real content only) | **missing before; added in this PR** |
| 16px text, visible focus, 200% zoom, AA contrast, reduced motion | `accessibility.md`, `ui-fidelity.md` (mark E: 200% zoom) | covered |
| One H1 per page, semantic HTML, no colour-only status | `accessibility.md`, `product-ux.md` (landmarks) | covered |
| Decorative art is inline SVG, `aria-hidden`, `pointer-events: none`, behind interactive content | `ui-fidelity.md` (inline SVG), `product-rules.md` and `accessibility.md` (aria-hidden, no pointer, under the controls) | covered |
| Work in stages; stop after each, list files, wait | nowhere, on purpose | dropped. It was an interaction rule for a Cursor worker. The plan's branch, spec and pull request rules replace it |
| No new dependencies without asking | `tech.md` ("Add a dependency only when the task needs it. Pin it") | covered, slightly looser: "when needed", not "ask first" |

Security: the old file had no security rules. Secrets and AWS credential rules are in `tech.md`.

Open decision for the owner: if you want "ask before adding a dependency" back, say so and `tech.md` will be tightened.
