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
        /* No fix has been verified by a fix pipeline yet, so this stays unmeasured. */
        fixesVerifiedPct={null}
        testScenarios={null}
        userSessions={null}
      />
    </Page>
  );
}
