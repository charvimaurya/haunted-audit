/// <reference types="vitest/globals" />
/** Fix panels by keyboard, against the API's shapes (exorcist REQ-X-15, 16). */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PipelineSection } from '../components/PipelineSection';
import { FixProvider } from '../fixes/FixProvider';
import { useFix, type Fix } from '../fixes/fixContext';
import { RunContext, type RunValue } from '../runs/runContext';
import type { JourneyResult } from '../types';

expect.extend(toHaveNoViolations);

const result = {
  run_id: 'r1', verdict: 'BLOCKED', reason_code: 'TARGET_NOT_FOCUSABLE', agent_mode: 'scripted', variant: 'broken',
  blocked_element: { selector: 'div.pay-btn', bounding_box: null, tag: 'div', accessible_name: null, text: 'Send Payment' },
  focus_trail: [], step_events: [], screenshots: [], tokens: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
  latency_ms: 1, cost_usd: 0, agent_claim: null, agent_claim_reason: null, agent_claim_mismatch: false,
  target_ever_focused: false, last_focused_element: null, skipped_element: null, goal: 'g', stop_reason: 'completed', error: null,
} as JourneyResult;

const base: Fix = {
  fix_id: 'f1', run_id: 'r1', variant: 'broken', reason_code: 'TARGET_NOT_FOCUSABLE', blocked_element: result.blocked_element,
  reason: 'Send Payment is a div with a click handler, so Tab never reaches it; a real submit button can be reached and pressed.',
  diff: '--- a/x\n+++ b/x\n@@ -1,3 +1,3 @@\n } else {\n-<div class="pay-btn">Send Payment</div>\n+<button type="submit">Send Payment</button>\n }\n',
  diff_sha256: 'a'.repeat(64), changed_lines: 2, exorcist_mode: 'scripted', input_tokens: 0, output_tokens: 0, cost_usd: 0,
  latency_ms: 1, status: 'proposed', error: null, decided_by: null, decided_at: null, decision_note: null,
  agent_mode: 'scripted', verify: null, regression: null,
};

function Page() {
  const flow = useFix();
  return <PipelineSection result={result} apiStatus="online" activeStep={2} flow={flow} />;
}

function renderWithApi(responses: Record<string, unknown>) {
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url.replace(/^https?:\/\/[^/]+/, '')}`;
    calls.push(key + (init?.body ? ` ${init.body}` : ''));
    return Promise.resolve(new Response(JSON.stringify(responses[key] ?? { detail: 'no stub' }), { status: responses[key] ? 200 : 500 }));
  }));
  const ctx = { result, isRunning: false, apiStatus: 'online' } as unknown as RunValue;
  const view = render(<RunContext.Provider value={ctx}><FixProvider><Page /></FixProvider></RunContext.Provider>);
  return { calls, ...view };
}

afterEach(() => vi.unstubAllGlobals());

describe('fix panels', () => {
  it('propose, then approve, by keyboard; the diff is text with + and - markers', async () => {
    const { calls, container } = renderWithApi({
      'POST /runs/r1/fixes': base,
      'POST /fixes/f1/approve': { ...base, status: 'approved', decided_by: 'demo user', decided_at: '2026-11-22T10:00:00Z' },
    });
    const user = userEvent.setup();
    expect(screen.queryByText('Not available yet.')).toBeNull();
    screen.getByRole('button', { name: 'Propose a fix (scripted Exorcist)' }).focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByText(base.reason!)).toBeTruthy();
    expect(screen.getByText('Removed:')).toBeTruthy();
    expect(screen.getByText('Added:')).toBeTruthy();
    expect(screen.getByText(/scripted Exorcist · 2 lines changed · tokens 0 in, 0 out · cost 0 USD/)).toBeTruthy();
    expect(screen.getByText('Waiting for a person to approve a fix.')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
    screen.getByRole('button', { name: 'Approve Fix' }).focus();
    await user.keyboard(' ');
    expect(await screen.findByText(/Approved by demo user/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Approve Fix' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Replay both journeys' })).toBeTruthy();
    expect(calls.find((c) => c.startsWith('POST /fixes/f1/approve'))).toContain(`"diff_sha256":"${'a'.repeat(64)}"`);
  });

  it('reject records the decision and offers nothing to verify', async () => {
    renderWithApi({ 'POST /runs/r1/fixes': base, 'POST /fixes/f1/reject': { ...base, status: 'rejected', decided_by: 'demo user', decided_at: '2026-11-22T10:00:00Z' } });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Propose a fix (scripted Exorcist)' }));
    await user.click(await screen.findByRole('button', { name: 'Reject' }));
    expect(await screen.findByText(/Rejected by demo user/)).toBeTruthy();
    expect(screen.getByText('The fix was rejected, so there is nothing to verify.')).toBeTruthy();
  });

  it('shows Verified and caught only from measured copy runs', async () => {
    const done = { ...base, status: 'approved' as const, decided_by: 'demo user', decided_at: 'x',
      verify: { run_id: 'v', status: 'complete' as const, verdict: 'PASSED' as const, reason_code: null, agent_mode: 'scripted', error: null },
      regression: { run_id: 'g', status: 'complete' as const, verdict: 'BLOCKED' as const, reason_code: 'TARGET_NOT_FOCUSABLE', agent_mode: 'scripted', error: null } };
    const { container } = renderWithApi({ 'POST /runs/r1/fixes': done });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Propose a fix (scripted Exorcist)' }));
    expect(await screen.findByText('Journey Verified')).toBeTruthy();
    expect(screen.getByText('Checker: PASSED, scripted mode, on a patched copy.')).toBeTruthy();
    expect(screen.getByText(/The ghost is back\./)).toBeTruthy();
    expect(screen.getByText('FAILED: Send Payment not focusable (TARGET_NOT_FOCUSABLE)')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('a refused action is said in words', async () => {
    renderWithApi({});
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Propose a fix (scripted Exorcist)' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('no stub'));
  });
});
