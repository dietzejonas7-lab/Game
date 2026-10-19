// ===========================================================================
// Zeichnet ein Squishy möglichst realistisch:
// weicher Umriss, Farbverlauf, Schatten innen, Glanzlichter, Oberflächen-
// struktur (Schaumstoff-Poren / Puder), Gesicht und Dekorationen.
// Gesicht und Deko verformen sich mit dem Körper mit.
// ===========================================================================
import type { DecorationDef, FaceDef, SquishyDef } from '../content/types';
import type { SoftBody } from '../physics/softbody';
import { darken, hashString, lighten, luminance, rgba, seededRandom } from '../util';

interface Look {
  gloss: number;
  sharpSpec: number;
  translucent: number;
  texture: 'pores' | 'powder' | 'none';
}

const LOOKS: Record<string, Look> = {
  foam: { gloss: 0.32, sharpSpec: 0, translucent: 0, texture: 'pores' },
  mochi: { gloss: 0.22, sharpSpec: 0, translucent: 0, texture: 'powder' },
  jelly: { gloss: 0.6, sharpSpec: 0.95, translucent: 0.18, texture: 'none' },
  gel: { gloss: 0.55, sharpSpec: 0.8, translucent: 0, texture: 'none' },
};

// --- Oberflächen-Texturen (einmal erzeugt, dann wiederverwendet)
let poreTile: HTMLCanvasElement | null = null;
let powderTile: HTMLCanvasElement | null = null;
function makeTile(kind: 'pores' | 'powder') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const rnd = seededRandom(kind === 'pores' ? 7 : 11);
  if (kind === 'pores') {
    for (let i = 0; i < 900; i++) {
      const x = rnd() * 128, y = rnd() * 128, r = 0.4 + rnd() * 1.3;
      g.fillStyle = `rgba(0,0,0,${0.05 + rnd() * 0.12})`;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = `rgba(255,255,255,${0.05 + rnd() * 0.1})`;
      g.beginPath();
      g.arc(x - r * 0.5, y - r * 0.5, r * 0.6, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(255,255,255,${0.08 + rnd() * 0.2})`;
      g.fillRect(rnd() * 128, rnd() * 128, 0.8 + rnd() * 0.8, 0.8 + rnd() * 0.8);
    }
  }
  return c;
}

export interface RenderOpts {
  time: number;
  /** Farbe hinter dem Donut-Loch */
  holeColor?: string;
  /** keine Animationen (für Vorschaubilder) */
  still?: boolean;
  /** schwarz (noch nicht gesammelt) */
  silhouette?: boolean;
  dpr: number;
}

type Pt = [number, number];

/** Rechnet "Ruhe-Koordinaten" (Einheit 1) in verformte Bildschirm-Koordinaten um. */
class Mapper {
  private b: SoftBody;
  private ox: number;
  private oy: number;
  constructor(b: SoftBody) {
    this.b = b;
    const o = b.outline;
    const c = Math.cos(b.angle), s = Math.sin(b.angle);
    const sx = o.ox * b.scale, sy = o.oy * b.scale;
    this.ox = b.cx + c * sx - s * sy;
    this.oy = b.cy + s * sx + c * sy;
  }
  map(ux: number, uy: number): Pt {
    const b = this.b;
    const o = b.outline;
    const n = b.n;
    const vx = ux - o.ox, vy = uy - o.oy;
    const th = Math.atan2(vy, vx);
    let f = ((th + Math.PI / 2) / (Math.PI * 2)) * n;
    f = ((f % n) + n) % n;
    const i0 = Math.floor(f), i1 = (i0 + 1) % n, t = f - i0;
    const restR = o.radii[i0] * (1 - t) + o.radii[i1] * t;
    const rho = Math.hypot(vx, vy) / restR;
    const bx = b.x[i0] * (1 - t) + b.x[i1] * t;
    const by = b.y[i0] * (1 - t) + b.y[i1] * t;
    return [this.ox + (bx - this.ox) * rho, this.oy + (by - this.oy) * rho];
  }
  /** lokale Transformation (für kleine Dinge wie Augen) */
  affine(ux: number, uy: number, e = 0.06): [number, number, number, number, number, number] {
    const p0 = this.map(ux, uy);
    const px = this.map(ux + e, uy);
    const py = this.map(ux, uy + e);
    return [(px[0] - p0[0]) / e, (px[1] - p0[1]) / e, (py[0] - p0[0]) / e, (py[1] - p0[1]) / e, p0[0], p0[1]];
  }
}

function tracePath(ctx: CanvasRenderingContext2D, xs: ArrayLike<number>, ys: ArrayLike<number>, n: number) {
  ctx.beginPath();
  const mx = (xs[n - 1] + xs[0]) / 2, my = (ys[n - 1] + ys[0]) / 2;
  ctx.moveTo(mx, my);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    ctx.quadraticCurveTo(xs[i], ys[i], (xs[i] + xs[j]) / 2, (ys[i] + ys[j]) / 2);
  }
  ctx.closePath();
}

function traceMapped(ctx: CanvasRenderingContext2D, m: Mapper, pts: Pt[], smooth = true) {
  const mp = pts.map(([x, y]) => m.map(x, y));
  ctx.beginPath();
  if (!smooth) {
    mp.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    return;
  }
  const n = mp.length;
  ctx.moveTo((mp[n - 1][0] + mp[0][0]) / 2, (mp[n - 1][1] + mp[0][1]) / 2);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    ctx.quadraticCurveTo(mp[i][0], mp[i][1], (mp[i][0] + mp[j][0]) / 2, (mp[i][1] + mp[j][1]) / 2);
  }
  ctx.closePath();
}

const ellipsePts = (cx: number, cy: number, rx: number, ry: number, k = 28): Pt[] => {
  const out: Pt[] = [];
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2;
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
};

/** Ist ein Punkt im Gesichtsbereich? (dort keine Streusel/Kerne) */
function inFace(def: SquishyDef, x: number, y: number) {
  if (!def.face) return false;
  const fy = def.face.y ?? 0.05;
  const s = def.face.scale ?? 1;
  return Math.abs(x) < 0.62 * s && y > fy - 0.2 * s && y < fy + 0.3 * s;
}

function restInside(b: SoftBody, x: number, y: number, margin = 0.85) {
  const o = b.outline;
  const vx = x - o.ox, vy = y - o.oy;
  const th = Math.atan2(vy, vx);
  let f = ((th + Math.PI / 2) / (Math.PI * 2)) * b.n;
  f = ((f % b.n) + b.n) % b.n;
  const r = o.radii[Math.floor(f)];
  return Math.hypot(vx, vy) < r * margin;
}

export function drawSquishy(ctx: CanvasRenderingContext2D, b: SoftBody, def: SquishyDef, opts: RenderOpts) {
  const look = LOOKS[def.material] ?? LOOKS.foam;
  const m = new Mapper(b);
  const R = b.scale;
  const sil = !!opts.silhouette;
  const body = sil ? '#2d2340' : def.colors.body;
  const body2 = sil ? '#1d1630' : def.colors.body2 ?? rgbHex(darken(def.colors.body, 0.12));
  const decos = sil ? [] : def.decorations ?? [];

  // Ring hinten (Saturn)
  for (const d of decos) if (d.type === 'ring') drawRing(ctx, b, d.color, 'back');

  // --- Körper
  ctx.save();
  tracePath(ctx, b.x, b.y, b.n);
  const lx = b.cx - R * 0.4, ly = b.cy - R * 0.55;
  const grad = ctx.createRadialGradient(lx, ly, R * 0.05, b.cx, b.cy, R * 1.45);
  grad.addColorStop(0, rgba(lighten(body, 0.28)));
  grad.addColorStop(0.42, rgba(body));
  grad.addColorStop(1, rgba(darken(body2, 0.1)));
  ctx.globalAlpha = 1 - look.translucent;
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.clip();

  if (look.translucent > 0 && !sil) {
    // leuchtender Kern bei Jelly
    const core = ctx.createRadialGradient(b.cx, b.cy + R * 0.25, 0, b.cx, b.cy + R * 0.25, R * 0.9);
    core.addColorStop(0, rgba(lighten(body, 0.35), 0.55));
    core.addColorStop(1, rgba(lighten(body, 0.35), 0));
    ctx.fillStyle = core;
    ctx.fillRect(b.cx - R * 2, b.cy - R * 2, R * 4, R * 4);
  }

  // Oberflächenstruktur
  if (look.texture !== 'none' && !sil) {
    const tile = look.texture === 'pores' ? (poreTile ??= makeTile('pores')) : (powderTile ??= makeTile('powder'));
    const pat = ctx.createPattern(tile, 'repeat');
    if (pat) {
      const sc = (R / 110) * 0.9;
      pat.setTransform(new DOMMatrix().translate(b.cx, b.cy).rotate((b.angle * 180) / Math.PI).scale(sc));
      ctx.globalAlpha = look.texture === 'pores' ? 0.3 : 0.55;
      ctx.fillStyle = pat;
      ctx.fillRect(b.cx - R * 3, b.cy - R * 3, R * 6, R * 6);
      ctx.globalAlpha = 1;
    }
  }

  // Dekorationen auf dem Körper
  for (const d of decos) drawDecoration(ctx, b, m, def, d, opts);

  // Innenschatten (Volumen): dunkler Rand unten rechts, heller Rand oben links
  innerShadow(ctx, b, rgba(darken(body2, 0.35), sil ? 0.5 : 0.42), R * 0.35, R * 0.06, R * 0.1);
  innerShadow(ctx, b, rgba(lighten(body, 0.6), sil ? 0.08 : 0.35 + look.gloss * 0.2), R * 0.18, -R * 0.04, -R * 0.06);

  // Glanzlicht – bleibt oben links (Licht kommt von dort), verformt sich aber mit
  if (!sil) {
    const ca = Math.cos(-b.angle), sa = Math.sin(-b.angle);
    const toRest = (sx: number, sy: number): Pt => [ca * sx - sa * sy, sa * sx + ca * sy];
    const [hx, hy] = toRest(-0.36, -0.46);
    const hp = m.map(hx, hy);
    const af = m.affine(hx, hy);
    ctx.save();
    ctx.transform(af[0] / R, af[1] / R, af[2] / R, af[3] / R, hp[0], hp[1]);
    ctx.rotate(-0.5 - b.angle);
    const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.42);
    hg.addColorStop(0, `rgba(255,255,255,${look.gloss})`);
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hg;
    ctx.scale(1, 0.6);
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (look.sharpSpec > 0) {
      const [sx, sy] = toRest(-0.42, -0.55);
      const af2 = m.affine(sx, sy);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(opts.dpr, opts.dpr);
      ctx.transform(af2[0], af2[1], af2[2], af2[3], af2[4], af2[5]);
      ctx.rotate(-0.6 - b.angle);
      ctx.fillStyle = `rgba(255,255,255,${look.sharpSpec})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.13, 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0.17, 0.05, 0.03, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Reflex unten rechts
      const [rx, ry] = toRest(0.45, 0.5);
      const rp = m.map(rx, ry);
      const rg = ctx.createRadialGradient(rp[0], rp[1], 0, rp[0], rp[1], R * 0.3);
      rg.addColorStop(0, `rgba(255,255,255,${look.sharpSpec * 0.25})`);
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(rp[0] - R, rp[1] - R, R * 2, R * 2);
    }
  }

  // Gesicht
  if (def.face && !sil) drawFace(ctx, b, m, def.face, def.colors.body, opts);
  ctx.restore();

  // feine Kontur
  tracePath(ctx, b.x, b.y, b.n);
  ctx.lineWidth = Math.max(1, R * 0.018);
  ctx.strokeStyle = rgba(darken(body2, 0.4), sil ? 0.6 : 0.22);
  ctx.stroke();

  // Deko außerhalb des Körpers
  for (const d of decos) {
    if (d.type === 'leaf') drawLeaf(ctx, b, m, d.color, def.shape === 'strawberry');
    if (d.type === 'ring') drawRing(ctx, b, d.color, 'front');
    if (d.type === 'glitter' && !opts.still) drawGlitter(ctx, b, m, def, d.color ?? '#ffffff', opts.time);
  }
}

