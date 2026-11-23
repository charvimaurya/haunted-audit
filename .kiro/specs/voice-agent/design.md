# Voice agent: design

## Files

| File | What |
|---|---|
| `agent/voice_agent/grammar.py` | `parse(text) -> Command | None`. Pure, no browser |
| `agent/voice_agent/runner.py` | `VoiceSession(page)` runs one `Command` with `get_by_role` / `get_by_label`; `run_voice_journey(config, commands, input_source, on_event, run_id)` |
| `agent/keyboard_agent/checker.py` | adds `check_voice_journey(page, config)`: the confirmation is visible, so PASSED; otherwise BLOCKED / `NO_ACTIVATION` with the target's measured box |
| `agent/keyboard_agent/models.py` | `JourneyResult.agent_kind`, `JourneyResult.input_source` (additive, with defaults `keyboard`) |
| `agent/api/main.py` | `POST /voice-runs`, which reuses `RunStore`, the limiter and the SSE stream |
| `agent/eval/run_voice_eval.py` | 5 runs on each page, with the GO / NO-GO table |
| `dashboard/src/components/VoiceAgentPanel.tsx` | real run through the API, with live steps; offline fallback to the labelled simulation |

## Step event for a voice command

```json
{"step": 3, "tool": "voice_click", "args": {"command": "click Send Payment", "name": "Send Payment",
  "outcome": "failed", "message": "Could not activate Send Payment: no accessible role or name",
  "element": {"tag": "div", "text": "Send Payment", "bounding_box": {"x": 0, "y": 0, "width": 0, "height": 0}}},
 "focused_before": null, "focused_after": null, "timestamp": "...", "screenshot_path": null}
```

`outcome` is `done`, `failed` or `not_understood`. The tools are `voice_click`, `voice_type`, `voice_go_to` and `voice_not_understood`.

## Why the text check is allowed

Acting is by role and name only. `get_by_text(name).count()` only tells "nothing has that name" apart from "something says it but has no role or name". Nothing is ever clicked or typed through it.

## agent_mode

`scripted`: the grammar is rules, not a model. An optional model mapping is out of scope until AWS credentials exist.
