// ===========================================================================
// Das "Inhalts-Format" des Spiels.
//
// Alles, was im Spiel an Inhalten vorkommt (Squishys, Sammlungen, Boxen,
// Shop-Angebote, Quests, Belohnungen ...), steht NICHT im Programmcode,
// sondern in der Datei public/content/content.json.
// Diese Datei beschreibt, wie die JSON-Datei aufgebaut sein muss.
// ===========================================================================

export type RarityId = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

/** Material bestimmt Physik, Klang und Aussehen-Grundlage eines Squishys. */
export type MaterialId = 'foam' | 'mochi' | 'jelly' | 'gel';

export interface Reward {
  coins?: number;
  gems?: number;
  xp?: number;
  /** ID einer Box, die gratis geöffnet wird */
  box?: string;
  /** ID eines Squishys, das man direkt bekommt */
  squishy?: string;
}

export interface RarityDef {
  id: RarityId;
  name: string;
  color: string;
  /** Münzen, wenn man ein Squishy doppelt bekommt */
  duplicateCoins: number;
  /** XP pro Squish */
  xpPerSquish: number;
  /** Münzen alle 10 Squishes */
  coinsPer10Squishes: number;
}

export interface FaceDef {
  eyes: 'dot' | 'happy' | 'sparkle' | 'sleepy' | 'wink' | 'cross' | 'heart' | 'big';
  mouth: 'smile' | 'cat' | 'o' | 'tongue' | 'grin' | 'none' | 'flat';
  blush?: boolean;
  /** vertikale Position (-1 oben ... 1 unten), Standard 0.05 */
  y?: number;
  /** Größe des Gesichts, Standard 1 */
  scale?: number;
  /** Farbe der Augen/des Mundes */
  color?: string;
}

export type DecorationDef =
  | { type: 'sprinkles'; colors: string[]; count?: number; region?: 'top' | 'all' }
  | { type: 'seeds'; color: string; count?: number }
  | { type: 'icing'; color: string; drips?: number; y?: number }
  | { type: 'leaf'; color: string }
  | { type: 'stripes'; color: string; count?: number; dir?: 'h' | 'v' }
  | { type: 'spots'; color: string; count?: number; size?: number }
  | { type: 'stars'; color: string; count?: number }
  | { type: 'glitter'; color?: string }
  | { type: 'belly'; color: string }
  | { type: 'ears'; color: string }
  | { type: 'hole'; }
  | { type: 'ring'; color: string }
  | { type: 'crust'; color: string }
  | { type: 'heart'; color: string; y?: number; size?: number };

export interface CustomShape {
  /** Liste von [Frequenz, Stärke, Phase] – erzeugt wellige Formen */
  harmonics?: [number, number, number][];
  /** Breite/Höhe-Verhältnis */
  aspect?: number;
}

export interface PhysicsParams {
  /** Wie stark das Squishy in seine Form zurück will (0.01 - 1) */
  stiffness: number;
  /** Wie schnell es nach dem Drücken wieder aufgeht (klein = slow rising) */
  recovery: number;
  /** Wie viel von der Verformung "hängen bleibt" (0 = nichts, 1 = viel) */
  plasticity: number;
  /** Innendruck: hoch = Volumen bleibt erhalten (wölbt sich seitlich aus) */
  pressure: number;
  /** Luftreibung (0.9 - 1) */
  damping: number;
  /** Abprall vom Boden (0 - 1) */
  bounce: number;
  /** Reibung auf dem Boden (0 - 1) */
  friction: number;
}

export interface SoundParams {
  /** Grundtonhöhe (0.5 - 2) */
  pitch: number;
  /** Lautstärke (0 - 1.5) */
  volume: number;
  /** Optionale echte Audio-Aufnahmen (URLs), überschreiben die erzeugten Sounds */
  samples?: { squish?: string[]; release?: string[]; impact?: string[] };
}

export interface SquishyDef {
  id: string;
  name: string;
  set: string;
  rarity: RarityId;
  material: MaterialId;
  /** Name einer eingebauten Form oder eigene Form */
  shape: string | CustomShape;
  /** Größe (0.6 - 1.4), Standard 1 */
  size?: number;
  colors: { body: string; body2?: string; accent?: string };
  face?: FaceDef | null;
  decorations?: DecorationDef[];
  physics?: Partial<PhysicsParams>;
  sound?: Partial<SoundParams>;
  description?: string;
  /** false = nicht (mehr) in Boxen erhältlich */
  available?: boolean;
  /** Zeitlich begrenzt erhältlich (ISO-Datum, z.B. "2026-12-01") */
  availableFrom?: string;
  availableUntil?: string;
}

export interface SetDef {
  id: string;
  name: string;
  icon: string;
  reward: Reward;
}

export interface BoxDef {
  id: string;
  name: string;
  description?: string;
  /** Kosten. free = gratis mit Wartezeit (Minuten) */
  cost: { coins?: number; gems?: number; freeCooldownMinutes?: number };
  /** Gewichte für die Seltenheiten. Werden als Prozent angezeigt (Pflicht im Play Store!) */
  odds: Partial<Record<RarityId, number>>;
  /** Nur Squishys aus diesen Sammlungen (leer = alle) */
  sets?: string[];
  /** Spätestens nach so vielen Boxen ohne mindestens "pity.minRarity" gibt es garantiert eine */
  pity?: { every: number; minRarity: RarityId };
  color: string;
  color2?: string;
  icon?: string;
  unlockLevel?: number;
  /** Zeitlich begrenzte Box */
  availableFrom?: string;
  availableUntil?: string;
}

export interface ProductDef {
  /** Muss genau so in der Google Play Console angelegt werden */
  productId: string;
  name: string;
  gems: number;
  /** Nur Anzeige – der echte Preis kommt später von Google Play */
  priceLabel: string;
  badge?: string;
}

export interface CoinOfferDef {
  id: string;
  name: string;
  coins: number;
  gems: number;
}

export interface QuestTemplate {
  id: string;
  text: string;
  type: 'squish' | 'openBox' | 'throw' | 'collectNew' | 'squishMaterial' | 'squishRarity';
  target: number;
  /** z.B. Material oder Seltenheit für squishMaterial/squishRarity */
  param?: string;
  reward: Reward;
}

export interface SceneDef {
  id: string;
  name: string;
  bgTop: string;
  bgBottom: string;
  table: string;
  unlockLevel: number;
}

export interface NewsDef {
  id: string;
  title: string;
  text: string;
  until?: string;
}

export interface GameContent {
  contentVersion: number;
  /** Ältere App-Versionen ignorieren Inhalte mit höherem minAppVersion */
  minAppVersion: number;
  rarities: RarityDef[];
  sets: SetDef[];
  squishies: SquishyDef[];
  boxes: BoxDef[];
  products: ProductDef[];
  coinOffers: CoinOfferDef[];
  quests: QuestTemplate[];
  questsPerDay: number;
  dailyRewards: Reward[];
  levels: {
    xpBase: number;
    xpGrowth: number;
    maxLevel: number;
    rewardPerLevel: Reward;
    milestones: { level: number; reward: Reward; text?: string }[];
  };
  starThresholds: number[];
  starter: { coins: number; gems: number; squishies: string[] };
  scenes: SceneDef[];
  news: NewsDef[];
}
