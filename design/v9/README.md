# Haunted Audit UI v9: design target for Kiro

This folder is the **visual target** for the dashboard rework: the v7 look, plus the voice journey.
Open any page in Chrome to see it. Use it as a reference only. **Do not paste this HTML into the app.**
Rebuild each screen in the React dashboard (`dashboard/src`), with real data.

| File | Screen | React files to change |
|---|---|---|
| `01-home.html` | Home: v7 picture, live title and button, red and green ghosts roaming, Pause animation | `components/HeroSection.tsx`, `HeroScene.tsx`, `immersion/AmbientScene.tsx`, `index.css` |
| `02-possession-keyboard.html` | Possession Mode, Keyboard picked | `pages/app/Possession.tsx`, `components/PossessionMode.tsx`, `RunControls.tsx` |
| `03-possession-voice.html` | Possession Mode, Voice picked (new) | same as above, plus `VoiceAgentPanel.tsx`, `voice/useVoiceRun.ts` |
| `04-agents.html` | Agents: three cards, live timeline, Critical Ghost card | `components/GhostHuntSection.tsx`, `AgentCard.tsx` |
| `05-fixes.html` | Fixes: Fix, Verify (keyboard and voice), Regression | `pages/app/Fixes.tsx`, `components/FixPanels.tsx` |
| `06-kiro.html` | Kiro: folder tree, real hook, recorded finding | `components/KiroIntegrationSection.tsx` |
| `07-results.html` | Results: four tiles and the Outcome parchment | `components/ResultsSection.tsx`, `OutcomeCard.tsx` |
| `index.html` | All screens in one page, with working navigation | for reference |
| `assets/hero-bg.jpg` | Home background (the v7 artwork with the text removed) | copy to `dashboard/src/assets/` |
| `assets/creepster-latin-400-normal.woff2` | Title font | install `@fontsource/creepster` instead |

## Rules for every screen

- Follow `.kiro/steering/ui-fidelity.md`, `product-rules.md` and `accessibility.md`.
- Colours go into tokens (`tailwind.config.js`, `index.css`). No hex values in components.
- Real data only. Every tick, cross and number comes from a real run, or shows `--` and "Not run yet". Never show `[x]` or `[n]`.
- Text 16px or larger, visible focus on everything, status shown as icon plus text, Calm mode and reduced motion respected.
- One branch and one pull request per screen. Run the QA and Reviewer agents before merging.
- Before starting: change `ui-fidelity.md` to allow one self-hosted image (the Home background).

## Kiro prompts (spec mode, one per screen)

Attach the HTML page and the React files named in the table, then paste the prompt.

**Home (`feature/ui-v9-home`)**
> Rebuild the Home hero to match `design/v9/01-home.html` at 1366 px wide. Use `assets/hero-bg.jpg` as the background (copy it to `dashboard/src/assets/`), with the title, tagline, Possess This App link and the four chips as real HTML on top. Use `@fontsource/creepster` for the title only. Two decorative ghosts roam: red angry along the bottom, green happy along the top, behind the text, `aria-hidden`. Add a visible "Pause animation" button (WCAG 2.2.2). Hide the ghosts in Calm mode and with reduced motion. Cap the hero at 1360 px wide. Keep all existing tests passing and add tests for the Pause button.

**Possession with the voice switch (`feature/ui-v9-possession`)**
> Rebuild Possession Mode to match `design/v9/02-possession-keyboard.html` and `03-possession-voice.html`. Add a Keyboard / Voice switch inside the Possession Mode panel (buttons with `aria-pressed`). Keyboard shows the Tab steps. Voice shows the voice commands as steps, with Run voice journey, Push to talk (real Chrome speech recognition from `voice/speechRecognition.ts`) and Edit commands. Steps fill in live from the run's `step_events`. The red ghost sits beside Send Payment, never on it, with the Journey Blocked note. Move the voice controls out of the Agents page. Show "Live Test" only while a run is going.

**Agents (`feature/ui-v9-agents`)**
> Rebuild the Agents page to match `design/v9/04-agents.html`. Three cards (Keyboard Agent, Voice Agent, Ghost Hunter) with green and red status rows built only from real run results, and "Not run yet" otherwise. Add the live timeline of both journeys' steps. The Critical Ghost card reads its Barrier, Impact and WCAG lines from `reason_code` and `blocked_element`, with the small picture of the blocked button.

**Fixes (`feature/ui-v9-fixes`)**
> Rebuild the Fixes page to match `design/v9/05-fixes.html`: the step strip with arrows, and Proposed Fix, Verification and Regression Guard cards side by side. Approve Fix and Reject call the existing API. Verification shows keyboard rows and a voice row ("Say 'click Send Payment'") only from real Verifier results. Regression Guard lists `send_payment.spec.ts` and `send_payment_voice.spec.ts` with their real FAILED lines, then "The ghost is back. But this time, we caught it." only when pass-then-fail data exists. Highlight the current step.

**Kiro and Results (`feature/ui-v9-kiro-results`)**
> Rebuild the Kiro panel to match `design/v9/06-kiro.html`: folder tree with icons, the real `.kiro/hooks/scan-on-save.json`, and the recorded finding with its date (not "Live"). Rebuild Results to match `07-results.html`: four coloured tiles and the Outcome parchment in one row, with the mascot coloured by run state. Show only measured numbers, otherwise `--` and "not yet measured".

## Checks after each screen

- Side by side with the matching HTML page at 1366 × 657: the screen fits without scrolling.
- `npm test`, plus axe in normal, Calm and high-contrast modes: zero findings.
- Keyboard-only walk, 200% zoom, and a phone width of 390 px.
- New screenshot in `docs/ui-fidelity/after/`, and one line in `docs/devlog.md`.
