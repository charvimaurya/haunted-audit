import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, Chip } from '@heroui/react';
import { ArrowRight, Download, FileDown, Globe, ScanSearch, ShieldAlert } from 'lucide-react';
import { GhostMascot } from '../../components/ghost/GhostMascot';
import { Page } from '../../components/layout/Page';
import { API_BASE } from '../../runs/api';
import { to } from '../../routes';

type AuditType = 'all' | 'labels' | 'contrast' | 'keyboard';

interface ScanFinding {
  rule: string;
  impact: string | null;
  help: string;
  element: string | null;
}

interface ScanResponse {
  target: string;
  count: number;
  total_wcag_count?: number;
  audit_type?: AuditType;
  findings: ScanFinding[];
}

const AUDIT_LABELS: Record<AuditType, string> = {
  all: 'Full WCAG 2.2 AA Audit',
  labels: 'Screen Reader & Labels (Forms / Buttons / Images)',
  contrast: 'Color Contrast & Readability',
  keyboard: 'Keyboard & Focus Structure',
};

function escHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function downloadJsonReport(res: ScanResponse) {
  const blob = new Blob([JSON.stringify({ ...res, generated_at: new Date().toISOString() }, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `haunted-audit-scan-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function openPrintablePdfReport(res: ScanResponse) {
  const win = window.open('', '_blank');
  if (!win) return;
  const rows = res.findings
    .map(
      (f, idx) =>
        `<tr><td>${idx + 1}</td><td><code>${escHtml(f.rule)}</code></td><td>${escHtml(f.impact ?? 'n/a')}</td><td><code>${escHtml(f.element ?? '--')}</code></td><td>${escHtml(f.help)}</td></tr>`,
    )
    .join('');
  const statusText = res.count === 0 ? 'PASSED (0 barriers found)' : `${res.count} Accessibility Barriers Found`;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Haunted Audit QA Report</title>
  <style>body{font-family:system-ui,sans-serif;max-width:960px;margin:28px auto;padding:0 16px;color:#111}
  h1{margin:0 0 6px} .meta{color:#444;margin-bottom:18px;font-size:14px}
  .badge{display:inline-block;padding:6px 12px;border-radius:999px;font-weight:700;color:#fff;background:${res.count === 0 ? '#166534' : '#b91c1c'}}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
  th,td{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top} th{background:#f4f4f6}
  @media print{.noprint{display:none}}</style></head><body>
  <button class="noprint" onclick="window.print()" style="float:right;padding:8px 14px;cursor:pointer">Save / Print PDF</button>
  <h1>Haunted Audit — Accessibility QA Report</h1>
  <div class="meta">Target: <strong>${escHtml(res.target)}</strong> · Scope: ${escHtml(AUDIT_LABELS[res.audit_type ?? 'all'])} · Generated: ${escHtml(new Date().toLocaleString())}</div>
  <div class="badge">${escHtml(statusText)}</div>
  ${res.count === 0 ? '<p>No axe-core WCAG 2.x violations matched in this scan.</p>' : `<table><thead><tr><th>#</th><th>Rule</th><th>Impact</th><th>Element</th><th>Remediation Guidance</th></tr></thead><tbody>${rows}</tbody></table>`}
  <script>setTimeout(function(){window.print();},250);</script></body></html>`);
  win.document.close();
}

export default function Scans() {
  const [urlInput, setUrlInput] = useState('');
  const [auditType, setAuditType] = useState<AuditType>('all');
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
        body: JSON.stringify({ ...payload, audit_type: auditType }),
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

  const passed = scanResult !== null && scanResult.count === 0;

  return (
    <Page id="app-scans">
      <Card className="bg-base-panel text-ink shadow-none">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6 pb-2">
          <div className="flex items-center gap-2.5">
            <ScanSearch size={22} className="text-violet-neon" aria-hidden="true" />
            <h2 className="m-0 text-xl font-bold">Ghost Hunter Scanner (axe-core)</h2>
          </div>
          <Chip size="sm" variant="flat" color="secondary">Read-only · SSRF guarded</Chip>
        </CardHeader>
        <CardBody className="flex flex-col gap-4 px-6 pb-6">
          <p className="m-0 text-base text-ink-muted">
            Choose an accessibility focus, scan a live public URL or Haunted Bank, and export a PDF/JSON QA report.
          </p>

          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void runScan(urlInput.trim() ? { url: urlInput.trim() } : { variant: 'broken' });
            }}
          >
            <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div>
                <label htmlFor="scan-url-input" className="mb-1 block text-sm font-semibold text-ink">
                  Public URL (optional, limit 1/min)
                </label>
                <input
                  id="scan-url-input"
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://www.w3.org/WAI/demos/bad/before/home.html"
                  className="min-h-11 w-full rounded-lg border border-base-line bg-base px-3 text-base text-ink placeholder:text-ink-muted"
                />
              </div>
              <div>
                <label htmlFor="scan-audit-type" className="mb-1 block text-sm font-semibold text-ink">
                  Accessibility Check Type
                </label>
                <select
                  id="scan-audit-type"
                  value={auditType}
                  onChange={(e) => setAuditType(e.target.value as AuditType)}
                  className="min-h-11 w-full rounded-lg border border-base-line bg-base px-3 text-base text-ink"
                >
                  <option value="all">{AUDIT_LABELS.all}</option>
                  <option value="labels">{AUDIT_LABELS.labels}</option>
                  <option value="contrast">{AUDIT_LABELS.contrast}</option>
                  <option value="keyboard">{AUDIT_LABELS.keyboard}</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="submit"
                size="sm"
                color="secondary"
                isDisabled={loading}
                startContent={<Globe size={15} aria-hidden="true" />}
                className="min-h-11 bg-violet-600 px-4 font-semibold text-white"
              >
                {loading ? 'Scanning…' : 'Scan Public URL'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="flat"
                isDisabled={loading}
                onPress={() => void runScan({ variant: 'broken' })}
                className="min-h-11 bg-base-surface px-4 font-semibold text-white"
              >
                Scan Haunted Bank
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <span className="font-semibold text-ink">Try a verified public URL:</span>
            {[
              { label: 'W3C BAD Demo (Inaccessible)', url: 'https://www.w3.org/WAI/demos/bad/before/home.html' },
              { label: 'W3C BAD Demo (Accessible)', url: 'https://www.w3.org/WAI/demos/bad/after/home.html' },
              { label: 'HTTPBin HTML', url: 'https://httpbin.org/html' },
            ].map((sample) => (
              <button
                key={sample.url}
                type="button"
                disabled={loading}
                onClick={() => {
                  setUrlInput(sample.url);
                  void runScan({ url: sample.url });
                }}
                className="rounded-full border border-base-line bg-base-surface/60 px-3 py-1 text-xs font-medium text-violet-300 hover:border-violet-neon hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon disabled:opacity-50"
              >
                {sample.label}
              </button>
            ))}
          </div>

          {error && (
            <p role="alert" className="m-0 rounded-xl bg-ghost-blocked/15 px-4 py-3 text-sm text-ghost-blocked">
              {error}
            </p>
          )}

          {scanResult && (
            <div
              className={`rounded-xl border p-4 ${
                passed ? 'border-ghost-verified/50 bg-ghost-verified/10' : 'border-ghost-blocked/50 bg-base-surface/60'
              }`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <GhostMascot state={passed ? 'verified' : 'blocked'} size={44} animate={false} />
                  <div>
                    <p className="m-0 text-sm font-semibold text-white">
                      Scanned: <span className="font-mono text-violet-300">{scanResult.target}</span> ({scanResult.count} findings)
                    </p>
                    <p className="m-0 text-xs text-ink-muted">
                      {passed
                        ? 'Green Ghost: clean for selected checks — no static fix needed here.'
                        : `Red Ghost: ${scanResult.count} violation(s) captured under ${AUDIT_LABELS[scanResult.audit_type ?? 'all']}.`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="flat"
                    startContent={<FileDown size={14} aria-hidden="true" />}
                    onPress={() => openPrintablePdfReport(scanResult)}
                    className="bg-violet-600 text-xs font-semibold text-white"
                  >
                    Download PDF Report
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="flat"
                    startContent={<Download size={14} aria-hidden="true" />}
                    onPress={() => downloadJsonReport(scanResult)}
                    className="bg-base-surface text-xs font-semibold text-white"
                  >
                    Export JSON
                  </Button>
                </div>
              </div>

              {scanResult.findings.length === 0 ? (
                <p className="m-0 text-sm text-ghost-verified">
                  No axe-core WCAG 2.x violations reported for this check type.
                </p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-2 p-0" role="list">
                  {scanResult.findings.map((f, i) => (
                    <li key={`${f.rule}-${i}`} className="rounded-lg bg-base/80 px-3 py-2 text-sm">
                      <span className="font-mono font-bold text-ghost-blocked">{f.rule}</span>
                      {f.impact && <span className="ml-2 text-xs text-ink-muted">({f.impact})</span>}
                      {f.element && <code className="ml-2 font-mono text-xs text-violet-300">{f.element}</code>}
                      <p className="m-0 mt-1 text-ink-muted">{f.help}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex items-start gap-2.5 rounded-xl bg-base-surface/40 p-4 text-sm text-ink-muted">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-violet-neon" aria-hidden="true" />
            <span>
              Built-in network protection blocks loopback, private networks, and cloud metadata addresses before loading any external URL.
            </span>
          </div>
          <div>
            <Button
              as={Link}
              to={to('possession')}
              size="sm"
              color="secondary"
              endContent={<ArrowRight size={15} aria-hidden="true" />}
              className="bg-violet-600 px-4 font-semibold text-white"
            >
              Run Haunted Bank Journey
            </Button>
          </div>
        </CardBody>
      </Card>
    </Page>
  );
}
