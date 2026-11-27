/**
 * OutcomeCard
 *
 * "The Outcome" parchment card, warm cream background with ink text.
 * Each outcome is shown only from real data (no-mock-results REQ-NM-02, 04):
 * - "Customer can complete the payment" comes from the checker's verdict for the last run.
 * - "A regression test prevents it from breaking again" comes from the fix loop's regression check (the bug put
 *   back on a copy). Until that check has finished it says no regression test exists.
 * - "Accessibility built into the dev workflow with Kiro" names the real hook file; it is not a run result.
 * The green (Verified) ghost appears only after a PASSED run.
 */
import { CheckCircle2, CircleDashed, Info, XCircle } from 'lucide-react';
import { GhostMascot } from '../ghost/GhostMascot';
import { NOT_RUN_TEXT, OFFLINE_TEXT } from './ResultState';
import { useContext } from 'react';
import { RunContext, type ApiStatus } from '../../runs/runContext';
import type { JourneyResult } from '../../types/index';
import { useFix, type CopyRun } from '../../fixes/fixContext';

interface OutcomeCardProps {
  result: JourneyResult | null;
  apiStatus?: ApiStatus;
}

type Row = { text: string; state: 'yes' | 'no' | 'none' | 'info'; note: string };

function regressionRow(reg: CopyRun | null | undefined): Row {
  const text = 'A regression test prevents it from breaking again';
  if (reg && reg.status === 'complete' && reg.verdict === 'BLOCKED')
    return { text, state: 'yes', note: `Yes: with the bug put back on a copy, the checker said BLOCKED (${reg.reason_code ?? 'no reason code'}, ${reg.agent_mode ?? 'unknown'} mode).` };
  if (reg && reg.status === 'complete' && reg.verdict === 'PASSED')
    return { text, state: 'no', note: 'No: with the bug put back on a copy, the checker still said PASSED.' };
  if (reg && reg.status === 'error')
    return { text, state: 'none', note: 'The regression check failed, so no result is shown.' };
  return { text, state: 'none', note: 'Not available yet: no regression test exists.' };
}
function rows(result: JourneyResult | null, apiStatus: ApiStatus, runError: string | null, reg: CopyRun | null | undefined): Row[] {
  const none = runError ? 'The run failed, so no result is shown.' : apiStatus === 'offline' ? OFFLINE_TEXT : `${NOT_RUN_TEXT}.`;
  const payment: Row = !result
    ? { text: 'Customer can complete the payment', state: 'none', note: none }
    : result.verdict === 'PASSED'
      ? { text: 'Customer can complete the payment', state: 'yes',
          note: `Yes, by keyboard, in the last run (${result.variant} page, ${result.agent_mode} mode).` }
      : { text: 'Customer can complete the payment', state: 'no',
          note: `No, in the last run (${result.variant} page, ${result.agent_mode} mode): ${result.reason_code ?? 'BLOCKED'}.` };
  return [
    payment,
    regressionRow(reg),
    { text: 'Accessibility built into the dev workflow with Kiro', state: 'info',
      note: 'The scan-on-save hook is in .kiro/hooks/scan-on-save.json. This is not a run result.' },
  ];
}

function RowIcon({ state }: { state: Row['state'] }) {
  if (state === 'yes') return <CheckCircle2 size={16} className="shrink-0 mt-1" style={{ color: 'var(--color-parchment-yes)' }} aria-hidden="true" />;
  if (state === 'no') return <XCircle size={16} className="shrink-0 mt-1" style={{ color: 'var(--color-parchment-no)' }} aria-hidden="true" />;
  if (state === 'info') return <Info size={16} className="shrink-0 mt-1" aria-hidden="true" />;
  return <CircleDashed size={16} className="shrink-0 mt-1" aria-hidden="true" />;
}

export function OutcomeCard({ result, apiStatus = 'online' }: OutcomeCardProps) {
  const runError = useContext(RunContext)?.runError ?? null;
  const regression = useFix()?.fix?.regression;
  const isPassed = result?.verdict === 'PASSED';
  return (
    <div className="flex items-end gap-3">
      <article
        className="flex-1 rounded-2xl p-5 shadow-xl"
        style={{
          background: 'linear-gradient(160deg, #f5e6c8 0%, #e8d0a0 100%)',
          color: '#3b2a0e',
        }}
        aria-label="The Outcome"
      >
        <h3 className="text-base font-bold mb-3 font-ui" style={{ color: '#3b2a0e' }}>
          The Outcome
        </h3>
        <ul className="flex flex-col gap-3" aria-label="Journey outcomes">
          {rows(result, apiStatus, runError, regression).map((r) => (
            <li key={r.text} className="flex items-start gap-2 text-base font-ui" style={{ color: '#3b2a0e' }}>
              <RowIcon state={r.state} />
              <span>
                <span className="font-semibold">{r.text}</span>
                <span className="block">{r.note}</span>
              </span>
            </li>
          ))}
        </ul>
      </article>
      {isPassed && <GhostMascot state="verified" size={52} animate className="mb-2 shrink-0" />}
    </div>
  );
}
