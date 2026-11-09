/**
 * KiroIntegrationSection
 *
 * "Kiro Integration — Accessibility in Your Workflow" panel (annotation E in v7).
 *
 * Accessibility:
 * - File tree is a decorative illustration — no interactive tree widget needed.
 *   Using a plain <ul> with role="list" and aria-label.
 * - Code editor "tab bar" is a visual decoration of a single active file — no
 *   interactive tablist. Rendered as a <div> with a visible file-name label.
 *   axe-core requires tablist children to be focusable; since these are not
 *   interactive, role="tablist" is removed to avoid the ARIA pattern mismatch.
 * - Hook event list has aria-live="polite" for live updates.
 * - All text uses rem-based sizes so 200% zoom works without horizontal scroll.
 * - "Built with Kiro" is plain text (not a link, not a logo).
 */

import { CheckCircle2, XCircle, Zap } from 'lucide-react';

const HOOK_CODE_LINES = [
  { n: 1, text: '// Kiro hook: run Haunted Audit on save', muted: true },
  { n: 2, text: 'onSave(async (file) => {' },
  { n: 3, text: '  await hauntedAudit.scanJourney(file,' },
  { n: 4, text: '    "send-payment");', highlight: true },
  { n: 5, text: '});' },
];

const FILE_TREE = [
  { name: 'Kiro',       depth: 0, icon: '🦇' },
  { name: '.kiro/',     depth: 1 },
  { name: 'agents/',    depth: 2 },
  { name: 'specs/',     depth: 2 },
  { name: 'hooks/',     depth: 2, active: true },
  { name: 'powers/',    depth: 2 },
  { name: 'steering/',  depth: 2 },
];

interface HookEvent {
  type: 'success' | 'trigger' | 'error';
  message: string;
}

const DEFAULT_EVENTS: HookEvent[] = [
  { type: 'success', message: 'File saved: SendPayment.tsx' },
  { type: 'trigger', message: 'Haunted Audit scan triggered' },
  { type: 'error',   message: 'Accessibility issue found: Missing accessible label' },
];

const EVENT_ICON_LABEL: Record<HookEvent['type'], string> = {
  success: 'Success',
  trigger: 'Triggered',
  error:   'Error',
};

export function KiroIntegrationSection() {
  return (
    <section
      id="kiro"
      aria-labelledby="kiro-integration-heading"
      className="panel overflow-hidden"
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="px-5 py-3 border-b border-base-line flex items-center gap-2">
        <span className="text-base" aria-hidden="true">🦇</span>
        <h2
          id="kiro-integration-heading"
          className="text-sm font-semibold font-ui text-ink"
        >
          Kiro Integration —{' '}
          <span className="text-ink-muted font-normal">Accessibility in Your Workflow</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-base-line">

        {/* ── Left: IDE illustration ───────────────────────────────── */}
        <div className="p-4 flex flex-col gap-3">
          <div className="flex gap-3">

            {/* File tree — decorative, not interactive */}
            <nav
              aria-label="Kiro workspace file tree (illustration)"
              className="w-28 shrink-0"
            >
              <ul className="flex flex-col gap-0.5 list-none p-0 m-0" role="list">
                {FILE_TREE.map(({ name, depth, icon, active }) => (
                  <li
                    key={name}
                    className={[
                      'text-xs font-mono rounded px-1 py-0.5',
                      active
                        ? 'bg-violet-600/20 text-violet-300'
                        : 'text-ink-faint',
                    ].join(' ')}
                    style={{ paddingLeft: `${depth * 10 + 4}px` }}
                    aria-current={active ? 'true' : undefined}
                  >
                    {icon && <span aria-hidden="true" className="mr-1">{icon}</span>}
                    {name}
                  </li>
                ))}
              </ul>
            </nav>

            {/* Code editor illustration */}
            <div className="flex-1 min-w-0">
              {/* Active file tab — decorative, not interactive */}
              <div
                className="flex items-center gap-1 mb-2"
                aria-label="Active editor file"
              >
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-t-md text-xs font-mono
                             bg-base border-t border-l border-r border-base-line text-ink-muted"
                >
                  <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" aria-hidden="true" />
                  <span>accessibility-hook.ts</span>
                </div>
              </div>

              {/* Code listing */}
              <figure
                className="code-block m-0"
                aria-label="accessibility-hook.ts source code"
                role="figure"
              >
                <figcaption className="sr-only">
                  accessibility-hook.ts — Kiro hook that triggers Haunted Audit on save
                </figcaption>
                <pre className="m-0 overflow-x-auto">
                  <code>
                    {HOOK_CODE_LINES.map(({ n, text, muted, highlight }) => (
                      <span
                        key={n}
                        className={[
                          'flex gap-3 leading-relaxed',
                          muted ? 'text-ink-faint' : '',
                          highlight ? 'text-amber-300' : '',
                          !muted && !highlight ? 'text-ink-muted' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {/* Line number — decorative */}
                        <span
                          className="w-4 text-right text-ink-faint/50 shrink-0 select-none"
                          aria-hidden="true"
                        >
                          {n}
                        </span>
                        <span>{text}</span>
                      </span>
                    ))}
                  </code>
                </pre>
              </figure>
            </div>
          </div>
        </div>

        {/* ── Right: Live hook events ──────────────────────────────── */}
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Zap size={13} className="text-amber-400" aria-hidden="true" />
            <h3 className="text-sm font-semibold font-ui text-ink">Kiro Hook (Live)</h3>
          </div>

          <ul
            className="flex flex-col gap-2 list-none p-0 m-0"
            aria-label="Live Kiro hook events"
            aria-live="polite"
            aria-atomic="false"
          >
            {DEFAULT_EVENTS.map(({ type, message }, i) => (
              <li key={i} className="flex items-start gap-2 text-xs font-ui">
                {type === 'success' && (
                  <CheckCircle2
                    size={13}
                    className="text-ghost-verified shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                )}
                {type === 'trigger' && (
                  <span
                    className="w-[13px] h-[13px] shrink-0 mt-0.5 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                  </span>
                )}
                {type === 'error' && (
                  <XCircle
                    size={13}
                    className="text-ghost-blocked shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                )}
                {/* sr-only event type so colour is not the sole status carrier */}
                <span className="sr-only">{EVENT_ICON_LABEL[type]}:</span>
                <span
                  className={
                    type === 'error' ? 'text-ghost-blocked' : 'text-ink-muted'
                  }
                >
                  {message}
                </span>
              </li>
            ))}
          </ul>

          {/* Attribution — plain text, not a link, not a logo */}
          <p className="mt-auto text-xs font-ui text-ink-faint pt-2 border-t border-base-line">
            Built with Kiro
          </p>
        </div>
      </div>
    </section>
  );
}
