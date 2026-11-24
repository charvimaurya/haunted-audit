/**
 * TestDetailsForm
 *
 * The made-up details the tester types before a run (user-typed-test-details REQ-TD-01, 02).
 * - Three labelled fields, empty at the start. Labels stay visible; placeholders are only hints,
 *   and none of them looks like a real person.
 * - The app never fills a value in.
 * - Amount follows the bank's own rule (two decimals, more than 0.00, at most the EUR 1000.00 test
 *   balance), said in its hint, so a run never starts with an amount the bank will refuse.
 * - An error sits under its field as an icon plus text, tied with aria-describedby and aria-invalid,
 *   and announced with role="alert".
 */
import { XCircle } from 'lucide-react';
import type { RefObject } from 'react';
import type { TestDetails } from '../types';

export type DetailField = keyof TestDetails;
export type DetailErrors = Partial<Record<DetailField, string>>;

export const DETAIL_MAX = 40;
/** Same rule as the API (clean_detail): no control or format characters, no line or paragraph separators. */
const CONTROL = /[\p{C}\u2028\u2029]/u;

/** The bank's rule (fixtures/haunted_bank/index.html, toCents) and its starting balance in cents. */
const AMOUNT_PATTERN = /^(0|[1-9][0-9]*)\.[0-9]{2}$/;
const BALANCE_CENTS = 100000;
export const AMOUNT_HINT = 'Use two decimals, like 10.00';

const REQUIRED_MESSAGE: Record<'recipient' | 'amount', string> = {
  recipient: 'Type a made-up name to continue',
  amount: 'Type a made-up amount to continue',
};

/** Problems in field order (Recipient, Amount, Reference). Empty when the run may start. */
export function detailsProblems(d: TestDetails): DetailErrors {
  const errors: DetailErrors = {};
  for (const field of ['recipient', 'amount', 'reference'] as DetailField[]) {
    const raw = d[field];
    const v = raw.trim();
    if (CONTROL.test(raw)) errors[field] = 'Remove special characters such as tabs or line breaks';
    else if (v.length > DETAIL_MAX) errors[field] = `Use ${DETAIL_MAX} characters or fewer`;
    else if (!v && field !== 'reference') errors[field] = REQUIRED_MESSAGE[field];
    else if (field === 'amount') {
      const cents = AMOUNT_PATTERN.test(v) ? Number(v.replace('.', '')) : null;
      if (cents === null) errors.amount = AMOUNT_HINT;
      else if (cents <= 0) errors.amount = `Use more than 0.00. ${AMOUNT_HINT}`;
      else if (cents > BALANCE_CENTS) errors.amount = 'Use 1000.00 or less (the test balance)';
    }
  }
  return errors;
}

const FIELDS: { field: DetailField; label: string; placeholder: string; inputMode?: 'decimal'; hint?: string }[] = [
  { field: 'recipient', label: 'Recipient', placeholder: 'Test recipient name' },
  { field: 'amount', label: 'Amount (EUR)', placeholder: 'e.g. 10.00', inputMode: 'decimal', hint: `${AMOUNT_HINT}, up to 1000.00.` },
  { field: 'reference', label: 'Reference (optional)', placeholder: 'Optional, e.g. Test payment' },
];

const INPUT =
  'min-h-11 w-full bg-base border border-base-line text-ink text-base font-ui rounded-lg px-3 ' +
  'placeholder:text-ink-muted disabled:opacity-50 disabled:cursor-not-allowed';

interface TestDetailsFormProps {
  details: TestDetails;
  onChange: (d: TestDetails) => void;
  errors: DetailErrors;
  disabled?: boolean;
  /** One ref per field, so the caller can move focus to the first field with a problem. */
  fieldRefs: Record<DetailField, RefObject<HTMLInputElement | null>>;
}

export function TestDetailsForm({ details, onChange, errors, disabled = false, fieldRefs }: TestDetailsFormProps) {
  return (
    <fieldset className="m-0 flex w-full flex-col gap-2 border-0 p-0" aria-describedby="test-details-hint">
      <legend className="p-0 text-base font-ui font-semibold text-ink">Test details</legend>
      <p id="test-details-hint" className="m-0 text-base font-ui text-ink-muted">
        Use made-up details. This is a test bank.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {FIELDS.map(({ field, label, placeholder, inputMode, hint }) => {
          const id = `td-${field}`;
          const errorId = `${id}-error`;
          const hintId = `${id}-hint`;
          const error = errors[field];
          const describedBy = [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;
          return (
            <div key={field} className="flex flex-col gap-1">
              <label htmlFor={id} className="text-base font-ui text-ink">
                {label}
              </label>
              <input
                id={id}
                ref={fieldRefs[field]}
                type="text"
                inputMode={inputMode}
                autoComplete="off"
                spellCheck={false}
                maxLength={DETAIL_MAX}
                required={field !== 'reference'}
                placeholder={placeholder}
                value={details[field]}
                onChange={(e) => onChange({ ...details, [field]: e.target.value })}
                disabled={disabled}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                className={INPUT}
              />
              {hint && (
                <p id={hintId} className="m-0 text-base font-ui text-ink-muted">
                  {hint}
                </p>
              )}
              {error && (
                <p id={errorId} role="alert" className="m-0 flex items-center gap-1.5 text-base font-ui text-ghost-blocked">
                  <XCircle size={16} aria-hidden="true" className="shrink-0" />
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
