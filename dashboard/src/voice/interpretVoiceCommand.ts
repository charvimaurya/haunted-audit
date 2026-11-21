/**
 * Local voice-command simulation against a real JourneyResult.
 * Does not invent WCAG verdicts or pass/fail rows without run data.
 */

import type { JourneyResult } from '../types';

export type VoiceInputSource = 'typed' | 'speech';

export type VoiceRunStatus = 'not-run' | 'simulated' | 'ran';

export interface VoiceOutcomeRow {
  label: string;
  /** Icon + text status; never colour alone. */
  status: 'ok' | 'fail' | 'info';
  detail?: string;
}

export interface VoiceInterpretResult {
  status: 'simulated' | 'ran';
  sourceLabel: string;
  outcomes: VoiceOutcomeRow[];
}

const DEFAULT_TARGET = 'Send Payment';

function sourceLabel(source: VoiceInputSource): string {
  return source === 'speech'
    ? 'browser speech recognition (Chrome)'
    : 'voice-command simulation';
}

function statusFor(source: VoiceInputSource): 'simulated' | 'ran' {
  return source === 'speech' ? 'ran' : 'simulated';
}

/** Collect accessible / visible names actually present on this run. */
export function namesFromResult(result: JourneyResult): string[] {
  const names: string[] = [];
  const push = (value: string | null | undefined) => {
    const t = value?.trim();
    if (t && !names.includes(t)) names.push(t);
  };
  for (const snap of result.focus_trail) {
    push(snap.accessible_name);
  }
  push(result.blocked_element?.accessible_name);
  push(result.blocked_element?.text);
  push(result.last_focused_element?.accessible_name);
  push(result.skipped_element?.accessible_name);
  return names;
}

/** Pull a control name from plain-English voice/typed commands. */
export function extractTargetName(command: string): string {
  const raw = command.trim();
  if (!raw) return DEFAULT_TARGET;

  const patterns = [
    /(?:click|press|activate|tap|select|open|find|locate|go to|focus)\s+(?:the\s+)?["']?(.+?)["']?\s*$/i,
    /(?:click|press|activate|tap|select|open|find|locate)\s+(?:on\s+)?["']?(.+?)["']?\s*$/i,
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m?.[1]) return m[1].replace(/[.?!]+$/, '').trim();
  }

  // Bare journey name or payment phrasing
  if (/send\s*payment/i.test(raw)) return DEFAULT_TARGET;
  if (/payment\s*button/i.test(raw)) return DEFAULT_TARGET;

  return raw.replace(/[.?!]+$/, '').trim() || DEFAULT_TARGET;
}

function isActivateIntent(command: string): boolean {
  return /\b(click|press|activate|tap|select|submit|send)\b/i.test(command);
}

function matchName(names: string[], query: string): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const exact = names.find((n) => n.toLowerCase() === q);
  if (exact) return exact;
  const includes = names.find(
    (n) => n.toLowerCase().includes(q) || q.includes(n.toLowerCase()),
  );
  return includes ?? null;
}

/**
 * Interpret a command against the current run.
 * With no run: honest "Not run yet" — never invent Found/Could not activate rows.
 */
export function interpretVoiceCommand(
  command: string,
  result: JourneyResult | null,
  source: VoiceInputSource,
): VoiceInterpretResult {
  const label = sourceLabel(source);
  const status = statusFor(source);
  const trimmed = command.trim();

  if (!trimmed) {
    return {
      status,
      sourceLabel: label,
      outcomes: [
        {
          label: 'Enter a command first',
          status: 'info',
          detail: 'Type a command or use the microphone, then run it.',
        },
      ],
    };
  }

  if (result === null) {
    return {
      status,
      sourceLabel: label,
      outcomes: [
        {
          label: 'Not run yet',
          status: 'info',
          detail:
            'No journey result to interpret against. Start a run from Possession Mode, then try again.',
        },
      ],
    };
  }

  const target = extractTargetName(trimmed);
  const matched = matchName(namesFromResult(result), target);
  const outcomes: VoiceOutcomeRow[] = [];

  if (matched) {
    outcomes.push({
      label: `Found by name "${matched}"`,
      status: 'ok',
    });
  } else {
    outcomes.push({
      label: `Could not find a control matching "${target}" in this run`,
      status: 'fail',
      detail: 'Checked focus trail and blocked-element names from the measured result only.',
    });
  }

  if (isActivateIntent(trimmed) || /send\s*payment/i.test(trimmed)) {
    if (!matched) {
      // already reported not found
    } else if (
      result.reason_code === 'NO_ACTIVATION' ||
      result.reason_code === 'TARGET_NOT_FOCUSABLE'
    ) {
      outcomes.push({
        label: 'Could not activate button',
        status: 'fail',
        detail: result.reason_code,
      });
    } else if (result.verdict === 'BLOCKED') {
      outcomes.push({
        label: 'Could not activate button',
        status: 'fail',
        detail: result.reason_code ?? 'Journey verdict BLOCKED',
      });
    } else if (result.verdict === 'PASSED') {
      outcomes.push({
        label: 'Activation reached in this run',
        status: 'ok',
        detail: 'Derived from journey verdict PASSED (keyboard run), not a server voice agent.',
      });
    } else {
      outcomes.push({
        label: '--',
        status: 'info',
        detail: 'Activation not measured for this command.',
      });
    }
  }

  return { status, sourceLabel: label, outcomes };
}
