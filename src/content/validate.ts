// ===========================================================================
// Prüft content.json auf Fehler (Tippfehler, falsche Namen, fehlende Felder).
// Wird benutzt: in der App (kaputte Inhalte werden ignoriert) und von
// "npm run check:content" bzw. automatisch auf GitHub.
// ===========================================================================
import type { Effect, Requirement } from './types';

const EFFECT_TYPES = [
  'producerMult', 'resourceMult', 'globalMult', 'clickMult', 'clickSeconds', 'entropyMult', 'maxEntropyMult',
  'costMult', 'synergy', 'offlineHours', 'anomalyRate', 'anomalyPower', 'autobuy', 'autoCollapse',
  'startResources', 'prestigeMult',
];
const MULT_TYPES = EFFECT_TYPES.filter((t) => t.endsWith('Mult') || t === 'anomalyRate' || t === 'anomalyPower');
const VISUALS = ['singularity', 'plasma', 'atoms', 'stars', 'galaxy', 'life', 'mind'];
const ANOMALY_KINDS = ['burst', 'frenzy', 'clickFrenzy', 'entropyDrop'];
const ID_RE = /^[a-z0-9_]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* eslint-disable @typescript-eslint/no-explicit-any */
export function validateContent(raw: unknown): string[] {
  const errors: string[] = [];
  const err = (where: string, msg: string) => errors.push(`${where}: ${msg}`);
  if (!raw || typeof raw !== 'object') return ['Die Datei ist kein Objekt { … }'];
  const c = raw as any;

  const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  const isPos = (v: unknown) => isNum(v) && (v as number) > 0;
  const isStr = (v: unknown) => typeof v === 'string' && v.length > 0;

  if (!isNum(c.contentVersion)) err('contentVersion', 'muss eine Zahl sein');
  if (!isNum(c.minAppVersion)) err('minAppVersion', 'muss eine Zahl sein');

  const lists = ['resources', 'epochs', 'producers', 'upgrades', 'laws', 'eternals', 'achievements', 'anomalies', 'events', 'news'];
  for (const l of lists) {
    if (!Array.isArray(c[l])) {
      err(l, 'muss eine Liste [ … ] sein');
      c[l] = [];
    }
  }

  // ---------- IDs sammeln ----------
  const ids: Record<string, Set<string>> = {};
  for (const l of lists) {
    ids[l] = new Set();
    c[l].forEach((x: any, i: number) => {
      const where = `${l}[${i}]`;
      if (!x || typeof x !== 'object') return err(where, 'ist kein Objekt');
      if (!isStr(x.id) || !ID_RE.test(x.id)) err(where, `"id" fehlt oder enthält ungültige Zeichen (nur a-z, 0-9, _): ${JSON.stringify(x.id)}`);
      else if (ids[l].has(x.id)) err(where, `"id" "${x.id}" gibt es doppelt`);
      else ids[l].add(x.id);
      if (l !== 'news' && !isStr(x.name)) err(where + ` (${x.id})`, '"name" fehlt');
    });
  }
  const res = ids.resources;
  const prod = ids.producers;
  const epochs = ids.epochs;
  const upg = ids.upgrades;

  const checkAmounts = (where: string, a: unknown, allowZero = false) => {
    if (!a || typeof a !== 'object') return err(where, 'muss ein Objekt wie { "energy": 10 } sein');
    for (const [k, v] of Object.entries(a)) {
      if (!res.has(k)) err(where, `unbekannte Ressource "${k}"`);
      if (!(allowZero ? isNum(v) && (v as number) >= 0 : isPos(v))) err(where, `Menge bei "${k}" muss eine positive Zahl sein`);
    }
  };

  const checkReq = (where: string, r: Requirement | undefined) => {
    if (r === undefined) return;
    if (!r || typeof r !== 'object') return err(where, 'Bedingung muss ein Objekt sein');
    if (r.resources) checkAmounts(where + '.resources', r.resources);
    if (r.totals) checkAmounts(where + '.totals', r.totals);
    if (r.lifetime) checkAmounts(where + '.lifetime', r.lifetime);
    if (r.producers) {
      for (const [k, v] of Object.entries(r.producers)) {
        if (!prod.has(k)) err(where, `unbekannte Struktur "${k}"`);
        if (!isPos(v)) err(where, `Anzahl bei "${k}" muss positiv sein`);
      }
    }
    if (r.upgrades) {
      if (!Array.isArray(r.upgrades)) err(where, '"upgrades" muss eine Liste sein');
      else for (const u of r.upgrades) if (!upg.has(u)) err(where, `unbekannte Forschung "${u}"`);
    }
    for (const k of ['epoch', 'epochEver'] as const) {
      if (r[k] !== undefined && !epochs.has(r[k]!)) err(where, `unbekannte Epoche "${r[k]}"`);
    }
    for (const k of ['universes', 'heatDeaths', 'clicks', 'anomalies'] as const) {
      if (r[k] !== undefined && !(isNum(r[k]) && r[k]! >= 0)) err(where, `"${k}" muss eine Zahl sein`);
    }
  };

  const checkEffects = (where: string, list: unknown, onlyMult = false) => {
    if (!Array.isArray(list)) return err(where, '"effects" muss eine Liste sein');
    list.forEach((e: Effect, i: number) => {
      const w = `${where}.effects[${i}]`;
      if (!e || !EFFECT_TYPES.includes(e.type)) return err(w, `unbekannter Effekt-Typ "${e?.type}". Erlaubt: ${EFFECT_TYPES.join(', ')}`);
      if (onlyMult && !MULT_TYPES.includes(e.type)) err(w, `bei Naturgesetzen sind nur Multiplikatoren erlaubt (${MULT_TYPES.join(', ')})`);
      const needsValue = e.type !== 'autobuy' && e.type !== 'autoCollapse';
      if (needsValue && !isPos(e.value)) err(w, '"value" muss eine positive Zahl sein');
      switch (e.type) {
        case 'producerMult':
          if (!prod.has(e.target!)) err(w, `unbekannte Struktur "${e.target}"`);
          break;
        case 'resourceMult':
        case 'startResources':
          if (!res.has(e.target!)) err(w, `unbekannte Ressource "${e.target}"`);
          break;
        case 'entropyMult':
        case 'costMult':
          if (e.target !== undefined && !prod.has(e.target) && !epochs.has(e.target)) err(w, `"target" muss eine Struktur oder Epoche sein: "${e.target}"`);
          break;
        case 'synergy':
          if (!res.has(e.source!)) err(w, `unbekannte Ressource bei "source": "${e.source}"`);
          if (!res.has(e.target!)) err(w, `unbekannte Ressource bei "target": "${e.target}"`);
          break;
        case 'autobuy':
          if (!epochs.has(e.target!)) err(w, `unbekannte Epoche "${e.target}"`);
          break;
      }
    });
  };

  // ---------- Balance ----------
  const b = c.balance;
  if (!b || typeof b !== 'object') err('balance', 'fehlt');
  else {
    if (b.click) checkAmounts('balance.click', b.click);
    else err('balance.click', 'fehlt');
    if (!b.milestones || !isPos(b.milestones.every) || !isPos(b.milestones.mult)) err('balance.milestones', 'braucht "every" und "mult"');
    if (!isPos(b.maxEntropy)) err('balance.maxEntropy', 'muss positiv sein');
    if (!isNum(b.offlineHours)) err('balance.offlineHours', 'muss eine Zahl sein');
    const p = b.prestige;
    if (!p || typeof p !== 'object') err('balance.prestige', 'fehlt');
    else {
      if (!p.sources || typeof p.sources !== 'object') err('balance.prestige.sources', 'fehlt');
      else
        for (const [k, v] of Object.entries(p.sources as Record<string, any>)) {
          if (!res.has(k)) err('balance.prestige.sources', `unbekannte Ressource "${k}"`);
          if (!isPos(v?.threshold) || !isPos(v?.exponent)) err('balance.prestige.sources.' + k, 'braucht "threshold" und "exponent"');
        }
      if (!isPos(p.heatDeathBonus)) err('balance.prestige.heatDeathBonus', 'muss positiv sein');
      if (!isNum(p.bonusPerPoint)) err('balance.prestige.bonusPerPoint', 'muss eine Zahl sein');
    }
    const a = b.anomalies;
    if (!a || !isPos(a.minSeconds) || !isPos(a.maxSeconds) || !isPos(a.lifetimeSeconds)) err('balance.anomalies', 'braucht minSeconds, maxSeconds, lifetimeSeconds');
  }

  // ---------- Listen ----------
  c.resources.forEach((r: any, i: number) => {
    const w = `resources[${i}] (${r.id})`;
    if (!isStr(r.icon)) err(w, '"icon" fehlt');
    if (!isStr(r.color)) err(w, '"color" fehlt');
  });

  if (c.epochs.length === 0) err('epochs', 'mindestens eine Epoche nötig');
  c.epochs.forEach((e: any, i: number) => {
    const w = `epochs[${i}] (${e.id})`;
    if (!res.has(e.resource)) err(w, `unbekannte Ressource "${e.resource}"`);
    if (!VISUALS.includes(e.visual)) err(w, `"visual" muss eins davon sein: ${VISUALS.join(', ')}`);
    if (!e.colors || !isStr(e.colors.top) || !isStr(e.colors.bottom) || !isStr(e.colors.accent)) err(w, '"colors" braucht top, bottom, accent');
    checkReq(w + '.unlock', e.unlock);
  });

  c.producers.forEach((p: any, i: number) => {
    const w = `producers[${i}] (${p.id})`;
    if (!epochs.has(p.epoch)) err(w, `unbekannte Epoche "${p.epoch}"`);
    checkAmounts(w + '.cost', p.cost);
    checkAmounts(w + '.produces', p.produces);
    if (!(isNum(p.costGrowth) && p.costGrowth > 1)) err(w, '"costGrowth" muss größer als 1 sein (z.B. 1.15)');
    if (!(isNum(p.entropy) && p.entropy >= 0)) err(w, '"entropy" muss eine Zahl ≥ 0 sein');
    checkReq(w + '.unlock', p.unlock);
  });

  c.upgrades.forEach((u: any, i: number) => {
    const w = `upgrades[${i}] (${u.id})`;
    checkAmounts(w + '.cost', u.cost);
    checkReq(w + '.unlock', u.unlock);
    checkEffects(w, u.effects);
  });

  for (const [list, onlyMult] of [['laws', true], ['eternals', false]] as const) {
    c[list].forEach((l: any, i: number) => {
      const w = `${list}[${i}] (${l.id})`;
      if (!(isNum(l.maxLevel) && l.maxLevel >= 0)) err(w, '"maxLevel" muss eine Zahl sein');
      if (list === 'laws' && !(l.maxLevel >= 1)) err(w, '"maxLevel" muss mindestens 1 sein');
      if (!l.cost || !isPos(l.cost.base) || !(isNum(l.cost.growth) && l.cost.growth >= 1)) err(w, '"cost" braucht base und growth');
      checkReq(w + '.unlock', l.unlock);
      checkEffects(w, l.effects, onlyMult);
    });
  }

  c.achievements.forEach((a: any, i: number) => {
    const w = `achievements[${i}] (${a.id})`;
    if (!a.req) err(w, '"req" (Bedingung) fehlt');
    checkReq(w + '.req', a.req);
    checkEffects(w, a.effects ?? []);
  });

  c.anomalies.forEach((a: any, i: number) => {
    const w = `anomalies[${i}] (${a.id})`;
    if (!ANOMALY_KINDS.includes(a.kind)) err(w, `"kind" muss eins davon sein: ${ANOMALY_KINDS.join(', ')}`);
    if (!isPos(a.weight)) err(w, '"weight" muss positiv sein');
    if (!isPos(a.value)) err(w, '"value" muss positiv sein');
    if ((a.kind === 'frenzy' || a.kind === 'clickFrenzy') && !isPos(a.duration)) err(w, '"duration" fehlt');
    checkReq(w + '.unlock', a.unlock);
  });

  for (const list of ['events', 'news']) {
    c[list].forEach((x: any, i: number) => {
      const w = `${list}[${i}] (${x.id})`;
      for (const k of ['from', 'until']) if (x[k] !== undefined && !DATE_RE.test(x[k])) err(w, `"${k}" muss ein Datum wie "2026-12-24" sein`);
      if (list === 'events') checkEffects(w, x.effects);
      if (list === 'news' && (!isStr(x.title) || !isStr(x.text))) err(w, '"title" und "text" nötig');
    });
  }

  return errors;
}
