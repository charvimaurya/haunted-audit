import { Link } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, Chip } from '@heroui/react';
import { ArrowRight, Bot, Keyboard, Search, ShieldCheck, Wrench } from 'lucide-react';
import { Page } from '../../components/layout/Page';
import { to, type PageId } from '../../routes';

const STAGES: {
  step: string;
  title: string;
  icon: typeof Search;
  summary: string;
  target: PageId;
  action: string;
}[] = [
  {
    step: 'Stage 1',
    title: 'Find & Experience (Possession Mode)',
    icon: Keyboard,
    summary: 'Keyboard-only and voice-command runners attempt the Haunted Bank payment flow without clicking. A deterministic checker decides the verdict.',
    target: 'possession',
    action: 'Open Possession Mode',
  },
  {
    step: 'Stage 2',
    title: 'Inspect Agents & Focus Trail',
    icon: Bot,
    summary: 'Inspect every Tab step, accessible name lookup, and any claim mismatch between what an AI agent thought happened and what the DOM proved.',
    target: 'app-agents',
    action: 'Open Agents View',
  },
  {
    step: 'Stage 3',
    title: 'Propose & Approve Fix (Exorcist)',
    icon: Wrench,
    summary: 'The Exorcist generates a minimal unified diff on a temporary copy of the bank page. A human reviews the SHA-256 hash and approves.',
    target: 'app-fixes',
    action: 'Open Fixes Workspace',
  },
  {
    step: 'Stage 4',
    title: 'Verify Both Journeys',
    icon: ShieldCheck,
    summary: 'After approval, the Verifier re-runs both keyboard and voice journeys on the patched copy. Only real checker runs mark it clear.',
    target: 'app-fixes',
    action: 'Open Verification Tab',
  },
  {
    step: 'Stage 5',
    title: 'Prevent Regressions',
    icon: Search,
    summary: 'The Playwright journey guard re-introduces the barrier on a copy to prove the automated test catches it before shipping.',
    target: 'app-fixes',
    action: 'Open Regression Guard',
  },
];

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <Page id="how-it-works">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {STAGES.map(({ step, title, icon: Icon, summary, target, action }) => (
            <Card
              key={step}
              className="flex flex-col justify-between border border-base-line bg-base-panel text-ink shadow-none transition-colors hover:border-violet-neon/60"
            >
              <CardHeader className="flex items-start justify-between gap-3 px-5 pt-5 pb-2">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-neon/40 bg-violet-600/20 text-violet-neon">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <h2 className="m-0 text-lg font-bold leading-snug">{title}</h2>
                </div>
                <Chip size="sm" variant="flat" color="secondary" className="shrink-0 font-semibold">
                  {step}
                </Chip>
              </CardHeader>
              <CardBody className="flex flex-1 flex-col justify-between gap-4 px-5 pb-5">
                <p className="m-0 text-sm leading-relaxed text-ink-muted">{summary}</p>
                <div>
                  <Button
                    as={Link}
                    to={to(target)}
                    size="sm"
                    variant="flat"
                    color="secondary"
                    endContent={<ArrowRight size={15} aria-hidden="true" />}
                    className="font-semibold"
                  >
                    {action}
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </Page>
    </div>
  );
}
