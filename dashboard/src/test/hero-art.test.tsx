import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { HeroSection } from '../components/HeroSection';
import { ImmersionProvider } from '../immersion/ImmersionContext';

expect.extend(toHaveNoViolations);

describe('Home hero artwork', () => {
  it('is decorative, has no axe violations and offers no pause button', async () => {
    const { container, queryByRole } = render(
      <ImmersionProvider>
        <MemoryRouter>
          <HeroSection />
        </MemoryRouter>
      </ImmersionProvider>,
    );
    expect(container.querySelector('.hero-art')?.getAttribute('aria-hidden')).toBe('true');
    expect(queryByRole('button', { name: /animation/i })).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });
});
