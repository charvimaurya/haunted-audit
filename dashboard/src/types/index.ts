// ── Shared types mirroring the Python Pydantic models ────────────────────────

export type Verdict    = 'PASSED' | 'BLOCKED';
export type ReasonCode = 'TARGET_NOT_FOCUSABLE' | 'FOCUS_TRAP' | 'NO_ACTIVATION' | 'STEP_LIMIT' | 'TIMEOUT';
export type AgentMode  = 'llm' | 'scripted';
export type Variant    = 'broken' | 'fixed';
export type RunStatus  = 'running' | 'complete' | 'error';

/** Purple = ready, Red = blocked, Green = verified */
export type GhostState = 'ready' | 'blocked' | 'verified';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FocusSnapshot {
  tag: string;
  role: string | null;
  accessible_name: string;
  selector_hint: string;
  bounding_box: BoundingBox | null;
  is_visible: boolean;
}

export interface StepEvent {
  step: number;
  tool: string;
  args: Record<string, unknown>;
  focused_before: FocusSnapshot | null;
  focused_after: FocusSnapshot | null;
  timestamp: string;
  screenshot_path: string | null;
}

export interface BlockedElement {
  selector: string;
  bounding_box: BoundingBox | null;
  tag: string | null;
  accessible_name: string | null;
  text: string | null;
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

/** The made-up details the tester typed (user-typed-test-details). Never filled in by the app. */
export interface TestDetails {
  recipient: string;
  amount: string;
  reference: string;
}
/** test_details on a run record: what was typed for that run, or null (internal default, never shown). */
export interface RecordedDetails {
  recipient: string | null;
  amount: string | null;
  reference: string | null;
}
export interface JourneyResult {
  run_id: string;
  verdict: Verdict;
  reason_code: ReasonCode | null;
  focus_trail: FocusSnapshot[];
  step_events: StepEvent[];
  screenshots: string[];
  blocked_element: BlockedElement | null;
  agent_mode: AgentMode;
  tokens: TokenUsage;
  latency_ms: number;
  cost_usd: number;
  agent_claim: 'attempted_complete' | 'blocked' | null;
  agent_claim_reason: string | null;
  agent_claim_mismatch: boolean;
  target_ever_focused: boolean;
  last_focused_element: FocusSnapshot | null;
  skipped_element: FocusSnapshot | null;
  variant: Variant;
  goal: string;
  stop_reason: 'completed' | 'step_limit' | 'timeout' | 'error';
  error: string | null;
  /** Which agent ran (data-contract.md). Older records have none, which means keyboard. */
  agent_kind?: 'keyboard' | 'voice';
  /** Where the agent's input came from. */
  input_source?: 'keyboard' | 'typed' | 'speech';
  /** Bundled Possession sandbox scenario id (defaults to haunted-bank). */
  scenario?: string;
}

/** A run record as returned by GET /runs/{id} */
export interface RunRecord {
  run_id: string;
  variant: Variant;
  mode: AgentMode;
  status: RunStatus;
  verdict: Verdict | null;
  reason_code: ReasonCode | null;
  result: JourneyResult | null;
}

/** Metric value: a measured number, or null = not yet measured */
export type MetricValue = number | null;

export interface EvalSummaryRow {
  mode: AgentMode;
  variant: Variant;
  runs_requested: number;
  runs_completed: number;
  correct_verdicts: number;
  average_steps: MetricValue;
  average_latency_ms: MetricValue;
  average_cost_usd: MetricValue;
  mismatches: number;
  reliable: boolean;
}
