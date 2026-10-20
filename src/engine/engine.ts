// ===========================================================================
// Die Spiel-Logik. Kein Bildschirm, kein Sound – nur Regeln und Zahlen.
// (Darum kann scripts/simulate.ts das Spiel auch ohne Browser durchspielen.)
//
// Ablauf pro Bild (ca. 60× pro Sekunde): tick(dt)
//   → Ressourcen wachsen, Entropie steigt, Anomalien erscheinen
//   → einmal pro Sekunde: neue Epochen, Entdeckungen, Auto-Kauf prüfen
// ===========================================================================
import type {
  AchievementDef, Amounts, AnomalyDef, Effect, EpochDef, EternalDef, GameContent, LawDef, ProducerDef, Requirement,
  UpgradeDef,
} from '../content/types.ts';
import { newRun, type SaveState } from './state.ts';

/** Alle Boni zusammengerechnet */
export interface Mods {
  prod: Record<string, number>;
  res: Record<string, number>;
  global: number;
  click: number;
  clickSeconds: number;
  entropy: number;
  entropyT: Record<string, number>;
  maxEntropy: number;
  cost: Record<string, number>;
  synergies: { source: string; target: string; factor: number }[];
  offlineHours: number;
  anomalyRate: number;
  anomalyPower: number;
  autobuy: Set<string>;
  autoCollapse: boolean;
  start: Amounts;
  prestige: number;
}

export interface ActiveAnomaly {
  def: AnomalyDef;
  /** Position 0..1 auf der Spielfläche */
  x: number;
  y: number;
  expires: number;
}

export interface Buff {
  kind: 'frenzy' | 'clickFrenzy';
  mult: number;
  remaining: number;
  duration: number;
  name: string;
  icon: string;
}

export type GameEvent =
  | { type: 'epoch'; epoch: EpochDef; first: boolean }
  | { type: 'achievement'; def: AchievementDef }
  | { type: 'heatDeath' }
  | { type: 'anomalySpawn'; anomaly: ActiveAnomaly }
  | { type: 'collapse'; gain: number; auto: boolean };

export function isWithin(from?: string, until?: string, now = new Date()) {
  const t = now.getTime();
  if (from && t < new Date(from + 'T00:00:00').getTime()) return false;
  if (until && t > new Date(until + 'T23:59:59').getTime()) return false;
  return true;
}

const MULT = new Set(['producerMult', 'resourceMult', 'globalMult', 'clickMult', 'entropyMult', 'maxEntropyMult', 'costMult', 'anomalyRate', 'anomalyPower', 'prestigeMult']);

export class Engine {
  content!: GameContent;
  s: SaveState;
  mods!: Mods;
  /** Produktion pro Sekunde je Ressource */
  rates: Amounts = {};
  entropyRate = 0;
  anomaly: ActiveAnomaly | null = null;
  buffs: Buff[] = [];
  /** true während der Offline-Berechnung (keine Anomalien, keine Fenster) */
  offline = false;

  private producerById = new Map<string, ProducerDef>();
  private epochIndex = new Map<string, number>();
  private listeners: ((e: GameEvent) => void)[] = [];
  private dirty = true;
  private slowTimer = 0;
  private eventTimer = 0;
  private nextAnomaly = 0;
  private time = 0;

  constructor(content: GameContent, save: SaveState) {
    this.s = save;
    this.setContent(content);
    this.nextAnomaly = this.rollAnomalyDelay();
  }

  setContent(c: GameContent) {
    this.content = c;
    this.producerById = new Map(c.producers.map((p) => [p.id, p]));
    this.epochIndex = new Map(c.epochs.map((e, i) => [e.id, i]));
    this.s.run.epoch = Math.min(this.s.run.epoch, c.epochs.length - 1);
    this.dirty = true;
    this.recompute();
    this.computeRates();
  }

  on(fn: (e: GameEvent) => void) {
    this.listeners.push(fn);
  }

  private emit(e: GameEvent) {
    for (const l of this.listeners) l(e);
  }

  /** nach jedem Kauf aufrufen, damit Boni neu berechnet werden */
  invalidate() {
    this.dirty = true;
  }

