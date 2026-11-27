import { Check, X } from 'lucide-react';

export function V9Dot({
  state,
  size = 24,
}: {
  state: 'ok' | 'bad' | 'wait';
  size?: number;
}) {
  const iconSize = Math.round(size * 0.56);
  return (
    <span
      className={`v9-dot ${state}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {state === 'ok' ? (
        <Check size={iconSize} strokeWidth={3.5} />
      ) : state === 'bad' ? (
        <X size={iconSize} strokeWidth={3.5} />
      ) : null}
    </span>
  );
}
