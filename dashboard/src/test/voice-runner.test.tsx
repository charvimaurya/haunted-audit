/// <reference types="vitest/globals" />
/**
 * Voice panel driving the real bank through the API (voice-agent REQ-VA-07, 08, 10).
 * fetch and EventSource are stubbed with the exact shapes the API returns (data-contract.md).
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VoiceAgentPanel } from '../components/journey/VoiceAgentPanel';
import { RunContext, type RunValue } from '../runs/runContext';
import { commandsFrom } from '../voice/useVoiceRun';

expect.extend(toHaveNoViolations);

const STEPS = [
  { step: 1, tool: 'voice_type', args: { outcome: 'done', message: 'Type "Test recipient" in Recipient: done.' } },
  { step: 2, tool: 'voice_type', args: { outcome: 'failed', message: 'Could not type in Amount: no accessible label',
    element: { tag: 'span', text: 'Amount (EUR)' } } },
  { step: 3, tool: 'voice_click', args: { outcome: 'failed', message: 'Could not activate Send Payment: no accessible role or name',
    element: { tag: 'div', text: 'Send Payment' } } },
].map((s) => ({ ...s, focused_before: null, focused_after: null, timestamp: '2026-11-22T00:00:00Z', screenshot_path: null }));

class FakeEventSource {
  static last: FakeEventSource | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  listeners: Record<string, () => void> = {};
  constructor(public url: string) {
    FakeEventSource.last = this;
  }
  addEventListener(name: string, fn: () => void) {
    this.listeners[name] = fn;
  }
  close() {}
  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
  done() {
    this.listeners.done?.();
  }
}

function ctx(over: Partial<RunValue> = {}): RunValue {
  return {
    variant: 'broken', mode: 'scripted', runStatus: null, result: null, liveEvents: [], notice: null,
    isRunning: false, apiStatus: 'online', runError: null, setVariant: () => {}, setMode: () => {},
    run: async () => {}, ...over,
  };
}

function stubApi(record: unknown) {
  const calls: { url: string; body?: unknown }[] = [];
  vi.stubGlobal('EventSource', FakeEventSource);
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (url.endsWith('/voice-runs')) {
      return Promise.resolve(new Response(JSON.stringify({ run_id: 'v1', status: 'running' }), { status: 202 }));
    }
    return Promise.resolve(new Response(JSON.stringify(record), { status: 200 }));
  }));
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

function renderOnline(value = ctx()) {
  return render(
    <RunContext.Provider value={value}>
      <VoiceAgentPanel result={null} />
    </RunContext.Provider>,
  );
}

describe('voice panel with the API online', () => {
  it('sends one command per line, shows steps live, then the checker verdict', async () => {
    const calls = stubApi({ status: 'complete', result: { run_id: 'v1', verdict: 'BLOCKED', reason_code: 'NO_ACTIVATION',
      agent_mode: 'scripted', variant: 'broken', step_events: STEPS, agent_kind: 'voice', input_source: 'typed' } });
    const user = userEvent.setup();
    const { container } = renderOnline();
    expect(screen.getByText(/Runs your commands on the Haunted Bank test site \(broken page\)/)).toBeTruthy();
    await user.type(screen.getByLabelText('Command'), 'type "Test recipient" in Recipient{enter}type 50.00 in Amount{enter}click Send Payment');
    await user.click(screen.getByRole('button', { name: 'Run command' }));
    await waitFor(() => expect(FakeEventSource.last).not.toBeNull());
    expect(calls[0].body).toEqual({ variant: 'broken', input_source: 'typed',
      commands: ['type "Test recipient" in Recipient', 'type 50.00 in Amount', 'click Send Payment'] });
    FakeEventSource.last!.emit(STEPS[0]);
    expect(await screen.findByText('Type "Test recipient" in Recipient: done.')).toBeTruthy();
    FakeEventSource.last!.emit(STEPS[2]);
    FakeEventSource.last!.done();
    expect(await screen.findByText(/Checker: BLOCKED \(NO_ACTIVATION\)\. Voice agent, scripted mode, broken page\./)).toBeTruthy();
    const steps = screen.getByRole('list', { name: 'Voice Agent steps' });
    expect(within(steps).getByText('Could not activate Send Payment: no accessible role or name')).toBeTruthy();
    expect(within(steps).getAllByText(/^Failed:/)).toHaveLength(2);
    expect(within(steps).getByText(/Element: div "Send Payment"/)).toBeTruthy();
    expect(screen.getByText('voice-command simulation')).toBeTruthy();
    expect(container.querySelector('[data-example]')).toBeNull(); // a real run is not an example
    expect(await axe(container)).toHaveNoViolations();
  });

  it('never shows a crashed voice run as a verdict', async () => {
    stubApi({ status: 'error', result: { run_id: 'v1', verdict: 'BLOCKED', error: 'BrowserType.launch: Executable missing' } });
    const user = userEvent.setup();
    renderOnline();
    await user.type(screen.getByLabelText('Command'), 'click Send Payment');
    await user.click(screen.getByRole('button', { name: 'Run command' }));
    await waitFor(() => expect(FakeEventSource.last).not.toBeNull());
    FakeEventSource.last!.done();
    expect(await screen.findByText(/The run did not finish, so no result is shown\. BrowserType\.launch/)).toBeTruthy();
    expect(screen.queryByText(/Checker:/)).toBeNull();
  });

  it('falls back to the labelled simulation when the API stops answering', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('offline'))));
    const user = userEvent.setup();
    renderOnline();
    await user.type(screen.getByLabelText('Command'), 'click Send Payment');
    await user.click(screen.getByRole('button', { name: 'Run command' }));
    expect(await screen.findByText('Example only, not a real run')).toBeTruthy();
    expect(screen.getByText('Simulated')).toBeTruthy();
  });
});

describe('voice panel with the API offline', () => {
  it('says the bank cannot be driven and has no axe violations', async () => {
    const { container } = renderOnline(ctx({ apiStatus: 'offline' }));
    expect(screen.getByText(/The audit service is not answering, so the bank cannot be driven/)).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('commandsFrom', () => {
  it('takes one command per non-empty line, at most 10', () => {
    expect(commandsFrom(' click A \n\n type x in B\n')).toEqual(['click A', 'type x in B']);
    expect(commandsFrom(Array(12).fill('click A').join('\n'))).toHaveLength(10);
  });
});
