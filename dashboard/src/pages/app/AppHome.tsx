import { Link } from 'react-router-dom';
import { Button, Card, CardBody, CardFooter, CardHeader, Chip } from '@heroui/react';
import {
  Activity,
  ArrowRight,
  ChartColumn,
  Ghost,
  LayoutGrid,
  ScanSearch,
  Send,
  Settings,
  Users,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { GhostFigure } from '../../components/ghost/GhostFigure';
import { Page } from '../../components/layout/Page';
import { useFix } from '../../fixes/fixContext';
import { verifiedPct } from '../../fixes/verifiedPct';
import { plantedTotal } from '../../lib/planted';
import { APP_NAV, PAGES, to } from '../../routes';
import { useRun } from '../../runs/runContext';

const TOOL_META: Record<string, { icon: LucideIcon; tag: string }> = {
  Possession: { icon: Ghost, tag: 'Runner' },
  Scenarios: { icon: Send, tag: '9 Sandboxes' },
  Agents: { icon: Users, tag: 'AI Agent' },
  Findings: { icon: ScanSearch, tag: 'axe-core' },
  Fixes: { icon: Wrench, tag: 'Exorcist' },
  Kiro: { icon: Zap, tag: 'Workflow' },
  Reports: { icon: ChartColumn, tag: 'Metrics' },
  Settings: { icon: Settings, tag: 'Preferences' },
};

export default function AppHome() {
  const { result, mode, isRunning, history } = useRun();
  const flow = useFix();
  const fix = flow?.fix ?? null;
  const pct = verifiedPct(fix);
  const barriersFound = result?.verdict === 'BLOCKED' && result.blocked_element ? 1 : null;
  const planted = plantedTotal();

  const tools = APP_NAV.filter((item) => item.to !== to('app-home'));

  const metrics = [
    {
      cls: 't1',
      label: 'Latest verdict',
      value: result ? result.verdict : '--',
      sub: isRunning ? 'Run in progress' : result ? 'Measured from last run' : 'Not yet measured',
    },
    {
      cls: 't2',
      label: 'Barriers found',
      value: barriersFound !== null ? `${barriersFound} / ${planted}` : `-- / ${planted}`,
      sub: `${planted} planted baseline`,
    },
    {
      cls: 't3',
      label: 'Patch validation',
      value: pct !== null ? `${pct}%` : '--',
      sub: pct !== null ? 'Measured after human approval' : 'Not yet measured',
    },
    {
      cls: 't4',
      label: 'Saved possessions',
      value: history.length > 0 ? String(history.length) : '--',
      sub: history.length > 0 ? `${result?.agent_mode ?? mode} mode · localStorage` : 'Not yet measured',
    },
  ];

  return (
    <Page id="app-home">
      {/* Command Banner HeroUI Card */}
      <Card className="panel-glow mb-4 text-white shadow-none">
        <CardBody className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <GhostFigure tone="white" face="happy" size={40} className="shrink-0" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="m-0 text-base sm:text-lg font-extrabold text-white">Start with Possession Mode</h2>
                <Chip size="sm" variant="flat" className="border border-[#2b3254] bg-[#1d2140] text-xs font-semibold text-violet-200">
                  9 Sandbox Domains
                </Chip>
              </div>
              <p className="m-0 mt-1 text-xs sm:text-sm text-ink-muted">
                Run a keyboard-only or voice-command journey and inspect real barriers. Unmeasured metrics always remain --.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              as={Link}
              to={to('possession')}
              size="sm"
              endContent={<ArrowRight size={14} aria-hidden="true" />}
              className="h-9 rounded-xl border border-[#a78bfa] bg-gradient-to-b from-[#3b1f86] to-[#2a1466] px-4 font-bold text-white shadow-[0_0_16px_#8b5cf666]"
            >
              Launch Possession Mode
            </Button>
            <Button
              as={Link}
              to={to('app-reports')}
              size="sm"
              className="h-9 rounded-xl border border-[#353c60] bg-[#1e2340] px-3.5 font-bold text-[#dfe3ff]"
            >
              Reports
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Run Telemetry KPI Grid */}
      <section aria-labelledby="kpi-heading" className="mb-5">
        <div className="mb-2.5 flex items-center gap-2">
          <Activity size={15} className="text-violet-300" aria-hidden="true" />
          <h2 id="kpi-heading" className="m-0 text-xs font-bold uppercase tracking-wider text-ink-muted">
            Run Telemetry
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <Card key={m.label} className={`v9-tile ${m.cls} text-white shadow-none`}>
              <CardBody className="flex flex-col gap-1 p-3.5 text-left">
                <span className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{m.label}</span>
                <span className="font-mono text-2xl font-bold text-white">{m.value}</span>
                <span className="text-xs text-ink-faint">{m.sub}</span>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* Workspace Modules HeroUI Grid */}
      <section aria-labelledby="app-tools-heading">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <h2 id="app-tools-heading" className="m-0 text-base sm:text-lg font-extrabold text-white">
            Workspace Modules
          </h2>
          <span className="text-xs text-ink-muted">{tools.length} modules</span>
        </div>
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2 xl:grid-cols-3" role="list">
          {tools.map((item) => {
            const def = PAGES.find((p) => p.path === item.to);
            const meta = TOOL_META[item.label] ?? { icon: LayoutGrid, tag: 'Module' };
            const Icon = meta.icon;
            return (
              <li key={item.to}>
                <Card
                  as={Link}
                  to={item.to}
                  isPressable
                  className="v9-card h-full w-full text-left text-white no-underline shadow-none transition-transform hover:scale-[1.01]"
                >
                  <CardHeader className="flex items-center justify-between gap-2 px-4 pt-4 pb-1.5">
                    <span className="flex items-center gap-2.5">
                      <span className="v9-neon" aria-hidden="true">
                        <Icon size={17} />
                      </span>
                      <span className="text-base font-bold text-white">{item.label}</span>
                    </span>
                    <Chip size="sm" variant="flat" className="border border-[#2b3254] bg-[#1d2140] text-[11px] text-ink-muted">
                      {meta.tag}
                    </Chip>
                  </CardHeader>
                  <CardBody className="px-4 py-1">
                    {def && <p className="m-0 text-xs sm:text-sm text-ink-muted">{def.shows}</p>}
                  </CardBody>
                  <CardFooter className="px-4 pt-1.5 pb-3.5 text-xs font-semibold text-violet-300">
                    <span className="inline-flex items-center gap-1.5">
                      <span>Open {item.label}</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </span>
                  </CardFooter>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>
    </Page>
  );
}
