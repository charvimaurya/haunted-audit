/**
 * Plain-English text for a checker finding (docs/ui-fidelity.md D12).
 * One right answer per reason code, so this is a table, not a model. The WCAG criteria come from
 * bank/PLANTED.md and the wcag-ghost-mapper skill. The element name comes from blocked_element.
 */
import type { JourneyResult } from '../types';

export interface FindingText {
  barrier: string;
  impact: string;
  wcag: string;
  element: string;
}

const WCAG: Record<string, string> = {
  TARGET_NOT_FOCUSABLE: '2.1.1 Keyboard, 4.1.2 Name, Role, Value',
  NO_ACTIVATION: '2.1.1 Keyboard',
  FOCUS_TRAP: '2.1.2 No Keyboard Trap',
};

export function findingText(result: JourneyResult): FindingText | null {
  if (result.verdict !== 'BLOCKED' || !result.blocked_element) return null;
  const el = result.blocked_element;
  const element = (el.accessible_name || el.text || el.selector).trim();
  switch (result.reason_code) {
    case 'TARGET_NOT_FOCUSABLE':
      return { element, wcag: WCAG.TARGET_NOT_FOCUSABLE,
        barrier: `${element} cannot be reached with the keyboard (Tab never lands on it).`,
        impact: 'A keyboard-only customer cannot complete the payment.' };
    case 'NO_ACTIVATION':
      return { element, wcag: WCAG.NO_ACTIVATION,
        barrier: `${element} takes focus but does not act on Enter or Space.`,
        impact: 'A keyboard-only customer cannot complete the payment.' };
    case 'FOCUS_TRAP':
      return { element, wcag: WCAG.FOCUS_TRAP,
        barrier: 'Keyboard focus gets stuck in a loop and cannot reach the control.',
        impact: 'A keyboard-only customer is trapped and cannot finish.' };
    default:
      // STEP_LIMIT, TIMEOUT or none: the run stopped, which is not a barrier finding by itself.
      return null;
  }
}
