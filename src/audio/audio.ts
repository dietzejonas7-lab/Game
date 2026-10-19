// ===========================================================================
// Sound-System.
// Alle Squish-Geräusche werden in Echtzeit erzeugt (WebAudio), passend zur
// Physik: je schneller man drückt, desto lauter. Schaumstoff knistert beim
// langsamen Aufgehen, Jelly schmatzt, Gel quietscht.
//
// Wer echte Aufnahmen hat, kann sie in content.json bei "sound.samples"
// eintragen – dann werden diese zusätzlich abgespielt.
// ===========================================================================
import type { MaterialId, RarityId, SoundParams } from '../content/types';
import { clamp } from '../util';

interface MaterialSound {
  filterType: BiquadFilterType;
  freqLow: number;
  freqHigh: number;
  q: number;
  gain: number;
  crackle: number;
  recoverCrackle: number;
  bubbles: number;
  squeak: number;
  thud: number;
}

const MAT: Record<MaterialId, MaterialSound> = {
  foam: { filterType: 'bandpass', freqLow: 1800, freqHigh: 4200, q: 0.7, gain: 0.35, crackle: 90, recoverCrackle: 40, bubbles: 0, squeak: 0, thud: 0.5 },
  mochi: { filterType: 'lowpass', freqLow: 500, freqHigh: 1400, q: 1.2, gain: 0.55, crackle: 12, recoverCrackle: 4, bubbles: 6, squeak: 0, thud: 0.4 },
  jelly: { filterType: 'bandpass', freqLow: 350, freqHigh: 1200, q: 3.5, gain: 0.6, crackle: 0, recoverCrackle: 0, bubbles: 40, squeak: 0, thud: 0.7 },
  gel: { filterType: 'bandpass', freqLow: 600, freqHigh: 1600, q: 2, gain: 0.35, crackle: 5, recoverCrackle: 0, bubbles: 4, squeak: 0.5, thud: 0.9 },
};

export interface SquishSignal {
  deform: number;
  deformRate: number;
  recoverRate: number;
  stretchRate: number;
  grabbed: boolean;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private noise!: AudioBuffer;
  private contFilter!: BiquadFilterNode;
  private contGain!: GainNode;
  private squeakOsc!: OscillatorNode;
  private squeakGain!: GainNode;
  private material: MaterialId = 'foam';
  private snd: SoundParams = { pitch: 1, volume: 1 };
  private samples = new Map<string, AudioBuffer>();
  enabled = true;

