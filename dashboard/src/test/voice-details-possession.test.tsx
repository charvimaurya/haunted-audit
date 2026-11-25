/// <reference types="vitest/globals" />
/**
 * Possession Mode, voice agent: the Test details form fills from a voice run (user-typed-test-details REQ-TD-11).
 * MOCKED SPEECH: SpeechRecognition is a fake that returns one transcript. This is not a real speech test.
 * The API is stubbed with the real responses of runs ff6c5937 and c98da1a2 (GET /runs/{id} shape), and the
 * step stream replays their real step events. Assertions read the inputs' actual `value`.
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../AppRoutes';
import { ImmersionProvider } from '../immersion/ImmersionContext';
import blockedRun from './fixtures/voice-run-ff6c5937.json';
import passedRun from './fixtures/voice-run-c98da1a2.json';

type Rec = { run_id: string; result: { step_events: unknown[] } };

class FakeEventSource {
  static all: FakeEventSource[] = [];
  onmessage: ((e: { data: string }) => void) | null = null;
  listeners: Record<string, () => void> = {};
  constructor(public url: string) {
    FakeEventSource.all.push(this);
  }
  addEventListener(name: string, fn: () => void) {
    this.listeners[name] = fn;
  }
  close() {}
  step(record: Rec, i: number) {
    act(() => this.onmessage?.({ data: JSON.stringify(record.result.step_events[i]) }));
  }
  async done() {
    await act(async () => this.listeners.done?.());
  }
}

/** A fake recogniser: start() hands back the transcript, then ends. */
let transcript = '';
class FakeRecognition {
  continuous = false; interimResults = false; lang = '';
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start() {
    setTimeout(() => {
      this.onresult?.({ results: [[{ transcript, confidence: 0.9 }]] });
      this.onend?.();
    }, 0);
  }
  stop() {}
  abort() {}
}

let queue: Rec[] = [];
const posted: unknown[] = [];

beforeEach(() => {
  FakeEventSource.all = [];
  posted.length = 0;
  vi.stubGlobal('EventSource', FakeEventSource);
  vi.stubGlobal('webkitSpeechRecognition', FakeRecognition);
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
    if (url.endsWith('/health')) return json({ status: 'ok' });
    if (url.endsWith('/voice-runs')) {
      posted.push(JSON.parse(String(init?.body)));
      return json({ run_id: queue[posted.length - 1].run_id, status: 'running' }, 202);
    }
    const hit = [blockedRun, passedRun].find((r) => url.endsWith(`/runs/${r.run_id}`));
    if (hit) return json(hit);
    return json({ detail: 'not stubbed' }, 404);
  }));
});
afterEach(() => vi.unstubAllGlobals());

function renderPossession() {
  return render(
    <MemoryRouter initialEntries={['/app/journeys/send-payment/possession?agent=voice']}>
      <ImmersionProvider>
        <AppRoutes />
      </ImmersionProvider>
    </MemoryRouter>,
  );
}
const recipient = () => screen.getByLabelText('Recipient') as HTMLInputElement;
const amount = () => screen.getByLabelText('Amount (EUR)') as HTMLInputElement;

async function speak(user: ReturnType<typeof userEvent.setup>, text: string) {
  transcript = text;
  const before = FakeEventSource.all.length;
  await user.click(await screen.findByRole('button', { name: 'Push to talk' }));
  await waitFor(() => expect(FakeEventSource.all.length).toBe(before + 1));
  return FakeEventSource.all[before];
}

describe('voice run fills the Test details form (mocked speech)', () => {
  it('ff6c5937: Recipient fills from the done step; the failed Amount step leaves Amount empty', async () => {
    queue = [blockedRun as Rec];
    const user = userEvent.setup();
    renderPossession();
    const sse = await speak(user, 'send 10 dollars to Test Recipient');
    expect(posted[0]).toMatchObject({ input_source: 'speech' });
    sse.step(blockedRun as Rec, 0);
    await waitFor(() => expect(recipient().value).toBe('Test Recipient'));
    sse.step(blockedRun as Rec, 1);
    sse.step(blockedRun as Rec, 2);
    await sse.done();
    await screen.findByText(/Checker: BLOCKED \(NO_ACTIVATION\)/);
    expect(amount().value).toBe('');
    expect(recipient().value).toBe('Test Recipient');
  });

  it('the form is locked during a run; an edit after it survives a late repeat of the same run\'s steps', async () => {
    queue = [passedRun as Rec];
    const user = userEvent.setup();
    renderPossession();
    const sse = await speak(user, 'send 10 dollars to Test Recipient');
    sse.step(passedRun as Rec, 0);
    await waitFor(() => expect(recipient().value).toBe('Test Recipient'));
    expect(amount().disabled).toBe(true); // RunControls locks the form while a run is going (existing behaviour)
    sse.step(passedRun as Rec, 1);
    sse.step(passedRun as Rec, 2);
    await sse.done(); // final record replays all three steps
    await screen.findByText(/Checker: PASSED/);
    expect(amount().value).toBe('10.00');
    await user.clear(amount());
    await user.type(amount(), '20.00'); // the tester's own edit, after the run
    sse.step(passedRun as Rec, 1); // the same run's Amount step delivered again
    expect(amount().value).toBe('20.00');
    expect(recipient().value).toBe('Test Recipient');
  });

  it('a new run may fill again; a late step from the earlier run is ignored', async () => {
    queue = [blockedRun as Rec, passedRun as Rec];
    const user = userEvent.setup();
    renderPossession();
    const first = await speak(user, 'send 10 dollars to Test Recipient');
    first.step(blockedRun as Rec, 0);
    await first.done();
    await screen.findByText(/Checker: BLOCKED/);
    await user.clear(recipient());
    await user.type(recipient(), 'Test Recipient B');
    const second = await speak(user, 'send 10 dollars to Test Recipient');
    first.step(passedRun as Rec, 1); // late event on the first run's stream: must not reach the new run
    expect(amount().value).toBe('');
    second.step(passedRun as Rec, 0);
    second.step(passedRun as Rec, 1);
    await waitFor(() => expect(amount().value).toBe('10.00'));
    expect(recipient().value).toBe('Test Recipient'); // new run: tracking reset, so its done step fills Recipient
  });
});