  // ------------------------------------------------------------------------
  // Nachschlagen
  // ------------------------------------------------------------------------
  producer(id: string) {
    return this.producerById.get(id);
  }
  get epoch(): EpochDef {
    return this.content.epochs[this.s.run.epoch];
  }
  epochIdx(id: string) {
    return this.epochIndex.get(id) ?? 999;
  }
  count(id: string) {
    return this.s.run.producers[id] ?? 0;
  }
  amount(res: string) {
    return this.s.run.res[res] ?? 0;
  }
  lawLevel(id: string) {
    return this.s.laws[id]?.level ?? 0;
  }
  lawSetting(id: string) {
    const l = this.s.laws[id];
    if (!l) return 0;
    return Math.max(-l.level, Math.min(l.level, l.setting));
  }
  eternalLevel(id: string) {
    return this.s.eternals[id] ?? 0;
  }

  meets(r?: Requirement): boolean {
    if (!r) return true;
    const s = this.s;
    const run = s.run;
    if (r.resources) for (const k in r.resources) if ((run.res[k] ?? 0) < r.resources[k]) return false;
    if (r.totals) for (const k in r.totals) if ((run.totals[k] ?? 0) < r.totals[k]) return false;
    if (r.lifetime) for (const k in r.lifetime) if ((s.lifetime[k] ?? 0) < r.lifetime[k]) return false;
    if (r.producers) for (const k in r.producers) if ((run.producers[k] ?? 0) < r.producers[k]) return false;
    if (r.upgrades) for (const u of r.upgrades) if (!run.upgrades[u]) return false;
    if (r.epoch !== undefined && this.epochIdx(r.epoch) > run.epoch) return false;
    if (r.epochEver !== undefined && this.epochIdx(r.epochEver) > s.maxEpoch) return false;
    if (r.universes !== undefined && s.universes < r.universes) return false;
    if (r.heatDeaths !== undefined && s.heatDeaths < r.heatDeaths) return false;
    if (r.clicks !== undefined && s.clicks < r.clicks) return false;
    if (r.anomalies !== undefined && s.anomalies < r.anomalies) return false;
    return true;
  }

  /** Struktur sichtbar? (Epoche erreicht + Bedingung erfüllt) */
  producerVisible(p: ProducerDef) {
    return this.epochIdx(p.epoch) <= this.s.run.epoch && this.meets(p.unlock);
  }
  upgradeVisible(u: UpgradeDef) {
    return !this.s.run.upgrades[u.id] && this.meets(u.unlock);
  }

  // ------------------------------------------------------------------------
  // Boni berechnen
  // ------------------------------------------------------------------------
  recompute() {
    const c = this.content;
    const b = c.balance;
    const m: Mods = {
      prod: {}, res: {}, global: 1, click: 1, clickSeconds: 0, entropy: 1, entropyT: {}, maxEntropy: 1, cost: {},
      synergies: [], offlineHours: b.offlineHours, anomalyRate: 1, anomalyPower: 1, autobuy: new Set(),
      autoCollapse: false, start: {}, prestige: 1,
    };
    const mul = (obj: Record<string, number>, key: string, v: number) => {
      obj[key] = (obj[key] ?? 1) * v;
    };
    const apply = (e: Effect, power: number) => {
      const v = e.value ?? 1;
      const f = MULT.has(e.type) ? Math.pow(v, power) : v * power;
      switch (e.type) {
        case 'producerMult': mul(m.prod, e.target!, f); break;
        case 'resourceMult': mul(m.res, e.target!, f); break;
        case 'globalMult': m.global *= f; break;
        case 'clickMult': m.click *= f; break;
        case 'clickSeconds': m.clickSeconds += f; break;
        case 'entropyMult':
          if (e.target) mul(m.entropyT, e.target, f);
          else m.entropy *= f;
          break;
        case 'maxEntropyMult': m.maxEntropy *= f; break;
        case 'costMult': mul(m.cost, e.target ?? '*', f); break;
        case 'synergy': m.synergies.push({ source: e.source!, target: e.target!, factor: f }); break;
        case 'offlineHours': m.offlineHours += f; break;
        case 'anomalyRate': m.anomalyRate *= f; break;
        case 'anomalyPower': m.anomalyPower *= f; break;
        case 'autobuy': if (power > 0) m.autobuy.add(e.target!); break;
        case 'autoCollapse': if (power > 0) m.autoCollapse = true; break;
        case 'startResources': m.start[e.target!] = (m.start[e.target!] ?? 0) + f; break;
        case 'prestigeMult': m.prestige *= f; break;
      }
    };
    const s = this.s;
    for (const u of c.upgrades) if (s.run.upgrades[u.id]) for (const e of u.effects) apply(e, 1);
    for (const l of c.laws) {
      const set = this.lawSetting(l.id);
      if (set !== 0) for (const e of l.effects) apply(e, set);
    }
    for (const et of c.eternals) {
      const lvl = Math.min(this.eternalLevel(et.id), et.maxLevel || Infinity);
      if (lvl > 0) for (const e of et.effects) apply(e, lvl);
    }
    for (const a of c.achievements) if (s.achievements[a.id]) for (const e of a.effects) apply(e, 1);
    for (const ev of this.activeEvents()) for (const e of ev.effects) apply(e, 1);
    m.global *= 1 + s.q * b.prestige.bonusPerPoint;
    this.mods = m;
    this.dirty = false;
  }

