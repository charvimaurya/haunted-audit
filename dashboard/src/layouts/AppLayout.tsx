import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  ScrollShadow,
  Tooltip,
} from '@heroui/react';
import {
  ChartColumn,
  Compass,
  Ghost,
  LayoutGrid,
  Menu,
  PanelLeftOpen,
  ScanSearch,
  Send,
  Settings,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { InteractiveTour } from '../components/hero/InteractiveTour';
import { RunStateBadge } from '../components/journey/RunStateBadge';
import { APP_NAV, NOT_FOUND_TITLE, pageFor, to, trailFor } from '../routes';

const ICONS: Record<string, LucideIcon> = {
  Overview: LayoutGrid,
  Scans: ScanSearch,
  Journeys: Send,
  Agents: Users,
  Fixes: Wrench,
  Reports: ChartColumn,
  Settings,
};

const SIDEBAR_GROUPS = [
  { title: 'Workspace', labels: ['Overview', 'Scans', 'Journeys'] },
  { title: 'Audit & Repair', labels: ['Agents', 'Fixes'] },
  { title: 'System', labels: ['Reports', 'Settings'] },
];

export function AppLayout() {
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const current = pageFor(pathname);
  const trail = current ? trailFor(current.id) : [];

  useEffect(() => {
    setDrawerOpen(false);
    setTourOpen(false);
  }, [pathname]);

  // Auto-close workspace drawer if viewport grows into desktop
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => {
      if (mq.matches) setDrawerOpen(false);
    };
    sync();
    mq.addEventListener('change', sync);
    window.addEventListener('resize', sync);
    return () => {
      mq.removeEventListener('change', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);

  const linkClass = (isActive: boolean) =>
    [
      'flex min-h-10 w-full items-center rounded-xl px-3 text-sm font-ui transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon',
      isActive
        ? 'bg-violet-600/25 font-semibold text-white shadow-glow-sm'
        : 'text-white/80 hover:bg-white/10 hover:text-white',
    ].join(' ');

  const renderGroups = (hideSettingsOnMobile = false) => (
    <div className="flex flex-col gap-4">
      {SIDEBAR_GROUPS.map((group) => {
        const items = APP_NAV.filter((i) => group.labels.includes(i.label));
        return (
          <div key={group.title}>
            <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              {group.title}
            </p>
            <ul className="m-0 flex list-none flex-col gap-1 p-0" role="list">
              {items.map((item) => {
                const Icon = ICONS[item.label];
                const active = item.isCurrent(pathname);
                return (
                  <li
                    key={item.label}
                    className={hideSettingsOnMobile && item.label === 'Settings' ? 'hidden md:block' : undefined}
                  >
                    <Link
                      to={item.to}
                      className={linkClass(active)}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setDrawerOpen(false)}
                    >
                      {Icon && (
                        <Icon
                          size={17}
                          className={['mr-3 shrink-0', active ? 'text-violet-neon' : 'text-ink-muted'].join(' ')}
                          aria-hidden="true"
                        />
                      )}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      {/* Desktop HeroUI Sidebar (lg+) */}
      <aside
        className="hidden w-64 shrink-0 bg-[#12091f]/95 lg:block"
        aria-label="App"
      >
        <div className="sticky top-14 flex h-[calc(100dvh-3.5rem)] flex-col p-3.5">
          {/* <div className="mb-3 flex items-center justify-between rounded-xl bg-base-panel/90 px-3 py-2">
            <div className="flex items-center gap-2">
              <Ghost size={16} className="text-violet-neon" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-wide text-white">Guardrail</span>
            </div>
            <Chip size="sm" variant="flat" color="secondary" className="h-5 text-[10px]">
              WCAG 2.2
            </Chip>
          </div> */}
          <ScrollShadow className="flex-1 pr-0.5">
            <nav aria-label="App">{renderGroups(false)}</nav>
          </ScrollShadow>
        </div>
      </aside>

      {/* Tablet Compact Icon-Rail (md to lg) */}
      <aside
        className="hidden w-[84px] shrink-0 bg-[#12091f]/95 md:flex lg:hidden flex-col items-center"
        aria-label="Tablet workspace rail"
      >
        <div className="sticky top-14 flex h-[calc(100dvh-3.5rem)] w-full flex-col items-center py-3 px-1.5">
          <Tooltip content="Expand workspace menu" placement="right">
            <Button
              type="button"
              isIconOnly
              size="sm"
              variant="flat"
              color="secondary"
              aria-label="Open full workspace menu"
              onPress={() => setDrawerOpen(true)}
              className="mb-3 h-9 w-12 bg-violet-600/20 text-white"
            >
              <PanelLeftOpen size={17} aria-hidden="true" />
            </Button>
          </Tooltip>
          <ScrollShadow className="w-full flex-1">
            <nav aria-label="Workspace quick rail">
              <ul className="m-0 flex list-none flex-col items-center gap-1 p-0" role="list">
                {APP_NAV.map((item) => {
                  const Icon = ICONS[item.label];
                  const active = item.isCurrent(pathname);
                  return (
                    <li key={item.label} className="w-full">
                      <Tooltip content={item.label} placement="right">
                        <Link
                          to={item.to}
                          aria-current={active ? 'page' : undefined}
                          className={[
                            'flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-ui transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon',
                            active
                              ? 'bg-violet-600/30 text-white font-semibold shadow-glow-sm'
                              : 'text-white/75 hover:bg-white/10 hover:text-white',
                          ].join(' ')}
                        >
                          {Icon && (
                            <Icon
                              size={17}
                              className={active ? 'text-violet-neon' : 'text-white/80'}
                              aria-hidden="true"
                            />
                          )}
                          <span className="max-w-full truncate leading-none">{item.label}</span>
                        </Link>
                      </Tooltip>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </ScrollShadow>
        </div>
      </aside>

      {/* Mobile workspace drawer trigger */}
      <div className="flex h-12 items-center justify-between bg-base-panel/70 px-4 md:hidden">
        <Button
          type="button"
          size="sm"
          variant="flat"
          color="secondary"
          startContent={<Menu size={16} aria-hidden="true" />}
          aria-expanded={drawerOpen}
          onPress={() => setDrawerOpen(true)}
          className="bg-violet-600/25 font-semibold text-white"
        >
          Workspace ({current?.h1 ?? 'Menu'})
        </Button>
        <RunStateBadge />
      </div>

      {/* Shared HeroUI Drawer for Mobile & Tablet (hidden automatically on lg+ desktop) */}
      <Drawer
        isOpen={drawerOpen}
        onOpenChange={setDrawerOpen}
        placement="left"
        size="xs"
        classNames={{
          wrapper: 'lg:hidden',
          backdrop: 'lg:hidden',
          base: 'bg-[#12091f] text-white',
          header: 'text-white',
        }}
      >
        <DrawerContent>
          <DrawerHeader className="flex items-center gap-2 text-base font-bold text-white">
            <Ghost size={18} className="text-violet-neon" aria-hidden="true" />
            <span>Haunted Audit Workspace</span>
          </DrawerHeader>
          <DrawerBody className="py-4">
            <nav aria-label="Workspace menu drawer">{renderGroups(true)}</nav>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky Dashboard Sub-Header Breadcrumb Bar */}
        <div className="sticky top-14 z-30 bg-base-panel/75 px-4 py-2 sm:px-6 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <nav aria-label="Breadcrumb" className="text-sm font-ui text-white/80">
              <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
                <li>
                  <Link
                    to={to('app-home')}
                    className="inline-flex min-h-8 items-center rounded text-white/85 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
                  >
                    App
                  </Link>
                </li>
                {(current ? trail.filter((p) => p.id !== 'app-home') : [null]).map((p, i, all) => (
                  <li key={p?.id ?? 'not-found'} className="flex items-center gap-2">
                    <span aria-hidden="true" className="text-white/50">/</span>
                    {p && i < all.length - 1 ? (
                      <Link
                        to={to(p.id)}
                        className="inline-flex min-h-8 items-center rounded text-white/85 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
                      >
                        {p.h1}
                      </Link>
                    ) : (
                      <span aria-current="page" className="font-semibold text-white">
                        {p ? p.h1 : NOT_FOUND_TITLE}
                      </span>
                    )}
                  </li>
                ))}
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
              <div className="hidden md:block">
                <RunStateBadge />
              </div>
            </div>
          </div>
        </div>

        <main
          id="main-content"
          tabIndex={-1}
          aria-label="Haunted Audit app"
          className="relative z-[1] flex-1 px-4 py-5 sm:px-6 pb-24 md:pb-12 focus-visible:outline-none"
        >
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
        {current && (
          <InteractiveTour isOpen={tourOpen} onClose={() => setTourOpen(false)} pageId={current.id} />
        )}
      </div>
    </div>
  );
}
