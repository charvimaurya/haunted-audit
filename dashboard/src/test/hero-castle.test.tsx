import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'jest-axe';
import { describe, it, expect } from 'vitest';
import { HeroSection } from '../components/hero/HeroSection';
import { ImmersionProvider } from '../immersion/ImmersionContext';

describe('hero castle', () => {
  it('is decorative and has no axe violations', async () => {
    const { container, getByTestId } = render(<ImmersionProvider><MemoryRouter><HeroSection /></MemoryRouter></ImmersionProvider>);
    const c = getByTestId('hero-castle');
    expect(c.getAttribute('aria-hidden')).toBe('true');
    expect(c.querySelector('a,button,[tabindex]')).toBeNull();
    expect((await axe(container)).violations).toEqual([]);
  });
});
