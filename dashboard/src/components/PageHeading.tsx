/**
 * PageHeading: the one visible H1 of a page, a plain-English line saying what
 * the page shows, and the optional journey sub-navigation. The H1 receives focus
 * after every navigation (see useRouteAnnouncer).
 */
import type { PageDef } from '../routes';

interface PageHeadingProps {
  page: PageDef;
}

export function PageHeading({ page }: PageHeadingProps) {
  return (
    <header className="pt-6 pb-4">
      <h1
        data-page-title
        tabIndex={-1}
        className="text-2xl font-bold font-ui text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon rounded"
      >
        {page.h1}
      </h1>
      <p className="mt-1 max-w-3xl text-base font-ui text-ink-muted">{page.shows}</p>
    </header>
  );
}
