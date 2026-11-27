import { Link } from 'react-router-dom';
import { GhostHuntSection } from '../../components/journey/GhostHuntSection';
import { Page } from '../../components/layout/Page';
import { useRun } from '../../runs/runContext';
import { to } from '../../routes';

export default function Agents() {
  const { result, isRunning, liveEvents, apiStatus, voiceResult, history } = useRun();
  return (
    <Page id="app-agents">
      {result === null && voiceResult === null && history.length === 0 && !isRunning && (
        <p role="status" className="mb-4 text-sm text-[#9aa3c7]">
          No run yet. Start one on{' '}
          <Link
            to={to('possession')}
            className="rounded text-[#c4b5fd] underline underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
          >
            Possession Mode
          </Link>
          .
        </p>
      )}
      <GhostHuntSection
        result={result}
        isRunning={isRunning}
        liveEvents={liveEvents}
        apiStatus={apiStatus}
        voiceResult={voiceResult}
        history={history}
      />
    </Page>
  );
}
