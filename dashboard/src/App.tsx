/**
 * App
 *
 * Root layout. Wires API calls to all panels.
 *
 * Live run flow:
 *   1. POST /runs → get run_id
 *   2. GET /runs/{id}/events (SSE) → stream StepEvents, update liveEvents
 *   3. On "done" event → GET /runs/{id} → final JourneyResult
 *
 * API base URL: VITE_API_URL env var, defaults to http://127.0.0.1:8000
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { TopNav }               from './components/TopNav';
import { HeroSection }          from './components/HeroSection';
import { RunControls }          from './components/RunControls';
import { PossessionMode }       from './components/PossessionMode';
import { GhostHuntSection }     from './components/GhostHuntSection';
import { PipelineSection }      from './components/PipelineSection';
import { KiroIntegrationSection } from './components/KiroIntegrationSection';
import { ResultsSection }       from './components/ResultsSection';
import type { AgentMode, JourneyResult, RunStatus, StepEvent, Variant } from './types';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://127.0.0.1:8000';

// Pipeline step derived from journey state
function derivePipelineStep(result: JourneyResult | null, isRunning: boolean): 1 | 2 | 3 | 4 {
  if (isRunning || result === null) return 1;
  if (result.verdict === 'BLOCKED') return 2;
  return 3;
}

export default function App() {
  const [variant, setVariant]     = useState<Variant>('broken');
  const [mode, setMode]           = useState<AgentMode>('scripted');
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null);
  const [result, setResult]       = useState<JourneyResult | null>(null);
  const [liveEvents, setLiveEvents] = useState<StepEvent[]>([]);
  const sseRef = useRef<EventSource | null>(null);

  // Clean up SSE on unmount
  useEffect(() => () => sseRef.current?.close(), []);

  const handleRun = useCallback(async () => {
    // Reset state
    setResult(null);
    setLiveEvents([]);
    setRunStatus('running');
    sseRef.current?.close();

    try {
      // POST /runs
      const res = await fetch(`${API_BASE}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant, mode }),
      });
      if (!res.ok) {
        setRunStatus('error');
        return;
      }
      const { run_id } = (await res.json()) as { run_id: string };

      // SSE stream
      const sse = new EventSource(`${API_BASE}/runs/${run_id}/events`);
      sseRef.current = sse;

      sse.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as StepEvent;
          setLiveEvents((prev) => [...prev, event]);
        } catch {
          /* ignore parse errors for non-step frames */
        }
      };

      sse.addEventListener('done', async () => {
        sse.close();
        // Fetch final result
        try {
          const r = await fetch(`${API_BASE}/runs/${run_id}`);
          if (r.ok) {
            const record = await r.json();
            setResult(record.result ?? null);
            setRunStatus(record.status === 'error' ? 'error' : 'complete');
          } else {
            setRunStatus('error');
          }
        } catch {
          setRunStatus('error');
        }
      });

      sse.addEventListener('error', () => {
        sse.close();
        setRunStatus('error');
      });
    } catch {
      setRunStatus('error');
    }
  }, [variant, mode]);

  const isRunning = runStatus === 'running';
  const pipelineStep = derivePipelineStep(result, isRunning);

  return (
    <div className="min-h-screen bg-base font-ui">
      {/* Skip link (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2
                   focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg
                   focus:bg-violet-600 focus:text-white focus:font-semibold
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
      >
        Skip to main content
      </a>

      <TopNav activeSection={isRunning ? 'Journeys' : 'Home'} />

      {/* Main content — offset for fixed nav.
          tabIndex={-1} allows the skip-link to move programmatic focus here
          without exposing an extra tab stop (WCAG 2.4.1). */}
      <main
        id="main-content"
        tabIndex={-1}
        aria-label="Haunted Audit dashboard"
        className="relative z-[1] pt-14 max-w-7xl mx-auto px-4 sm:px-6 pb-16
                   focus-visible:outline-none"
      >
        {/* Hero */}
        <HeroSection onPossess={handleRun} />

        {/* Run controls + panels */}
        <div className="flex flex-col gap-0">
          {/* Run controls */}
          <RunControls
            variant={variant}
            mode={mode}
            status={runStatus}
            onVariantChange={setVariant}
            onModeChange={setMode}
            onRun={handleRun}
          />

          <div className="flex flex-col gap-8 mt-6">
            {/* Possession Mode */}
            <PossessionMode
              result={result}
              isRunning={isRunning}
            />

            {/* Ghost Hunt — two-column on large screens */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
              <GhostHuntSection
                result={result}
                isRunning={isRunning}
                liveEvents={liveEvents}
              />

              {/* Results + Outcome stacked beside */}
              <ResultsSection
                result={result}
                agentMode={mode}
                /* All metrics null until a run completes */
                barriersDetected={
                  result?.verdict === 'BLOCKED' && result.blocked_element ? 1 : null
                }
                fixesVerifiedPct={result?.verdict === 'PASSED' ? 100 : null}
                testScenarios={null}
                userSessions={null}
              />
            </div>

            {/* Pipeline */}
            <PipelineSection result={result} activeStep={pipelineStep} />

            {/* Kiro Integration */}
            <KiroIntegrationSection />
          </div>
        </div>
      </main>
    </div>
  );
}
