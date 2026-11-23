/**
 * RunControls
 *
 * POST /runs form: select variant + mode, launch a journey, and show the run status.
 *
 * Accessibility (accessible-ui-review, 22 Nov 2026):
 * - Visible labels are the accessible names (no aria-label overriding "Run Journey", WCAG 2.5.3).
 * - While a run is going the button uses aria-disabled, so it keeps focus; the selects are disabled.
 * - Status is icon plus text, in a live region that is always rendered.
 * - Focus uses the global 3px outline from index.css; targets are at least 44px tall.
 */
import { useRef, useState } from 'react';
import { CheckCircle2, Loader2, Play, XCircle } from 'lucide-react';
import type { AgentMode, RunStatus, Variant } from '../types';
import { AgentToggle, type AgentKind } from './AgentToggle';
interface RunControlsProps {
  variant: Variant;
  mode: AgentMode;
  status: RunStatus | null;
  onVariantChange: (v: Variant) => void;
  onModeChange: (m: AgentMode) => void;
  onRun: () => void;
  /** Voice option (voice-agent TASK-09). Omit both and the controls look as before. */
  agent?: AgentKind;
  onAgentChange?: (a: AgentKind) => void;
  /** Replaces the status words, for example "Blocked" after a voice run. */
  statusLabel?: string;
  /** The tester's recipient name for the keyboard agent (recipient-input REQ-RI-01). Omit both to hide the field. */
  recipient?: string;
  onRecipientChange?: (r: string) => void;
}
/** Same rule as the API (REQ-RI-02): starts with a letter; letters, spaces, . ' - only; 60 at most. */
const NAME_RULE = /^\p{L}[\p{L} .'\-]*$/u;
export function recipientProblem(name: string): string | null {
  const n = name.trim();
  if (!n) return 'Enter a recipient name first.';
  if (n.length > 60) return 'Use 60 characters or fewer.';
  if (!NAME_RULE.test(n)) return 'Use letters, spaces, full stops, apostrophes and hyphens, starting with a letter.';
  return null;
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
const FIELD =
  'min-h-11 bg-base border border-base-line text-ink text-base font-ui rounded-lg px-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

function StatusIcon({ status }: { status: RunStatus }) {
  if (status === 'running') return <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" />;
  if (status === 'complete') return <CheckCircle2 size={16} aria-hidden="true" />;
  return <XCircle size={16} aria-hidden="true" />;
}

export function RunControls({
  variant,
  mode,
  status,
  onVariantChange,
  onModeChange,
  onRun,
  agent,
  onAgentChange,
  statusLabel,
  recipient,
  onRecipientChange,
}: RunControlsProps) {
  const isRunning = status === 'running';
  const voice = agent === 'voice';
  const askName = recipient !== undefined && !!onRecipientChange && !voice;
  const [nameError, setNameError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  return (
    <div
      className="flex flex-wrap items-end gap-3 px-5 py-3
                 bg-base-surface/60 border-b border-base-line"
      role="group"
      aria-label="Run controls"
    >
      {/* Variant select */}
      <div className="flex flex-col gap-0.5">
        <label htmlFor="variant-select" className="text-base font-ui text-ink-faint uppercase tracking-wider">
          Variant
        </label>
        <select
          id="variant-select"
          value={variant}
          onChange={(e) => onVariantChange(e.target.value as Variant)}
          disabled={isRunning}
          className={FIELD}
        >
          <option value="broken">broken (barrier present)</option>
          <option value="fixed">fixed (barrier repaired)</option>
        </select>
      </div>
      {/* Mode select */}
      <div className="flex flex-col gap-0.5">
        <label htmlFor="mode-select" className="text-base font-ui text-ink-faint uppercase tracking-wider">
          Agent mode
        </label>
        <select
          id="mode-select"
          value={voice ? 'scripted' : mode}
          onChange={(e) => onModeChange(e.target.value as AgentMode)}
          disabled={isRunning || voice}
          className={FIELD}
        >
          <option value="scripted">scripted (fixed steps, no AI)</option>
          <option value="llm">llm (an AI model picks the steps)</option>
        </select>
      </div>
      {agent && onAgentChange && <AgentToggle value={agent} onChange={onAgentChange} disabled={isRunning} />}
      {askName && (
        <div className="flex flex-col gap-0.5">
          <label htmlFor="recipient-input" className="text-base font-ui text-ink-faint uppercase tracking-wider">
            Recipient name
          </label>
          <input
            id="recipient-input"
            ref={nameRef}
            type="text"
            autoComplete="off"
            maxLength={60}
            value={recipient}
            onChange={(e) => { onRecipientChange!(e.target.value); setNameError(null); }}
            disabled={isRunning}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? 'recipient-error' : undefined}
            className={`${FIELD} cursor-text w-56`}
          />
        </div>
      )}
      {/* Run button */}
      <button
        type="button"
        onClick={() => {
          if (isRunning) return;
          if (askName) {
            const problem = recipientProblem(recipient ?? '');
            if (problem) { setNameError(problem); nameRef.current?.focus(); return; }
          }
          onRun();
        }}
        aria-disabled={isRunning || undefined}
        aria-describedby="run-status"
        className="flex min-h-11 items-center gap-2 px-4 rounded-lg text-base font-ui font-semibold
                   bg-violet-600 text-white border border-violet-neon/50
                   hover:bg-violet-500 motion-safe:active:scale-95
                   motion-safe:transition-all motion-safe:duration-150
                   aria-disabled:opacity-50 aria-disabled:cursor-not-allowed"
      >
        {isRunning ? (
          <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" />
        ) : (
          <Play size={16} aria-hidden="true" />
        )}
        {isRunning ? 'Running…' : voice ? 'Run voice journey' : 'Run Journey'}
      </button>
      {askName && nameError && (
        <p id="recipient-error" role="alert" className="flex min-h-11 items-center gap-1.5 m-0 text-base font-ui text-ghost-blocked">
          <XCircle size={16} aria-hidden="true" />
          {nameError}
        </p>
      )}
      {/* Status: the live region is always in the page; only its content changes. */}
      <span id="run-status" role="status" aria-live="polite" className="flex min-h-11 items-center">
        {status !== null && (
          <span
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-base font-ui font-medium
                        border ${STATUS_STYLE[status]}`}
          >
            <StatusIcon status={status} />
            Run status: {statusLabel ?? STATUS_LABEL[status]}
          </span>
        )}
      </span>
    </div>
  );
}
