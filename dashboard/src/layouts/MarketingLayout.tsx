import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BreadcrumbItem, Breadcrumbs, Button } from '@heroui/react';
import { Compass } from 'lucide-react';
import { InteractiveTour } from '../components/hero/InteractiveTour';
import { RunStateBadge } from '../components/journey/RunStateBadge';
import { SiteFooter } from '../components/layout/SiteFooter';
import { NOT_FOUND_TITLE, pageFor, to } from '../routes';

export function MarketingLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [tourOpen, setTourOpen] = useState(false);
  const current = pageFor(pathname);
  const isHome = current?.id === 'home';

  useEffect(() => {
    setTourOpen(false);
  }, [pathname]);

  if (isHome) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        aria-label="Haunted Audit"
        className="relative z-[1] flex min-h-0 flex-1 flex-col focus-visible:outline-none"
      >
        <Outlet />
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-between">
      <div className="v9-frame v9-appframe">
        <div className="v9-apphead">
          <Breadcrumbs aria-label="Breadcrumb" size="sm" variant="light">
            <BreadcrumbItem onPress={() => navigate(to('home'))} className="cursor-pointer font-bold text-white">
              Home
            </BreadcrumbItem>
            <BreadcrumbItem isCurrent className="font-bold text-[#c9b5ff] text-glow-violet">
              {current ? current.h1 : NOT_FOUND_TITLE}
            </BreadcrumbItem>
          </Breadcrumbs>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {current && (
              <Button
                type="button"
                size="sm"
                radius="full"
                variant="flat"
                startContent={<Compass size={14} className="text-violet-300" aria-hidden="true" />}
                onPress={() => setTourOpen(true)}
                className="h-8 border border-[#2b3254] bg-[#1d2140] px-3 text-xs font-semibold text-white hover:border-violet-400"
              >
                Tour
              </Button>
            )}
            <RunStateBadge />
          </div>
        </div>

        <main
          id="main-content"
          tabIndex={-1}
          aria-label="Haunted Audit"
          className="v9-content focus-visible:outline-none"
        >
          <Outlet />
        </main>
      </div>

      <SiteFooter />

      {current && (
        <InteractiveTour isOpen={tourOpen} onClose={() => setTourOpen(false)} pageId={current.id} />
      )}
    </div>
  );
}
