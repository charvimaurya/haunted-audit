/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { RunNotice } from '../components/journey/RunNotice';

expect.extend(toHaveNoViolations);

describe('RunNotice', () => {
  it('shows the API message for a rate limit as an alert', async () => {
    const { container } = render(
      <RunNotice kind="limit" message="Too many runs from your address. Try again in 42 seconds." />,
    );
    expect(screen.getByRole('alert').textContent).toContain('Try again in 42 seconds');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says LLM mode is paused', async () => {
    const { container } = render(
      <RunNotice kind="paused" message="LLM mode is paused on this public demo. Scripted mode still works." />,
    );
    expect(screen.getByText('LLM mode paused')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('labels a recorded run as not live, as a status', async () => {
    const { container } = render(<RunNotice kind="recorded" message="Recorded 2026-11-15." />);
    expect(screen.getByRole('status').textContent).toContain('Recorded run, not live');
    expect(await axe(container)).toHaveNoViolations();
  });
});
