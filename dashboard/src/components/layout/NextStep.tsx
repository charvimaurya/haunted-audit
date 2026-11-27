import { Link } from 'react-router-dom';
import { Button, Card, CardBody } from '@heroui/react';
import { ArrowRight } from 'lucide-react';
import { to, type PageDef } from '../../routes';

interface NextStepProps {
  page: PageDef;
}

/** HeroUI next-step callout bar cleanly aligned with v9 cards. */
export function NextStep({ page }: NextStepProps) {
  if (!page.next) return null;
  return (
    <nav aria-label="What happens next" className="mt-5">
      <Card className="v9-card text-white shadow-none">
        <CardBody className="flex flex-row flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div>
            <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-ink-faint">Next step</p>
            <p className="m-0 mt-0.5 text-sm sm:text-base font-semibold text-white">{page.next.label}</p>
          </div>
          <Button
            as={Link}
            to={to(page.next.page)}
            size="sm"
            color="secondary"
            endContent={<ArrowRight size={14} aria-hidden="true" />}
            className="h-9 rounded-xl border border-[#a78bfa] bg-gradient-to-b from-[#3b1f86] to-[#2a1466] px-4 font-bold text-white shadow-[0_0_16px_#8b5cf666]"
          >
            {page.next.label}
          </Button>
        </CardBody>
      </Card>
    </nav>
  );
}
