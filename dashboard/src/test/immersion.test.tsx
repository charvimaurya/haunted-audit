/**
 * Motion rules: decoration stays under the UI, Calm mode and mute are real
 * controls, and a counter never moves toward a number that was not measured.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { GhostMascot } from '../components/GhostMascot';
import { MetricValueDisplay } from '../components/MetricValue';
import { AmbientLayer } from '../immersion/AmbientLayer';
import { ImmersionProvider } from '../immersion/ImmersionContext';
import { SenseControls } from '../immersion/SenseControls';
import {
  MIN_FLASH_CYCLE_MS,
  PARTICLE_MS,
  ROAM_MS,
  deviceQuality,
  nextQuality,
  shouldAnimateCounter,
} from '../immersion/motion';

function Harness() {
  return (
    <ImmersionProvider>
      <AmbientLayer />
      <SenseControls />
      <GhostMascot state="blocked" />
    </ImmersionProvider>
  );
}

describe('motion rules', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.calm;
    delete document.documentElement.dataset.quality;
  });

  it('keeps ambient cycles slower than three flashes a second', () => {
    expect(ROAM_MS).toBeGreaterThan(MIN_FLASH_CYCLE_MS);
    expect(PARTICLE_MS).toBeGreaterThan(MIN_FLASH_CYCLE_MS);
  });

  it('downgrades only after fps stays under 40 for 2 seconds', () => {
    expect(nextQuality('full', 55, 3000)).toBe('full');
    expect(nextQuality('full', 30, 1999)).toBe('full');
    expect(nextQuality('full', 30, 2000)).toBe('reduced');
    expect(nextQuality('reduced', 20, 2000)).toBe('static');
  });

  it('skips 3D and particles on mobile, low-power, and reduced motion', () => {
    expect(deviceQuality({ reducedMotion: true, mobile: false, lowPower: false })).toBe('static');
    expect(deviceQuality({ reducedMotion: false, mobile: true, lowPower: false })).toBe('reduced');
    expect(deviceQuality({ reducedMotion: false, mobile: false, lowPower: true })).toBe('reduced');
    expect(deviceQuality({ reducedMotion: false, mobile: false, lowPower: false })).toBe('full');
  });

  it('animates a counter only toward a real number when motion is allowed', () => {
    expect(shouldAnimateCounter(null, true)).toBe(false);
    expect(shouldAnimateCounter(undefined, true)).toBe(false);
    expect(shouldAnimateCounter(Number.NaN, true)).toBe(false);
    expect(shouldAnimateCounter(4, false)).toBe(false);
    expect(shouldAnimateCounter(4, true)).toBe(true);
  });

  it('paints an unmeasured metric as --', () => {
    render(
      <MetricValueDisplay value={null} label="Barriers detected" agentMode="scripted" />,
    );
    expect(screen.getByLabelText('not yet measured')).toHaveTextContent('--');
  });

  it('keeps the roaming ghost decorative and separate from the semantic ghost', async () => {
    render(<Harness />);

    const layer = screen.getByTestId('ambient-layer');
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(layer.className).toContain('ambient-layer');
    expect(layer.querySelector('[data-semantic-ghost]')).toBeNull();
    expect(layer.querySelector('button, a, input, audio')).toBeNull();
    expect(document.querySelector('audio')).toBeNull();

    const semantic = screen.getByTestId('ghost-mascot');
    expect(semantic).toHaveAttribute('data-semantic-ghost', 'true');
    expect(layer.contains(semantic)).toBe(false);

    if (layer.getAttribute('data-quality') !== 'static') {
      const roam = await screen.findByTestId('ambient-ghost');
      expect(layer.contains(roam)).toBe(true);
      expect(roam).not.toHaveAttribute('data-semantic-ghost');
      expect(Number.parseFloat(roam.style.animationDuration)).toBeGreaterThan(MIN_FLASH_CYCLE_MS);
    }
  });

  it('turns Calm mode on from the keyboard control and remembers it', async () => {
    render(<Harness />);
    const calm = screen.getByRole('button', { name: 'Calm mode off' });
    expect(calm).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(calm);
    expect(screen.getByRole('button', { name: 'Calm mode on' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.calm).toBe('true');
    expect(localStorage.getItem('haunted-audit.calm')).toBe('on');
    await waitFor(() =>
      expect(screen.getByTestId('ambient-layer')).toHaveAttribute('data-ambient', 'off'),
    );
    expect(screen.queryByTestId('ambient-ghost')).not.toBeInTheDocument();
    expect(screen.getByTestId('ghost-mascot')).toBeInTheDocument();
  });

  it('leaves sound off and never mounts an audio element', () => {
    render(<Harness />);
    const sound = screen.getByRole('button', { name: 'Sound off' });
    expect(sound).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(sound);
    expect(screen.getByRole('button', { name: 'Sound on' })).toBeInTheDocument();
    expect(localStorage.getItem('haunted-audit.sound')).toBe('on');
    expect(document.querySelector('audio')).toBeNull();
    expect(document.body.innerHTML.toLowerCase()).not.toContain('autoplay');
  });
});
