/**
 * Route table: the only place a path is written (spec: .kiro/specs/site-shell-repair/).
 * The router, every nav item, sidebar item, tab, breadcrumb and "Next step" link,
 * the document titles and the tests all read from here. Links use `to(pageId)`,
 * so a renamed route cannot leave a dead link: an unknown id does not compile.
 */
export type FixStep = 'find' | 'fix' | 'verify' | 'regression';
export const FIX_STEPS: FixStep[] = ['find', 'fix', 'verify', 'regression'];
export const FIX_STEP_LABEL: Record<FixStep, string> = {
  find: 'Find',
  fix: 'Fix',
  verify: 'Verify',
  regression: 'Regression',
};

const APP = '/app';

/** Every page and its path. Add a page here first. */
export const PATHS = {
  home: '/',
  'how-it-works': '/how-it-works',
  try: '/try',
  results: '/results',
  trust: '/trust',
  kiro: '/kiro',
  roadmap: '/roadmap',
  about: '/about',
  accessibility: '/accessibility',
  'app-home': APP,
  'app-scans': `${APP}/scans`,
  'app-journeys': `${APP}/journeys`,
  possession: `${APP}/journeys/send-payment/possession`,
  'app-agents': `${APP}/agents`,
  'app-fixes-find': `${APP}/fixes/find`,
  'app-fixes-fix': `${APP}/fixes/fix`,
  'app-fixes-verify': `${APP}/fixes/verify`,
  'app-fixes-regression': `${APP}/fixes/regression`,
  'app-reports': `${APP}/reports`,
  'app-settings': `${APP}/settings`,
} as const;

export type PageId = keyof typeof PATHS;

/** The path for a page. The only way components build a link. */
export function to(id: PageId): string {
  return PATHS[id];
}

export function fixStepId(step: FixStep): PageId {
  return `app-fixes-${step}` as PageId;
}

export interface PageDef {
  id: PageId;
  path: string;
  /** Visible page title (the only H1 on the page; Home uses the hero). */
  h1: string;
  /** Plain-English line: what this page shows. */
  shows: string;
  /** Which chrome shell renders this page. */
  shell: 'marketing' | 'app';
  /** Breadcrumb parent (app pages). */
  parent?: PageId;
  next?: { label: string; page: PageId };
}

type PageSpec = Omit<PageDef, 'path'>;

const SPECS: PageSpec[] = [
  // ── Public pages ───────────────────────────────────────────
  { id: 'home', h1: 'Haunted Audit', shell: 'marketing',
    shows: 'The start page. It explains the idea in one line and sends you to the demo.' },
  { id: 'how-it-works', h1: 'How it works', shell: 'marketing',
    shows: 'A short explanation of Detect, Fix, Verify and Prevent. Detail pages are not available yet.',
    next: { label: 'Try the keyboard demo', page: 'try' } },
  { id: 'try', h1: 'Try Possession Mode', shell: 'marketing',
    shows: 'A keyboard-only run of one user journey (sending a payment) on the Haunted Bank test site. A ghost is an accessibility barrier.',
    next: { label: 'Open the full app', page: 'app-journeys' } },
  { id: 'results', h1: 'Results', shell: 'marketing',
    shows: 'Measured results from a run. Anything not measured yet shows -- and "not yet measured".',
    next: { label: 'See reports in the app', page: 'app-reports' } },
  { id: 'trust', h1: 'Trust', shell: 'marketing',
    shows: 'How we keep results honest: real measurements only, no invented scores. Extra detail is not available yet.',
    next: { label: 'See measured results', page: 'results' } },
  { id: 'kiro', h1: 'Kiro', shell: 'marketing',
    shows: 'How Haunted Audit is built with Kiro: the hook that scans on save.',
    next: { label: 'See the roadmap', page: 'roadmap' } },
  { id: 'roadmap', h1: 'Roadmap', shell: 'marketing',
    shows: 'What is planned next. This page is not available yet — no fake milestones are listed.',
    next: { label: 'About Haunted Audit', page: 'about' } },
  { id: 'about', h1: 'About', shell: 'marketing',
    shows: 'What Haunted Audit is and who it is for. Extra copy is not available yet.',
    next: { label: 'Accessibility statement', page: 'accessibility' } },
  { id: 'accessibility', h1: 'Accessibility', shell: 'marketing',
    shows: 'How this site aims to meet WCAG and where to report barriers. Full statement not available yet.',
    next: { label: 'Back to the start', page: 'home' } },
  // ── App ────────────────────────────────────────────────────
  { id: 'app-home', h1: 'Dashboard', shell: 'app',
    shows: 'Your Haunted Audit workspace. Pick a tool from the sidebar — no metrics are invented here.',
    next: { label: 'Run a journey', page: 'app-journeys' } },
  { id: 'app-scans', h1: 'Scans', shell: 'app', parent: 'app-home',
    shows: 'Scans of web pages for accessibility barriers. This page is not available yet.',
    next: { label: 'Try a journey', page: 'app-journeys' } },
  { id: 'app-journeys', h1: 'Journeys', shell: 'app', parent: 'app-home',
    shows: 'The user journeys you can run. Each one is a keyboard-only run on the Haunted Bank test site.',
    next: { label: 'Open Possession Mode', page: 'possession' } },
  { id: 'possession', h1: 'Possession Mode', shell: 'app', parent: 'app-journeys',
    shows: 'A keyboard-only run of one user journey (sending a payment) on the Haunted Bank test site. A ghost is an accessibility barrier.',
    next: { label: 'See what the agents found', page: 'app-agents' } },
  { id: 'app-agents', h1: 'Agents', shell: 'app', parent: 'app-home',
    shows: 'What each agent tried during the run and the barrier it found.',
    next: { label: 'Go to Find', page: 'app-fixes-find' } },
  ...FIX_STEPS.map((step, i): PageSpec => ({
    id: fixStepId(step),
    h1: `Fixes: ${FIX_STEP_LABEL[step]}`,
    shell: 'app',
    parent: 'app-home',
    shows: `Step ${i + 1} of 4 in the fix pipeline: Find, Fix, Verify, Regression. A person approves any change.`,
    next:
      i < FIX_STEPS.length - 1
        ? { label: `Go to ${FIX_STEP_LABEL[FIX_STEPS[i + 1]]}`, page: fixStepId(FIX_STEPS[i + 1]) }
        : { label: 'See reports', page: 'app-reports' },
  })),
  { id: 'app-reports', h1: 'Reports', shell: 'app', parent: 'app-home',
    shows: 'Measured results. Anything not measured yet shows -- and "not yet measured".',
    next: { label: 'Open settings', page: 'app-settings' } },
  { id: 'app-settings', h1: 'Settings', shell: 'app', parent: 'app-home',
    shows: 'Calm mode, contrast and other preferences. Extra controls are not available yet.',
    next: { label: 'Back to dashboard', page: 'app-home' } },
];

