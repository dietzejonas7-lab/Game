// ===========================================================================
// Die Squishy-Physik ("Soft Body").
//
// Ein Squishy besteht aus einem Ring von Punkten. Pro Zeitschritt:
//  1. Jeder Punkt fliegt mit seiner Geschwindigkeit weiter + Schwerkraft.
//  2. "Formgedächtnis": Die Punkte werden zu ihrer Ursprungsform gezogen.
//  3. "Innendruck": Die Fläche will gleich groß bleiben -> beim Drücken
//     wölbt sich das Squishy an anderen Stellen aus.
//  4. Finger ziehen/drücken Punkte.
//  5. Boden und Wände halten alles im Bild.
//
// Das "Slow Rising" entsteht durch eine "Delle", die sich die Form merkt
// und die sich nur langsam wieder zurückbildet.
// ===========================================================================
import type { MaterialId, PhysicsParams } from '../content/types';
import type { Outline } from '../render/shapes';
import { clamp } from '../util';

export const MATERIAL_PHYSICS: Record<MaterialId, PhysicsParams> = {
  // Slow-Rising-Schaumstoff: hält die Form, Dellen gehen langsam weg, wenig Druck
  foam: { stiffness: 0.3, recovery: 0.55, plasticity: 0.9, pressure: 0.25, damping: 0.965, bounce: 0.12, friction: 0.6 },
  // Mochi: sehr weich, dehnbar, mittlere Erholung, hoher Druck
  mochi: { stiffness: 0.1, recovery: 2.2, plasticity: 0.5, pressure: 0.7, damping: 0.975, bounce: 0.15, friction: 0.75 },
  // Jelly: wabbelig, schwingt nach, kein Gedächtnis
  jelly: { stiffness: 0.12, recovery: 6, plasticity: 0, pressure: 0.9, damping: 0.992, bounce: 0.35, friction: 0.3 },
  // Gel/Stressball: fest, prall, springt zurück
  gel: { stiffness: 0.3, recovery: 8, plasticity: 0.1, pressure: 1, damping: 0.982, bounce: 0.45, friction: 0.45 },
};

interface Grab {
  idx: number[];
  w: number[];
  offX: number[];
  offY: number[];
  px: number;
  py: number;
  lastX: number;
  lastY: number;
  vx: number;
  vy: number;
  depth: number;
  maxDeform: number;
  startT: number;
  still: number;
}

export interface Impact {
  speed: number;
  x: number;
  y: number;
}

export interface ReleaseInfo {
  squished: boolean;
  thrown: boolean;
  tap: boolean;
}

export class SoftBody {
  readonly n: number;
  x: Float32Array;
  y: Float32Array;
  px: Float32Array;
  py: Float32Array;
  readonly restX: Float32Array;
  readonly restY: Float32Array;
  dentX: Float32Array;
  dentY: Float32Array;
  touchW: Float32Array;
  /** Geschwindigkeit vor den Korrekturen (für echte Aufprall-Erkennung) */
  private vx0: Float32Array;
  private vy0: Float32Array;
  readonly outline: Outline;
  scale: number;
  params: PhysicsParams;

  // Ergebnisse, die Grafik/Sound benutzen
  cx = 0;
  cy = 0;
  angle = 0;
  deform = 0;
  /** Verformung im Ruhezustand (durch Schwerkraft) – als Vergleichswert */
  restDeform = 0;
  deformRate = 0;
  recoverRate = 0;
  stretchRate = 0;
  impacts: Impact[] = [];

  bounds = { left: 0, right: 400, floor: 600, top: -2000 };
  gravity = 1;
  private grabs = new Map<number, Grab>();
  private time = 0;
  private uprightBoost = 0;
  private lastDeform = 0;

