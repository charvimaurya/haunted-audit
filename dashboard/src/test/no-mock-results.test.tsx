/// <reference types="vitest/globals" />
/**
 * No made-up results (no-mock-results REQ-NM-02, 03, 04, 08, 09).
 *
 * With no finished run, no page may show a pass, fail, Verified, caught or achieved state, and no tick or
 * cross icon, unless it is inside an ExampleLabel ([data-example]). Checked with the API online and offline.
 * Sample values may live only in src/samples/, and app code may not import that folder.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../AppRoutes';
import { EXAMPLE_TEXT, ExampleLabel } from '../components/ui/ExampleLabel';
import { PipelineSection } from '../components/fixes/PipelineSection';
import { NOT_RUN_TEXT, OFFLINE_TEXT, ResultState } from '../components/results/ResultState';
import { ResultsSection } from '../components/results/ResultsSection';
import { ImmersionProvider } from '../immersion/ImmersionContext';
import { PAGES, to } from '../routes';
import type { JourneyResult } from '../types';

/** Icons that mean pass or fail. */
const VERDICT_ICONS = ['lucide-circle-check', 'lucide-circle-x', 'lucide-check', 'lucide-x'];
/** Words that state a result. Case-sensitive on purpose: "has been verified" in a sentence is fine. */
const VERDICT_WORDS = /\b(PASSED|FAILED|PASS|FAIL|Verified|caught|achieved|Barrier Detected|Critical Ghost Detected|completed)\b/;
const VERDICT_LABELS = /^(passed|failed|achieved|ok|verified|completed)$/i;

function outsideExample(el: Element): boolean {
  return !el.closest('[data-example]');
}

/** Every result-like state on the page that is not inside an ExampleLabel. */
function fakeStates(root: HTMLElement): string[] {
  const out: string[] = [];
  root.querySelectorAll('svg').forEach((svg) => {
    const cls = Array.from(svg.classList);
    const hit = VERDICT_ICONS.find((c) => cls.includes(c));
    // Not results: the open-menu close button (X), and step-name icons in a static list of steps
    // (data-icon-role="step", the Home chips Detect, Fix, Verify, Prevent).
    const notAResult = svg.closest('button[aria-expanded="true"]') || svg.getAttribute('data-icon-role') === 'step';
    if (hit && outsideExample(svg) && !notAResult) out.push(`icon ${hit}`);
  });
  root.querySelectorAll('[aria-label]').forEach((el) => {
    if (VERDICT_LABELS.test(el.getAttribute('aria-label') ?? '') && outsideExample(el)) {
      out.push(`aria-label "${el.getAttribute('aria-label')}"`);
    }
  });
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const m = (n.textContent ?? '').match(VERDICT_WORDS);
    if (m && n.parentElement && outsideExample(n.parentElement)) out.push(`text "${m[0]}" in "${n.textContent?.trim().slice(0, 60)}"`);
  }
  return out;
}

function apiOnline() {
  vi.stubGlobal('fetch', vi.fn((url: string) =>
    url.endsWith('/health')
      ? Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }))
      : Promise.reject(new TypeError('only /health is answered in this test'))));
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ImmersionProvider>
        <AppRoutes />
      </ImmersionProvider>
    </MemoryRouter>,
  );
}

/** Pages that show run results. Each must say "Not run yet" (online) or the offline text (offline). */
const RESULT_PAGES = ['app-agents', 'app-reports', 'results', 'app-fixes'] as const;

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe.each([
  ['online', apiOnline, NOT_RUN_TEXT],
  ['offline', () => {}, OFFLINE_TEXT],
] as const)('with no run and the API %s', (_name, setup, expected) => {
  it('no page shows a pass, fail, Verified or caught state outside an Example label', async () => {
    setup();
    const problems: string[] = [];
    for (const page of PAGES) {
      const { container } = renderAt(page.path);
      await screen.findByRole('heading', { level: 1 });
      if ((RESULT_PAGES as readonly string[]).includes(page.id)) {
        await waitFor(() => expect(container.textContent, page.path).toContain(expected));
      }
      fakeStates(container).forEach((p) => problems.push(`${page.path}: ${p}`));
      cleanup();
    }
    expect(problems).toEqual([]);
  }, 60_000);
});

describe('the guard can fail', () => {
  it('finds a tick shown without a run, and allows it inside an Example label', () => {
    const { container } = render(
      <div>
        <p>Journey Verified</p>
        <ExampleLabel>
          <p>Example PASSED</p>
        </ExampleLabel>
      </div>,
    );
    expect(fakeStates(container)).toEqual(['text "Verified" in "Journey Verified"']);
    expect(screen.getByText(EXAMPLE_TEXT)).toBeTruthy();
  });
});

