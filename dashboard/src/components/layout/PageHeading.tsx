import type { PageDef } from '../../routes';

interface PageHeadingProps {
  page: PageDef;
}

export function PageHeading({ page }: PageHeadingProps) {
  return (
    <header className="pt-2 pb-6">
      <h1
        data-page-title
        tabIndex={-1}
        className="m-0 text-2xl sm:text-3xl font-extrabold tracking-tight font-ui text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon rounded"
      >
        {page.h1}
      </h1>
      <p className="mt-2 max-w-3xl text-base leading-relaxed font-ui text-ink-muted">{page.shows}</p>
    </header>
  );
}
