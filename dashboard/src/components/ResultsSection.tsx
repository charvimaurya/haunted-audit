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
      <h2 id="results-heading" className="flex items-center gap-3 text-xl font-extrabold font-ui text-ink">
        <BarChart3 size={26} className="text-white" aria-hidden="true" />
        Results
      </h2>

      <ResultState result={result} apiStatus={apiStatus} isRunning={isRunning} hint="Start one in Possession Mode." />
      {/* v9: four coloured tiles and the Outcome parchment in one row on wide screens */}
      <div className="v9-rgrid grid grid-cols-2 gap-[14px] xl:mt-2">
      <div className="contents" aria-label="Audit metrics" role="group">
        <div className="v9-tile v9-t1">
          <Target size={34} className="v9-tile-icon-1" aria-hidden="true" />
          <MetricValueDisplay
            value={barriersDetected}
            format={(n) => `${n} / 6`}
            label="Planted barriers detected"
            agentMode={agentMode}
          />
        </div>

        <div className="v9-tile v9-t2">
          {/* Neutral icon: a tick beside "--" would read as a pass (no-mock-results REQ-NM-02) */}
          <Wrench size={34} className="v9-tile-icon-2" aria-hidden="true" />
          <MetricValueDisplay
            value={fixesVerifiedPct}
            format={(n) => `${n}%`}
            label="Approved fixes verified"
            agentMode={agentMode}
          />
        </div>

        <div className="v9-tile v9-t3">
          <FlaskConical size={34} className="v9-tile-icon-3" aria-hidden="true" />
          <MetricValueDisplay
            value={testScenarios}
            label="Test scenarios evaluated"
            agentMode={agentMode}
          />
        </div>

        <div className="v9-tile v9-t4">
          <Users size={34} className="v9-tile-icon-4" aria-hidden="true" />
          <MetricValueDisplay
            value={userSessions}
            label="User sessions"
            agentMode={agentMode}
          />
        </div>
      </div>

      {/* Outcome card */}
      <div className="v9-rgrid-parch">
        <OutcomeCard result={result} apiStatus={apiStatus} />
      </div>
      </div>

      {/* Attribution */}
      <p className="text-base font-ui text-ink-faint text-right">
        Built with Kiro
      </p>
    </section>
  );
}
