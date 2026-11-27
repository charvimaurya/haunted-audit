import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, Chip } from '@heroui/react';
import { ArrowRight, Globe, ScanSearch, ShieldAlert } from 'lucide-react';
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
            Scan the bundled Haunted Bank fixture or run a read-only axe-core accessibility check on a public http/https URL. No page content is saved.
          </p>

          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void runScan(urlInput.trim() ? { url: urlInput.trim() } : { variant: 'broken' });
            }}
          >
            <div className="flex-1">
              <label htmlFor="scan-url-input" className="mb-1 block text-sm font-semibold text-ink">
                Public URL (optional, limit 1/min)
              </label>
              <input
                id="scan-url-input"
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com"
                className="min-h-11 w-full rounded-lg border border-base-line bg-base px-3 text-base text-ink placeholder:text-ink-muted"
              />
            </div>
            <div className="flex flex-wrap gap-2">
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
            <div className="rounded-xl bg-base-surface/60 p-4">
              <p className="m-0 mb-2 text-sm font-semibold text-white">
                Scanned: <span className="font-mono text-violet-300">{scanResult.target}</span> ({scanResult.count} findings)
              </p>
              {scanResult.findings.length === 0 ? (
                <p className="m-0 text-sm text-ink-muted">No axe-core WCAG 2.x violations reported.</p>
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
