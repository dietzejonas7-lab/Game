// Prüft die Inhalts-Datei auf Fehler.
// Wird im Spiel benutzt (kaputte Online-Inhalte werden ignoriert) UND vom
// Befehl `npm run check:content`, bevor neue Inhalte online gehen.
// Diese Datei darf nur "import type" verwenden, damit Node sie direkt ausführen kann.
import type { GameContent, Reward } from './types';

const SHAPES = [
  'round', 'bun', 'heart', 'star', 'cat', 'bear', 'bunny', 'drop', 'cloud', 'peach',
  'strawberry', 'toast', 'egg', 'ghost', 'frog', 'pear', 'blob',
];
const MATERIALS = ['foam', 'mochi', 'jelly', 'gel'];
const RARITIES = ['common', 'rare', 'epic', 'legendary', 'mythic'];
const DECOS = [
  'sprinkles', 'seeds', 'icing', 'leaf', 'stripes', 'spots', 'stars', 'glitter',
  'belly', 'ears', 'hole', 'ring', 'crust', 'heart',
];
const COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function validateContent(c: unknown): string[] {
  const errors: string[] = [];
  const err = (m: string) => errors.push(m);
  if (!c || typeof c !== 'object') return ['Inhalt ist kein JSON-Objekt'];
  const g = c as GameContent;

  for (const key of ['rarities', 'sets', 'squishies', 'boxes', 'products', 'coinOffers', 'quests', 'dailyRewards', 'scenes', 'news'] as const) {
    if (!Array.isArray(g[key])) err(`"${key}" fehlt oder ist keine Liste`);
  }
  if (errors.length) return errors;
  if (typeof g.contentVersion !== 'number') err('"contentVersion" muss eine Zahl sein');
  if (!g.levels || typeof g.levels.xpBase !== 'number') err('"levels.xpBase" fehlt');

  const color = (where: string, v: unknown) => {
    if (typeof v !== 'string' || !COLOR_RE.test(v)) err(`${where}: "${String(v)}" ist keine gültige Farbe (z.B. "#ff88aa")`);
  };
  const unique = (list: { id: string }[], what: string) => {
    const seen = new Set<string>();
    for (const x of list) {
      if (!x.id || typeof x.id !== 'string') err(`${what}: Eintrag ohne "id"`);
      else if (seen.has(x.id)) err(`${what}: "id" doppelt vergeben: ${x.id}`);
      seen.add(x.id);
    }
    return seen;
  };

  for (const r of g.rarities) {
    if (!RARITIES.includes(r.id)) err(`Seltenheit "${r.id}" unbekannt (erlaubt: ${RARITIES.join(', ')})`);
    color(`Seltenheit ${r.id}`, r.color);
  }
  const setIds = unique(g.sets, 'Sammlungen');
  const squishyIds = unique(g.squishies, 'Squishys');
  const boxIds = unique(g.boxes, 'Boxen');
  unique(g.quests, 'Quests');
  unique(g.scenes, 'Szenen');
  unique(g.coinOffers, 'Münz-Angebote');

  const checkReward = (where: string, r: Reward | undefined) => {
    if (!r) return;
    if (r.box && !boxIds.has(r.box)) err(`${where}: Box "${r.box}" gibt es nicht`);
    if (r.squishy && !squishyIds.has(r.squishy)) err(`${where}: Squishy "${r.squishy}" gibt es nicht`);
  };

  for (const s of g.squishies) {
    const w = `Squishy "${s.id}"`;
    if (!s.name) err(`${w}: "name" fehlt`);
    if (!setIds.has(s.set)) err(`${w}: Sammlung "${s.set}" gibt es nicht`);
    if (!RARITIES.includes(s.rarity)) err(`${w}: Seltenheit "${s.rarity}" unbekannt`);
    if (!MATERIALS.includes(s.material)) err(`${w}: Material "${s.material}" unbekannt (erlaubt: ${MATERIALS.join(', ')})`);
    if (typeof s.shape === 'string' && !SHAPES.includes(s.shape)) err(`${w}: Form "${s.shape}" unbekannt (erlaubt: ${SHAPES.join(', ')})`);
    if (!s.colors) err(`${w}: "colors" fehlt`);
    else {
      color(`${w} colors.body`, s.colors.body);
      if (s.colors.body2) color(`${w} colors.body2`, s.colors.body2);
      if (s.colors.accent) color(`${w} colors.accent`, s.colors.accent);
    }
    for (const d of s.decorations ?? []) {
      if (!DECOS.includes(d.type)) err(`${w}: Deko "${d.type}" unbekannt (erlaubt: ${DECOS.join(', ')})`);
      if ('color' in d && d.color) color(`${w} Deko ${d.type}`, d.color);
    }
  }
  for (const set of g.sets) {
    if (!g.squishies.some((s) => s.set === set.id)) err(`Sammlung "${set.id}" enthält keine Squishys`);
    checkReward(`Sammlung "${set.id}"`, set.reward);
  }
  for (const b of g.boxes) {
    const w = `Box "${b.id}"`;
    const total = Object.values(b.odds ?? {}).reduce((a, x) => a + (x ?? 0), 0);
    if (total <= 0) err(`${w}: "odds" (Wahrscheinlichkeiten) fehlen`);
    for (const r of Object.keys(b.odds ?? {})) if (!RARITIES.includes(r)) err(`${w}: Seltenheit "${r}" unbekannt`);
    for (const sid of b.sets ?? []) if (!setIds.has(sid)) err(`${w}: Sammlung "${sid}" gibt es nicht`);
    if (!b.cost) err(`${w}: "cost" fehlt`);
    color(`${w}`, b.color);
    for (const r of Object.keys(b.odds ?? {})) {
      const pool = g.squishies.filter((s) => s.rarity === r && (!b.sets?.length || b.sets.includes(s.set)));
      if ((b.odds as Record<string, number>)[r] > 0 && pool.length === 0) err(`${w}: es gibt kein Squishy der Seltenheit "${r}" für diese Box`);
    }
  }
  for (const q of g.quests) checkReward(`Quest "${q.id}"`, q.reward);
  g.dailyRewards.forEach((r, i) => checkReward(`Tagesbelohnung ${i + 1}`, r));
  for (const m of g.levels?.milestones ?? []) checkReward(`Level-Meilenstein ${m.level}`, m.reward);
  checkReward('Belohnung pro Level', g.levels?.rewardPerLevel);
  for (const id of g.starter?.squishies ?? []) if (!squishyIds.has(id)) err(`Start-Squishy "${id}" gibt es nicht`);
  for (const sc of g.scenes) {
    color(`Szene ${sc.id} bgTop`, sc.bgTop);
    color(`Szene ${sc.id} bgBottom`, sc.bgBottom);
    color(`Szene ${sc.id} table`, sc.table);
  }
  if (!g.scenes.some((s) => s.unlockLevel <= 1)) err('Mindestens eine Szene braucht unlockLevel 1');
  return errors;
}
