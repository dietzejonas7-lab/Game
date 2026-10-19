// ===========================================================================
// Die Spielfläche: Canvas, Tisch, Hintergrund, Touch-Eingabe, Spielschleife.
// Verbindet Physik (SoftBody), Grafik (drawSquishy) und Sound.
// ===========================================================================
import { audio } from '../audio/audio';
import type { SceneDef, SquishyDef } from '../content/types';
import { MATERIAL_PHYSICS, SoftBody, type ReleaseInfo } from '../physics/softbody';
import { haptic } from '../platform/platform';
import { buildOutline } from './shapes';
import { drawShadow, drawSquishy } from './squishyRenderer';

const POINTS = 64;
const DT = 1 / 120;

export interface StageEvents {
  onSquish?: (x: number, y: number) => void;
  onThrow?: () => void;
  onHop?: () => void;
}

export class Stage {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  body: SoftBody | null = null;
  def: SquishyDef | null = null;
  scene: SceneDef | null = null;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private acc = 0;
  private last = 0;
  private time = 0;
  private running = false;
  private raf = 0;
  events: StageEvents = {};
  /** interaktiv = Touch erlaubt + Sounds */
  interactive: boolean;
  floorRatio: number;
  sizeRatio: number;
  private particles: { x: number; y: number; vx: number; vy: number; life: number; text?: string; color: string }[] = [];

  constructor(canvas: HTMLCanvasElement, opts: { interactive?: boolean; floorRatio?: number; sizeRatio?: number } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.interactive = opts.interactive ?? true;
    this.floorRatio = opts.floorRatio ?? 0.74;
    this.sizeRatio = opts.sizeRatio ?? 0.27;
    if (this.interactive) this.bindInput();
    if (import.meta.env.DEV || location.search.includes('debug')) (window as unknown as { __stage: Stage }).__stage = this;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  private resize() {
    const r = this.canvas.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
    if (this.def) this.setSquishy(this.def, false);
  }

  get floorY() {
    return this.h * this.floorRatio;
  }

  setSquishy(def: SquishyDef, drop = true) {
    this.def = def;
    if (this.w < 2) return;
    const outline = buildOutline(def.shape, POINTS);
    const scale = Math.min(this.w, this.h) * this.sizeRatio * (def.size ?? 1);
    const params = { ...MATERIAL_PHYSICS[def.material], ...def.physics };
    const startY = drop ? Math.max(-outline.top * scale + 6, this.floorY - scale * 2.6) : this.floorY - outline.bottom * scale;
    this.body = new SoftBody(outline, scale, params, this.w / 2, startY);
    this.body.bounds = { left: 8, right: this.w - 8, floor: this.floorY, top: -this.h };
    if (this.interactive) audio.setSquishy(def.material, def.sound);
  }

  setScene(scene: SceneDef) {
    this.scene = scene;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (t: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.body?.releaseAll();
  }

  // ------------------------------------------------------------ Eingabe
  private bindInput() {
    const c = this.canvas;
    const pos = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top] as const;
    };
    c.addEventListener('pointerdown', (e) => {
      audio.unlock();
      if (!this.body) return;
      const [x, y] = pos(e);
      if (this.body.pointerDown(e.pointerId, x, y)) {
        c.setPointerCapture(e.pointerId);
        haptic('light');
      } else if (!this.body.isGrabbed() && y > this.floorY - this.body.scale * 3) {
        // Tippen auf den Tisch: Squishy hüpft und richtet sich auf
        this.body.hop();
        haptic('light');
        this.events.onHop?.();
      }
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.body) return;
      const [x, y] = pos(e);
      this.body.pointerMove(e.pointerId, x, y);
    });
    const up = (e: PointerEvent) => {
      if (!this.body) return;
      const info = this.body.pointerUp(e.pointerId);
      if (info) this.handleRelease(info, e);
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
  }

  private handleRelease(info: ReleaseInfo, e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    if (info.squished) {
      audio.squishEvent();
      this.events.onSquish?.(e.clientX - r.left, e.clientY - r.top);
    } else audio.release();
    if (info.thrown) this.events.onThrow?.();
  }

