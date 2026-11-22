<!--
Devpost "About the project" story for Haunted Audit (Kiroween 2026).
Before you paste it into Devpost:
1. Replace every [bracket] with a measured number from docs/eval.md, or delete that sentence.
2. Delete any feature sentence that is not working in the submitted build.
3. Check the WebAIM figures on webaim.org/projects/million on the day you submit.
This comment block does not show on Devpost; delete it anyway when you paste.
-->

## Inspiration

Meet Emma (a persona, not a real customer). She uses only a keyboard. She opens her bank to pay a €50 electricity bill, fills in the recipient and the amount, and presses Tab to reach **Send Payment**. Focus jumps straight past it. The button looks fine. It just isn't a button. Emma can't pay.

Emma is not rare. In 2026, WebAIM tested the top one million home pages and found detectable WCAG failures on **95.9%** of them, with about **56 errors** on the average page, up from 94.8% the year before. And the scanners that produce those numbers answer the wrong question. They list rule IDs. They don't tell you whether a person can actually finish the task.

At the same time, more and more code is written by AI. That made us ask: *what if the guardrail lived where AI writes the code, and tested the journey, not just the markup?*

Halloween gave us the twist. A barrier is a ghost. An approved fix is an exorcism. And a bug that comes back is a ghost returning, so we built something that catches it.

## What it does

Haunted Audit is an accessibility guardrail for AI-built apps:

1. **Feel the barrier.** A keyboard agent (and a voice-command simulation that acts only by a control's visible name) tries to send €50 on our synthetic Haunted Bank. A **rule-based checker**, not the AI, decides **PASSED** or **BLOCKED**, with a reason code such as `TARGET_NOT_FOCUSABLE`.
2. **Fix the cause.** The Exorcist explains why it failed and proposes the smallest fix. **Nothing changes until a person presses Approve.**
3. **Prove the journey.** The Verifier applies the approved fix to a copy and replays both journeys. BLOCKED becomes VERIFIED, each with its own run ID.
4. **Catch the returning ghost.** Every verified fix becomes a Playwright journey test. Put the bug back and the test fails at once.
5. **Guard where code is written.** A Kiro hook scans on save, our Kiro Power runs the journey from Kiro chat, and Night Watch (a Kiro Crew app) re-walks the journey every night.

Possession Mode lets you feel it yourself: the mouse is locked out, a focus trail shows where the keyboard goes, and a ghost appears beside the control that blocks you, never on top of it.

## How we built it

Everything started as a **Kiro spec**: requirements, then design, then tasks, run one by one.

- **Steering files** hold the rules Kiro follows every time: our tech stack, accessibility rules for our own UI, and a data contract.
- **Seven custom agents** split the work like a team: Planner, Architect, Developer, QA, Reviewer, Deployer and Monitor. QA may only write to `evals/cases.yaml`, never to the code, so it can't "fix" a test to improve a score. The Reviewer is read-only.
- **Hooks** run an axe-core scan whenever a file is saved.
- **MCP and a Kiro Power** run the payment journey from inside Kiro chat.
- **Kiro CLI** runs the QA agent's 5-run checks, **Kiro Web** fixed a tester-reported issue, and **Kiro Crew** runs Night Watch.

The product itself:

| Layer | Tech |
|---|---|
| Agents | Python, Playwright, nine keyboard-only tools; scripted mode or Strands Agents with Claude on Amazon Bedrock |
| Verdict | A deterministic rule checker |
| API | FastAPI with live steps over Server-Sent Events, SQLite evidence log, rate limits, an AI cost cap and a URL guard |
| Hosting | Docker on Amazon ECS Express Mode; dashboard (React, Vite, Tailwind) on Vercel |
| Proof | pytest and Hypothesis, Vitest with axe checks, Playwright journey tests in GitHub Actions |

Reliability rule for anything AI does: a step counts only if it passes at least 4 of 5 repeat runs,

$$\text{pass rate} = \frac{\text{correct runs}}{5} \ge 0.8$$

and every number we show is labelled with the mode that produced it.

Code was written in Kiro, with Claude AI helping on some coding tasks; our devlog says which.

## Challenges we ran into

- **Scanners miss the barrier that matters most.** We planted six barriers in our test bank. axe-core finds only three of them, $\frac{3}{6}$. The one that actually stops the payment, a `div` pretending to be a button, is invisible to it. That proved the idea, and it meant we needed a real keyboard journey, not just a scan.
- **We couldn't measure our AI agent in time.** Without working Bedrock credentials, all 10 AI runs stopped before calling the model. Instead of showing an unmeasured number, we logged the decision: the demo uses the **scripted** agent (10 of 10 correct), and AI accuracy stays "not measured" until it is.
- **A demo bank that couldn't take a payment.** Our dashboard's bank panel turned out to be a drawing of a bank, not the test page, so no payment could be sent on it by any route. A Kiro spec walked us through diagnosing it before we changed a line.
- **A hook that only worked on one laptop.** It pointed at one person's folder. We fixed it as a Kiro bug-fix spec.
- **Building in layers instead of slices.** We rebuilt the dashboard three times while the end-to-end loop waited, and work sat on unmerged branches. We changed course: thinnest working loop first, merge small and often.

## Accomplishments that we're proud of

- The AI never grades itself: rules decide every verdict.
- A person approves every change, and every fix is proven on a copy first.
- The returning-ghost test: [C] of [D] reintroduced bugs caught. <!-- fill from docs/eval.md or delete -->
- [A] of [B] approved fixes verified on both journeys. <!-- fill from docs/eval.md or delete -->
- A benchmark of 12 labelled cases, including clean pages that should find nothing: precision [x], recall [y]. <!-- fill or delete -->

## What we learned

- **"Can a person finish?" is a different question from "how many errors?"** Half of our planted barriers were invisible to an automated scan.
- **Keep AI out of the verdict.** Separating the agent (which may vary) from the checker (which never does) made every result trustworthy and repeatable.
- **Honest beats impressive.** "Scripted, 10 of 10" is worth more than an AI claim we couldn't back up.
- **Specs, steering and agents make Kiro a team, not a chatbot.** Writing the rules down once saved us repeating them in every chat.
- **A blocker older than a day needs an owner and a fallback**, and nothing is done until it's merged.

## What's next for Haunted Audit

- A screen-reader agent alongside keyboard and voice.
- Fixes delivered as reviewed pull requests, with journey checks on every pull request.
- Sessions with assistive-technology users, reported only with their consent.
- Two to three pilots with banks, fintechs or agencies, on journeys like onboarding, applications and checkout.

Our question stays the same: **can every customer finish?** We want to prove it, everywhere.
