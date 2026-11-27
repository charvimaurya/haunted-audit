import { Link } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, Chip } from '@heroui/react';
import { ArrowRight, Keyboard, Mic } from 'lucide-react';
import { Page } from '../../components/layout/Page';
import { to } from '../../routes';
import { SCENARIOS } from '../../runs/scenarios';

/** Journeys: 9 bundled Possession sandbox domains ready for keyboard-only and voice tests. */
export default function Journeys() {
  return (
    <Page id="app-journeys">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-sm text-ink-muted">
          Pick any sandbox scenario below to launch Possession Mode with a keyboard or voice agent and collect fixable barriers.
        </p>
        <Chip size="sm" variant="flat" color="secondary" className="font-mono text-xs">
          {SCENARIOS.length} sandbox domains
        </Chip>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SCENARIOS.map((scenario) => (
          <Card
            key={scenario.id}
            className="flex flex-col justify-between bg-base-panel text-ink shadow-none transition-colors hover:bg-base-surface/65"
          >
            <CardHeader className="flex flex-col items-start gap-2 px-5 pt-5 pb-2">
              <div className="flex w-full items-center justify-between gap-2">
                <Chip size="sm" variant="flat" color="secondary" className="text-xs font-semibold">
                  {scenario.category}
                </Chip>
                <div className="flex items-center gap-1.5 text-ink-faint">
                  <Keyboard size={14} aria-label="Keyboard-only supported" />
                  <Mic size={14} aria-label="Voice simulation supported" />
                </div>
              </div>
              <h2 id={`journey-${scenario.id}`} className="m-0 text-lg font-bold font-ui text-ink">
                {scenario.name}
              </h2>
            </CardHeader>

            <CardBody className="flex flex-1 flex-col justify-between gap-4 px-5 pt-1 pb-5">
              <div className="space-y-2">
                <p className="m-0 text-sm text-ink-muted">{scenario.summary}</p>
                <p className="m-0 text-xs text-ink-faint">
                  Target action: <strong className="text-white">{scenario.submitLabel}</strong>
                </p>
              </div>
              <div>
                <Button
                  as={Link}
                  to={`${to('possession')}?scenario=${scenario.id}`}
                  color="secondary"
                  size="sm"
                  endContent={<ArrowRight size={15} aria-hidden="true" />}
                  className="bg-violet-600 px-3.5 font-semibold text-white shadow-glow-sm"
                >
                  Open Possession Mode
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  );
}
