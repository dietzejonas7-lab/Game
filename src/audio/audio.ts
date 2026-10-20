// ===========================================================================
// Sounds und Musik – alles live erzeugt (keine Audiodateien nötig).
// ===========================================================================

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let soundOn = true;
let musicOn = true;
let musicStarted = false;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Muss nach der ersten Berührung aufgerufen werden (Browser-Regel) */
export function unlockAudio() {
  ac();
  if (musicOn) startMusic();
}

export function setSound(on: boolean) {
  soundOn = on;
}

export function setMusic(on: boolean) {
  musicOn = on;
  if (on) startMusic();
  if (musicGain && ctx) musicGain.gain.setTargetAtTime(on ? 0.12 : 0, ctx.currentTime, 0.8);
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slideTo?: number) {
  const c = ac();
  if (!c || !master || !soundOn) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
let lastClick = 0;

export const sfx = {
  click() {
    const now = performance.now();
    if (now - lastClick < 35) return;
    lastClick = now;
    const n = PENTA[Math.floor(Math.random() * PENTA.length)];
    tone(440 * Math.pow(2, n / 12), 0.18, 'sine', 0.12);
    tone(880 * Math.pow(2, n / 12), 0.08, 'triangle', 0.03);
  },
  buy() {
    tone(660, 0.12, 'triangle', 0.1);
    tone(990, 0.16, 'sine', 0.08, 0.05);
  },
  upgrade() {
    [0, 4, 7, 12].forEach((n, i) => tone(523 * Math.pow(2, n / 12), 0.25, 'triangle', 0.08, i * 0.06));
  },
  epoch() {
    [0, 7, 12, 16, 19, 24].forEach((n, i) => tone(262 * Math.pow(2, n / 12), 1.2, 'sine', 0.09, i * 0.12));
  },
  anomaly() {
    tone(1200, 0.4, 'sine', 0.08, 0, 2400);
    tone(1800, 0.3, 'triangle', 0.04, 0.08);
  },
  achievement() {
    [12, 16, 19].forEach((n, i) => tone(523 * Math.pow(2, n / 12), 0.35, 'sine', 0.07, i * 0.09));
  },
  heatDeath() {
    tone(220, 2.5, 'sine', 0.12, 0, 55);
    tone(165, 2.5, 'triangle', 0.06, 0.2, 40);
  },
  bang() {
    const c = ac();
    if (!c || !master || !soundOn) return;
    // Rauschen für den Urknall
    const len = c.sampleRate * 1.6;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(3000, c.currentTime);
    f.frequency.exponentialRampToValueAtTime(80, c.currentTime + 1.5);
    const g = c.createGain();
    g.gain.value = 0.5;
    src.connect(f).connect(g).connect(master);
    src.start();
    tone(55, 1.8, 'sine', 0.25, 0, 30);
  },
};

/** Ruhiger Weltraum-Klangteppich */
function startMusic() {
  const c = ac();
  if (!c || !master || musicStarted) return;
  musicStarted = true;
  musicGain = c.createGain();
  musicGain.gain.value = 0;
  musicGain.connect(master);
  musicGain.gain.setTargetAtTime(musicOn ? 0.12 : 0, c.currentTime, 2);
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.connect(musicGain);
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 0.05;
  lfoGain.gain.value = 400;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();
  // Akkord, der sich langsam verändert
  const chords = [[110, 164.8, 220, 329.6], [98, 146.8, 196, 293.7], [87.3, 130.8, 174.6, 261.6], [98, 146.8, 220, 293.7]];
  const oscs = chords[0].map((f, i) => {
    const o = c.createOscillator();
    o.type = i % 2 ? 'triangle' : 'sine';
    o.frequency.value = f;
    o.detune.value = (i - 1.5) * 6;
    const g = c.createGain();
    g.gain.value = 0.25;
    o.connect(g).connect(filter);
    o.start();
    return o;
  });
  let step = 0;
  setInterval(() => {
    if (!ctx) return;
    step = (step + 1) % chords.length;
    oscs.forEach((o, i) => o.frequency.setTargetAtTime(chords[step][i], ctx!.currentTime, 3));
  }, 12000);
}
