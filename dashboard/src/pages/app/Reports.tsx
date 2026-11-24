import { Page } from '../../components/Page';
import { ResultsSection } from '../../components/ResultsSection';
import { useRun } from '../../runs/runContext';
import { useFix } from '../../fixes/fixContext';
import { verifiedPct } from '../../fixes/verifiedPct';
import { VerifierEvidence } from '../../components/VerifierEvidence';

export default function Reports() {
  const { result, mode, apiStatus, isRunning } = useRun();
  const flow = useFix();
  const fix = flow?.fix ?? null;
  return (
    <Page id="app-reports">
      <ResultsSection
        result={result}
        agentMode={result?.agent_mode ?? mode}
        apiStatus={apiStatus}
        isRunning={isRunning}
        /* Every metric stays null (shown as --) until a run measures it. */
        barriersDetected={result?.verdict === 'BLOCKED' && result.blocked_element ? 1 : null}
        /* Measured only when a fix was approved and the Verifier's run finished; otherwise -- */
        fixesVerifiedPct={verifiedPct(fix)}
        testScenarios={null}
        userSessions={null}
      />
      <section className="panel mt-6 p-4 flex flex-col gap-3" aria-labelledby="verifier-evidence-heading">
        <h2 id="verifier-evidence-heading" className="m-0 text-base font-semibold font-ui text-ink">
          Verifier evidence (patched copy)
        </h2>
        <VerifierEvidence fix={fix} voiceResult={flow?.voiceVerifyResult} />
      </section>
    </Page>
  );
}
