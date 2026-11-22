/**
 * AppRoutes: mounts every page in the route table (src/routes.ts) and every redirect.
 * Public pages use MarketingLayout; /app pages use AppLayout. Both sit inside RootLayout,
 * which draws the v7 top menu once for every page.
 * Pages load only when first visited. Wrap in a router (BrowserRouter in main.tsx, MemoryRouter in tests).
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { MarketingLayout } from './layouts/MarketingLayout';
import { RootLayout } from './layouts/RootLayout';
import { FIX_STEPS, PAGES, REDIRECTS, to, type PageId } from './routes';

type Page = LazyExoticComponent<ComponentType>;

const NotFound = lazy(() => import('./pages/NotFound'));
const Fixes = lazy(() => import('./pages/app/Fixes'));

const COMPONENTS: Partial<Record<PageId, Page>> = {
  home: lazy(() => import('./pages/Home')),
  'how-it-works': lazy(() => import('./pages/marketing/HowItWorks')),
  try: lazy(() => import('./pages/marketing/Try')),
  results: lazy(() => import('./pages/marketing/Results')),
  trust: lazy(() => import('./pages/marketing/Trust')),
  kiro: lazy(() => import('./pages/marketing/Kiro')),
  roadmap: lazy(() => import('./pages/marketing/Roadmap')),
  about: lazy(() => import('./pages/marketing/About')),
  accessibility: lazy(() => import('./pages/marketing/Accessibility')),
  'app-home': lazy(() => import('./pages/app/AppHome')),
  'app-scans': lazy(() => import('./pages/app/Scans')),
  'app-journeys': lazy(() => import('./pages/app/Journeys')),
  possession: lazy(() => import('./pages/app/Possession')),
  'app-agents': lazy(() => import('./pages/app/Agents')),
  'app-reports': lazy(() => import('./pages/app/Reports')),
  'app-settings': lazy(() => import('./pages/app/Settings')),
};

/** Redirect that keeps `:step` from the old URL. */
function KeepStep({ to }: { to: string }) {
  const { step } = useParams();
  return <Navigate to={to.replace(':step', step ?? FIX_STEPS[0])} replace />;
}

function routesFor(shell: 'marketing' | 'app') {
  return PAGES.filter((p) => p.shell === shell && COMPONENTS[p.id]).map((p) => {
    const C = COMPONENTS[p.id]!;
    return <Route key={p.id} path={p.path} element={<C />} />;
  });
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route element={<MarketingLayout />}>
          {routesFor('marketing')}
          {REDIRECTS.map((r) => (
            <Route key={r.from} path={r.from} element={<KeepStep to={r.to} />} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route element={<AppLayout />}>
          {routesFor('app')}
          <Route path={to('app-fixes-find').replace(/find$/, ':step')} element={<Fixes />} />
          <Route path={`${to('app-home')}/*`} element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
