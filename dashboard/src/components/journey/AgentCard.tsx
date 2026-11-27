import { Card, CardBody, CardFooter, CardHeader } from '@heroui/react';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { V9Dot } from '../ghost/V9Dot';

export interface AgentOutcome {
  label: string;
  passed: boolean;
  detail?: string;
}

interface AgentCardProps {
  name: string;
  icon: ReactNode;
  outcomes: AgentOutcome[];
  isRunning?: boolean;
  ariaLabel?: string;
  footer?: ReactNode;
}

export function AgentCard({ name, icon, outcomes, isRunning = false, ariaLabel, footer }: AgentCardProps) {
  return (
    <Card className="v9-card flex h-full flex-col text-white shadow-none" aria-label={ariaLabel ?? `${name} results`}>
      <CardHeader className="flex items-center gap-3 px-4 pt-4 pb-2">
        <span className="v9-neon shrink-0" aria-hidden="true">
          {icon}
        </span>
        <h3 className="m-0 text-base sm:text-lg font-extrabold text-white">{name}</h3>
        {isRunning && (
          <Loader2
            size={15}
            className="ml-auto animate-spin text-violet-300"
            aria-label="running"
          />
        )}
      </CardHeader>

      <CardBody className="flex-1 px-4 py-2">
        {outcomes.length === 0 ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            <li className="flex items-center gap-3 text-sm sm:text-[15px] text-ink-muted">
              <V9Dot state="wait" size={22} />
              <span>
                <span aria-hidden="true">-- </span>
                not yet measured
              </span>
            </li>
          </ul>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0" aria-label={`${name} outcome list`}>
            {outcomes.map((o, i) => (
              <li key={i} className="flex items-start gap-3 text-sm sm:text-[15px]">
                <V9Dot state={o.passed ? 'ok' : 'bad'} size={22} />
                <span className={o.passed ? 'text-ink' : 'text-[#ff7a7a]'}>
                  <span className="sr-only">{o.passed ? 'Passed: ' : 'Failed: '}</span>
                  {o.label}
                  {o.detail && (
                    <span className="mt-0.5 block font-mono text-xs sm:text-sm text-[#ff6b6b]">{o.detail}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>

      {footer && (
        <CardFooter className="px-4 pt-1 pb-3.5 text-xs text-ink-muted">{footer}</CardFooter>
      )}
    </Card>
  );
}
