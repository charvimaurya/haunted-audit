import { Page } from '../../components/Page';
import { ResultsSection } from '../../components/ResultsSection';
import { useRun } from '../../runs/runContext';
import { useFix } from '../../fixes/fixContext';
import { verifiedPct } from '../../fixes/verifiedPct';

export default function Results() {
  const { result, mode, apiStatus, isRunning } = useRun();
  const fix = useFix()?.fix ?? null;
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <Page id="results">
        <ResultsSection
          result={result}
          agentMode={result?.agent_mode ?? mode}
          apiStatus={apiStatus}
          isRunning={isRunning}
          barriersDetected={result?.verdict === 'BLOCKED' && result.blocked_element ? 1 : null}
          /* Measured only when a fix was approved and the Verifier's run finished; otherwise -- */
          fixesVerifiedPct={verifiedPct(fix)}
          testScenarios={null}
          userSessions={null}
        />
      </Page>
    </div>
  );
}
