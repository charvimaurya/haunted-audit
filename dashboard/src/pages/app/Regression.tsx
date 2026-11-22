import { Link, useNavigate } from 'react-router-dom';
import { Page } from '../../components/Page';
import { PipelineSection } from '../../components/PipelineSection';
import { APP, FIX_STEPS, FIX_STEP_LABEL } from '../../routes';
import { useRun } from '../../runs/runContext';

const linkClass =
  'inline-flex min-h-11 items-center rounded-lg border border-base-line px-4 text-base font-ui text-ink ' +
  'hover:border-violet-neon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon';

export default function Regression() {
  const { result } = useRun();
  const navigate = useNavigate();
  const last = FIX_STEPS[FIX_STEPS.length - 1];
  return (
    <Page id="app-regression">
      <PipelineSection
        result={result}
        activeStep={4}
        onSelectStep={(s) => {
          if (s === 4) return;
          navigate(`${APP}/fixes/${FIX_STEPS[s - 1]}`);
        }}
      />
      <nav aria-label="Step navigation" className="mt-6 flex gap-3">
        <Link to={`${APP}/fixes/${last}`} className={linkClass}>
          Back: {FIX_STEP_LABEL[last]}
        </Link>
      </nav>
    </Page>
  );
}