export const PAGES: PageDef[] = SPECS.map((p) => ({ ...p, path: PATHS[p.id] }));

export function page(id: PageId): PageDef {
  return PAGES.find((p) => p.id === id)!;
}

export const NOT_FOUND_TITLE = 'Page not found';

export function pageFor(pathname: string): PageDef | undefined {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return PAGES.find((p) => p.path === clean);
}

export function titleFor(pathname: string): string {
  const p = pageFor(pathname);
  if (!p) return `${NOT_FOUND_TITLE} · Haunted Audit`;
  return p.id === 'home' ? 'Haunted Audit' : `${p.h1} · Haunted Audit`;
}

/** Breadcrumb trail for a page, from the app dashboard down to the page itself. */
export function trailFor(id: PageId): PageDef[] {
  const out: PageDef[] = [];
  let cur: PageDef | undefined = page(id);
  while (cur) {
    out.unshift(cur);
    cur = cur.parent ? page(cur.parent) : undefined;
  }
  return out;
}

export interface NavItem {
  label: string;
  to: string;
  /** True when this item should be marked as the current page. */
  isCurrent: (pathname: string) => boolean;
}

function item(label: string, id: PageId, section?: string): NavItem {
  const path = to(id);
  const prefix = section ?? path;
  return {
    label,
    to: path,
    isCurrent: (p) => p === path || (prefix !== '/' && (p === prefix || p.startsWith(`${prefix}/`))),
  };
}

/** The v7 top menu, on every page. */
export const NAV: NavItem[] = [
  item('Home', 'home'),
  item('Scans', 'app-scans'),
  item('Journeys', 'app-journeys'),
  item('Fixes', 'app-fixes-find', `${APP}/fixes`),
  item('Kiro', 'kiro'),
  item('Reports', 'app-reports'),
];

/** Public pages that are not in the v7 menu. */
export const FOOTER_NAV: NavItem[] = [
  item('How it works', 'how-it-works'),
  item('Try', 'try'),
  item('Results', 'results'),
  item('Trust', 'trust'),
  item('Roadmap', 'roadmap'),
  item('About', 'about'),
  item('Accessibility', 'accessibility'),
];

/** App sidebar. */
export const APP_NAV: NavItem[] = [
  { ...item('Dashboard', 'app-home'), isCurrent: (p) => p === APP },
  item('Scans', 'app-scans'),
  item('Journeys', 'app-journeys'),
  item('Agents', 'app-agents'),
  item('Fixes', 'app-fixes-find', `${APP}/fixes`),
  item('Reports', 'app-reports'),
  item('Settings', 'app-settings'),
];

/** Old and short URLs, each redirected to a page. `:step` is kept. */
export const REDIRECTS: { from: string; to: string }[] = [
  { from: '/journeys', to: to('app-journeys') },
  { from: '/journeys/send-payment', to: to('possession') },
  { from: '/journeys/send-payment/possession', to: to('possession') },
  { from: '/journeys/send-payment/agents', to: to('app-agents') },
  { from: '/journeys/send-payment/fixes', to: to('app-fixes-find') },
  { from: '/journeys/send-payment/fixes/:step', to: `${APP}/fixes/:step` },
  { from: '/possession', to: to('possession') },
  { from: '/agents', to: to('app-agents') },
  { from: '/fixes', to: to('app-fixes-find') },
  { from: '/fixes/:step', to: `${APP}/fixes/:step` },
  { from: '/scans', to: to('app-scans') },
  { from: '/reports', to: to('app-reports') },
  { from: '/settings', to: to('app-settings') },
  { from: `${APP}/possession`, to: to('possession') },
  { from: `${APP}/journeys/send-payment`, to: to('possession') },
  { from: `${APP}/regression`, to: to('app-fixes-regression') },
  { from: `${APP}/fixes`, to: to('app-fixes-find') },
];
