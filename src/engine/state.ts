// ===========================================================================
// Der Spielstand: alles, was gespeichert wird.
// ===========================================================================
import type { Amounts } from '../content/types.ts';

export type Notation = 'names' | 'sci';

export interface Settings {
  sound: boolean;
  music: boolean;
  haptics: boolean;
  notation: Notation;
  autobuy: boolean;
  autoCollapse: boolean;
  /** 1, 10, 100 oder -1 (= so viel wie möglich) */
  buyAmount: number;
}

/** Alles, was beim Kollaps (neues Universum) zurückgesetzt wird. */
export interface RunState {
  res: Amounts;
  /** in diesem Universum insgesamt erzeugt */
  totals: Amounts;
  producers: Record<string, number>;
  upgrades: Record<string, boolean>;
  entropy: number;
  /** Wärmetod erreicht? */
  dead: boolean;
  /** Index der erreichten Epoche */
  epoch: number;
  /** Spielzeit in diesem Universum (Sekunden) */
  time: number;
}

export interface SaveState {
  v: number;
  createdAt: number;
  lastTick: number;
  playTime: number;
  run: RunState;
  /** Quintessenz (Prestige-Währung), nicht ausgegeben */
  q: number;
  qTotal: number;
  universes: number;
  heatDeaths: number;
  laws: Record<string, { level: number; setting: number }>;
  eternals: Record<string, number>;
  achievements: Record<string, boolean>;
  lifetime: Amounts;
  maxEpoch: number;
  clicks: number;
  anomalies: number;
  bestGain: number;
  /** schnellstes Universum bis zum Wärmetod (Sekunden, 0 = noch keins) */
  fastestHeatDeath: number;
  settings: Settings;
  seenIntros: Record<string, boolean>;
  seenNews: Record<string, boolean>;
}

export const SAVE_VERSION = 1;

export function newRun(): RunState {
  return { res: {}, totals: {}, producers: {}, upgrades: {}, entropy: 0, dead: false, epoch: 0, time: 0 };
}

export function newSave(now = Date.now()): SaveState {
  return {
    v: SAVE_VERSION,
    createdAt: now,
    lastTick: now,
    playTime: 0,
    run: newRun(),
    q: 0,
    qTotal: 0,
    universes: 0,
    heatDeaths: 0,
    laws: {},
    eternals: {},
    achievements: {},
    lifetime: {},
    maxEpoch: 0,
    clicks: 0,
    anomalies: 0,
    bestGain: 0,
    fastestHeatDeath: 0,
    settings: { sound: true, music: true, haptics: true, notation: 'names', autobuy: true, autoCollapse: false, buyAmount: 1 },
    seenIntros: {},
    seenNews: {},
  };
}

/** Füllt fehlende Felder auf – so funktionieren auch alte Spielstände nach einem Update. */
export function loadSave(raw: string | null): SaveState {
  const fresh = newSave();
  if (!raw) return fresh;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return fresh;
    const merged = { ...fresh, ...data } as SaveState;
    merged.run = { ...newRun(), ...(data.run ?? {}) };
    merged.settings = { ...fresh.settings, ...(data.settings ?? {}) };
    merged.v = SAVE_VERSION;
    return merged;
  } catch {
    return fresh;
  }
}
