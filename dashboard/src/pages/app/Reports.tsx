import { Link } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, Chip } from '@heroui/react';
import { motion } from 'framer-motion';
import { BarChart3, Clock, Ghost, History, Layers, ShieldCheck, Target, Trash2, Wrench } from 'lucide-react';
import { VerifierEvidence } from '../../components/fixes/VerifierEvidence';
import { Page } from '../../components/layout/Page';
import { NightWatchSection } from '../../components/results/NightWatchSection';
import { OutcomeCard } from '../../components/results/OutcomeCard';
import { ResultState } from '../../components/results/ResultState';
import { useFix } from '../../fixes/fixContext';
import { verifiedPct } from '../../fixes/verifiedPct';
import { useImmersion } from '../../immersion/ImmersionContext';
import { plantedTotal } from '../../lib/planted';
import { to } from '../../routes';
import { useRun } from '../../runs/runContext';

export default function Reports() {
  const { result, mode, apiStatus, isRunning, history, clearHistory } = useRun();
  const flow = useFix();
  const { motionAllowed } = useImmersion();
  const fix = flow?.fix ?? null;

  const totalPlanted = plantedTotal();
  const latestBlocked = result?.verdict === 'BLOCKED' && result.blocked_element ? 1 : null;
  const pct = verifiedPct(fix);
  const runsCount = history.length > 0 ? history.length : null;
  const avgLatency =
    history.length > 0
      ? Math.round(history.reduce((acc, r) => acc + r.latency_ms, 0) / history.length)
      : null;

  const agentMode = result?.agent_mode ?? mode;

  // Bar Chart 1: Outcome & Runner Breakdown (strictly from real saved runs in localStorage)
  const brokenBlockedCount = history.filter((r) => r.variant === 'broken' && r.verdict === 'BLOCKED').length;
  const fixedClearCount = history.filter((r) => r.variant === 'fixed' && r.verdict === 'PASSED').length;
  const keyboardCount = history.filter((r) => r.agent_kind === 'keyboard').length;
  const voiceCount = history.filter((r) => r.agent_kind === 'voice').length;
  const breakdownBars = [
    { key: 'broken', label: 'Broken blocked', count: brokenBlockedCount, color: 'bg-ghost-blocked' },
    { key: 'fixed', label: 'Fixed clear', count: fixedClearCount, color: 'bg-ghost-verified' },
    { key: 'kbd', label: 'Keyboard runs', count: keyboardCount, color: 'bg-violet-500' },
    { key: 'voice', label: 'Voice runs', count: voiceCount, color: 'bg-sky-400' },
  ];
  const maxBreakdown = Math.max(1, ...breakdownBars.map((b) => b.count));

  // Bar Chart 2: Recent Saved Runs Latency & Steps
  const recentRuns = history.slice(0, 6);
  const maxLatency = Math.max(1, ...recentRuns.map((r) => r.latency_ms));

  const metricCards = [
    {
      label: 'Planted barriers detected',
      value: latestBlocked !== null ? `${latestBlocked} / ${totalPlanted ?? '--'}` : '--',
      sub: latestBlocked !== null ? `${agentMode} · measured` : 'not yet measured',
      pctFill: latestBlocked !== null && totalPlanted ? Math.round((latestBlocked / totalPlanted) * 100) : 0,
      barColor: 'bg-ghost-blocked',
      icon: Target,
      tone: 'text-ghost-blocked',
    },
    {
      label: 'Patch verification',
      value: pct !== null ? `${pct}%` : '--',
      sub: pct !== null ? `${fix?.verify?.agent_mode ?? agentMode} · measured` : 'not yet measured',
      pctFill: pct ?? 0,
      barColor: 'bg-ghost-verified',
      icon: Wrench,
      tone: 'text-ghost-verified',
    },
    {
      label: 'Possessions recorded',
      value: runsCount !== null ? String(runsCount) : '--',
      sub: runsCount !== null ? 'saved in browser' : 'not yet measured',
      pctFill: runsCount !== null ? Math.min(100, runsCount * 20) : 0,
      barColor: 'bg-violet-500',
      icon: Layers,
      tone: 'text-violet-neon',
    },
    {
      label: 'Average run latency',
      value: avgLatency !== null ? `${avgLatency} ms` : '--',
      sub: avgLatency !== null ? `${runsCount} runs tracked` : 'not yet measured',
      pctFill: avgLatency !== null ? Math.min(100, Math.max(12, Math.round((avgLatency / 5000) * 100))) : 0,
      barColor: 'bg-sky-400',
      icon: Clock,
      tone: 'text-sky-400',
    },
  ];

  return (
    <Page id="app-reports">
      <div className="mb-4">
        <ResultState result={result} apiStatus={apiStatus} isRunning={isRunning} hint="Start one in Possession Mode." />
      </div>

      {/* HeroUI Metric Cards with Live Fill Meters */}
      <section aria-labelledby="results-heading" className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="results-heading" className="m-0 flex items-center gap-2 text-base font-bold font-ui text-white">
            <BarChart3 size={18} className="text-violet-neon" aria-hidden="true" />
            <span>Audit Metric Overview</span>
          </h2>
          <Chip size="sm" variant="flat" color="secondary" className="font-mono text-xs">
            Mode: {agentMode}
          </Chip>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Audit metrics">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="bg-base-panel text-white shadow-none">
                <CardBody className="flex flex-col justify-between gap-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      {card.label}
                    </span>
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-base-surface/70">
                      <Icon size={16} className={card.tone} aria-hidden="true" />
                    </span>
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-mono text-white">{card.value}</div>
                    <div className="mt-0.5 text-xs text-ink-faint">{card.sub}</div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-surface/80" aria-hidden="true">
                    <motion.div
                      initial={false}
                      animate={{ width: `${card.pctFill}%` }}
                      transition={{ duration: motionAllowed ? 0.5 : 0 }}
                      className={`h-full rounded-full ${card.barColor}`}
                    />
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </section>

      {/* HeroUI Bar Charts Grid */}
      <section aria-labelledby="charts-heading" className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <h2 id="charts-heading" className="sr-only">Audit Bar Charts</h2>

        {/* Vertical Breakdown Bar Chart */}
        <Card className="bg-base-panel text-white shadow-none">
          <CardHeader className="flex items-center justify-between gap-2 px-5 pt-5 pb-2">
            <div>
              <h3 className="m-0 text-base font-bold text-white">Variant & Agent Breakdown</h3>
              <p className="m-0 text-xs text-ink-muted">Counts from your saved Possession runs</p>
            </div>
            <Chip size="sm" variant="flat" color="secondary" className="text-xs">
              {runsCount ?? 0} total
            </Chip>
          </CardHeader>
          <CardBody className="px-5 pt-2 pb-5">
            {history.length === 0 ? (
              <div className="flex h-44 flex-col items-center justify-center rounded-xl bg-base-surface/40 p-4 text-center">
                <span className="text-xl font-bold font-mono text-white">--</span>
                <span className="mt-1 text-xs text-ink-muted">No recorded runs yet. Run Possession Mode to populate chart bars.</span>
              </div>
            ) : (
              <div className="flex h-48 items-end justify-around gap-3 rounded-xl bg-base-surface/40 px-4 pt-6 pb-3">
                {breakdownBars.map((bar) => {
                  const pctH = bar.count > 0 ? Math.max(12, Math.round((bar.count / maxBreakdown) * 100)) : 4;
                  return (
                    <div key={bar.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                      <span className="text-xs font-mono font-bold text-white">{bar.count}</span>
                      <div className="flex h-28 w-full max-w-[44px] items-end justify-center rounded-lg bg-base/70 p-1">
                        <motion.div
                          initial={motionAllowed ? { height: '0%' } : false}
                          animate={{ height: `${pctH}%` }}
                          transition={{ duration: motionAllowed ? 0.45 : 0 }}
                          className={`w-full rounded-md ${bar.color}`}
                          aria-label={`${bar.label}: ${bar.count}`}
                        />
                      </div>
                      <span className="text-center text-[11px] font-medium leading-tight text-ink-muted">
                        {bar.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Horizontal Latency Bar Chart */}
        <Card className="bg-base-panel text-white shadow-none">
          <CardHeader className="flex items-center justify-between gap-2 px-5 pt-5 pb-2">
            <div>
              <h3 className="m-0 text-base font-bold text-white">Recent Run Latency (ms)</h3>
              <p className="m-0 text-xs text-ink-muted">Latest 6 Possession runs saved in localStorage</p>
            </div>
            <Chip size="sm" variant="flat" color="secondary" className="text-xs font-mono">
              Wall clock
            </Chip>
          </CardHeader>
          <CardBody className="px-5 pt-2 pb-5">
            {recentRuns.length === 0 ? (
              <div className="flex h-44 flex-col items-center justify-center rounded-xl bg-base-surface/40 p-4 text-center">
                <span className="text-xl font-bold font-mono text-white">--</span>
                <span className="mt-1 text-xs text-ink-muted">Wall-clock latency bars appear after each completed run.</span>
              </div>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0" role="list">
                {recentRuns.map((item, idx) => {
                  const widthPct = Math.max(10, Math.round((item.latency_ms / maxLatency) * 100));
                  return (
                    <li key={item.run_id} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-white">
                          #{idx + 1} · {item.variant} · {item.agent_kind}
                        </span>
                        <span className="font-mono text-ink-muted">
                          {item.verdict} · {item.latency_ms} ms ({item.steps_count} steps)
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-base-surface/80">
                        <motion.div
                          initial={motionAllowed ? { width: '0%' } : false}
                          animate={{ width: `${widthPct}%` }}
                          transition={{ duration: motionAllowed ? 0.4 : 0 }}
                          className={`h-full rounded-full ${item.verdict === 'PASSED' ? 'bg-ghost-verified' : 'bg-ghost-blocked'}`}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>

      {/* Outcome + Verifier Evidence */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OutcomeCard result={result} apiStatus={apiStatus} />
        <Card className="bg-base-panel text-white shadow-none" aria-labelledby="verifier-evidence-heading">
          <CardHeader className="flex items-center gap-2 px-5 pt-5 pb-2">
            <ShieldCheck size={18} className="text-violet-neon" aria-hidden="true" />
            <h2 id="verifier-evidence-heading" className="m-0 text-base font-bold text-white">
              Verifier evidence (patched copy)
            </h2>
          </CardHeader>
          <CardBody className="px-5 pt-1 pb-5">
            <VerifierEvidence fix={fix} voiceResult={flow?.voiceVerifyResult} />
          </CardBody>
        </Card>
      </div>

      {/* Saved Possession Runs Log (localStorage) */}
      <Card className="bg-base-panel text-white shadow-none" aria-labelledby="saved-history-heading">
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 pb-2">
          <div className="flex items-center gap-2">
            <History size={18} className="text-violet-neon" aria-hidden="true" />
            <h2 id="saved-history-heading" className="m-0 text-base font-bold text-white">
              Saved Possession Runs (localStorage)
            </h2>
          </div>
          {history.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="flat"
              color="danger"
              startContent={<Trash2 size={14} aria-hidden="true" />}
              onPress={clearHistory}
              className="text-xs font-semibold"
            >
              Clear history
            </Button>
          )}
        </CardHeader>
        <CardBody className="px-5 pt-1 pb-5">
          {history.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-base-surface/40 p-4">
              <p className="m-0 text-sm text-ink-muted">
                No Possession runs saved in this browser yet. Finished keyboard and voice runs are automatically tracked here across reloads.
              </p>
              <Button
                as={Link}
                to={to('possession')}
                size="sm"
                color="secondary"
                startContent={<Ghost size={14} aria-hidden="true" />}
                className="bg-violet-600 font-semibold text-white"
              >
                Open Possession Mode
              </Button>
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0" role="list">
              {history.map((item) => (
                <li
                  key={item.run_id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-base-surface/50 px-4 py-2.5 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip size="sm" variant="flat" color={item.verdict === 'PASSED' ? 'success' : 'danger'}>
                      {item.verdict}
                    </Chip>
                    <span className="font-mono text-xs text-white">{item.variant}</span>
                    <span className="text-xs text-ink-muted">{item.agent_kind} · {item.agent_mode}</span>
                    {item.blocked_selector && (
                      <code className="font-mono text-xs text-ghost-blocked">{item.blocked_selector}</code>
                    )}
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs text-ink-faint">
                    <span>{item.latency_ms} ms</span>
                    <span>{new Date(item.recorded_at).toLocaleTimeString()}</span>
                    <span>{item.run_id.slice(0, 8)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <NightWatchSection />
    </Page>
  );
}
