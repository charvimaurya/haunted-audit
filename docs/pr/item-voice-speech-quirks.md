# Voice agent: what Chrome writes down (REQ-VA-22)

Branch `fix/voice-speech-quirks`, made from `origin/main` `a12489a`. Spec: `.kiro/specs/voice-agent/requirements.md`
REQ-VA-22, task TASK-13. Under `.kiro/steering/team-rules.md` this Reviewer record counts instead of a pull request;
it is also opened as a pull request so the merge is a merge commit.

## Real speech runs (owner, Chrome, local demo API on port 8030, 26 Nov 2026)
Names said are replaced with `<name>`; no personal name is committed. Each verdict is the checker's.
| Run | Page | What Chrome wrote | Result | Cause |
|---|---|---|---|---|
| `77398b82` | broken | "Send money to `<name>` 100.00" | BLOCKED (NO_ACTIVATION): Recipient done, Amount "no accessible label", Send Payment "no accessible role or name" | Expected: the planted barriers. The sentence was understood |
| `cb76c46e` | broken | "Type `<name>` in recipient type hundred in amount ... click send payment" | BLOCKED | Planted barriers; also "hundred" would have been typed as a word |
| `ff9453c2` | broken | "Type `<name>` in recipient type 100.00 in amountAnd" | BLOCKED | "amount" and "and" written as one word; speech stopped before "click send payment" |
| `74786908` | fixed | "Type `<name>`recipient type 100.00 in amount and click send payment" (the "in" was heard as part of the name) | BLOCKED, not understood | No "in" before the field name |
Real speech on the fixed page has not yet given PASSED. This branch fixes the three causes the grammar can fix.

## What changed
- `agent/voice_agent/grammar.py`:
  - a value typed into Amount is read as an amount (number words, `$`, `€`, "dollars", "euros") and written with two
    decimals; a value that is not an amount is typed as said;
  - `type <value> <field>` with no "in", and a value of several words before a field name, are made readable, only
    when the last word is Recipient, Amount or Reference; "type in recipient" (no value) is not guessed;
  - a field name joined to "and" is split back;
  - `parse` (REQ-VA-01) and REQ-VA-21 behaviour are unchanged.
- `dashboard/src/components/VoiceCommandsCard.tsx`: both hints say "send 100 dollars to" and then a made-up name,
  instead of a person's name (REQ-TD-09).
- `agent/tests/test_voice_agent.py`: 19 new tests, names are "Test Recipient" only. Spec REQ-VA-22, TASK-13, devlog.

## QA (Kiro CLI `qa` agent, this branch). agent_mode: scripted (rules, no model)
| Check | Result |
|---|---|
| `.venv/bin/python -m pytest -q` | 539 collected, 537 passed, 2 skipped, 0 failed |
| `cd dashboard && npm test` | 26 files, 183 passed |
| REQ-VA-22 and REQ-VA-21 rule tests, 5 repeat runs | 25 of 25 in each run: 5 of 5 |
| New failures for `evals/cases.yaml` | none |
After the review fixes (author's run): voice tests 107 passed.
Keyboard walk on this branch's build (`scripts/keyboard_walk.py`): 0 of 20 pages failing; Possession Mode 45 stops, focus
visible on every stop.

## Reviewer (Kiro CLI `reviewer` agent, read only, this branch)
**No serious issue open.** Three minor:
1. "type in recipient" would type the word "in". Fixed: no value said means nothing is guessed; test added.
2. `_FIX_TYPE` can take about n² steps on a 200-character sentence with no field name. Bounded; left as is.
3. No test for Reference without "in". Fixed: test added.

## Definition of done
- Built in Kiro from a spec: REQ-VA-22, TASK-13.
- Tests pass; the rule step passes 5 of 5. CI: runs on the pull request.
- Reviewer: no serious issue open.
- No secrets or real data: run evidence uses `<name>`; diff searched for AKIA, secret, password, names, local paths.
- Keyboard: Possession Mode walked, 0 failures.
- evals: no new failure. `fail-006` not touched.
- Logged: one devlog line.
- Claims: `README.md` and `docs/devpost.md` do not claim these speech rules. Deck and video not checked.
- Real speech: run evidence above; PASSED by real speech on the fixed page is still to come.
