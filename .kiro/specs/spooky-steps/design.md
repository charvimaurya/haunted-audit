# Design: spooky moments

- `ExorcismMoment.tsx` (new): `GhostMascot state="blocked" animate={false}` inside a span with
  `data-moment="exorcism"` and class `exorcism-ghost`, plus the text. Rendered by `ProposedFixPanel` when
  `fix.status === 'approved'`.
- `index.css`: `.exorcism-ghost { opacity: .35; transform: scale(.85); }` (the end state) and, outside Calm and
  reduced motion, `animation: exorcise 1000ms ease-out 1` from `opacity 1, scale 1, strong glow`. The existing
  global rules (`prefers-reduced-motion` and `html[data-calm='true']`) set `animation: none`, so Calm shows the end
  state at once.
- `BeforeAfterSplit.tsx` (new): props `{ fix: Fix | null }`. Left from `fix.run_id`, `fix.reason_code`; right from
  `fix.verify`. Right ghost fades in once (`split-reveal`, 600 ms) with motion.
- `Fixes.tsx`: renders `BeforeAfterSplit` under the pipeline when the step is `regression`.
- Words: "BLOCKED", "VERIFIED", "Not verified", "Not run yet". Heading "Before and after" (h2).
