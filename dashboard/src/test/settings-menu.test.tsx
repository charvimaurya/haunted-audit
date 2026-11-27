import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);
import { ImmersionProvider } from '../immersion/ImmersionContext';
import { SettingsMenu } from '../components/layout/SettingsMenu';

describe('SettingsMenu', () => {
  it('opens by keyboard, shows the four settings, and Escape returns focus to the button', async () => {
    const user = userEvent.setup();
    const { container } = render(<ImmersionProvider><SettingsMenu /></ImmersionProvider>);
    const button = screen.getByRole('button', { name: 'Settings' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /Calm mode/ })).toBeNull();
    button.focus();
    await user.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    for (const name of [/Calm mode/, /High contrast/, /Text size/, /Sound/]) {
      expect(screen.getByRole('button', { name })).toBeVisible();
    }
    expect(await axe(container)).toHaveNoViolations();
    await user.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });
});
