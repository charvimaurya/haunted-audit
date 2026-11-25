/**
 * Fills the Test details form from a voice run's successful typing steps, under the rules in detailsFromSteps.ts.
 * Every write is a functional update that sets only the fields it means to change, so it merges with the latest
 * details and never puts back an older value. Returns the handler the form must use for the tester's own edits.
 */
import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { TestDetails } from '../types';
import { fillsFromSteps, markUserEdit, newTracker } from './detailsFromSteps';
import type { VoiceRunState } from './useVoiceRun';

export function useVoiceDetailsFill(
  run: Pick<VoiceRunState, 'runSeq' | 'steps'>,
  shown: TestDetails,
  setDetails: Dispatch<SetStateAction<TestDetails>>,
): (next: TestDetails) => void {
  const tracker = useRef(newTracker(run.runSeq));

  useEffect(() => {
    const { tracker: next, fill } = fillsFromSteps(tracker.current, run.runSeq, run.steps);
    tracker.current = next;
    if (Object.keys(fill).length > 0) setDetails((prev) => ({ ...prev, ...fill }));
  }, [run.runSeq, run.steps, setDetails]);

  return useCallback(
    (next: TestDetails) => {
      // `shown` is what the form displayed when the tester typed, so only the fields they changed are written.
      const { tracker: t, changed } = markUserEdit(tracker.current, run.runSeq, shown, next);
      tracker.current = t;
      if (Object.keys(changed).length > 0) setDetails((prev) => ({ ...prev, ...changed }));
    },
    [run.runSeq, shown, setDetails],
  );
}
