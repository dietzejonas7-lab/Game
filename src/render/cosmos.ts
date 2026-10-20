// ===========================================================================
// Die Grafik in der Mitte: Sternenhimmel + das Motiv der aktuellen Epoche.
// Alles wird mit Code gezeichnet (keine Bilddateien nötig).
// ===========================================================================
import type { EpochDef, EpochVisual } from '../content/types';

interface Star { x: number; y: number; z: number; tw: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
interface Floater { x: number; y: number; text: string; life: number; color: string }

export interface CosmosState {
  entropyFrac: number;
  dead: boolean;
  /** Anzahl aller Strukturen (für mehr Leben im Bild) */
  structures: number;
}

const TAU = Math.PI * 2;

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function mixHex(a: string, b: string, t: number) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  const m = (i: number) => Math.round(x[i] + (y[i] - x[i]) * t);
  return `#${((1 << 24) | (m(0) << 16) | (m(1) << 8) | m(2)).toString(16).slice(1)}`;
}
/** Zufallszahlen, die immer gleich sind (damit Galaxie & Planet nicht flackern) */
function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export class Cosmos {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private t = 0;
  private stars: Star[] = [];
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private pulse = 0;
  private flash = 0;
  private epoch: EpochDef | null = null;
  private prevEpoch: EpochDef | null = null;
  private transition = 1;
  private galaxy: { r: number; a: number; c: string; s: number }[] = [];
  private continents: { a: number; y: number; r: number }[] = [];
  private nodes: { a: number; r: number; s: number }[] = [];
  private deathFade = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    const rnd = seeded(7);
    for (let i = 0; i < 170; i++) this.stars.push({ x: rnd(), y: rnd(), z: 0.2 + rnd() * 0.8, tw: rnd() * TAU });
    for (let i = 0; i < 520; i++) {
      const arm = i % 2;
      const r = Math.pow(rnd(), 0.8);
      const a = r * 4.2 + arm * Math.PI + (rnd() - 0.5) * (0.9 - r * 0.4);
      const c = r < 0.18 ? '#fff2c4' : rnd() < 0.3 ? '#ffd0f0' : rnd() < 0.6 ? '#a9c8ff' : '#e6ecff';
      this.galaxy.push({ r, a, c, s: 0.6 + rnd() * 1.6 });
    }
    for (let i = 0; i < 9; i++) this.continents.push({ a: rnd() * TAU, y: (rnd() - 0.5) * 1.3, r: 0.18 + rnd() * 0.28 });
    for (let i = 0; i < 26; i++) this.nodes.push({ a: rnd() * TAU, r: 0.35 + rnd() * 0.75, s: (rnd() - 0.5) * 0.25 });
    this.resize();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
  }

  get center() {
    return { x: this.w / 2, y: this.h * 0.5, r: Math.min(this.w, this.h) * 0.24 };
  }

  hitCenter(x: number, y: number) {
    const c = this.center;
    return Math.hypot(x - c.x, y - c.y) < c.r * 1.6;
  }

  setEpoch(e: EpochDef, animate = true) {
    if (this.epoch?.id === e.id) return;
    this.prevEpoch = animate ? this.epoch : null;
    this.epoch = e;
    this.transition = animate && this.prevEpoch ? 0 : 1;
    if (animate) this.flash = Math.max(this.flash, 0.6);
  }

  /** Feedback beim Tippen */
  tap(x: number, y: number, text: string, color: string) {
    this.pulse = 1;
    const accent = this.epoch?.colors.accent ?? '#ffffff';
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * TAU;
      const sp = 60 + Math.random() * 160;
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.5 + Math.random() * 0.5, color: Math.random() < 0.5 ? accent : color, size: 1 + Math.random() * 2.5 });
    }
    if (this.particles.length > 260) this.particles.splice(0, this.particles.length - 260);
    if (text) {
      this.floaters.push({ x: x + (Math.random() - 0.5) * 30, y: y - 10, text, life: 0, color });
      if (this.floaters.length > 24) this.floaters.shift();
    }
  }

  /** Neues Universum: großer Lichtblitz */
  bang() {
    this.flash = 1.2;
    this.deathFade = 0;
    const c = this.center;
    for (let i = 0; i < 120; i++) {
      const a = Math.random() * TAU;
      const sp = 100 + Math.random() * 500;
      this.particles.push({ x: c.x, y: c.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.8 + Math.random() * 1.2, color: Math.random() < 0.5 ? '#ffffff' : '#ffd9a0', size: 1 + Math.random() * 3 });
    }
  }

  frame(dtReal: number, st: CosmosState) {
    const ctx = this.ctx;
    const e = this.epoch;
    if (!e) return;
    this.deathFade += ((st.dead ? 1 : 0) - this.deathFade) * Math.min(1, dtReal * 0.8);
    const dt = dtReal * (1 - this.deathFade * 0.9);
    this.t += dt;
    this.pulse = Math.max(0, this.pulse - dtReal * 3.5);
    this.flash = Math.max(0, this.flash - dtReal * 1.2);
    this.transition = Math.min(1, this.transition + dtReal * 0.7);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const { w, h } = this;

    // Hintergrund (mit Überblendung zwischen Epochen)
    const top = this.prevEpoch ? mixHex(this.prevEpoch.colors.top, e.colors.top, this.transition) : e.colors.top;
    const bottom = this.prevEpoch ? mixHex(this.prevEpoch.colors.bottom, e.colors.bottom, this.transition) : e.colors.bottom;
    const accent = this.prevEpoch ? mixHex(this.prevEpoch.colors.accent, e.colors.accent, this.transition) : e.colors.accent;
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, top);
    bg.addColorStop(1, bottom);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Nebel
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const nx = w * (0.2 + 0.6 * ((Math.sin(this.t * 0.03 + i * 2.1) + 1) / 2));
      const ny = h * (0.25 + 0.5 * ((Math.cos(this.t * 0.025 + i * 1.3) + 1) / 2));
      const nr = Math.max(w, h) * (0.35 + i * 0.1);
      const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
      g.addColorStop(0, rgba(accent, 0.07));
      g.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    // Sterne mit leichtem Funkeln und Drift
    for (const s of this.stars) {
      const x = ((s.x + this.t * 0.004 * s.z) % 1) * w;
      const y = s.y * h;
      const a = (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.t * 1.5 * s.z + s.tw))) * s.z;
      ctx.fillStyle = `rgba(255,255,255,${a * 0.8})`;
      const sz = s.z * 1.6;
      ctx.fillRect(x, y, sz, sz);
    }

    // Motiv der Epoche
    const c = this.center;
    const R = c.r * (1 + this.pulse * 0.08);
    if (this.prevEpoch && this.transition < 1) {
      ctx.globalAlpha = 1 - this.transition;
      this.drawVisual(this.prevEpoch.visual, c.x, c.y, R, this.prevEpoch.colors.accent, st);
    }
    ctx.globalAlpha = this.transition;
    this.drawVisual(e.visual, c.x, c.y, R, e.colors.accent, st);
    ctx.globalAlpha = 1;

    // Strukturen als kleine Lichter, die um die Mitte kreisen
    const orbiters = Math.min(48, Math.floor(Math.log2(st.structures + 1) * 5));
    for (let i = 0; i < orbiters; i++) {
      const rr = R * (1.5 + (i % 5) * 0.16);
      const a = this.t * (0.25 + (i % 7) * 0.04) + i * 2.399;
      const x = c.x + Math.cos(a) * rr;
      const y = c.y + Math.sin(a) * rr * 0.42;
      ctx.fillStyle = rgba(accent, 0.55);
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, TAU);
      ctx.fill();
    }

    // Partikel
    for (const p of this.particles) {
      p.life += dtReal;
      p.x += p.vx * dtReal;
      p.y += p.vy * dtReal;
      p.vx *= 0.96;
      p.vy *= 0.96;
      const a = Math.max(0, 1 - p.life / p.max);
      ctx.fillStyle = rgba(p.color, a);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, TAU);
      ctx.fill();
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
    ctx.globalCompositeOperation = 'source-over';

    // Zahlen beim Tippen
    ctx.textAlign = 'center';
    ctx.font = '800 16px system-ui, sans-serif';
    for (const f of this.floaters) {
      f.life += dtReal;
      const a = Math.max(0, 1 - f.life / 1.1);
      ctx.fillStyle = rgba(f.color, a);
      ctx.fillText(f.text, f.x, f.y - f.life * 60);
    }
    this.floaters = this.floaters.filter((f) => f.life < 1.1);

    // Entropie: das Bild wird mit der Zeit rötlich und grau
    const ef = Math.min(1, st.entropyFrac);
    if (ef > 0.5) {
      ctx.fillStyle = `rgba(90,20,10,${(ef - 0.5) * 0.25})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (this.deathFade > 0.01) {
      ctx.fillStyle = `rgba(20,20,28,${this.deathFade * 0.6})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, this.flash)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // ------------------------------------------------------------------------
  private glow(x: number, y: number, r: number, inner: string, outer: string, a = 1) {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(inner, a));
    g.addColorStop(0.35, rgba(outer, a * 0.5));
    g.addColorStop(1, rgba(outer, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  private drawVisual(v: EpochVisual, x: number, y: number, R: number, accent: string, st: CosmosState) {
    const ctx = this.ctx;
    const t = this.t;
    ctx.globalCompositeOperation = 'lighter';
    switch (v) {
      case 'singularity': {
        // Akkretionsscheibe
        for (let i = 0; i < 4; i++) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(t * (0.6 + i * 0.25) + i);
          ctx.scale(1, 0.32);
          ctx.strokeStyle = rgba(accent, 0.35 - i * 0.06);
          ctx.lineWidth = 3 - i * 0.5;
          ctx.beginPath();
          ctx.arc(0, 0, R * (0.9 + i * 0.28), 0, Math.PI * 1.4);
          ctx.stroke();
          ctx.restore();
        }
        // einströmende Funken
        for (let i = 0; i < 26; i++) {
          const ph = (t * 0.35 + i / 26) % 1;
          const a = i * 2.39 + ph * 4;
          const rr = R * 1.8 * (1 - ph);
          ctx.fillStyle = rgba('#ffffff', ph * 0.8);
          ctx.fillRect(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.6, 2, 2);
        }
        this.glow(x, y, R * 1.3, '#ffffff', accent, 0.9);
        this.glow(x, y, R * 0.35 * (1 + 0.1 * Math.sin(t * 3)), '#ffffff', '#ffffff', 1);
        break;
      }
      case 'plasma': {
        for (let i = 0; i < 7; i++) {
          const a = t * (0.4 + i * 0.13) + i * 1.7;
          const off = R * 0.35 * Math.sin(t * 0.9 + i);
          this.glow(x + Math.cos(a) * off, y + Math.sin(a) * off, R * (0.7 + 0.15 * Math.sin(t * 2 + i)), '#ffd6a0', accent, 0.45);
        }
        this.glow(x, y, R * 0.5, '#fff4e0', '#ffb070', 0.9);
        const qc = ['#ff4d6d', '#4dff88', '#4db8ff'];
        for (let i = 0; i < 30; i++) {
          const a = t * (1 + (i % 5) * 0.3) * (i % 2 ? 1 : -1) + i;
          const rr = R * (0.9 + (i % 6) * 0.17);
          ctx.fillStyle = qc[i % 3];
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * rr, y + Math.sin(a * 1.3) * rr * 0.8, 2.2, 0, TAU);
          ctx.fill();
        }
        break;
      }
      case 'atoms': {
        this.glow(x, y, R * 1.3, '#ffffff', accent, 0.35);
        for (let k = 0; k < 3; k++) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate((k * Math.PI) / 3 + t * 0.1);
          ctx.strokeStyle = rgba(accent, 0.5);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, R * 1.15, R * 0.38, 0, 0, TAU);
          ctx.stroke();
          const a = t * (1.6 + k * 0.4) + k * 2;
          this.glow(Math.cos(a) * R * 1.15, Math.sin(a) * R * 0.38, 9, '#ffffff', accent, 1);
          ctx.restore();
        }
        ctx.globalCompositeOperation = 'source-over';
        const balls = [[0, 0], [0.22, 0.1], [-0.2, 0.12], [0.05, -0.22], [-0.1, -0.12], [0.15, -0.1], [-0.02, 0.24]];
        balls.forEach(([bx, by], i) => {
          const px = x + bx * R * 0.9 + Math.sin(t * 4 + i) * 1.5;
          const py = y + by * R * 0.9 + Math.cos(t * 3.5 + i) * 1.5;
          const g = ctx.createRadialGradient(px - 3, py - 3, 1, px, py, R * 0.17);
          const col = i % 2 ? '#ff6a6a' : '#7aa8ff';
          g.addColorStop(0, '#ffffff');
          g.addColorStop(0.3, col);
          g.addColorStop(1, mixHex(col, '#000000', 0.5));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, R * 0.17, 0, TAU);
          ctx.fill();
        });
        break;
      }
      case 'stars': {
        // Korona-Strahlen
        ctx.save();
        ctx.translate(x, y);
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * TAU + t * 0.05;
          const len = R * (1.5 + 0.35 * Math.sin(t * 1.3 + i * 1.7));
          ctx.strokeStyle = rgba('#ffd27a', 0.12);
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8);
          ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
          ctx.stroke();
        }
        ctx.restore();
        this.glow(x, y, R * 2.2, '#fff1c0', accent, 0.5);
        ctx.globalCompositeOperation = 'source-over';
        const g = ctx.createRadialGradient(x - R * 0.25, y - R * 0.25, R * 0.1, x, y, R);
        g.addColorStop(0, '#fffbe8');
        g.addColorStop(0.5, '#ffd25c');
        g.addColorStop(1, '#ff8a1e');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, R * 0.85, 0, TAU);
        ctx.fill();
        // Sonnenflecken / Granulation
        ctx.fillStyle = 'rgba(200,90,0,0.18)';
        for (let i = 0; i < 6; i++) {
          const a = t * 0.15 + i * 1.1;
          const px = x + Math.cos(a) * R * 0.5;
          if (Math.cos(a) < -0.2) continue;
          ctx.beginPath();
          ctx.arc(px, y + Math.sin(i * 2.3) * R * 0.45, R * 0.06, 0, TAU);
          ctx.fill();
        }
        // Lichtkreuz
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,240,200,0.25)';
        ctx.fillRect(x - R * 2.4, y - 1, R * 4.8, 2);
        ctx.fillRect(x - 1, y - R * 2.4, 2, R * 4.8);
        break;
      }
      case 'galaxy': {
        this.glow(x, y, R * 1.6, '#fff4d6', accent, 0.45);
        const rot = t * 0.08;
        for (const p of this.galaxy) {
          const a = p.a + rot * (1.2 - p.r * 0.6);
          const rr = p.r * R * 1.9;
          const px = x + Math.cos(a) * rr;
          const py = y + Math.sin(a) * rr * 0.55;
          ctx.fillStyle = rgba(p.c, 0.75 - p.r * 0.35);
          ctx.fillRect(px, py, p.s, p.s);
        }
        this.glow(x, y, R * 0.45, '#ffffff', '#ffe6a8', 0.9);
        break;
      }
      case 'life': {
        this.glow(x, y, R * 1.35, '#bfefff', accent, 0.3);
        ctx.globalCompositeOperation = 'source-over';
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, R, 0, TAU);
        ctx.clip();
        const ocean = ctx.createRadialGradient(x - R * 0.3, y - R * 0.3, R * 0.1, x, y, R);
        ocean.addColorStop(0, '#5fc4ff');
        ocean.addColorStop(1, '#0b3d8c');
        ctx.fillStyle = ocean;
        ctx.fillRect(x - R, y - R, R * 2, R * 2);
        for (const c of this.continents) {
          const a = (c.a + t * 0.12) % TAU;
          const lon = Math.sin(a);
          if (Math.cos(a) < 0) continue;
          ctx.fillStyle = c.y > 0.55 || c.y < -0.55 ? '#e8f4ff' : '#3fae5a';
          ctx.beginPath();
          ctx.ellipse(x + lon * R * 0.85, y + c.y * R * 0.6, R * c.r * Math.cos(a) * 0.9 + 1, R * c.r * 0.7, 0, 0, TAU);
          ctx.fill();
        }
        // Wolkenband
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = R * 0.08;
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const px = x - R + (i / 40) * R * 2;
          const py = y - R * 0.2 + Math.sin(i * 0.6 + t * 0.6) * R * 0.08;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        // Schattenseite
        const sh = ctx.createLinearGradient(x - R, y, x + R, y);
        sh.addColorStop(0, 'rgba(0,0,0,0)');
        sh.addColorStop(0.6, 'rgba(0,0,10,0.1)');
        sh.addColorStop(1, 'rgba(0,0,10,0.7)');
        ctx.fillStyle = sh;
        ctx.fillRect(x - R, y - R, R * 2, R * 2);
        ctx.restore();
        // Mond
        const ma = t * 0.5;
        const mx = x + Math.cos(ma) * R * 1.7;
        const my = y + Math.sin(ma) * R * 0.5;
        if (Math.sin(ma) > 0 || Math.hypot(mx - x, my - y) > R) {
          ctx.fillStyle = '#c9c9d6';
          ctx.beginPath();
          ctx.arc(mx, my, R * 0.16, 0, TAU);
          ctx.fill();
        }
        break;
      }
      case 'mind': {
        const pts = this.nodes.map((n) => {
          const a = n.a + t * n.s;
          return [x + Math.cos(a) * n.r * R * 1.6, y + Math.sin(a) * n.r * R * 1.1] as const;
        });
        ctx.lineWidth = 1;
        for (let i = 0; i < pts.length; i++) {
          for (let j = i + 1; j < pts.length; j++) {
            const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
            if (d > R * 0.9) continue;
            const pulse = 0.5 + 0.5 * Math.sin(t * 3 + i * 0.7 + j);
            ctx.strokeStyle = rgba(accent, 0.12 + pulse * 0.3);
            ctx.beginPath();
            ctx.moveTo(pts[i][0], pts[i][1]);
            ctx.lineTo(pts[j][0], pts[j][1]);
            ctx.stroke();
            // Signal, das an der Verbindung entlangläuft
            const ph = (t * 0.8 + i * 0.13 + j * 0.07) % 1;
            ctx.fillStyle = rgba('#ffffff', 0.7);
            ctx.fillRect(pts[i][0] + (pts[j][0] - pts[i][0]) * ph - 1, pts[i][1] + (pts[j][1] - pts[i][1]) * ph - 1, 2, 2);
          }
        }
        for (const [px, py] of pts) this.glow(px, py, 7, '#ffffff', accent, 0.9);
        this.glow(x, y, R * 0.9 * (1 + 0.06 * Math.sin(t * 2)), '#ffffff', accent, 0.8);
        break;
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    void st;
  }
}
