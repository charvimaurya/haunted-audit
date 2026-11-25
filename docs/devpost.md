<!--
FINAL Devpost story for Haunted Audit (Kiroween 2026, Costume Contest).
Paste everything below this comment into Devpost's "About the project" box.

BEFORE YOU PUBLISH (this comment does not show on Devpost; delete it anyway):
1. Every [bracket] is a number or link that only exists once it is measured or live.
   Fill it from a real run, or delete the whole sentence. Never publish a bracket.
2. Lines followed by an "IF:" comment depend on work due by 27-29 Nov. If that work
   is not done, delete the line, not just the marker.
3. Re-check the WebAIM figures on webaim.org/projects/million on submission day.
4. Preview on Devpost and check the $$ maths renders.
-->

> *"Can every customer finish?"*
> Scanners count errors. Haunted Audit lives the journey, proves the fix, and catches the ghost when it comes back.

**An AI agent tries to pay using only a keyboard or only voice commands, gets stuck, and we prove the fix.**

## Inspiration

Meet Emma (a persona, not a real customer). She can't use a mouse: some days she uses only a keyboard, other days she uses voice control. She opens her bank to pay a €50 electricity bill, types the recipient and the amount, and presses Tab to reach **Send Payment**.

Focus jumps straight past it. She tries her voice instead and says "click Send Payment". Nothing happens. The button looks perfect. It just isn't a button, and it has no name a voice command can find. Emma can't pay.

