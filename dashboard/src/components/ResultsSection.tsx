/**
 * ResultsSection
 *
 * Metric tiles + "The Outcome" parchment card (bottom-right of v7 design).
 * Unmeasured values show "--" + "not yet measured". agent_mode always shown.
 * [x] and [n] placeholders from the design become real numbers once measured.
 */

import { Target, CheckCircle2, FlaskConical, Users } from 'lucide-react';
import { MetricValueDisplay } from './MetricValue';
import { OutcomeCard } from './OutcomeCard';
import type { AgentMode, JourneyResult, MetricValue } from '../types';

interface ResultsSectionProps {
  result: JourneyResult | null;
  agentMode: AgentMode;
  /** Total barriers detected across all scans — null = not yet measured */
  barriersDetected?: MetricValue;
  /** Percentage of fixes approved — null = not yet measured */
  fixesVerifiedPct?: MetricValue;
  /** Test scenarios evaluated — null = not yet measured */
  testScenarios?: MetricValue;
  /** User sessions recorded — null = not yet measured */
  userSessions?: MetricValue;
}

export function ResultsSection({
  result,
  agentMode,
  barriersDetected = null,
  fixesVerifiedPct = null,
  testScenarios = null,
  userSessions = null,
}: ResultsSectionProps) {
  return (
    <section
      id="reports"
      aria-labelledby="results-heading"
      className="flex flex-col gap-4"
    >
      <h2 id="results-heading" className="flex items-center gap-2 text-sm font-semibold font-ui text-ink">
        <span aria-hidden="true">📊</span>
        Results
      </h2>

      {/* Metric tiles */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        aria-label="Audit metrics"
      >
        <div className="panel p-4 flex flex-col items-center gap-2">
          <Target size={18} className="text-ghost-blocked" aria-hidden="true" />
          <MetricValueDisplay
            value={barriersDetected}
            format={(n) => `${n} / 6`}
            label="Planted barriers detected"
            agentMode={agentMode}
          />
        </div>

        <div className="panel p-4 flex flex-col items-center gap-2">
          <CheckCircle2 size={18} className="text-ghost-verified" aria-hidden="true" />
          <MetricValueDisplay
            value={fixesVerifiedPct}
            format={(n) => `${n}%`}
            label="Approved fixes verified"
            agentMode={agentMode}
          />
        </div>

        <div className="panel p-4 flex flex-col items-center gap-2">
          <FlaskConical size={18} className="text-violet-neon" aria-hidden="true" />
          <MetricValueDisplay
            value={testScenarios}
            label="Test scenarios evaluated"
            agentMode={agentMode}
          />
        </div>

        <div className="panel p-4 flex flex-col items-center gap-2">
          <Users size={18} className="text-sky-400" aria-hidden="true" />
          <MetricValueDisplay
            value={userSessions}
            label="User sessions"
            agentMode={agentMode}
          />
        </div>
      </div>

      {/* Outcome card */}
      <OutcomeCard result={result} />

      {/* Attribution */}
      <p className="text-xs font-ui text-ink-faint text-right">
        Built with Kiro
      </p>
    </section>
  );
}
