import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Page } from '../../components/Page';
import { PipelineSection } from '../../components/PipelineSection';
import { APP, FIX_STEPS, FIX_STEP_LABEL, type FixStep } from '../../routes';
import { useRun } from '../../runs/runContext';

function isStep(value: string | undefined): value is FixStep {
  return FIX_STEPS.includes(value as FixStep);
}

const linkClass =
  'inline-flex min-h-11 items-center rounded-lg border border-base-line px-4 text-base font-ui text-ink ' +
  'hover:border-violet-neon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon';

export default function Fixes() {
  const { step } = useParams();
  const { result } = useRun();
  const navigate = useNavigate();
  if (!isStep(step)) return <Navigate to={`${APP}/fixes/find`} replace />;
  const index = FIX_STEPS.indexOf(step);
  const back = index > 0 ? FIX_STEPS[index - 1] : null;
  const next = index < FIX_STEPS.length - 1 ? FIX_STEPS[index + 1] : null;

  return (
    <Page id={`app-fixes-${step}`}>
      <PipelineSection
        result={result}
        activeStep={(index + 1) as 1 | 2 | 3}
        onSelectStep={(s) => {
          if (s === 4) {
            navigate(`${APP}/regression`);
            return;
          }
          navigate(`${APP}/fixes/${FIX_STEPS[s - 1]}`);
        }}
      />
      <nav aria-label="Step navigation" className="mt-6 flex gap-3">
        {back && (
          <Link to={`${APP}/fixes/${back}`} className={linkClass}>
            Back: {FIX_STEP_LABEL[back]}
          </Link>
        )}
        {next ? (
          <Link to={`${APP}/fixes/${next}`} className={linkClass}>
            Next: {FIX_STEP_LABEL[next]}
          </Link>
        ) : (
          <Link to={`${APP}/regression`} className={linkClass}>
            Next: {FIX_STEP_LABEL.regression}
          </Link>
        )}
      </nav>
    </Page>
  );
}
