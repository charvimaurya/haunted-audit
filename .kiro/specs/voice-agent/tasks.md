# Voice agent: tasks

- [x] TASK-01 Grammar and its unit tests, plus the Hypothesis test (REQ-VA-01, 10)
- [x] TASK-02 Runner by accessible name, with honest failures and limits (REQ-VA-02, 03, 09)
- [x] TASK-03 Voice checker, the two new result fields and the data contract (REQ-VA-05, 06)
- [x] TASK-04 `POST /voice-runs`, with steps on the same SSE stream (REQ-VA-07)
- [x] TASK-05 5-run eval on the haunted and fixed pages (REQ-VA-04, 10)
- [x] TASK-06 Panel: real run, live steps, offline fallback, axe (REQ-VA-08, 10)
- [x] TASK-07 Top-bar "Voice agent" link to `/app/agents` (the panel from TASK-06). Secondary style, not primary; icon plus text; no new route, no new data. Owner asked for it on 2026 request "voice agent button on the ui".
- [x] TASK-08 Natural phrases (REQ-VA-11): `parse_natural`, runner uses it, tests added
- [x] TASK-09 Possession Mode: Agent toggle (Keyboard / Voice), "Run voice journey", Voice commands card with Push to talk and Edit commands (`AgentToggle`, `VoiceCommandsCard`, `useSpeechInput`). Owner supplied the layout as a screenshot.
- [x] TASK-10 Say it once (REQ-VA-12): `expand_payment`, runner expands, Push to talk runs on speech end, tests added
- [x] TASK-11 Run the whole loop (REQ-VA-13): `AutoLoopCard` and `useAutoLoop` on Possession Mode. Broken run, cause, one Approve click, fixed copy with keyboard and voice. The scripted Exorcist now also labels Amount (4 changed lines), so the voice replay passes on the patched copy (closes fail-006).
- [x] TASK-10 Try page shares the Keyboard / Voice journey with Possession Mode (`PossessionJourney`); the Recipient name field is removed from both pages (owner request).
- [x] TASK-12 Several commands in one breath (REQ-VA-21): `split_chained`, `plan_commands`, runner uses them, 16 tests. Review record `docs/pr/item-voice-chained-commands.md`
