import { useState, useEffect, type ComponentType } from 'react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BreadcrumbItem,
  Breadcrumbs,
  Button,
  ScrollShadow,
  Select,
  SelectItem,
} from '@heroui/react';
import {
  CheckCircle2,
  Code2,
  Compass,
  FileBarChart2,
  Home,
  LayoutGrid,
  RefreshCw,
  ScanSearch,
  Users,
} from 'lucide-react';
import { GhostFigure } from '../components/ghost/GhostFigure';
import { GhostShieldIcon } from '../components/ghost/GhostShieldIcon';
import { InteractiveTour } from '../components/hero/InteractiveTour';
import { RunStateBadge } from '../components/journey/RunStateBadge';
import { APP_NAV, NOT_FOUND_TITLE, pageFor, to, trailFor } from '../routes';
import { useRun } from '../runs/runContext';
import { getScenarioDef } from '../runs/scenarios';

type SidebarIcon = ComponentType<{ size?: number; className?: string }>;

const SIDE_ICONS: Record<string, SidebarIcon> = {
  Overview: Home,
  Agents: Users,
  Findings: ScanSearch,
  Fixes: Code2,
  Verification: CheckCircle2,
  Regression: RefreshCw,
  Kiro: GhostShieldIcon,
  Reports: FileBarChart2,
};

