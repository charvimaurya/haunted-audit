import { Link } from 'react-router-dom';
import { GhostHuntSection } from '../components/GhostHuntSection';
import { JourneyNav } from '../components/JourneyNav';
import { Page } from '../components/Page';
import { JOURNEY } from '../routes';
import { useRun } from '../runs/runContext';

export default function Agents() {
  const { result, isRunning, liveEvents } = useRun();
  return (
    <Page id="agents">
      <JourneyNav />
      {result === null && !isRunning && (
        <p role="status" className="mb-4 text-base font-ui text-ink-muted">
          No run yet. Start one on{' '}
          <Link
            to={`${JOURNEY}/possession`}
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
