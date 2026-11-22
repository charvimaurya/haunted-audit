import { Link } from 'react-router-dom';
import { GhostHuntSection } from '../../components/GhostHuntSection';
import { Page } from '../../components/Page';
import { useRun } from '../../runs/runContext';
import { to } from '../../routes';

export default function Agents() {
  const { result, isRunning, liveEvents } = useRun();
  return (
    <Page id="app-agents">
      {result === null && !isRunning && (
        <p role="status" className="mb-4 text-base font-ui text-ink-muted">
          No run yet. Start one on{' '}
          <Link
            to={to('possession')}
            className="text-violet-300 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon rounded"
          >
            Possession Mode
          </Link>
          .
        </p>
      )}
      <GhostHuntSection result={result} isRunning={isRunning} liveEvents={liveEvents} />
    </Page>
  );
}
