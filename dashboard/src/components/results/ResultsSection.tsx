import { Card, CardBody } from '@heroui/react';
import { CheckCircle2, FlaskConical, Target, Users, Wrench } from 'lucide-react';
import { GhostFigure } from '../ghost/GhostFigure';
import { MetricValueDisplay } from './MetricValue';
import { OutcomeCard } from './OutcomeCard';
import { ResultState } from './ResultState';
import type { ApiStatus } from '../../runs/runContext';
import type { AgentMode, JourneyResult, MetricValue } from '../../types/index';

interface ResultsSectionProps {
  result: JourneyResult | null;
  agentMode: AgentMode;
  apiStatus?: ApiStatus;
  isRunning?: boolean;
  barriersDetected?: MetricValue;
  barriersTotal?: number | null;
  fixesVerifiedPct?: MetricValue;
  testScenarios?: MetricValue;
  userSessions?: MetricValue;
}

export function ResultsSection({
  result,
  agentMode,
  apiStatus = 'online',
  isRunning = false,
  barriersDetected = null,
  barriersTotal = null,
  fixesVerifiedPct = null,
  testScenarios = null,
  userSessions = null,
}: ResultsSectionProps) {
  const formatBarriers = (n: number) =>
    barriersTotal !== null && barriersTotal !== undefined ? `${n} / ${barriersTotal}` : String(n);
  const barriersLabel =
    barriersDetected !== null && (barriersTotal === null || barriersTotal === undefined)
      ? 'Planted barriers detected (total not yet measured)'
      : 'Planted barriers detected';

  return (
    <section id="reports" aria-labelledby="results-heading" className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="results-heading" className="m-0 flex items-center gap-2.5 text-lg sm:text-xl font-extrabold text-white">
          <GhostFigure tone="white" face="worried" size={28} />
          <span>Results</span>
        </h2>
        <ResultState result={result} apiStatus={apiStatus} isRunning={isRunning} hint="Start one in Possession Mode." />
      </div>

      {/* design/v9 07-results.html layout: 4 glowing HeroUI tiles + Outcome Parchment */}
      <div
        className="grid grid-cols-1 items-stretch gap-3.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.95fr)]"
        aria-label="Audit metrics"
      >
        <Card className="v9-tile t1 text-white shadow-none">
          <CardBody className="flex flex-col items-center justify-center gap-2 p-2 text-center">
            <Target size={32} style={{ color: '#f472b6' }} aria-hidden="true" />
            <MetricValueDisplay
              value={barriersDetected}
              format={formatBarriers}
              label={barriersLabel}
              agentMode={agentMode}
            />
          </CardBody>
        </Card>

        <Card className="v9-tile t2 text-white shadow-none">
          <CardBody className="flex flex-col items-center justify-center gap-2 p-2 text-center">
            {fixesVerifiedPct !== null ? (
              <CheckCircle2 size={32} style={{ color: '#4ade80' }} aria-hidden="true" />
            ) : (
              <Wrench size={32} className="text-ink-muted" aria-hidden="true" />
            )}
            <MetricValueDisplay
              value={fixesVerifiedPct}
              format={(n) => `${n}%`}
              label="Approved fixes verified"
              agentMode={agentMode}
            />
          </CardBody>
        </Card>

        <Card className="v9-tile t3 text-white shadow-none">
          <CardBody className="flex flex-col items-center justify-center gap-2 p-2 text-center">
            <FlaskConical size={32} style={{ color: '#c084fc' }} aria-hidden="true" />
            <MetricValueDisplay
              value={testScenarios}
              label="Journeys passing"
              agentMode={agentMode}
            />
          </CardBody>
        </Card>

        <Card className="v9-tile t4 text-white shadow-none">
          <CardBody className="flex flex-col items-center justify-center gap-2 p-2 text-center">
            <Users size={32} style={{ color: '#60a5fa' }} aria-hidden="true" />
            <MetricValueDisplay
              value={userSessions}
              label="User sessions"
              agentMode={agentMode}
            />
          </CardBody>
        </Card>

        <div className="sm:col-span-2 lg:col-span-4 xl:col-span-1 flex flex-col justify-center">
          <OutcomeCard result={result} apiStatus={apiStatus} />
        </div>
      </div>

      <p className="m-0 text-right text-xs sm:text-sm font-medium text-ink-faint">Built with Kiro</p>
    </section>
  );
}