export function AppLayout() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { scenario, variant, mode, isRunning, setVariant, history, result } = useRun();
  const [tourOpen, setTourOpen] = useState(false);
  const current = pageFor(pathname);
  const trail = current ? trailFor(current.id) : [];
  const isPossession = current?.id === 'possession';
  const activeScenario = getScenarioDef(scenario);
  const activeStepParam = params.get('step');
  const latestRunId = result?.run_id ?? history[0]?.run_id;

  useEffect(() => {
    setTourOpen(false);
  }, [pathname]);

  function resolveSidebarTarget(label: string, fallback: string): string {
    if (label === 'Verification' && latestRunId) {
      return `${to('app-fixes')}/${latestRunId}?step=verify`;
    }
    if (label === 'Regression' && latestRunId) {
      return `${to('app-fixes')}/${latestRunId}?step=regression`;
    }
    return fallback;
  }

  function isSidebarItemActive(label: string, defaultCurrent: boolean): boolean {
    if (label === 'Overview') return defaultCurrent || isPossession;
    if (label === 'Verification') return pathname.startsWith('/app/fixes') && activeStepParam === 'verify';
    if (label === 'Regression') return pathname.startsWith('/app/fixes') && activeStepParam === 'regression';
    if (label === 'Fixes') {
      return pathname.startsWith('/app/fixes') && activeStepParam !== 'verify' && activeStepParam !== 'regression';
    }
    return defaultCurrent;
  }

  return (
    <div className="flex flex-1 flex-col pb-8">
      <div className="v9-frame v9-appframe">
        {/* Sticky v9 Sub-Header Bar matching design/v9/index.html */}
        <div className="v9-apphead">
          <div className="flex min-w-0 items-center gap-2.5">
            {isPossession ? (
              <GhostShieldIcon size={20} className="shrink-0 text-[#c4b5fd]" />
            ) : (
              <GhostFigure tone="white" face="happy" size={26} className="shrink-0" />
            )}

            <Breadcrumbs
              aria-label="Breadcrumb"
              size="sm"
              variant="light"
              separator={<span className="px-1 text-base text-[#7d74a8]">›</span>}
              classNames={{
                list: 'flex-wrap gap-0.5 text-[15px]',
              }}
            >
              {isPossession ? (
                <BreadcrumbItem onPress={() => navigate(to('kiro'))} className="cursor-pointer font-semibold text-[#d2d5ee] hover:text-white">
                  Kiro
                </BreadcrumbItem>
              ) : (
                <BreadcrumbItem onPress={() => navigate(to('app-home'))} className="cursor-pointer font-bold text-white">
                  Haunted Audit
                </BreadcrumbItem>
              )}

              {isPossession ? (
                [
                  <BreadcrumbItem
                    key="journey-label"
                    onPress={() => navigate(to('app-journeys'))}
                    className="cursor-pointer text-[#d2d5ee] hover:text-white"
                  >
                    Journey: <b className="text-white">{activeScenario.submitLabel}</b>
                  </BreadcrumbItem>,
                  <BreadcrumbItem key="possession-mode" isCurrent className="font-bold text-[#c9b5ff] text-glow-violet">
                    Possession Mode
                  </BreadcrumbItem>,
                ]
              ) : (
                (current ? trail.filter((p) => p.id !== 'app-home') : [null]).map((p, i, all) => {
                  const isLast = i === all.length - 1;
                  return (
                    <BreadcrumbItem
                      key={p?.id ?? 'not-found'}
                      isCurrent={isLast}
                      onPress={p && !isLast ? () => navigate(to(p.id)) : undefined}
                      className={
                        isLast
                          ? 'font-bold text-[#c9b5ff] text-glow-violet'
                          : 'cursor-pointer text-[#d2d5ee] hover:text-white'
                      }
                    >
                      {p ? p.h1 : NOT_FOUND_TITLE}
                    </BreadcrumbItem>
                  );
                })
              )}
            </Breadcrumbs>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2.5">
            {isPossession && (
              <div className="hidden md:flex items-center gap-2 text-sm text-ink-muted">
                <label htmlFor="v9-head-variant" className="text-xs font-medium text-ink-muted">
                  Variant
                </label>
                <Select
                  id="v9-head-variant"
                  aria-label="Variant"
                  size="sm"
                  disallowEmptySelection
                  selectedKeys={[variant]}
                  isDisabled={isRunning}
                  onSelectionChange={(keys) => {
                    const v = Array.from(keys)[0];
                    if (v === 'broken' || v === 'fixed') setVariant(v);
                  }}
                  className="w-48"
                  classNames={{
                    trigger: 'h-8 min-h-8 rounded-lg border border-[#2b3254] bg-[#0d1022] text-white',
                    value: 'text-xs font-medium text-white',
                    popoverContent: 'border border-[#2b3254] bg-[#151a33] text-white',
                  }}
                >
                  <SelectItem key="broken" textValue="broken (barrier present)">
                    broken (barrier present)
                  </SelectItem>
                  <SelectItem key="fixed" textValue="fixed (barrier repaired)">
                    fixed (barrier repaired)
                  </SelectItem>
                </Select>
                <span className="text-xs text-ink-muted">
                  · {mode === 'scripted' ? 'scripted, no AI' : 'Bedrock LLM'}
                </span>
              </div>
            )}

            {current && (
              <Button
                type="button"
                size="sm"
                radius="full"
                variant="flat"
                startContent={<Compass size={13} className="text-violet-300" aria-hidden="true" />}
                onPress={() => setTourOpen(true)}
                className="h-7 border border-[#2b3254] bg-[#1d2140] px-2.5 text-xs font-semibold text-white hover:border-violet-400"
              >
                Tour
              </Button>
            )}
            <RunStateBadge />
          </div>
        </div>

        {/* Tablet/Mobile (< lg): Single compact horizontally scrollable v9 Workspace Strip */}
        <nav
          aria-label="Workspace tabs"
          className="flex items-center gap-1.5 overflow-x-auto border-b border-[#2a2350] bg-[#100c22] px-3 py-2 lg:hidden"
        >
          {APP_NAV.map((item) => {
            const Icon = SIDE_ICONS[item.label] ?? LayoutGrid;
            const active = isSidebarItemActive(item.label, item.isCurrent(pathname));
            const target = resolveSidebarTarget(item.label, item.to);
            return (
              <Button
                key={item.label}
                as={Link}
                to={target}
                role="link"
                size="sm"
                radius="lg"
                variant="flat"
                startContent={<Icon size={14} className="shrink-0 text-[#c4b5fd]" aria-hidden="true" />}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? 'h-8 shrink-0 bg-gradient-to-r from-[#3a2479] to-[#2a1a5c] px-3 text-xs font-bold text-white shadow-[0_0_12px_#7c3aed55]'
                    : 'h-8 shrink-0 border border-[#2b3254] bg-[#14172f] px-3 text-xs font-medium text-[#d6d9f0]'
                }
              >
                {item.label}
              </Button>
            );
          })}
        </nav>

        {/* Workspace Body: Full-height design/v9 Sidebar Rail + Fluid Content */}
        <div className="v9-appbody">
          <aside className="v9-side hidden lg:block">
            <ScrollShadow className="sticky top-[106px] max-h-[calc(100dvh-120px)] pr-0.5">
              <nav aria-label="App" className="flex flex-col gap-1">
                {APP_NAV.map((item) => {
                  const Icon = SIDE_ICONS[item.label] ?? LayoutGrid;
                  const active = isSidebarItemActive(item.label, item.isCurrent(pathname));
                  const target = resolveSidebarTarget(item.label, item.to);
                  return (
                    <Link
                      key={item.label}
                      to={target}
                      aria-current={active ? 'page' : undefined}
                      className={[
                        'flex min-h-[38px] items-center gap-[12px] rounded-[12px] px-[12px] text-[15px] no-underline transition-all',
                        active
                          ? 'bg-gradient-to-r from-[#3a2479] to-[#2a1a5c] font-bold text-white shadow-[inset_3px_0_0_#b794ff,0_0_16px_#7c3aed55]'
                          : 'font-medium text-[#d6d9f0] hover:bg-[#1c143d] hover:text-white',
                      ].join(' ')}
                    >
                      <Icon size={19} className="shrink-0 text-[#c4b5fd]" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </ScrollShadow>
          </aside>

          <main
            id="main-content"
            tabIndex={-1}
            aria-label="Haunted Audit app"
            className="v9-content focus-visible:outline-none"
          >
            <Outlet />
          </main>
        </div>
      </div>

      {current && (
        <InteractiveTour isOpen={tourOpen} onClose={() => setTourOpen(false)} pageId={current.id} />
      )}
    </div>
  );
}
