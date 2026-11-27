import { Card, CardBody, CardHeader, Chip } from '@heroui/react';
import { AlertTriangle, FileText, Folder, LogOut, Zap } from 'lucide-react';
import { GhostFigure } from '../ghost/GhostFigure';
import { V9Dot } from '../ghost/V9Dot';

const HOOK_CODE_LINES = [
  { n: 1, key: null, text: '{' },
  { n: 2, key: '"name"', val: '"Form label check on save"', comma: true },
  { n: 3, key: '"trigger"', val: '"PostFileSave"', comma: true },
  { n: 4, key: '"matcher"', val: '"… bank | fixtures | dashboard/src .(html|tsx)"', comma: true },
  { n: 5, key: '"action"', text: '{' },
  { n: 6, key: '"type"', val: '"command"', comma: true, indent: 4 },
  { n: 7, key: '"command"', val: '"python3 backend/scan_file.py --hook"', highlight: true, indent: 4 },
  { n: 8, key: null, text: '}', indent: 2 },
  { n: 9, key: null, text: '}' },
];

const FILE_TREE = [
  { name: '.kiro/', depth: 0 },
  { name: 'agents/', depth: 1 },
  { name: 'specs/', depth: 1 },
  { name: 'hooks/', depth: 1, active: true },
  { name: 'powers/', depth: 1 },
  { name: 'steering/', depth: 1 },
];

const RECORDED_FINDING = {
  file: 'fixtures/haunted_bank/index.html',
  element: 'input#amount',
  recorded: '22 Nov 2026',
};

export function KiroIntegrationSection() {
  return (
    <section id="kiro" aria-labelledby="kiro-integration-heading" className="flex flex-col gap-3.5">
      <h2 id="kiro-integration-heading" className="m-0 flex items-center gap-2.5 text-lg sm:text-xl font-extrabold text-white">
        <span className="v9-neon" aria-hidden="true">
          <Zap size={24} />
        </span>
        <span>Kiro Integration — Accessibility in Your Workflow</span>
      </h2>

      {/* Responsive 2-col on Desktop xl+, stacked cleanly on Tablet & Mobile */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(290px,1fr)]">
        <Card className="v9-card overflow-hidden text-white shadow-none">
          <CardBody className="flex flex-col p-0 md:flex-row">
            <nav
              aria-label="Kiro workspace folders"
              className="border-b border-[#2b3254] p-3.5 text-sm md:w-48 md:shrink-0 md:border-r md:border-b-0"
            >
              <div className="mb-2.5 flex items-center gap-2 pl-1 font-bold text-white">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-violet-600 text-xs font-extrabold text-white">
                  K
                </span>
                <span>Kiro</span>
              </div>
              <ul className="m-0 flex list-none flex-wrap gap-1 p-0 md:flex-col" role="list">
                {FILE_TREE.map(({ name, depth, active }) => (
                  <li
                    key={name}
                    className={[
                      'flex min-h-8 items-center gap-2 rounded-lg px-2.5 text-sm',
                      depth === 1 ? 'md:pl-6' : '',
                      active ? 'bg-[#3a2479] text-white shadow-[0_0_12px_#7c3aed66]' : 'text-[#d7dbef]',
                    ].join(' ')}
                    aria-current={active ? 'true' : undefined}
                  >
                    {depth === 0 ? (
                      <LogOut size={15} aria-hidden="true" />
                    ) : (
                      <Folder size={15} className={active ? 'text-violet-300' : 'text-[#cfd3ee]'} aria-hidden="true" />
                    )}
                    <span>{name}</span>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="min-w-0 flex-1">
              <div className="border-b border-[#2b3254] bg-[#12162d]">
                <span className="inline-flex items-center gap-2 border-r border-[#2b3254] bg-[#1b2140] px-4 py-2 font-mono text-xs sm:text-sm text-white">
                  <FileText size={14} aria-hidden="true" />
                  <span>scan-on-save.json</span>
                </span>
              </div>
              <figure className="m-0" aria-label="scan-on-save.json, the real Kiro hook">
                <figcaption className="sr-only">
                  Real Kiro hook configuration triggered on PostFileSave.
                </figcaption>
                <pre className="m-0 overflow-x-auto px-4 py-3.5 font-mono text-xs sm:text-sm leading-relaxed">
                  <code>
                    {HOOK_CODE_LINES.map((row) => (
                      <span key={row.n} className="block whitespace-pre">
                        <span className="mr-5 inline-block w-[2ch] select-none text-right text-[#6f789e]" aria-hidden="true">
                          {row.n}
                        </span>
                        {row.key ? (
                          <>
                            <span>{' '.repeat(row.indent ?? 2)}</span>
                            <span className="text-[#7dd3fc]">{row.key}</span>
                            <span className="text-white">: </span>
                            {row.val ? (
                              <span className={row.highlight ? 'font-semibold text-[#fbbf24]' : 'text-[#fbbf24]'}>
                                {row.val}
                              </span>
                            ) : (
                              <span className="text-white">{row.text}</span>
                            )}
                            {row.comma && <span className="text-white">,</span>}
                          </>
                        ) : (
                          <span className="text-white">
                            {' '.repeat(row.indent ?? 0)}
                            {row.text}
                          </span>
                        )}
                      </span>
                    ))}
                  </code>
                </pre>
              </figure>
            </div>
          </CardBody>
        </Card>

        <Card className="panel-glow flex flex-col text-white shadow-none">
          <CardHeader className="flex items-center gap-2.5 px-4 pt-4 pb-2">
            <Zap size={20} style={{ color: '#fb923c' }} aria-hidden="true" />
            <h3 className="m-0 text-base sm:text-lg font-extrabold text-white">
              Kiro Hook (recorded {RECORDED_FINDING.recorded})
            </h3>
          </CardHeader>

          <CardBody className="flex flex-1 flex-col justify-between gap-4 px-4 pt-2 pb-4">
            <ul className="m-0 flex list-none flex-col gap-3 p-0 text-sm sm:text-[15px]" aria-label="Recorded hook events">
              <li className="flex items-start gap-3 text-ink">
                <V9Dot state="ok" size={22} />
                <span>
                  File saved:{' '}
                  <span className="font-mono text-xs sm:text-sm break-all text-white">{RECORDED_FINDING.file}</span>
                </span>
              </li>
              <li className="flex items-start gap-3 text-ink">
                <GhostFigure tone="white" face="happy" size={22} className="shrink-0" />
                <span>Haunted Audit scan triggered</span>
              </li>
              <li className="flex items-start gap-3 text-ink">
                <span className="v9-dot bad shrink-0" style={{ width: 22, height: 22 }} aria-hidden="true">
                  <AlertTriangle size={12} strokeWidth={3} />
                </span>
                <span>
                  Accessibility issue found:
                  <br />
                  <b className="font-mono text-xs sm:text-sm text-[#ff6b6b]">{RECORDED_FINDING.element} has no accessible name</b>
                </span>
              </li>
            </ul>

            <div className="flex justify-end">
              <Chip
                size="md"
                variant="flat"
                className="h-9 rounded-xl border border-[#b794ff] bg-gradient-to-b from-[#3b1f86] to-[#26135a] px-4 font-extrabold text-white shadow-[0_0_16px_#8b5cf688]"
              >
                Built with Kiro
              </Chip>
            </div>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
