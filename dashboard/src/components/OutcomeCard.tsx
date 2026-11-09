/**
 * OutcomeCard
 *
 * "The Outcome" parchment card — warm cream background with ink text.
 * Shows the three key outcomes for the demo.
 * Ghost is green (Verified) beside the card.
 */

import { CheckCircle2 } from 'lucide-react';
import { GhostMascot } from './GhostMascot';
import type { JourneyResult } from '../types';

interface OutcomeCardProps {
  result: JourneyResult | null;
}

const OUTCOMES = [
  'Customer can complete the payment',
  'A regression test prevents it from breaking again',
  'Accessibility built into the dev workflow with Kiro',
];

export function OutcomeCard({ result }: OutcomeCardProps) {
  const isPassed = result?.verdict === 'PASSED';

  return (
    <div className="flex items-end gap-3">
      {/* Parchment card */}
      <article
        className="flex-1 rounded-2xl p-5 shadow-xl"
        style={{
          background: 'linear-gradient(160deg, #f5e6c8 0%, #e8d0a0 100%)',
          color: '#3b2a0e',
        }}
        aria-label="The Outcome"
      >
        <h3
          className="text-base font-bold mb-3 font-ui"
          style={{ color: '#3b2a0e' }}
        >
          The Outcome
        </h3>
        <ul className="flex flex-col gap-2" aria-label="Journey outcomes">
          {OUTCOMES.map((outcome) => (
            <li key={outcome} className="flex items-start gap-2 text-sm font-ui">
              <CheckCircle2
                size={15}
                className="shrink-0 mt-0.5"
                style={{ color: '#16a34a' }}
                aria-label="achieved"
              />
              <span style={{ color: '#3b2a0e' }}>{outcome}</span>
            </li>
          ))}
        </ul>
      </article>

      {/* Green ghost beside card when verified */}
      <GhostMascot
        state={isPassed ? 'verified' : 'ready'}
        size={52}
        animate
        className="mb-2 shrink-0"
      />
    </div>
  );
}
