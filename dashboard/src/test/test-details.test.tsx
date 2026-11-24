/** user-typed-test-details REQ-TD-01 to 05: the tester types made-up details; the app never fills one in. */
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { RunControls } from '../components/RunControls';
import { detailsProblems } from '../components/TestDetailsForm';
import { PossessionMode } from '../components/PossessionMode';
import { commandsFromDetails } from '../voice/commandsFromDetails';
import { recordedDetails } from '../runs/record';
import type { JourneyResult, StepEvent, TestDetails } from '../types';
expect.extend(toHaveNoViolations);

const EMPTY: TestDetails = { recipient: '', amount: '', reference: '' };

function Harness({ onRun, requireDetails }: { onRun: () => void; requireDetails?: boolean }) {
  const [d, setD] = useState<TestDetails>(EMPTY);
  return (
    <RunControls variant="broken" mode="scripted" status={null} onVariantChange={() => {}} onModeChange={() => {}}
      onRun={onRun} details={d} onDetailsChange={setD} requireDetails={requireDetails} />
  );
}

describe('Test details form', () => {
  it('shows three labelled, empty fields and the hint, with generic placeholders only', async () => {
    const { container } = render(<Harness onRun={() => {}} />);
    const group = screen.getByRole('group', { name: 'Test details' });
    expect(group).toHaveAccessibleDescription('Use made-up details. This is a test bank.');
    const fields = ['Recipient', 'Amount (EUR)', 'Reference (optional)'].map((l) => screen.getByLabelText(l) as HTMLInputElement);
    for (const f of fields) {
      expect(f.value).toBe('');
      expect(f.maxLength).toBe(40);
    }
    expect(fields.map((f) => f.placeholder)).toEqual(['Test recipient name', 'e.g. 10.00', 'Optional, e.g. Test payment']);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Run Journey with Recipient empty does not run, says so under the field and moves focus there', async () => {
    const onRun = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<Harness onRun={onRun} />);
    screen.getByRole('button', { name: 'Run Journey' }).focus();
    await user.keyboard('{Enter}');
    expect(onRun).not.toHaveBeenCalled();
    const recipient = screen.getByLabelText('Recipient');
    expect(recipient).toHaveFocus();
    expect(recipient).toHaveAttribute('aria-invalid', 'true');
    expect(recipient).toHaveAccessibleDescription('Type a made-up name to continue');
    expect(screen.getByLabelText('Amount (EUR)')).toHaveAccessibleDescription('Use two decimals, like 10.00, up to 1000.00. Type a made-up amount to continue');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('with a name but no amount, focus goes to Amount', async () => {
    const onRun = vi.fn();
    const user = userEvent.setup();
    render(<Harness onRun={onRun} />);
    await user.type(screen.getByLabelText('Recipient'), 'Test Ghost Q');
    await user.click(screen.getByRole('button', { name: 'Run Journey' }));
    expect(onRun).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Amount (EUR)')).toHaveFocus();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('runs once Recipient and Amount are typed; Reference may stay empty', async () => {
    const onRun = vi.fn();
    const user = userEvent.setup();
    render(<Harness onRun={onRun} />);
    await user.type(screen.getByLabelText('Recipient'), 'Test Ghost Q');
    await user.type(screen.getByLabelText('Amount (EUR)'), '10.00');
    await user.click(screen.getByRole('button', { name: 'Run Journey' }));
    expect(onRun).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('a bad amount is refused with "Use two decimals, like 10.00" and focus on Amount; a good one runs', async () => {
    const onRun = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<Harness onRun={onRun} />);
    const amount = screen.getByLabelText('Amount (EUR)');
    expect(amount).toHaveAccessibleDescription('Use two decimals, like 10.00, up to 1000.00.');
    await user.type(screen.getByLabelText('Recipient'), 'Test recipient');
    await user.type(amount, '100');
    await user.click(screen.getByRole('button', { name: 'Run Journey' }));
    expect(onRun).not.toHaveBeenCalled();
    expect(amount).toHaveFocus();
    expect(amount).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert').textContent).toBe('Use two decimals, like 10.00');
    expect(await axe(container)).toHaveNoViolations();
    await user.type(amount, '.00');
    await user.click(screen.getByRole('button', { name: 'Run Journey' }));
    expect(onRun).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('the amount rule matches the bank: two decimals, more than 0.00, at most 1000.00', () => {
    const p = (amount: string) => detailsProblems({ recipient: 'Test recipient', amount, reference: '' }).amount;
    for (const good of ['100.00', '0.01', '1000.00', '10.00']) expect(p(good)).toBeUndefined();
    for (const bad of ['100', '100.0', '€100.00', '100,00', '1,000.00', '050.00', '5e1', '-5.00']) {
      expect(p(bad)).toBe('Use two decimals, like 10.00');
    }
    expect(p('0.00')).toBe('Use more than 0.00. Use two decimals, like 10.00');
    expect(p('1000.01')).toBe('Use 1000.00 or less (the test balance)');
  });

  it('does not ask for details when the run does not use them (edited voice commands)', async () => {
    const onRun = vi.fn();
    render(<Harness onRun={onRun} requireDetails={false} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Run Journey' }));
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('uses the same rule as the API: 40 characters, no control characters', () => {
    expect(detailsProblems({ recipient: 'x'.repeat(40), amount: '1.00', reference: '' })).toEqual({});
    expect(detailsProblems({ recipient: 'x'.repeat(41), amount: '1.00', reference: '' }).recipient).toBe('Use 40 characters or fewer');
    expect(detailsProblems({ recipient: 'a\tb', amount: '1.00', reference: 'r\u202e' })).toEqual({
      recipient: 'Remove special characters such as tabs or line breaks',
      reference: 'Remove special characters such as tabs or line breaks',
    });
  });
});

describe('voice commands from the details', () => {
  it('types exactly the typed values, then clicks Send Payment', () => {
    expect(commandsFromDetails({ recipient: ' Test Ghost Q ', amount: '10.00', reference: 'Ref 1' })).toEqual([
      'type "Test Ghost Q" in Recipient', 'type "10.00" in Amount', 'type "Ref 1" in Reference', 'click Send Payment',
    ]);
    expect(commandsFromDetails({ recipient: 'Say "hi"', amount: '1.00', reference: '' })[0]).toBe(`type 'Say "hi"' in Recipient`);
    expect(commandsFromDetails(EMPTY)).toEqual([]);
  });
});

const snap = (hint: string) => ({ tag: 'input', role: 'textbox', accessible_name: hint, selector_hint: `input#${hint}`, bounding_box: null, is_visible: true });
function typeStep(step: number, hint: string, text: string): StepEvent {
  return { step, tool: 'type_text', args: { text }, focused_before: snap(hint), focused_after: snap(hint), timestamp: '', screenshot_path: null } as StepEvent;
}
const run = {
  run_id: 'r', verdict: 'PASSED', reason_code: null, variant: 'fixed', agent_mode: 'scripted',
  focus_trail: [snap('recipient'), snap('amount'), snap('reference')],
  step_events: [typeStep(3, 'recipient', 'Test Ghost Q'), typeStep(5, 'amount', '10.00'), typeStep(7, 'reference', 'Ref 1')],
} as unknown as JourneyResult;

describe('Possession checklist replay (REQ-TD-05)', () => {
  it('shows what the agent typed in each field, from the run record', () => {
    render(<PossessionMode result={run} runDetails={{ recipient: 'Test Ghost Q', amount: '10.00', reference: 'Ref 1' }} />);
    const list = screen.getByRole('list', { name: 'Tab step results' });
    const rows = within(list).getAllByRole('listitem').map((li) => li.textContent);
    expect(rows[0]).toContain('Tab to Recipient');
    expect(rows[0]).toContain('Typed: Test Ghost Q');
    expect(rows[1]).toContain('Typed: 10.00');
    expect(rows[2]).toContain('Tab to Reference');
    expect(rows[2]).toContain('Typed: Ref 1');
  });
  it('shows no typed value for a run without test_details (internal default)', () => {
    const { container } = render(<PossessionMode result={run} runDetails={null} />);
    expect(container.textContent).not.toContain('Typed:');
    expect(container.textContent).not.toContain('Tab to Reference');
  });
  it('the bank drawing fields always start empty', () => {
    render(<PossessionMode result={run} runDetails={{ recipient: 'Test Ghost Q', amount: '10.00', reference: 'Ref 1' }} />);
    for (const id of ['pm-recipient', 'pm-amount', 'pm-reference']) {
      expect((document.getElementById(id) as HTMLInputElement).value).toBe('');
    }
  });
  it('recordedDetails drops details of a crashed run', () => {
    const d = { recipient: 'Test Ghost Q', amount: '1.00', reference: null };
    expect(recordedDetails({ status: 'complete', result: run, test_details: d })).toEqual(d);
    expect(recordedDetails({ status: 'error', result: { error: 'x' }, test_details: d })).toBeNull();
    expect(recordedDetails({ status: 'complete', result: run })).toBeNull();
  });
});
