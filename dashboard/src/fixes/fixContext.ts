import { createContext, useContext } from 'react';
import type { BlockedElement, JourneyResult } from '../types';
import type { TrackedFixRound } from '../runs/possessionHistory';

/** A copy run started by the Verifier or the regression check (data-contract.md, "Fix"). */
export interface CopyRun {
  run_id: string;
  status: 'running' | 'complete' | 'error';
  verdict: 'PASSED' | 'BLOCKED' | null;
  reason_code: string | null;
  agent_mode: string | null;
  error: string | null;
}

/** GET /fixes/{id} (data-contract.md, "Fix"). */
export interface Fix {
  fix_id: string;
  run_id: string;
  variant: string;
  reason_code: string | null;
  blocked_element: BlockedElement | null;
  reason: string | null;
  diff: string | null;
  diff_sha256: string | null;
  changed_lines: number | null;
  exorcist_mode: 'scripted' | 'llm';
  exorcist_model_id?: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  latency_ms: number;
  status: 'proposed' | 'approved' | 'rejected' | 'exorcist_failed';
  error: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  agent_mode: string | null;
  verify: CopyRun | null;
  regression: CopyRun | null;
  /** The voice-command simulation on the same copies (loop-evidence REQ-LE-03). Absent from older records. */
  verify_voice?: CopyRun | null;
  regression_voice?: CopyRun | null;
  created_at?: string;
  /** Append-only decision and run history (data-contract.md, "Fix"). Not shown on screen today. */
  history?: { at: string; event: string; detail: Record<string, unknown> }[];
}

export interface FixValue {
  fix: Fix | null;
  /** Selected run ID in the Fixes workspace (defaults to the current RunContext result). */
  selectedRunId?: string | null;
  /** Loaded JourneyResult for selectedRunId when picking from localStorage history. */
  selectedResult?: JourneyResult | null;
  /** Switch active run ID on the unified Fixes hub. */
  selectRun?: (runId: string) => void;
  /** Persisted fix round states keyed by run_id. */
  trackedFixes?: Record<string, TrackedFixRound>;
  /** The Verifier's finished keyboard run on the patched copy (its steps fill the checklist). */
  verifyResult: JourneyResult | null;
  /** The Verifier's finished voice run on the patched copy (its steps fill the voice row). */
  voiceVerifyResult?: JourneyResult | null;
  /** The finished voice run on the copy with the bug put back (its failed step gives the FAILED line). */
  regressionVoiceResult?: JourneyResult | null;
  busy: boolean;
  /** One plain sentence when the last action was refused or the API did not answer. */
  error: string | null;
  propose: () => Promise<void>;
  approve: () => Promise<void>;
  reject: () => Promise<void>;
  verify: () => Promise<void>;
  regression: () => Promise<void>;
}

export const FixContext = createContext<FixValue | null>(null);

export function useFix(): FixValue | null {
  return useContext(FixContext);
}
