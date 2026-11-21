# Agents page — Stage 0 data audit

**Date:** Sat 21 Nov 2026  
**Scope:** Agents UI under `dashboard/` (read). Deliverable for Stage 0 only.  
**Primary route (requested):** `/journeys/send-payment/agents` → `dashboard/src/pages/Agents.tsx`  
**Related (Stage 1 mid-work, not wired in `AppRoutes.tsx` yet):** `dashboard/src/pages/app/Agents.tsx` at intended path `/app/agents`  
**App code changed in Stage 0:** none (no app-owned “Working 1” pill found).

Audited against the **current** tree. Another agent may have been interrupted mid Stage-1 multipage; `routes.ts` already lists marketing/`/app/*` page defs, while `AppRoutes.tsx` still mounts the legacy journey Agents page. Unrelated Stage-1 files were **not** reverted.

---

## 1. Page wiring

| Piece | Source |
|-------|--------|
| Route | `AppRoutes.tsx`: `path={`${JOURNEY.slice(1)}`}/agents` → lazy `pages/Agents.tsx` (`JOURNEY` = `/journeys/send-payment`) |
| Page shell | `Page id="agents"` → looks up `PAGES` in `routes.ts` |
| Run state | `useRun()` from `runs/runContext.ts` / `RunProvider.tsx` |
| Body | `GhostHuntSection` + optional “No run yet” status + `JourneyNav` |

### Tree dirtiness (legacy vs Stage 1)

- `pages/Agents.tsx` uses `<Page id="agents">`.
- Current `PAGES` in `routes.ts` has **`app-agents`** (`/app/agents`) but **no** `id: 'agents'` (or other legacy journey page defs). Visiting `/journeys/send-payment/agents` will throw `Unknown page id: agents` from `Page.tsx` until Stage 1 finishes wiring redirects/shells.
- `pages/app/Agents.tsx` uses `<Page id="app-agents">` (matches manifest) and the same `GhostHuntSection`; it is **not** registered in the current `AppRoutes.tsx`.
- Both Agents page files pass the same props: `result`, `isRunning`, `liveEvents` from `useRun()`.

**All on-page investigation values below come from `GhostHuntSection` + `AgentCard`, shared by both pages.**

### Run API (real data path)

From `RunProvider.tsx` (not started on the Agents page itself — Possession / Journeys / Try start runs):

1. `POST {API_BASE}/runs` with `{ variant, mode }`
2. SSE `GET {API_BASE}/runs/{id}/events` → appends `StepEvent` to `liveEvents`
3. SSE `done` → `GET {API_BASE}/runs/{id}` → `setResult(record.result)`

`API_BASE` = `VITE_API_URL` or `http://127.0.0.1:8000`.  
Types: `JourneyResult`, `StepEvent`, `BlockedElement` in `dashboard/src/types/index.ts`.

Agents page does **not** render `RunNotice`. Offline / limit / paused notices only appear where `RunNotice` is mounted (e.g. Possession). If the backend is down and no prior `result` exists, Agents shows the “No run yet” copy (or example agent outcomes), not a dedicated “backend offline” state.

---

## 2. Value inventory — where each UI value comes from

### Page chrome (`pages/Agents.tsx` + `Page` / `JourneyNav`)

| UI | Source | Real / hard / mock |
|----|--------|--------------------|
| H1 + “shows” line | `Page` → `PAGES` entry for page id | Manifest copy in `routes.ts` (static). **Broken for legacy id `agents`** — see dirtiness above. For `/app/agents`: h1 `"Agents"`, shows `"What each agent tried…"` |
| Journey nav labels / links | `JourneyNav.tsx` hardcoded `ITEMS` + `FIX_STEPS` | Static labels; routes are real |
| “Journey: Send Payment” | Hardcoded string in `JourneyNav` | Hardcoded |
| “No run yet…” status | Shown when `result === null && !isRunning` | Condition real; link target `${JOURNEY}/possession` hardcoded |
| Next step link | `page.next` from manifest | Static label/path when page def exists |

### Section header (`GhostHuntSection`)