  activeEvents() {
    return this.content.events.filter((e) => isWithin(e.from, e.until));
  }

  /** Bonus durch nicht ausgegebene Quintessenz */
  quintBonus() {
    return this.s.q * this.content.balance.prestige.bonusPerPoint;
  }

  milestoneMult(count: number) {
    const ms = this.content.balance.milestones;
    return Math.pow(ms.mult, Math.floor(count / ms.every));
  }

  /** Produktion EINER Einheit pro Sekunde (mit allen Boni) */
  unitRate(p: ProducerDef): Amounts {
    const out: Amounts = {};
    const m = this.mods;
    const base = (m.prod[p.id] ?? 1) * this.milestoneMult(this.count(p.id));
    for (const r in p.produces) out[r] = p.produces[r] * base * this.resMult(r);
    return out;
  }

  unitEntropy(p: ProducerDef) {
    const m = this.mods;
    return p.entropy * m.entropy * (m.entropyT[p.id] ?? 1) * (m.entropyT[p.epoch] ?? 1);
  }

  /** Gesamt-Multiplikator für eine Ressource (ohne strukturspezifische Boni) */
  resMult(r: string) {
    const m = this.mods;
    let v = (m.res[r] ?? 1) * m.global * this.frenzyMult();
    for (const sy of m.synergies) {
      if (sy.target === r) v *= 1 + sy.factor * Math.log10(1 + (this.s.run.totals[sy.source] ?? 0));
    }
    return v;
  }

  frenzyMult() {
    let v = 1;
    for (const b of this.buffs) if (b.kind === 'frenzy') v *= b.mult;
    return v;
  }

  clickFrenzyMult() {
    let v = 1;
    for (const b of this.buffs) if (b.kind === 'clickFrenzy') v *= b.mult;
    return v;
  }

  computeRates() {
    if (this.dirty) this.recompute();
    const rates: Amounts = {};
    let ent = 0;
    const run = this.s.run;
    if (!run.dead) {
      for (const p of this.content.producers) {
        const n = run.producers[p.id];
        if (!n) continue;
        const base = n * (this.mods.prod[p.id] ?? 1) * this.milestoneMult(n);
        for (const r in p.produces) rates[r] = (rates[r] ?? 0) + p.produces[r] * base;
        ent += n * this.unitEntropy(p);
      }
      for (const r in rates) rates[r] *= this.resMult(r);
    }
    this.rates = rates;
    this.entropyRate = ent;
  }

  maxEntropy() {
    return this.content.balance.maxEntropy * this.mods.maxEntropy;
  }

  /** Sekunden bis zum Wärmetod (Infinity, wenn keine Entropie entsteht) */
  timeToHeatDeath() {
    if (this.s.run.dead) return 0;
    if (this.entropyRate <= 0) return Infinity;
    return (this.maxEntropy() - this.s.run.entropy) / this.entropyRate;
  }

  // ------------------------------------------------------------------------
  // Kosten
  // ------------------------------------------------------------------------
  costMult(p: ProducerDef) {
    const c = this.mods.cost;
    return (c['*'] ?? 1) * (c[p.id] ?? 1) * (c[p.epoch] ?? 1);
  }

  /** Preis für die nächsten k Einheiten */
  producerCost(p: ProducerDef, k = 1): Amounts {
    const n = this.count(p.id);
    const g = p.costGrowth;
    const f = Math.pow(g, n) * ((Math.pow(g, k) - 1) / (g - 1)) * this.costMult(p);
    const out: Amounts = {};
    for (const r in p.cost) out[r] = p.cost[r] * f;
    return out;
  }

