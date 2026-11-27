import { Link } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, Chip, Code, Divider } from '@heroui/react';
import { ArrowRight, Bot, FlaskConical, Keyboard, Search, ShieldCheck, Wrench } from 'lucide-react';
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
    action: 'Open Verification',
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
    <Page id="how-it-works">
      <div className="flex flex-col gap-5">
        <Card className="panel-glow text-white shadow-none">
          <CardHeader className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 pb-2">
            <div className="flex items-center gap-2.5">
              <span className="v9-neon" aria-hidden="true">
                <FlaskConical size={22} />
              </span>
              <h2 className="m-0 text-lg sm:text-xl font-extrabold text-white">The Experiment That Changed Everything</h2>
            </div>
            <Chip size="sm" color="warning" variant="flat" className="font-mono font-bold">
              3 / 6 detected by axe-core
            </Chip>
          </CardHeader>
          <CardBody className="flex flex-col gap-4 px-5 pb-5">
            <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(240px,1fr)]">
              <div className="flex flex-col gap-2 text-sm sm:text-base text-ink-muted">
                <p className="m-0">
                  We built a simulated online banking application and deliberately introduced{' '}
                  <strong className="text-white">six real-world accessibility barriers</strong>, then ran{' '}
                  <Code size="sm" className="bg-[#121731] text-violet-200">axe-core</Code>. It detected only three.
                </p>
                <p className="m-0">
                  The very defect that would stop <strong className="text-white">Emma</strong> from paying her bill — a{' '}
                  <Code size="sm" className="bg-[#121731] text-violet-200">div</Code> disguised as a button without keyboard accessibility — went completely undetected.
                  Haunted Audit tests the actual user journey instead of stopping at static rules.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center rounded-2xl border border-[#2b3254] bg-[#0e1226]/90 px-4 py-4 text-center">
                <span className="text-xs font-medium text-ink-muted">Barriers detected by the scanner</span>
                <Divider className="my-1.5 w-48 bg-white/30" />
                <span className="text-xs font-medium text-ink-muted">Accessibility barriers introduced</span>
                <span className="mt-2 font-mono text-2xl font-extrabold text-warning">= 3 / 6</span>
                <Button
                  as={Link}
                  to={to('app-scans')}
                  role="link"
                  size="sm"
                  className="mt-3 h-8 rounded-lg border border-[#a78bfa] bg-gradient-to-b from-[#3b1f86] to-[#2a1466] px-3 text-xs font-bold text-white shadow-[0_0_12px_#8b5cf666]"
                >
                  Inspect all 6 in Scans
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {STAGES.map(({ step, title, icon: Icon, summary, target, action }) => (
            <Card key={step} className="v9-card flex flex-col justify-between text-white shadow-none">
              <CardHeader className="flex items-start justify-between gap-3 px-5 pt-5 pb-2">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#7c4dff]/60 bg-[#2a1a5c] text-[#c084fc]">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <h2 className="m-0 text-base sm:text-lg font-bold leading-snug text-white">{title}</h2>
                </div>
                <Chip size="sm" variant="flat" className="shrink-0 border border-[#2b3254] bg-[#1d2140] font-semibold text-violet-200">
                  {step}
                </Chip>
              </CardHeader>
              <CardBody className="flex flex-1 flex-col justify-between gap-4 px-5 pb-5">
                <p className="m-0 text-sm leading-relaxed text-ink-muted">{summary}</p>
                <div>
                  <Button
                    as={Link}
                    to={to(target)}
                    role="link"
                    size="sm"
                    endContent={<ArrowRight size={15} aria-hidden="true" />}
                    className="h-9 rounded-xl border border-[#a78bfa] bg-gradient-to-b from-[#3b1f86] to-[#2a1466] px-3.5 text-xs font-bold text-white"
                  >
                    {action}
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </Page>
  );
}
