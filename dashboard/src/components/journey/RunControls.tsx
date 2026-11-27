import { useRef, useState } from 'react';
import { Button, Card, CardBody, Chip, Select, SelectItem } from '@heroui/react';
import { CheckCircle2, Loader2, Play, XCircle } from 'lucide-react';
import { type AgentKind } from './AgentToggle';
import { TestDetailsForm, detailsProblems, type DetailErrors, type DetailField } from './TestDetailsForm';
import type { AgentMode, RunStatus, TestDetails, Variant } from '../../types/index';

interface RunControlsProps {
  variant: Variant;
  mode: AgentMode;
  status: RunStatus | null;
  onVariantChange: (v: Variant) => void;
  onModeChange: (m: AgentMode) => void;
  onRun: () => void;
  agent?: AgentKind;
  onAgentChange?: (a: AgentKind) => void;
  statusLabel?: string;
  details?: TestDetails;
  onDetailsChange?: (d: TestDetails) => void;
  requireDetails?: boolean;
}

const SELECT_CLS = {
  trigger: 'h-9 min-h-9 rounded-lg border border-[#2f3760] bg-[#121731] text-white data-[hover=true]:bg-[#161c3d]',
  value: 'text-xs font-medium text-white',
  popoverContent: 'border border-[#2b3254] bg-[#151a33] text-white',
};

export function RunControls({
  variant,
  mode,
  status,
  onVariantChange,
  onModeChange,
  onRun,
  agent,
  statusLabel,
  details,
  onDetailsChange,
  requireDetails = true,
}: RunControlsProps) {
  const isRunning = status === 'running';
  const voice = agent === 'voice';
  const showForm = details !== undefined && !!onDetailsChange;
  const [errors, setErrors] = useState<DetailErrors>({});
  const fieldRefs = {
    recipient: useRef<HTMLInputElement>(null),
    amount: useRef<HTMLInputElement>(null),
    reference: useRef<HTMLInputElement>(null),
  };

  return (
    <Card className="v9-card mb-3 text-white shadow-none" role="group" aria-label="Run controls">
      <CardBody className="flex flex-col gap-3 p-3.5 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:gap-2">
          <div className="flex flex-col gap-1 lg:w-48">
            <label htmlFor="variant-select" className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              Variant
            </label>
            <Select
              id="variant-select"
              aria-label="Variant"
              size="sm"
              disallowEmptySelection
              selectedKeys={[variant]}
              isDisabled={isRunning}
              onSelectionChange={(keys) => {
                const v = Array.from(keys)[0];
                if (v === 'broken' || v === 'fixed') onVariantChange(v);
              }}
              classNames={SELECT_CLS}
            >
              <SelectItem key="broken" textValue="broken (barrier present)">
                broken (barrier present)
              </SelectItem>
              <SelectItem key="fixed" textValue="fixed (barrier repaired)">
                fixed (barrier repaired)
              </SelectItem>
            </Select>
          </div>

          <div className="flex flex-col gap-1 lg:w-44">
            <label htmlFor="mode-select" className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              Agent mode
            </label>
            <Select
              id="mode-select"
              aria-label="Agent mode"
              size="sm"
              disallowEmptySelection
              selectedKeys={[voice ? 'scripted' : mode]}
              isDisabled={isRunning || voice}
              onSelectionChange={(keys) => {
                const m = Array.from(keys)[0];
                if (m === 'scripted' || m === 'llm') onModeChange(m);
              }}
              classNames={SELECT_CLS}
            >
              <SelectItem key="scripted" textValue="scripted (no AI)">
                scripted (no AI)
              </SelectItem>
              <SelectItem key="llm" textValue="llm (Bedrock)">
                llm (Bedrock)
              </SelectItem>
            </Select>
          </div>
        </div>

        {showForm && (
          <div className="min-w-0 flex-1">
            <TestDetailsForm
              details={details!}
              onChange={(d) => {
                onDetailsChange!(d);
                setErrors({});
              }}
              errors={errors}
              disabled={isRunning}
              fieldRefs={fieldRefs}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onPress={() => {
              if (isRunning) return;
              if (showForm && requireDetails) {
                const problems = detailsProblems(details!);
                const first = (['recipient', 'amount', 'reference'] as DetailField[]).find((f) => problems[f]);
                setErrors(problems);
                if (first) {
                  fieldRefs[first].current?.focus();
                  return;
                }
              }
              onRun();
            }}
            aria-disabled={isRunning || undefined}
            aria-describedby="run-status"
            startContent={
              isRunning ? (
                <Loader2 size={15} className="motion-safe:animate-spin" aria-hidden="true" />
              ) : (
                <Play size={15} aria-hidden="true" />
              )
            }
            className="h-9 rounded-xl border border-[#a78bfa] bg-gradient-to-b from-[#3b1f86] to-[#2a1466] px-4 text-xs sm:text-sm font-bold text-white shadow-[0_0_16px_#8b5cf666]"
          >
            {isRunning ? 'Running…' : voice ? 'Run voice journey' : 'Run Journey'}
          </Button>

          <span id="run-status" role="status" aria-live="polite" className="flex items-center">
            {status !== null && (
              <Chip
                size="sm"
                variant="flat"
                color={status === 'complete' ? 'success' : 'danger'}
                startContent={
                  status === 'running' ? (
                    <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                  ) : status === 'complete' ? (
                    <CheckCircle2 size={13} aria-hidden="true" />
                  ) : (
                    <XCircle size={13} aria-hidden="true" />
                  )
                }
                className={
                  status === 'complete'
                    ? 'border border-[#22c55e55] bg-[#0f2a1b] text-[#6ee7a0]'
                    : 'border border-[#ff6b6b55] bg-[#3a1222] text-[#ff8a8a]'
                }
              >
                {statusLabel ?? (status === 'running' ? 'Running…' : status === 'complete' ? 'Complete' : 'Error')}
              </Chip>
            )}
          </span>
        </div>
      </CardBody>
    </Card>
  );
}
