/**
 * MarketingLayout: main area for the public pages. The top menu and footer come from RootLayout.
 */
import { Outlet } from 'react-router-dom';

export function MarketingLayout() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      aria-label="Haunted Audit"
      className="relative z-[1] pt-14 pb-16 min-h-[70vh] focus-visible:outline-none"
    >
      <Outlet />
    </main>
  );
}
