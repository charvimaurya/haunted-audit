/// <reference types="vitest/globals" />
import { describe, expect, it } from 'vitest';
import { describeStop, focusTrailStops } from '../lib/focusTrail';
import type { JourneyResult } from '../types';

const snap = (selector_hint: string, role = 'textbox', accessible_name = '', extra: Record<string, unknown> = {}) => ({
  tag: 'input', role, accessible_name, selector_hint, bounding_box: { x: 1, y: 2, width: 3, height: 4 }, is_visible: true, ...extra,
});

const withTrail = (focus_trail: unknown[]): JourneyResult =>
  ({ run_id: 'r', verdict: 'BLOCKED', reason_code: 'TARGET_NOT_FOCUSABLE', focus_trail } as unknown as JourneyResult);

describe('focusTrailStops (UR-02)', () => {
  it('never throws on missing or malformed input', () => {
    expect(focusTrailStops(null)).toEqual([]);
    expect(focusTrailStops(undefined)).toEqual([]);
    expect(focusTrailStops({} as JourneyResult)).toEqual([]);
    expect(focusTrailStops({ focus_trail: 'bad' } as unknown as JourneyResult)).toEqual([]);
    expect(focusTrailStops(withTrail([null, 42, {}, { selector_hint: '' }, snap('#recipient')]))).toHaveLength(1);
  });

  it('keeps trail order, drops body, keeps the first visit only', () => {
    const stops = focusTrailStops(
      withTrail([snap('body'), snap('#recipient'), snap('#amount'), snap('#recipient'), snap('body')]),
    );
    expect(stops.map((s) => s.hint)).toEqual(['#recipient', '#amount']);
  });

  it('maps recipient, amount, reference and send-payment to replica ids', () => {
    const stops = focusTrailStops(
      withTrail([snap('#recipient'), snap('#amount'), snap('#reference'), snap('#send-payment', 'button', 'Send Payment')]),
    );
    expect(stops.map((s) => s.replicaId)).toEqual(['pm-recipient', 'pm-amount', 'pm-reference', 'pm-send-payment']);
  });

  it('text-only and unknown hints have replicaId null', () => {
    const stops = focusTrailStops(
      withTrail([snap('a.skip', 'link', 'Skip'), snap('#custom-link', 'link', 'Custom link')]),
    );
    expect(stops.map((s) => s.replicaId)).toEqual([null, null]);
    expect(stops[1].label).toBe('Custom link');
  });

  it('matches whole id tokens', () => {
    const stops = focusTrailStops(withTrail([snap('input#recipient'), snap('#recipient-hint', 'generic', 'Hint')]));
    expect(stops[0].replicaId).toBe('pm-recipient');
    expect(stops[1].replicaId).toBeNull();
  });

  it('numbers stops 1..N with the same total', () => {
    const stops = focusTrailStops(withTrail([snap('#recipient'), snap('#amount'), snap('#reference')]));
    expect(stops.map((s) => [s.position, s.total])).toEqual([[1, 3], [2, 3], [3, 3]]);
  });

  it('ignores bounding_box', () => {
    const a = focusTrailStops(withTrail([snap('#recipient', 'textbox', 'Recipient', { bounding_box: null })]));
    const b = focusTrailStops(withTrail([snap('#recipient', 'textbox', 'Recipient', { bounding_box: { x: 99, y: 88, width: 10, height: 10 } })]));
    expect(a).toEqual(b);
  });

  it('describeStop formats plain wording', () => {
    const [stop] = focusTrailStops(withTrail([snap('#amount', 'textbox', 'Amount')]));
    expect(describeStop(stop)).toBe('Stop 1 of 1: Amount, text box');
  });
});
