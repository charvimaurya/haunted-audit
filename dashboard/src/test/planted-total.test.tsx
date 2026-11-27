/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ResultsSection } from '../components/results/ResultsSection';
import { parsePlantedTotal, plantedTotal } from '../lib/planted';
import { ImmersionProvider } from '../immersion/ImmersionContext';
import { RunContext, type RunValue } from '../runs/runContext';
import { FixProvider } from '../fixes/FixProvider';
import Reports from '../pages/app/Reports';
import Results from '../pages/marketing/Results';
import type { JourneyResult } from '../types';

const blocked: JourneyResult = {
  run_id: 'r1', verdict: 'BLOCKED', reason_code: 'TARGET_NOT_FOCUSABLE',
  blocked_element: { selector: 'div.pay-btn', bounding_box: null, tag: 'div', accessible_name: null, text: 'Send Payment' },
  focus_trail: [], screenshots: [], agent_mode: 'scripted', step_events: [],
  tokens: { input_tokens: 0, output_tokens: 0, total_tokens: 0 }, latency_ms: 100, cost_usd: 0,
  agent_claim: null, agent_claim_reason: null, agent_claim_mismatch: false, target_ever_focused: false,
  last_focused_element: null, skipped_element: null, variant: 'broken', goal: 'g', stop_reason: 'completed', error: null,
};

describe('planted total (UR-01)', () => {
  it('parsePlantedTotal returns a positive integer or null', () => {
    expect(parsePlantedTotal({ total: 6 })).toBe(6);
    expect(parsePlantedTotal({ total: 7 })).toBe(7);
    expect(parsePlantedTotal({ total: 0 })).toBeNull();
    expect(parsePlantedTotal({ total: -1 })).toBeNull();
    expect(parsePlantedTotal({ total: 1.5 })).toBeNull();
    expect(parsePlantedTotal({ total: '6' })).toBeNull();
    expect(parsePlantedTotal({})).toBeNull();
    expect(parsePlantedTotal(null)).toBeNull();
  });

  it('ResultsSection shows n / total', () => {
    const { rerender } = render(
      <ResultsSection result={blocked} agentMode="scripted" barriersDetected={1} barriersTotal={6} />,
    );
    expect(screen.getByText('1 / 6')).toBeTruthy();
    rerender(<ResultsSection result={blocked} agentMode="scripted" barriersDetected={1} barriersTotal={7} />);
    expect(screen.getByText('1 / 7')).toBeTruthy();
  });

  it('ResultsSection shows the count and "total not yet measured" when the total is null', () => {
    render(<ResultsSection result={blocked} agentMode="scripted" barriersDetected={1} barriersTotal={null} />);
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText(/total not yet measured/i)).toBeTruthy();
  });

  it('ResultsSection shows -- and "not yet measured" when the count is unmeasured', () => {
    render(<ResultsSection result={null} agentMode="scripted" barriersDetected={null} barriersTotal={6} />);
    expect(screen.getAllByLabelText('not yet measured').length).toBeGreaterThanOrEqual(1);
  });

  it('Reports and Results pass the planted total for a broken run', () => {
    const total = plantedTotal();
    expect(total).toBe(6);
    const ctx = {
      variant: 'broken', mode: 'scripted', details: { recipient: '', amount: '', reference: '' },
      runDetails: null, runStatus: 'error', result: blocked, liveEvents: [], notice: null,
      isRunning: false, apiStatus: 'online', runError: null,
      setVariant: () => {}, setMode: () => {}, setDetails: () => {}, run: async () => {},
      voiceResult: null, setVoiceResult: () => {},
    } as unknown as RunValue;

    const { unmount } = render(
      <ImmersionProvider>
        <MemoryRouter>
          <RunContext.Provider value={ctx}>
            <FixProvider><Reports /></FixProvider>
          </RunContext.Provider>
        </MemoryRouter>
      </ImmersionProvider>,
    );
    expect(screen.getByText(`1 / ${total}`)).toBeTruthy();
    unmount();

    render(
      <ImmersionProvider>
        <MemoryRouter>
          <RunContext.Provider value={ctx}>
            <FixProvider><Results /></FixProvider>
          </RunContext.Provider>
        </MemoryRouter>
      </ImmersionProvider>,
    );
    expect(screen.getByText(`1 / ${total}`)).toBeTruthy();
  });
});
