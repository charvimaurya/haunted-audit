/**
 * Page: wraps a page's content with its H1, its plain-English line and its next step.
 * The page definition comes from the route manifest (src/routes.ts).
 */
import type { ReactNode } from 'react';
import { NextStep } from './NextStep';
import { PageHeading } from './PageHeading';
import { PAGES } from '../routes';

interface PageProps {
  id: string;
  children: ReactNode;
  /** Replaces the plain-English line under the H1 (for example the voice version of Possession Mode). */
  lead?: string;
}

export function Page({ id, children, lead }: PageProps) {
  const page = PAGES.find((p) => p.id === id);
  if (!page) throw new Error(`Unknown page id: ${id}`);
  return (
    <>
      <PageHeading page={lead ? { ...page, shows: lead } : page} />
      {children}
      <NextStep page={page} />
    </>
  );
}
