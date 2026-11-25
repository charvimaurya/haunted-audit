/// <reference types="vitest/globals" />
/** loop-evidence LE-02: keyboard and voice Verifier evidence, from measured copy runs only. */
import { render, screen, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PipelineSection } from '../components/PipelineSection';
import { VerifierEvidence, evidenceWord, firstVoiceFailure } from '../components/VerifierEvidence';
import { FixContext, type CopyRun, type Fix, type FixValue } from '../fixes/fixContext';
import Reports from '../pages/app/Reports';
import { RunContext, type RunValue } from '../runs/runContext';
import type { JourneyResult } from '../types';

expect.extend(toHaveNoViolations);

const run = (id: string, verdict: CopyRun['verdict'], status: CopyRun['status'] = 'complete', reason: string | null = null): CopyRun => ({
  run_id: id, status, verdict, reason_code: verdict === 'BLOCKED' ? reason ?? 'NO_ACTIVATION' : null, agent_mode: 'scripted', error: null,
});

const original = {
  run_id: 'r1', verdict: 'BLOCKED', reason_code: 'TARGET_NOT_FOCUSABLE', agent_mode: 'scripted', variant: 'broken',
  blocked_element: { selector: 'div.pay-btn', bounding_box: null, tag: 'div', accessible_name: null, text: 'Send Payment' },
  focus_trail: [], step_events: [], screenshots: [], tokens: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
  latency_ms: 1, cost_usd: 0, agent_claim: null, agent_claim_reason: null, agent_claim_mismatch: false,
  target_ever_focused: false, last_focused_element: null, skipped_element: null, goal: 'g', stop_reason: 'completed', error: null,
} as JourneyResult;

const voiceBlocked = {
  ...original, run_id: 'voice-v', reason_code: 'NO_ACTIVATION', agent_kind: 'voice',
  step_events: [
    { step: 1, tool: 'voice_type', args: { name: 'Recipient', outcome: 'done', message: 'Type "Test Recipient" in Recipient: done.' }, focused_before: null, focused_after: null, timestamp: 't', screenshot_path: null },
    { step: 2, tool: 'voice_type', args: { name: 'Amount', outcome: 'failed', message: 'Could not type in Amount: no accessible label' }, focused_before: null, focused_after: null, timestamp: 't', screenshot_path: null },
    { step: 3, tool: 'voice_click', args: { name: 'Send Payment', outcome: 'done', message: 'Click Send Payment: done.' }, focused_before: null, focused_after: null, timestamp: 't', screenshot_path: null },
  ],
} as unknown as JourneyResult;

const base: Fix = {
  fix_id: 'f1', run_id: 'r1', variant: 'broken', reason_code: 'TARGET_NOT_FOCUSABLE', blocked_element: original.blocked_element,
  reason: 'r', diff: null, diff_sha256: 'a'.repeat(64), changed_lines: 2, exorcist_mode: 'scripted', input_tokens: 0,
  output_tokens: 0, cost_usd: 0, latency_ms: 1, status: 'approved', error: null, decided_by: 'demo user', decided_at: 'x',
  decision_note: null, agent_mode: 'scripted', verify: null, regression: null,
};

const noop = async () => {};
const flowOf = (fix: Fix | null, voice: JourneyResult | null = null): FixValue => ({
  fix, verifyResult: null, voiceVerifyResult: voice, busy: false, error: null,
  propose: noop, approve: noop, reject: noop, verify: noop, regression: noop,
});

function panels(fix: Fix, voice: JourneyResult | null = null) {
  return render(<PipelineSection result={original} apiStatus="online" activeStep={3} flow={flowOf(fix, voice)} />);
}

describe('Verifier evidence', () => {
  it('says VERIFIED only for a PASSED verdict', () => {
    expect(evidenceWord(null)).toBe('Not run yet');
    expect(evidenceWord(run('a', null, 'running'))).toBe('Running');
    expect(evidenceWord(run('a', null, 'error'))).toBe('The run failed, so no result is shown');
    expect(evidenceWord(run('a', 'BLOCKED'))).toBe('Not verified');
    expect(evidenceWord(run('a', 'PASSED'))).toBe('VERIFIED');
  });

  it('reads the first voice step that did not work', () => {
    expect(firstVoiceFailure(voiceBlocked)).toBe('Could not type in Amount: no accessible label');
    expect(firstVoiceFailure(null)).toBeNull();
  });

  it('shows each run with its own run ID and mode', () => {
    render(<VerifierEvidence fix={{ ...base, verify: run('kb-run-1', 'PASSED'), verify_voice: run('voice-run-2', 'BLOCKED') }} voiceResult={voiceBlocked} />);
    const rows = within(screen.getByRole('list', { name: 'Verifier evidence' })).getAllByRole('listitem');
    expect(rows[0].textContent).toBe('Keyboard journey: VERIFIEDRun kb-run-1, scripted mode');
    expect(rows[1].textContent).toBe(
      'Voice-command simulation: Not verifiedRun voice-run-2, scripted mode, NO_ACTIVATIONCould not type in Amount: no accessible label');
  });

  it('with no fix both rows are Not run yet and nothing says VERIFIED', () => {
    const { container } = render(<VerifierEvidence fix={null} />);
    expect(screen.getByText('Keyboard journey: Not run yet')).toBeTruthy();
    expect(screen.getByText('Voice-command simulation: Not run yet')).toBeTruthy();
    expect(container.textContent).not.toMatch(/VERIFIED/);
  });
});

