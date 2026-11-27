import { Input } from '@heroui/react';
import { XCircle } from 'lucide-react';
import type { RefObject } from 'react';
import type { TestDetails } from '../../types';

export type DetailField = keyof TestDetails;
export type DetailErrors = Partial<Record<DetailField, string>>;

export const DETAIL_MAX = 60;
const AMOUNT_HINT = 'Whole euros or cents, like 90 or 90.55';
const BALANCE_CENTS = 100000;
const CONTROL = /[\x00-\x1f\x7f]/;

export function formatAmount(raw: string): string | null {
  const s = raw.trim().replace(/^€\s*/, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(s)) return null;
  const [euros, cents = ''] = s.split('.');
  return `${euros.replace(/^0+(?=\d)/, '') || '0'}.${cents.padEnd(2, '0')}`;
}

const REQUIRED_MESSAGE: Record<'recipient' | 'amount', string> = {
  recipient: 'Type a made-up name to continue',
  amount: 'Type a made-up amount to continue',
};

export function detailsProblems(d: TestDetails): DetailErrors {
  const errors: DetailErrors = {};
  for (const field of ['recipient', 'amount', 'reference'] as DetailField[]) {
    const raw = d[field];
    const v = raw.trim();
    if (CONTROL.test(raw)) errors[field] = 'Remove special characters such as tabs or line breaks';
    else if (v.length > DETAIL_MAX) errors[field] = `Use ${DETAIL_MAX} characters or fewer`;
    else if (!v && field !== 'reference') errors[field] = REQUIRED_MESSAGE[field];
    else if (field === 'amount') {
      const normalized = formatAmount(v);
      const cents = normalized ? Number(normalized.replace('.', '')) : null;
      if (cents === null) errors.amount = AMOUNT_HINT;
      else if (cents <= 0) errors.amount = `Use more than 0.00. ${AMOUNT_HINT}`;
      else if (cents > BALANCE_CENTS) errors.amount = 'Use 1000.00 or less (the test balance)';
    }
  }
  return errors;
}

const FIELDS: { field: DetailField; label: string; placeholder: string; inputMode?: 'decimal'; hint?: string }[] = [
  { field: 'recipient', label: 'Recipient', placeholder: 'Test recipient name' },
  { field: 'amount', label: 'Amount (EUR)', placeholder: 'e.g. 90 or 90.55', inputMode: 'decimal', hint: `${AMOUNT_HINT}, up to 1000.00.` },
  { field: 'reference', label: 'Reference (optional)', placeholder: 'Optional test ref' },
];

interface TestDetailsFormProps {
  details: TestDetails;
  onChange: (d: TestDetails) => void;
  errors: DetailErrors;
  disabled?: boolean;
  fieldRefs: Record<DetailField, RefObject<HTMLInputElement | null>>;
}

export function TestDetailsForm({ details, onChange, errors, disabled = false, fieldRefs }: TestDetailsFormProps) {
  return (
    <fieldset className="m-0 flex w-full flex-col gap-1 border-0 p-0" aria-describedby="test-details-hint">
      <legend className="sr-only">Test details</legend>
      <p id="test-details-hint" className="sr-only">
        Use made-up details. This is a test bank.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {FIELDS.map(({ field, label, placeholder, inputMode, hint }) => {
          const id = `td-${field}`;
          const errorId = `${id}-error`;
          const hintId = `${id}-hint`;
          const error = errors[field];
          const describedBy = [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;
          return (
            <div key={field} className="flex flex-col gap-1">
              <label htmlFor={id} className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                {label}
              </label>
              <Input
                id={id}
                ref={fieldRefs[field]}
                size="sm"
                type="text"
                inputMode={inputMode}
                autoComplete="off"
                spellCheck={false}
                maxLength={DETAIL_MAX}
                isRequired={field !== 'reference'}
                placeholder={placeholder}
                value={details[field]}
                onValueChange={(val) => onChange({ ...details, [field]: val })}
                isDisabled={disabled}
                isInvalid={Boolean(error)}
                aria-describedby={describedBy}
                classNames={{
                  inputWrapper: 'h-9 min-h-9 rounded-lg border border-[#2f3760] bg-[#121731] shadow-none data-[hover=true]:bg-[#161c3d]',
                  input: 'text-sm text-white placeholder:text-ink-muted',
                }}
              />
              {hint && (
                <p id={hintId} className="sr-only">
                  {hint}
                </p>
              )}
              {error && (
                <p id={errorId} role="alert" className="m-0 flex items-center gap-1.5 text-xs font-ui text-ghost-blocked">
                  <XCircle size={13} aria-hidden="true" className="shrink-0" />
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