  /** Wie viele Einheiten kann man sich gerade leisten? */
  maxAffordable(p: ProducerDef, cap = 100000) {
    const n = this.count(p.id);
    const g = p.costGrowth;
    let k = cap;
    for (const r in p.cost) {
      const first = p.cost[r] * Math.pow(g, n) * this.costMult(p);
      const have = this.amount(r);
      if (have < first) return 0;
      k = Math.min(k, Math.floor(Math.log(1 + (have * (g - 1)) / first) / Math.log(g)));
    }
    while (k > 0 && !this.canAfford(this.producerCost(p, k))) k--;
    return k;
  }

  canAfford(cost: Amounts) {
    for (const r in cost) if (this.amount(r) < cost[r] * (1 - 1e-12)) return false;
    return true;
  }

  private pay(cost: Amounts) {
    for (const r in cost) this.s.run.res[r] = Math.max(0, this.amount(r) - cost[r]);
  }

  // ------------------------------------------------------------------------
  // Aktionen
  // ------------------------------------------------------------------------
  /** Tipp auf die Mitte. Gibt zurück, was es gebracht hat. */
  click(): Amounts {
    const gain: Amounts = {};
    if (this.s.run.dead) return gain;
    this.computeRates();
    const m = this.mods;
    const cf = this.clickFrenzyMult();
    for (const r in this.content.balance.click) gain[r] = this.content.balance.click[r] * m.click * cf;
    if (m.clickSeconds > 0) for (const r in this.rates) gain[r] = (gain[r] ?? 0) + this.rates[r] * m.clickSeconds * cf;
    for (const r in gain) this.add(r, gain[r]);
    this.s.clicks++;
    return gain;
  }

  /** amount: Anzahl oder -1 für "so viele wie möglich". Gibt die gekaufte Anzahl zurück. */
  buyProducer(id: string, amount: number): number {
    const p = this.producer(id);
    if (!p || !this.producerVisible(p)) return 0;
    if (this.dirty) this.recompute();
    const k = amount < 0 ? this.maxAffordable(p) : amount;
    if (k <= 0) return 0;
    const cost = this.producerCost(p, k);
    if (!this.canAfford(cost)) return 0;
    this.pay(cost);
    this.s.run.producers[id] = this.count(id) + k;
    this.computeRates();
    return k;
  }

  buyUpgrade(id: string): boolean {
    const u = this.content.upgrades.find((x) => x.id === id);
    if (!u || !this.upgradeVisible(u) || !this.canAfford(u.cost)) return false;
    this.pay(u.cost);
    this.s.run.upgrades[id] = true;
    this.dirty = true;
    this.computeRates();
    return true;
  }

  lawCost(l: LawDef) {
    return Math.ceil(l.cost.base * Math.pow(l.cost.growth, this.lawLevel(l.id)));
  }

  /** Nächste Stufe eines Naturgesetzes freischalten (Quintessenz) */
  buyLawLevel(id: string): boolean {
    const l = this.content.laws.find((x) => x.id === id);
    if (!l || !this.meets(l.unlock) || this.lawLevel(id) >= l.maxLevel) return false;
    const cost = this.lawCost(l);
    if (this.s.q < cost) return false;
    this.s.q -= cost;
    const cur = this.s.laws[id] ?? { level: 0, setting: 0 };
    this.s.laws[id] = { level: cur.level + 1, setting: cur.setting };
    this.dirty = true;
    return true;
  }

  eternalCost(e: EternalDef) {
    return Math.ceil(e.cost.base * Math.pow(e.cost.growth, this.eternalLevel(e.id)));
  }

  buyEternal(id: string): boolean {
    const e = this.content.eternals.find((x) => x.id === id);
    if (!e || !this.meets(e.unlock)) return false;
    if (e.maxLevel > 0 && this.eternalLevel(id) >= e.maxLevel) return false;
    const cost = this.eternalCost(e);
    if (this.s.q < cost) return false;
    this.s.q -= cost;
    this.s.eternals[id] = this.eternalLevel(id) + 1;
    this.dirty = true;
    this.computeRates();
    return true;
  }

