import { Page } from '../../components/Page';
import { PossessionMode } from '../../components/PossessionMode';
import { RunControls } from '../../components/RunControls';
import { RunNotice } from '../../components/RunNotice';
import { useRun } from '../../runs/runContext';

export default function Journeys() {
  const { variant, mode, runStatus, result, isRunning, notice, setVariant, setMode, run } =
    useRun();
  return (
    <Page id="app-journeys">
      <RunControls
        variant={variant}
        mode={mode}
        status={runStatus}
        onVariantChange={setVariant}
        onModeChange={setMode}
        onRun={run}
      />
      {notice && <RunNotice {...notice} />}
      <div className="mt-6">
        <PossessionMode result={result} isRunning={isRunning} />
      </div>
    </Page>
  );
}