  /** Muss nach einer Berührung aufgerufen werden (Browser-Regel) */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    // "rosa" Rauschen klingt weicher als weißes
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    }

    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    this.contFilter = ctx.createBiquadFilter();
    this.contGain = ctx.createGain();
    this.contGain.gain.value = 0;
    src.connect(this.contFilter).connect(this.contGain).connect(this.master);
    src.start();

    this.squeakOsc = ctx.createOscillator();
    this.squeakOsc.type = 'triangle';
    this.squeakGain = ctx.createGain();
    this.squeakGain.gain.value = 0;
    this.squeakOsc.connect(this.squeakGain).connect(this.master);
    this.squeakOsc.start();
    this.applyMaterial();
  }

  setSquishy(material: MaterialId, snd?: Partial<SoundParams>) {
    this.material = material;
    this.snd = { pitch: 1, volume: 1, ...snd };
    for (const list of Object.values(this.snd.samples ?? {})) for (const url of list ?? []) void this.loadSample(url);
    this.applyMaterial();
  }

  private applyMaterial() {
    if (!this.ctx) return;
    const m = MAT[this.material];
    this.contFilter.type = m.filterType;
    this.contFilter.Q.value = m.q;
    this.contFilter.frequency.value = m.freqLow * this.snd.pitch;
  }

  private async loadSample(url: string) {
    if (!this.ctx || this.samples.has(url)) return;
    try {
      const res = await fetch(url);
      const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
      this.samples.set(url, buf);
    } catch {
      /* Datei fehlt -> einfach ignorieren */
    }
  }

  private playSample(kind: 'squish' | 'release' | 'impact', vol = 1) {
    const list = this.snd.samples?.[kind];
    if (!list?.length || !this.ctx) return false;
    const buf = this.samples.get(list[Math.floor(Math.random() * list.length)]);
    if (!buf) return false;
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.playbackRate.value = this.snd.pitch * (0.92 + Math.random() * 0.16);
    const g = this.ctx.createGain();
    g.gain.value = vol * this.snd.volume;
    s.connect(g).connect(this.master);
    s.start();
    return true;
  }

  /** Wird jeden Frame mit den Physik-Werten aufgerufen. */
  update(sig: SquishSignal, dt: number) {
    const ctx = this.ctx;
    if (!ctx || !this.enabled) return;
    const m = MAT[this.material];
    const now = ctx.currentTime;
    const v = this.snd.volume;
    const p = this.snd.pitch;
    const intensity = clamp(sig.deformRate * 1.6, 0, 1);
    this.contGain.gain.setTargetAtTime(intensity * m.gain * v, now, 0.03);
    this.contFilter.frequency.setTargetAtTime((m.freqLow + (m.freqHigh - m.freqLow) * clamp(sig.deform * 2.5, 0, 1)) * p, now, 0.05);

    if (m.squeak > 0) {
      const sq = clamp(sig.stretchRate * 2 - 0.15, 0, 1) * m.squeak;
      this.squeakGain.gain.setTargetAtTime(sq * 0.12 * v, now, 0.04);
      this.squeakOsc.frequency.setTargetAtTime((520 + sig.deform * 900) * p, now, 0.03);
    }
    // Knistern (Schaumstoff-Poren)
    const crackRate = m.crackle * intensity + m.recoverCrackle * clamp(sig.recoverRate * 3, 0, 1);
    let n = crackRate * dt;
    while (n > 0) {
      if (Math.random() < n) this.click(0.15 + Math.random() * 0.5);
      n -= 1;
    }
    // Bläschen (Jelly/Mochi)
    let bn = m.bubbles * intensity * dt;
    while (bn > 0) {
      if (Math.random() < bn) this.bubble(0.3 + Math.random() * 0.5);
      bn -= 1;
    }
  }

  private click(vol: number) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + Math.random() * 0.01;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = (2500 + Math.random() * 3000) * this.snd.pitch;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol * 0.5 * this.snd.volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.008 + Math.random() * 0.01);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 1.5, 0.03);
  }

  private bubble(vol: number) {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    const f0 = (250 + Math.random() * 350) * this.snd.pitch;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * (1.8 + Math.random()), t + 0.04);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * 0.18 * this.snd.volume, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.07);
  }

  /** Aufprall auf dem Tisch */
  impact(speed: number) {
    const ctx = this.ctx;
    if (!ctx || !this.enabled) return;
    const vol = clamp(speed / 30, 0.05, 1);
    if (this.playSample('impact', vol)) return;
    const m = MAT[this.material];
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(140 * this.snd.pitch, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.15);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol * m.thud * 0.6 * this.snd.volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.2);
    // "Patsch"
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = this.material === 'jelly' ? 3 : 0.8;
    f.frequency.setValueAtTime((this.material === 'jelly' ? 1400 : 900) * this.snd.pitch, t);
    f.frequency.exponentialRampToValueAtTime(250, t + 0.12);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(vol * 0.9 * this.snd.volume, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    src.connect(f).connect(g2).connect(this.master);
    src.start(t, Math.random(), 0.2);
  }

  squishEvent() {
    this.playSample('squish', 0.8);
  }

  release() {
    this.playSample('release', 0.6);
  }

  // ---------------------------------------------------- UI-Sounds
  private tone(freq: number, start: number, dur: number, vol: number, type: OscillatorType = 'sine') {
    const ctx = this.ctx!;
    const t = ctx.currentTime + start;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  ui(kind: 'tap' | 'coin' | 'pop' | 'levelup' | 'error' | 'boxShake') {
    if (!this.ctx || !this.enabled) return;
    switch (kind) {
      case 'tap':
        this.tone(900, 0, 0.05, 0.08);
        break;
      case 'coin':
        this.tone(1320, 0, 0.08, 0.12, 'triangle');
        this.tone(1760, 0.06, 0.15, 0.12, 'triangle');
        break;
      case 'pop': {
        const ctx = this.ctx;
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(200, t);
        o.frequency.exponentialRampToValueAtTime(900, t + 0.08);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        o.connect(g).connect(this.master);
        o.start(t);
        o.stop(t + 0.15);
        break;
      }
      case 'boxShake':
        this.tone(180 + Math.random() * 60, 0, 0.08, 0.15, 'triangle');
        break;
      case 'levelup':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * 0.09, 0.3, 0.15, 'triangle'));
        break;
      case 'error':
        this.tone(220, 0, 0.12, 0.12, 'square');
        this.tone(180, 0.1, 0.15, 0.1, 'square');
        break;
    }
  }

  reveal(rarity: RarityId) {
    if (!this.ctx || !this.enabled) return;
    const notes: Record<RarityId, number[]> = {
      common: [659, 784],
      rare: [587, 740, 880],
      epic: [523, 659, 784, 988],
      legendary: [523, 659, 784, 1047, 1319],
      mythic: [440, 554, 659, 880, 1109, 1319, 1760],
    };
    notes[rarity].forEach((f, i) => this.tone(f, i * 0.08, 0.5, 0.13, 'triangle'));
    if (rarity === 'legendary' || rarity === 'mythic') {
      for (let i = 0; i < 12; i++) this.tone(2000 + Math.random() * 3000, 0.4 + i * 0.05, 0.15, 0.04);
    }
  }
}

export const audio = new AudioEngine();
