import type { AgentKind, AgentMode, JourneyResult, ReasonCode, Variant, Verdict } from '../types';
import { getScenarioDef, normalizeScenarioId, type ScenarioId } from './scenarios';

export interface SavedPossessionRun {
  run_id: string;
  recorded_at: string;
  scenario?: ScenarioId;
  variant: Variant;
  agent_kind: AgentKind;
  agent_mode: AgentMode;
  verdict: Verdict;
  reason_code: ReasonCode | null;
  blocked_selector: string | null;
  steps_count: number;
  latency_ms: number;
}

export interface TrackedFixRound {
  run_id: string;
  fix_id: string;
  status: 'proposed' | 'approved' | 'rejected' | 'exorcist_failed';
  verify_verdict: Verdict | null;
  verify_voice_verdict: Verdict | null;
  regression_verdict: Verdict | null;
  diff_sha_prefix: string | null;
  updated_at: string;
}

export interface AuditDefaults {
  variant: Variant;
  mode: AgentMode;
}

const HISTORY_KEY = 'haunted-audit.possession-history.v1';
const LAST_RESULT_KEY = 'haunted-audit.last-result.v1';
const FIX_ROUNDS_KEY = 'haunted-audit.fix-rounds.v1';
const DEFAULTS_KEY = 'haunted-audit.defaults.v1';
const SAVE_ENABLED_KEY = 'haunted-audit.save-history.v1';
const MAX_HISTORY = 30;

export function isHistorySavingEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(SAVE_ENABLED_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setHistorySavingEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SAVE_ENABLED_KEY, enabled ? 'on' : 'off');
  } catch {
    // Ignore storage errors
  }
}

export function readAuditDefaults(): AuditDefaults {
  if (typeof window === 'undefined') return { variant: 'broken', mode: 'scripted' };
  try {
    const raw = window.localStorage.getItem(DEFAULTS_KEY);
    if (!raw) return { variant: 'broken', mode: 'scripted' };
    const parsed = JSON.parse(raw) as Partial<AuditDefaults>;
    return {
      variant: parsed.variant === 'fixed' ? 'fixed' : 'broken',
      mode: parsed.mode === 'llm' ? 'llm' : 'scripted',
    };
  } catch {
    return { variant: 'broken', mode: 'scripted' };
  }
}

export function writeAuditDefaults(defaults: AuditDefaults): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DEFAULTS_KEY, JSON.stringify(defaults));
  } catch {
    // Ignore storage errors
  }
}

export function readPossessionHistory(): SavedPossessionRun[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedPossessionRun[]) : [];
  } catch {
    return [];
  }
}

export function readLastSavedResult(): JourneyResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LAST_RESULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as JourneyResult;
    return parsed && typeof parsed.run_id === 'string' && typeof parsed.verdict === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function savePossessionRun(
  result: JourneyResult,
  scenario?: ScenarioId,
): SavedPossessionRun[] {
  const existing = readPossessionHistory();
  if (!isHistorySavingEnabled()) return existing;

  const resolvedScenario = normalizeScenarioId(scenario ?? result.scenario);
  const entry: SavedPossessionRun = {
    run_id: result.run_id,
    recorded_at: new Date().toISOString(),
    scenario: resolvedScenario,
    variant: result.variant,
    agent_kind: result.agent_kind ?? 'keyboard',
    agent_mode: result.agent_mode,
    verdict: result.verdict,
    reason_code: result.reason_code ?? null,
    blocked_selector: result.blocked_element?.selector ?? null,
    steps_count: result.step_events?.length ?? 0,
    latency_ms: Math.round(result.latency_ms ?? 0),
  };

  const next = [entry, ...existing.filter((item) => item.run_id !== entry.run_id)].slice(0, MAX_HISTORY);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      window.localStorage.setItem(
        LAST_RESULT_KEY,
        JSON.stringify({ ...result, scenario: resolvedScenario, screenshots: [] }),
      );
    } catch {
      // Ignore quota errors
    }
  }
  return next;
}

export function scenarioDisplayName(scenarioId: string | null | undefined): string {
  return getScenarioDef(scenarioId).name;
}

export function readTrackedFixRounds(): Record<string, TrackedFixRound> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(FIX_ROUNDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, TrackedFixRound>) : {};
  } catch {
    return {};
  }
}

export function saveTrackedFixRound(round: TrackedFixRound): Record<string, TrackedFixRound> {
  const existing = readTrackedFixRounds();
  if (!isHistorySavingEnabled()) return existing;

  const next = { ...existing, [round.run_id]: round };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(FIX_ROUNDS_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota errors
    }
  }
  return next;
}

export function clearPossessionHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(HISTORY_KEY);
    window.localStorage.removeItem(LAST_RESULT_KEY);
    window.localStorage.removeItem(FIX_ROUNDS_KEY);
  } catch {
    // Ignore storage errors
  }
}
