import { Link, useLocation } from 'react-router-dom';
import { ChartColumn, Ghost, Home, LayoutGrid, Wrench } from 'lucide-react';
import { to } from '../../routes';

interface TabItem {
  label: string;
  to: string;
  icon: typeof Home;
  isCurrent: (pathname: string) => boolean;
  featured?: boolean;
}

const IOS_TABS: TabItem[] = [
  {
    label: 'Home',
    to: to('home'),
    icon: Home,
    isCurrent: (p) => p === '/',
  },
  {
    label: 'App',
    to: to('app-home'),
    icon: LayoutGrid,
    isCurrent: (p) =>
      p === '/app' ||
      (p.startsWith('/app/') &&
        !p.startsWith('/app/journeys/send-payment/possession') &&
        !p.startsWith('/app/fixes') &&
        p !== '/app/reports'),
  },
  {
    label: 'Possess',
    to: to('possession'),
    icon: Ghost,
    featured: true,
    isCurrent: (p) => p.startsWith('/app/journeys/send-payment/possession'),
  },
  {
    label: 'Fixes',
    to: to('app-fixes'),
    icon: Wrench,
    isCurrent: (p) => p.startsWith('/app/fixes'),
  },
  {
    label: 'Reports',
    to: to('app-reports'),
    icon: ChartColumn,
    isCurrent: (p) => p === '/app/reports',
  },
];

export function MobileBottomBar() {
  const { pathname } = useLocation();
  if (pathname === '/') return null;

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 bg-[#12091f]/90 backdrop-blur-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.65)] md:hidden pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="m-0 mx-auto grid max-w-md list-none grid-cols-5 items-center px-1.5 py-1.5" role="list">
        {IOS_TABS.map((tab) => {
          const active = tab.isCurrent(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.label} className="flex justify-center">
              <Link
                to={tab.to}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex min-h-[48px] w-full flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[11px] font-ui transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon',
                  active
                    ? 'text-white font-semibold'
                    : 'text-white/75 hover:text-white',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-7 w-11 items-center justify-center rounded-full transition-colors',
                    tab.featured
                      ? active
                        ? 'bg-violet-600 text-white shadow-glow-sm'
                        : 'bg-violet-600/30 text-violet-200'
                      : active
                        ? 'bg-violet-600/35 text-white'
                        : 'text-white/80',
                  ].join(' ')}
                >
                  <Icon size={17} aria-hidden="true" />
                </span>
                <span className="leading-none tracking-tight">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
