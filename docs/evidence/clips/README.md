# Demo clips (recorded 22 Nov 2026)

Recorded by `scripts/record_clips.py` in Chrome at 1280 × 800, against the local dashboard and API. Every run shown is real. Nothing is staged or edited.

| File | What it shows |
|---|---|
| `voice-haunted.webm` | Agents page, haunted bank. The voice agent types the recipient. Then "Could not type in Amount: no accessible label" and "Could not activate Send Payment: no accessible role or name". Checker: BLOCKED (NO_ACTIVATION). |
| `voice-fixed.webm` | Same commands on the fixed bank: all three steps done, then "Checker: PASSED". |
| `fix-loop-keyboard.webm` | Keyboard only (focus and Enter). A keyboard run (BLOCKED), then Fixes: propose a fix (scripted Exorcist), approve, verify on a patched copy ("Journey Verified", checker PASSED), then put the bug back ("caught", checker BLOCKED) and "The ghost is back. But this time, we caught it." |
| `high-contrast-possession.png` | Possession Mode with High contrast on. |

These were recorded by a browser script, not a screen recorder, so they have no voice-over or mouse pointer.