Emma is not rare. In 2026, WebAIM tested the top one million home pages and found detectable WCAG failures on **95.9%** of them, about **56 errors** per page. (Source: [WebAIM Million, February 2026](https://webaim.org/projects/million/): "95.9% of home pages had detected WCAG 2 failures", "an average of 56.1 errors per page"; checked 25 Nov 2026.) And AI now writes more and more of the code that ships those pages, faster than anyone can test by hand.

So we built a test bank and planted **six** real barriers in it. Then we ran an industry-standard scanner (axe-core) on it. It found three:

$$\frac{\text{barriers found by the scanner}}{\text{barriers planted}} = \frac{3}{6}$$

The one that actually stops Emma paying, a `div` pretending to be a button, was **invisible** to it. That was our "aha". Scanners answer *"how many rules failed?"* Nobody was answering *"can a person actually finish?"*

Halloween gave us the language. A barrier is a **ghost**: you can't see it, but it stops you. An approved fix is an **exorcism**. And a bug that sneaks back in a later release is a **returning ghost**. Most tools forget about that last one. We built a whole product around catching it.

## What it does

Haunted Audit is an **accessibility guardrail for AI-built apps**. It runs one loop: **feel → fix → prove → prevent → watch.**

1. **Feel the barrier.** A keyboard agent (Tab, Enter, type, read focus, never click) and a voice agent (acts only by a control's visible name, like a voice-control user) try to send €50 on our synthetic Haunted Bank. A **rule-based checker, not the AI**, decides **PASSED** or **BLOCKED**, with a reason such as `TARGET_NOT_FOCUSABLE`.
2. **Possess yourself.** Switch on **Possession Mode**: your mouse is locked out, a focus trail shows where the keyboard really goes, and a ghost appears *beside* the control that blocks you, never on top of it. Empathy first, then the fix.
3. **Exorcise.** The Exorcist explains the cause in plain English and proposes the smallest fix. **Nothing changes until a person presses Approve.** Approving plays a short exorcism; Calm mode shows the same result with zero motion.
4. **Prove it.** The Verifier applies the approved fix to a *copy* and replays **both** journeys, keyboard and voice, each with its own run ID. BLOCKED becomes VERIFIED, on screen, side by side.
5. **Prevent the return.** Every verified fix becomes a Playwright journey test. Put the bug back and the test fails at once; restore the fix and it passes.
6. **Watch every night.** **Night Watch**, our Kiro Crew app, re-runs the journey and reports a returning ghost in plain English. Its 02:00 job runs in Crew; on Windows the check itself still runs by hand or from Kiro IDE (see Challenges).

The returning-ghost guard, five runs in a row, straight from our terminal:

```text
Run 5 of 5
  fix applied   PASS
  fix removed   FAIL   Error: Send Payment is not keyboard focusable: 30 presses of Tab never reached it
  fix restored  PASS
  GUARD_WORKS

GUARD_WORKS 5 of 5
```

**Try it:** [live link] · No login. Payments are fake; the bank is ours.

## How we built it

**In one line:** developers, the dashboard and Night Watch all send work through one safe API. Agents try the real journey, a human approves every fix, and fixed rules plus saved tests prove the result.

### Two layers of agents, kept apart on purpose

| Layer | Agents | Job |
|---|---|---|
| **Build time (Kiro)** | Planner, Architect, Developer, QA, Reviewer, Deployer, Monitor | Build Haunted Audit itself, with human approval gates |
| **Run time (Haunted Audit)** | Keyboard user, Voice user, Exorcist, Verifier, Night Watch reporter | Find, fix, prove and guard the customer journey |

### Rules where rules work, AI where judgement helps

The verdict, the severity and the regression check are **rules**: the same answer every time. AI does only what needs judgement: moving through a page like a person, explaining a cause, proposing a fix. The AI never grades itself.

Reliability rule for anything AI does: it counts only if it passes at least 4 of 5 repeat runs.

$$\text{pass rate} = \frac{\text{correct runs}}{5} \geq 0.8$$

Every number we show carries the mode that produced it, `scripted` or `llm`. If something was not measured, the screen says `--`. We wrote a guard test that fails the build if any page shows a made-up result.

### Stack

| Layer | Tech |
|---|---|
| Agents | Python, Playwright, nine keyboard-only tools; scripted mode, or Strands Agents with Claude on Amazon Bedrock |
| Verdict | Deterministic rule checker |
| API | FastAPI, live steps over Server-Sent Events, SQLite evidence log, rate limits, an AI cost cap, a private-address URL guard |
| Hosting | Docker on **Amazon ECS Express Mode**, dashboard (React, Vite, Tailwind) on Vercel <!-- IF: deployed (item 9). If not live: "Docker, ready for Amazon ECS Express Mode; dashboard built with React, Vite, Tailwind" --> |
| Proof | pytest and Hypothesis, Vitest with axe, Playwright journey tests in GitHub Actions |

## How we used Kiro

Everything lives in `.kiro/` at the repo root: **23 specs, 9 steering files, 7 custom agents, 4 skills, 2 hooks, an MCP server and a Kiro Power.** <!-- Recount these from .kiro/ on submission day --> Here is what each one actually changed.

### Four Kiro apps, four different jobs

| Kiro app | What it did for us | How it felt different |
|---|---|---|
| **IDE** | Specs, custom agents, steering, hooks, our Power. Where the product was built. | The home base: plan, build and review in one place |
| **CLI** | Ran the `qa` and `reviewer` agents on every pull request from PR #10 on | Repeatable. Same command, same checks, no clicking |
| **Web** | Fixed a tester-reported accessibility bug (issue #8: pipeline steps ignored arrow keys and every step was a Tab stop) on its own branch and opened a pull request <!-- IF: Kiro Web run is done --> | Hands-off. We gave it the issue; it came back with a PR. A human still reviewed and merged it ([PR #n]) |
| **Crew** | Night Watch, a nightly app with its own agent, skill, MCP server and cron job ([repo](https://github.com/charvimaurya/haunted-audit-crew)) | Its job runs while we sleep. Getting its agent to reach its own tool on Windows is still open |

### Custom agents that keep each other honest

- **QA** (`claude-sonnet-4.6`) may write to **one file only**, `evals/cases.yaml`. It can record a failure but can never "fix" a test to raise a score.
- **Reviewer** (`claude-opus-4.6`) is **read-only** and runs on a **different model** from the Developer, so every change gets a genuine second opinion. It loads our accessibility skills and ends every review with *"No serious issue open"* or a list.
- On PR #5, the Reviewer caught that our *own* Send Payment button had 2.57:1 contrast. axe skips gradients, so no scanner would have seen it. We fixed it to 5.37:1 before merging.

### Spec-driven, not vibe-driven

Every feature started as a spec: requirements, then design, then numbered tasks. When our dashboard's bank panel couldn't take a payment by any route, a bug-fix spec made us **diagnose before touching a line**: the panel was a picture of a bank, not the test page. We used vibe mode for small, safe edits; for anything that touched the verdict, specs saved us from ourselves.

### Steering: write the rules down once

Nine steering files hold the rules Kiro follows every time: the stack, our accessibility rules (16px text, 3px focus ring, keyboard only), a **data contract** for every result, and *"never show a number we did not measure"*. That last rule removed **13 made-up results** from our own dashboard.

### Hooks that guard as code is written

On save, a hook scans the file for form fields with no label. It's a plain shell command with no model call: **[n] seconds** from save to finding in Kiro. On the bank page it reports exactly one thing, the unlabelled Amount field. <!-- IF: hook timing measured -->

### MCP and a Kiro Power

Our MCP server gives Kiro chat a `scan_page` tool. It reads only files in the workspace, refuses web URLs, and never changes code. We packed it with our skills into a **Kiro Power** that anyone can install from a folder, and tested a clean install from scratch.

### Property-based testing

Hypothesis checks properties, not examples. In Night Watch it checks hundreds of random combinations of run status and verdict, including odd values, and confirms that a blocked fixed page is a returning ghost and a crashed run is "could not check", **never** a fake pass or fake failure. It also checks that every report survives a save-and-reload unchanged.

### Skills

Four skills: `wcag-ghost-mapper` (explain a finding in WCAG terms), `accessible-ui-review`, `exorcise-fix` and `journey-test-writer`. A fresh Kiro sub-agent, asked only to "review this UI", picked `accessible-ui-review` on its own and found **four serious issues** in our own Run button. We fixed all four.

## Challenges we ran into

- **The scanner couldn't see the barrier that mattered most.** Three of our six planted barriers are invisible to axe, including the one that stops the payment. That proved the idea, and it meant we had to build real keyboard and voice journeys, not just another scanner.
- **Measuring the AI honestly.** For most of the build we had no Bedrock access, so all 10 early AI runs never reached the model. Instead of showing a guess, we logged it, demoed the scripted agent (10 of 10 correct), and kept AI accuracy at "not measured" until we could run it: **[x] of 5** on the haunted page and **[y] of 5** on the fixed one. <!-- IF: LLM eval run -->
- **A demo bank that couldn't take a payment.** Our first dashboard showed a drawing of a bank. A Kiro spec walked us through finding that before we changed anything.
- **Our own UI had ghosts.** Faint text at 2.76:1, a 2px focus ring, an emoji mascot whose colour never showed its state. A spooky interface is easy; a spooky interface that passes its own audit is not. Today axe finds **0 issues on all 20 pages** in normal, Calm and high-contrast modes.
- **Kiro Crew is new.** Night Watch installs, is trusted and runs its nightly job, but on Windows Crew's agent could not reach the app's MCP server (`mcp_gateway=off`). We asked in the Kiro Discord, kept the honest limitation in our README, and made the agent say "could not check" instead of guessing.
- **Building in layers instead of slices.** We rebuilt the dashboard three times while the end-to-end loop waited. We changed course: thinnest working loop first, merge small and often.

## Accomplishments that we're proud of

- **The returning ghost is caught, every time:** `GUARD_WORKS 5 of 5`, and Night Watch caught one on 24 Nov when we put the bug back on purpose (a manual run; evidence in its repo).
- **The voice agent sees what a voice user sees.** On the haunted page: *"Could not activate Send Payment: no accessible role or name"*, 5 of 5. On the fixed page: payment confirmed, 5 of 5.
- **One approval fixes both journeys.** A single human-approved fix turns keyboard *and* voice from BLOCKED to VERIFIED on the patched copy.
- **The AI never grades itself.** Rules decide every verdict; a person approves every change; every fix is proven on a copy first.
- **We ate our own cooking.** Haunted Audit's own UI: 0 axe issues on 20 pages, 0 of 20 pages failing a keyboard-only walk, and a Calm mode with zero animation.
- **Benchmark:** [n] labelled cases, including clean pages that should find nothing: precision [x], recall [y]. <!-- IF: benchmark done -->

$$\text{Precision} = \frac{TP}{TP + FP} \qquad \text{Recall} = \frac{TP}{TP + FN}$$

## What we learned

- **"Can a person finish?" is a different question from "how many errors?"** Half of our planted barriers were invisible to an automated scan.
- **Keep AI out of the verdict.** Splitting the agent (which may vary) from the checker (which never does) made every result repeatable and trustworthy.
- **Honest beats impressive.** "Scripted, 10 of 10" is worth more than an AI number we can't back up. Our UI shows `--` rather than a guess.
- **Specs, steering and agents turn Kiro into a team, not a chatbot.** A read-only Reviewer on a different model caught things the builder never would.
- **Nothing is done until a returning ghost would be caught.** A fix tested once is a promise. A fix that becomes a test is proof.

## What's next for Haunted Audit

- A **screen-reader agent** alongside keyboard and voice.
- Fixes delivered as reviewed pull requests, with journey checks on **every** pull request.
- Sessions with assistive-technology users, reported only with their consent.
- Two to three pilots with banks, fintechs or agencies in Q1 2027, on journeys like onboarding, applications and checkout.

## Trust and limits

- **Agents act only on our own synthetic Haunted Bank.** No real accounts, money or customer data.
- Every fix needs **human approval** and a passing replay. We never claim WCAG compliance or certification.
- The live site runs scripted mode by default, with rate limits and an AI cost cap, so no visitor can run up a bill.
- **AI disclosure:** built in Kiro. Claude helped on some coding tasks through Kiro, and six early dashboard commits were prototyped in Cursor, then reviewed and reworked in Kiro. Our devlog lists them by commit.

---

*Built for Kiroween 2026 by Shilpa, Sukhda and Charvi, between 8 November and 4 December 2026.* <!-- Check the start date against the devlog: the team plan says building started 4 Nov -->

**Our question stays the same: can every customer finish? Now we can prove it, and keep proving it every night.** 👻

<!--
KIRO CREW FIELD (separate Devpost field, not part of the story above). Paste into the Kiro Crew app field:

Repo: https://github.com/charvimaurya/haunted-audit-crew

Night Watch is a Kiro Crew app that guards Haunted Audit after the demo ends. Every night it re-runs the Send Payment journey in scripted mode: the broken page must be blocked and the fixed page must pass. If a fixed page breaks again, it reports a "returning ghost" in plain English and names the reason, for example "the pay button could not be reached with the keyboard".

What it contains: a nightly cron job, a report agent, a reporting skill, and an MCP server (FastMCP) with one tool, run_night_watch. It was planned in a Kiro spec (requirements, design, tasks), built task by task with a test-on-save hook, and has 94 tests, including two Hypothesis property tests.

Proof in the repo: we brought a fixed bug back on purpose, Night Watch caught it (returning_ghost, TARGET_NOT_FOCUSABLE), and after restoring the fix it reported all as expected. Kiro IDE chat calls the same MCP tool successfully.

Honest limitation: on Kiro Crew 0.13.1 for Windows, the app installs, is trusted and its nightly job runs, but Crew's agent could not reach the app's MCP server (gateway log: mcp_gateway=off). The agent reports "could not check" rather than guessing. We have asked the Kiro community and documented it in the README.
-->
