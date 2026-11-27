/// <reference types="vitest/globals" />
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AutoLoopCard } from '../components/fixes/AutoLoopCard';

expect.extend(toHaveNoViolations);

const blockedRun = {
  status: 'complete',
  result: { run_id: 'r1', verdict: 'BLOCKED', reason_code: 'TARGET_NOT_FOCUSABLE', agent_mode: 'scripted', stop_reason: 'completed', error: null },
};
const proposed = {
  fix_id: 'f1', status: 'proposed', reason: 'Send Payment is a div, so Tab never reaches it.', diff: '-old\n+new\n', diff_sha256: 'abc',
  changed_lines: 4, blocked_element: { tag: 'div', text: 'Send Payment', accessible_name: null }, error: null, verify: null, verify_voice: null,
};
const verified = {
  ...proposed, status: 'approved',
  verify: { run_id: 'v1', status: 'complete', verdict: 'PASSED', reason_code: null, agent_mode: 'scripted' },
  verify_voice: { run_id: 'v2', status: 'complete', verdict: 'PASSED', reason_code: null, agent_mode: 'scripted' },
};

function stubApi() {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const ok = (data: unknown, status = 200) => ({ ok: true, status, json: async () => data }) as Response;
    if (url.endsWith('/runs') && init?.method === 'POST') return ok({ run_id: 'r1' }, 202);
    if (url.endsWith('/runs/r1')) return ok(blockedRun);
    if (url.endsWith('/runs/r1/fixes')) return ok(proposed, 201);
    if (url.endsWith('/approve')) return ok(proposed);
    if (url.endsWith('/verify')) return ok({ run_id: 'v1' }, 202);
    if (url.endsWith('/fixes/f1')) return ok(verified);
    throw new Error(`unexpected ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('AutoLoopCard', () => {
  it('has no axe violations when idle', async () => {
    const { container } = render(<AutoLoopCard recipient="" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows the cause, waits for approval, then shows the checker verdicts', async () => {
    stubApi();
    const user = userEvent.setup();
    const { container } = render(<AutoLoopCard recipient="" />);
    await user.click(screen.getByRole('button', { name: /run the whole loop/i }));
    expect(await screen.findByText(/Broken page: BLOCKED \(TARGET_NOT_FOCUSABLE\)/)).toBeTruthy();
    expect(screen.getByText(/Cause: Send Payment is a div/)).toBeTruthy();
    expect(screen.queryByText(/Fixed copy/)).toBeNull(); // nothing runs before a person approves
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: /approve and run/i }));
    await waitFor(() => expect(screen.getByText(/Fixed copy, keyboard: PASSED/)).toBeTruthy());
    expect(screen.getByText(/Fixed copy, voice: PASSED.*scripted mode/)).toBeTruthy();
  });

  it('says so when the service does not answer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    const user = userEvent.setup();
    render(<AutoLoopCard recipient="" />);
    await user.click(screen.getByRole('button', { name: /run the whole loop/i }));
    expect(await screen.findByText('The audit service did not answer.')).toBeTruthy();
  });
});