  /** So viel Quintessenz gäbe es jetzt beim Kollaps */
  prestigeGain(): number {
    const p = this.content.balance.prestige;
    let g = 0;
    for (const r in p.sources) {
      const src = p.sources[r];
      const t = this.s.run.totals[r] ?? 0;
      if (t > 0) g += Math.pow(t / src.threshold, src.exponent);
    }
    if (this.dirty) this.recompute();
    g *= this.mods.prestige;
    if (this.s.run.dead) g *= p.heatDeathBonus;
    return Math.floor(g);
  }

  canCollapse() {
    return this.s.run.dead || this.prestigeGain() >= 1;
  }

  /**
   * Universum kollabieren lassen → Quintessenz bekommen, neues Universum beginnt.
   * lawSettings: neue Regler-Stellungen der Naturgesetze (optional)
   */
  collapse(lawSettings?: Record<string, number>, auto = false): number {
    if (!this.canCollapse()) return 0;
    const s = this.s;
    const gain = this.prestigeGain();
    s.q += gain;
    s.qTotal += gain;
    s.universes++;
    if (s.run.dead) {
      s.heatDeaths++;
      if (!s.fastestHeatDeath || s.run.time < s.fastestHeatDeath) s.fastestHeatDeath = s.run.time;
    }
    s.bestGain = Math.max(s.bestGain, gain);
    if (lawSettings) {
      for (const id in lawSettings) {
        const l = s.laws[id];
        if (l) l.setting = Math.max(-l.level, Math.min(l.level, Math.round(lawSettings[id])));
      }
    }
    s.run = newRun();
    this.buffs = [];
    this.anomaly = null;
    this.recompute();
    for (const r in this.mods.start) this.add(r, this.mods.start[r]);
    this.checkEpochs();
    this.computeRates();
    this.emit({ type: 'collapse', gain, auto });
    return gain;
  }

  /** Anomalie antippen */
  catchAnomaly(): string | null {
    const a = this.anomaly;
    if (!a) return null;
    this.anomaly = null;
    this.s.anomalies++;
    const d = a.def;
    const pow = this.mods.anomalyPower;
    let text = '';
    switch (d.kind) {
      case 'burst': {
        const sec = d.value * pow;
        let any = false;
        for (const r in this.rates) {
          if (this.rates[r] > 0) {
            this.add(r, this.rates[r] * sec);
            any = true;
          }
        }
        if (!any) for (const r in this.content.balance.click) this.add(r, this.content.balance.click[r] * this.mods.click * sec);
        text = `+${Math.round(sec)} Sekunden Produktion`;
        break;
      }
      case 'frenzy':
      case 'clickFrenzy': {
        const mult = 1 + (d.value - 1) * pow;
        this.buffs.push({ kind: d.kind, mult, remaining: d.duration ?? 10, duration: d.duration ?? 10, name: d.name, icon: d.icon });
        text = `${d.kind === 'frenzy' ? 'Produktion' : 'Tippen'} ×${Math.round(mult * 10) / 10} für ${d.duration} s`;
        break;
      }
      case 'entropyDrop': {
        const f = Math.min(0.9, d.value * pow);
        this.s.run.entropy *= 1 - f;
        text = `Entropie -${Math.round(f * 100)} %`;
        break;
      }
    }
    this.computeRates();
    return text;
  }

  // ------------------------------------------------------------------------
  // Zeit
  // ------------------------------------------------------------------------
  private add(r: string, amt: number) {
    const run = this.s.run;
    run.res[r] = (run.res[r] ?? 0) + amt;
    run.totals[r] = (run.totals[r] ?? 0) + amt;
    this.s.lifetime[r] = (this.s.lifetime[r] ?? 0) + amt;
  }

  tick(dt: number) {
    if (dt <= 0) return;
    const run = this.s.run;
    this.time += dt;
    this.s.playTime += dt;
    run.time += dt;
    this.computeRates();

    if (!run.dead) {
      for (const r in this.rates) this.add(r, this.rates[r] * dt);
      run.entropy += this.entropyRate * dt;
      if (run.entropy >= this.maxEntropy()) {
        run.entropy = this.maxEntropy();
        run.dead = true;
        this.anomaly = null;
        this.computeRates();
        this.emit({ type: 'heatDeath' });
      }
    }

    for (const b of this.buffs) b.remaining -= dt;
    this.buffs = this.buffs.filter((b) => b.remaining > 0);

    // Anomalien
    if (this.anomaly && this.time > this.anomaly.expires) this.anomaly = null;
    if (!this.anomaly && !run.dead && !this.offline) {
      this.nextAnomaly -= dt;
      if (this.nextAnomaly <= 0) {
        this.spawnAnomaly();
        this.nextAnomaly = this.rollAnomalyDelay();
      }
    }

    this.slowTimer += dt;
    if (this.slowTimer >= 1) {
      this.slowTimer = 0;
      this.slowChecks();
    }
    this.eventTimer += dt;
    if (this.eventTimer >= 60) {
      this.eventTimer = 0;
      this.dirty = true; // Events könnten begonnen/geendet haben
    }
  }

