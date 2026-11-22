/**
 * AppRoutes: one route per page, read from the manifest in routes.ts.
 * Marketing pages use MarketingLayout. Everything under /app uses AppLayout.
 * Pages load only when first visited. Wrap in a router (BrowserRouter in main.tsx, MemoryRouter in tests).
 */
import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { MarketingLayout } from './layouts/MarketingLayout';
import { RootLayout } from './layouts/RootLayout';
import { APP, JOURNEY } from './routes';

const Home = lazy(() => import('./pages/Home'));
const NotFound = lazy(() => import('./pages/NotFound'));
const LegacyAgents = lazy(() => import('./pages/Agents'));

const HowItWorks = lazy(() => import('./pages/marketing/HowItWorks'));
const Try = lazy(() => import('./pages/marketing/Try'));
const Results = lazy(() => import('./pages/marketing/Results'));
const Trust = lazy(() => import('./pages/marketing/Trust'));
const MarketingKiro = lazy(() => import('./pages/marketing/Kiro'));
const Roadmap = lazy(() => import('./pages/marketing/Roadmap'));
const About = lazy(() => import('./pages/marketing/About'));
const Accessibility = lazy(() => import('./pages/marketing/Accessibility'));

const AppHome = lazy(() => import('./pages/app/AppHome'));
const AppScans = lazy(() => import('./pages/app/Scans'));
const AppJourneys = lazy(() => import('./pages/app/Journeys'));
const AppAgents = lazy(() => import('./pages/app/Agents'));
const AppFixes = lazy(() => import('./pages/app/Fixes'));
const AppRegression = lazy(() => import('./pages/app/Regression'));
const AppReports = lazy(() => import('./pages/app/Reports'));
const AppSettings = lazy(() => import('./pages/app/Settings'));

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route element={<MarketingLayout />}>
          <Route index element={<Home />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="try" element={<Try />} />
          <Route path="results" element={<Results />} />
          <Route path="trust" element={<Trust />} />
          <Route path="kiro" element={<MarketingKiro />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="about" element={<About />} />
          <Route path="accessibility" element={<Accessibility />} />
          {/* Legacy journey URLs. Agents stays mounted; the rest redirect into the app. */}
          <Route path={`${JOURNEY.slice(1)}/agents`} element={<LegacyAgents />} />
          <Route path={JOURNEY.slice(1)} element={<Navigate to={`${APP}/journeys`} replace />} />
          <Route path={`${JOURNEY.slice(1)}/possession`} element={<Navigate to={`${APP}/journeys`} replace />} />
          <Route path={`${JOURNEY.slice(1)}/fixes`} element={<Navigate to={`${APP}/fixes/find`} replace />} />
          <Route path={`${JOURNEY.slice(1)}/fixes/:step`} element={<Navigate to={`${APP}/fixes/find`} replace />} />
          <Route path="scans" element={<Navigate to={`${APP}/scans`} replace />} />
          <Route path="reports" element={<Navigate to={`${APP}/reports`} replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path={APP.slice(1)} element={<AppLayout />}>
          <Route index element={<AppHome />} />
          <Route path="scans" element={<AppScans />} />
          <Route path="journeys" element={<AppJourneys />} />
          <Route path="agents" element={<AppAgents />} />
          <Route path="fixes" element={<Navigate to={`${APP}/fixes/find`} replace />} />
          <Route path="fixes/:step" element={<AppFixes />} />
          <Route path="regression" element={<AppRegression />} />
          <Route path="reports" element={<AppReports />} />
          <Route path="settings" element={<AppSettings />} />
        </Route>
      </Route>
    </Routes>
  );
}
