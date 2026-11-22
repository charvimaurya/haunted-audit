import { Page } from '../../components/Page';
import { PossessionMode } from '../../components/PossessionMode';
import { RunControls } from '../../components/RunControls';
import { RunNotice } from '../../components/RunNotice';
import { useRun } from '../../runs/runContext';

/** Possession Mode: a keyboard-only run of the Send Payment journey (v7 panel B). */
export default function Possession() {
  const { variant, mode, runStatus, result, isRunning, notice, setVariant, setMode, run } =
    useRun();
  return (
    <Page id="possession">
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
