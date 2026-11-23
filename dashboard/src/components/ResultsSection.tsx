/**
 * ResultsSection
 *
 * Metric tiles + "The Outcome" parchment card (bottom-right of v7 design).
 * Unmeasured values show "--" + "not yet measured". agent_mode always shown.
 * [x] and [n] placeholders from the design become real numbers once measured.
 */

import { BarChart3, Target, Wrench, FlaskConical, Users } from 'lucide-react';
import { MetricValueDisplay } from './MetricValue';
import { OutcomeCard } from './OutcomeCard';
import { ResultState } from './ResultState';
import type { ApiStatus } from '../runs/runContext';
import type { AgentMode, JourneyResult, MetricValue } from '../types';

interface ResultsSectionProps {
  result: JourneyResult | null;
  agentMode: AgentMode;
  /** Result of the last GET /health check. */
  apiStatus?: ApiStatus;
  isRunning?: boolean;
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
  apiStatus = 'online',
  isRunning = false,
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
      <h2 id="results-heading" className="flex items-center gap-2 text-base font-semibold font-ui text-ink">
        <BarChart3 size={18} className="text-violet-neon" aria-hidden="true" />
        Results
      </h2>

      <ResultState result={result} apiStatus={apiStatus} isRunning={isRunning} hint="Start one in Possession Mode." />
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
          {/* Neutral icon: a tick beside "--" would read as a pass (no-mock-results REQ-NM-02) */}
          <Wrench size={18} className="text-ink-muted" aria-hidden="true" />
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
      <OutcomeCard result={result} apiStatus={apiStatus} />

      {/* Attribution */}
      <p className="text-base font-ui text-ink-faint text-right">
        Built with Kiro
      </p>
    </section>
  );
}
