# Voice agent drives the bank: requirements (plan item 24)

Approved by the owner on 22 Nov 2026. It replaces the empty placeholder in this folder.

## Goal

A spoken or typed command acts on the real Haunted Bank in a browser, by accessible name only. On the haunted page it fails honestly; on the fixed page it completes the payment. The video can show both.

## Requirements

**REQ-VA-01: Grammar.**
- Three commands, matched by deterministic rules and not by a model:
  - `click <name>`
  - `type <text> in <field>`, where `<text>` may be in quotes
  - `go to <name>`
- Matching is case-insensitive and ignores spaces at the ends and a final full stop.
- Anything else is "not understood" and does nothing.

**REQ-VA-02: Accessible names only.**
- The runner finds every control with Playwright `get_by_role` or `get_by_label`. It never uses a CSS selector.
- `click` looks for a button by name.
- `type` looks for a field by its label.
- `go to` looks for a link by name.
- The runner never reads `target_selector` or `success_selector`.

**REQ-VA-03: Honest failure.**
- When no control has the name, the runner checks whether that text is on the page at all. It counts the matches only and never acts on them.
- If the text is there but no control has that role and name, the step fails with "Could not activate `<name>`: no accessible role or name" (click) or "Could not type in `<field>`: no accessible label" (type).
- The step reports the element: tag, visible text and the measured bounding box.
- If the text is not on the page, the message is "Could not find `<name>` on the page".
- The run continues with the next command.

**REQ-VA-04: The haunted and fixed pages.** With the commands
`type "<name>" in Recipient`, `type 50.00 in Amount` (the bank asks for two decimals), `click Send Payment`:
- On the haunted page (`?variant=broken`), the click fails with exactly "Could not activate Send Payment: no accessible role or name".
- On the fixed page, the payment completes and the confirmation (`data-testid="payment-confirmation"`) is visible.

**REQ-VA-05: Verdict by the checker.** After the commands, a checker function, not the runner, sets `verdict`:
- `PASSED` when the confirmation is visible.
- `BLOCKED` otherwise, with `reason_code` `NO_ACTIVATION` and the blocked element.

**REQ-VA-06: Recorded in the result.**
- Every `JourneyResult` records `agent_mode` and two new fields:
  - `agent_kind`: `keyboard` or `voice`.
  - `input_source`: `keyboard`, `typed` or `speech`.
- Voice runs are `scripted`, because no model is used.
- `.kiro/steering/data-contract.md` is updated in the same pull request.

**REQ-VA-07: API and live steps.**
- `POST /voice-runs` with `{variant, commands, input_source}` starts a run.
- Unknown fields are rejected, there are at most 10 commands and each is at most 200 characters, and the same rate limits as `/runs` apply.
- Each command is one `StepEvent` on the same `GET /runs/{id}/events` stream. Its `args` include a plain-English `message`.
- The run is read back with `GET /runs/{id}`.

**REQ-VA-08: The panel.**
- The panel stays as it is: typed commands, and Chrome speech recognition with a typed fallback.
- The source is labelled "voice-command simulation" (typed) or "browser speech recognition (Chrome)" (microphone).
- The panel says that Chrome sends audio to its speech service. Audio is never stored.
- With the API online, a run uses the real runner and shows each step live in plain English.
- With the API offline, the panel falls back to the earlier local simulation, labelled "Example only, not a real run".

**REQ-VA-09: Limits.** Each step times out after 5 seconds and the run after 60 seconds. The browser runs only on the bundled bank (the same route guard as the keyboard runner).

**REQ-VA-10: Tests.**
- Grammar unit tests.
- A Hypothesis test that unrecognised text never leads to an action.
- 5 runs each on the haunted and fixed pages, each at least 4 of 5 correct.
- Axe on the panel.
- No existing test is loosened.

**REQ-VA-11: Natural phrases (owner asked for it).**
- A fixed list of phrases is rewritten into one of the three commands in REQ-VA-01. Rules decide, never a model. `agent/voice_agent/grammar.py`, `parse_natural`.
- A leading "please", "can you", "could you" or "I want to" is ignored. "the", "a", "an" and "my" before a name are ignored, and so is a trailing "button", "link", "field" or "box".
- `click`: also `press`, `tap`, `hit`, `push`, `select`, `choose`, `activate`, `submit`, `click on`. The phrases `send payment`, `make a payment`, `pay` and `pay now` click the control named "Send Payment".
- `go to`: also `open`, `visit`, `navigate to`, `take me to`, `show me`.
- `type`: also `enter <text> in <field>`, `write`, `put`, `fill in`, and `set <field> to <text>`. Two-word text still needs quotes.
- Not covered, still "not understood": amounts in words ("a hundred dollars"), one phrase that does several steps, and anything off the list.
- `parse` (REQ-VA-01) is unchanged. The runner calls `parse_natural`, which tries `parse` first. The Hypothesis test for non-commands now also skips the new leading verbs, because those are commands now. No assertion was loosened.

**REQ-VA-12: Say it once (owner asked for it).**
- `expand_payment` in `agent/voice_agent/grammar.py` turns one send-money phrase into ordinary commands. A fixed pattern decides, never a model. The runner expands before it runs, so the checker and the data contract do not change.
- "send money to Sam Lee, 100 dollars", "send $100 to Sam Lee" and "pay 50.5 euros to Ann" become: type the name in Recipient, type the amount with two decimals in Amount, click Send Payment.
- "send money to Sam" with no amount only types the recipient. It never clicks Send Payment.
- Whole amounts in words are read as digits: "hundred", "a hundred", "one hundred and fifty", "twenty-five", "two thousand". Cents in words are not.
- A zero or malformed amount, or no recipient, is left as it was said, so it is "not understood".
- Push to talk runs the voice journey as soon as the speech ends. What was heard replaces the command list. The currency word is ignored; the bank page is in EUR.
- The broken page still cannot be finished by Tab. That barrier is planted and the checker depends on it.

**REQ-VA-13: Run the whole loop (owner asked for it).**
- One button on Possession Mode runs the broken page, shows the checker's verdict and the Exorcist's one-line cause, then waits for a person to approve the diff. After approval it runs the keyboard and voice replays on the patched copy and shows the checker's verdicts. Approve changes no tracked file.
- The scripted Exorcist fixes both planted barriers: Send Payment becomes a button and the Amount caption becomes a label (4 changed lines, limit 10).
