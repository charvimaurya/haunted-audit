import { describe, expect, it } from 'vitest';
import { detailsFromSteps, withoutHandTypedFields } from '../voice/detailsFromSteps';
import type { VoiceStep } from '../voice/useVoiceRun';

const step = (over: Partial<VoiceStep>): VoiceStep => ({ step: 1, message: '', outcome: 'done', ...over });

describe('voice run fills the Test details form (owner request, 24 Nov 2026)', () => {
  it('takes Recipient, Amount and Reference from voice_type steps that completed', () => {
    expect(detailsFromSteps([
      step({ tool: 'voice_type', name: 'Recipient', text: 'Sam Lee' }),
      step({ tool: 'voice_type', name: 'Amount', text: '100.00' }),
      step({ tool: 'voice_type', name: 'reference', text: 'Rent' }),
      step({ tool: 'voice_click', name: 'Send Payment' }),
    ])).toEqual({ recipient: 'Sam Lee', amount: '100.00', reference: 'Rent' });
  });
  it('fills nothing when nothing was typed or the command was not understood', () => {
    expect(detailsFromSteps([
      step({ tool: 'voice_not_understood', outcome: 'not_understood' }),
      step({ tool: 'voice_type', name: 'Email', text: 'x' }),
    ])).toEqual({});
  });
  it('skips a voice_type step that failed on the page (owner decision, 25 Nov 2026: only a completed step fills a field)', () => {
    expect(detailsFromSteps([
      step({ tool: 'voice_type', name: 'Recipient', text: 'Sam Lee' }),
      step({ tool: 'voice_type', name: 'Amount', text: '100.00', outcome: 'failed' }),
    ])).toEqual({ recipient: 'Sam Lee' });
  });
});

describe('a field the tester typed by hand is never overwritten by a voice fill (owner decision, 25 Nov 2026)', () => {
  it('drops a spoken field that is in the touched set', () => {
    const spoken = { recipient: 'Sam Lee', amount: '100.00' };
    expect(withoutHandTypedFields(spoken, new Set(['amount']))).toEqual({ recipient: 'Sam Lee' });
  });
  it('keeps every spoken field when nothing has been touched by hand', () => {
    const spoken = { recipient: 'Sam Lee', amount: '100.00', reference: 'Rent' };
    expect(withoutHandTypedFields(spoken, new Set())).toEqual(spoken);
  });
  it('drops every spoken field once all of them have been touched by hand', () => {
    const spoken = { recipient: 'Sam Lee', amount: '100.00' };
    expect(withoutHandTypedFields(spoken, new Set(['recipient', 'amount']))).toEqual({});
  });
});
