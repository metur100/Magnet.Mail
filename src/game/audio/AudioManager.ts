import { clamp } from '../utils/MathUtils';

/**
 * All sound is synthesised with the Web Audio API – no audio files.
 *
 * - magnetic hum: two oscillators (attract = low, warm; repel = higher, buzzier) whose volume follows
 *   the live field strength of each control
 * - one-shots: attraction / repulsion pulses, collisions, warnings, mailbox, delivery, failure, buttons
 * - music: a light, bouncy generative loop scheduled with a look-ahead timer
 *
 * The context is created on the first user gesture and every call is a no-op while audio is
 * unavailable or disabled, so the game never depends on sound.
 */

type AudioCtor = typeof AudioContext;

const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const SCALE = [0, 2, 4, 7, 9, 12];
const BASS = [48, 53, 55, 50];

class AudioManagerImpl {
  soundEnabled = true;
  musicEnabled = true;
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private musicBus!: GainNode;
  private noise!: AudioBuffer;
  private humAttract: { osc: OscillatorNode; gain: GainNode } | null = null;
  private humRepel: { osc: OscillatorNode; gain: GainNode } | null = null;
  private musicTimer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private lastImpact = 0;
  private failed = false;

  unlock(): void {
    if (this.failed) return;
    try {
      if (!this.ctx) this.create();
      if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
      this.syncMusic();
    } catch {
      this.failed = true;
      this.ctx = null;
    }
  }

