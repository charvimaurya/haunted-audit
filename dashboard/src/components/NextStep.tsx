import { Link } from 'react-router-dom';
import { to, type PageDef } from '../routes';

interface NextStepProps {
  page: PageDef;
}

/** One clear next step at the end of a page. The target comes from the route table. */
export function NextStep({ page }: NextStepProps) {
  if (!page.next) return null;
  return (
    <nav aria-label="What happens next" className="mt-8 border-t border-base-line pt-4">
      <p className="m-0 text-base font-ui text-ink-muted">Next step</p>
      <Link
        to={to(page.next.page)}
        className="mt-1 inline-flex min-h-11 items-center rounded font-ui text-base font-semibold text-violet-300 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-violet-neon"
      >
        {page.next.label}
      </Link>
    </nav>
  );
}
