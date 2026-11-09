/**
 * RunControls
 *
 * POST /runs form — select variant + mode, launch a journey,
 * and show the run status badge.
 */

import { Play, Loader2 } from 'lucide-react';
import type { AgentMode, RunStatus, Variant } from '../types';

interface RunControlsProps {
  variant: Variant;
  mode: AgentMode;
  status: RunStatus | null;
  onVariantChange: (v: Variant) => void;
  onModeChange: (m: AgentMode) => void;
  onRun: () => void;
}

const STATUS_STYLE: Record<RunStatus, string> = {
  running:  'bg-amber-500/15 border-amber-500/40 text-amber-300',
  complete: 'bg-ghost-verified/15 border-ghost-verified/40 text-ghost-verified',
  error:    'bg-ghost-blocked/15 border-ghost-blocked/40 text-ghost-blocked',
};

const STATUS_LABEL: Record<RunStatus, string> = {
  running:  'Running…',
  complete: 'Complete',
  error:    'Error',
};

export function RunControls({
  variant,
  mode,
  status,
  onVariantChange,
  onModeChange,
  onRun,
}: RunControlsProps) {
  const isRunning = status === 'running';

  return (
    <div
      className="flex flex-wrap items-center gap-3 px-5 py-3
                 bg-base-surface/60 border-b border-base-line"
      role="group"
      aria-label="Run controls"
    >
      {/* Variant select */}
      <div className="flex flex-col gap-0.5">
        <label htmlFor="variant-select" className="text-[10px] font-ui text-ink-faint uppercase tracking-wider">
          Variant
        </label>
        <select
          id="variant-select"
          value={variant}
          onChange={(e) => onVariantChange(e.target.value as Variant)}
          disabled={isRunning}
          className="bg-base border border-base-line text-ink text-sm font-ui rounded-lg px-2 py-1.5
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon
                     disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          aria-label="Select page variant"
        >
          <option value="broken">broken</option>
          <option value="fixed">fixed</option>
        </select>
      </div>

      {/* Mode select */}
      <div className="flex flex-col gap-0.5">
        <label htmlFor="mode-select" className="text-[10px] font-ui text-ink-faint uppercase tracking-wider">
          Agent mode
        </label>
        <select
          id="mode-select"
          value={mode}
          onChange={(e) => onModeChange(e.target.value as AgentMode)}
          disabled={isRunning}
          className="bg-base border border-base-line text-ink text-sm font-ui rounded-lg px-2 py-1.5
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon
                     disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          aria-label="Select agent mode"
        >
          <option value="scripted">scripted</option>
          <option value="llm">llm</option>
        </select>
      </div>

      {/* Run button */}
      <button
        type="button"
        onClick={onRun}
        disabled={isRunning}
        className="flex items-center gap-2 px-4 py-2 mt-4 rounded-lg text-sm font-ui font-semibold
                   bg-violet-600 text-white border border-violet-neon/50
                   hover:bg-violet-500 active:scale-95
                   transition-all duration-150
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon
                   disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={isRunning ? 'Journey is running' : `Run ${mode} agent on ${variant} variant`}
        aria-busy={isRunning}
      >
        {isRunning ? (
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        ) : (
          <Play size={14} aria-hidden="true" />
        )}
        {isRunning ? 'Running…' : 'Run Journey'}
      </button>

      {/* Status badge */}
      {status !== null && (
        <span
          className={`flex items-center gap-1.5 px-3 py-1.5 mt-4 rounded-full text-xs font-ui font-medium
                      border ${STATUS_STYLE[status]}`}
          role="status"
          aria-live="polite"
          aria-label={`Run status: ${STATUS_LABEL[status]}`}
        >
          {isRunning && (
            <Loader2 size={11} className="animate-spin" aria-hidden="true" />
          )}
          {STATUS_LABEL[status]}
        </span>
      )}
    </div>
  );
}
