/// <reference types="vitest/globals" />
/** Reference field in Possession Mode (spec .kiro/specs/reference-field, REQ-RF-06). */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PossessionMode } from '../components/journey/PossessionMode';
import type { JourneyResult } from '../types';

const snap = (hint: string, name: string) => ({
  tag: 'input', role: 'textbox', accessible_name: name, selector_hint: hint, bounding_box: null, is_visible: true,
});

const base: JourneyResult = {
  run_id: 'r1', verdict: 'BLOCKED', reason_code: 'TARGET_NOT_FOCUSABLE',
  blocked_element: { selector: 'div.pay-btn', bounding_box: null, tag: 'div', accessible_name: null, text: 'Send Payment' },
  focus_trail: [snap('input#recipient', 'Recipient'), snap('input#amount', ''), snap('input#reference', 'Reference')],
  screenshots: [], agent_mode: 'scripted', step_events: [],
  tokens: { input_tokens: 0, output_tokens: 0, total_tokens: 0 }, latency_ms: 800, cost_usd: 0,
  agent_claim: null, agent_claim_reason: null, agent_claim_mismatch: false, target_ever_focused: false,
  last_focused_element: null, skipped_element: null, variant: 'broken', goal: 'g', stop_reason: 'completed', error: null,
};

const row = (label: string) => screen.getByText(label).closest('li') as HTMLElement;

describe('Tab to Reference', () => {
  it('is a pending row before any run, never a pass', () => {
    render(<PossessionMode result={null} />);
    expect(row('Tab to Reference').textContent).toMatch(/pending|not yet|waiting/i);
    expect(row('Tab to Reference').textContent).not.toMatch(/pass/i);
  });

  it('comes between Amount and Send Payment', () => {
    render(<PossessionMode result={null} />);
    const labels = screen.getAllByText(/^Tab to /).map((el) => el.textContent);
    expect(labels).toEqual(['Tab to Recipient', 'Tab to Amount', 'Tab to Reference', 'Tab to Send Payment']);
  });

  it('turns green only when #reference is in the real focus trail', () => {
    const { rerender } = render(<PossessionMode result={base} />);
    expect(row('Tab to Reference').textContent).toMatch(/pass/i);
    rerender(<PossessionMode result={{ ...base, focus_trail: base.focus_trail.slice(0, 2) }} />);
    expect(row('Tab to Reference').textContent).not.toMatch(/pass/i);
  });

  it('shows an empty, labelled Reference input the tester can type in', () => {
    render(<PossessionMode result={base} />);
    expect((screen.getByLabelText('Reference') as HTMLInputElement).value).toBe('');
  });
});