| UI | Source | Real / hard / mock |
|----|--------|--------------------|
| “The Ghost Hunt — Agent Investigation” | Hardcoded JSX | Hardcoded |
| “Example outcomes from the design. Not yet measured…” | Shown when `result === null && !isRunning` | Condition real; copy admits design placeholders |

### Keyboard Agent card

| UI | Source | Real / hard / mock |
|----|--------|--------------------|
| Name “Keyboard Agent” | Hardcoded prop | Hardcoded |
| Icon | Lucide `Keyboard` | Decorative |
| Running spinner | `isRunning` from `useRun` | **Real** (only this card gets `isRunning`) |
| Outcome “Navigated form” / `passed: true` | Hardcoded in `GhostHuntSection` | **Hardcoded mock** — never derived from `result` |
| Outcome “Could not reach Send Payment” / `passed: false` | Hardcoded label + always `passed: false` | **Hardcoded mock** |
| Outcome detail under fail row | `result?.reason_code ?? undefined` | **Real when present**; omitted if no result / null reason |

### Voice Agent card

| UI | Source | Real / hard / mock |
|----|--------|--------------------|
| Name “Voice Agent” | Hardcoded | Hardcoded |
| Icon | Lucide `Mic` | Decorative |
| Running spinner | **Not passed** (`isRunning` omitted → false) | Never shows running |
| “Found by name "Send Payment"” / `passed: true` | Hardcoded | **Fully hardcoded mock** — ignores `result` |
| “Could not activate button” / `passed: false` | Hardcoded | **Fully hardcoded mock** — ignores `result` |
| Any detail | None | — |

**Verdict:** Voice Agent is 100% design placeholder. No API / run fields feed this card.

### Ghost Hunter card

| UI | Source | Real / hard / mock |
|----|--------|--------------------|
| Name “Ghost Hunter” | Hardcoded | Hardcoded |
| Icon | Lucide `Ghost` | Decorative |
| Running spinner | Not passed | Never shows running |
| “Identified root cause” / `passed: true` | Hardcoded | **Hardcoded mock** |
| “Custom element not keyboard accessible” / `passed: false` | Hardcoded label + always fail | **Hardcoded mock** |
| Fail detail | `result?.blocked_element?.selector ?? 'div.pay-btn'` | Selector **real when blocked_element exists**; else **hardcoded fallback `'div.pay-btn'`** even with no run |

**Verdict:** Labels and pass/fail are mocked. Only the selector detail can be real; default `div.pay-btn` invents a value when unmeasured.

### Live steps timeline

| UI | Source | Real / hard / mock |
|----|--------|--------------------|
| “Live steps” label | Hardcoded | Hardcoded |
| Event list | `result?.step_events?.length ? result.step_events.slice(-8) : liveEvents.slice(-8)` | **Real** from final result or SSE |
| Per row: `ev.step`, `ev.tool` | `StepEvent` fields | **Real** |
| Tool colour | Local `TOOL_COLOR` map by tool name | Presentation only |
| Empty: “Waiting…” / “No steps yet” | `isRunning` vs idle | Condition real; copy static |

Not shown from `StepEvent`: `args`, focus snapshots, timestamp, screenshot path.

### Critical Ghost Detected alert

| UI | Source | Real / hard / mock |
|----|--------|--------------------|
| Visibility | `result?.verdict === 'BLOCKED' && result?.blocked_element` | **Real gate** |
| Title “Critical Ghost Detected” | Hardcoded | Hardcoded |
| “Barrier: Payment button inaccessible to keyboard navigation” | Hardcoded | **Hardcoded** — not from API |
| “Impact: Customer cannot complete payment” | Hardcoded | **Hardcoded** |
| “WCAG: 2.1.1 Keyboard, 4.1.2 Name, Role, Value” | Hardcoded | **Hardcoded** |
| Chip text | `result.blocked_element.text ?? 'Send Payment'` | Text **real when present**; else hardcoded `'Send Payment'` |
| Chip aria-label | `text ?? selector` | Real fields when present |
| Ghost mascot / 🚫 | Decorative (`GhostMascot`, emoji) | Decorative |

