import { Page } from '../components/Page';
import { ResultsSection } from '../components/ResultsSection';
import { useRun } from '../runs/runContext';

export default function Reports() {
  const { result, mode } = useRun();
  return (
    <Page id="reports">
      <ResultsSection
        result={result}
        agentMode={mode}
        /* All metrics stay null (shown as --) until a run measures them */
        barriersDetected={result?.verdict === 'BLOCKED' && result.blocked_element ? 1 : null}
        fixesVerifiedPct={result?.verdict === 'PASSED' ? 100 : null}
        testScenarios={null}
        userSessions={null}
      />
    </Page>
  );
}
