import { Page } from '../../components/layout/Page';
import { ResultsSection } from '../../components/results/ResultsSection';
import { useRun } from '../../runs/runContext';
import { useFix } from '../../fixes/fixContext';
import { verifiedPct } from '../../fixes/verifiedPct';
import { plantedTotal } from '../../lib/planted';

export default function Results() {
  const { result, mode, apiStatus, isRunning, history } = useRun();
  const fix = useFix()?.fix ?? null;
  return (
    <Page id="results">
      <ResultsSection
        result={result}
        agentMode={result?.agent_mode ?? mode}
        apiStatus={apiStatus}
        isRunning={isRunning}
        barriersDetected={result?.verdict === 'BLOCKED' && result.blocked_element ? 1 : null}
        barriersTotal={plantedTotal()}
        fixesVerifiedPct={verifiedPct(fix)}
        testScenarios={history.filter((r) => r.verdict === 'PASSED').length || null}
        userSessions={history.length > 0 ? history.length : null}
      />
    </Page>
  );
}
