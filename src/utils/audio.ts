/**
 * Web Audio API synthesizer for Rocket Crash sound effects
 * Zero external audio assets required; reliable & instantaneous in all browsers
 */

class SoundSystem {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.engineGain) {
      this.engineGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public startEngine() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      this.stopEngine();

      const now = this.ctx.currentTime;
      // Main thruster tone
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(65, now);

      // Low sub rumble
      this.engineSubOsc = this.ctx.createOscillator();
      this.engineSubOsc.type = 'triangle';
      this.engineSubOsc.frequency.setValueAtTime(35, now);

      // Low-pass filter for roar
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, now);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.01, now);
      this.engineGain.gain.linearRampToValueAtTime(0.12, now + 0.5);

      this.engineOsc.connect(filter);
      this.engineSubOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start(now);
      this.engineSubOsc.start(now);
    } catch {
      // AudioContext might be blocked until user gesture
    }
  }

  public updateEnginePitch(multiplier: number) {
    if (this.isMuted || !this.ctx || !this.engineOsc || !this.engineGain) return;
    try {
      const now = this.ctx.currentTime;
      // Pitch goes from 65Hz up to ~380Hz smoothly based on multiplier
      const targetFreq = Math.min(65 + Math.log(multiplier) * 90, 420);
      this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.1);
      
      // Slight gain pulse as multiplier rises
      const intensity = Math.min(0.12 + (multiplier > 5 ? 0.05 : 0), 0.2);
      this.engineGain.gain.setTargetAtTime(intensity, now, 0.1);
    } catch {
      // Ignore audio update errors
    }
  }

  public stopEngine() {
    try {
      if (this.engineGain && this.ctx) {
        const now = this.ctx.currentTime;
        this.engineGain.gain.setTargetAtTime(0, now, 0.05);
      }
      setTimeout(() => {
        if (this.engineOsc) {
          try { this.engineOsc.stop(); } catch {}
          this.engineOsc.disconnect();
          this.engineOsc = null;
        }
        if (this.engineSubOsc) {
          try { this.engineSubOsc.stop(); } catch {}
          this.engineSubOsc.disconnect();
          this.engineSubOsc = null;
        }
      }, 80);
    } catch {
      // Ignore
    }
  }

  public playCountdownBeep(isGo: boolean = false) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isGo ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isGo ? 880 : 440, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.35 : 0.15));

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + (isGo ? 0.35 : 0.15));
    } catch {}
  }

  public playCashoutWin() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // Arpeggio notes: C5, E5, G5, C6
      const notes = [523.25, 659.25, 783.99, 1046.50];

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const noteOsc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();
        const startTime = now + idx * 0.07;

        noteOsc.type = 'sine';
        noteOsc.frequency.setValueAtTime(freq, startTime);

        noteGain.gain.setValueAtTime(0.18, startTime);
        noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        noteOsc.connect(noteGain);
        noteGain.connect(this.ctx.destination);

        noteOsc.start(startTime);
        noteOsc.stop(startTime + 0.35);
      });
    } catch {}
  }

  public playExplosion() {
    this.stopEngine();
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // 1. White noise buffer for blast burst
      const bufferSize = this.ctx.sampleRate * 0.8;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(700, now);
      filter.frequency.exponentialRampToValueAtTime(50, now + 0.7);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.45, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(now);

      // 2. Sub-bass boom
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(140, now);
      subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.6);

      subGain.gain.setValueAtTime(0.4, now);
      subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);

      subOsc.start(now);
      subOsc.stop(now + 0.6);
    } catch {}
  }

  public playClick() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch {}
  }

  public playAlarm() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.linearRampToValueAtTime(400, now + 0.15);
      osc.frequency.linearRampToValueAtTime(800, now + 0.3);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch {}
  }

  public playWarpSpeed() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.6);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.7);
    } catch {}
  }

  public playShieldActivate() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const freqs = [350, 700, 1050];
      freqs.forEach((f, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + idx * 0.05);
        gain.gain.setValueAtTime(0.12, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.4);
      });
    } catch {}
  }

  public playClaimReward() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [659.25, 880, 1174.66, 1760]; // E5, A5, D6, A6
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const st = now + idx * 0.06;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, st);
        gain.gain.setValueAtTime(0.2, st);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(st);
        osc.stop(st + 0.3);
      });
    } catch {}
  }
}

export const sounds = new SoundSystem();
