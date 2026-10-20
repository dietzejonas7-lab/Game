// ===========================================================================
// So sieht die Datei public/content/content.json aus.
// Jedes Feld ist hier beschrieben – die ANLEITUNG.md erklärt es mit Beispielen.
// ===========================================================================

/** Mengen von Ressourcen, z.B. { "energy": 100, "particles": 5 } */
export type Amounts = Record<string, number>;

/**
 * Bedingung, damit etwas erscheint/freigeschaltet wird.
 * Alle angegebenen Punkte müssen erfüllt sein. Leer = immer erfüllt.
 */
export interface Requirement {
  /** so viel muss man gerade BESITZEN */
  resources?: Amounts;
  /** so viel muss in DIESEM Universum insgesamt erzeugt worden sein */
  totals?: Amounts;
  /** so viel muss in ALLEN Universen zusammen erzeugt worden sein */
  lifetime?: Amounts;
  /** so viele Strukturen muss man besitzen, z.B. { "fluctuation": 10 } */
  producers?: Record<string, number>;
  /** diese Forschungen müssen erforscht sein */
  upgrades?: string[];
  /** diese Epoche muss in diesem Universum erreicht sein */
  epoch?: string;
  /** diese Epoche muss irgendwann schon einmal erreicht worden sein */
  epochEver?: string;
  /** so viele Universen müssen schon kollabiert sein */
  universes?: number;
  /** so oft muss ein Universum den Wärmetod erlebt haben */
  heatDeaths?: number;
  /** so oft muss insgesamt getippt worden sein */
  clicks?: number;
  /** so viele Anomalien müssen eingefangen worden sein */
  anomalies?: number;
}

export type EffectType =
  | 'producerMult' // Struktur (target) produziert value-mal so viel
  | 'resourceMult' // Ressource (target) wird value-mal so viel produziert
  | 'globalMult' // alles wird value-mal so viel produziert
  | 'clickMult' // Tippen gibt value-mal so viel
  | 'clickSeconds' // Tippen gibt zusätzlich value Sekunden der aktuellen Produktion
  | 'entropyMult' // Entropie (optional nur von target = Struktur oder Epoche) × value
  | 'maxEntropyMult' // Grenze bis zum Wärmetod × value
  | 'costMult' // Kosten (target = Struktur, Epoche oder leer = alle) × value
  | 'synergy' // Ressource "source" verstärkt "target": × (1 + value · log10(1 + erzeugte Menge))
  | 'offlineHours' // + value Stunden Offline-Fortschritt
  | 'anomalyRate' // Anomalien erscheinen value-mal so oft
  | 'anomalyPower' // Anomalien wirken value-mal so stark
  | 'autobuy' // Auto-Kauf für alle Strukturen der Epoche (target)
  | 'autoCollapse' // Universum kollabiert beim Wärmetod automatisch
  | 'startResources' // jedes neue Universum startet mit + value von target
  | 'prestigeMult'; // Quintessenz-Gewinn × value

export interface Effect {
  type: EffectType;
  target?: string;
  source?: string;
  value?: number;
}

export interface ResourceDef {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export type EpochVisual = 'singularity' | 'plasma' | 'atoms' | 'stars' | 'galaxy' | 'life' | 'mind';

export interface EpochDef {
  id: string;
  name: string;
  /** Hauptressource dieser Epoche */
  resource: string;
  /** wann die Epoche beginnt (die erste Epoche hat keine Bedingung) */
  unlock?: Requirement;
  /** welches Bild in der Mitte gezeigt wird */
  visual: EpochVisual;
  /** Farben des Hintergrunds: oben, unten, Akzent */
  colors: { top: string; bottom: string; accent: string };
  /** Text, der beim ersten Erreichen erscheint */
  intro: string;
}

export interface ProducerDef {
  id: string;
  name: string;
  icon: string;
  epoch: string;
  desc: string;
  /** Preis der ersten Einheit */
  cost: Amounts;
  /** jede weitere Einheit kostet so viel mal mehr (z.B. 1.15 = +15 %) */
  costGrowth: number;
  /** Produktion pro Sekunde und Einheit */
  produces: Amounts;
  /** Entropie pro Sekunde und Einheit */
  entropy: number;
  /** zusätzliche Bedingung zum Anzeigen */
  unlock?: Requirement;
}

export interface UpgradeDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  cost: Amounts;
  unlock?: Requirement;
  effects: Effect[];
}

