import { Page } from '../../components/Page';
import { ResultsSection } from '../../components/ResultsSection';
import { useRun } from '../../runs/runContext';

export default function Results() {
  const { result, mode } = useRun();
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <Page id="results">
        <ResultsSection
          result={result}
          agentMode={mode}
          barriersDetected={result?.verdict === 'BLOCKED' && result.blocked_element ? 1 : null}
          fixesVerifiedPct={result?.verdict === 'PASSED' ? 100 : null}
          testScenarios={null}
          userSessions={null}
        />
      </Page>
    </div>
  );
}