  // ------------------------------------------------------------ Partikel (+XP)
  floatText(x: number, y: number, text: string, color = '#ffffff') {
    this.particles.push({ x, y, vx: (Math.random() - 0.5) * 30, vy: -70, life: 1, text, color });
  }

  burst(x: number, y: number, color: string, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 160;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0.6 + Math.random() * 0.5, color });
    }
  }

  // ------------------------------------------------------------ Update/Draw
  private update(dt: number) {
    this.time += dt;
    const b = this.body;
    if (b) {
      this.acc += dt;
      while (this.acc >= DT) {
        b.step(DT);
        this.acc -= DT;
      }
      if (this.interactive) {
        audio.update({ deform: b.deform, deformRate: b.deformRate, recoverRate: b.recoverRate, stretchRate: b.stretchRate, grabbed: b.isGrabbed() }, dt);
        if (b.isGrabbed() && b.deformRate > 0.25) haptic('light', 70);
        for (const imp of b.impacts) {
          if (imp.speed > 6) {
            audio.impact(imp.speed);
            if (imp.speed > 12) haptic('medium', 80);
          }
        }
      }
      b.impacts.length = 0;
    }
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (!p.text) p.vy += 400 * dt;
      p.life -= dt * (p.text ? 0.9 : 1.4);
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private draw() {
    const ctx = this.ctx;
    const { w, h, dpr } = this;
    if (w < 2) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sc = this.scene;
    if (sc) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, sc.bgTop);
      g.addColorStop(1, sc.bgBottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // Tisch
      const fy = this.floorY;
      const tg = ctx.createLinearGradient(0, fy - 10, 0, h);
      tg.addColorStop(0, sc.table);
      tg.addColorStop(1, sc.bgBottom);
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.moveTo(0, fy + 6);
      ctx.quadraticCurveTo(w / 2, fy - 18, w, fy + 6);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, fy + 6);
      ctx.quadraticCurveTo(w / 2, fy - 18, w, fy + 6);
      ctx.stroke();
    } else ctx.clearRect(0, 0, w, h);

    const b = this.body;
    if (b && this.def) {
      if (sc) drawShadow(ctx, b, this.floorY);
      drawSquishy(ctx, b, this.def, { time: this.time, dpr, holeColor: sc?.table });
    }
    for (const p of this.particles) {
      ctx.globalAlpha = Math.min(1, p.life * 1.5);
      if (p.text) {
        ctx.font = '800 18px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(80,30,70,0.5)';
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------ Vorschaubilder
const thumbCache = new Map<string, string>();

/** Erzeugt ein Bild (data URL) eines Squishys für Listen. */
export function thumbnail(def: SquishyDef, size: number, silhouette = false): string {
  const key = def.id + ':' + size + ':' + silhouette + ':' + JSON.stringify(def.colors) + JSON.stringify(def.shape);
  const hit = thumbCache.get(key);
  if (hit) return hit;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const c = document.createElement('canvas');
  c.width = c.height = Math.round(size * dpr);
  const ctx = c.getContext('2d')!;
  ctx.scale(dpr, dpr);
  const outline = buildOutline(def.shape, POINTS);
  // passend skalieren (inkl. Ohren / Ring)
  let maxR = 0;
  for (let i = 0; i < outline.pts.length; i += 2) maxR = Math.max(maxR, Math.abs(outline.pts[i]), Math.abs(outline.pts[i + 1]));
  const hasRing = def.decorations?.some((d) => d.type === 'ring');
  const hasLeaf = def.decorations?.some((d) => d.type === 'leaf');
  const scale = (size * 0.42) / Math.max(maxR + (hasLeaf ? 0.25 : 0), hasRing ? 1.75 : 0);
  const body = new SoftBody(outline, scale, MATERIAL_PHYSICS[def.material], size / 2, size / 2 + (hasLeaf ? scale * 0.12 : 0));
  drawSquishy(ctx, body, def, { time: 0, still: true, silhouette, dpr, holeColor: '#f3e6ff' });
  const url = c.toDataURL();
  thumbCache.set(key, url);
  return url;
}
