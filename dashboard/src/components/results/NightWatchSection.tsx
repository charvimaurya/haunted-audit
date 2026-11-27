/**
 * NightWatchSection: Nightly accessibility regression log (night-watch spec REQ-UI-01 to 05).
 * Reads real append-only rows from GET /night-watch/history with accessible status icons + labels.
 */
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardBody, CardHeader, Chip } from '@heroui/react';
import { AlertTriangle, CheckCircle2, Clock, Minus, RefreshCw, XCircle } from 'lucide-react';
import { API_BASE } from '../../runs/api';

export type NightWatchStatus = 'pass' | 'regression' | 'fail' | 'skipped' | 'infra_failure';

export interface NightWatchRow {
  id: number;
  run_date: string;
  run_id: string | null;
  journey_id: string;
  variant: string;
  agent_mode: string;
  verdict: string | null;
  reason_code: string | null;
  status: NightWatchStatus | string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  latency_ms: number | null;
  error_message: string | null;
  created_at: string;
}

const STATUS_META: Record<
  string,
  { label: string; Icon: typeof CheckCircle2; textCls: string }
> = {
  pass: { label: 'Pass', Icon: CheckCircle2, textCls: 'text-[#6ee7a0]' },
  regression: { label: 'Regression', Icon: XCircle, textCls: 'text-[#fca5a5]' },
  fail: { label: 'Fail', Icon: XCircle, textCls: 'text-[#fca5a5]' },
  skipped: { label: 'Skipped', Icon: Minus, textCls: 'text-[#cbd5e1]' },
  infra_failure: { label: 'Infra failure', Icon: AlertTriangle, textCls: 'text-[#fde68a]' },
};

type FetchState =
  | { kind: 'loading' }
  | { kind: 'ready'; rows: NightWatchRow[]; count: number }
  | { kind: 'error'; message: string };

export function NightWatchSection() {
  const [state, setState] = useState<FetchState>({ kind: 'loading' });

  const loadHistory = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const res = await fetch(`${API_BASE}/night-watch/history`);
      if (!res.ok) {
        setState({
          kind: 'error',
          message: `Night Watch history request failed (HTTP ${res.status}).`,
        });
        return;
      }
      const data = (await res.json()) as { rows?: NightWatchRow[]; count?: number };
      setState({
        kind: 'ready',
        rows: Array.isArray(data.rows) ? data.rows : [],
        count: typeof data.count === 'number' ? data.count : 0,
      });
    } catch {
      setState({
        kind: 'error',
        message: 'Night Watch history could not be reached (network offline).',
      });
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return (
    <Card
      as="section"
      className="mt-6 bg-base-panel text-white shadow-none"
      aria-labelledby="night-watch-heading"
    >
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-violet-neon" aria-hidden="true" />
          <div>
            <h2 id="night-watch-heading" className="m-0 text-base font-bold text-white">
              Night Watch
            </h2>
            <p className="m-0 text-xs text-[#c7cbe8]">
              Automated nightly regression history from GET /night-watch/history
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {state.kind === 'ready' && (
            <Chip size="sm" variant="flat" color="secondary" className="text-xs font-mono">
              {state.count} rows
            </Chip>
          )}
          <Button
            type="button"
            size="sm"
            variant="flat"
            startContent={<RefreshCw size={14} aria-hidden="true" />}
            onPress={() => void loadHistory()}
            className="bg-base-surface/80 text-xs font-semibold text-white"
          >
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardBody className="px-5 pt-2 pb-5">
        {state.kind === 'loading' ? (
          <div aria-busy="true" aria-label="Loading Night Watch run history" className="overflow-x-auto">
            <div className="min-w-[760px] space-y-2 rounded-xl border border-base-line bg-[#0d1024] p-4">
              <div className="grid grid-cols-9 gap-3">
                {Array.from({ length: 9 }).map((_, idx) => (
                  <div key={idx} className="h-4 animate-pulse rounded bg-[#1d2242]" />
                ))}
              </div>
              {Array.from({ length: 3 }).map((_, rowIdx) => (
                <div key={rowIdx} className="grid grid-cols-9 gap-3 pt-2">
                  {Array.from({ length: 9 }).map((__, colIdx) => (
                    <div key={colIdx} className="h-3.5 animate-pulse rounded bg-[#171b36]" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : state.kind === 'error' ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-400/40 bg-[#2a121e] p-4"
          >
            <p className="m-0 text-sm text-[#fecaca]">{state.message}</p>
            <Button
              type="button"
              size="sm"
              color="danger"
              variant="flat"
              onPress={() => void loadHistory()}
              className="font-semibold"
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-base-line bg-[#0d1024]">
            <table className="w-full min-w-[780px] border-collapse text-left text-sm">
              <caption className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">
                Night Watch run history
              </caption>
              <thead className="border-y border-base-line bg-[#141836] text-xs uppercase tracking-wider text-[#e2e8f0]">
                <tr>
                  <th scope="col" className="px-3.5 py-2.5 font-semibold">Date</th>
                  <th scope="col" className="px-3.5 py-2.5 font-semibold">Journey</th>
                  <th scope="col" className="px-3.5 py-2.5 font-semibold">Variant</th>
                  <th scope="col" className="px-3.5 py-2.5 font-semibold">Mode</th>
                  <th scope="col" className="px-3.5 py-2.5 font-semibold">Verdict</th>
                  <th scope="col" className="px-3.5 py-2.5 font-semibold">Status</th>
                  <th scope="col" className="px-3.5 py-2.5 font-semibold">Steps / Tokens</th>
                  <th scope="col" className="px-3.5 py-2.5 font-semibold">Cost</th>
                  <th scope="col" className="px-3.5 py-2.5 font-semibold">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-line/70 text-[#eef2ff]">
                {state.count === 0 || state.rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-[#cbd5e1]">
                      No runs yet
                    </td>
                  </tr>
                ) : (
                  state.rows.map((row) => {
                    const meta = STATUS_META[row.status] ?? {
                      label: row.status,
                      Icon: Minus,
                      textCls: 'text-[#cbd5e1]',
                    };
                    const StatusIcon = meta.Icon;
                    return (
                      <tr key={row.id} className="hover:bg-[#151936]/70">
                        <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-xs text-white">
                          {row.run_date}
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-2.5 font-medium text-white">
                          {row.journey_id}
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-xs text-[#e2e8f0]">
                          {row.variant}
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-2.5">
                          <span className="inline-flex items-center rounded-md border border-violet-400/40 bg-violet-600/20 px-2 py-0.5 font-mono text-xs font-semibold text-[#e9d5ff]">
                            {row.agent_mode}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-xs text-white">
                          {row.verdict ?? '--'}
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-2.5">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${meta.textCls}`}>
                            <StatusIcon size={14} aria-hidden="true" />
                            <span>{meta.label}</span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-xs text-[#e2e8f0]">
                          {row.total_tokens} tok
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-xs text-[#e2e8f0]">
                          ${Number(row.cost_usd ?? 0).toFixed(4)}
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-xs text-[#e2e8f0]">
                          {row.latency_ms !== null ? `${Math.round(row.latency_ms)} ms` : '--'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
