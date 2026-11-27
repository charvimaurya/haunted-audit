/**
 * Procedural underground Halloween ambient audio via Web Audio API.
 * Never autoplays without user interaction or when Sound is off.
 */

class HalloweenAudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private chimeTimer: number | null = null;
  private running = false;

  start(): void {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.0001;
      this.master.connect(this.ctx.destination);
      this.buildBed();
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }

    if (this.master && this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0.14, now, 0.8);
    }

    if (!this.running) {
      this.running = true;
      this.scheduleChime();
    }
  }

  stop(): void {
    this.running = false;
    if (this.chimeTimer !== null) {
      window.clearTimeout(this.chimeTimer);
      this.chimeTimer = null;
    }
    if (this.master && this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0.0001, now, 0.35);
    }
  }

  private buildBed(): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;

    // Deep underground cavern drone (D2 + A2 minor-fifth shimmer)
    const freqs = [73.42, 110.0, 146.83];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      filter.type = 'lowpass';
      filter.frequency.value = idx === 0 ? 180 : 320;
      gain.gain.value = idx === 0 ? 0.28 : 0.08;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.master!);
      osc.start();
    });

    // Subtle filtered wind noise
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 340;
    windFilter.Q.value = 2.8;

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain);
    lfoGain.connect(windFilter.frequency);
    lfo.start();

    const windGain = ctx.createGain();
    windGain.gain.value = 0.05;
    noise.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.master);
    noise.start();
  }

  private scheduleChime(): void {
    if (!this.running) return;
    const delay = 3600 + Math.random() * 4400;
    this.chimeTimer = window.setTimeout(() => {
      this.playGhostChime();
      this.scheduleChime();
    }, delay);
  }

  private playGhostChime(): void {
    if (!this.ctx || !this.master || !this.running || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const notes = [440, 523.25, 587.33, 659.25, 783.99];
    const freq = notes[Math.floor(Math.random() * notes.length)];
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.985, now + 2.4);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.045, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 2.7);
  }

  /** Play a short spooky tactile chime/knock when a user clicks a button or link. */
  playSpookyClick(): void {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      if (!this.ctx) {
        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.0001;
        this.master.connect(this.ctx.destination);
        this.buildBed();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {});
      }

      const ctx = this.ctx;
      const now = ctx.currentTime;

      // Low hollow spectral knock
      const knockOsc = ctx.createOscillator();
      const knockGain = ctx.createGain();
      knockOsc.type = 'triangle';
      knockOsc.frequency.setValueAtTime(210, now);
      knockOsc.frequency.exponentialRampToValueAtTime(68, now + 0.09);
      knockGain.gain.setValueAtTime(0.0001, now);
      knockGain.gain.linearRampToValueAtTime(0.06, now + 0.008);
      knockGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      knockOsc.connect(knockGain);
      knockGain.connect(ctx.destination);
      knockOsc.start(now);
      knockOsc.stop(now + 0.11);

      // Eerie crystalline whisper overtone
      const chimeOsc = ctx.createOscillator();
      const chimeFilter = ctx.createBiquadFilter();
      const chimeGain = ctx.createGain();
      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(659.25, now + 0.01);
      chimeOsc.frequency.exponentialRampToValueAtTime(493.88, now + 0.16);
      chimeFilter.type = 'lowpass';
      chimeFilter.frequency.value = 1200;
      chimeGain.gain.setValueAtTime(0.0001, now);
      chimeGain.gain.linearRampToValueAtTime(0.032, now + 0.015);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
      chimeOsc.connect(chimeFilter);
      chimeFilter.connect(chimeGain);
      chimeGain.connect(ctx.destination);
      chimeOsc.start(now);
      chimeOsc.stop(now + 0.18);
    } catch {
      // Ignore Web Audio blocks when autoplay/audio context is unavailable
    }
  }
}

export const halloweenAudio = new HalloweenAudioEngine();
