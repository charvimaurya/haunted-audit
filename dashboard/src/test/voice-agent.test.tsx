/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { GhostHuntSection } from '../components/journey/GhostHuntSection';
import { VoiceAgentPanel } from '../components/journey/VoiceAgentPanel';
import type { JourneyResult } from '../types';
import {
  extractTargetName,
  interpretVoiceCommand,
  namesFromResult,
} from '../voice/interpretVoiceCommand';

expect.extend(toHaveNoViolations);

function blockedResult(overrides: Partial<JourneyResult> = {}): JourneyResult {
  return {
    run_id: 'test-run',
    verdict: 'BLOCKED',
    reason_code: 'TARGET_NOT_FOCUSABLE',
    focus_trail: [
      {
        tag: 'input',
        role: 'textbox',
        accessible_name: 'Recipient',
        selector_hint: '#recipient',
        bounding_box: null,
        is_visible: true,
      },
    ],
    step_events: [],
    screenshots: [],
    blocked_element: {
      selector: 'div.pay-btn',
      bounding_box: null,
      tag: 'div',
      accessible_name: 'Send Payment',
      text: 'Send Payment',
    },
    agent_mode: 'scripted',
    tokens: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
    latency_ms: 0,
    cost_usd: 0,
    agent_claim: null,
    agent_claim_reason: null,
    agent_claim_mismatch: false,
    target_ever_focused: false,
    last_focused_element: null,
    skipped_element: null,
    variant: 'broken',
    goal: 'Send a payment',
    stop_reason: 'completed',
    error: null,
    ...overrides,
  };
}

describe('interpretVoiceCommand', () => {
  it('extracts Send Payment from common phrasings', () => {
    expect(extractTargetName('click Send Payment')).toBe('Send Payment');
    expect(extractTargetName('activate the Send Payment')).toBe('Send Payment');
    expect(extractTargetName('find Send Payment')).toBe('Send Payment');
  });

  it('with no run returns Not run yet — never invents Found/activate rows', () => {
    const r = interpretVoiceCommand('click Send Payment', null, 'typed');
    expect(r.status).toBe('simulated');
    expect(r.sourceLabel).toBe('voice-command simulation');
    expect(r.outcomes.map((o) => o.label)).toEqual(['Not run yet']);
    expect(r.outcomes.some((o) => /Found by name/i.test(o.label))).toBe(false);
    expect(r.outcomes.some((o) => /Could not activate/i.test(o.label))).toBe(false);
  });

  it('labels speech runs as browser speech recognition and status ran', () => {
    const r = interpretVoiceCommand('click Send Payment', null, 'speech');
    expect(r.status).toBe('ran');
    expect(r.sourceLabel).toBe('browser speech recognition (Chrome)');
  });

  it('derives Found + Could not activate from a real blocked result', () => {
    const result = blockedResult();
    expect(namesFromResult(result)).toContain('Send Payment');
    const r = interpretVoiceCommand('click Send Payment', result, 'typed');
    expect(r.outcomes.map((o) => o.label)).toEqual([
      'Found by name "Send Payment"',
      'Could not activate button',
    ]);
    expect(r.outcomes[1].detail).toBe('TARGET_NOT_FOCUSABLE');
  });

  it('does not invent a match when the name is absent from the run', () => {
    const result = blockedResult({
      blocked_element: {
        selector: 'div.other',
        bounding_box: null,
        tag: 'div',
        accessible_name: 'Confirm',
        text: 'Confirm',
      },
      focus_trail: [],
    });
    const r = interpretVoiceCommand('click Send Payment', result, 'typed');
    expect(r.outcomes[0].label).toMatch(/Could not find/);
    expect(r.outcomes.some((o) => /Found by name/i.test(o.label))).toBe(false);
  });
});

describe('VoiceAgentPanel', () => {
  it('starts as Not run yet and has no hardcoded Found by name row', () => {
    render(<VoiceAgentPanel result={null} />);
    expect(screen.getByText('Not run yet')).toBeTruthy();
    expect(screen.queryByText(/Found by name/i)).toBeNull();
    expect(screen.queryByText(/Could not activate button/i)).toBeNull();
  });

  it('runs a typed command as voice-command simulation against null result', async () => {
    const user = userEvent.setup();
    render(<VoiceAgentPanel result={null} />);
    await user.type(
      screen.getByLabelText('Command'),
      'click Send Payment',
    );
    await user.click(screen.getByRole('button', { name: 'Run command' }));
    expect(screen.getByText('Simulated')).toBeTruthy();
    expect(screen.getByText(/voice-command simulation/i)).toBeTruthy();
    expect(screen.getByText('Not run yet')).toBeTruthy();
  });

  it('shows Found / Could not activate from a real blocked run', async () => {
    const user = userEvent.setup();
    render(<VoiceAgentPanel result={blockedResult()} />);
    await user.type(screen.getByLabelText('Command'), 'click Send Payment');
    await user.click(screen.getByRole('button', { name: 'Run command' }));
    expect(screen.getByText('Found by name "Send Payment"')).toBeTruthy();
    expect(screen.getByText('Could not activate button')).toBeTruthy();
    expect(screen.getByText('TARGET_NOT_FOCUSABLE')).toBeTruthy();
  });

  it('has no axe violations', async () => {
    const { container } = render(<VoiceAgentPanel result={null} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('GhostHuntSection voice honesty', () => {
  it('does not show hardcoded Voice Found/activate rows before a command runs', () => {
    render(<GhostHuntSection result={null} isRunning={false} liveEvents={[]} />);
    expect(screen.getByRole('article', { name: 'Voice Agent' })).toBeTruthy();
    expect(screen.queryByText(/Found by name "Send Payment"/i)).toBeNull();
    // Keyboard card still has its own mock rows — only Voice must stay honest here
    expect(
      screen.getByRole('article', { name: 'Voice Agent' }).textContent,
    ).not.toMatch(/Could not activate button/);
  });
});
