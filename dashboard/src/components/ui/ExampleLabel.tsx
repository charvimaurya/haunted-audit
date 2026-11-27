/**
 * ExampleLabel: wraps any sample value that is still on screen (no-mock-results REQ-NM-01).
 * Icon plus text, never colour alone. Content inside must not show a pass, fail, Verified or caught state.
 * The guard test (src/test/no-mock-results.test.tsx) allows sample wording only inside [data-example].
 */
import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

export const EXAMPLE_TEXT = 'Example only, not a real run';

interface ExampleLabelProps {
  children: ReactNode;
}

export function ExampleLabel({ children }: ExampleLabelProps) {
  return (
    <div data-example className="flex flex-col gap-2 rounded-lg border border-dashed border-base-line p-3">
      <p className="m-0 flex items-center gap-2 text-base font-ui font-semibold text-ink">
        <Info size={16} aria-hidden="true" />
        {EXAMPLE_TEXT}
      </p>
      {children}
    </div>
  );
}
