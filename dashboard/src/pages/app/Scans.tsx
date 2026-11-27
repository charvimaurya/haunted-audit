import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Code,
  Divider,
  Input,
  Progress,
} from '@heroui/react';
import { ArrowRight, CheckCircle2, FlaskConical, Globe, ScanSearch, XCircle } from 'lucide-react';
import { Page } from '../../components/layout/Page';
import { API_BASE } from '../../runs/api';
import { to } from '../../routes';

interface ScanFinding {
  rule: string;
  impact: string | null;
  help: string;
  element: string | null;
}

interface ScanResponse {
  target: string;
  count: number;
  findings: ScanFinding[];
}

const PLANTED_EXPERIMENT = [
  { barrier: 'Missing label on Amount input', element: '#amount', wcag: '1.3.1 / 4.1.2', caughtByAxe: true },
  { barrier: 'Low contrast helper hint text', element: '#recipient-hint', wcag: '1.4.3', caughtByAxe: true },
  { barrier: 'Icon-only Cancel button without name', element: '#cancel', wcag: '4.1.2', caughtByAxe: true },
  {
    barrier: 'Emma’s bill-pay blocker: clickable <div> disguised as Send Payment without keyboard access',
    element: 'div.pay-btn',
    wcag: '2.1.1 / 4.1.2',
    caughtByAxe: false,
  },
  { barrier: 'Recipient focus outline suppressed', element: '#recipient', wcag: '2.4.7', caughtByAxe: false },
  { barrier: 'Validation errors not announced to screen readers', element: '#error-region', wcag: '4.1.3', caughtByAxe: false },
];

