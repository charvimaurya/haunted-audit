/**
 * ResultState: what a result area shows when there is no finished run (no-mock-results REQ-NM-02, 03).
 * Offline, checking, running or "Not run yet": a neutral icon plus text, never a pass or fail state.
 * Returns null when a finished result exists, so the caller renders the real data.
 */
import { AlertTriangle, CircleDashed, Loader2, WifiOff } from 'lucide-react';
import { useContext } from 'react';
import { RunContext, type ApiStatus } from '../../runs/runContext';
import type { JourneyResult } from '../../types/index';

interface ResultStateProps {
  result: JourneyResult | null;
  apiStatus: ApiStatus;
  isRunning?: boolean;
  /** Set when the last run crashed. */
  runError?: string | null;
  /** Extra plain sentence after "Not run yet", for example where to start a run. */
  hint?: string;
}

export const OFFLINE_TEXT = 'Offline: the audit service is not answering, so no result can be shown.';
export const NOT_RUN_TEXT = 'Not run yet';

export function ResultState({ result, apiStatus, isRunning = false, runError, hint }: ResultStateProps) {
  const ctx = useContext(RunContext);
  const failed = runError ?? ctx?.runError ?? null;
  if (result && !isRunning) return null;
  if (isRunning) {
    return (
      <p className="m-0 flex items-center gap-2 text-base font-ui text-ink-muted" data-result-state="running">
        <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" />
        Running. No result yet.
      </p>
    );
  }
  if (failed && !isRunning) {
    return (
      <p className="m-0 flex items-start gap-2 text-base font-ui text-ink-muted" data-result-state="run-failed">
        <AlertTriangle size={16} className="mt-1 shrink-0" aria-hidden="true" />
        <span>
          The run failed, so no result is shown. <span className="font-mono break-all">{failed}</span>
        </span>
      </p>
    );
  }
  if (apiStatus === 'offline') {
    return (
      <p className="m-0 flex items-start gap-2 text-base font-ui text-ink-muted" data-result-state="offline">
        <WifiOff size={16} className="mt-1 shrink-0" aria-hidden="true" />
        {OFFLINE_TEXT}
      </p>
    );
  }
  return (
    <p className="m-0 flex items-start gap-2 text-base font-ui text-ink-muted" data-result-state="not-run">
      <CircleDashed size={16} className="mt-1 shrink-0" aria-hidden="true" />
      <span>
        {NOT_RUN_TEXT}.{hint ? ` ${hint}` : ''}
      </span>
    </p>
  );
}
