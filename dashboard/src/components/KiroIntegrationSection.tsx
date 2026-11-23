/**
 * KiroIntegrationSection
 *
 * "Kiro Integration — Accessibility in Your Workflow" panel (annotation E in v7).
 *
 * Real content only (no-mock-results REQ-NM-06):
 * - The file tree lists the folders that really exist in .kiro/.
 * - The code is the real hook, .kiro/hooks/scan-on-save.json (trigger, matcher, command).
 * - The browser cannot see the hook run, so there is no "live" list. One finding recorded on
 *   22 Nov 2026 is shown with its source file. It is a record, not a live result.
 *
 * Accessibility:
 * - The file tree is a plain list, not an interactive tree widget.
 * - The code listing is a figure with a caption.
 * - Status is icon plus text. "Built with Kiro" is plain text.
 */
import { FileSearch } from 'lucide-react';

/** The real hook, as in .kiro/hooks/scan-on-save.json (description and matcher shortened). */
const HOOK_CODE_LINES = [
  { n: 1, text: '{', muted: true },
  { n: 2, text: '  "name": "Form label check on save",' },
  { n: 3, text: '  "trigger": "PostFileSave",' },
  { n: 4, text: '  "matcher": "… bank | fixtures/haunted_bank | dashboard/src … .(html|tsx)",' },
  { n: 5, text: '  "action": {' },
  { n: 6, text: '    "type": "command",' },
  { n: 7, text: '    "command": "python3 backend/scan_file.py --hook",', highlight: true },
  { n: 8, text: '    "timeout": 10' },
  { n: 9, text: '  }' },
  { n: 10, text: '}', muted: true },
];

/** Folders that exist in .kiro/ in this repo. */
const FILE_TREE = [
  { name: '.kiro/', depth: 0 },
  { name: 'agents/', depth: 1 },
  { name: 'hooks/', depth: 1, active: true },
  { name: 'scripts/', depth: 1 },
  { name: 'settings/', depth: 1 },
  { name: 'skills/', depth: 1 },
  { name: 'specs/', depth: 1 },
  { name: 'steering/', depth: 1 },
];

/** Recorded by scan_page on 22 Nov 2026 (docs/evidence/mcp-scan-page-2026-11-22.md). */
const RECORDED_FINDING = {
  file: 'fixtures/haunted_bank/index.html',
  line: 188,
  element: 'input#amount',
  findingId: 'label-594db4fb701f',
  message: 'This input has no accessible name.',
  source: 'docs/evidence/mcp-scan-page-2026-11-22.md',
  recorded: '22 Nov 2026',
};

export function KiroIntegrationSection() {
  return (
    <section id="kiro" aria-labelledby="kiro-integration-heading" className="panel overflow-hidden">
      <div className="px-5 py-3 border-b border-base-line flex items-center gap-2">
        <h2 id="kiro-integration-heading" className="text-base font-semibold font-ui text-ink">
          Kiro Integration —{' '}
          <span className="text-ink-muted font-normal">Accessibility in Your Workflow</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-0 divide-y xl:divide-y-0 xl:divide-x divide-base-line">
        {/* ── Left: the real hook file ─────────────────────────────── */}
        <div className="p-4 flex flex-col gap-3">
          <div className="flex gap-3">
            <nav aria-label="Kiro workspace folders" className="w-28 shrink-0">
              <ul className="flex flex-col gap-0.5 list-none p-0 m-0" role="list">
                {FILE_TREE.map(({ name, depth, active }) => (
                  <li
                    key={name}
                    className={[
                      'text-base font-mono rounded px-1 py-0.5',
                      active ? 'bg-violet-600/20 text-violet-300' : 'text-ink-faint',
                    ].join(' ')}
                    style={{ paddingLeft: `${depth * 10 + 4}px` }}
                    aria-current={active ? 'true' : undefined}
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </nav>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-2">
                <div className="flex items-center gap-1 px-2 py-1 rounded-t-md text-base font-mono bg-base border-t border-l border-r border-base-line text-ink-muted">
                  <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" aria-hidden="true" />
                  <span>scan-on-save.json</span>
                </div>
              </div>
              <figure className="code-block m-0" aria-label="scan-on-save.json, the real Kiro hook">
                <figcaption className="sr-only">
                  .kiro/hooks/scan-on-save.json: on save, Kiro runs python3 backend/scan_file.py --hook
                </figcaption>
                <pre className="m-0 whitespace-pre-wrap break-words">
                  <code>
                    {HOOK_CODE_LINES.map(({ n, text, muted, highlight }) => (
                      <span
                        key={n}
                        className={[
                          'flex gap-3 leading-relaxed',
                          muted ? 'text-ink-faint' : '',
                          highlight ? 'text-amber-300' : '',
                          !muted && !highlight ? 'text-ink-muted' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        <span className="w-6 text-right text-ink-faint/50 shrink-0 select-none" aria-hidden="true">{n}</span>
                        <span>{text}</span>
                      </span>
                    ))}
                  </code>
                </pre>
              </figure>
            </div>
          </div>
        </div>

        {/* ── Right: one recorded finding, with its source ─────────── */}
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <FileSearch size={16} className="text-amber-400" aria-hidden="true" />
            <h3 className="text-base font-semibold font-ui text-ink">Kiro Hook: recorded finding</h3>
          </div>
          <p className="m-0 text-base font-ui text-ink-muted">
            This page cannot see the hook run in your editor. Below is one real finding, recorded on{' '}
            {RECORDED_FINDING.recorded}. It is not live.
          </p>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-base font-ui">
            <dt className="text-ink-faint">File</dt>
            <dd className="m-0 font-mono text-ink break-all">{RECORDED_FINDING.file}, line {RECORDED_FINDING.line}</dd>
            <dt className="text-ink-faint">Element</dt>
            <dd className="m-0 font-mono text-ink">{RECORDED_FINDING.element}</dd>
            <dt className="text-ink-faint">Finding</dt>
            <dd className="m-0 text-ink">{RECORDED_FINDING.message} WCAG 1.3.1, 3.3.2, 4.1.2.</dd>
            <dt className="text-ink-faint">ID</dt>
            <dd className="m-0 font-mono text-ink-muted">{RECORDED_FINDING.findingId}</dd>
          </dl>
          <p className="m-0 text-base font-ui text-ink-faint">Source: {RECORDED_FINDING.source}</p>
          <p className="mt-auto text-base font-ui text-ink-faint pt-2 border-t border-base-line">Built with Kiro</p>
        </div>
      </div>
    </section>
  );
}
