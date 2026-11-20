/**
 * AppRoutes: one route per page. Pages load only when first visited.
 * Wrap in a router (BrowserRouter in main.tsx, MemoryRouter in tests).
 */
import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';
import { JOURNEY } from './routes';

const Home = lazy(() => import('./pages/Home'));
const Scans = lazy(() => import('./pages/Scans'));
const Possession = lazy(() => import('./pages/Possession'));
const Agents = lazy(() => import('./pages/Agents'));
const FixStepPage = lazy(() => import('./pages/FixStep'));
const Kiro = lazy(() => import('./pages/Kiro'));
const Reports = lazy(() => import('./pages/Reports'));
const NotFound = lazy(() => import('./pages/NotFound'));

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<Home />} />
        <Route path="scans" element={<Scans />} />
        <Route path={`${JOURNEY.slice(1)}`}>
          <Route index element={<Navigate to="possession" replace />} />
          <Route path="possession" element={<Possession />} />
          <Route path="agents" element={<Agents />} />
          <Route path="fixes" element={<Navigate to="find" replace />} />
          <Route path="fixes/:step" element={<FixStepPage />} />
        </Route>
        <Route path="kiro" element={<Kiro />} />
        <Route path="reports" element={<Reports />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
