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

const FIELD_SYNONYMS: Record<string, string> = {
  recipient: 'Recipient',
  recipients: 'Recipient',
  recepient: 'Recipient',
  reciepient: 'Recipient',
  resipient: 'Recipient',
  recipent: 'Recipient',
  payee: 'Recipient',
  receiver: 'Recipient',
  beneficiary: 'Recipient',
  person: 'Recipient',
  name: 'Recipient',
  amount: 'Amount',
  amounts: 'Amount',
  'a mount': 'Amount',
  amout: 'Amount',
  amunt: 'Amount',
  amoutn: 'Amount',
  amnt: 'Amount',
  money: 'Amount',
  total: 'Amount',
  totals: 'Amount',
  price: 'Amount',
  cost: 'Amount',
  fee: 'Amount',
  fees: 'Amount',
  sum: 'Amount',
  reference: 'Reference',
  references: 'Reference',
  refernce: 'Reference',
  ref: 'Reference',
  note: 'Reference',
  notes: 'Reference',
  memo: 'Reference',
  reason: 'Reference',
  comment: 'Reference',
};

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

/** Intelligent field & problem-word normalizer ('amounts' -> 'Amount', 'amout' -> 'Amount'). */
export function normalizeVoiceField(raw: string): string {
  const cleaned = raw.replace(/\s+(?:field|box|input)$/i, '').trim();
  const low = cleaned.toLowerCase();
  if (FIELD_SYNONYMS[low]) return FIELD_SYNONYMS[low];
  if (low.endsWith('s') && FIELD_SYNONYMS[low.slice(0, -1)]) return FIELD_SYNONYMS[low.slice(0, -1)];
  for (const target of ['recipient', 'amount', 'reference'] as const) {
    if (editDistance(low, target) <= 2) return target[0].toUpperCase() + target.slice(1);
  }
  return cleaned;
}

/** Rewrite noisy user voice/typed text so problem words like "amounts" resolve cleanly before sending to backend. */
export function normalizeVoiceCommand(command: string): string {
  const trimmed = command.trim();
  if (!trimmed) return trimmed;
  // Normalize "type/enter/put/set ... in <problem-word field>"
  const typeMatch = trimmed.match(/^(type|enter|write|put)\s+(.+?)\s+in(?:to)?\s+(?:the\s+)?(.+?)[.?!]*$/i);
  if (typeMatch) {
    const [, verb, val, field] = typeMatch;
    return `${verb} ${val} in ${normalizeVoiceField(field)}`;
  }
  const setMatch = trimmed.match(/^(?:set|fill)\s+(?:the\s+)?(.+?)\s+(?:to|with)\s+(.+?)[.?!]*$/i);
  if (setMatch) {
    const [, field, val] = setMatch;
    return `type ${val} in ${normalizeVoiceField(field)}`;
  }
  // Common ASR typos for click/press + send payments
  return trimmed
    .replace(/^(?:clik|clic|pres|prees|tapp)\b/i, 'click')
    .replace(/\bsend\s+payments\b/i, 'Send Payment');
}

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
  const q = normalizeVoiceField(query).trim().toLowerCase();
  if (!q) return null;
  const exact = names.find((n) => n.toLowerCase() === q);
  if (exact) return exact;
  const includes = names.find(
    (n) => n.toLowerCase().includes(q) || q.includes(n.toLowerCase()),
  );
  if (includes) return includes;
  // Fuzzy match against available accessible names when slightly misspelled/pluralized
  const fuzzy = names.find((n) => editDistance(q, n.toLowerCase()) <= 2);
  return fuzzy ?? null;
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
