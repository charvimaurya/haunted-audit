import { Page } from '../../components/Page';
import { ResultsSection } from '../../components/ResultsSection';
import { useRun } from '../../runs/runContext';

export default function Results() {
  const { result, mode, apiStatus, isRunning } = useRun();
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <Page id="results">
        <ResultsSection
          result={result}
          agentMode={result?.agent_mode ?? mode}
          apiStatus={apiStatus}
          isRunning={isRunning}
          barriersDetected={result?.verdict === 'BLOCKED' && result.blocked_element ? 1 : null}
          /* No fix has been verified by a fix pipeline yet, so this stays unmeasured. */
          fixesVerifiedPct={null}
          testScenarios={null}
          userSessions={null}
        />
      </Page>
    </div>
  );
}
