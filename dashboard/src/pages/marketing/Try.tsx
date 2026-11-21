import { Page } from '../../components/Page';
import { PossessionMode } from '../../components/PossessionMode';
import { RunControls } from '../../components/RunControls';
import { RunNotice } from '../../components/RunNotice';
import { useRun } from '../../runs/runContext';

export default function Try() {
  const { variant, mode, runStatus, result, isRunning, notice, setVariant, setMode, run } =
    useRun();
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <Page id="try">
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
    </div>
  );
}
