import { Alert } from '@heroui/react';

export interface RunNoticeProps {
  kind: 'limit' | 'paused' | 'offline' | 'recorded';
  message: string;
}

const LABELS: Record<RunNoticeProps['kind'], string> = {
  limit: 'Slow down',
  paused: 'LLM mode paused',
  offline: 'Backend not reachable',
  recorded: 'Recorded run, not live',
};

export function RunNotice({ kind, message }: RunNoticeProps) {
  const color = kind === 'recorded' ? 'secondary' : kind === 'limit' ? 'warning' : 'danger';
  return (
    <div className="my-3">
      <Alert color={color} variant="faded" title={LABELS[kind]} description={message} />
    </div>
  );
}