---

## 3. Hardcoded / mocked values checklist (especially Voice + Ghost Hunter)

### Fully mocked (never from API)

- Voice Agent: both outcomes and pass/fail flags  
- Ghost Hunter: both outcome labels and pass/fail flags (“Identified root cause” always pass; “Custom element…” always fail)  
- Keyboard Agent: both outcome labels and pass/fail flags (“Navigated form” always pass; “Could not reach…” always fail)  
- Critical Ghost body copy: Barrier, Impact, WCAG lines  
- Section title strings; Live steps chrome labels  
- Fallback selector `div.pay-btn`  
- Fallback chip text `Send Payment`  
- Example banner: “Example outcomes from the design…”

### Partially real

| Value | When real | Fallback / mock |
|-------|-----------|-----------------|
| Keyboard fail `detail` | `result.reason_code` set | Hidden if null/absent |
| Ghost Hunter fail `detail` | `blocked_element.selector` | `'div.pay-btn'` |
| Critical Ghost chip | `blocked_element.text` | `'Send Payment'` |
| Critical Ghost panel | Only if BLOCKED + `blocked_element` | Hidden otherwise (good) |
| Live steps | `step_events` or SSE `liveEvents` | Empty message |
| Keyboard running spinner | `isRunning` | — |

### Real (API / run context)

- `result`, `isRunning`, `liveEvents` plumbing  
- Live step `step` + `tool` when events exist  
- Gate for Critical Ghost alert  
- Optional Keyboard `reason_code` detail  
- Optional Ghost Hunter / chip fields from `blocked_element` when present  

### Unused run fields on this page

`JourneyResult` fields available but **not** used by Agents / GhostHuntSection include (non-exhaustive): `focus_trail`, `verdict` (except alert gate), most of `blocked_element` beyond selector/text, `agent_mode`, tokens, latency, cost, agent_claim*, `target_ever_focused`, `last_focused_element`, `skipped_element`, `variant`, `goal`, `stop_reason`, `error`, screenshots.

There is **no** separate Voice-agent or Ghost-Hunter payload in the current types — only one keyboard journey `JourneyResult`.

---

## 4. “Working 1” pill

**Search:** repo-wide grep for `Working`, `Working 1`, working-pill style strings in `dashboard/` and the workspace `*.{tsx,ts,jsx,js,css,html,vue}` — **zero matches**.

**Conclusion:** The “Working 1” pill is **not** rendered by Haunted Audit app code. It is almost certainly a **Cursor / IDE / browser / agent-status overlay** (or similar host UI), not a dashboard component.

**Stage 0 action:** Do **not** remove anything in app code. Left untouched.

---

## 5. Files involved (Agents surface)

| File | Role |
|------|------|
| `dashboard/src/pages/Agents.tsx` | Legacy journey Agents page (wired today) |
| `dashboard/src/pages/app/Agents.tsx` | Intended `/app/agents` page (manifest only; not in `AppRoutes` yet) |
| `dashboard/src/components/GhostHuntSection.tsx` | All three cards, live steps, critical ghost |
| `dashboard/src/components/AgentCard.tsx` | Presentational card |
| `dashboard/src/components/GhostMascot.tsx` | Alert decoration |
| `dashboard/src/runs/RunProvider.tsx` | Fetches run + SSE |
| `dashboard/src/runs/runContext.ts` | `useRun` |
| `dashboard/src/types/index.ts` | `JourneyResult` / `StepEvent` shapes |
| `dashboard/src/AppRoutes.tsx` | Registers legacy `/journeys/send-payment/agents` |
| `dashboard/src/routes.ts` | Page manifest (currently `app-agents`, not legacy `agents`) |
| `dashboard/src/components/JourneyNav.tsx` | Journey sub-nav on legacy page |
| `dashboard/src/components/Page.tsx` | H1 / shows / next |

---

## 6. Stage 0 stop

Inventory complete. No Stage 1 UI/data wiring changes made. Waiting for go-ahead before Stage 1.
