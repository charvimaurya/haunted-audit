/// <reference types="vitest/globals" />
/** spooky-steps: the exorcism on Approve and the before and after split, from measured states only. */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PipelineSection } from '../components/PipelineSection';
import { FixProvider } from '../fixes/FixProvider';
import { useFix, type CopyRun, type Fix } from '../fixes/fixContext';
import { RunContext, type RunValue } from '../runs/runContext';
import type { JourneyResult } from '../types';

expect.extend(toHaveNoViolations);

const EXORCISM = 'Exorcism started: a person approved the fix. The Verifier still has to prove it.';

const result = {
  run_id: 'r1', verdict: 'BLOCKED', reason_code: 'TARGET_NOT_FOCUSABLE', agent_mode: 'scripted', variant: 'broken',
  blocked_element: { selector: 'div.pay-btn', bounding_box: null, tag: 'div', accessible_name: null, text: 'Send Payment' },
  focus_trail: [], step_events: [], screenshots: [], tokens: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
  latency_ms: 1, cost_usd: 0, agent_claim: null, agent_claim_reason: null, agent_claim_mismatch: false,
  target_ever_focused: false, last_focused_element: null, skipped_element: null, goal: 'g', stop_reason: 'completed', error: null,
} as JourneyResult;

const baseFix: Fix = {
  fix_id: 'f1', run_id: 'r1', variant: 'broken', reason_code: 'TARGET_NOT_FOCUSABLE', blocked_element: result.blocked_element,
  reason: 'reason', diff: '--- a/x\n+++ b/x\n@@ -1,1 +1,1 @@\n-a\n+b\n', diff_sha256: 'a'.repeat(64), changed_lines: 2,
  exorcist_mode: 'scripted', input_tokens: 0, output_tokens: 0, cost_usd: 0, latency_ms: 1, status: 'proposed', error: null,
  decided_by: null, decided_at: null, decision_note: null, agent_mode: 'scripted', verify: null, regression: null,
};

const copyRun = (id: string, verdict: CopyRun['verdict'], status: CopyRun['status'] = 'complete'): CopyRun => ({
  run_id: id, status, verdict, reason_code: verdict === 'BLOCKED' ? 'TARGET_NOT_FOCUSABLE' : null, agent_mode: 'scripted', error: null,
});

function Panels() {
  return <PipelineSection result={result} apiStatus="online" activeStep={2} flow={useFix()} />;
}

function withApi(responses: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url.replace(/^https?:\/\/[^/]+/, '')}`;
    return Promise.resolve(new Response(JSON.stringify(responses[key] ?? { detail: 'no stub' }), { status: responses[key] ? 200 : 500 }));
  }));
  const ctx = { result, isRunning: false, apiStatus: 'online' } as unknown as RunValue;
  return render(<RunContext.Provider value={ctx}><FixProvider><Panels /></FixProvider></RunContext.Provider>);
}

afterEach(() => vi.unstubAllGlobals());

describe('exorcism on Approve', () => {
  it('appears only after a person approves, beside its text, and is axe clean', async () => {
    const approved = { ...baseFix, status: 'approved' as const, decided_by: 'demo user', decided_at: '2026-11-24T10:00:00Z' };
    const { container } = withApi({ 'POST /runs/r1/fixes': baseFix, 'POST /fixes/f1/approve': approved });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Propose a fix (scripted Exorcist)' }));
    await screen.findByRole('button', { name: 'Approve Fix' });
    expect(screen.queryByText(EXORCISM)).toBeNull();
    expect(container.querySelector('[data-moment="exorcism"]')).toBeNull();

    screen.getByRole('button', { name: 'Approve Fix' }).focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByText(EXORCISM)).toBeTruthy();
    const ghost = container.querySelector('[data-moment="exorcism"]');
    expect(ghost?.classList.contains('exorcism-ghost')).toBe(true);
    expect(ghost?.getAttribute('aria-hidden')).toBe('true');
    expect(ghost?.querySelector('[data-ghost-state="blocked"]')).toBeTruthy();
    expect(ghost?.querySelector('a, button, [tabindex]')).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('the Calm version is the same DOM: the moment does not depend on motion', () => {
    const approved = { ...baseFix, status: 'approved' as const, decided_by: 'demo user', decided_at: 'x' };
    const flow = { fix: approved, verifyResult: null, busy: false, error: null,
      propose: async () => {}, approve: async () => {}, reject: async () => {}, verify: async () => {}, regression: async () => {} };
    const html = () => render(<PipelineSection result={result} apiStatus="online" activeStep={2} flow={flow} />).container
      .querySelector('[data-moment="exorcism"]')?.parentElement?.outerHTML;
    const moving = html();
    document.documentElement.dataset.calm = 'true';
    const calm = html();
    delete document.documentElement.dataset.calm;
    expect(moving).toBeTruthy();
    expect(calm).toBe(moving);
  });

  it('is gone once the Verifier has started, so it never contradicts the result', () => {
    const flow = { fix: { ...baseFix, status: 'approved' as const, decided_by: 'u', decided_at: 'x', verify: copyRun('v', 'PASSED') },
      verifyResult: null, busy: false, error: null,
      propose: async () => {}, approve: async () => {}, reject: async () => {}, verify: async () => {}, regression: async () => {} };
    render(<PipelineSection result={result} apiStatus="online" activeStep={3} flow={flow} />);
    expect(screen.queryByText(EXORCISM)).toBeNull();
  });
});
