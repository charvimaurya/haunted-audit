# Voice agent: several commands in one breath (REQ-VA-21)

Branch `fix/voice-chained-commands`, made from `origin/main` `46aee67`. Spec: `.kiro/specs/voice-agent/requirements.md`
REQ-VA-21, task TASK-12. Under `.kiro/steering/team-rules.md` this Reviewer record counts instead of a GitHub pull
request; it is also opened as a pull request so the merge is a merge commit.

## Why
On 25 Nov the owner said "Type <name> in recipient type 100.00 and click send payment" in Chrome. Speech recognition
returned it as one sentence, so the voice agent read one `type` command whose field was "recipient type 100.00 and
click send payment". Four runs on the fixed page were BLOCKED (NO_ACTIVATION) with "Could not find a field labelled
recipient type 100.00 and click send payment on the page" (local demo API log, 25 Nov).

## What changed
- `agent/voice_agent/grammar.py`: `split_chained` splits a sentence at command words only when every part is
  understood by `parse_natural` or `expand_payment`; otherwise the sentence is kept as said. Quoted text is never split.
  `type <amount>` with no field means Amount; a name with no field is never guessed. `plan_commands` splits, expands
  payment phrases and drops a command that repeats the one before it. The search tries the most cuts first and stops at
  the first split whose parts are all understood (at most 2^10 choices).
- `agent/voice_agent/runner.py`: uses `plan_commands`. Limits unchanged (10 sentences in, 30 steps out).
- `.kiro/steering/data-contract.md`: each step's `args.command` is the part it ran; `goal` lists the parts.
- `agent/tests/test_voice_agent.py`: 16 new tests (REQ-VA-21 section: 5 splits, 8 kept as said, 1 plan, 2 real bank runs), names are "Test Recipient" only.
- Spec REQ-VA-21 and TASK-12, one devlog line.

The checker still sets every verdict. No dashboard file changed. The haunted page is still BLOCKED.

## QA (Kiro CLI `qa` agent, 25 Nov, this branch). agent_mode: scripted (rules, no model)
| Check | Result |
|---|---|
| `.venv/bin/python -m pytest -q` | 522 collected, 520 passed, 2 skipped, 0 failed |
| `cd dashboard && npm test` | 26 files, 183 passed |
| Chain tests (`-k chain`), 5 repeat runs | 15 of 15 passed in each run: 5 of 5 (gate for a rule step: 5 of 5) |
| New failures for `evals/cases.yaml` | none |

Author's own runs on the same branch: full pytest 522 collected, 514 passed, 8 skipped, 0 failed (skips depend on the
environment); voice tests 88 passed, after the review fix as well.

Real runs through this branch's API (local, 25 Nov):
- Fixed page, `Type "Test Recipient" in recipient type 100.00 and click send payment`: three steps done, checker PASSED
  (run `aa01af10`).
- `test_spoken_chain_completes_on_fixed_page` (PASSED) and `test_spoken_chain_is_still_blocked_on_haunted_page`
  (BLOCKED, NO_ACTIVATION) run the real bundled bank in Chromium.

Not tested: real speech in Chrome by the owner on this branch. Until the owner speaks it, real speech is not verified.

## Reviewer (Kiro CLI `reviewer` agent, read only, 25 Nov, this branch)
**No serious issue open.** Three minor:
1. `runner.py` crash path sets `verdict="BLOCKED"` without the checker. Older code, not changed here; same as the keyboard
   runner. Left as is.
2. `split_chained` tried every cut choice. Fixed: most cuts first, stop at the first fully understood split.
3. `_SEND` regex could backtrack on crafted input, bounded by the 200-character limit. Older code (REQ-VA-12). Left as is.
The first reviewer start failed with "Kiro could not load the available models" (server error); the retry ran.

## Definition of done
- Built in Kiro from a spec: REQ-VA-21, TASK-12.
- Tests pass; the rule step passes 5 of 5. CI: runs on the pull request.
- Reviewer: no serious issue open.
- No secrets or real data: diff searched for AKIA, secret, password, personal names and local paths; nothing found.
- Keyboard: no screen changed.
- evals: no new failure. `fail-006` not touched.
- Logged: one devlog line.
- Claims: `README.md` and `docs/devpost.md` searched; neither claims chained voice commands. Deck and video not checked.
