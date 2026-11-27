import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui/react';
import { ArrowRight, Ghost, History } from 'lucide-react';
import { Page } from '../../components/layout/Page';
import { ResultState } from '../../components/results/ResultState';
import { useFix } from '../../fixes/fixContext';
import { to } from '../../routes';
import {
  scenarioDisplayName,
  type SavedPossessionRun,
  type TrackedFixRound,
} from '../../runs/possessionHistory';
import { normalizeScenarioId } from '../../runs/scenarios';
import { useRun } from '../../runs/runContext';

const ROWS_PER_PAGE = 5;

function fixRoundLabel(tracked: TrackedFixRound | undefined): {
  label: string;
  color: 'default' | 'secondary' | 'warning' | 'success' | 'danger';
} {
  if (!tracked) return { label: 'Pending review', color: 'default' };
  if (tracked.regression_verdict === 'BLOCKED') return { label: 'Regression protected', color: 'success' };
  if (tracked.verify_verdict === 'PASSED') return { label: 'Fix validated', color: 'success' };
  if (tracked.status === 'approved') return { label: 'Approved diff', color: 'secondary' };
  if (tracked.status === 'rejected') return { label: 'Rejected', color: 'danger' };
  if (tracked.status === 'proposed') return { label: 'Diff drafted', color: 'warning' };
  return { label: 'Proposal errored', color: 'danger' };
}

export default function FixesHub() {
  const { result, apiStatus, isRunning, history } = useRun();
  const flow = useFix();
  const [page, setPage] = useState(1);

  const runRows: SavedPossessionRun[] = useMemo(() => {
    if (!result || result.error || history.some((h) => h.run_id === result.run_id)) {
      return history;
    }
    return [
      {
        run_id: result.run_id,
        recorded_at: new Date().toISOString(),
        scenario: normalizeScenarioId(result.scenario),
        variant: result.variant,
        agent_kind: result.agent_kind ?? 'keyboard',
        agent_mode: result.agent_mode,
        verdict: result.verdict,
        reason_code: result.reason_code ?? null,
        blocked_selector: result.blocked_element?.selector ?? null,
        steps_count: result.step_events?.length ?? 0,
        latency_ms: Math.round(result.latency_ms ?? 0),
      },
      ...history,
    ];
  }, [history, result]);

  const totalPages = Math.max(1, Math.ceil(runRows.length / ROWS_PER_PAGE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    return runRows.slice(start, start + ROWS_PER_PAGE);
  }, [page, runRows]);

  const trackedMap = flow?.trackedFixes ?? {};
  const completedCount = Object.values(trackedMap).filter(
    (t) => t.status === 'approved' || t.verify_verdict === 'PASSED' || t.regression_verdict === 'BLOCKED',
  ).length;
  const latestRun = runRows[0] ?? null;

  return (
    <Page id="app-fixes">
      <Card
        className="border border-[#2c2a52] bg-gradient-to-b from-[#131733] to-[#0d1024] text-white shadow-none rounded-[18px]"
        aria-labelledby="possession-picker-heading"
      >
        <CardHeader className="flex flex-wrap items-center justify-between gap-3 border-b border-[#252a4a] px-5 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-600/20 text-violet-neon">
              <History size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 id="possession-picker-heading" className="m-0 text-base font-bold text-white">
                Possession Runs &amp; Fix Rounds
              </h2>
              <p className="m-0 text-xs text-ink-muted">
                Open View details on any Possession run to review Find, Proposed Fix, Verification, and Regression Guard
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip size="sm" variant="flat" color="secondary" className="text-xs font-mono">
              {runRows.length} runs · {completedCount} fixed
            </Chip>
            {latestRun && (
              <Button
                as={Link}
                to={`${to('app-fixes')}/${latestRun.run_id}`}
                size="sm"
                endContent={<ArrowRight size={14} aria-hidden="true" />}
                className="border border-[#a78bfa] bg-gradient-to-b from-[#5a2fc2] to-[#3b1d8f] font-semibold text-white shadow-[0_0_16px_rgba(139,92,246,0.45)]"
              >
                Open Latest Pipeline
              </Button>
            )}
          </div>
        </CardHeader>

        <CardBody className="px-5 pt-3 pb-5">
          {runRows.length === 0 ? (
            <div className="flex flex-col gap-4 rounded-xl bg-base-surface/40 p-4">
              <ResultState
                result={null}
                apiStatus={apiStatus}
                isRunning={isRunning}
                hint="Start one in Possession Mode."
              />
              <div>
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
            </div>
          ) : (
            <Table
              aria-label="Recorded Possession runs"
              removeWrapper
              classNames={{
                th: 'bg-base-surface/70 text-xs font-semibold uppercase tracking-wide text-ink-muted',
                td: 'border-b border-base-line/50 py-3 text-sm text-white',
              }}
              bottomContent={
                totalPages > 1 ? (
                  <div className="flex w-full justify-center pt-4">
                    <Pagination
                      isCompact
                      showControls
                      showShadow
                      color="secondary"
                      page={page}
                      total={totalPages}
                      onChange={setPage}
                      aria-label="Possession runs pagination"
                    />
                  </div>
                ) : null
              }
            >
              <TableHeader>
                <TableColumn>RUN</TableColumn>
                <TableColumn>SCENARIO</TableColumn>
                <TableColumn>RUNNER</TableColumn>
                <TableColumn>VERDICT</TableColumn>
                <TableColumn>BARRIER</TableColumn>
                <TableColumn>FIX ROUND</TableColumn>
                <TableColumn align="end">ACTION</TableColumn>
              </TableHeader>
              <TableBody items={pageRows}>
                {(item) => {
                  const badge = fixRoundLabel(trackedMap[item.run_id]);
                  return (
                    <TableRow key={item.run_id}>
                      <TableCell>
                        <span className="font-mono text-xs font-semibold text-white">
                          {item.run_id.slice(0, 8)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-white">
                          {scenarioDisplayName(item.scenario)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-ink-muted">
                          {item.variant} · {item.agent_kind} ({item.agent_mode})
                        </span>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="sm"
                          variant="flat"
                          color={item.verdict === 'BLOCKED' ? 'danger' : 'success'}
                        >
                          {item.verdict}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        {item.blocked_selector ? (
                          <code className="rounded bg-base px-1.5 py-0.5 font-mono text-xs text-ghost-blocked">
                            {item.blocked_selector}
                          </code>
                        ) : (
                          <span className="text-xs text-ink-faint">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat" color={badge.color} className="text-xs">
                          {badge.label}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`${to('app-fixes')}/${item.run_id}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600/20 px-3 text-xs font-semibold text-white transition-colors hover:bg-violet-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
                        >
                          <span>View details</span>
                          <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                }}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </Page>
  );
}
