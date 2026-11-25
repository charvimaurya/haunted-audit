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
import { AlertTriangle, FileJson, FileSearch, Folder, FolderOpen, Hourglass, LogOut, Zap } from 'lucide-react';
import { GhostGlyph } from './GhostGlyph';

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
  // v9 layout (design/v9 #p-kiro): an editor card (folder tree + the real hook file) and a hook card beside it.
  return (
    <section id="kiro" aria-labelledby="kiro-integration-heading" className="flex flex-col gap-4">
      <h2 id="kiro-integration-heading" className="flex items-center gap-3 text-[1.3rem] font-extrabold font-ui text-ink">
        <Hourglass size={28} className="v9-icon-violet" aria-hidden="true" />
        Kiro Integration — Accessibility in Your Workflow
      </h2>

      <div className="v9-kgrid grid grid-cols-1 gap-4">
        {/* ── Left: the folder tree and the real hook file ─────────────── */}
        <div className="v9-card flex overflow-hidden">
          <nav aria-label="Kiro workspace folders" className="v9-tree hidden shrink-0 px-2.5 py-3.5 sm:block">
            <p className="m-0 mb-3 ml-1.5 flex items-center gap-2.5 text-base font-bold font-ui text-ink">
              <span className="v9-k-badge" aria-hidden="true">K</span>Kiro
            </p>
            <ul className="m-0 flex list-none flex-col gap-1 p-0" role="list">
              {FILE_TREE.map(({ name, depth, active }) => {
                const Icon = depth === 0 ? LogOut : active ? FolderOpen : Folder;
                return (
                  <li
                    key={name}
                    className={`v9-tree-item flex min-h-[34px] items-center gap-2.5 rounded-[10px] px-2.5 text-base font-ui ${active ? 'v9-tree-on' : ''}`}
                    style={{ paddingLeft: depth ? 28 : 10 }}
                    aria-current={active ? 'true' : undefined}
                  >
                    <Icon size={18} aria-hidden="true" />
                    {name}
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="min-w-0 flex-1">
            <div className="v9-tabbar">
              <span className="v9-tab inline-flex items-center gap-2.5 font-mono">
                <FileJson size={16} aria-hidden="true" />scan-on-save.json
              </span>
            </div>
            <figure className="m-0" aria-label="scan-on-save.json, the real Kiro hook">
              <figcaption className="sr-only">
                .kiro/hooks/scan-on-save.json: on save, Kiro runs python3 backend/scan_file.py --hook
              </figcaption>
              <pre className="v9-editor m-0 whitespace-pre-wrap break-words font-mono">
                <code>
                  {HOOK_CODE_LINES.map(({ n, text }) => (
                    <span key={n} className="flex">
                      <span className="v9-ln select-none" aria-hidden="true">{n}</span>
                      <span>{colour(text)}</span>
                    </span>
                  ))}
                </code>
              </pre>
            </figure>
          </div>
        </div>

        {/* ── Right: the hook card, one real recorded finding ─────────────── */}
        <div className="v9-card v9-hook flex flex-col gap-3 p-4">
          <h3 className="m-0 flex items-center gap-3 text-lg font-extrabold font-ui text-ink">
            <Zap size={26} className="v9-icon-amber" aria-hidden="true" />
            Kiro Hook (recorded {RECORDED_FINDING.recorded})
          </h3>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-base font-ui" aria-label="Recorded hook events">
            <li className="flex items-start gap-3 text-ink">
              <FileSearch size={22} className="shrink-0 text-v9-mute" aria-hidden="true" />
              <span>File scanned: <span className="font-mono break-all">{RECORDED_FINDING.file}</span></span>
            </li>
            <li className="flex items-start gap-3 text-ink">
              <span className="text-ghost-caught shrink-0" aria-hidden="true"><GhostGlyph size={22} /></span>
              <span>Haunted Audit scan triggered (<span className="font-mono">scan_page</span>)</span>
            </li>
            <li className="flex items-start gap-3 text-ink">
              <span className="v9-dot v9-dot-bad"><AlertTriangle size={13} aria-hidden="true" /></span>
              <span>
                <span className="sr-only">Finding: </span>Accessibility issue found:{' '}
                <span className="font-bold text-v9-bad-hi">Missing accessible label</span>{' '}
                (<span className="font-mono">{RECORDED_FINDING.element}</span>, line {RECORDED_FINDING.line})
              </span>
            </li>
          </ul>
          <p className="m-0 text-base font-ui text-v9-mute">
            Recorded, not live: this page cannot see the hook run in your editor. Source: {RECORDED_FINDING.source}
          </p>
          <p className="v9-built mt-auto ml-auto inline-flex w-fit items-center rounded-[14px] px-3.5 py-2 text-base font-ui font-extrabold text-white">
            Built with Kiro
          </p>
        </div>
      </div>
    </section>
  );
}

/** v9 code colours: JSON keys light blue, strings amber. Text only; the meaning is in the figcaption. */
function colour(line: string) {
  const parts = line.split(/("[^"]*")(\s*:)?/g).filter((s) => s !== undefined && s !== '');
  return parts.map((s, i) =>
    /^"/.test(s)
      ? <span key={i} className={parts[i + 1]?.trim().startsWith(':') ? 'v9-fn' : 'v9-s'}>{s}</span>
      : <span key={i}>{s}</span>,
  );
}
