import { Link } from 'react-router-dom';
import { Button } from '@heroui/react';
import { ArrowRight } from 'lucide-react';
import { to, type PageDef } from '../../routes';

interface NextStepProps {
  page: PageDef;
}

/** One clear next step at the end of a page. The target comes from the route table. */
export function NextStep({ page }: NextStepProps) {
  if (!page.next) return null;
  return (
    <nav
      aria-label="What happens next"
      className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-base-line bg-base-panel/75 p-4 sm:p-5"
    >
      <div>
        <p className="m-0 text-xs font-bold uppercase tracking-wider text-ink-faint">Next step</p>
        <p className="m-0 mt-0.5 text-base font-semibold text-ink">{page.next.label}</p>
      </div>
      <Button
        as={Link}
        to={to(page.next.page)}
        size="sm"
        color="secondary"
        variant="flat"
        endContent={<ArrowRight size={15} aria-hidden="true" />}
        className="border border-violet-neon/45 bg-violet-600/20 px-4 font-semibold text-ink hover:bg-violet-600/35"
      >
        {page.next.label}
      </Button>
    </nav>
  );
}
