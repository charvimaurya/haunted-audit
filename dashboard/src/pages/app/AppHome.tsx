import { Link } from 'react-router-dom';
import { Button, Card, CardBody, CardFooter, CardHeader, Chip } from '@heroui/react';
import {
  Activity,
  ArrowRight,
  ChartColumn,
  Ghost,
  ScanSearch,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  TriangleAlert,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Page } from '../../components/layout/Page';
import { useFix } from '../../fixes/fixContext';
import { verifiedPct } from '../../fixes/verifiedPct';
import { plantedTotal } from '../../lib/planted';
import { APP_NAV, PAGES, to } from '../../routes';
import { useRun } from '../../runs/runContext';

const TOOL_META: Record<string, { icon: LucideIcon; tag: string }> = {
  Scans: { icon: ScanSearch, tag: 'Scanner' },
  Journeys: { icon: Send, tag: 'Runner' },
  Agents: { icon: Users, tag: 'AI Agent' },
  Findings: { icon: TriangleAlert, tag: 'Triage' },
  Fixes: { icon: Wrench, tag: 'Exorcist' },
  Verification: { icon: ShieldCheck, tag: 'Proof' },
  Regression: { icon: Shield, tag: 'Guardrail' },
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
      label: 'Latest verdict',
      value: result ? result.verdict : '--',
      sub: isRunning ? 'Run in progress' : result ? 'Measured from last run' : 'Not yet measured',
    },
    {
      label: 'Barriers found',
      value: barriersFound !== null ? `${barriersFound} / ${planted}` : `-- / ${planted}`,
      sub: `${planted} planted in Haunted Bank`,
    },
    {
      label: 'Patch validation',
      value: pct !== null ? `${pct}%` : '--',
      sub: pct !== null ? 'Measured after human approval' : 'Not yet measured',
    },
    {
      label: 'Saved possessions',
      value: history.length > 0 ? String(history.length) : '--',
      sub: history.length > 0 ? `${result?.agent_mode ?? mode} mode · localStorage` : 'Not yet measured',
    },
  ];

  return (
    <Page id="app-home">
      {/* HeroUI Dashboard Command Banner */}
      <Card className="mb-6 bg-gradient-to-br from-[#1f1238] via-base-panel to-[#140a24] text-white shadow-glow-sm">
        <CardBody className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-600/25 text-violet-neon shadow-glow-sm">
              <Ghost size={24} aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="m-0 text-lg sm:text-xl font-bold text-white">Start with Possession Mode</h2>
                <Chip size="sm" variant="flat" color="secondary" className="text-xs font-semibold">
                  Haunted Bank Fixture
                </Chip>
              </div>
              <p className="m-0 mt-1 text-sm text-ink-muted">
                Run a keyboard-only or voice-command journey and inspect real barriers. Unmeasured metrics always remain --.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              as={Link}
              to={to('possession')}
              size="sm"
              color="secondary"
              endContent={<ArrowRight size={15} aria-hidden="true" />}
              className="bg-violet-600 px-4 font-semibold text-white shadow-glow-sm"
            >
              Launch Possession Mode
            </Button>
            <Button
              as={Link}
              to={to('app-reports')}
              size="sm"
              variant="flat"
              className="bg-base-surface/60 px-3 font-semibold text-white hover:bg-base-surface"
            >
              Reports
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* HeroUI KPI Telemetry Strip */}
      <section aria-labelledby="kpi-heading" className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <Activity size={16} className="text-violet-neon" aria-hidden="true" />
          <h2 id="kpi-heading" className="m-0 text-sm font-bold uppercase tracking-wider text-ink-muted">
            Run Telemetry
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map((m) => (
            <Card key={m.label} className="bg-base-panel/90 text-white shadow-none">
              <CardBody className="gap-1 p-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{m.label}</span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-white">{m.value}</span>
                <span className="text-xs text-ink-faint">{m.sub}</span>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* HeroUI Bento Workspace Grid */}
      <section aria-labelledby="app-tools-heading">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="app-tools-heading" className="m-0 text-lg sm:text-xl font-bold font-ui text-white">
            Workspace Modules
          </h2>
          <span className="text-xs text-ink-muted">{tools.length} modules</span>
        </div>
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3" role="list">
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
                  className="h-full w-full bg-base-panel text-left text-white shadow-none transition-colors hover:bg-[#22143a]"
                >
                  <CardHeader className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-600/20 text-violet-neon">
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      <span className="text-base font-bold text-white">{item.label}</span>
                    </div>
                    <Chip size="sm" variant="flat" color="secondary" className="h-5 text-[11px] font-medium">
                      {meta.tag}
                    </Chip>
                  </CardHeader>
                  <CardBody className="px-4 py-1.5">
                    {def && <span className="text-sm leading-relaxed text-ink-muted">{def.shows}</span>}
                  </CardBody>
                  <CardFooter className="flex items-center justify-between px-4 py-3 text-xs font-semibold text-violet-300">
                    <span>Open {item.label}</span>
                    <ArrowRight size={14} aria-hidden="true" />
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