export default function Scans() {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);

  async function runScan(payload: { variant?: 'broken' | 'fixed'; url?: string }) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof body?.detail === 'string' ? body.detail : `Scan refused (HTTP ${res.status}).`);
        return;
      }
      setScanResult(body as ScanResponse);
    } catch {
      setError('Could not reach the audit scanner service.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page id="app-scans">
      <div className="flex flex-col gap-4">
        {/* Live Read-Only axe-core Scanner (v9 Card styling) */}
        <Card className="v9-card text-white shadow-none">
          <CardHeader className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-2 sm:px-5">
            <div className="flex items-center gap-2.5">
              <span className="v9-neon" aria-hidden="true">
                <ScanSearch size={22} />
              </span>
              <h2 className="m-0 text-lg sm:text-xl font-extrabold text-white">Ghost Hunter Scanner (axe-core)</h2>
            </div>
            <Chip size="sm" variant="flat" className="border border-[#2b3254] bg-[#1d2140] text-xs font-semibold text-violet-200">
              Read-only · SSRF guarded
            </Chip>
          </CardHeader>

          <CardBody className="flex flex-col gap-4 px-4 pt-2 pb-5 sm:px-5">
            <p className="m-0 text-sm sm:text-base text-ink-muted">
              Run a real read-only <Code size="sm" className="bg-[#121731] text-violet-200">axe-core</Code> scan on the Haunted Bank baseline or any public URL.
              Notice how static DOM rules miss keyboard blockers unless paired with Possession Mode.
            </p>

            <form
              className="flex flex-col gap-3 md:flex-row md:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                void runScan(urlInput.trim() ? { url: urlInput.trim() } : { variant: 'broken' });
              }}
            >
              <div className="min-w-0 flex-1">
                <label htmlFor="scan-url-input" className="mb-1.5 block text-xs sm:text-sm font-semibold text-white">
                  Scan a public URL (scan only · limit 1/min)
                </label>
                <Input
                  id="scan-url-input"
                  aria-label="Scan public URL"
                  type="url"
                  placeholder="https://example.com"
                  value={urlInput}
                  onValueChange={setUrlInput}
                  classNames={{
                    inputWrapper: 'min-h-11 rounded-xl border border-[#2f3760] bg-[#121731] shadow-none',
                    input: 'text-sm sm:text-base text-white placeholder:text-ink-muted',
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  isDisabled={loading}
                  startContent={<Globe size={15} aria-hidden="true" />}
                  className="h-11 rounded-xl border border-[#a78bfa] bg-gradient-to-b from-[#3b1f86] to-[#2a1466] px-4 font-bold text-white shadow-[0_0_16px_#8b5cf666]"
                >
                  {loading ? 'Scanning…' : 'Scan Public URL'}
                </Button>
                <Button
                  type="button"
                  isDisabled={loading}
                  onPress={() => void runScan({ variant: 'broken' })}
                  className="h-11 rounded-xl border border-[#353c60] bg-[#1e2340] px-4 font-bold text-[#dfe3ff]"
                >
                  Scan Haunted Bank
                </Button>
              </div>
            </form>

            {error && (
              <Alert color="danger" variant="faded" title="Scan refused" description={error} classNames={{ base: 'border-[#ff5a5a] bg-[#2a1020]' }} />
            )}

            {scanResult && (
              <div className="rounded-xl border border-[#2b3254] bg-[#0e1226]/90 p-4">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-white">
                    Scanned: <Code size="sm" className="bg-[#121731] text-violet-300">{scanResult.target}</Code>
                  </span>
                  <Chip size="sm" color={scanResult.count > 0 ? 'danger' : 'success'} variant="flat">
                    {scanResult.count} axe-core findings
                  </Chip>
                </div>
                {scanResult.findings.length === 0 ? (
                  <p className="m-0 text-sm text-ink-muted">No axe-core WCAG 2.x violations reported.</p>
                ) : (
                  <ul className="m-0 flex list-none flex-col gap-2 p-0" role="list">
                    {scanResult.findings.map((f, i) => (
                      <li key={`${f.rule}-${i}`} className="rounded-xl border border-[#2b3254] bg-[#121731] px-3 py-2.5 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-[#ff7a7a]">{f.rule}</span>
                          {f.impact && <Chip size="sm" variant="flat" color="warning">{f.impact}</Chip>}
                          {f.element && <Code size="sm" className="bg-[#0d1022] text-violet-300">{f.element}</Code>}
                        </div>
                        <p className="m-0 mt-1 text-ink-muted">{f.help}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <Alert
              color="secondary"
              variant="flat"
              title="SSRF Network Guard Active"
              description="Built-in protection blocks loopback, private network CIDRs, and cloud metadata endpoints before any URL loads."
              classNames={{
                base: 'border border-[#2b3254] bg-[#0e1226]/80',
                title: 'text-sm font-bold text-white',
                description: 'text-xs sm:text-sm text-ink-muted',
              }}
            />
          </CardBody>
        </Card>

        {/* The Experiment That Changed Everything (3 / 6 Scanner Gap + Emma's div blocker) */}
        <Card className="panel-glow text-white shadow-none">
          <CardHeader className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-2 sm:px-5">
            <div className="flex items-center gap-2.5">
              <span className="v9-neon" aria-hidden="true">
                <FlaskConical size={21} />
              </span>
              <h2 className="m-0 text-lg sm:text-xl font-extrabold text-white">The Experiment That Changed Everything</h2>
            </div>
            <Chip size="sm" color="warning" variant="flat" className="font-mono font-bold">
              Scanner Detection: 3 / 6 (50%)
            </Chip>
          </CardHeader>

          <CardBody className="flex flex-col gap-4 px-4 pt-2 pb-5 sm:px-5">
            <p className="m-0 text-sm sm:text-base text-ink-muted">
              We built a simulated online banking app and deliberately introduced{' '}
              <strong className="text-white">six real-world accessibility barriers</strong>, then ran{' '}
              <Code size="sm" className="bg-[#121731] text-violet-200">axe-core</Code>.
              It detected only three. The very defect that stops <strong className="text-white">Emma</strong> from paying her bill — a{' '}
              <Code size="sm" className="bg-[#121731] text-violet-200">&lt;div&gt;</Code> disguised as a button without keyboard accessibility — went undetected.
            </p>

            <div className="grid grid-cols-1 items-center gap-4 rounded-xl border border-[#2b3254] bg-[#0e1226]/85 p-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div className="flex flex-col items-center justify-center rounded-xl border border-[#2b3254] bg-[#121731] px-4 py-3 text-center">
                <span className="text-xs sm:text-sm font-medium text-ink-muted">Barriers detected by the scanner</span>
                <Divider className="my-1.5 w-56 bg-white/30" />
                <span className="text-xs sm:text-sm font-medium text-ink-muted">Accessibility barriers introduced</span>
                <span className="mt-2 font-mono text-2xl font-extrabold text-warning">
                  = 3 / 6
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                <Progress
                  label="Automated axe-core detection rate"
                  size="md"
                  value={50}
                  color="warning"
                  showValueLabel
                  valueLabel="3 / 6 barriers (50%)"
                  classNames={{
                    label: 'text-xs font-semibold text-white',
                    value: 'font-mono text-xs font-bold text-warning',
                  }}
                />
                <Progress
                  label="With Haunted Audit Possession Mode"
                  size="md"
                  value={100}
                  color="success"
                  showValueLabel
                  valueLabel="Keyboard blocker caught"
                  classNames={{
                    label: 'text-xs font-semibold text-white',
                    value: 'font-mono text-xs font-bold text-success',
                  }}
                />
              </div>
            </div>

            <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 md:grid-cols-2" role="list">
              {PLANTED_EXPERIMENT.map((item, idx) => (
                <li
                  key={item.element}
                  className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-sm ${
                    item.caughtByAxe
                      ? 'border-[#22c55e55] bg-[#0f2a1b]/70'
                      : 'border-[#ff5a5a88] bg-[#2a0d1c]/80'
                  }`}
                >
                  {item.caughtByAxe ? (
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#4ade80]" aria-hidden="true" />
                  ) : (
                    <XCircle size={18} className="mt-0.5 shrink-0 text-[#ff6b6b]" aria-hidden="true" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="font-semibold text-white">#{idx + 1} · {item.barrier}</span>
                      <Chip size="sm" variant="flat" color={item.caughtByAxe ? 'success' : 'danger'}>
                        {item.caughtByAxe ? 'axe-core caught' : 'axe-core missed'}
                      </Chip>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      <Code size="sm" className="bg-[#0d1022] text-violet-300">{item.element}</Code>
                      <span>WCAG {item.wcag}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div>
              <Button
                as={Link}
                to={to('possession')}
                role="link"
                endContent={<ArrowRight size={15} aria-hidden="true" />}
                className="h-10 rounded-xl border border-[#a78bfa] bg-gradient-to-b from-[#3b1f86] to-[#2a1466] px-4 font-bold text-white shadow-[0_0_16px_#8b5cf666]"
              >
                Experience Emma&apos;s Blocked Payment in Possession Mode
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
