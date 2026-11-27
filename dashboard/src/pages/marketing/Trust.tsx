import { Card, CardBody, CardHeader, Chip } from '@heroui/react';
import { CheckCircle2, Lock, Scale } from 'lucide-react';
import { Page } from '../../components/layout/Page';

const GUARANTEES = [
  {
    icon: Scale,
    title: 'Deterministic Checker Authority',
    body: 'AI agents never grade their own runs. A deterministic checker inspects focus trail and DOM state to decide the verdict and flag any agent claim mismatch.',
  },
  {
    icon: Lock,
    title: 'No Invented Scores or Fake Data',
    body: 'Every unmeasured metric renders as -- with "not yet measured". Barrier totals come straight from the verified barrier baseline.',
  },
  {
    icon: CheckCircle2,
    title: 'Human Approval Before Any Fix',
    body: 'The Exorcist proposes unified diffs on temporary copies only. Approval requires matching diff_sha256 before verification can run.',
  },
];

export default function Trust() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <Page id="trust">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {GUARANTEES.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="border border-base-line bg-base-panel text-ink shadow-none">
              <CardHeader className="flex items-center gap-2.5 px-5 pt-5 pb-2">
                <Icon size={20} className="shrink-0 text-violet-neon" aria-hidden="true" />
                <h2 className="m-0 text-lg font-bold">{title}</h2>
              </CardHeader>
              <CardBody className="px-5 pb-5">
                <p className="m-0 text-sm leading-relaxed text-ink-muted">{body}</p>
              </CardBody>
            </Card>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Chip size="sm" variant="flat" color="secondary">Built with Kiro</Chip>
          <span className="text-sm text-ink-muted">Audited against project honesty and accessibility rules</span>
        </div>
      </Page>
    </div>
  );
}
