# "Alex Carter" audit (user-typed-test-details TASK-01)
Search: `git grep -n -I "Alex Carter"` plus a visual check of every tracked image (OCR is not available), on 24 Nov 2026, branch `feature/user-typed-test-details`.
**Visible** means a person can see it on a screen: the app, the bank page, a design page in a browser, the README or docs on GitHub, or seed data replayed on screen. **Internal** means it is only test input, an eval or CLI default, or the one internal constant.

## Visible: removed or redacted
| File | Hits | What it was | Action |
|---|---|---|---|
| `design/v9/preview.png` | image | Unused v9 drawing (referenced nowhere); shows the name in Possession panels 2 and 3 | Deleted |
| `design/v9/*.html` (8 files) | 3 each | Design mock script fills the Recipient field and the example commands | Replaced with "Test recipient" |
| `README.md` | 1 | Intro sentence "send EUR 50 to Alex Carter" | Reworded: the tester types made-up details |
| `docs/bug-payment.md` | 1 | Quoted confirmation text in the diagnostic table | Redacted as "[test name removed]", with a note |
| `docs/bug-payment/matrix-output.json` | 10 | Recorded diagnostic output | Redacted as "[test name removed]". It cannot be re-run honestly because the page has been fixed since |
| `docs/bug-payment/matrix.py`, `docs/bug-payment/dashboard.py` | 4, 2 | Diagnostic scripts that type the name | Now type "Test recipient" |
| `docs/evidence-seed.json` | 6 | Recorded fallback runs, replayed on screen when the API has no live run | Re-exported from runs with values the owner types (TASK-06) |
| `.kiro/specs/haunted-audit-frontend/requirements.md` | 1 | "pre-filled Alex Carter" | Replaced: fields start empty |
| `.kiro/specs/pixel-faithful-ui-v7/requirements.md`, `tasks.md` | 2, 1 | D2 question about the prefilled name | Replaced with "the example name", decision recorded |
| `.kiro/specs/voice-agent/requirements.md` | 1 | Example command | Replaced with `type "<name>" in Recipient` |
| `.kiro/skills/journey-test-writer/SKILL.md`, `power/skills/journey-test-writer/SKILL.md` | 1, 1 | Example test code shown to readers | Replaced with "Test recipient" |
| `dashboard/src/test/voice-runner.test.tsx` | 4 | Test input inside `dashboard/src`, which the new name scan covers | Replaced with "Test recipient" |

## Visible: kept, needs the owner
| File | Why kept |
|---|---|
| `design/Haunted_Audit_Final_UI_v7.png` and its crop `docs/ui-fidelity/v7/B-possession.png` | The frozen, panel-approved source of truth (`ui-fidelity.md`). Editing an approved design image would misstate what was approved. The app never copies the name from it. |

## Internal: kept
| File | Hits | Why |
|---|---|---|
| `agent/keyboard_agent/models.py` | 1 | `INTERNAL_DEFAULT_DETAILS`, the one internal default for direct API callers (REQ-TD-06) |
| `agent/eval/run_voice_eval.py` | 1 | Eval commands. Not shown on a screen |
| `agent/tests/*.py` (test_api, test_bank_barriers, test_bank_page, test_checker, test_runner, test_tools, test_voice_agent) | 34 | Test input typed by the tests themselves |

`agent/keyboard_agent/runner.py` had a second copy of the default. It now reads the constant.

Not found: the bank page (`fixtures/haunted_bank/index.html`) had no prefilled value. `docs/evidence/clips/*.webm` were re-recorded with "Test recipient" on 22 Nov. The `docs/ui-fidelity/before` and `after` screenshots show empty fields.
