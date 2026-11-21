/**
 * Route manifest: the one place that lists every page.
 * The router, the navigation, the document titles and the tests read from it.
 */
export type FixStep = 'find' | 'fix' | 'verify';

export const FIX_STEPS: FixStep[] = ['find', 'fix', 'verify'];
export const FIX_STEP_LABEL: Record<FixStep | 'regression', string> = {
  find: 'Find',
  fix: 'Fix',
  verify: 'Verify',
  regression: 'Regression',
};

/** Legacy journey prefix — kept for redirects only. */
export const JOURNEY = '/journeys/send-payment';

export const APP = '/app';

export interface PageDef {
  id: string;
  path: string;
  /** Visible page title (the only H1 on the page, except Home which uses the hero). */
  h1: string;
  /** Plain-English line: what this page shows. */
  shows: string;
  /** Which chrome shell renders this page. */
  shell: 'marketing' | 'app';
  next?: { label: string; to: string };
}

export const PAGES: PageDef[] = [
  // ── Marketing ──────────────────────────────────────────────
  {
    id: 'home',
    path: '/',
    h1: 'Haunted Audit',
    shows: 'The start page. It explains the idea in one line and sends you to the demo.',
    shell: 'marketing',
  },
  {
    id: 'how-it-works',
    path: '/how-it-works',
    h1: 'How it works',
    shows: 'A short explanation of Detect, Fix, Verify and Prevent. Detail pages are not available yet.',
    shell: 'marketing',
    next: { label: 'Try the keyboard demo', to: '/try' },
  },
  {
    id: 'try',
    path: '/try',
    h1: 'Try Possession Mode',
    shows:
      'A keyboard-only run of one user journey (sending a payment) on the Haunted Bank test site. A ghost is an accessibility barrier.',
    shell: 'marketing',
    next: { label: 'Open the full app', to: `${APP}/journeys` },
  },
  {
    id: 'results',
    path: '/results',
    h1: 'Results',
    shows: 'Measured results from a run. Anything not measured yet shows -- and "not yet measured".',
    shell: 'marketing',
    next: { label: 'See reports in the app', to: `${APP}/reports` },
  },
  {
    id: 'trust',
    path: '/trust',
    h1: 'Trust',
    shows: 'How we keep results honest: real measurements only, no invented scores. Extra detail is not available yet.',
    shell: 'marketing',
    next: { label: 'See measured results', to: '/results' },
  },
  {
    id: 'kiro',
    path: '/kiro',
    h1: 'Kiro',
    shows: 'How Haunted Audit is built with Kiro: the hook that scans on save.',
    shell: 'marketing',
    next: { label: 'See the roadmap', to: '/roadmap' },
  },
  {
    id: 'roadmap',
    path: '/roadmap',
    h1: 'Roadmap',
    shows: 'What is planned next. This page is not available yet — no fake milestones are listed.',
    shell: 'marketing',
    next: { label: 'About Haunted Audit', to: '/about' },
  },
  {
    id: 'about',
    path: '/about',
    h1: 'About',
    shows: 'What Haunted Audit is and who it is for. Extra copy is not available yet.',
    shell: 'marketing',
    next: { label: 'Accessibility statement', to: '/accessibility' },
  },
  {
    id: 'accessibility',
    path: '/accessibility',
    h1: 'Accessibility',
    shows: 'How this site aims to meet WCAG and where to report barriers. Full statement not available yet.',
    shell: 'marketing',
    next: { label: 'Back to the start', to: '/' },
  },

  // ── App ────────────────────────────────────────────────────
  {
    id: 'app-home',
    path: APP,
    h1: 'Dashboard',
    shows: 'Your Haunted Audit workspace. Pick a tool from the sidebar — no metrics are invented here.',
    shell: 'app',
    next: { label: 'Run a journey', to: `${APP}/journeys` },
  },
  {
    id: 'app-scans',
    path: `${APP}/scans`,
    h1: 'Scans',
    shows: 'Scans of web pages for accessibility barriers. This page is not available yet.',
    shell: 'app',
    next: { label: 'Try a journey', to: `${APP}/journeys` },
  },
  {
    id: 'app-journeys',
    path: `${APP}/journeys`,
    h1: 'Journeys',
    shows:
      'A keyboard-only run of one user journey (sending a payment) on the Haunted Bank test site. A ghost is an accessibility barrier.',
    shell: 'app',
    next: { label: 'See what the agents found', to: `${APP}/agents` },
  },
  {
    id: 'app-agents',
    path: `${APP}/agents`,
    h1: 'Agents',
    shows: 'What each agent tried during the run and the barrier it found.',
    shell: 'app',
    next: { label: 'Go to Find', to: `${APP}/fixes/find` },
  },
  // Legacy journey Agents route (still mounted in AppRoutes) — same product name as app-agents.
  {
    id: 'agents',
    path: `${JOURNEY}/agents`,
    h1: 'Agents',
    shows: 'What each agent tried during the run and the barrier it found.',
    shell: 'marketing',
    next: { label: 'Go to Find', to: `${JOURNEY}/fixes/find` },
  },
  ...FIX_STEPS.map((step, i): PageDef => ({
    id: `app-fixes-${step}`,
    path: `${APP}/fixes/${step}`,
    h1: `Fixes: ${FIX_STEP_LABEL[step]}`,
    shows: `Step ${i + 1} of 4 in the fix pipeline: Find, Fix, Verify, Regression. A person approves any change.`,
    shell: 'app',
    next:
      i < FIX_STEPS.length - 1
        ? {
            label: `Go to ${FIX_STEP_LABEL[FIX_STEPS[i + 1]]}`,
            to: `${APP}/fixes/${FIX_STEPS[i + 1]}`,
          }
        : { label: 'Go to Regression', to: `${APP}/regression` },
  })),
  {
    id: 'app-regression',
    path: `${APP}/regression`,
    h1: 'Regression',
    shows: 'Step 4 of 4: check that a fix still holds. Results stay -- until a regression run measures them.',
    shell: 'app',
    next: { label: 'See reports', to: `${APP}/reports` },
  },
  {
    id: 'app-reports',
    path: `${APP}/reports`,
    h1: 'Reports',
    shows: 'Measured results. Anything not measured yet shows -- and "not yet measured".',
    shell: 'app',
    next: { label: 'Open settings', to: `${APP}/settings` },
  },
  {
    id: 'app-settings',
    path: `${APP}/settings`,
    h1: 'Settings',
    shows: 'Calm mode, contrast and other preferences. Extra controls are not available yet.',
    shell: 'app',
    next: { label: 'Back to dashboard', to: APP },
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

/** Primary marketing header links. */
export const MARKETING_NAV: NavItem[] = [
  { label: 'Home', to: '/', isCurrent: (p) => p === '/' },
  { label: 'How it works', to: '/how-it-works', isCurrent: (p) => p === '/how-it-works' },
  { label: 'Try', to: '/try', isCurrent: (p) => p === '/try' },
  { label: 'Results', to: '/results', isCurrent: (p) => p === '/results' },
  { label: 'Trust', to: '/trust', isCurrent: (p) => p === '/trust' },
  { label: 'Kiro', to: '/kiro', isCurrent: (p) => p === '/kiro' },
  {
    label: 'App',
    to: APP,
    isCurrent: (p) => p === APP || p.startsWith(`${APP}/`),
  },
];

/** Secondary marketing links (footer). */
export const MARKETING_FOOTER_NAV: NavItem[] = [
  { label: 'Roadmap', to: '/roadmap', isCurrent: (p) => p === '/roadmap' },
  { label: 'About', to: '/about', isCurrent: (p) => p === '/about' },
  {
    label: 'Accessibility',
    to: '/accessibility',
    isCurrent: (p) => p === '/accessibility',
  },
];

/** App sidebar links. */
export const APP_NAV: NavItem[] = [
  { label: 'Dashboard', to: APP, isCurrent: (p) => p === APP },
  { label: 'Scans', to: `${APP}/scans`, isCurrent: (p) => p === `${APP}/scans` },
  {
    label: 'Journeys',
    to: `${APP}/journeys`,
    isCurrent: (p) => p === `${APP}/journeys`,
  },
  {
    label: 'Agents',
    to: `${APP}/agents`,
    isCurrent: (p) => p === `${APP}/agents`,
  },
  {
    label: 'Fixes',
    to: `${APP}/fixes/find`,
    isCurrent: (p) => p.startsWith(`${APP}/fixes`),
  },
  {
    label: 'Regression',
    to: `${APP}/regression`,
    isCurrent: (p) => p === `${APP}/regression`,
  },
  {
    label: 'Reports',
    to: `${APP}/reports`,
    isCurrent: (p) => p === `${APP}/reports`,
  },
  {
    label: 'Settings',
    to: `${APP}/settings`,
    isCurrent: (p) => p === `${APP}/settings`,
  },
];

/** @deprecated Use MARKETING_NAV — kept so older imports keep working during Stage 1. */
export const NAV = MARKETING_NAV;
