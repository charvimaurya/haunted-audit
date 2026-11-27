import type { PageDef } from '../../routes';

interface PageHeadingProps {
  page: PageDef;
  srOnly?: boolean;
}

export function PageHeading({ page, srOnly = false }: PageHeadingProps) {
  if (srOnly) {
    return (
      <header className="sr-only">
        <h1 data-page-title tabIndex={-1}>
          {page.h1}
        </h1>
        <p>{page.shows}</p>
      </header>
    );
  }

  return (
    <header className="mb-3">
      <h1
        data-page-title
        tabIndex={-1}
        className="m-0 text-xl sm:text-2xl font-extrabold tracking-tight font-ui text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon rounded"
      >
        {page.h1}
      </h1>
      <p className="m-0 mt-1 text-sm text-ink-muted">{page.shows}</p>
    </header>
  );
}
