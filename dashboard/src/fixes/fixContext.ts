import { createContext, useContext } from 'react';
import type { BlockedElement } from '../types';

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
}

export interface FixValue {
  fix: Fix | null;
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
