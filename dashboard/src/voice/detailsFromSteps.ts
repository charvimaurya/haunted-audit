/**
 * What the voice agent typed, for the Test details form (owner request, 24 Nov 2026).
 * Read only from the run's own voice_type steps that the page actually completed, so a field shows what was
 * said and done, never what was said but failed, and never a value the app made up (owner decision, 25 Nov
 * 2026: only successful voice_type events fill a field).
 */
import type { TestDetails } from '../types';
import type { VoiceStep } from './useVoiceRun';

const FIELDS: Array<[keyof TestDetails, RegExp]> = [
  ['recipient', /^\s*recipient\b/i],
  ['amount', /^\s*amount\b/i],
  ['reference', /^\s*reference\b/i],
];

export function detailsFromSteps(steps: VoiceStep[]): Partial<TestDetails> {
  const out: Partial<TestDetails> = {};
  for (const s of steps) {
    if (s.tool !== 'voice_type' || s.outcome !== 'done' || !s.name || typeof s.text !== 'string') continue;
    const hit = FIELDS.find(([, re]) => re.test(s.name as string));
    if (hit) out[hit[0]] = s.text;
  }
  return out;
}

/**
 * Keep only the spoken fields the tester has not already typed by hand (owner decision, 25 Nov 2026:
 * manual edits are never overwritten by streamed events or final records). `touched` is the set of
 * fields `PossessionJourney` has seen a direct, manual `onDetailsChange` for.
 */
export function withoutHandTypedFields(
  spoken: Partial<TestDetails>,
  touched: ReadonlySet<keyof TestDetails>,
): Partial<TestDetails> {
  return Object.fromEntries(
    Object.entries(spoken).filter(([field]) => !touched.has(field as keyof TestDetails)),
  ) as Partial<TestDetails>;
}
