# Actual requirements from the plan (read 24 Nov 2026)

Source: `Sukhdha plan v5.3 status.docx`, item tables, step-by-step section, Appendix A and Appendix B. This replaces the assumptions in the first tracker draft. "Done when" lines are the plan's own wording.

## Items 35 to 41 (UI v9). Reference: `design/v9/`, open `index.html`

| # | Already built (plan says) | Left (plan says) | Done when |
|---|---|---|---|
| 35 | One Settings menu (9b3ba6c) | v9 frame and card style, sidebar icons, self-hosted Creepster font, `ui-fidelity.md` allows the Home image | `npm run build` makes no outside request; top bar shows only the nav, the Kiro pill and the gear; tests pass |
| 36 | Red and green roaming ghosts (b5daec1) | v7 picture background filling the hero, live title and chips on top, Pause animation button | Matches `01-home.html` at 1366 px; Pause works by keyboard; ghosts never cover text; hidden in Calm mode and with reduced motion |
| 37 | Keyboard/Voice switch, voice commands card, tester types recipient (9b3ba6c, ea3581f) | Move switch into the Possession panel as in `03-possession-voice.html`; remove the extra Voice agent button from the top bar; v9 style | A real keyboard run and a real voice run each fill in steps live; ghost beside Send Payment, never on it |
| 38 | nothing | Three cards from real results, live timeline, Critical Ghost card with the button picture, voice card shows results only | No run: every card says Not run yet; after a broken run the rows match the page |
| 39 | Fix, Verify, Regression side by side (b5daec1) | Voice rows in Verify and Regression (needs items 2 and 3), v9 card style | Whole loop by keyboard; voice rows only from real Verifier and regression results |
| 40 | Recorded Kiro hook panel, Results and Outcome read the loop (b5daec1) | v9 layout: folder tree, tiles and parchment in one row | No `[x]`, `[n]` or `/ 6` anywhere; numbers from item 27 or `--` |
| 41 (Charvi) | nothing | axe in 3 modes, keyboard walk, 200% zoom, phone width, laptop fit, screenshots | Zero axe findings in normal, Calm, high contrast; every screen fits 1366 x 768 at 100% |

Note: the prompt text mentions `ui-fidelity.md` should be updated by item 35. The plan wording is "allows the Home image". Some of the v9 work is already in the owner's uncommitted files (19 modified, 4 untracked); not touched here.

## Item 9 and Appendix A (deploy). Owner: Charvi (AWS access)

Needs: AWS IAM sign-in with MFA and an access key, `aws configure --profile haunted-audit` (us-east-1), Docker Desktop, a Vercel project name. Steps: build and smoke-test the container (`bash scripts/smoke_container.sh`), push to ECR (`haunted-audit-api`), create three IAM roles from `iam/*.json` (execution, infrastructure, task), create the ECS Express service (`aws ecs create-express-gateway-service`; four flags to verify with `help` first), put the dashboard on Vercel (root `dashboard`, `VITE_API_URL`), delete `.github/workflows/pages.yml`, live check on a laptop and phone, redeploy, costs and teardown (budget $150, keep live until 29 Jan 2027).
What can be prepared without AWS: `docs/deploy.md` from these steps (marked "not yet run"), review of `iam/` and `Dockerfile`. This machine has no `docker`. Nothing was run or invented.

## Item 22 and Appendix B (judge README)

Four options: live link, Codespaces, own laptop with Kiro (one pasteable setup prompt), manual terminal. Placeholders `[live link]` and `[video link]` must stay placeholders until real URLs exist. Item 23 (Codespaces) needs `.devcontainer/devcontainer.json` (Python 3.11, Node 22, `postCreateCommand`: pip install, `playwright install --with-deps chromium`, `npm ci` in dashboard; ports 5173 and 8000) and `.app.github.dev` in Vite `server.allowedHosts`. Test needs a real fresh Codespace.

## Item 6 (U3, U5 are what is left)

- U3: read the planted-barrier total from `bank/PLANTED.md`, not the fixed "/ 6".
- U5: after a run, replay steps from the run record: tick checklist items as they happen, show typed text in Recipient and Amount, draw a visible focus outline moving through `focus_trail` order; readable with reduced motion. Check at desktop and 390 px.
- Plan suggests branch `fix/ui-review`, Vibe mode per row, a `ui-review` spec when a row exceeds 15 minutes.

## Item 16 (AI disclosure)

README section "Built for Kiroween 2026": first commit 6 Nov 2026 and everything built in Kiro after. List anything made before 30 Oct or outside Kiro, **with its date**, and "ask Sukhda about `.kiro/scripts/axe-on-save.mjs` (set up on her Mac) and the starter kit and its date. Never guess a date". Add: "Code was written in Kiro, with Claude AI helping on some tasks; the devlog says which." Cursor must be disclosed too (six commits with a Cursor co-author, listed in the devlog). Send the list to Shilpa. **Blocked on two facts only the owner has** (the dates).

## Item 31 (Reference field)

Add a labelled Reference field after Amount on both variants; scripted walker types "Electricity bill"; checklist gains "Tab to Reference"; broken variant still BLOCKED only by the Send Payment div; update tests, rerun 5-run check (broken 5 of 5, fixed 5 of 5), update `docs/evidence.md` step counts, `PLANTED.md` if needed, and re-export `docs/evidence-seed.json`. Plan suggests branch `feature/reference-field`.
**Conflict to resolve with the owner:** the plan's default journey uses Recipient "Alex Carter". Commits ea3581f and 1568826 deliberately removed a person's name, and the data contract says `recipient` is omitted by default. I will keep the recipient as is and only add the Reference field.

## Every item (plan "Before every item")

Pull first, branch per item, tests before commit, `gh pr create --fill`, run `kiro-cli --agent qa` then `--agent reviewer`, save one screenshot per item in `docs/kiro-writeup/<item>/`, one devlog line naming the Kiro feature, a friction-log row if Kiro got in the way (`docs/friction-log.md` does not exist on main, checked).
