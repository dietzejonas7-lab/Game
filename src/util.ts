// Kleine Hilfsfunktionen, die überall gebraucht werden.

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Zufallszahlen, die bei gleichem "seed" immer gleich sind (für Streusel usw.). */
export function seededRandom(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export function hashString(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---------- Farben ----------
export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(c: RGB | string, a = 1) {
  const [r, g, b] = typeof c === 'string' ? hexToRgb(c) : c;
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

export function mix(a: string, b: string, t: number): RGB {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return [lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)];
}

export function lighten(c: string, t: number): RGB {
  return mix(c, '#ffffff', t);
}

export function darken(c: string, t: number): RGB {
  return mix(c, '#000000', t);
}

/** Helligkeit 0..1 – um zu entscheiden, ob dunkle oder helle Augen besser aussehen. */
export function luminance(c: string) {
  const [r, g, b] = hexToRgb(c);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Ist ein Datum (ISO) innerhalb eines Zeitraums? Leere Grenzen = offen. */
export function isWithin(from?: string, until?: string, now = new Date()) {
  const t = now.getTime();
  if (from && t < new Date(from + 'T00:00:00').getTime()) return false;
  if (until && t > new Date(until + 'T23:59:59').getTime()) return false;
  return true;
}

export function formatNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 10_000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(Math.floor(n));
}

export function formatDuration(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}
