import { Link } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader } from '@heroui/react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Page } from '../../components/layout/Page';
import { to } from '../../routes';

const PRACTICES = [
  'Single H1 per page with automatic focus placement and polite route announcements.',
  '16px minimum base typography in rem units, scalable to 125% and 150% in Settings.',
  'High-contrast mode, Halloween light/dark themes, and visible 3px focus indicators.',
  'Calm mode and prefers-reduced-motion support that stops cursor trails, roaming ghosts, and transitions.',
];

export default function AccessibilityPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <Page id="accessibility">
        <Card className="border border-base-line bg-base-panel text-ink shadow-none">
          <CardHeader className="px-6 pt-6 pb-2">
            <h2 className="m-0 text-xl font-bold">WCAG 2.2 AA Commitments</h2>
          </CardHeader>
          <CardBody className="flex flex-col gap-4 px-6 pb-6">
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {PRACTICES.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-base text-ink-muted">
                  <CheckCircle2 size={18} className="mt-1 shrink-0 text-violet-neon" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div>
              <Button
                as={Link}
                to={to('app-settings')}
                variant="flat"
                color="secondary"
                endContent={<ArrowRight size={16} aria-hidden="true" />}
                className="font-semibold"
              >
                Open Display & Accessibility Settings
              </Button>
            </div>
          </CardBody>
        </Card>
      </Page>
    </div>
  );
}
