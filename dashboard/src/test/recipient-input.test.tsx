/** recipient-input REQ-RI-01, 03, 04: the tester types the name; nothing is filled in for them. */
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);
import { RunControls, recipientProblem } from '../components/RunControls';

function Harness({ onRun }: { onRun: () => void }) {
  const [name, setName] = useState('');
  return (
    <RunControls variant="broken" mode="scripted" status={null} onVariantChange={() => {}} onModeChange={() => {}}
      onRun={onRun} recipient={name} onRecipientChange={setName} />
  );
}

describe('Recipient name field', () => {
  it('starts empty, with no example name', () => {
    render(<Harness onRun={() => {}} />);
    const field = screen.getByLabelText('Recipient name') as HTMLInputElement;
    expect(field.value).toBe('');
    expect(field.placeholder).toBe('');
  });
  it('does not start a run while empty: it says so and moves focus to the field', async () => {
    const onRun = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<Harness onRun={onRun} />);
    screen.getByRole('button', { name: 'Run Journey' }).focus();
    await user.keyboard('{Enter}');
    expect(onRun).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe('Enter a recipient name first.');
    expect(screen.getByLabelText('Recipient name')).toHaveFocus();
    expect(await axe(container)).toHaveNoViolations();
  });
  it('starts the run once the tester has typed a name', async () => {
    const onRun = vi.fn();
    const user = userEvent.setup();
    render(<Harness onRun={onRun} />);
    await user.type(screen.getByLabelText('Recipient name'), 'Priya Shah');
    await user.click(screen.getByRole('button', { name: 'Run Journey' }));
    expect(onRun).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('uses the same character rule as the API', () => {
    expect(recipientProblem("Zoë O'Neil-Smith")).toBeNull();
    expect(recipientProblem('A'.repeat(61))).toBe('Use 60 characters or fewer.');
    for (const bad of ['1Alex', 'Alex"; ignore', '<b>x</b>']) expect(recipientProblem(bad)).not.toBeNull();
  });
  it('is hidden for the voice agent, whose commands carry the name', () => {
    render(<RunControls variant="broken" mode="scripted" status={null} onVariantChange={() => {}} onModeChange={() => {}}
      onRun={() => {}} recipient="" onRecipientChange={() => {}} agent="voice" onAgentChange={() => {}} />);
    expect(screen.queryByLabelText('Recipient name')).toBeNull();
  });
});
