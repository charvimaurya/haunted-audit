export type FixStep = 'find' | 'fix' | 'verify' | 'regression';
export const FIX_STEPS: FixStep[] = ['find', 'fix', 'verify', 'regression'];
export const FIX_STEP_LABEL: Record<FixStep, string> = {
  find: 'Find',
  fix: 'Fix',
  verify: 'Verify',
  regression: 'Regression',
};

const APP = '/app';

/** Every page and its canonical route path. */
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

export function to(id: PageId): string {
  return PATHS[id];
}

export interface PageDef {
  id: PageId;
  path: string;
  h1: string;
  shows: string;
  shell: 'marketing' | 'app';
  parent?: PageId;
  next?: { label: string; page: PageId };
}

type PageSpec = Omit<PageDef, 'path'>;

const SPECS: PageSpec[] = [
  // ── Public pages ───────────────────────────────────────────
  { id: 'home', h1: 'Haunted Audit', shell: 'marketing',
    shows: 'The start page. It explains the idea in one line and sends you to the demo.' },
  { id: 'how-it-works', h1: 'How it works', shell: 'marketing',
    shows: 'Why scanners miss half of real accessibility barriers (3/6), and how Possession Mode tests journeys without a mouse.',
    next: { label: 'Open Possession Mode', page: 'possession' } },
  { id: 'results', h1: 'Results', shell: 'marketing',
    shows: 'Measured results from a run. Anything not measured yet shows -- and "not yet measured".',
    next: { label: 'See reports in the app', page: 'app-reports' } },
  { id: 'trust', h1: 'Trust', shell: 'marketing',
    shows: 'How Haunted Audit keeps results honest: deterministic verdicts, real measurements only, and human approval.',
    next: { label: 'See measured results', page: 'results' } },
  { id: 'kiro', h1: 'Kiro', shell: 'app',
    shows: 'How Haunted Audit is built with Kiro: specs, steering rules, and the scan-on-save hook.',
    next: { label: 'See reports', page: 'app-reports' } },
  { id: 'about', h1: 'About', shell: 'marketing',
    shows: 'What Haunted Audit is, why mouse-free journey testing matters, and who it is built for.',
    next: { label: 'Accessibility statement', page: 'accessibility' } },
  { id: 'accessibility', h1: 'Accessibility', shell: 'marketing',
    shows: 'How this dashboard meets WCAG 2.2 AA: keyboard navigation, calm mode, and focus management.',
    next: { label: 'Back to the start', page: 'home' } },
  // ── App workspace ──────────────────────────────────────────
  { id: 'app-home', h1: 'Dashboard', shell: 'app',
    shows: 'Your Haunted Audit workspace. Launch a journey, scan URLs, inspect agents, approve fixes, and review telemetry.',
    next: { label: 'Run a journey', page: 'possession' } },
  { id: 'app-scans', h1: 'Findings', shell: 'app', parent: 'app-home',
    shows: 'Read-only Ghost Hunter axe-core scanner for Haunted Bank (3/6 baseline) or SSRF-guarded public URLs.',
    next: { label: 'Experience Possession Mode', page: 'possession' } },
  { id: 'app-journeys', h1: 'Scenarios', shell: 'app', parent: 'app-home',
    shows: 'Choose from 9 bundled Possession sandbox domains and run keyboard-only or voice journeys.',
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
    shows: 'Measured results, HeroUI charts, and saved Possession telemetry. Unmeasured values always show --.',
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

function cleanPath(p: string): string {
  return p.length > 1 ? p.replace(/\/+$/, '') : p;
}

function item(label: string, id: PageId, section?: string): NavItem {
  const path = to(id);
  const prefix = section ?? path;
  return {
    label,
    to: path,
    isCurrent: (raw) => {
      const p = cleanPath(raw);
      return p === path || (prefix !== '/' && (p === prefix || p.startsWith(`${prefix}/`)));
    },
  };
}

/** Exact design/v9 top navigation bar links: Home · Scans · Journeys · Fixes · Kiro · Reports */
export const NAV: NavItem[] = [
  { ...item('Home', 'home'), isCurrent: (p) => cleanPath(p) === '/' },
  item('Scans', 'app-scans'),
  {
    ...item('Journeys', 'possession'),
    isCurrent: (p) => {
      const c = cleanPath(p);
      return c.startsWith(`${APP}/journeys`) || c === PATHS['app-agents'];
    },
  },
  { ...item('Fixes', 'app-fixes'), isCurrent: (p) => cleanPath(p).startsWith(`${APP}/fixes`) },
  item('Kiro', 'kiro'),
  {
    ...item('Reports', 'app-reports'),
    isCurrent: (p) => {
      const c = cleanPath(p);
      return c === PATHS['app-reports'] || c === PATHS.results;
    },
  },
];

export const FOOTER_NAV: NavItem[] = [
  item('How it works', 'how-it-works'),
  { ...item('Possession Mode', 'possession'), isCurrent: (p) => cleanPath(p) === PATHS.possession },
  item('Results', 'results'),
  item('Kiro', 'kiro'),
  item('Trust', 'trust'),
  item('About', 'about'),
  item('Accessibility', 'accessibility'),
];

/** Exact design/v9 App Sidebar: Overview · Agents · Findings · Fixes · Verification · Regression · Kiro · Reports */
export const APP_NAV: NavItem[] = [
  {
    ...item('Overview', 'app-home'),
    isCurrent: (p) => {
      const c = cleanPath(p);
      return c === APP || c === PATHS['app-journeys'];
    },
  },
  item('Agents', 'app-agents'),
  item('Findings', 'app-scans'),
  {
    label: 'Fixes',
    to: PATHS['app-fixes'],
    isCurrent: (p) => cleanPath(p).startsWith(`${APP}/fixes`),
  },
  {
    label: 'Verification',
    to: `${PATHS['app-fixes']}?step=verify`,
    isCurrent: () => false,
  },
  {
    label: 'Regression',
    to: `${PATHS['app-fixes']}?step=regression`,
    isCurrent: () => false,
  },
  item('Kiro', 'kiro'),
  item('Reports', 'app-reports'),
];

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
