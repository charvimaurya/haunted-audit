import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button, Card, CardBody, Chip, Tab, Tabs } from '@heroui/react';
import { ArrowLeft, Search, XCircle } from 'lucide-react';
import { BeforeAfterSplit } from '../../components/fixes/BeforeAfterSplit';
import { ProposedFixPanel, RegressionPanel, VerificationPanel } from '../../components/fixes/FixPanels';
import { Page } from '../../components/layout/Page';
import { ResultState } from '../../components/results/ResultState';
import { useFix } from '../../fixes/fixContext';
import { FIX_STEPS, FIX_STEP_LABEL, to, type FixStep } from '../../routes';
import { scenarioDisplayName } from '../../runs/possessionHistory';
import { useRun } from '../../runs/runContext';

export default function FixDetail() {
  const { runId } = useParams<{ runId: string }>();
  const [params] = useSearchParams();
  const initialTab = FIX_STEPS.includes((params.get('step') ?? params.get('tab')) as FixStep)
    ? ((params.get('step') ?? params.get('tab')) as FixStep)
    : 'fix';
  const [activeStep, setActiveStep] = useState<FixStep>(initialTab);

  const { result, apiStatus, isRunning, history } = useRun();
  const flow = useFix();
  const selectRun = flow?.selectRun;

  useEffect(() => {
    if (runId && selectRun) selectRun(runId);
  }, [runId, selectRun]);

  useEffect(() => {
    const requested = (params.get('step') ?? params.get('tab')) as FixStep | null;
    if (requested && FIX_STEPS.includes(requested)) setActiveStep(requested);
  }, [params]);

  const savedEntry = history.find((item) => item.run_id === runId) ?? null;
  const activeResult =
    flow?.selectedResult?.run_id === runId
      ? flow.selectedResult
      : result?.run_id === runId
        ? result
        : null;

  const scenarioId = activeResult?.scenario ?? savedEntry?.scenario;
  const scenarioName = scenarioDisplayName(scenarioId);
  const verdict = activeResult?.verdict ?? savedEntry?.verdict ?? null;

  return (
    <Page id="app-fixes">
      <Card className="v9-card mb-4 text-white shadow-none">
        <CardBody className="flex flex-col gap-2.5 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              as={Link}
              to={to('app-fixes')}
              role="link"
              size="sm"
              startContent={<ArrowLeft size={14} aria-hidden="true" />}
              className="h-8 rounded-lg border border-[#353c60] bg-[#1e2340] px-3 text-xs font-bold text-[#dfe3ff]"
            >
              Back to Fixes
            </Button>
            <span className="font-mono text-xs text-ink-muted">
              Run {runId ? runId.slice(0, 8) : '—'}
            </span>
            <Chip size="sm" variant="flat" className="border border-[#2b3254] bg-[#1d2140] text-xs text-violet-200">
              {scenarioName}
            </Chip>
            {verdict && (
              <Chip
                size="sm"
                variant="flat"
                color={verdict === 'PASSED' ? 'success' : 'danger'}
                className={
                  verdict === 'PASSED'
                    ? 'border border-[#22c55e55] bg-[#0f2a1b] text-[#6ee7a0]'
                    : 'border border-[#ff6b6b55] bg-[#3a1222] text-[#ff8a8a]'
                }
              >
                {verdict}
              </Chip>
            )}
          </div>
          {(activeResult?.variant ?? savedEntry?.variant) && (
            <span className="text-xs text-ink-muted">
              {activeResult?.variant ?? savedEntry?.variant} · {activeResult?.agent_kind ?? savedEntry?.agent_kind ?? 'keyboard'} ({activeResult?.agent_mode ?? savedEntry?.agent_mode})
            </span>
          )}
        </CardBody>
      </Card>

      {/* Responsive HeroUI Step Strip */}
      <div className="mb-4 v9-strip">
        <Tabs
          aria-label="Fix pipeline"
          selectedKey={activeStep}
          onSelectionChange={(k) => {
            if (typeof k === 'string' && FIX_STEPS.includes(k as FixStep)) setActiveStep(k as FixStep);
          }}
          classNames={{
            base: 'w-full',
            tabList: 'flex w-full flex-wrap gap-2 rounded-2xl border border-[#2b3254] bg-[#110e24] p-1.5 sm:flex-nowrap',
            cursor: 'bg-gradient-to-b from-[#5a2fc2] to-[#3b1d8f] border border-[#c4a8ff] shadow-[0_0_16px_#8b5cf6aa]',
            tab: 'h-10 flex-1 min-w-[110px]',
            tabContent: 'font-bold text-sm text-ink-muted group-data-[selected=true]:text-white flex items-center gap-2',
          }}
        >
          {FIX_STEPS.map((step, index) => (
            <Tab
              key={step}
              title={
                <span className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#b794ff] text-xs font-extrabold">
                    {index + 1}
                  </span>
                  <span>{FIX_STEP_LABEL[step]}</span>
                </span>
              }
            />
          ))}
        </Tabs>
      </div>

      {activeStep === 'find' && (
        <Card className="v9-card mb-4 text-white shadow-none">
          <CardBody className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="m-0 flex items-center gap-2 text-base font-extrabold text-white">
                <Search size={17} className="text-violet-300" aria-hidden="true" />
                <span>Finding Diagnosis — {scenarioName}</span>
              </h2>
              <Button
                type="button"
                size="sm"
                onPress={() => setActiveStep('fix')}
                className="h-8 rounded-lg border border-[#a78bfa] bg-gradient-to-b from-[#3b1f86] to-[#2a1466] px-3 text-xs font-bold text-white"
              >
                Jump to Fix
              </Button>
            </div>
            <div className="mt-3">
              <ResultState result={activeResult} apiStatus={apiStatus} isRunning={isRunning} hint="Start one in Possession Mode." />
              {verdict === 'BLOCKED' && (
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-[#ff7a7a]">
                  <span className="inline-flex items-center gap-1.5 font-bold">
                    <XCircle size={16} aria-hidden="true" />
                    {activeResult?.reason_code ?? savedEntry?.reason_code ?? 'BLOCKED'}
                  </span>
                  {(activeResult?.blocked_element?.selector ?? savedEntry?.blocked_selector) && (
                    <code className="font-mono text-white">
                      {activeResult?.blocked_element?.selector ?? savedEntry?.blocked_selector}
                    </code>
                  )}
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Responsive 3-column Fix / Verify / Regression Workspace */}
      {flow && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ProposedFixPanel
            result={activeResult}
            apiStatus={apiStatus}
            isRunning={isRunning}
            flow={flow}
            focused={activeStep === 'fix'}
          />
          <VerificationPanel flow={flow} scenarioId={scenarioId} focused={activeStep === 'verify'} />
          <RegressionPanel flow={flow} scenarioId={scenarioId} focused={activeStep === 'regression'} />
        </div>
      )}

      <BeforeAfterSplit fix={flow?.fix ?? null} />
    </Page>
  );
}
