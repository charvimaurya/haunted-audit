# Claims audit: Devpost, deck, demo slides and demo script (25 Nov 2026)

Team rule (`.kiro/steering/team-rules.md`): screens, deck and video claim only what the latest real run shows.
Checked against the repo on `main` during the 25 Nov integration. "Supported" means a measured run or a source is
in the repo. Nothing here was re-run unless it says so.

## `docs/devpost.md`

| Claim | Status | Evidence |
|---|---|---|
| WebAIM: 95.9% of top million home pages with detected WCAG failures, about 56 errors per page | **Supported, source added** | webaim.org/projects/million (February 2026 run): "95.9% of home pages had detected WCAG 2 failures", "an average of 56.1 errors per page". Checked 25 Nov. Re-check on submission day (the file already asks for this) |
| Scanner finds 3 of 6 planted barriers | Supported | `bank/PLANTED.md`: barriers 2, 3, 5 have an axe rule; 1, 4, 6 are keyboard or manual checks |
| `GUARD_WORKS 5 of 5` | Supported (24 Nov) | `docs/devlog.md`, `docs/completion/MASTER_TASK_TRACKER.md` |
| Voice agent: haunted page "Could not activate Send Payment…", 5 of 5; fixed page payment confirmed, 5 of 5 | Supported (22 Nov) | `docs/devlog.md` PR #12 line |
| One approval fixes both journeys (keyboard and voice VERIFIED on the patched copy) | Supported (25 Nov) | `test_fail_006_is_fixed_voice_passes_on_the_patched_copy`, 1 passed; evals `fail-006` resolved |
| 0 axe issues on 20 pages, 0 of 20 pages failing a keyboard-only walk | Supported on 22 Nov; UI changed since | `docs/devlog.md` PR #10 to #12 lines. Re-run result for the final `main` is in `docs/pr/item-final-integration-2026-11-25.md` |
| Scripted 10 of 10 correct; 10 early LLM runs never reached the model | Supported | `docs/decision-log.md` (2026-11-20), system design doc |
| Reviewer caught 2.57:1 contrast on PR #5, fixed to 5.37:1 | Supported | `docs/devlog.md` PR #5 line |
| `.kiro/`: 23 specs, 9 steering files, 7 agents, 4 skills, 2 hooks | Supported (recounted 25 Nov) | `ls .kiro/*` |
| CLI ran `qa` and `reviewer` on every PR from #10 on | Partly supported | `docs/devlog.md` PR #10 to #12 say the agents ran from the Kiro CLI. `team-private/plan-status.md` line "kiro-cli is not installed" is older and now wrong (`kiro-cli` is on PATH). "Every PR" was not checked PR by PR |
| Hosting: Docker on Amazon ECS Express Mode, dashboard on Vercel | **Not true today** | Guarded by an `IF: deployed` comment with fallback text. Nothing is deployed: no AWS resources exist; staging stopped at the local amd64 smoke test. Use the fallback unless the deploy happens |
| Kiro Web fixed issue #8 | Unverified | Guarded by `IF: Kiro Web run is done` |

## Deck (`docs/Haunted Audit Deck.pptx`) and demo slides (`docs/Haunted Audit Demo Slides.pptx`)

Binary files from `ab6fdac` (Shilpa). Text was extracted and read; the files were **not edited**.

| Slide | Claim | Status |
|---|---|---|
| Deck 14 | "Today · built and running one API task on Amazon ECS Express Mode; dashboard on Vercel" | **False today.** Must change before submission unless the deploy is done and a live link works |
| Deck 10, demo slides 5 | API "on AWS", "FastAPI in Docker on ECS Express"; badge "LIVE: DEPLOYING" | Not deployed. Say "ready for ECS Express Mode" until it is |
| Deck 13 | "All four Kiro apps, each with a real job" (IDE, CLI, Web, Crew) | Web use is unverified (see Devpost IF line) |
| Deck 7, demo slides 4 | Bring the bug back and it fails: 5 of 5 runs | Supported (`GUARD_WORKS 5 of 5`) |
| Deck 18 | axe-core finds 3 of 6 | Supported |
| Deck 18, demo script | `[x]`, `[X/Y]`, `[live link]` placeholders | Fill only with measured values; never show the brackets |

## Demo script (`docs/Haunted_Audit_Final_Best_Demo.docx`)

Uses placeholders for every measured number and says "only if actually operational" for VERIFIED. No false claim
found. Its checklist already asks to verify 95.9% against WebAIM Million 2026.

## Owner actions

- Deck owner (Shilpa): correct deck slide 14 and the ECS wording on deck slide 10 and demo slide 5, or finish the deploy.
- Re-run the 20-page axe and keyboard walk on the final build before quoting "0 of 20".
