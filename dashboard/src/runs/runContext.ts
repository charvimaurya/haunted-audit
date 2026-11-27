import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';
import type { RunNoticeProps } from '../components/journey/RunNotice';
import type { AgentMode, JourneyResult, RecordedDetails, RunStatus, StepEvent, TestDetails, Variant } from '../types';
import type { SavedPossessionRun } from './possessionHistory';
import type { ScenarioId } from './scenarios';

/** Result of the last GET /health check. */
export type ApiStatus = 'checking' | 'online' | 'offline';

export interface RunValue {
  scenario: ScenarioId;
  variant: Variant;
  mode: AgentMode;
  /** The made-up details the tester is typing for the next run. Start empty (REQ-TD-01). */
  details: TestDetails;
  /** test_details from the last run's record: what was typed for it, or null. */
  runDetails: RecordedDetails | null;
  runStatus: RunStatus | null;
  result: JourneyResult | null;
  liveEvents: StepEvent[];
  notice: RunNoticeProps | null;
  isRunning: boolean;
  apiStatus: ApiStatus;
  /** Set when the last run crashed. No result is shown then. */
  runError: string | null;
  setScenario: (s: ScenarioId) => void;
  setVariant: (v: Variant) => void;
  setMode: (m: AgentMode) => void;
  /** A plain setter: pass a value, or a function of the latest details (used by the voice fill). */
  setDetails: Dispatch<SetStateAction<TestDetails>>;
  run: () => Promise<void>;
  /** The last finished voice run, so the status badge can show it. Null when a keyboard run is newer. */
  voiceResult: JourneyResult | null;
  setVoiceResult: (r: JourneyResult | null) => void;
  /** Finished keyboard and voice Possession runs saved cleanly in localStorage. */
  history: SavedPossessionRun[];
  clearHistory: () => void;
}

export const RunContext = createContext<RunValue | null>(null);

export function useRun(): RunValue {
  const value = useContext(RunContext);
  if (!value) throw new Error('useRun must be used inside RunProvider');
  return value;
}
