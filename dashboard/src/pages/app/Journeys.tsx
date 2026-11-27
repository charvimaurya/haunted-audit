import { Link } from 'react-router-dom';
import { Button, Card, CardBody, CardFooter, CardHeader, Chip } from '@heroui/react';
import { ArrowRight, Keyboard, Mic } from 'lucide-react';
import { Page } from '../../components/layout/Page';
import { to } from '../../routes';
import { SCENARIOS } from '../../runs/scenarios';

/** Journeys: 9 bundled Possession sandbox domains built with HeroUI Cards. */
export default function Journeys() {
  return (
    <Page id="app-journeys">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm text-ink-muted">
          Pick any sandbox scenario below to launch Possession Mode with a keyboard or voice agent.
        </p>
        <Chip
          size="sm"
          variant="flat"
          color="success"
          className="border border-[#22c55e55] bg-[#0f2a1b] font-mono text-xs text-[#6ee7a0]"
        >
          {SCENARIOS.length} sandbox domains
        </Chip>
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        {SCENARIOS.map((scenario) => (
          <Card key={scenario.id} className="v9-card flex flex-col text-white shadow-none">
            <CardHeader className="flex flex-col items-start gap-2 px-4 pt-4 pb-1">
              <div className="flex w-full items-center justify-between gap-2">
                <Chip size="sm" variant="flat" className="border border-[#2b3254] bg-[#1d2140] text-xs font-semibold text-violet-200">
                  {scenario.category}
                </Chip>
                <div className="flex items-center gap-1.5 text-ink-faint">
                  <Keyboard size={14} aria-label="Keyboard-only supported" />
                  <Mic size={14} aria-label="Voice simulation supported" />
                </div>
              </div>
              <h2 id={`journey-${scenario.id}`} className="m-0 text-base sm:text-lg font-extrabold text-white">
                {scenario.name}
              </h2>
            </CardHeader>

            <CardBody className="flex-1 px-4 py-1.5">
              <p className="m-0 text-sm text-ink-muted">{scenario.summary}</p>
              <p className="m-0 mt-2 text-xs text-ink-faint">
                Target action: <strong className="text-white">{scenario.submitLabel}</strong>
              </p>
            </CardBody>

            <CardFooter className="px-4 pt-2 pb-4">
              <Button
                as={Link}
                to={`${to('possession')}?scenario=${scenario.id}`}
                size="sm"
                endContent={<ArrowRight size={14} aria-hidden="true" />}
                className="h-9 w-full rounded-xl border border-[#a78bfa] bg-gradient-to-b from-[#3b1f86] to-[#2a1466] text-xs sm:text-sm font-bold text-white shadow-[0_0_16px_#8b5cf666]"
              >
                Open Possession Mode
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </Page>
  );
}
