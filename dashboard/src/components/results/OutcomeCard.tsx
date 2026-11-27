import { CircleDashed, Info, XCircle } from 'lucide-react';
import { useContext } from 'react';
import { GhostFigure } from '../ghost/GhostFigure';
import { V9Dot } from '../ghost/V9Dot';
import { NOT_RUN_TEXT, OFFLINE_TEXT } from './ResultState';
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
    return {
      text,
      state: 'yes',
      note: `Yes: with the bug put back on a copy, the checker said BLOCKED (${reg.reason_code ?? 'no reason code'}, ${reg.agent_mode ?? 'unknown'} mode).`,
    };
  if (reg && reg.status === 'complete' && reg.verdict === 'PASSED')
    return { text, state: 'no', note: 'No: with the bug put back on a copy, the checker still said PASSED.' };
  if (reg && reg.status === 'error')
    return { text, state: 'none', note: 'The regression check failed, so no result is shown.' };
  return { text, state: 'none', note: 'Not available yet: no regression test exists.' };
}

function rows(
  result: JourneyResult | null,
  apiStatus: ApiStatus,
  runError: string | null,
  reg: CopyRun | null | undefined,
): Row[] {
  const none = runError
    ? 'The run failed, so no result is shown.'
    : apiStatus === 'offline'
      ? OFFLINE_TEXT
      : `${NOT_RUN_TEXT}.`;
  const payment: Row = !result
    ? { text: 'Customer can complete the payment', state: 'none', note: none }
    : result.verdict === 'PASSED'
      ? {
          text: 'Customer can complete the payment',
          state: 'yes',
          note: `Yes, by keyboard, in the last run (${result.variant} page, ${result.agent_mode} mode).`,
        }
      : {
          text: 'Customer can complete the payment',
          state: 'no',
          note: `No, in the last run (${result.variant} page, ${result.agent_mode} mode): ${result.reason_code ?? 'BLOCKED'}.`,
        };
  return [
    payment,
    regressionRow(reg),
    {
      text: 'Accessibility built into the dev workflow with Kiro',
      state: 'info',
      note: 'The scan-on-save hook is in .kiro/hooks/scan-on-save.json. This is not a run result.',
    },
  ];
}

function RowIcon({ state }: { state: Row['state'] }) {
  if (state === 'yes') return <V9Dot state="ok" size={24} />;
  if (state === 'no') return <XCircle size={20} className="mt-0.5 shrink-0 text-[#b91c1c]" aria-hidden="true" />;
  if (state === 'info') return <Info size={18} className="mt-0.5 shrink-0 text-[#3b2a0e]" aria-hidden="true" />;
  return <CircleDashed size={18} className="mt-0.5 shrink-0 text-[#6e5225]" aria-hidden="true" />;
}

export function OutcomeCard({ result, apiStatus = 'online' }: OutcomeCardProps) {
  const runError = useContext(RunContext)?.runError ?? null;
  const regression = useFix()?.fix?.regression;
  const isPassed = result?.verdict === 'PASSED';

  return (
    <div className="relative pt-4">
      {isPassed && (
        <div className="v9-okghost v9-bob" aria-hidden="true">
          <GhostFigure tone="green" face="happy" size={115} />
        </div>
      )}
      <article className="v9-parch" aria-label="The Outcome">
        <h3 className="m-0 mb-3 text-[22px] font-extrabold text-[#1f1408]">The Outcome</h3>
        <ul className="m-0 flex list-none flex-col gap-3 p-0" aria-label="Journey outcomes">
          {rows(result, apiStatus, runError, regression).map((r) => (
            <li key={r.text} className="flex items-start gap-3 text-[15.5px] font-semibold text-[#2a1a0a]">
              <RowIcon state={r.state} />
              <span>
                <span className="block">{r.text}</span>
                <span className="mt-0.5 block text-xs font-medium text-[#543a15]">{r.note}</span>
              </span>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
