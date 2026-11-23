import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { VoiceCommandsCard } from '../components/VoiceCommandsCard';
import { AgentToggle } from '../components/AgentToggle';

const speech = { supported: true, listening: false, heard: '', error: null, start: () => {}, stop: () => {} };
const idle = { phase: 'idle' as const, steps: [], result: null, message: null };

expect.extend(toHaveNoViolations);

describe('Possession Mode voice agent (voice-agent TASK-09)', () => {
  it('voice card has no axe violations and offers Push to talk and Edit commands', async () => {
    const { container } = render(
      <VoiceCommandsCard commandText={'type 50.00 in Amount\nclick Send Payment'} onCommandTextChange={() => {}} source="typed" run={idle} speech={speech} />,
    );
    expect(screen.getByRole('button', { name: 'Push to talk' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit commands' })).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });
  it('agent toggle has no axe violations', async () => {
    const { container } = render(<AgentToggle value="voice" onChange={() => {}} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
