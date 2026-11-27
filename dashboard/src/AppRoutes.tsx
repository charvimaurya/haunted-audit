/**
 * AppRoutes: mounts every page in the route table (src/routes.ts) and every redirect.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { MarketingLayout } from './layouts/MarketingLayout';
import { RootLayout } from './layouts/RootLayout';
import { PAGES, REDIRECTS, to, type PageId } from './routes';

type Page = LazyExoticComponent<ComponentType>;

const NotFound = lazy(() => import('./pages/NotFound'));
const FixDetail = lazy(() => import('./pages/app/FixDetail'));

const COMPONENTS: Partial<Record<PageId, Page>> = {
  home: lazy(() => import('./pages/Home')),
  'how-it-works': lazy(() => import('./pages/marketing/HowItWorks')),
  results: lazy(() => import('./pages/marketing/Results')),
  trust: lazy(() => import('./pages/marketing/Trust')),
  kiro: lazy(() => import('./pages/marketing/Kiro')),
  about: lazy(() => import('./pages/marketing/About')),
  accessibility: lazy(() => import('./pages/marketing/Accessibility')),
  'app-home': lazy(() => import('./pages/app/AppHome')),
  'app-scans': lazy(() => import('./pages/app/Scans')),
  'app-journeys': lazy(() => import('./pages/app/Journeys')),
  possession: lazy(() => import('./pages/app/Possession')),
  'app-agents': lazy(() => import('./pages/app/Agents')),
  'app-fixes': lazy(() => import('./pages/app/FixesHub')),
  'app-reports': lazy(() => import('./pages/app/Reports')),
  'app-settings': lazy(() => import('./pages/app/Settings')),
};

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
            <Route key={r.from} path={r.from} element={<Navigate to={r.to} replace />} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route element={<AppLayout />}>
          {routesFor('app')}
          <Route path={`${to('app-fixes')}/find`} element={<Navigate to={to('app-fixes')} replace />} />
          <Route path={`${to('app-fixes')}/fix`} element={<Navigate to={to('app-fixes')} replace />} />
          <Route path={`${to('app-fixes')}/verify`} element={<Navigate to={to('app-fixes')} replace />} />
          <Route path={`${to('app-fixes')}/regression`} element={<Navigate to={to('app-fixes')} replace />} />
          <Route path={`${to('app-fixes')}/:runId`} element={<FixDetail />} />
          <Route path={`${to('app-home')}/*`} element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
