import { Button, Card, CardBody, CardHeader, Chip, Progress } from '@heroui/react';
import { Ghost, History, ShieldCheck, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { VerifierEvidence } from '../../components/fixes/VerifierEvidence';
import { Page } from '../../components/layout/Page';
import { ResultsSection } from '../../components/results/ResultsSection';
import { useFix } from '../../fixes/fixContext';
import { verifiedPct } from '../../fixes/verifiedPct';
import { plantedTotal } from '../../lib/planted';
import { to } from '../../routes';
import { scenarioDisplayName } from '../../runs/possessionHistory';
import { useRun } from '../../runs/runContext';

export default function Reports() {
  const { result, mode, apiStatus, isRunning, history, clearHistory } = useRun();
  const flow = useFix();
  const fix = flow?.fix ?? null;

  const agentMode = result?.agent_mode ?? mode;
  const pct = verifiedPct(fix);

  const brokenBlockedCount = history.filter((r) => r.variant === 'broken' && r.verdict === 'BLOCKED').length;
  const fixedClearCount = history.filter((r) => r.variant === 'fixed' && r.verdict === 'PASSED').length;
  const keyboardCount = history.filter((r) => r.agent_kind === 'keyboard').length;
  const voiceCount = history.filter((r) => r.agent_kind === 'voice').length;
  const maxBreakdown = Math.max(1, brokenBlockedCount, fixedClearCount, keyboardCount, voiceCount);

  const breakdownBars = [
    { key: 'broken', label: 'Broken blocked', count: brokenBlockedCount, color: 'danger' as const },
    { key: 'fixed', label: 'Fixed clear', count: fixedClearCount, color: 'success' as const },
    { key: 'kbd', label: 'Keyboard runs', count: keyboardCount, color: 'secondary' as const },
    { key: 'voice', label: 'Voice runs', count: voiceCount, color: 'primary' as const },
  ];

  const recentRuns = history.slice(0, 6);
  const maxLatency = Math.max(1, ...recentRuns.map((r) => r.latency_ms));

  return (
    <Page id="app-reports">
      <ResultsSection
        result={result}
        agentMode={agentMode}
        apiStatus={apiStatus}
        isRunning={isRunning}
        barriersDetected={result?.verdict === 'BLOCKED' && result.blocked_element ? 1 : null}
        barriersTotal={plantedTotal()}
        fixesVerifiedPct={pct}
        testScenarios={fixedClearCount > 0 ? fixedClearCount : null}
        userSessions={history.length > 0 ? history.length : null}
      />

      {/* Saved LocalStorage Telemetry using HeroUI Progress inside v9 Cards */}
      <section aria-labelledby="charts-heading" className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <h2 id="charts-heading" className="sr-only">Audit Bar Charts</h2>

        <Card className="v9-card text-white shadow-none">
          <CardHeader className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
            <div>
              <h3 className="m-0 text-base font-extrabold text-white">Variant &amp; Agent Breakdown</h3>
              <p className="m-0 text-xs text-ink-muted">Counts from your saved Possession runs</p>
            </div>
            <Chip size="sm" variant="flat" className="border border-[#2b3254] bg-[#1d2140] text-xs text-ink-muted">
              {history.length} total
            </Chip>
          </CardHeader>
          <CardBody className="px-4 pt-2 pb-4">
            {history.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-[#2b3254] bg-[#0e1226]/70 p-4 text-center">
                <span className="font-mono text-xl font-bold text-white">--</span>
                <span className="mt-1 text-xs text-ink-muted">No recorded runs yet. Run Possession Mode to populate chart bars.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-xl border border-[#2b3254] bg-[#0e1226]/75 p-4">
                {breakdownBars.map((bar) => (
                  <Progress
                    key={bar.key}
                    size="md"
                    label={bar.label}
                    value={Math.round((bar.count / maxBreakdown) * 100)}
                    color={bar.color}
                    showValueLabel
                    valueLabel={`${bar.count}`}
                    classNames={{
                      label: 'text-xs font-semibold text-white',
                      value: 'font-mono text-xs font-bold text-white',
                    }}
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="v9-card text-white shadow-none">
          <CardHeader className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
            <div>
              <h3 className="m-0 text-base font-extrabold text-white">Recent Run Latency (ms)</h3>
              <p className="m-0 text-xs text-ink-muted">Latest 6 Possession runs saved in localStorage</p>
            </div>
            <Chip size="sm" variant="flat" className="border border-[#2b3254] bg-[#1d2140] font-mono text-xs text-ink-muted">
              Wall clock
            </Chip>
          </CardHeader>
          <CardBody className="px-4 pt-2 pb-4">
            {recentRuns.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-[#2b3254] bg-[#0e1226]/70 p-4 text-center">
                <span className="font-mono text-xl font-bold text-white">--</span>
                <span className="mt-1 text-xs text-ink-muted">Wall-clock latency bars appear after each completed run.</span>
              </div>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-3 p-0" role="list">
                {recentRuns.map((item, idx) => (
                  <li key={item.run_id}>
                    <Progress
                      size="sm"
                      label={`#${idx + 1} · ${scenarioDisplayName(item.scenario)} · ${item.variant} (${item.agent_kind})`}
                      value={Math.max(8, Math.round((item.latency_ms / maxLatency) * 100))}
                      color={item.verdict === 'PASSED' ? 'success' : 'danger'}
                      showValueLabel
                      valueLabel={`${item.verdict} · ${item.latency_ms} ms`}
                      classNames={{
                        label: 'font-mono text-xs text-white truncate max-w-[200px] sm:max-w-xs',
                        value: 'font-mono text-xs text-ink-muted',
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>

      {/* Verifier Evidence + Saved Run History */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="v9-card text-white shadow-none" aria-labelledby="verifier-evidence-heading">
          <CardHeader className="flex items-center gap-2 px-4 pt-4 pb-2">
            <ShieldCheck size={18} className="text-violet-300" aria-hidden="true" />
            <h2 id="verifier-evidence-heading" className="m-0 text-base font-extrabold text-white">
              Verifier evidence (patched copy)
            </h2>
          </CardHeader>
          <CardBody className="px-4 pt-1 pb-4">
            <VerifierEvidence fix={fix} voiceResult={flow?.voiceVerifyResult} />
          </CardBody>
        </Card>

        <Card className="v9-card text-white shadow-none" aria-labelledby="saved-history-heading">
          <CardHeader className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <History size={18} className="text-violet-300" aria-hidden="true" />
              <h2 id="saved-history-heading" className="m-0 text-base font-extrabold text-white">
                Saved Possession Runs
              </h2>
            </div>
            {history.length > 0 && (
              <Button
                type="button"
                size="sm"
                onPress={clearHistory}
                startContent={<Trash2 size={13} aria-hidden="true" />}
                className="h-8 rounded-lg border border-[#ff6b6b] bg-[#3a0f1a] px-2.5 text-xs font-bold text-[#ffd5d5]"
              >
                Clear history
              </Button>
            )}
          </CardHeader>
          <CardBody className="px-4 pt-1 pb-4">
            {history.length === 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2b3254] bg-[#0e1226]/70 p-3.5">
                <p className="m-0 text-sm text-ink-muted">
                  No Possession runs saved in this browser yet.
                </p>
                <Button
                  as={Link}
                  to={to('possession')}
                  role="link"
                  size="sm"
                  startContent={<Ghost size={14} aria-hidden="true" />}
                  className="h-8 rounded-lg border border-[#a78bfa] bg-gradient-to-b from-[#3b1f86] to-[#2a1466] px-3 text-xs font-bold text-white"
                >
                  Open Possession Mode
                </Button>
              </div>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0" role="list">
                {history.slice(0, 8).map((item) => (
                  <li
                    key={item.run_id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#2b3254]/70 bg-[#0e1226]/80 px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip
                        size="sm"
                        variant="flat"
                        color={item.verdict === 'PASSED' ? 'success' : 'danger'}
                        className={
                          item.verdict === 'PASSED'
                            ? 'border border-[#22c55e55] bg-[#0f2a1b] text-[#6ee7a0]'
                            : 'border border-[#ff6b6b55] bg-[#3a1222] text-[#ff8a8a]'
                        }
                      >
                        {item.verdict}
                      </Chip>
                      <span className="text-xs font-semibold text-white">{scenarioDisplayName(item.scenario)}</span>
                      <span className="font-mono text-xs text-ink-muted">{item.variant}</span>
                    </div>
                    <Link
                      to={`${to('app-fixes')}/${item.run_id}`}
                      className="font-mono text-xs text-violet-300 no-underline hover:text-white"
                    >
                      {item.run_id.slice(0, 8)} →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
