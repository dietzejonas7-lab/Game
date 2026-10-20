// Zahlen und Zeiten schön anzeigen.
import type { Notation } from './state.ts';

// Deutsche Zahlwörter: Tausend, Million, Milliarde, Billion, Billiarde, Trillion …
// Danach wird automatisch auf 1,23e45 umgeschaltet.
const SUFFIXES = ['', 'K', 'Mio', 'Mrd', 'Bio', 'Brd', 'Trio', 'Trd', 'Quad', 'Qrd', 'Quin', 'Qird'];

let notation: Notation = 'names';
export function setNotation(n: Notation) {
  notation = n;
}

function trim(n: number, digits: number) {
  let s = n.toFixed(digits);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s.replace('.', ',');
}

/** 1234 → "1,23 K" · 1.5e40 → "1,5e40" */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 10) return trim(n, n < 1 ? 2 : 1);
  if (n < 1000) return String(Math.floor(n));
  const exp = Math.floor(Math.log10(n));
  const group = Math.floor(exp / 3);
  if (notation === 'names' && group < SUFFIXES.length) {
    const v = n / 10 ** (group * 3);
    return trim(v, v < 10 ? 2 : v < 100 ? 1 : 0) + ' ' + SUFFIXES[group];
  }
  const m = n / 10 ** exp;
  return trim(m, 2) + 'e' + exp;
}

/** ganze Zahlen ohne Nachkommastellen */
export function fmtInt(n: number) {
  return n < 1000 ? String(Math.floor(n)) : fmt(n);
}

export function fmtTime(sec: number): string {
  if (!Number.isFinite(sec)) return '∞';
  sec = Math.max(0, Math.round(sec));
  if (sec < 60) return `${sec} s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ${m % 60} min`;
  const d = Math.floor(h / 24);
  if (d < 365) return `${d} Tage ${h % 24} h`;
  return `${fmt(d / 365)} Jahre`;
}

/** 1.5 → "×1,5" · 0.8 → "×0,8" */
export function fmtMult(v: number) {
  return '×' + trim(v, v >= 100 ? 0 : 2);
}

export function fmtPercent(v: number) {
  return trim(v * 100, v * 100 < 10 ? 1 : 0) + ' %';
}
