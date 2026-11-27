import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { afterEach, describe, expect, it } from 'vitest';
import { HeroSection } from '../components/hero/HeroSection';
import { CALM_STORAGE_KEY } from '../immersion/motion';
import { ImmersionProvider } from '../immersion/ImmersionContext';

expect.extend(toHaveNoViolations);

function stubReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? matches : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe('Home hero artwork', () => {
  afterEach(() => {
    stubReducedMotion(false);
    localStorage.clear();
  });

  it('is decorative, has no axe violations and offers a pause-animation button', async () => {
    const { container, getByRole } = render(
      <ImmersionProvider>
        <MemoryRouter>
          <HeroSection />
        </MemoryRouter>
      </ImmersionProvider>,
    );
    expect(container.querySelector('.hero-art')?.getAttribute('aria-hidden')).toBe('true');
    const pauseButton = getByRole('button', { name: /pause animation/i });
    expect(pauseButton).toBeInTheDocument();
    expect(pauseButton).toHaveAttribute('aria-pressed', 'false');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('freezes the hero locally on click, reads "Play animation" back, and never touches Calm mode', () => {
    const { getByRole, container } = render(
      <ImmersionProvider>
        <MemoryRouter>
          <HeroSection />
        </MemoryRouter>
      </ImmersionProvider>,
    );
    const pauseButton = getByRole('button', { name: /pause animation/i });
    fireEvent.click(pauseButton);

    const playButton = getByRole('button', { name: /play animation/i });
    expect(playButton).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('section.hero-paused')).toBeTruthy();
    // Local pause only: the global Calm flag and its storage are untouched.
    expect(document.documentElement.dataset.calm).toBe('false');
    expect(localStorage.getItem(CALM_STORAGE_KEY)).toBeNull();

    fireEvent.click(playButton);
    expect(getByRole('button', { name: /pause animation/i })).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelector('section.hero-paused')).toBeFalsy();
  });

  it('supports keyboard activation (Enter and Space)', () => {
    const { getByRole } = render(
      <ImmersionProvider>
        <MemoryRouter>
          <HeroSection />
        </MemoryRouter>
      </ImmersionProvider>,
    );
    const pauseButton = getByRole('button', { name: /pause animation/i });
    pauseButton.focus();
    expect(document.activeElement).toBe(pauseButton);
    fireEvent.click(pauseButton); // jsdom: Enter/Space on a focused native <button> dispatch a click
    expect(getByRole('button', { name: /play animation/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('hides the local pause control when the system already prefers reduced motion', () => {
    stubReducedMotion(true);
    const { queryByRole } = render(
      <ImmersionProvider>
        <MemoryRouter>
          <HeroSection />
        </MemoryRouter>
      </ImmersionProvider>,
    );
    expect(queryByRole('button', { name: /animation/i })).toBeNull();
  });

  it('hides the local pause control when Calm mode is already on', () => {
    localStorage.setItem(CALM_STORAGE_KEY, 'on');
    const { queryByRole } = render(
      <ImmersionProvider>
        <MemoryRouter>
          <HeroSection />
        </MemoryRouter>
      </ImmersionProvider>,
    );
    expect(queryByRole('button', { name: /animation/i })).toBeNull();
  });
});
