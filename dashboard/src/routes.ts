/**
 * Route manifest: the one place that lists every page.
 * The router, the navigation, the document titles and the tests read from it.
 */
export type FixStep = 'find' | 'fix' | 'verify' | 'regression';

export const FIX_STEPS: FixStep[] = ['find', 'fix', 'verify', 'regression'];
export const FIX_STEP_LABEL: Record<FixStep, string> = {
  find: 'Find',
  fix: 'Fix',
  verify: 'Verify',
  regression: 'Regression',
};

export const JOURNEY = '/journeys/send-payment';

export interface PageDef {
  id: string;
  path: string;
  /** Visible page title (the only H1 on the page, except Home which uses the hero). */
  h1: string;
  /** Plain-English line: what this page shows. */
  shows: string;
  next?: { label: string; to: string };
}

export const PAGES: PageDef[] = [
  {
    id: 'home',
    path: '/',
    h1: 'Haunted Audit',
    shows: 'The start page. It explains the idea in one line and sends you to the demo.',
  },
  {
    id: 'scans',
    path: '/scans',
    h1: 'Scans',
    shows: 'Scans of web pages for accessibility barriers. This page is not available yet.',
    next: { label: 'Try the keyboard demo', to: `${JOURNEY}/possession` },
  },
  {
    id: 'possession',
    path: `${JOURNEY}/possession`,
    h1: 'Possession Mode',
    shows:
      'A keyboard-only run of one user journey (sending a payment) on the Haunted Bank test site. A ghost is an accessibility barrier.',
    next: { label: 'See what the agents found', to: `${JOURNEY}/agents` },
  },
  {
    id: 'agents',
    path: `${JOURNEY}/agents`,
    h1: 'Agents',
    shows: 'What each agent tried during the run and the barrier it found.',
    next: { label: 'Go to Find', to: `${JOURNEY}/fixes/find` },
  },
  ...FIX_STEPS.map((step, i): PageDef => ({
    id: `fixes-${step}`,
    path: `${JOURNEY}/fixes/${step}`,
    h1: `Fixes: ${FIX_STEP_LABEL[step]}`,
    shows: `Step ${i + 1} of 4 in the fix pipeline: Find, Fix, Verify, Regression. A person approves any change.`,
    next:
      i < 3
        ? { label: `Go to ${FIX_STEP_LABEL[FIX_STEPS[i + 1]]}`, to: `${JOURNEY}/fixes/${FIX_STEPS[i + 1]}` }
        : { label: 'See the results', to: '/reports' },
  })),
  {
    id: 'kiro',
    path: '/kiro',
    h1: 'Kiro',
    shows: 'How Haunted Audit is built with Kiro: the hook that scans on save.',
    next: { label: 'See the results', to: '/reports' },
  },
  {
    id: 'reports',
    path: '/reports',
    h1: 'Reports',
    shows: 'Measured results. Anything not measured yet shows -- and "not yet measured".',
    next: { label: 'Back to the start', to: '/' },
  },
];

export const NOT_FOUND_TITLE = 'Page not found';

export function pageFor(pathname: string): PageDef | undefined {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return PAGES.find((p) => p.path === clean);
}

export function titleFor(pathname: string): string {
  const page = pageFor(pathname);
  if (!page) return `${NOT_FOUND_TITLE} · Haunted Audit`;
  return page.id === 'home' ? 'Haunted Audit' : `${page.h1} · Haunted Audit`;
}

export interface NavItem {
  label: string;
  to: string;
  /** True when this item should be marked as the current page. */
  isCurrent: (pathname: string) => boolean;
}

export const NAV: NavItem[] = [
  { label: 'Home', to: '/', isCurrent: (p) => p === '/' },
  { label: 'Scans', to: '/scans', isCurrent: (p) => p === '/scans' },
  {
    label: 'Journeys',
    to: `${JOURNEY}/possession`,
    isCurrent: (p) => p === `${JOURNEY}/possession` || p === `${JOURNEY}/agents`,
  },
  {
    label: 'Fixes',
    to: `${JOURNEY}/fixes/find`,
    isCurrent: (p) => p.startsWith(`${JOURNEY}/fixes/`),
  },
  { label: 'Kiro', to: '/kiro', isCurrent: (p) => p === '/kiro' },
  { label: 'Reports', to: '/reports', isCurrent: (p) => p === '/reports' },
];