  private create(): void {
    const Ctor: AudioCtor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) {
      this.failed = true;
      return;
    }
    const ctx = new Ctor();
    this.ctx = ctx;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.ratio.value = 4;
    compressor.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(compressor);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = this.soundEnabled ? 0.8 : 0;
    this.sfx.connect(this.master);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0;
    this.musicBus.connect(this.master);
    const length = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }

  setSound(on: boolean): void {
    this.soundEnabled = on;
    if (this.ctx) this.sfx.gain.setTargetAtTime(on ? 0.8 : 0, this.ctx.currentTime, 0.05);
  }

  setMusic(on: boolean): void {
    this.musicEnabled = on;
    this.syncMusic();
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  // ------------------------------------------------------------------ magnetic hum

  private makeHum(type: OscillatorType, freq: number, cutoff: number): { osc: OscillatorNode; gain: GainNode } {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    // Gentle tremolo makes the hum feel "electric".
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 7;
    lfoGain.gain.value = 0.25 * freq * 0.02;
    lfo.connect(lfoGain).connect(osc.frequency);
    osc.connect(filter).connect(gain).connect(this.sfx);
    osc.start();
    lfo.start();
    return { osc, gain };
  }

  /** Field levels 0..~1.4 of both controls – called every frame during play. */
  setHum(attract: number, repel: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (!this.humAttract) this.humAttract = this.makeHum('triangle', 110, 700);
    if (!this.humRepel) this.humRepel = this.makeHum('sawtooth', 164, 1100);
    const t = ctx.currentTime;
    this.humAttract.gain.gain.setTargetAtTime(this.soundEnabled ? clamp(attract, 0, 1.4) * 0.16 : 0, t, 0.04);
    this.humRepel.gain.gain.setTargetAtTime(this.soundEnabled ? clamp(repel, 0, 1.4) * 0.09 : 0, t, 0.04);
    this.humAttract.osc.frequency.setTargetAtTime(110 + attract * 30, t, 0.1);
    this.humRepel.osc.frequency.setTargetAtTime(164 + repel * 40, t, 0.1);
  }

  silenceHum(): void {
    this.setHum(0, 0);
  }

  // ------------------------------------------------------------------ one-shots

  private tone(freq: number, start: number, duration: number, type: OscillatorType, volume: number, glideTo?: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.soundEnabled) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(this.sfx);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  private noiseBurst(start: number, duration: number, freq: number, q: number, volume: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.soundEnabled) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(filter).connect(gain).connect(this.sfx);
    src.start(start, Math.random() * 0.5);
    src.stop(start + duration + 0.05);
  }

  private now(): number | null {
    return this.ctx ? this.ctx.currentTime : null;
  }

  button(): void {
    const t = this.now();
    if (t !== null) this.tone(620, t, 0.08, 'sine', 0.2, 880);
  }

  toggle(on: boolean): void {
    const t = this.now();
    if (t !== null) this.tone(on ? 520 : 700, t, 0.08, 'triangle', 0.18, on ? 780 : 460);
  }

  attractPulse(): void {
    const t = this.now();
    if (t === null) return;
    this.tone(330, t, 0.22, 'sine', 0.22, 220);
    this.tone(660, t, 0.12, 'triangle', 0.08, 440);
  }

  repelPulse(): void {
    const t = this.now();
    if (t === null) return;
    this.tone(260, t, 0.2, 'square', 0.07, 520);
    this.noiseBurst(t, 0.15, 2400, 2, 0.12);
  }

  /** Collision thud; louder for harder impacts (0..1). */
  impact(strength: number): void {
    const t = this.now();
    if (t === null || t - this.lastImpact < 0.06) return;
    this.lastImpact = t;
    const s = clamp(strength, 0, 1);
    this.tone(140 + s * 60, t, 0.12, 'sine', 0.1 + s * 0.25, 70);
    this.noiseBurst(t, 0.08, 900, 1, 0.05 + s * 0.15);
  }

  boing(): void {
    const t = this.now();
    if (t !== null) this.tone(300, t, 0.25, 'sine', 0.2, 700);
  }

  warning(): void {
    const t = this.now();
    if (t === null) return;
    this.tone(880, t, 0.1, 'square', 0.08);
    this.tone(660, t + 0.13, 0.12, 'square', 0.08);
  }

  teleport(): void {
    const t = this.now();
    if (t !== null) this.tone(300, t, 0.35, 'sine', 0.18, 1400);
  }

  mailboxOpen(): void {
    const t = this.now();
    if (t === null) return;
    this.tone(523, t, 0.1, 'triangle', 0.15);
    this.tone(659, t + 0.07, 0.12, 'triangle', 0.15);
  }

  delivered(threeStars: boolean): void {
    const t = this.now();
    if (t === null) return;
    const notes = threeStars ? [72, 76, 79, 84, 88, 91] : [72, 76, 79, 84];
    notes.forEach((m, i) => {
      this.tone(midiToHz(m), t + i * 0.08, 0.6, 'triangle', 0.2);
      this.tone(midiToHz(m + 12), t + i * 0.08 + 0.02, 0.4, 'sine', 0.06);
    });
    this.noiseBurst(t + notes.length * 0.08, 0.5, 6000, 0.7, 0.06);
  }

  starPop(index: number): void {
    const t = this.now();
    if (t === null) return;
    const m = [76, 79, 84][clamp(index, 0, 2)];
    this.tone(midiToHz(m), t, 0.25, 'triangle', 0.2);
  }

  failure(): void {
    const t = this.now();
    if (t === null) return;
    this.tone(midiToHz(62), t, 0.3, 'triangle', 0.2, midiToHz(60));
    this.tone(midiToHz(57), t + 0.25, 0.5, 'triangle', 0.2, midiToHz(50));
    this.noiseBurst(t, 0.25, 500, 0.8, 0.12);
  }

  // ------------------------------------------------------------------ music

  private syncMusic(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.musicBus.gain.setTargetAtTime(this.musicEnabled ? 0.28 : 0, ctx.currentTime, 0.5);
    if (this.musicEnabled && this.musicTimer === null) {
      this.nextNoteTime = ctx.currentTime + 0.2;
      this.musicTimer = window.setInterval(() => this.scheduleMusic(), 120);
    } else if (!this.musicEnabled && this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private scheduleMusic(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const beat = 0.3;
    while (this.nextNoteTime < ctx.currentTime + 0.4) {
      const t = this.nextNoteTime;
      const bar = Math.floor(this.step / 8) % BASS.length;
      if (this.step % 4 === 0) this.musicNote(midiToHz(BASS[bar]), t, beat * 1.8, 'triangle', 0.12);
      if (this.step % 8 === 6) this.musicNote(midiToHz(BASS[bar] + 7), t, beat, 'triangle', 0.08);
      const pattern = (this.step * 5 + bar * 3) % 7;
      if (pattern < 3) {
        const degree = SCALE[(this.step * 3 + bar * 2) % SCALE.length];
        this.musicNote(midiToHz(72 + degree), t, beat * 1.4, 'sine', 0.07);
      }
      this.nextNoteTime += beat;
      this.step++;
    }
  }

  private musicNote(freq: number, start: number, duration: number, type: OscillatorType, volume: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(this.musicBus);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }
}

export const AudioManager = new AudioManagerImpl();
