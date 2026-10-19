// ===========================================================================
// Formen der Squishys.
// Jede Form ist eine geschlossene Umrisslinie mit "Radius" etwa 1.
// Daraus werden N Punkte gemacht, die später von der Physik bewegt werden.
// ===========================================================================
import type { CustomShape } from '../content/types';

export interface EarInfo {
  /** Winkel von oben (Bogenmaß, positiv = nach rechts) */
  phi: number;
  /** Höhe über dem Körper */
  h: number;
  /** halbe Breite (Bogenmaß) */
  w: number;
  base: number;
}

export interface Outline {
  /** Punkte relativ zum Schwerpunkt, Einheit ~1 (x0,y0,x1,y1,...) */
  pts: Float32Array;
  /** Ursprung der Strahlen (für die Verformung von Gesicht und Deko) */
  ox: number;
  oy: number;
  /** Abstand jedes Punkts vom Ursprung */
  radii: Float32Array;
  ears: EarInfo[];
  /** höchster und tiefster Punkt (für Deko-Platzierung) */
  top: number;
  bottom: number;
}

type Polar = (phi: number) => number;

// phi = Winkel gemessen von oben, im Uhrzeigersinn
const fromPolar = (fn: Polar, aspect = 1, M = 360): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i < M; i++) {
    const phi = (i / M) * Math.PI * 2;
    const r = fn(phi);
    out.push([Math.sin(phi) * r * aspect, -Math.cos(phi) * r]);
  }
  return out;
};

const fromParam = (fn: (t: number) => [number, number], M = 360): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i < M; i++) out.push(fn((i / M) * Math.PI * 2));
  return out;
};

