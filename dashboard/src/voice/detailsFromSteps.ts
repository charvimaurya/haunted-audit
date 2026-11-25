/**
 * Which Test details fields a voice run may fill, and when (user-typed-test-details REQ-TD-11).
 * Pure functions, so every rule is tested without a browser:
 * - Only a voice_type step with outcome "done" fills a field. A failed step never does, even though its
 *   args.text is set (agent/voice_agent/runner.py `_type`: text is sent on failure too, but nothing was typed).
 * - Each field is filled at most once per run, and each step is used at most once.
 * - A field the tester edits during or after the run is theirs for the rest of that run.
 * - The final run record replays the same step numbers, so it goes through the same rules.
 * - A new run (a new runSeq) starts with empty tracking.
 */
import type { TestDetails } from '../types';
import type { VoiceStep } from './useVoiceRun';

export type DetailField = keyof TestDetails;

/** The bank's field labels (fixtures/haunted_bank/index.html). The runner only reports "done" after
 * exactly one label matched the spoken name as a whole-word prefix, so a done step's name maps here safely. */
const FIELDS: Array<[DetailField, RegExp]> = [
  ['recipient', /^\s*recipient\b/i],
  ['amount', /^\s*amount\b/i],
  ['reference', /^\s*reference\b/i],
];

export interface FillTracker {
  runSeq: number;
  appliedSteps: ReadonlySet<number>;
  filled: ReadonlySet<DetailField>;
  userOwned: ReadonlySet<DetailField>;
}

export function newTracker(runSeq: number): FillTracker {
  return { runSeq, appliedSteps: new Set(), filled: new Set(), userOwned: new Set() };
}

function fieldFor(name: string | undefined): DetailField | null {
  if (!name) return null;
  const hit = FIELDS.find(([, re]) => re.test(name));
  return hit ? hit[0] : null;
}

/** The new fills for this run's steps, and the tracker after them. A different runSeq starts a new tracker. */
export function fillsFromSteps(
  tracker: FillTracker,
  runSeq: number,
  steps: readonly VoiceStep[],
): { tracker: FillTracker; fill: Partial<TestDetails> } {
  const base = tracker.runSeq === runSeq ? tracker : newTracker(runSeq);
  const appliedSteps = new Set(base.appliedSteps);
  const filled = new Set(base.filled);
  const fill: Partial<TestDetails> = {};
  for (const s of [...steps].sort((a, b) => a.step - b.step)) {
    if (appliedSteps.has(s.step)) continue;
    if (s.tool !== 'voice_type' || s.outcome !== 'done' || typeof s.text !== 'string') continue;
    const field = fieldFor(s.name);
    if (!field) continue;
    appliedSteps.add(s.step);
    if (filled.has(field) || base.userOwned.has(field)) continue;
    filled.add(field);
    fill[field] = s.text;
  }
  return { tracker: { ...base, appliedSteps, filled }, fill };
}

/** The fields the tester changed (seen against the values the form showed), now theirs for the current run. */
export function markUserEdit(tracker: FillTracker, runSeq: number, shown: TestDetails, next: TestDetails): {
  tracker: FillTracker;
  changed: Partial<TestDetails>;
} {
  const base = tracker.runSeq === runSeq ? tracker : newTracker(runSeq);
  const changed: Partial<TestDetails> = {};
  const userOwned = new Set(base.userOwned);
  for (const f of Object.keys(next) as DetailField[]) {
    if (next[f] !== shown[f]) {
      changed[f] = next[f];
      userOwned.add(f);
    }
  }
  return { tracker: { ...base, userOwned }, changed };
}