  constructor(outline: Outline, scale: number, params: PhysicsParams, x: number, y: number) {
    this.outline = outline;
    this.n = outline.pts.length / 2;
    this.scale = scale;
    this.params = params;
    const n = this.n;
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.px = new Float32Array(n);
    this.py = new Float32Array(n);
    this.restX = new Float32Array(n);
    this.restY = new Float32Array(n);
    this.dentX = new Float32Array(n);
    this.dentY = new Float32Array(n);
    this.touchW = new Float32Array(n);
    this.vx0 = new Float32Array(n);
    this.vy0 = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      this.restX[i] = outline.pts[i * 2] * scale;
      this.restY[i] = outline.pts[i * 2 + 1] * scale;
      this.x[i] = this.px[i] = x + this.restX[i];
      this.y[i] = this.py[i] = y + this.restY[i];
    }
    this.cx = x;
    this.cy = y;
  }

  private area(xs: Float32Array, ys: Float32Array, dx?: Float32Array, dy?: Float32Array) {
    let a = 0;
    const n = this.n;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = xs[i] + (dx ? dx[i] : 0), yi = ys[i] + (dy ? dy[i] : 0);
      const xj = xs[j] + (dx ? dx[j] : 0), yj = ys[j] + (dy ? dy[j] : 0);
      a += xj * yi - xi * yj;
    }
    return a * 0.5;
  }

  /** Verschiebt das ganze Squishy (ohne Geschwindigkeit) */
  placeAt(x: number, y: number) {
    for (let i = 0; i < this.n; i++) {
      this.x[i] = this.px[i] = x + this.restX[i];
      this.y[i] = this.py[i] = y + this.restY[i];
      this.dentX[i] = this.dentY[i] = 0;
    }
    this.cx = x;
    this.cy = y;
    this.angle = 0;
  }

  /** Liegt ein Punkt (Bildschirm) im Squishy? */
  contains(x: number, y: number, margin = 0) {
    let inside = false;
    const n = this.n;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = this.x[i], yi = this.y[i], xj = this.x[j], yj = this.y[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    if (inside || margin <= 0) return inside;
    for (let i = 0; i < n; i++) if (Math.hypot(this.x[i] - x, this.y[i] - y) < margin) return true;
    return false;
  }

  // ------------------------------------------------------------- Finger
  pointerDown(id: number, x: number, y: number) {
    if (!this.contains(x, y, this.scale * 0.25)) return false;
    const R = this.scale * 0.75;
    const g: Grab = {
      idx: [], w: [], offX: [], offY: [], px: x, py: y, lastX: x, lastY: y,
      vx: 0, vy: 0, depth: 0, maxDeform: 0, startT: this.time, still: 0,
    };
    for (let i = 0; i < this.n; i++) {
      const d = Math.hypot(this.x[i] - x, this.y[i] - y);
      const w = Math.exp(-((d / R) ** 2));
      if (w > 0.04) {
        g.idx.push(i);
        g.w.push(w);
        g.offX.push(this.x[i] - x);
        g.offY.push(this.y[i] - y);
      }
    }
    if (!g.idx.length) return false;
    this.grabs.set(id, g);
    return true;
  }

  pointerMove(id: number, x: number, y: number) {
    const g = this.grabs.get(id);
    if (!g) return;
    g.px = x;
    g.py = y;
  }

  pointerUp(id: number): ReleaseInfo | null {
    const g = this.grabs.get(id);
    if (!g) return null;
    this.grabs.delete(id);
    const dur = this.time - g.startT;
    const speed = Math.hypot(g.vx, g.vy);
    const tap = dur < 0.22 && g.maxDeform < 0.1;
    if (tap) {
      // Kurzes Antippen: kleiner "Stups" nach innen
      for (let k = 0; k < g.idx.length; k++) {
        const i = g.idx[k];
        const dx = this.cx - this.x[i], dy = this.cy - this.y[i];
        const l = Math.hypot(dx, dy) || 1;
        const imp = g.w[k] * this.scale * 0.05;
        this.px[i] -= (dx / l) * imp;
        this.py[i] -= (dy / l) * imp;
        this.touchW[i] = Math.max(this.touchW[i], g.w[k] * 0.6);
      }
    }
    const thrown = speed > this.scale * 9;
    return { squished: tap || g.maxDeform > 0.06, thrown, tap };
  }

  /** Kleiner Hüpfer, danach richtet es sich auf */
  hop() {
    const v = this.scale * 0.07;
    for (let i = 0; i < this.n; i++) this.py[i] = this.y[i] + v;
    this.uprightBoost = 0.8;
  }

  isGrabbed() {
    return this.grabs.size > 0;
  }

  releaseAll() {
    this.grabs.clear();
  }

  // ------------------------------------------------------------- Simulation
  step(dt: number) {
    const n = this.n;
    const p = this.params;
    const { x, y, px, py } = this;
    this.time += dt;
    this.uprightBoost = Math.max(0, this.uprightBoost - dt);

    // Finger-Geschwindigkeit & "Eindrücken" beim Festhalten
    this.touchW.fill(0);
    for (const g of this.grabs.values()) {
      const vx = (g.px - g.lastX) / dt, vy = (g.py - g.lastY) / dt;
      g.vx = g.vx * 0.8 + vx * 0.2;
      g.vy = g.vy * 0.8 + vy * 0.2;
      g.lastX = g.px;
      g.lastY = g.py;
      const moving = Math.hypot(g.vx, g.vy) > this.scale * 1.5;
      g.still = moving ? 0 : g.still + dt;
      const maxDepth = this.scale * 0.42;
      if (!moving) g.depth = Math.min(maxDepth, g.depth + dt * this.scale * 1.6);
      else g.depth = Math.max(0, g.depth - dt * this.scale * 0.5);
      for (let k = 0; k < g.idx.length; k++) {
        const i = g.idx[k];
        this.touchW[i] = Math.max(this.touchW[i], g.w[k]);
      }
    }

    // 1) Bewegung (Verlet)
    const damp = Math.pow(p.damping, dt * 60);
    const grav = this.gravity * this.scale * 24 * dt * dt;
    for (let i = 0; i < n; i++) {
      const vx = (x[i] - px[i]) * damp;
      const vy = (y[i] - py[i]) * damp;
      px[i] = x[i];
      py[i] = y[i];
      x[i] += vx;
      y[i] += vy + grav;
      this.vx0[i] = vx;
      this.vy0[i] = vy + grav;
    }

    const iters = 4;
    const kShape = 1 - Math.pow(1 - p.stiffness, 1 / iters);
    const targetArea = this.area(this.restX, this.restY, this.dentX, this.dentY);
    for (let it = 0; it < iters; it++) {
      this.shapeMatch(kShape);
      this.applyPressure(targetArea, p.pressure / iters);
      this.applyEdges(0.25);
      this.applyGrabs();
    }
    this.collide(dt);
    this.updateDent(dt);
    this.measure(dt);
  }

  private shapeMatch(k: number) {
    const n = this.n;
    const { x, y, restX, restY, dentX, dentY } = this;
    let cx = 0, cy = 0;
    for (let i = 0; i < n; i++) {
      cx += x[i];
      cy += y[i];
    }
    cx /= n;
    cy /= n;
    let a = 0, b = 0;
    for (let i = 0; i < n; i++) {
      const rx = restX[i] + dentX[i], ry = restY[i] + dentY[i];
      const dx = x[i] - cx, dy = y[i] - cy;
      a += rx * dx + ry * dy;
      b += rx * dy - ry * dx;
    }
    let ang = Math.atan2(b, a);
    // sanft aufrichten (wie ein Stehaufmännchen), damit das Gesicht meist oben ist
    const upright = this.uprightBoost > 0 ? 0.03 : 0.0025;
    ang -= clamp(ang, -upright, upright);
    const c = Math.cos(ang), s = Math.sin(ang);
    for (let i = 0; i < n; i++) {
      const rx = restX[i] + dentX[i], ry = restY[i] + dentY[i];
      const tx = cx + c * rx - s * ry;
      const ty = cy + s * rx + c * ry;
      x[i] += (tx - x[i]) * k;
      y[i] += (ty - y[i]) * k;
    }
    this.cx = cx;
    this.cy = cy;
    this.angle = ang;
  }

  private applyPressure(targetArea: number, k: number) {
    const n = this.n;
    const { x, y } = this;
    const a = this.area(x, y);
    let perim = 0;
    for (let i = 0, j = n - 1; i < n; j = i++) perim += Math.hypot(x[i] - x[j], y[i] - y[j]);
    const disp = ((targetArea - a) / perim) * k;
    if (Math.abs(disp) < 1e-4) return;
    // Normalen zuerst berechnen, dann anwenden
    const nx = new Float32Array(n), ny = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const ip = (i + n - 1) % n, inx = (i + 1) % n;
      const tx = x[inx] - x[ip], ty = y[inx] - y[ip];
      const l = Math.hypot(tx, ty) || 1;
      // Punkte laufen im Uhrzeigersinn (y nach unten) -> Außennormale = (ty, -tx)
      nx[i] = ty / l;
      ny[i] = -tx / l;
    }
    for (let i = 0; i < n; i++) {
      x[i] += nx[i] * disp;
      y[i] += ny[i] * disp;
    }
  }

  private applyEdges(k: number) {
    const n = this.n;
    const { x, y, restX, restY } = this;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const rl = Math.hypot(restX[j] - restX[i], restY[j] - restY[i]);
      const dx = x[j] - x[i], dy = y[j] - y[i];
      const l = Math.hypot(dx, dy) || 1e-6;
      // nur gegen starkes Zusammendrücken/Überdehnen
      const lo = rl * 0.45, hi = rl * 2.2;
      let target = l;
      if (l < lo) target = lo;
      else if (l > hi) target = hi;
      else target = l + (rl - l) * 0.05;
      const diff = ((l - target) / l) * 0.5 * k * 4;
      x[i] += dx * diff;
      y[i] += dy * diff;
      x[j] -= dx * diff;
      y[j] -= dy * diff;
    }
  }

  private applyGrabs() {
    const { x, y } = this;
    for (const g of this.grabs.values()) {
      for (let k = 0; k < g.idx.length; k++) {
        const i = g.idx[k];
        const w = g.w[k];
        // Richtung zur Mitte -> beim Festhalten wird eine Delle eingedrückt
        const dx = this.cx - x[i], dy = this.cy - y[i];
        const l = Math.hypot(dx, dy) || 1;
        const ax = g.px + g.offX[k] + (dx / l) * g.depth * w;
        const ay = g.py + g.offY[k] + (dy / l) * g.depth * w;
        const s = w * 0.45;
        x[i] += (ax - x[i]) * s;
        y[i] += (ay - y[i]) * s;
      }
    }
  }

  private collide(dt: number) {
    const n = this.n;
    const { x, y, px, py, vx0, vy0 } = this;
    const p = this.params;
    const b = this.bounds;
    const bounceMin = this.scale * 3 * dt;
    let biggest = 0, ix = 0, iy = 0;
    for (let i = 0; i < n; i++) {
      if (y[i] > b.floor) {
        const vin = vy0[i];
        if (vin > biggest) {
          biggest = vin;
          ix = x[i];
          iy = b.floor;
        }
        y[i] = b.floor;
        // nur echte Aufpralle springen zurück, ruhiges Liegen nicht
        py[i] = vin > bounceMin ? y[i] + vin * p.bounce : y[i];
        px[i] += (x[i] - px[i]) * p.friction;
        if (vin / dt > this.scale * 6) this.touchW[i] = Math.max(this.touchW[i], clamp(vin / dt / (this.scale * 40), 0, 0.8));
      }
      if (x[i] < b.left) {
        const vin = -vx0[i];
        if (vin > biggest) { biggest = vin; ix = b.left; iy = y[i]; }
        x[i] = b.left;
        px[i] = vin > bounceMin ? x[i] - vin * p.bounce : x[i];
      } else if (x[i] > b.right) {
        const vin = vx0[i];
        if (vin > biggest) { biggest = vin; ix = b.right; iy = y[i]; }
        x[i] = b.right;
        px[i] = vin > bounceMin ? x[i] + vin * p.bounce : x[i];
      }
      if (y[i] < b.top) {
        y[i] = b.top;
        py[i] = y[i];
      }
    }
    const speed = biggest / dt;
    if (speed > this.scale * 5) this.impacts.push({ speed: speed / this.scale, x: ix, y: iy });
  }

  private updateDent(dt: number) {
    const n = this.n;
    const p = this.params;
    const c = Math.cos(-this.angle), s = Math.sin(-this.angle);
    const decay = Math.exp(-p.recovery * dt);
    const maxDent = this.scale * 0.6;
    for (let i = 0; i < n; i++) {
      const tw = this.touchW[i];
      if (tw > 0 && p.plasticity > 0) {
        // aktuelle Abweichung im "Ruhe-Koordinatensystem"
        const dx = this.x[i] - this.cx, dy = this.y[i] - this.cy;
        const lx = c * dx - s * dy - this.restX[i];
        const ly = s * dx + c * dy - this.restY[i];
        const rate = clamp(p.plasticity * tw * 10 * dt, 0, 1);
        this.dentX[i] += (lx - this.dentX[i]) * rate;
        this.dentY[i] += (ly - this.dentY[i]) * rate;
      }
      this.dentX[i] *= decay;
      this.dentY[i] *= decay;
      const m = Math.hypot(this.dentX[i], this.dentY[i]);
      if (m > maxDent) {
        this.dentX[i] *= maxDent / m;
        this.dentY[i] *= maxDent / m;
      }
    }
    // Delle glätten, damit keine Zacken entstehen
    const sx = new Float32Array(n), sy = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = (i + n - 1) % n, b = (i + 1) % n;
      sx[i] = (this.dentX[a] + 2 * this.dentX[i] + this.dentX[b]) * 0.25;
      sy[i] = (this.dentY[a] + 2 * this.dentY[i] + this.dentY[b]) * 0.25;
    }
    this.dentX = sx;
    this.dentY = sy;
  }

  private measure(dt: number) {
    const n = this.n;
    const c = Math.cos(this.angle), s = Math.sin(this.angle);
    let sum = 0, dentSum = 0;
    for (let i = 0; i < n; i++) {
      const tx = this.cx + c * this.restX[i] - s * this.restY[i];
      const ty = this.cy + s * this.restX[i] + c * this.restY[i];
      sum += (this.x[i] - tx) ** 2 + (this.y[i] - ty) ** 2;
      dentSum += this.dentX[i] ** 2 + this.dentY[i] ** 2;
    }
    this.deform = Math.sqrt(sum / n) / this.scale;
    const dentMag = Math.sqrt(dentSum / n) / this.scale;
    const rate = (this.deform - this.lastDeform) / dt;
    this.lastDeform = this.deform;
    this.deformRate = this.deformRate * 0.75 + Math.abs(rate) * 0.25;
    this.recoverRate = !this.isGrabbed() && dentMag > 0.01 ? dentMag * this.params.recovery : 0;
    this.stretchRate = this.stretchRate * 0.8 + Math.max(0, rate) * 0.2;
    if (!this.isGrabbed() && Math.abs(rate) < 0.05 && dentMag < 0.02) this.restDeform += (this.deform - this.restDeform) * Math.min(1, dt * 2);
    for (const g of this.grabs.values()) g.maxDeform = Math.max(g.maxDeform, this.deform - this.restDeform);
  }
}
