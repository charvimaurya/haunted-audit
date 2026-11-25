/// <reference types="vitest/globals" />
/** ui-v9-fixes: v9 wording, ticks, the white caught ghost and real regression lines. Verify stays manual. */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { PipelineSection } from '../components/PipelineSection';
import type { CopyRun, Fix, FixValue } from '../fixes/fixContext';
import type { JourneyResult } from '../types';

expect.extend(toHaveNoViolations);

const result = {
  run_id: 'r1', verdict: 'BLOCKED', reason_code: 'TARGET_NOT_FOCUSABLE', agent_mode: 'scripted', variant: 'broken',
  blocked_element: { selector: 'div.pay-btn', bounding_box: null, tag: 'div', accessible_name: null, text: 'Send Payment' },
  focus_trail: [], step_events: [], screenshots: [], tokens: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
  latency_ms: 1, cost_usd: 0, agent_claim: null, agent_claim_reason: null, agent_claim_mismatch: false,
  target_ever_focused: false, last_focused_element: null, skipped_element: null, goal: 'g', stop_reason: 'completed', error: null,
} as JourneyResult;

const run = (id: string, verdict: CopyRun['verdict'], status: CopyRun['status'] = 'complete', reason: string | null = null): CopyRun => ({
  run_id: id, status, verdict, reason_code: verdict === 'BLOCKED' ? reason ?? 'NO_ACTIVATION' : null, agent_mode: 'scripted', error: null,
});

const approved: Fix = {
  fix_id: 'f1', run_id: 'r1', variant: 'broken', reason_code: 'TARGET_NOT_FOCUSABLE', blocked_element: result.blocked_element,
  reason: 'r', diff: null, diff_sha256: 'a'.repeat(64), changed_lines: 4, exorcist_mode: 'scripted', input_tokens: 0,
  output_tokens: 0, cost_usd: 0, latency_ms: 1, status: 'approved', error: null, decided_by: 'demo user', decided_at: 'x',
  decision_note: null, agent_mode: 'scripted', verify: null, regression: null,
};

const voiceRegression = {
  ...result, run_id: 'gv', reason_code: 'NO_ACTIVATION', agent_kind: 'voice',
  step_events: [
    { step: 1, tool: 'voice_type', args: { name: 'Recipient', outcome: 'done', message: 'Type "Test Recipient" in Recipient: done.' }, focused_before: null, focused_after: null, timestamp: 't', screenshot_path: null },
    { step: 2, tool: 'voice_type', args: { name: 'Amount', outcome: 'done', message: 'Type 10.00 in Amount: done.' }, focused_before: null, focused_after: null, timestamp: 't', screenshot_path: null },
    { step: 3, tool: 'voice_click', args: { name: 'Send Payment', outcome: 'failed', message: 'Could not activate Send Payment: no accessible role or name' }, focused_before: null, focused_after: null, timestamp: 't', screenshot_path: null },
  ],
} as unknown as JourneyResult;

function flowOf(fix: Fix, extra: Partial<FixValue> = {}): FixValue {
  return { fix, verifyResult: null, voiceVerifyResult: null, regressionVoiceResult: null, busy: false, error: null,
    propose: vi.fn(async () => {}), approve: vi.fn(async () => {}), reject: vi.fn(async () => {}),
    verify: vi.fn(async () => {}), regression: vi.fn(async () => {}), ...extra };
}

const panels = (flow: FixValue) =>
  render(<PipelineSection result={result} apiStatus="online" activeStep={3} flow={flow} />);

describe('v9 Fixes wording, and Verify stays manual', () => {
  it('after Approve nothing replays until a person presses "Replay both journeys"', async () => {
    const flow = flowOf(approved);
    panels(flow);
    await new Promise((r) => setTimeout(r, 50));
    expect(flow.verify).not.toHaveBeenCalled();
    expect(flow.regression).not.toHaveBeenCalled();
    screen.getByRole('button', { name: 'Replay both journeys' }).focus();
    await userEvent.setup().keyboard('{Enter}');
    expect(flow.verify).toHaveBeenCalledTimes(1);
    expect(flow.regression).not.toHaveBeenCalled();
  });

  it('regression starts only from "Put the bug back and run both tests"', async () => {
    const flow = flowOf({ ...approved, verify: run('v', 'PASSED'), verify_voice: run('vv', 'PASSED') });
    panels(flow);
    expect(flow.regression).not.toHaveBeenCalled();
    screen.getByRole('button', { name: 'Put the bug back and run both tests' }).focus();
    await userEvent.setup().keyboard(' ');
    expect(flow.regression).toHaveBeenCalledTimes(1);
  });
});

describe('regression card from real runs', () => {
  const done = { ...approved, verify: run('v', 'PASSED'), verify_voice: run('vv', 'PASSED'),
    regression: run('g', 'BLOCKED', 'complete', 'TARGET_NOT_FOCUSABLE'), regression_voice: run('gv', 'BLOCKED') };

  it('lists both journeys and the voice agent\'s own FAILED message; white caught ghost; axe clean', async () => {
    const { container } = panels(flowOf(done, { regressionVoiceResult: voiceRegression }));
    const rows = within(screen.getByRole('list', { name: 'Regression steps' })).getAllByRole('listitem').map((r) => r.textContent);
    expect(rows).toEqual([
      'Done: Bug reintroduced on purpose',
      'Done: Keyboard journey',
      'Done: Voice-command simulation',
      'Not done: FAILED: Send Payment not focusable (TARGET_NOT_FOCUSABLE)',
      'Not done: FAILED (voice): Could not activate Send Payment: no accessible role or name',
    ]);
    expect(container.textContent).not.toMatch(/\.spec\.ts|reintroduced\.html/);
    const caught = container.querySelector('[data-ghost-caught="true"]');
    expect(caught?.classList.contains('text-ghost-caught')).toBe(true);
    expect(caught?.getAttribute('aria-hidden')).toBe('true');
    expect(caught?.closest('[role="status"]')?.textContent).toContain('But this time, we caught it.');
    expect(container.querySelector('[data-ghost-state="ready"]')).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("before the voice run's steps load, the FAILED line names no control", () => {
    panels(flowOf(done));
    expect(screen.getByText('FAILED (voice): the voice journey was blocked (NO_ACTIVATION)')).toBeTruthy();
  });

  it('no voice regression run: no voice lines', () => {
    const { container } = panels(flowOf({ ...done, regression_voice: null }));
    expect(container.textContent).not.toMatch(/Voice-command simulation(?!: )|FAILED \(voice\)/);
  });

  it('done rows are ticked after the text; rows not run are not', () => {
    const { container } = panels(flowOf({ ...approved, verify: run('v', 'PASSED') }));
    const reg = within(screen.getByRole('list', { name: 'Regression steps' })).getAllByRole('listitem');
    expect(reg.every((r) => r.querySelector('.row-tick') === null)).toBe(true);
    const ver = within(screen.getByRole('list', { name: 'Verification steps' })).getAllByRole('listitem');
    expect(ver[0].querySelector('.row-tick')?.textContent).toBe('Replaying journey…');
    expect(container.querySelectorAll('.row-tick').length).toBeGreaterThan(0);
  });
});
