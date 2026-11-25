# Design: Fixes screen to UI v9

- `FixPanels.tsx`: rename the two buttons; `MarkRow` gets a trailing hidden "✓" when `mark === 'yes'`;
  RegressionPanel lists the journeys that ran (from `fix.regression` and `fix.regression_voice`) and FAILED lines;
  red ghost 56 px; caught box uses `CaughtGhost` (GhostGlyph in `text-ghost-caught`).
- `FixProvider.tsx` / `fixContext.ts`: `regressionVoiceResult` read once when `regression_voice` is complete (same as
  `voiceVerifyResult`).
- `firstVoiceFailure` from `VerifierEvidence.tsx` gives the voice message.
- Token: `ghost.caught: '#ffffff'` in `tailwind.config.js` and `--color-ghost-caught` in `index.css`.
- Words: "Replay both journeys", "Put the bug back and run both tests", "Keyboard journey", "Voice-command simulation",
  "FAILED: Send Payment not focusable (<reason_code>)", "FAILED (voice): <message>".
- `docs/decision-log.md`: one line per default used (buttons, white ghost) and one for not showing the spec file names.