describe('real data is shown, with its agent_mode', () => {
  const blocked: JourneyResult = {
    run_id: 'r1', verdict: 'BLOCKED', reason_code: 'TARGET_NOT_FOCUSABLE',
    blocked_element: { selector: 'div.pay-btn', bounding_box: null, tag: 'div', accessible_name: null, text: 'Send Payment' },
    focus_trail: [], step_events: [], screenshots: [], agent_mode: 'scripted',
    tokens: { input_tokens: 0, output_tokens: 0, total_tokens: 0 }, latency_ms: 812, cost_usd: 0,
    agent_claim: null, agent_claim_reason: null, agent_claim_mismatch: false, target_ever_focused: false,
    last_focused_element: null, skipped_element: null, variant: 'broken', goal: 'Send a payment',
    stop_reason: 'completed', error: null,
  };

  it('Find shows the checker finding; Fix, Verify and Regression stay Not available yet', () => {
    const { container } = render(<PipelineSection result={blocked} activeStep={1} />);
    expect(container.textContent).toContain('Blocked: TARGET_NOT_FOCUSABLE');
    expect(container.textContent).toContain('div.pay-btn');
    expect(container.textContent).toContain('From the checker, scripted mode.');
    expect(screen.getAllByText('Not available yet.')).toHaveLength(3);
    expect(container.textContent).not.toMatch(/Verified|caught/);
  });

  it('the Outcome card says No for a blocked run and never ticks the regression row', () => {
    const { container } = render(<ResultsSection result={blocked} agentMode="scripted" barriersDetected={1} />);
    expect(container.textContent).toContain('No, in the last run (broken page, scripted mode): TARGET_NOT_FOCUSABLE.');
    expect(container.textContent).toContain('Not available yet: no regression test exists.');
    expect(container.querySelectorAll('svg.lucide-circle-check')).toHaveLength(0); // a blocked run shows no tick
    expect(container.querySelectorAll('svg.lucide-circle-x').length).toBeGreaterThanOrEqual(1);
  });
});

describe('sample data stays out of the app', () => {
  const SRC = join(__dirname, '..');
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
    });
  }

  it('no app file imports src/samples/', () => {
    const offenders = files(SRC)
      .map((p) => relative(SRC, p))
      .filter((p) => !p.startsWith('test/') && !p.startsWith('samples/'))
      .filter((p) => /from\s+['"][^'"]*\/samples(\/|['"])|import\(\s*['"][^'"]*\/samples(\/|['"])/.test(readFileSync(join(SRC, p), 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('the build rule is in vite.config.ts', () => {
    expect(readFileSync(join(SRC, '..', 'vite.config.ts'), 'utf8')).toContain('noSamplesInApp');
  });

  it('the samples module exists and is labelled', () => {
    expect(readFileSync(join(SRC, 'samples', 'v7Examples.ts'), 'utf8')).toMatch(/NOT results/);
  });

  it('the Kiro page shows the real hook command and a recorded finding with its source', async () => {
    renderAt(to('kiro'));
    await screen.findByRole('heading', { level: 1, name: 'Kiro' });
    expect(document.body.textContent).toContain('python3 backend/scan_file.py --hook');
    expect(document.body.textContent).toContain('Source: docs/evidence/mcp-scan-page-2026-11-22.md');
    expect(document.body.textContent).not.toContain('scanJourney');
    expect(document.body.textContent).not.toContain('SendPayment.tsx');
  });
});

describe('a crashed run is never shown as a verdict', () => {
  it('shownRun drops the BLOCKED of a crash and keeps the first line of the error', async () => {
    const { shownRun } = await import('../runs/record');
    const crashed = shownRun({
      status: 'error',
      result: { run_id: 'r2', verdict: 'BLOCKED', error: "BrowserType.launch: Executable doesn't exist\nmore detail" },
    });
    expect(crashed).toEqual({ result: null, error: "BrowserType.launch: Executable doesn't exist" });
    const ok = shownRun({ status: 'complete', result: { run_id: 'r3', verdict: 'PASSED', stop_reason: 'completed' } as never });
    expect(ok.error).toBeNull();
    expect(ok.result?.verdict).toBe('PASSED');
  });

  it('ResultState says the run failed, with no pass or fail state', () => {
    const { container } = render(<ResultState result={null} apiStatus="online" runError="boom" />);
    expect(container.textContent).toContain('The run failed, so no result is shown.');
    expect(fakeStates(container)).toEqual([]);
  });
});
