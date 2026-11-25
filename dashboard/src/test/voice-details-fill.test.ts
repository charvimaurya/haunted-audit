/**
 * Voice run fills the Test details form: the rules (user-typed-test-details REQ-TD-11). Pure functions.
 * Inputs are two real voice runs copied from data/runs.db in the exact GET /runs/{id} shape, passed through the
 * production toStep(). ff6c5937 is the regression evidence: Amount failed ("no accessible label") but its
 * args.text is still "10.00", so checking tool, name and text alone would wrongly fill Amount.
 */
import { describe, expect, it } from 'vitest';
import blockedRun from './fixtures/voice-run-ff6c5937.json';
import passedRun from './fixtures/voice-run-c98da1a2.json';
import { fillsFromSteps, markUserEdit, newTracker } from '../voice/detailsFromSteps';
import { toStep } from '../voice/useVoiceRun';
import type { StepEvent, TestDetails } from '../types';

const stepsOf = (record: { result: { step_events: unknown[] } }) =>
  (record.result.step_events as StepEvent[]).map(toStep);
const EMPTY: TestDetails = { recipient: '', amount: '', reference: '' };

describe('the real runs are what the tests say they are', () => {
  it('ff6c5937: Recipient done, Amount failed with text set, click done; checker BLOCKED', () => {
    const s = stepsOf(blockedRun);
    expect(blockedRun.verdict).toBe('BLOCKED');
    expect(s.map((x) => [x.tool, x.name, x.text, x.outcome])).toEqual([
      ['voice_type', 'Recipient', 'Test Recipient', 'done'],
      ['voice_type', 'Amount', '10.00', 'failed'],
      ['voice_click', 'Send Payment', undefined, 'done'],
    ]);
  });
  it('c98da1a2: both typing steps done; checker PASSED', () => {
    expect(passedRun.verdict).toBe('PASSED');
    expect(stepsOf(passedRun).filter((x) => x.outcome === 'done')).toHaveLength(3);
  });
});

describe('only done voice_type steps fill a field', () => {
  it('a failed Amount step does not fill Amount (ff6c5937)', () => {
    const { fill } = fillsFromSteps(newTracker(1), 1, stepsOf(blockedRun));
    expect(fill).toEqual({ recipient: 'Test Recipient' });
  });
  it('both done steps fill (c98da1a2)', () => {
    const { fill } = fillsFromSteps(newTracker(1), 1, stepsOf(passedRun));
    expect(fill).toEqual({ recipient: 'Test Recipient', amount: '10.00' });
  });
  it('voice_not_understood and voice_error never fill (shape from agent/voice_agent/runner.py run_text and voice_error)', () => {
    const steps = [
      { step: 1, tool: 'voice_not_understood', args: { command: 'hello', outcome: 'not_understood', message: 'Not understood: "hello".' } },
      { step: 2, tool: 'voice_error', args: { command: 'type x in Amount', outcome: 'failed', message: 'That step did not finish: timeout' } },
    ].map((e) => toStep({ ...e, focused_before: null, focused_after: null, timestamp: '2026-11-24T12:02:29Z', screenshot_path: null }));
    expect(fillsFromSteps(newTracker(1), 1, steps).fill).toEqual({});
  });
});

describe('once per step, once per field, per run', () => {
  it('the final record replays the same steps and fills nothing again', () => {
    const first = fillsFromSteps(newTracker(1), 1, stepsOf(passedRun));
    const again = fillsFromSteps(first.tracker, 1, stepsOf(passedRun));
    expect(again.fill).toEqual({});
  });
  it('a second done step for the same field does not fill it again', () => {
    const real = stepsOf(passedRun)[0];
    const later = { ...real, step: 4, text: 'Test Recipient Two' };
    expect(fillsFromSteps(newTracker(1), 1, [real, later]).fill).toEqual({ recipient: 'Test Recipient' });
  });
  it('a new run starts with empty tracking and may fill again', () => {
    const run1 = fillsFromSteps(newTracker(1), 1, stepsOf(passedRun));
    expect(fillsFromSteps(run1.tracker, 2, stepsOf(passedRun)).fill).toEqual({ recipient: 'Test Recipient', amount: '10.00' });
  });
});

describe('the tester\'s own edits win', () => {
  it('an edit between streamed steps survives the later step and the final record', () => {
    const steps = stepsOf(passedRun);
    let t = fillsFromSteps(newTracker(1), 1, steps.slice(0, 1)).tracker; // Recipient arrives
    const edit = markUserEdit(t, 1, { ...EMPTY, recipient: 'Test Recipient' }, { ...EMPTY, recipient: 'Test Recipient', amount: '20.00' });
    expect(edit.changed).toEqual({ amount: '20.00' });
    t = edit.tracker;
    const late = fillsFromSteps(t, 1, steps); // Amount "10.00" arrives after the edit
    expect(late.fill).toEqual({});
    expect(fillsFromSteps(late.tracker, 1, steps).fill).toEqual({}); // final record
  });
  it('an edit to a field already filled keeps it the tester\'s', () => {
    const steps = stepsOf(passedRun);
    const t = fillsFromSteps(newTracker(1), 1, steps).tracker;
    const edit = markUserEdit(t, 1, { ...EMPTY, recipient: 'Test Recipient', amount: '10.00' }, { ...EMPTY, recipient: 'Test Recipient B', amount: '10.00' });
    expect(edit.changed).toEqual({ recipient: 'Test Recipient B' });
    expect(fillsFromSteps(edit.tracker, 1, steps).fill).toEqual({});
  });
  it('an edit made as a new run starts belongs to that run, not the old one', () => {
    const old = fillsFromSteps(newTracker(1), 1, stepsOf(passedRun)).tracker;
    const edit = markUserEdit(old, 2, EMPTY, { ...EMPTY, amount: '30.00' });
    expect(edit.tracker.runSeq).toBe(2);
    expect(fillsFromSteps(edit.tracker, 2, stepsOf(passedRun)).fill).toEqual({ recipient: 'Test Recipient' });
  });
});