function rgbHex(c: [number, number, number]) {
  return '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function innerShadow(ctx: CanvasRenderingContext2D, b: SoftBody, color: string, blur: number, ox: number, oy: number) {
  ctx.save();
  const R = b.scale;
  const big = R * 4;
  ctx.beginPath();
  ctx.rect(b.cx - big, b.cy - big, big * 2, big * 2);
  // Loch in Form des Squishys (gegen den Uhrzeigersinn -> evenodd)
  const n = b.n;
  const mx = (b.x[0] + b.x[n - 1]) / 2, my = (b.y[0] + b.y[n - 1]) / 2;
  ctx.moveTo(mx, my);
  for (let i = n - 1; i >= 0; i--) {
    const j = (i + n - 1) % n;
    ctx.quadraticCurveTo(b.x[i], b.y[i], (b.x[i] + b.x[j]) / 2, (b.y[i] + b.y[j]) / 2);
  }
  ctx.closePath();
  const t = ctx.getTransform();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur * t.a;
  ctx.shadowOffsetX = ox * t.a;
  ctx.shadowOffsetY = oy * t.a;
  ctx.fillStyle = '#000';
  ctx.fill('evenodd');
  ctx.restore();
}

// ------------------------------------------------------------------ Gesicht
function drawFace(ctx: CanvasRenderingContext2D, b: SoftBody, m: Mapper, f: FaceDef, bodyColor: string, opts: RenderOpts) {
  const fy = f.y ?? 0.05;
  const s = f.scale ?? 1;
  const ink = f.color ?? (luminance(bodyColor) < 0.35 ? '#ffffff' : '#3a2530');
  const squeezed = b.deform - b.restDeform > 0.14 && !opts.still;
  const blink = !opts.still && (opts.time % 4.3) < 0.12;

  const at = (ux: number, uy: number, draw: () => void) => {
    const a = m.affine(ux, uy);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(opts.dpr, opts.dpr);
    ctx.transform(a[0] * s, a[1] * s, a[2] * s, a[3] * s, a[4], a[5]);
    draw();
    ctx.restore();
  };

  // Bäckchen
  if (f.blush) {
    for (const side of [-1, 1]) {
      at(side * 0.5 * s, fy + 0.13 * s, () => {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.16);
        g.addColorStop(0, 'rgba(255,110,150,0.55)');
        g.addColorStop(1, 'rgba(255,110,150,0)');
        ctx.fillStyle = g;
        ctx.scale(1, 0.65);
        ctx.beginPath();
        ctx.arc(0, 0, 0.16, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const eyeStyle = squeezed ? 'cross' : blink && ['dot', 'big', 'sparkle', 'heart'].includes(f.eyes) ? 'closed' : f.eyes;
  for (const side of [-1, 1]) {
    at(side * 0.3 * s, fy, () => drawEye(ctx, eyeStyle, side, ink));
  }
  const mouth = squeezed && f.mouth !== 'none' ? 'o' : f.mouth;
  at(0, fy + 0.14 * s, () => drawMouth(ctx, mouth, ink));
}

function drawEye(ctx: CanvasRenderingContext2D, style: string, side: number, ink: string) {
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.04;
  const shine = (x: number, y: number, r: number) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ink;
  };
  switch (style) {
    case 'happy':
      ctx.beginPath();
      ctx.arc(0, 0.04, 0.075, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      break;
    case 'sleepy':
    case 'closed':
      ctx.beginPath();
      ctx.arc(0, -0.02, 0.07, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      break;
    case 'wink':
      if (side > 0) {
        ctx.beginPath();
        ctx.arc(0, 0.04, 0.075, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 0, 0.065, 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        shine(-0.02, -0.03, 0.022);
      }
      break;
    case 'cross':
      ctx.beginPath();
      ctx.moveTo(-0.06 * side, -0.06);
      ctx.lineTo(0.05 * side, 0);
      ctx.lineTo(-0.06 * side, 0.06);
      ctx.stroke();
      break;
    case 'heart':
      ctx.fillStyle = '#ff3d7f';
      ctx.beginPath();
      ctx.moveTo(0, 0.08);
      ctx.bezierCurveTo(-0.12, 0, -0.08, -0.1, 0, -0.04);
      ctx.bezierCurveTo(0.08, -0.1, 0.12, 0, 0, 0.08);
      ctx.fill();
      shine(-0.035, -0.03, 0.018);
      break;
    case 'big':
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.095, 0.115, 0, 0, Math.PI * 2);
      ctx.fill();
      shine(-0.03, -0.045, 0.035);
      shine(0.035, 0.035, 0.016);
      break;
    case 'sparkle':
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.09, 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
      shine(-0.025, -0.04, 0.04);
      shine(0.03, 0.03, 0.02);
      ctx.fillStyle = '#ffffff';
      star4(ctx, 0.03, -0.05, 0.03);
      break;
    case 'dot':
    default:
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.065, 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      shine(-0.02, -0.03, 0.022);
  }
}

function drawMouth(ctx: CanvasRenderingContext2D, style: string, ink: string) {
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = 0.035;
  switch (style) {
    case 'smile':
      ctx.beginPath();
      ctx.arc(0, -0.04, 0.07, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
      break;
    case 'cat':
      ctx.beginPath();
      ctx.arc(-0.045, -0.01, 0.045, Math.PI * 0.1, Math.PI * 0.95);
      ctx.moveTo(0.09, 0);
      ctx.arc(0.045, -0.01, 0.045, Math.PI * 0.05, Math.PI * 0.9);
      ctx.stroke();
      break;
    case 'o':
      ctx.beginPath();
      ctx.ellipse(0, 0.01, 0.045, 0.055, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff7a9a';
      ctx.beginPath();
      ctx.ellipse(0, 0.035, 0.028, 0.018, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'grin':
    case 'tongue':
      ctx.beginPath();
      ctx.moveTo(-0.08, -0.02);
      ctx.quadraticCurveTo(0, -0.03, 0.08, -0.02);
      ctx.quadraticCurveTo(0.07, 0.1, 0, 0.1);
      ctx.quadraticCurveTo(-0.07, 0.1, -0.08, -0.02);
      ctx.fill();
      ctx.fillStyle = '#ff6f8f';
      ctx.beginPath();
      if (style === 'tongue') ctx.ellipse(0.02, 0.08, 0.045, 0.045, 0, 0, Math.PI * 2);
      else ctx.ellipse(0, 0.075, 0.04, 0.022, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'flat':
      ctx.beginPath();
      ctx.moveTo(-0.05, 0);
      ctx.lineTo(0.05, 0);
      ctx.stroke();
      break;
    case 'none':
    default:
  }
}

function star4(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

// ------------------------------------------------------------------ Deko
function drawDecoration(ctx: CanvasRenderingContext2D, b: SoftBody, m: Mapper, def: SquishyDef, d: DecorationDef, opts: RenderOpts) {
  const rnd = seededRandom(hashString(def.id + d.type));
  const o = b.outline;
  const atU = (ux: number, uy: number, draw: () => void) => {
    const a = m.affine(ux, uy);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(opts.dpr, opts.dpr);
    ctx.transform(a[0], a[1], a[2], a[3], a[4], a[5]);
    draw();
    ctx.restore();
  };
  switch (d.type) {
    case 'stripes': {
      const count = d.count ?? 3;
      ctx.fillStyle = d.color;
      for (let k = 0; k < count; k++) {
        const pts: Pt[] = [];
        if (d.dir === 'v') {
          const x0 = ((k + 1) / (count + 1)) * 2 - 1;
          const w = 0.07;
          for (let i = 0; i <= 16; i++) {
            const t = -1.2 + (i / 16) * 2.4;
            pts.push([(x0 - w) * Math.sqrt(Math.max(0.05, 1 - (t / 1.25) ** 2)), t]);
          }
          for (let i = 16; i >= 0; i--) {
            const t = -1.2 + (i / 16) * 2.4;
            pts.push([(x0 + w) * Math.sqrt(Math.max(0.05, 1 - (t / 1.25) ** 2)), t]);
          }
        } else {
          const y0 = count === 1 ? 0.02 : -0.55 + ((k + 0.5) / count) * 1.2;
          const h = count === 1 ? 0.13 : 0.075;
          for (let i = 0; i <= 16; i++) {
            const x = -1.4 + (i / 16) * 2.8;
            pts.push([x, y0 - h + 0.07 * x * x]);
          }
          for (let i = 16; i >= 0; i--) {
            const x = -1.4 + (i / 16) * 2.8;
            pts.push([x, y0 + h + 0.07 * x * x]);
          }
        }
        traceMapped(ctx, m, pts, false);
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'icing': {
      const yl = d.y ?? -0.1;
      const drips = d.drips ?? 5;
      const pts: Pt[] = [];
      const phase = rnd() * 6;
      for (let i = 0; i <= 48; i++) {
        const x = 1.5 - (i / 48) * 3;
        const wave = Math.pow(Math.max(0, Math.sin(x * drips * 0.9 + phase)), 6) * (0.18 + 0.1 * Math.sin(x * 5));
        pts.push([x, yl + 0.04 * Math.sin(x * 9) + wave]);
      }
      pts.push([-1.5, -1.8], [1.5, -1.8]);
      // Schatten unter der Glasur
      ctx.save();
      ctx.translate(0, b.scale * 0.035);
      traceMapped(ctx, m, pts);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fill();
      ctx.restore();
      traceMapped(ctx, m, pts);
      const top = m.map(0, o.top);
      const bot = m.map(0, yl + 0.2);
      const g = ctx.createLinearGradient(top[0], top[1], bot[0], bot[1]);
      g.addColorStop(0, rgba(lighten(d.color, 0.25)));
      g.addColorStop(1, d.color);
      ctx.fillStyle = g;
      ctx.fill();
      break;
    }
    case 'sprinkles': {
      const count = d.count ?? 20;
      let placed = 0, tries = 0;
      while (placed < count && tries++ < count * 30) {
        const x = rnd() * 2 - 1, y = rnd() * 2 - 1;
        const isTop = d.region === 'top' ? y < -0.05 : true;
        if (!isTop || !restInside(b, x, y, 0.82) || inFace(def, x, y)) continue;
        const col = d.colors[placed % d.colors.length];
        const rot = rnd() * Math.PI;
        placed++;
        atU(x, y, () => {
          ctx.rotate(rot);
          ctx.fillStyle = col;
          roundRect(ctx, -0.045, -0.013, 0.09, 0.026, 0.013);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
          roundRect(ctx, -0.035, -0.011, 0.05, 0.008, 0.004);
          ctx.fill();
        });
      }
      break;
    }
    case 'seeds': {
      const count = d.count ?? 18;
      const golden = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < count * 2; i++) {
        const r = Math.sqrt((i + 0.5) / (count * 2)) * 0.95;
        const a = i * golden;
        const x = Math.cos(a) * r, y = Math.sin(a) * r * 1.05;
        if (!restInside(b, x, y, 0.85) || inFace(def, x, y)) continue;
        atU(x, y, () => {
          ctx.rotate(a);
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.beginPath();
          ctx.ellipse(0.006, 0.006, 0.026, 0.04, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = d.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, 0.022, 0.036, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      break;
    }
    case 'spots': {
      const count = d.count ?? 6;
      const size = d.size ?? 0.1;
      let placed = 0, tries = 0;
      while (placed < count && tries++ < 300) {
        const x = rnd() * 1.8 - 0.9, y = rnd() * 1.8 - 0.9;
        if (!restInside(b, x, y, 0.8) || inFace(def, x, y) || inFace(def, x, y - size) || inFace(def, x, y + size)) continue;
        const s = size * (0.6 + rnd() * 0.7);
        placed++;
        traceMapped(ctx, m, ellipsePts(x, y, s, s * 0.9, 18));
        ctx.fillStyle = d.color;
        ctx.fill();
        ctx.strokeStyle = rgba(darken(d.color, 0.15), 0.5);
        ctx.lineWidth = Math.max(1, b.scale * 0.012);
        ctx.stroke();
      }
      break;
    }
    case 'stars': {
      const count = d.count ?? 16;
      for (let i = 0; i < count; i++) {
        const x = rnd() * 2 - 1, y = rnd() * 2 - 1;
        if (!restInside(b, x, y, 0.88)) continue;
        const s = 0.015 + rnd() * 0.035;
        const tw = opts.still ? 1 : 0.5 + 0.5 * Math.sin(opts.time * 2 + i);
        atU(x, y, () => {
          ctx.globalAlpha = 0.5 + tw * 0.5;
          ctx.fillStyle = d.color;
          if (s > 0.035) star4(ctx, 0, 0, s * 1.6);
          else {
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }
      ctx.globalAlpha = 1;
      // Nebel
      const p1 = m.map(-0.3, 0.2), p2 = m.map(0.35, -0.3);
      for (const [p, c] of [[p1, '#5ad1ff'], [p2, '#ff7ae0']] as const) {
        const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], b.scale * 0.6);
        g.addColorStop(0, rgba(c, 0.35));
        g.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = g;
        ctx.fillRect(p[0] - b.scale, p[1] - b.scale, b.scale * 2, b.scale * 2);
      }
      break;
    }
    case 'belly': {
      traceMapped(ctx, m, ellipsePts(0, 0.38, 0.55, 0.45, 32));
      ctx.fillStyle = d.color;
      ctx.globalAlpha = 0.95;
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }
    case 'ears': {
      for (const e of o.ears) {
        const pts: Pt[] = [];
        const k = 14;
        for (let i = 0; i <= k; i++) {
          const ph = e.phi - e.w * 0.55 + (i / k) * e.w * 1.1;
          const dd = Math.abs(ph - e.phi) / e.w;
          const prof = e.h * Math.max(0, 1 - dd * dd);
          const r = e.base + prof * 0.72 - 0.02;
          pts.push([Math.sin(ph) * r, -Math.cos(ph) * r + 0.05]);
        }
        for (let i = k; i >= 0; i--) {
          const ph = e.phi - e.w * 0.4 + (i / k) * e.w * 0.8;
          const r = e.base + e.h * 0.1;
          pts.push([Math.sin(ph) * r, -Math.cos(ph) * r + 0.05]);
        }
        traceMapped(ctx, m, pts);
        ctx.fillStyle = d.color;
        ctx.fill();
      }
      break;
    }
    case 'hole': {
      const pts = ellipsePts(0, -0.08, 0.25, 0.15, 28);
      traceMapped(ctx, m, pts);
      ctx.fillStyle = rgba(darken(opts.holeColor ?? '#f5b6cf', 0.08));
      ctx.fill();
      // Schatten vom oberen Rand + Teig-Innenseite unten
      ctx.save();
      traceMapped(ctx, m, pts);
      ctx.clip();
      const top = m.map(0, -0.23), bot = m.map(0, 0.07);
      const g = ctx.createLinearGradient(top[0], top[1], bot[0], bot[1]);
      g.addColorStop(0, 'rgba(60,20,40,0.55)');
      g.addColorStop(0.45, 'rgba(60,20,40,0)');
      g.addColorStop(0.7, rgba(def.colors.body2 ?? def.colors.body, 0));
      g.addColorStop(1, rgba(def.colors.body2 ?? def.colors.body, 0.95));
      ctx.fillStyle = g;
      ctx.fillRect(Math.min(top[0], bot[0]) - b.scale, top[1] - b.scale, b.scale * 2, b.scale * 2.5);
      ctx.restore();
      traceMapped(ctx, m, pts);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = Math.max(1, b.scale * 0.02);
      ctx.stroke();
      break;
    }
    case 'crust': {
      tracePath(ctx, b.x, b.y, b.n);
      ctx.strokeStyle = d.color;
      ctx.lineWidth = b.scale * 0.2;
      ctx.stroke();
      ctx.strokeStyle = rgba(lighten(d.color, 0.3), 0.6);
      ctx.lineWidth = b.scale * 0.04;
      ctx.save();
      ctx.translate(0, 0);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'heart': {
      const y = d.y ?? 0.3;
      const s = d.size ?? 0.3;
      const pts: Pt[] = [];
      for (let i = 0; i < 32; i++) {
        const t = (i / 32) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const yy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        pts.push([(x / 16) * s, (yy / 16) * s + y]);
      }
      traceMapped(ctx, m, pts);
      ctx.fillStyle = d.color;
      ctx.fill();
      const hp = m.map(-s * 0.35, y - s * 0.3);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(hp[0], hp[1], b.scale * s * 0.15, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default:
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawLeaf(ctx: CanvasRenderingContext2D, b: SoftBody, m: Mapper, color: string, crown: boolean) {
  const o = b.outline;
  const top = m.map(0, o.top + 0.04);
  const a = m.affine(0, o.top + 0.04);
  const R = b.scale;
  ctx.save();
  // Richtung "nach oben" am Squishy
  const ux = -a[2], uy = -a[3];
  const ang = Math.atan2(uy, ux) + Math.PI / 2;
  ctx.translate(top[0], top[1]);
  ctx.rotate(ang);
  const leaf = (rot: number, len: number, wid: number) => {
    ctx.save();
    ctx.rotate(rot);
    const g = ctx.createLinearGradient(0, 0, 0, -len);
    g.addColorStop(0, rgba(darken(color, 0.15)));
    g.addColorStop(1, rgba(lighten(color, 0.2)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(wid, -len * 0.5, 0, -len);
    ctx.quadraticCurveTo(-wid, -len * 0.5, 0, 0);
    ctx.fill();
    ctx.strokeStyle = rgba(darken(color, 0.3), 0.5);
    ctx.lineWidth = R * 0.015;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -len * 0.8);
    ctx.stroke();
    ctx.restore();
  };
  if (crown) {
    for (const r of [-1.25, -0.6, 0, 0.6, 1.25]) leaf(r, R * 0.32, R * 0.13);
  } else {
    leaf(0.7, R * 0.38, R * 0.17);
    ctx.strokeStyle = rgba(darken(color, 0.35));
    ctx.lineWidth = R * 0.05;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, R * 0.04);
    ctx.quadraticCurveTo(-R * 0.02, -R * 0.12, -R * 0.08, -R * 0.2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRing(ctx: CanvasRenderingContext2D, b: SoftBody, color: string, part: 'back' | 'front') {
  const R = b.scale;
  ctx.save();
  ctx.translate(b.cx, b.cy);
  ctx.rotate(b.angle - 0.22);
  ctx.lineCap = 'round';
  const start = part === 'back' ? Math.PI : 0;
  for (const [w, c, a] of [[R * 0.22, color, 0.9], [R * 0.06, rgba(lighten(color, 0.5)), 0.8]] as const) {
    ctx.strokeStyle = typeof c === 'string' && c.startsWith('#') ? rgba(c, a) : c;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 1.6, R * 0.38, 0, start, start + Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGlitter(ctx: CanvasRenderingContext2D, b: SoftBody, m: Mapper, def: SquishyDef, color: string, time: number) {
  const rnd = seededRandom(hashString(def.id + 'glitter'));
  ctx.fillStyle = color;
  for (let i = 0; i < 14; i++) {
    const x = rnd() * 1.8 - 0.9, y = rnd() * 1.8 - 0.9;
    const ph = rnd() * 10, sp = 1.5 + rnd() * 2;
    if (!restInside(b, x, y, 0.95)) continue;
    const tw = Math.max(0, Math.sin(time * sp + ph));
    if (tw < 0.05) continue;
    const p = m.map(x, y);
    ctx.globalAlpha = tw;
    star4(ctx, p[0], p[1], b.scale * 0.07 * tw);
  }
  ctx.globalAlpha = 1;
}

/** Schatten auf dem Tisch */
export function drawShadow(ctx: CanvasRenderingContext2D, b: SoftBody, floorY: number) {
  let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < b.n; i++) {
    minX = Math.min(minX, b.x[i]);
    maxX = Math.max(maxX, b.x[i]);
    maxY = Math.max(maxY, b.y[i]);
  }
  const h = Math.max(0, floorY - maxY);
  const fade = Math.max(0, 1 - h / (b.scale * 4));
  const w = (maxX - minX) * (0.55 + h / (b.scale * 10));
  const cx = (minX + maxX) / 2;
  const g = ctx.createRadialGradient(cx, floorY, 0, cx, floorY, w);
  g.addColorStop(0, `rgba(60,20,50,${0.32 * fade})`);
  g.addColorStop(1, 'rgba(60,20,50,0)');
  ctx.save();
  ctx.translate(cx, floorY);
  ctx.scale(1, 0.18);
  ctx.translate(-cx, -floorY);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, floorY, w, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
