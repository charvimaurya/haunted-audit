import { Chip } from '@heroui/react';
import { useContext } from 'react';
import { RunContext } from '../../runs/runContext';
import type { GhostState } from '../../types/index';

export function RunStateBadge() {
  const run = useContext(RunContext);
  const result = run?.isRunning ? null : run?.voiceResult ?? run?.result ?? null;
  const state: GhostState = !result ? 'ready' : result.verdict === 'PASSED' ? 'verified' : 'blocked';

  if (run?.isRunning) {
    return (
      <Chip
        size="sm"
        variant="flat"
        color="danger"
        data-run-state="ready"
        className="border border-[#ff6b6b55] bg-[#3a1222] text-[#ff8a8a] font-semibold"
        startContent={<span className="ml-1 inline-block h-2 w-2 rounded-full bg-[#ff5a5a] shadow-[0_0_8px_#ff5a5a]" />}
      >
        Live Test
      </Chip>
    );
  }

  if (!result) {
    return (
      <Chip
        size="sm"
        variant="flat"
        data-run-state={state}
        className="border border-[#2b3254] bg-[#1d2140] text-ink-muted font-semibold"
      >
        Ready: no run yet
      </Chip>
    );
  }

  if (result.verdict === 'PASSED') {
    return (
      <Chip
        size="sm"
        variant="flat"
        color="success"
        data-run-state={state}
        className="border border-[#22c55e55] bg-[#0f2a1b] text-[#6ee7a0] font-semibold"
        startContent={<span className="ml-1 inline-block h-2 w-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]" />}
      >
        Verified ({result.agent_mode})
      </Chip>
    );
  }

  return (
    <Chip
      size="sm"
      variant="flat"
      color="danger"
      data-run-state={state}
      className="border border-[#ff6b6b55] bg-[#3a1222] text-[#ff8a8a] font-semibold"
      startContent={<span className="ml-1 inline-block h-2 w-2 rounded-full bg-[#ff5a5a] shadow-[0_0_8px_#ff5a5a]" />}
    >
      Blocked ({result.agent_mode})
    </Chip>
  );
}