  private slowChecks() {
    this.checkEpochs();
    this.checkAchievements();
    if (this.s.settings.autobuy && this.mods.autobuy.size) this.autobuy();
    if (this.s.run.dead && this.mods.autoCollapse && this.s.settings.autoCollapse) this.collapse(undefined, true);
  }

  private checkEpochs() {
    const run = this.s.run;
    const eps = this.content.epochs;
    while (run.epoch + 1 < eps.length && this.meets(eps[run.epoch + 1].unlock)) {
      run.epoch++;
      const first = run.epoch > this.s.maxEpoch;
      this.s.maxEpoch = Math.max(this.s.maxEpoch, run.epoch);
      this.dirty = true;
      this.emit({ type: 'epoch', epoch: eps[run.epoch], first });
    }
  }

  private checkAchievements() {
    for (const a of this.content.achievements) {
      if (!this.s.achievements[a.id] && this.meets(a.req)) {
        this.s.achievements[a.id] = true;
        this.dirty = true;
        this.emit({ type: 'achievement', def: a });
      }
    }
  }

  private autobuy() {
    if (this.s.run.dead) return;
    const list = this.content.producers.filter((p) => this.mods.autobuy.has(p.epoch) && this.producerVisible(p));
    // teuerste zuerst, damit das Geld nicht nur in die billigste Struktur fließt
    for (let i = list.length - 1; i >= 0; i--) this.buyProducer(list[i].id, -1);
  }

  private rollAnomalyDelay() {
    const a = this.content.balance.anomalies;
    const rate = this.mods?.anomalyRate ?? 1;
    return (a.minSeconds + Math.random() * (a.maxSeconds - a.minSeconds)) / rate;
  }

  private spawnAnomaly() {
    const list = this.content.anomalies.filter((a) => this.meets(a.unlock));
    const total = list.reduce((s, a) => s + a.weight, 0);
    if (!total) return;
    let roll = Math.random() * total;
    let def = list[0];
    for (const a of list) {
      roll -= a.weight;
      if (roll <= 0) {
        def = a;
        break;
      }
    }
    this.anomaly = {
      def,
      x: 0.15 + Math.random() * 0.7,
      y: 0.15 + Math.random() * 0.55,
      expires: this.time + this.content.balance.anomalies.lifetimeSeconds,
    };
    this.emit({ type: 'anomalySpawn', anomaly: this.anomaly });
  }

  /**
   * Spielt `seconds` Sekunden im Schnelldurchlauf (Offline-Fortschritt).
   * Gibt zurück, wie viel dabei erzeugt wurde.
   */
  simulate(seconds: number): { gained: Amounts; seconds: number } {
    const before = { ...this.s.lifetime };
    if (seconds <= 0) return { gained: {}, seconds: 0 };
    this.offline = true;
    const steps = Math.min(4000, Math.max(1, Math.ceil(seconds)));
    const dt = seconds / steps;
    for (let i = 0; i < steps; i++) this.tick(dt);
    this.offline = false;
    const gained: Amounts = {};
    for (const r in this.s.lifetime) {
      const d = this.s.lifetime[r] - (before[r] ?? 0);
      if (d > 0) gained[r] = d;
    }
    return { gained, seconds };
  }

  /** Zeit seit dem letzten Spielen nachholen (begrenzt durch Offline-Stunden) */
  catchUp(now = Date.now()) {
    const elapsed = (now - this.s.lastTick) / 1000;
    this.s.lastTick = now;
    if (elapsed < 2) return null;
    if (this.dirty) this.recompute();
    const capped = Math.min(elapsed, this.mods.offlineHours * 3600);
    const result = this.simulate(capped);
    return { ...result, elapsed, capped: capped < elapsed };
  }
}
