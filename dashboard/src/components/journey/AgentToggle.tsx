/**
 * AgentToggle: choose the keyboard agent or the voice agent for a run (Possession Mode).
 * A radio group, so it works with arrow keys and Tab. Icon plus text on both options.
 */
import { Keyboard, Mic } from 'lucide-react';

export type AgentKind = 'keyboard' | 'voice';

interface AgentToggleProps {
  value: AgentKind;
  onChange: (value: AgentKind) => void;
  disabled?: boolean;
}

const OPTIONS: { id: AgentKind; label: string; Icon: typeof Mic }[] = [
  { id: 'keyboard', label: 'Keyboard', Icon: Keyboard },
  { id: 'voice', label: 'Voice', Icon: Mic },
];

export function AgentToggle({ value, onChange, disabled }: AgentToggleProps) {
  return (
    <fieldset className="m-0 flex flex-col gap-0.5 border-0 p-0" disabled={disabled}>
      <legend className="mb-0.5 p-0 text-base font-ui uppercase tracking-wider text-ink-faint">
        Agent
      </legend>
      <div className="inline-flex rounded-lg border border-violet-neon/60 p-0.5">
        {OPTIONS.map(({ id, label, Icon }) => (
          <label
            key={id}
            className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-4 text-base font-ui
                        has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-violet-neon
                        ${value === id ? 'bg-violet-600 text-white' : 'text-ink-muted hover:text-ink'}`}
          >
            <input
              type="radio"
              name="agent-kind"
              value={id}
              checked={value === id}
              onChange={() => onChange(id)}
              className="sr-only"
            />
            <Icon size={16} aria-hidden="true" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