/** kleinster Winkelabstand */
const angDist = (a: number, b: number) => {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

const bump = (kind: 'tri' | 'round' | 'long', phi: number, e: EarInfo) => {
  const d = Math.abs(angDist(phi, e.phi)) / e.w;
  if (d >= 1) return 0;
  if (kind === 'tri') return e.h * Math.pow(1 - d, 1.15);
  if (kind === 'round') return e.h * Math.sqrt(1 - d * d);
  return e.h * Math.pow(1 - d * d, 0.35);
};

function earShape(base: number, kind: 'tri' | 'round' | 'long', ears: EarInfo[], aspect = 1) {
  const poly = fromPolar((phi) => {
    let r = base;
    for (const e of ears) r += bump(kind, phi, e);
    return r;
  }, aspect, 720);
  return { poly, ears };
}

interface RawShape {
  poly: [number, number][];
  ears?: EarInfo[];
}

function rawShape(shape: string | CustomShape): RawShape {
  if (typeof shape !== 'string') {
    const h = shape.harmonics ?? [];
    return {
      poly: fromPolar((phi) => {
        let r = 1;
        for (const [n, a, p] of h) r += a * Math.cos(n * phi + p);
        return r;
      }, shape.aspect ?? 1),
    };
  }
  switch (shape) {
    case 'bun': {
      // flacher, breiter "Superellipsen"-Laib
      return {
        poly: fromParam((t) => {
          const c = Math.cos(t), s = Math.sin(t);
          const p = 2.6;
          const x = 1.18 * Math.sign(c) * Math.pow(Math.abs(c), 2 / p);
          const yb = s > 0 ? 0.72 : 0.88;
          const y = yb * Math.sign(s) * Math.pow(Math.abs(s), 2 / p);
          return [x, y];
        }),
      };
    }
    case 'egg':
      return { poly: fromParam((t) => [0.84 * Math.cos(t) * (1 + 0.1 * Math.sin(t)), 1.06 * Math.sin(t)]) };
    case 'pear':
      return { poly: fromParam((t) => [0.8 * Math.cos(t) * (1 + 0.24 * Math.sin(t)), 1.1 * Math.sin(t)]) };
    case 'blob':
      return { poly: fromPolar((phi) => 1 + 0.05 * Math.cos(3 * phi + 0.6) + 0.04 * Math.cos(2 * phi + 1.2), 1.12) };
    case 'heart': {
      const pts = fromParam((t) => {
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        // etwas mit einem Kreis mischen -> weicher, "aufgeblasener"
        const cx = Math.sin(t) * 16, cy = -Math.cos(t) * 15;
        return [((x * 0.8 + cx * 0.2) / 15) * 1.05, ((y * 0.8 + cy * 0.2) / 15) * 1.05 + 0.08];
      });
      return { poly: pts };
    }
    case 'star':
      return { poly: fromPolar((phi) => 0.86 + 0.2 * Math.cos(5 * phi) + 0.03 * Math.cos(10 * phi), 1) };
    case 'cloud':
      return {
        poly: fromPolar((phi) => {
          const upper = Math.max(0, Math.cos(phi)); // 1 oben, 0 unten
          const bumps = 0.13 * Math.pow(Math.abs(Math.cos(phi * 3.5)), 0.7);
          return 0.82 + bumps * (0.4 + 0.6 * upper) - 0.08 * Math.pow(Math.max(0, -Math.cos(phi)), 2);
        }, 1.28),
      };
    case 'peach':
      return {
        poly: fromPolar((phi) => {
          const d = angDist(phi, 0);
          return 1 - 0.13 * Math.exp(-(d * d) / 0.05) + 0.05 * Math.pow(Math.max(0, -Math.cos(phi)), 6);
        }, 1.04),
      };
    case 'strawberry':
      return {
        poly: fromPolar((phi) => {
          // phi von unten gemessen -> Spitze unten, zwei "Schultern" oben
          const p = phi - Math.PI;
          return 0.95 + 0.13 * Math.cos(3 * p) - 0.03 * Math.cos(6 * p);
        }, 0.98),
      };
    case 'toast': {
      const ears: EarInfo[] = [
        { phi: -0.55, h: 0.12, w: 0.75, base: 0 },
        { phi: 0.55, h: 0.12, w: 0.75, base: 0 },
      ];
      const sq = fromParam((t) => {
        const c = Math.cos(t), s = Math.sin(t);
        const p = 5;
        return [0.98 * Math.sign(c) * Math.pow(Math.abs(c), 2 / p), 0.9 * Math.sign(s) * Math.pow(Math.abs(s), 2 / p)];
      }, 720);
      // Toast-"Kuppel": oben zwei sanfte Wölbungen
      const poly = sq.map(([x, y]) => {
        const phi = Math.atan2(x, -y);
        let add = 0;
        for (const e of ears) add += bump('round', phi, e);
        const r = Math.hypot(x, y);
        return [x * (1 + add / r), y * (1 + add / r)] as [number, number];
      });
      return { poly };
    }
    case 'ghost':
      return {
        poly: fromPolar((phi) => {
          const lower = Math.max(0, -Math.cos(phi));
          return 0.95 + 0.12 * lower + 0.07 * lower * Math.cos(phi * 7);
        }, 0.92),
      };
    case 'cat': {
      const base = 0.92;
      const ears: EarInfo[] = [
        { phi: -0.72, h: 0.42, w: 0.4, base },
        { phi: 0.72, h: 0.42, w: 0.4, base },
      ];
      const r = earShape(base, 'tri', ears, 1.05);
      return { poly: r.poly, ears };
    }
    case 'bear': {
      const base = 0.92;
      const ears: EarInfo[] = [
        { phi: -0.78, h: 0.3, w: 0.42, base },
        { phi: 0.78, h: 0.3, w: 0.42, base },
      ];
      const r = earShape(base, 'round', ears, 1.05);
      return { poly: r.poly, ears };
    }
    case 'bunny': {
      const base = 0.88;
      const ears: EarInfo[] = [
        { phi: -0.36, h: 0.85, w: 0.25, base },
        { phi: 0.36, h: 0.85, w: 0.25, base },
      ];
      const r = earShape(base, 'long', ears, 1.1);
      return { poly: r.poly, ears };
    }
    case 'frog': {
      const base = 0.88;
      const ears: EarInfo[] = [
        { phi: -0.68, h: 0.28, w: 0.46, base },
        { phi: 0.68, h: 0.28, w: 0.46, base },
      ];
      const r = earShape(base, 'round', ears, 1.18);
      return { poly: r.poly };
    }
    case 'round':
    default:
      return { poly: fromPolar(() => 1, 1.03) };
  }
}

/** Schnittpunkt eines Strahls mit einem Polygon (größter Abstand). */
function rayHit(poly: [number, number][], ox: number, oy: number, dx: number, dy: number) {
  let best = 0;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const ex = bx - ax, ey = by - ay;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((ax - ox) * ey - (ay - oy) * ex) / den;
    const u = ((ax - ox) * dy - (ay - oy) * dx) / den;
    if (t > 0 && u >= 0 && u <= 1 && t > best) best = t;
  }
  return best;
}

const cache = new Map<string, Outline>();

export function buildOutline(shape: string | CustomShape, n: number): Outline {
  const key = JSON.stringify(shape) + ':' + n;
  const hit = cache.get(key);
  if (hit) return hit;

  const raw = rawShape(shape);
  const poly = raw.poly;
  // Ursprung leicht unterhalb der Mitte, damit Ohren sauber getroffen werden
  const ox = 0, oy = 0.05;
  const pts = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const th = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const dx = Math.cos(th), dy = Math.sin(th);
    const r = rayHit(poly, ox, oy, dx, dy) || 1;
    pts[i * 2] = ox + dx * r;
    pts[i * 2 + 1] = oy + dy * r;
  }
  // Mittelpunkt aller Punkte auf 0,0 legen (die Physik rechnet mit genau diesem Mittelpunkt)
  let cx = 0, cy = 0;
  for (let i = 0; i < n; i++) {
    cx += pts[i * 2];
    cy += pts[i * 2 + 1];
  }
  cx /= n;
  cy /= n;
  let top = 0, bottom = 0;
  const radii = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pts[i * 2] -= cx;
    pts[i * 2 + 1] -= cy;
    top = Math.min(top, pts[i * 2 + 1]);
    bottom = Math.max(bottom, pts[i * 2 + 1]);
    radii[i] = Math.hypot(pts[i * 2] - (ox - cx), pts[i * 2 + 1] - (oy - cy));
  }
  const out: Outline = { pts, ox: ox - cx, oy: oy - cy, radii, ears: raw.ears ?? [], top, bottom };
  cache.set(key, out);
  return out;
}
