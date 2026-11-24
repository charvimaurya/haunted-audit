/**
 * Turn a Run record from GET /runs/{id} into what the dashboard may show (no-mock-results REQ-NM-04).
 *
 * A crashed run comes back as status "error" with result {run_id, error, verdict: "BLOCKED"}
 * (.kiro/steering/data-contract.md). That BLOCKED is not a checker finding, so it is never shown as a
 * verdict: the result is dropped and the error text is kept instead.
 */
import type { JourneyResult, RecordedDetails } from '../types';

export interface RunRecordLike {
  status?: string;
  result?: (Partial<JourneyResult> & { error?: string | null }) | null;
  test_details?: RecordedDetails | null;
}

export interface ShownRun {
  result: JourneyResult | null;
  /** One plain line when the run crashed. */
  error: string | null;
}

export function shownRun(record: RunRecordLike): ShownRun {
  const r = record.result ?? null;
  const crashed = record.status === 'error' || Boolean(r?.error) || r?.stop_reason === 'error';
  if (crashed) {
    const first = (r?.error ?? 'The run stopped with an error.').split('\n')[0].trim();
    return { result: null, error: first.length > 200 ? `${first.slice(0, 197)}...` : first };
  }
  return { result: (r as JourneyResult) ?? null, error: null };
}
/** What the tester typed for this run; null when none was typed or the run crashed (REQ-TD-05). */
export function recordedDetails(record: RunRecordLike): RecordedDetails | null {
  return shownRun(record).result ? record.test_details ?? null : null;
}
