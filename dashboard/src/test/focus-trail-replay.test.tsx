/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { FocusTrailReplay } from '../components/journey/FocusTrailReplay';
import { PossessionMode } from '../components/journey/PossessionMode';
import { ImmersionProvider } from '../immersion/ImmersionContext';
import { CALM_STORAGE_KEY } from '../immersion/motion';
import type { JourneyResult } from '../types';

expect.extend(toHaveNoViolations);

const snap = (selector_hint: string, role = 'textbox', accessible_name = '') => ({
  tag: 'input', role, accessible_name, selector_hint, bounding_box: null, is_visible: true,
});

const blockedResult: JourneyResult = {
  run_id: 'r1', verdict: 'BLOCKED', reason_code: 'TARGET_NOT_FOCUSABLE',
  blocked_element: { selector: 'div.pay-btn', bounding_box: null, tag: 'div', accessible_name: null, text: 'Send Payment' },
  focus_trail: [snap('#recipient'), snap('#amount')],
  screenshots: [], agent_mode: 'scripted', step_events: [],
  tokens: { input_tokens: 0, output_tokens: 0, total_tokens: 0 }, latency_ms: 100, cost_usd: 0,
  agent_claim: null, agent_claim_reason: null, agent_claim_mismatch: false, target_ever_focused: false,
  last_focused_element: null, skipped_element: null, variant: 'broken', goal: 'g', stop_reason: 'completed', error: null,
};

describe('FocusTrailReplay (UR-03)', () => {
  it('says "Not run yet" with no run, and running text while running', () => {
    const { rerender } = render(
      <ImmersionProvider><FocusTrailReplay result={null} isRunning={false} /></ImmersionProvider>,
    );
    expect(screen.getByText('Not run yet.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Replay focus trail' })).toBeNull();

    rerender(<ImmersionProvider><FocusTrailReplay result={null} isRunning /></ImmersionProvider>);
    expect(screen.getByText('The keyboard path is not ready: the run is still going.')).toBeTruthy();
  });

  it('says "No keyboard trail in this run" for an empty trail', () => {
    render(
      <ImmersionProvider>
        <FocusTrailReplay result={{ ...blockedResult, focus_trail: [] }} isRunning={false} />
      </ImmersionProvider>,
    );
    expect(screen.getByText('No keyboard trail in this run.')).toBeTruthy();
  });

  it('cycles through stops by click, Enter and Space and cleans up axe', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ImmersionProvider><PossessionMode result={blockedResult} /></ImmersionProvider>,
    );
    expect(screen.getByText('Tab never landed on Send Payment')).toBeTruthy();
    expect(screen.getByText('Replay of the keyboard path on this drawing')).toBeTruthy();

    const btn = screen.getByRole('button', { name: 'Replay focus trail' });
    await user.click(btn);
    expect(screen.getByRole('button', { name: 'Next stop' })).toBeTruthy();
    expect(screen.getByRole('status', { hidden: false }).textContent).toContain('Stop 1 of 2: Recipient');

    btn.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('status', { hidden: false }).textContent).toContain('Stop 2 of 2: Amount');

    await user.keyboard(' ');
    expect(screen.getByRole('status', { hidden: false }).textContent).toContain('Replay finished');
    expect(screen.getByRole('button', { name: 'Replay focus trail' })).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Calm mode hides replay button and renders static badges', () => {
    localStorage.setItem(CALM_STORAGE_KEY, 'on');
    const { container } = render(
      <ImmersionProvider><PossessionMode result={blockedResult} /></ImmersionProvider>,
    );
    expect(screen.queryByRole('button', { name: /replay focus trail/i })).toBeNull();
    expect(container.querySelectorAll('[data-trail-badge]').length).toBe(2);
    localStorage.removeItem(CALM_STORAGE_KEY);
  });
});
