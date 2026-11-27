import { useState } from 'react';
import { Button, Card, CardBody, CardHeader, Chip, Switch } from '@heroui/react';
import { Activity, Bot, Database, RefreshCw, Shield, Sparkles, Trash2, Volume2, VolumeX } from 'lucide-react';
import { Page } from '../../components/layout/Page';
import { useFix } from '../../fixes/fixContext';
import { useImmersion } from '../../immersion/ImmersionContext';
import { API_BASE } from '../../runs/api';
import {
  isHistorySavingEnabled,
  readAuditDefaults,
  setHistorySavingEnabled,
  writeAuditDefaults,
} from '../../runs/possessionHistory';
import { useRun } from '../../runs/runContext';
import type { AgentMode, Variant } from '../../types';

export default function Settings() {
  const { calm, systemReduce, soundOn, toggleCalm, toggleSound } = useImmersion();
  const { variant, mode, setVariant, setMode, history, clearHistory, apiStatus } = useRun();
  const flow = useFix();
  const [defaults, setDefaults] = useState(() => readAuditDefaults());
  const [saveHistory, setSaveHistory] = useState(() => isHistorySavingEnabled());
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);

  const trackedFixCount = Object.keys(flow?.trackedFixes ?? {}).length;

  function applyDefaultVariant(next: Variant) {
    const updated = { ...defaults, variant: next };
    setDefaults(updated);
    writeAuditDefaults(updated);
    setVariant(next);
  }

  function applyDefaultMode(next: AgentMode) {
    const updated = { ...defaults, mode: next };
    setDefaults(updated);
    writeAuditDefaults(updated);
    setMode(next);
  }

  function toggleHistoryPersistence(enabled: boolean) {
    setSaveHistory(enabled);
    setHistorySavingEnabled(enabled);
  }

  async function pingBackend() {
    setPinging(true);
    const t0 = performance.now();
    try {
      const res = await fetch(`${API_BASE}/health`);
      const ms = Math.round(performance.now() - t0);
      setPingResult(res.ok ? `Healthy (HTTP ${res.status}, ${ms} ms)` : `Refused (HTTP ${res.status})`);
    } catch {
      setPingResult('Offline: FastAPI backend did not respond on port 8000.');
    } finally {
      setPinging(false);
    }
  }

  return (
    <Page id="app-settings">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* 1. Default Agent Runner & Target Variant */}
        <Card className="bg-base-panel text-white shadow-none">
          <CardHeader className="flex items-center justify-between gap-3 px-5 pt-5 pb-2">
            <div className="flex items-center gap-2.5">
              <Bot size={20} className="text-violet-neon" aria-hidden="true" />
              <h2 className="m-0 text-lg font-bold">Default Runner &amp; Variant</h2>
            </div>
            <Chip size="sm" variant="flat" color="secondary">{defaults.mode}</Chip>
          </CardHeader>
          <CardBody className="flex flex-col gap-3 px-5 pb-5">
            <p className="m-0 text-sm text-ink-muted">
              Choose the initial Haunted Bank page variant and runner engine loaded in Possession Mode.
            </p>
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Default Variant</span>
                <div className="flex gap-1.5" role="group" aria-label="Default bank variant">
                  {(['broken', 'fixed'] as Variant[]).map((v) => (
                    <Button
                      key={v}
                      type="button"
                      size="sm"
                      variant={defaults.variant === v ? 'solid' : 'flat'}
                      color={defaults.variant === v ? 'secondary' : 'default'}
                      onPress={() => applyDefaultVariant(v)}
                      aria-pressed={defaults.variant === v}
                      className={defaults.variant === v ? 'bg-violet-600 font-semibold text-white' : 'bg-base-surface text-white/80'}
                    >
                      {v === 'broken' ? 'Broken (Haunted)' : 'Fixed (Clean)'}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Runner Mode</span>
                <div className="flex gap-1.5" role="group" aria-label="Default agent runner">
                  {(['scripted', 'llm'] as AgentMode[]).map((m) => (
                    <Button
                      key={m}
                      type="button"
                      size="sm"
                      variant={defaults.mode === m ? 'solid' : 'flat'}
                      color={defaults.mode === m ? 'secondary' : 'default'}
                      onPress={() => applyDefaultMode(m)}
                      aria-pressed={defaults.mode === m}
                      className={defaults.mode === m ? 'bg-violet-600 font-semibold text-white' : 'bg-base-surface text-white/80'}
                    >
                      {m === 'scripted' ? 'Scripted (0 tokens)' : 'Bedrock LLM'}
                    </Button>
                  ))}
                </div>
              </div>
              <p className="m-0 text-xs text-ink-faint">
                Current session: <span className="font-mono text-white">{variant}</span> · <span className="font-mono text-white">{mode}</span>
              </p>
            </div>
          </CardBody>
        </Card>

        {/* 2. Underground Halloween Audio */}
        <Card className="bg-base-panel text-white shadow-none">
          <CardHeader className="flex items-center justify-between gap-3 px-5 pt-5 pb-2">
            <div className="flex items-center gap-2.5">
              {soundOn ? <Volume2 size={20} className="text-violet-neon" aria-hidden="true" /> : <VolumeX size={20} className="text-ink-muted" aria-hidden="true" />}
              <h2 className="m-0 text-lg font-bold">Underground Halloween Audio</h2>
            </div>
            <Chip size="sm" variant="flat" color={soundOn ? 'secondary' : 'default'}>{soundOn ? 'On' : 'Off'}</Chip>
          </CardHeader>
          <CardBody className="flex flex-row items-center justify-between gap-4 px-5 pb-5">
            <p className="m-0 text-sm text-ink-muted">
              Plays the synthesized Web Audio cavern drone, eerie ambient chimes, and spooky click feedback.
            </p>
            <Switch
              isSelected={soundOn}
              onValueChange={toggleSound}
              aria-label="Toggle underground Halloween sound"
              color="secondary"
            />
          </CardBody>
        </Card>

        {/* 3. Calm Mode (Motion Guard) */}
        <Card className="bg-base-panel text-white shadow-none">
          <CardHeader className="flex items-center justify-between gap-3 px-5 pt-5 pb-2">
            <div className="flex items-center gap-2.5">
              <Sparkles size={20} className="text-violet-neon" aria-hidden="true" />
              <h2 className="m-0 text-lg font-bold">Calm Mode</h2>
            </div>
            <Chip size="sm" variant="flat" color={calm ? 'secondary' : 'default'}>{calm ? 'On' : 'Off'}</Chip>
          </CardHeader>
          <CardBody className="flex flex-row items-center justify-between gap-4 px-5 pb-5">
            <p className="m-0 text-sm text-ink-muted">
              Stops cursor ghosts, dimensional crimson/green ghost animations, and transitions cleanly.
              {systemReduce ? ' Currently active from your OS reduced-motion setting.' : ''}
            </p>
            <Switch
              isSelected={calm}
              onValueChange={toggleCalm}
              isDisabled={systemReduce}
              aria-label="Toggle Calm mode"
              color="secondary"
            />
          </CardBody>
        </Card>

        {/* 4. Local Run Storage & Fix Tracking */}
        <Card className="bg-base-panel text-white shadow-none">
          <CardHeader className="flex items-center justify-between gap-3 px-5 pt-5 pb-2">
            <div className="flex items-center gap-2.5">
              <Database size={20} className="text-violet-neon" aria-hidden="true" />
              <h2 className="m-0 text-lg font-bold">Possession Storage &amp; Reset</h2>
            </div>
            <Chip size="sm" variant="flat" color="secondary" className="font-mono text-xs">
              {history.length} runs · {trackedFixCount} fixes
            </Chip>
          </CardHeader>
          <CardBody className="flex flex-col gap-3 px-5 pb-5">
            <div className="flex items-center justify-between gap-3">
              <p className="m-0 text-sm text-ink-muted">
                Save completed Possession verdicts and fix rounds in browser storage across reloads (personal details are never saved).
              </p>
              <Switch
                isSelected={saveHistory}
                onValueChange={toggleHistoryPersistence}
                aria-label="Toggle saving Possession history locally"
                color="secondary"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-xs text-ink-faint">Reset all local run charts and tracked fixes back to unmeasured `--`</span>
              <Button
                type="button"
                size="sm"
                color="danger"
                variant="flat"
                isDisabled={history.length === 0 && trackedFixCount === 0}
                startContent={<Trash2 size={14} aria-hidden="true" />}
                onPress={clearHistory}
                className="font-semibold"
              >
                Clear Saved Runs
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* 5. API Diagnostics & Safety Guardrails */}
        <Card className="bg-base-panel text-white shadow-none md:col-span-2">
          <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-2">
            <div className="flex items-center gap-2.5">
              <Activity size={20} className="text-violet-neon" aria-hidden="true" />
              <h2 className="m-0 text-lg font-bold">Backend Diagnostics &amp; Guardrails</h2>
            </div>
            <Chip size="sm" variant="flat" color={apiStatus === 'online' ? 'success' : 'warning'}>
              API: {apiStatus}
            </Chip>
          </CardHeader>
          <CardBody className="flex flex-col gap-3 px-5 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1 text-sm text-ink-muted">
              <span className="flex items-center gap-1.5 text-white">
                <Shield size={15} className="text-violet-neon" aria-hidden="true" />
                Active Protections: Bundled sandbox agents · Built-in network guard · 1/min public URL scan rate limit
              </span>
              {pingResult && <span className="font-mono text-xs text-violet-300">{pingResult}</span>}
            </div>
            <Button
              type="button"
              size="sm"
              color="secondary"
              isDisabled={pinging}
              startContent={<RefreshCw size={14} className={pinging ? 'animate-spin' : undefined} aria-hidden="true" />}
              onPress={() => void pingBackend()}
              className="shrink-0 bg-violet-600 font-semibold text-white"
            >
              {pinging ? 'Checking…' : 'Test API Connection'}
            </Button>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
