import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@heroui/react';
import { Compass } from 'lucide-react';
import { InteractiveTour } from '../components/hero/InteractiveTour';
import { RunStateBadge } from '../components/journey/RunStateBadge';
import { NOT_FOUND_TITLE, pageFor, to } from '../routes';

export function MarketingLayout() {
  const { pathname } = useLocation();
  const [tourOpen, setTourOpen] = useState(false);
  const current = pageFor(pathname);
  const isHome = current?.id === 'home';

  return (
    <main
      id="main-content"
      tabIndex={-1}
      aria-label="Haunted Audit"
      className={[
        'relative z-[1] flex flex-1 flex-col focus-visible:outline-none',
        isHome ? 'min-h-0' : 'pb-24 md:pb-12',
      ].join(' ')}
    >
      {!isHome && (
        <div className="sticky top-14 z-30 bg-base-panel/75 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
            <nav aria-label="Breadcrumb" className="text-sm font-ui text-white/80">
              <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
                <li>
                  <Link
                    to={to('home')}
                    className="inline-flex min-h-9 items-center rounded text-white/85 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
                  >
                    Home
                  </Link>
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-white/50">/</span>
                  <span aria-current="page" className="font-semibold text-white">
                    {current ? current.h1 : NOT_FOUND_TITLE}
                  </span>
                </li>
              </ol>
            </nav>
            <div className="flex items-center gap-2">
              {current && (
                <Button
                  type="button"
                  size="sm"
                  variant="flat"
                  startContent={<Compass size={14} className="text-violet-neon" aria-hidden="true" />}
                  onPress={() => setTourOpen(true)}
                  className="h-7 bg-violet-600/20 px-2.5 text-xs font-semibold text-white hover:bg-violet-600/35"
                >
                  Tour
                </Button>
              )}
              <RunStateBadge />
            </div>
          </div>
        </div>
      )}
      <Outlet />
      {current && !isHome && (
        <InteractiveTour isOpen={tourOpen} onClose={() => setTourOpen(false)} pageId={current.id} />
      )}
    </main>
  );
}
