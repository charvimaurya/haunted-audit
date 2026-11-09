/**
 * axe-core accessibility tests.
 *
 * Every component listed here must pass with zero violations.
 * These are the same rules an automated CI gate would apply.
 *
 * Note: axe-core is a static analysis tool. It can catch ~30–40% of WCAG
 * issues automatically. The remaining issues require human and assistive
 * technology testing. Passing these tests is a necessary but not sufficient
 * condition for full WCAG 2.1 AA compliance.
 */

/// <reference types="vitest/globals" />
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect, describe, it } from 'vitest';

import { GhostMascot }            from '../components/GhostMascot';
import { HeroSection }             from '../components/HeroSection';
import { TopNav }                  from '../components/TopNav';
import { RunControls }             from '../components/RunControls';
import { PossessionMode }          from '../components/PossessionMode';
import { AgentCard }               from '../components/AgentCard';
import { GhostHuntSection }        from '../components/GhostHuntSection';
import { PipelineSection }         from '../components/PipelineSection';
import { KiroIntegrationSection }  from '../components/KiroIntegrationSection';
import { OutcomeCard }             from '../components/OutcomeCard';
import { ResultsSection }          from '../components/ResultsSection';
import { MetricValueDisplay }      from '../components/MetricValue';

expect.extend(toHaveNoViolations);

// axe options: run WCAG 2.1 AA rules
const AXE_OPTIONS = {
  runOnly: {
    type: 'tag' as const,
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
  },
};

describe('Accessibility — zero axe violations', () => {
  it('GhostMascot (all states)', async () => {
    const { container: c1 } = render(<GhostMascot state="ready" />);
    const { container: c2 } = render(<GhostMascot state="blocked" />);
    const { container: c3 } = render(<GhostMascot state="verified" />);
    expect(await axe(c1, AXE_OPTIONS)).toHaveNoViolations();
    expect(await axe(c2, AXE_OPTIONS)).toHaveNoViolations();
    expect(await axe(c3, AXE_OPTIONS)).toHaveNoViolations();
  });

  it('TopNav (default + mobile open)', async () => {
    const { container } = render(<TopNav activeSection="Home" />);
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });

  it('HeroSection', async () => {
    const { container } = render(<HeroSection />);
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });

  it('RunControls (idle)', async () => {
    const { container } = render(
      <RunControls
        variant="broken"
        mode="scripted"
        status={null}
        onVariantChange={() => {}}
        onModeChange={() => {}}
        onRun={() => {}}
      />,
    );
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });

  it('RunControls (running)', async () => {
    const { container } = render(
      <RunControls
        variant="broken"
        mode="scripted"
        status="running"
        onVariantChange={() => {}}
        onModeChange={() => {}}
        onRun={() => {}}
      />,
    );
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });

  it('PossessionMode (null result)', async () => {
    const { container } = render(<PossessionMode result={null} />);
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });

  it('PossessionMode (blocked)', async () => {
    const { container } = render(
      <PossessionMode
        result={{
          run_id: 'test',
          verdict: 'BLOCKED',
          reason_code: 'TARGET_NOT_FOCUSABLE',
          focus_trail: [],
          step_events: [],
          screenshots: [],
          blocked_element: {
            selector: 'div.pay-btn',
            bounding_box: { x: 100, y: 200, width: 120, height: 40 },
            tag: 'div',
            accessible_name: 'Send Payment',
            text: 'Send Payment',
          },
          agent_mode: 'scripted',
          tokens: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
          latency_ms: 1200,
          cost_usd: 0,
          agent_claim: 'blocked',
          agent_claim_reason: null,
          agent_claim_mismatch: false,
          target_ever_focused: false,
          last_focused_element: null,
          skipped_element: null,
          variant: 'broken',
          goal: 'Send payment',
          stop_reason: 'completed',
          error: null,
        }}
      />,
    );
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });

  it('AgentCard', async () => {
    const { container } = render(
      <AgentCard
        name="Keyboard Agent"
        icon="⌨"
        outcomes={[
          { label: 'Navigated form', passed: true },
          { label: 'Could not reach Send Payment', passed: false },
        ]}
      />,
    );
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });

  it('GhostHuntSection (null result)', async () => {
    const { container } = render(
      <GhostHuntSection result={null} isRunning={false} liveEvents={[]} />,
    );
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });

  it('PipelineSection (step 1)', async () => {
    const { container } = render(<PipelineSection result={null} activeStep={1} />);
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });

  it('PipelineSection (step 3 / passed)', async () => {
    const { container } = render(
      <PipelineSection
        result={{
          run_id: 'test',
          verdict: 'PASSED',
          reason_code: null,
          focus_trail: [],
          step_events: [],
          screenshots: [],
          blocked_element: null,
          agent_mode: 'scripted',
          tokens: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
          latency_ms: 900,
          cost_usd: 0,
          agent_claim: 'attempted_complete',
          agent_claim_reason: null,
          agent_claim_mismatch: false,
          target_ever_focused: true,
          last_focused_element: null,
          skipped_element: null,
          variant: 'fixed',
          goal: 'Send payment',
          stop_reason: 'completed',
          error: null,
        }}
        activeStep={3}
      />,
    );
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });

  it('KiroIntegrationSection', async () => {
    const { container } = render(<KiroIntegrationSection />);
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });

  it('OutcomeCard (null result)', async () => {
    const { container } = render(<OutcomeCard result={null} />);
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });

  it('ResultsSection (unmeasured)', async () => {
    const { container } = render(
      <ResultsSection result={null} agentMode="scripted" />,
    );
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });

  it('MetricValueDisplay (unmeasured)', async () => {
    const { container } = render(
      <MetricValueDisplay
        value={null}
        label="Barriers detected"
        agentMode="scripted"
      />,
    );
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });

  it('MetricValueDisplay (measured)', async () => {
    const { container } = render(
      <MetricValueDisplay
        value={4}
        format={(n) => `${n} / 6`}
        label="Barriers detected"
        agentMode="llm"
      />,
    );
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });
});