/** Ein Naturgesetz: Regler von -Stufe bis +Stufe. Jeder Punkt wendet die Effekte einmal an. */
export interface LawDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  unlock?: Requirement;
  maxLevel: number;
  /** Preis in Quintessenz für Stufe n: base · growth^(n-1) */
  cost: { base: number; growth: number };
  /** nur Multiplikator-Effekte (…Mult). Werden bei Regler +2 zweimal, bei -1 umgekehrt angewendet. */
  effects: Effect[];
}

/** Dauerhafte Verbesserung, bleibt über alle Universen. */
export interface EternalDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  unlock?: Requirement;
  /** 0 = unbegrenzt */
  maxLevel: number;
  /** Preis für die nächste Stufe: base · growth^(aktuelle Stufe) */
  cost: { base: number; growth: number };
  /** pro Stufe */
  effects: Effect[];
}

export interface AchievementDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  req: Requirement;
  effects: Effect[];
}

export type AnomalyKind = 'burst' | 'frenzy' | 'clickFrenzy' | 'entropyDrop';

export interface AnomalyDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  /** Häufigkeit im Vergleich zu den anderen */
  weight: number;
  /** burst: value Sekunden Produktion sofort · frenzy: Produktion × value · clickFrenzy: Tippen × value · entropyDrop: Entropie -value (Anteil, 0.2 = 20 %) */
  kind: AnomalyKind;
  value: number;
  /** Dauer in Sekunden (für frenzy und clickFrenzy) */
  duration?: number;
  unlock?: Requirement;
}

/** Zeitlich begrenzte Aktion, z.B. Wochenende mit doppelter Produktion */
export interface EventDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  /** Datum wie "2026-10-25" (leer = sofort) */
  from?: string;
  /** Datum wie "2026-11-02" (leer = für immer) */
  until?: string;
  effects: Effect[];
}

export interface NewsDef {
  id: string;
  title: string;
  text: string;
  from?: string;
  until?: string;
}

export interface Balance {
  /** Was ein Tipp ohne Verbesserungen bringt */
  click: Amounts;
  /** Bei jeder x-ten Einheit einer Struktur: Produktion dieser Struktur × mult */
  milestones: { every: number; mult: number };
  /** Grenze bis zum Wärmetod (wird mit Verbesserungen größer) */
  maxEntropy: number;
  prestige: {
    name: string;
    icon: string;
    /** Gewinn = Summe über alle Quellen von (erzeugte Menge / threshold)^exponent */
    sources: Record<string, { threshold: number; exponent: number }>;
    /** Bonus, wenn das Universum bis zum Wärmetod gelebt hat (1.5 = +50 %) */
    heatDeathBonus: number;
    /** Jede nicht ausgegebene Quintessenz erhöht die Produktion um so viel (0.02 = +2 %) */
    bonusPerPoint: number;
  };
  /** Offline-Fortschritt in Stunden (ohne Verbesserungen) */
  offlineHours: number;
  anomalies: { minSeconds: number; maxSeconds: number; lifetimeSeconds: number };
}

export interface GameContent {
  /** bei JEDER Änderung um 1 erhöhen */
  contentVersion: number;
  /** braucht mindestens diese App-Version (siehe src/config.ts) */
  minAppVersion: number;
  balance: Balance;
  resources: ResourceDef[];
  epochs: EpochDef[];
  producers: ProducerDef[];
  upgrades: UpgradeDef[];
  laws: LawDef[];
  eternals: EternalDef[];
  achievements: AchievementDef[];
  anomalies: AnomalyDef[];
  events: EventDef[];
  news: NewsDef[];
}