describe('Verification panel with keyboard and voice', () => {
  it('keyboard PASSED, voice BLOCKED: BLOCKED to VERIFIED, Keyboard only, the voice reason, axe clean', async () => {
    const { container } = panels({ ...base, verify: run('kb', 'PASSED'), verify_voice: run('vv', 'BLOCKED') }, voiceBlocked);
    expect(screen.getByText('Journey Verified')).toBeTruthy();
    expect(screen.getByText('Keyboard only')).toBeTruthy();
    expect(screen.queryByText('Keyboard and voice')).toBeNull();
    expect(screen.getByText('BLOCKED')).toBeTruthy();
    expect(screen.getByText('Could not type in Amount: no accessible label')).toBeTruthy();
    // The voice click itself worked on the patched copy, so its checklist row is done.
    const steps = within(screen.getByRole('list', { name: 'Verification steps' })).getAllByRole('listitem');
    expect(steps.map((s) => s.textContent)).toContain('Done: Say "click Send Payment"');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('both PASSED: Keyboard and voice', () => {
    panels({ ...base, verify: run('kb', 'PASSED'), verify_voice: run('vv', 'PASSED') });
    expect(screen.getByText('Keyboard and voice')).toBeTruthy();
    expect(screen.getByText('Voice-command simulation: VERIFIED')).toBeTruthy();
  });

  it('keyboard BLOCKED on the copy: no VERIFIED anywhere', () => {
    const { container } = panels({ ...base, verify: run('kb', 'BLOCKED', 'complete', 'TARGET_NOT_FOCUSABLE'), verify_voice: run('vv', 'BLOCKED') });
    expect(screen.queryByText('Journey Verified')).toBeNull();
    expect(container.textContent).not.toMatch(/VERIFIED/);
  });

  it('while running, both rows say Running', () => {
    panels({ ...base, verify: run('kb', null, 'running'), verify_voice: run('vv', null, 'running') });
    expect(screen.getByText('Keyboard journey: Running')).toBeTruthy();
    expect(screen.getByText('Voice-command simulation: Running')).toBeTruthy();
  });
});

describe('Regression panel voice line', () => {
  const kb = { verify: run('kb', 'PASSED'), regression: run('g', 'BLOCKED', 'complete', 'TARGET_NOT_FOCUSABLE') };

  it('voice not verified first: not counted', () => {
    panels({ ...base, ...kb, verify_voice: run('vv', 'BLOCKED'), regression_voice: run('gv', 'BLOCKED') });
    expect(screen.getByText('Voice: not counted, the voice journey was not verified first.')).toBeTruthy();
    expect(screen.queryByText(/FAILED \(voice\)/)).toBeNull();
  });

  it('voice verified first and blocked with the bug back: FAILED (voice)', () => {
    panels({ ...base, ...kb, verify_voice: run('vv', 'PASSED'), regression_voice: run('gv', 'BLOCKED') });
    expect(screen.getByText('FAILED (voice): the voice journey was blocked (NO_ACTIVATION)')).toBeTruthy();
  });
});

describe('Reports page', () => {
  const ctx = { result: null, mode: 'scripted', isRunning: false, apiStatus: 'online', runError: null } as unknown as RunValue;

  it('shows the two evidence rows from the fix, axe clean', async () => {
    const { container } = render(
      <MemoryRouter>
        <RunContext.Provider value={ctx}>
          <FixContext.Provider value={flowOf({ ...base, verify: run('kb-77', 'PASSED'), verify_voice: run('vv-88', 'BLOCKED') }, voiceBlocked)}>
            <Reports />
          </FixContext.Provider>
        </RunContext.Provider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Verifier evidence (patched copy)' })).toBeTruthy();
    expect(screen.getByText('Keyboard journey: VERIFIED')).toBeTruthy();
    expect(screen.getByText('kb-77')).toBeTruthy();
    expect(screen.getByText('vv-88')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('without a fix: Not run yet', () => {
    render(
      <MemoryRouter>
        <RunContext.Provider value={ctx}>
          <Reports />
        </RunContext.Provider>
      </MemoryRouter>,
    );
    expect(screen.getByText('Keyboard journey: Not run yet')).toBeTruthy();
    expect(screen.getByText('Voice-command simulation: Not run yet')).toBeTruthy();
  });
});
