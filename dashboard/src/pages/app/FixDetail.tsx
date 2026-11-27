import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Chip } from '@heroui/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Lock,
  ScanSearch,
  Search,
  XCircle,
} from 'lucide-react';
import { BeforeAfterSplit } from '../../components/fixes/BeforeAfterSplit';
import { ProposedFixPanel, RegressionPanel, VerificationPanel } from '../../components/fixes/FixPanels';
import { GhostMascot } from '../../components/ghost/GhostMascot';
import { Page } from '../../components/layout/Page';
import { ResultState } from '../../components/results/ResultState';
import { useFix } from '../../fixes/fixContext';
import { FIX_STEPS, FIX_STEP_LABEL, to, type FixStep } from '../../routes';
import { scenarioDisplayName } from '../../runs/possessionHistory';
import { useRun } from '../../runs/runContext';

const REGRESSION_STEP_INDEX = FIX_STEPS.indexOf('regression');

export default function FixDetail() {
  const { runId } = useParams<{ runId: string }>();

  const { result, apiStatus, isRunning, history } = useRun();
  const flow = useFix();
  const selectRun = flow?.selectRun;

  useEffect(() => {
    if (runId && selectRun) selectRun(runId);
  }, [runId, selectRun]);

  const savedEntry = history.find((item) => item.run_id === runId) ?? null;
  const activeResult =
    flow?.selectedResult?.run_id === runId
      ? flow.selectedResult
      : result?.run_id === runId
        ? result
        : null;

  const scenarioName = scenarioDisplayName(activeResult?.scenario ?? savedEntry?.scenario);
  const verdict = activeResult?.verdict ?? savedEntry?.verdict ?? null;
  const blocked = !isRunning && verdict === 'BLOCKED';
  const passed = !isRunning && verdict === 'PASSED';

  // Strictly chained milestones: Find -> Fix -> Verify -> Regression
  const findComplete = !isRunning && Boolean(activeResult || savedEntry);
  const fixComplete = findComplete && Boolean(flow?.fix);
  const journeyVerified = fixComplete && flow?.fix?.verify?.verdict === 'PASSED';

  const targetStepIndex = journeyVerified
    ? REGRESSION_STEP_INDEX
    : fixComplete
      ? 2
      : findComplete
        ? 1
        : 0;

  // Monotonic step index per runId: advances automatically, never goes backward
  const [stepIndex, setStepIndex] = useState<number>(targetStepIndex);
  const lastRunIdRef = useRef<string | undefined>(runId);

  useEffect(() => {
    if (lastRunIdRef.current !== runId) {
      lastRunIdRef.current = runId;
      setStepIndex(targetStepIndex);
      return;
    }

    setStepIndex((prev) => Math.max(prev, targetStepIndex));
  }, [runId, targetStepIndex]);

  const activeTab: FixStep = FIX_STEPS[stepIndex] ?? 'find';

  // Auto-scroll and auto-focus the newly active step
  const stepRefs = useRef<Partial<Record<FixStep, HTMLElement | null>>>({});
  const prevStepRef = useRef<FixStep>(activeTab);

  useEffect(() => {
    if (prevStepRef.current === activeTab) return;
    prevStepRef.current = activeTab;

    const container = stepRefs.current[activeTab];
    if (!container) return;

    const frame = requestAnimationFrame(() => {
      container.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const primaryControl = container.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      (primaryControl ?? container).focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frame);
  }, [activeTab]);

  const statusPill = journeyVerified
    ? {
        label: 'Verified',
        dot: 'bg-[#22c55e] shadow-[0_0_8px_#22c55e]',
        cls: 'bg-[#0f2a1b] text-[#6ee7a0] border-[#22c55e55]',
      }
    : blocked
      ? {
          label: 'Live Test',
          dot: 'bg-[#ff5a5a] shadow-[0_0_8px_#ff5a5a]',
          cls: 'bg-[#3a1222] text-[#ff8a8a] border-[#ff6b6b55]',
        }
      : {
          label: verdict ?? 'Ready',
          dot: 'bg-[#9aa3c7]',
          cls: 'bg-[#1d2140] text-[#cfd3ee] border-[#2c2a52]',
        };

  // Makes every wrapped card stretch evenly, prevent horizontal overflow, and match the active ring
  const getStepCardClass = (index: number) => {
    const isActive = index === stepIndex;
    const isLocked = index > stepIndex;
    return [
      'flex h-full min-w-0 w-full flex-col overflow-hidden scroll-mt-6 rounded-[18px] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon',
      '[&>*]:h-full [&>*]:w-full [&>*]:min-w-0',
      isActive ? 'ring-1 ring-[#a78bfa]/75 shadow-[0_0_24px_rgba(139,92,246,0.25)]' : '',
      isLocked ? 'pointer-events-none select-none opacity-50' : '',
    ]
      .filter(Boolean)
      .join(' ');
  };

  return (
    <Page id="app-fixes">
      <span className="sr-only" aria-live="polite">
        Current step: {FIX_STEP_LABEL[activeTab]}
      </span>

      {/* Compact responsive context header */}
      <div className="mb-4 flex w-full min-w-0 flex-col gap-3 overflow-hidden rounded-2xl border border-[#2c2a52] bg-[#121631]/90 p-3.5 sm:mb-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4 sm:py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5 sm:gap-3">
          <Link
            to={to('app-fixes')}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#2c2a52] bg-[#141230] px-3 text-xs font-semibold text-white transition-colors hover:border-[#8b5cf6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>All Runs</span>
          </Link>
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-[#d2d5ee] sm:gap-2 sm:text-sm">
            <span className="shrink-0 font-mono text-xs text-ink-muted">
              Run {runId ? runId.slice(0, 8) : '—'}
            </span>
            <span className="text-[#7d74a8]" aria-hidden="true">
              ›
            </span>
            <span className="max-w-[180px] truncate font-bold text-white sm:max-w-xs">
              {scenarioName}
            </span>
            <span className="text-[#7d74a8]" aria-hidden="true">
              ›
            </span>
            <span className="font-bold text-[#c9b5ff]">Fixes</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:justify-end sm:gap-2.5">
          {(activeResult?.variant ?? savedEntry?.variant) && (
            <span className="truncate text-xs text-[#9aa3c7]">
              {activeResult?.variant ?? savedEntry?.variant} ·{' '}
              {activeResult?.agent_kind ?? savedEntry?.agent_kind ?? 'keyboard'} (
              {activeResult?.agent_mode ?? savedEntry?.agent_mode})
            </span>
          )}
          <span
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusPill.cls}`}
          >
            <span className={`h-2 w-2 rounded-full ${statusPill.dot}`} aria-hidden="true" />
            <span>{statusPill.label}</span>
          </span>
        </div>
      </div>

      {/* Locked 4-Step Linear Pipeline Strip */}
      <nav aria-label="Fix pipeline stages" className="mb-4 sm:mb-5">
        <ol className="v9-fix-strip !grid grid-cols-2 gap-2 sm:!flex sm:flex-wrap sm:items-center sm:gap-2">
          {FIX_STEPS.map((step, index) => {
            const isCompleted = index < stepIndex;
            const isActive = index === stepIndex;
            const isLocked = index > stepIndex;

            return (
              <Fragment key={step}>
                <li className="min-w-0">
                  <div
                    id={`pipeline-step-${step}`}
                    aria-current={isActive ? 'step' : undefined}
                    aria-disabled={isLocked || isCompleted ? 'true' : undefined}
                    className={[
                      'v9-fix-stepbtn flex w-full cursor-default select-none items-center justify-center gap-2 sm:w-auto sm:justify-start',
                      isActive ? 'border-[#a78bfa] text-white shadow-[0_0_16px_rgba(139,92,246,0.35)]' : '',
                      isCompleted ? 'border-[#22c55e55] bg-[#0f2a1b]/70 text-[#6ee7a0]' : '',
                      isLocked ? 'opacity-50' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span className="v9-fix-stepnum shrink-0" aria-hidden="true">
                      {isCompleted ? (
                        <Check size={12} />
                      ) : isLocked ? (
                        <Lock size={11} />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="truncate">{FIX_STEP_LABEL[step]}</span>
                  </div>
                </li>
                {index < FIX_STEPS.length - 1 && (
                  <li className="v9-fix-arrow hidden sm:block" aria-hidden="true" />
                )}
              </Fragment>
            );
          })}
        </ol>
      </nav>

      {/* Step 1: Barrier Diagnosis Card */}
      {(activeTab === 'find' || blocked) && (
        <section
          ref={(el) => {
            stepRefs.current.find = el;
          }}
          tabIndex={-1}
          aria-label="Barrier Diagnosis"
          className={`mb-4 w-full min-w-0 scroll-mt-6 overflow-hidden rounded-[18px] border bg-gradient-to-b from-[#131733] to-[#0d1024] p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon sm:mb-5 ${
            activeTab === 'find'
              ? 'border-[#a78bfa] shadow-[0_0_22px_rgba(139,92,246,0.45)]'
              : 'border-[#2c2a52]'
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:items-center">
              <div className="shrink-0">
                <GhostMascot
                  state={blocked ? 'blocked' : passed ? 'verified' : 'ready'}
                  size={42}
                  animate={false}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="m-0 flex flex-wrap items-center gap-2 text-sm font-bold text-white">
                  <Search size={15} className="shrink-0 text-[#c084fc]" aria-hidden="true" />
                  <span className="break-words">
                    Find ·{' '}
                    {blocked ? (
                      <span className="text-[#ff8a8a]">
                        Blocked: {activeResult?.reason_code ?? savedEntry?.reason_code ?? 'no reason code'}
                      </span>
                    ) : passed ? (
                      <span className="text-[#6ee7a0]">Passed cleanly on {scenarioName}</span>
                    ) : (
                      'Keyboard Checker Diagnosis'
                    )}
                  </span>
                </p>
                {blocked && (activeResult?.blocked_element || savedEntry?.blocked_selector) && (
                  <p className="m-0 mt-1.5 break-words text-xs leading-relaxed text-[#cfd3ee]">
                    Selector:{' '}
                    <code className="break-all rounded bg-white/5 px-1.5 py-0.5 font-mono text-white">
                      {activeResult?.blocked_element?.selector ?? savedEntry?.blocked_selector}
                    </code>
                    {activeResult?.blocked_element?.tag ? ` · <${activeResult.blocked_element.tag}>` : ''}
                    {activeResult?.blocked_element?.text ? ` · "${activeResult.blocked_element.text}"` : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              {verdict && (
                <Chip size="sm" variant="flat" color={verdict === 'BLOCKED' ? 'danger' : 'success'}>
                  {verdict}
                </Chip>
              )}
              <Button
                as={Link}
                to={to('app-scans')}
                size="sm"
                variant="flat"
                startContent={<ScanSearch size={14} aria-hidden="true" />}
                className="w-full bg-[#1e2340] text-[#dfe3ff] sm:w-auto"
              >
                Run Axe Scan
              </Button>
            </div>
          </div>

          {!activeResult && !savedEntry && (
            <div className="mt-3">
              <ResultState
                result={activeResult}
                apiStatus={apiStatus}
                isRunning={isRunning}
                hint="Start one in Possession Mode."
              />
            </div>
          )}

          {activeTab === 'find' && activeResult?.verdict === 'BLOCKED' && !activeResult.blocked_element && (
            <p className="m-0 mt-2 flex items-center gap-2 text-xs text-[#ff8a8a]">
              <XCircle size={14} className="shrink-0" aria-hidden="true" />
              <span>Run did not reach target control.</span>
            </p>
          )}
        </section>
      )}

      {/* Responsive Pipeline Cards Grid: 1 col (<1024px) -> 2 cols (1024px+) -> 3 cols (1280px+) */}
      <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.15fr)] xl:gap-[22px]">
        {flow && (
          <>
            <div
              ref={(el) => {
                stepRefs.current.fix = el;
              }}
              tabIndex={-1}
              aria-disabled={stepIndex < 1 ? 'true' : undefined}
              className={getStepCardClass(1)}
            >
              <ProposedFixPanel
                result={activeResult}
                apiStatus={apiStatus}
                isRunning={isRunning}
                flow={flow}
                focused={activeTab === 'fix'}
              />
            </div>

            <div
              ref={(el) => {
                stepRefs.current.verify = el;
              }}
              tabIndex={-1}
              aria-disabled={stepIndex < 2 ? 'true' : undefined}
              className={getStepCardClass(2)}
            >
              <VerificationPanel flow={flow} focused={activeTab === 'verify'} />
            </div>

            <div
              ref={(el) => {
                stepRefs.current.regression = el;
              }}
              tabIndex={-1}
              aria-disabled={stepIndex < REGRESSION_STEP_INDEX ? 'true' : undefined}
              className={`${getStepCardClass(REGRESSION_STEP_INDEX)} lg:col-span-2 xl:col-span-1`}
            >
              <RegressionPanel flow={flow} focused={activeTab === 'regression'} />
            </div>
          </>
        )}
      </div>

      {/* Honest Before / After proof once a fix exists */}
      {flow?.fix && (
        <div className="mt-4 w-full min-w-0 overflow-hidden sm:mt-5">
          <BeforeAfterSplit fix={flow.fix} />
        </div>
      )}

      {/* Responsive footer actions */}
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          as={Link}
          to={to('app-fixes')}
          size="sm"
          variant="flat"
          startContent={<ArrowLeft size={14} aria-hidden="true" />}
          className="w-full border border-[#2c2a52] bg-[#141230] text-[#dfe3ff] sm:w-auto"
        >
          Back to Runs Table
        </Button>
        <Button
          as={Link}
          to={to('app-reports')}
          size="sm"
          color="secondary"
          endContent={
            journeyVerified ? (
              <CheckCircle2 size={14} aria-hidden="true" />
            ) : (
              <ArrowRight size={14} aria-hidden="true" />
            )
          }
          className="w-full bg-violet-600 font-semibold text-white sm:w-auto"
        >
          View Reports
        </Button>
      </div>
    </Page>
  );
}