import { createContext, useContext } from 'react';
import type { RunNoticeProps } from '../components/RunNotice';
import type { AgentMode, JourneyResult, RecordedDetails, RunStatus, StepEvent, TestDetails, Variant } from '../types';

/** Result of the last GET /health check. */
export type ApiStatus = 'checking' | 'online' | 'offline';

export interface RunValue {
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
  setVariant: (v: Variant) => void;
  setMode: (m: AgentMode) => void;
  setDetails: (d: TestDetails) => void;
  run: () => Promise<void>;
}

export const RunContext = createContext<RunValue | null>(null);

export function useRun(): RunValue {
  const value = useContext(RunContext);
  if (!value) throw new Error('useRun must be used inside RunProvider');
  return value;
}
