/// <reference types="vitest/globals" />
/** UI fidelity round (docs/ui-fidelity.md D8, D12, D13, D19). */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { GhostHuntSection } from '../components/GhostHuntSection';
import { GhostMascot } from '../components/GhostMascot';
import { PossessionMode } from '../components/PossessionMode';
import { RunStateBadge } from '../components/RunStateBadge';
import { ImmersionProvider } from '../immersion/ImmersionContext';
import { SenseControls } from '../immersion/SenseControls';
import { CONTRAST_STORAGE_KEY } from '../immersion/useHighContrast';
import { findingText } from '../lib/finding';
import { RunContext, type RunValue } from '../runs/runContext';
import type { JourneyResult } from '../types';

const blocked: JourneyResult = {
  run_id: 'r1', verdict: 'BLOCKED', reason_code: 'TARGET_NOT_FOCUSABLE',
  blocked_element: { selector: 'div.pay-btn', bounding_box: null, tag: 'div', accessible_name: null, text: 'Send Payment' },
  focus_trail: [], screenshots: [], agent_mode: 'scripted',
  step_events: [
    { step: 1, tool: 'type_text', args: { text: 'Alex Carter' }, timestamp: 't', screenshot_path: null, focused_after: null,
      focused_before: { tag: 'input', role: 'textbox', accessible_name: 'Recipient', selector_hint: 'input#recipient', bounding_box: null, is_visible: true } },
    { step: 2, tool: 'type_text', args: { text: '50.00' }, timestamp: 't', screenshot_path: null, focused_after: null,
      focused_before: { tag: 'input', role: 'textbox', accessible_name: '', selector_hint: 'input#amount', bounding_box: null, is_visible: true } },
  ],
  tokens: { input_tokens: 0, output_tokens: 0, total_tokens: 0 }, latency_ms: 800, cost_usd: 0,
  agent_claim: null, agent_claim_reason: null, agent_claim_mismatch: false, target_ever_focused: false,
  last_focused_element: null, skipped_element: null, variant: 'broken', goal: 'g', stop_reason: 'completed', error: null,
};

describe('mascot', () => {
  it.each([['ready', 'text-ghost-ready'], ['blocked', 'text-ghost-blocked'], ['verified', 'text-ghost-verified']] as const)(
    '%s is an SVG ghost coloured by its token, not an emoji', (state, cls) => {
      const { container } = render(<GhostMascot state={state} />);
      const ghost = screen.getByTestId('ghost-mascot');
      expect(ghost.className).toContain(cls);
      expect(ghost.querySelector('svg[data-ghost-glyph]')).not.toBeNull();
      expect(container.textContent).not.toContain('👻');
    });

  it('the run-state badge says the state in text, from the last run', () => {
    const ctx = (result: JourneyResult | null) => ({ result, isRunning: false } as unknown as RunValue);
    const { rerender } = render(<RunContext.Provider value={ctx(null)}><RunStateBadge /></RunContext.Provider>);
    expect(screen.getByText('Ready: no run yet')).toBeTruthy();
    rerender(<RunContext.Provider value={ctx(blocked)}><RunStateBadge /></RunContext.Provider>);
    expect(screen.getByText('Blocked: last run found a barrier (scripted)')).toBeTruthy();
    rerender(<RunContext.Provider value={ctx({ ...blocked, verdict: 'PASSED', reason_code: null })}><RunStateBadge /></RunContext.Provider>);
    expect(screen.getByText('Verified: last run passed (scripted)')).toBeTruthy();
  });
});

describe('Critical Ghost Detected', () => {
  it('reads every line from the finding', () => {
    render(<GhostHuntSection result={blocked} apiStatus="online" />);
    expect(screen.getByText('Critical Ghost Detected')).toBeTruthy();
    expect(screen.getByText('Barrier: Send Payment cannot be reached with the keyboard (Tab never lands on it).')).toBeTruthy();
    expect(screen.getByText('WCAG: 2.1.1 Keyboard, 4.1.2 Name, Role, Value')).toBeTruthy();
    expect(screen.getByText('From the checker, scripted mode, broken page.')).toBeTruthy();
  });

  it('is not shown for PASSED, or for a run that only hit a limit', () => {
    expect(findingText({ ...blocked, verdict: 'PASSED', reason_code: null })).toBeNull();
    expect(findingText({ ...blocked, reason_code: 'STEP_LIMIT' })).toBeNull();
    render(<GhostHuntSection result={{ ...blocked, verdict: 'PASSED', reason_code: null }} apiStatus="online" />);
    expect(screen.queryByText('Critical Ghost Detected')).toBeNull();
  });
});

describe('Possession fields', () => {
  it('show what the run typed', () => {
    render(<PossessionMode result={blocked} />);
    expect((screen.getByLabelText('Recipient') as HTMLInputElement).value).toBe('Alex Carter');
    expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('€50.00');
  });
});

describe('high contrast', () => {
  it('is a keyboard switch that is saved and sets data-contrast', async () => {
    const user = userEvent.setup();
    render(<ImmersionProvider><SenseControls /></ImmersionProvider>);
    const btn = screen.getByRole('button', { name: 'High contrast off' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    btn.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'High contrast on' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.contrast).toBe('high');
    expect(localStorage.getItem(CONTRAST_STORAGE_KEY)).toBe('on');
    localStorage.removeItem(CONTRAST_STORAGE_KEY);
    document.documentElement.dataset.contrast = 'normal';
  });
});
