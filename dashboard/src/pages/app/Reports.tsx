import { Page } from '../../components/Page';
import { ResultsSection } from '../../components/ResultsSection';
import { useRun } from '../../runs/runContext';

export default function Reports() {
  const { result, mode, apiStatus, isRunning } = useRun();
  return (
    <Page id="app-reports">
      <ResultsSection
        result={result}
        agentMode={result?.agent_mode ?? mode}
        apiStatus={apiStatus}
        isRunning={isRunning}
        /* Every metric stays null (shown as --) until a run measures it. */
        barriersDetected={result?.verdict === 'BLOCKED' && result.blocked_element ? 1 : null}
        /* No fix has been verified by a fix pipeline yet, so this stays unmeasured. */
        fixesVerifiedPct={null}
        testScenarios={null}
        userSessions={null}
      />
    </Page>
  );
}
