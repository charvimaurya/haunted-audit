import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { OutcomeCard } from '../components/results/OutcomeCard';
import { FixContext, type CopyRun, type Fix, type FixValue } from '../fixes/fixContext';
import { verifiedPct } from '../fixes/verifiedPct';

const run = (verdict: CopyRun['verdict'], status: CopyRun['status'] = 'complete'): CopyRun => ({
  run_id: 'r', status, verdict, reason_code: verdict === 'BLOCKED' ? 'TARGET_NOT_FOCUSABLE' : null, agent_mode: 'scripted', error: null,
});
const base: Fix = {
  fix_id: 'f', run_id: 'r0', variant: 'broken', reason_code: 'TARGET_NOT_FOCUSABLE', blocked_element: null, reason: null,
  diff: null, diff_sha256: null, changed_lines: null, exorcist_mode: 'scripted', input_tokens: 0, output_tokens: 0,
  cost_usd: 0, latency_ms: 1, status: 'approved', error: null, decided_by: null, decided_at: null, decision_note: null,
  agent_mode: 'scripted', verify: null, regression: null,
};
const noop = async () => {};
function withFix(fix: Fix | null) {
  const value: FixValue = { fix, verifyResult: null, busy: false, error: null, propose: noop, approve: noop, reject: noop, verify: noop, regression: noop };
  return render(<FixContext.Provider value={value}><OutcomeCard result={null} /></FixContext.Provider>);
}

describe('fix loop results', () => {
  it('verified percentage stays unmeasured until an approved fix has a finished Verifier run', () => {
    expect(verifiedPct(null)).toBeNull();
    expect(verifiedPct({ ...base, status: 'proposed', verify: run('PASSED') })).toBeNull();
    expect(verifiedPct({ ...base, verify: run(null, 'running') })).toBeNull();
    expect(verifiedPct({ ...base, verify: run('PASSED') })).toBe(100);
    expect(verifiedPct({ ...base, verify: run('BLOCKED') })).toBe(0);
  });
  it('the regression row says yes only when the checker caught the bug put back', () => {
    expect(withFix({ ...base, regression: run('BLOCKED') }).container.textContent)
      .toContain('Yes: with the bug put back on a copy, the checker said BLOCKED (TARGET_NOT_FOCUSABLE, scripted mode).');
  });
  it('the regression row says no when the bug put back still passed', () => {
    expect(withFix({ ...base, regression: run('PASSED') }).container.textContent)
      .toContain('No: with the bug put back on a copy, the checker still said PASSED.');
  });
  it('the regression row is not ticked while the check is running', () => {
    expect(withFix({ ...base, regression: run(null, 'running') }).container.textContent)
      .toContain('Not available yet: no regression test exists.');
  });
});
