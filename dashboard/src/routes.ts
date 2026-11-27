/**
 * Route table: the only place a path is written (spec: .kiro/specs/site-shell-repair/).
 * The router, every nav item, sidebar item, breadcrumb and "Next step" link
 * all read from here.
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

/** Every page and its path. */
export const PATHS = {
  home: '/',
  'how-it-works': '/how-it-works',
  results: '/results',
  trust: '/trust',
  kiro: '/kiro',
  about: '/about',
  accessibility: '/accessibility',
  'app-home': APP,
  'app-scans': `${APP}/scans`,
  'app-journeys': `${APP}/journeys`,
  possession: `${APP}/journeys/send-payment/possession`,
  'app-agents': `${APP}/agents`,
  'app-fixes': `${APP}/fixes`,
  'app-reports': `${APP}/reports`,
  'app-settings': `${APP}/settings`,
} as const;

export type PageId = keyof typeof PATHS;

/** The path for a page. */
export function to(id: PageId): string {
  return PATHS[id];
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
    shows: 'Detect, Experience, Fix, Verify, and Prevent — how Haunted Audit tests real accessibility journeys without a mouse.',
    next: { label: 'Open Possession Mode', page: 'possession' } },
  { id: 'results', h1: 'Results', shell: 'marketing',
    shows: 'Measured results from a run. Anything not measured yet shows -- and "not yet measured".',
    next: { label: 'See reports in the app', page: 'app-reports' } },
  { id: 'trust', h1: 'Trust', shell: 'marketing',
    shows: 'How Haunted Audit keeps results honest: deterministic verdicts, real measurements only, and human approval.',
    next: { label: 'See measured results', page: 'results' } },
  { id: 'kiro', h1: 'Kiro', shell: 'marketing',
    shows: 'How Haunted Audit is built with Kiro: specs, steering rules, and the scan-on-save hook.',
    next: { label: 'About Haunted Audit', page: 'about' } },
  { id: 'about', h1: 'About', shell: 'marketing',
    shows: 'What Haunted Audit is, why mouse-free journey testing matters, and who it is built for.',
    next: { label: 'Accessibility statement', page: 'accessibility' } },
  { id: 'accessibility', h1: 'Accessibility', shell: 'marketing',
    shows: 'How this dashboard meets WCAG 2.2 AA: keyboard navigation, high contrast, calm mode, and focus management.',
    next: { label: 'Back to the start', page: 'home' } },
  // ── App ────────────────────────────────────────────────────
  { id: 'app-home', h1: 'Dashboard', shell: 'app',
    shows: 'Your Haunted Audit workspace. Pick a tool from the sidebar — no metrics are invented here.',
    next: { label: 'Run a journey', page: 'app-journeys' } },
  { id: 'app-scans', h1: 'Scans', shell: 'app', parent: 'app-home',
    shows: 'Read-only Ghost Hunter axe-core scanner for Haunted Bank or SSRF-guarded public URLs.',
    next: { label: 'Try a journey', page: 'app-journeys' } },
  { id: 'app-journeys', h1: 'Journeys', shell: 'app', parent: 'app-home',
    shows: 'Choose from 9 bundled Possession sandbox domains and run keyboard-only or voice journeys on broken or fixed flows.',
    next: { label: 'Open Possession Mode', page: 'possession' } },
  { id: 'possession', h1: 'Possession Mode', shell: 'app', parent: 'app-journeys',
    shows: 'Run a keyboard-only or voice-command journey on any of the 9 sandbox scenarios. A ghost is an accessibility barrier.',
    next: { label: 'See what the agents found', page: 'app-agents' } },
  { id: 'app-agents', h1: 'Agents', shell: 'app', parent: 'app-home',
    shows: 'What each agent tried during the run and the barrier it found.',
    next: { label: 'Go to Fixes workspace', page: 'app-fixes' } },
  { id: 'app-fixes', h1: 'Fixes', shell: 'app', parent: 'app-home',
    shows: 'Browse recorded Possession runs in a paginated table, click View details, and track Find, Fix, Verify, and Regression rounds.',
    next: { label: 'See reports', page: 'app-reports' } },
  { id: 'app-reports', h1: 'Reports', shell: 'app', parent: 'app-home',
    shows: 'Measured metrics, bar charts, and saved Possession telemetry. Unmeasured values always show --.',
    next: { label: 'Open settings', page: 'app-settings' } },
  { id: 'app-settings', h1: 'Settings', shell: 'app', parent: 'app-home',
    shows: 'Configure default runner mode, Halloween sound, calm mode, local run storage, and live API diagnostics.',
    next: { label: 'Back to dashboard', page: 'app-home' } },
];

export const PAGES: PageDef[] = SPECS.map((p) => ({ ...p, path: PATHS[p.id] }));

export function page(id: PageId): PageDef {
  return PAGES.find((p) => p.id === id)!;
}

export const NOT_FOUND_TITLE = 'Page not found';

export function pageFor(pathname: string): PageDef | undefined {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const exact = PAGES.find((p) => p.path === clean);
  if (exact) return exact;
  if (clean.startsWith(`${PATHS['app-fixes']}/`)) return page('app-fixes');
  return undefined;
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

/** Global top bar. */
export const NAV: NavItem[] = [
  item('How it works', 'how-it-works'),
  { ...item('App', 'app-home'), isCurrent: (p) => p === APP || p.startsWith(`${APP}/`) },
];

/** Public pages and quick entry points. */
export const FOOTER_NAV: NavItem[] = [
  item('How it works', 'how-it-works'),
  { ...item('Possession Mode', 'possession'), isCurrent: (p) => p === PATHS.possession },
  item('Results', 'results'),
  item('Trust', 'trust'),
  item('About', 'about'),
  item('Accessibility', 'accessibility'),
];

/** App sidebar: consolidated single Fixes hub plus Overview, Scans, Journeys, Agents, Reports, Settings. */
export const APP_NAV: NavItem[] = [
  { ...item('Overview', 'app-home'), isCurrent: (p) => p === APP },
  item('Scans', 'app-scans'),
  { ...item('Journeys', 'app-journeys'), isCurrent: (p) => p.startsWith(`${APP}/journeys`) },
  item('Agents', 'app-agents'),
  { ...item('Fixes', 'app-fixes'), isCurrent: (p) => p.startsWith(`${APP}/fixes`) },
  item('Reports', 'app-reports'),
  item('Settings', 'app-settings'),
];

/** Redirects from old paths to canonical routes. */
export const REDIRECTS: { from: string; to: string }[] = [
  { from: '/try', to: to('possession') },
  { from: '/journeys', to: to('app-journeys') },
  { from: '/journeys/send-payment', to: to('possession') },
  { from: '/journeys/send-payment/possession', to: to('possession') },
  { from: '/journeys/send-payment/agents', to: to('app-agents') },
  { from: '/journeys/send-payment/fixes', to: to('app-fixes') },
  { from: '/journeys/send-payment/fixes/:step', to: to('app-fixes') },
  { from: '/possession', to: to('possession') },
  { from: '/agents', to: to('app-agents') },
  { from: '/fixes', to: to('app-fixes') },
  { from: '/fixes/:step', to: to('app-fixes') },
  { from: '/scans', to: to('app-scans') },
  { from: '/reports', to: to('app-reports') },
  { from: '/settings', to: to('app-settings') },
  { from: `${APP}/possession`, to: to('possession') },
  { from: `${APP}/journeys/send-payment`, to: to('possession') },
  { from: `${APP}/regression`, to: to('app-fixes') },
];
