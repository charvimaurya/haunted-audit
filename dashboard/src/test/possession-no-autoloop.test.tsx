/** Possession Mode does not auto-run the Find-Fix-Verify loop (owner rule, 25 Nov 2026).
 * AutoLoopCard and useAutoLoop keep their own files and their own test (auto-loop.test.tsx);
 * only the render site on Possession Mode is removed, so chaining Approve -> Verify automatically
 * is not reachable from this page. */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PossessionJourney } from '../components/journey/PossessionJourney';
import { RunContext, type RunValue } from '../runs/runContext';
import { FixProvider } from '../fixes/FixProvider';
import { ImmersionProvider } from '../immersion/ImmersionContext';

const ctx: RunValue = {
  variant: 'broken',
  mode: 'scripted',
  details: { recipient: '', amount: '', reference: '' },
  runDetails: null,
  runStatus: null,
  result: null,
  liveEvents: [],
  notice: null,
  isRunning: false,
  apiStatus: 'online',
  runError: null,
  setVariant: () => {},
  setMode: () => {},
  setDetails: () => {},
  run: async () => {},
  voiceResult: null,
  setVoiceResult: () => {},
};

describe('Possession Mode has no automatic Find-Fix-Verify loop', () => {
  it('does not render "Run the whole loop" (AutoLoopCard) on the Possession page', () => {
    render(
      <ImmersionProvider>
        <MemoryRouter>
          <RunContext.Provider value={ctx}>
            <FixProvider>
              <PossessionJourney pageId="possession" />
            </FixProvider>
          </RunContext.Provider>
        </MemoryRouter>
      </ImmersionProvider>,
    );
    expect(screen.queryByRole('button', { name: 'Run the whole loop' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Run the whole loop' })).toBeNull();
  });
});
