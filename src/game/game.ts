// ===========================================================================
// Die Spiellogik: Spielstand, Level, Münzen, Sammlung, Boxen, Quests ...
// Hier wird nichts gezeichnet – nur gerechnet und gespeichert.
// ===========================================================================
import type { BoxDef, GameContent, QuestTemplate, RarityDef, RarityId, Reward, SquishyDef } from '../content/types';
import { storage } from '../platform/platform';
import { isWithin, todayKey } from '../util';

const SAVE_KEY = 'squishy.save.v1';
const RARITY_ORDER: RarityId[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];

export interface OwnedSquishy {
  count: number;
  squishes: number;
  firstAt: number;
}

export interface QuestState {
  id: string;
  progress: number;
  claimed: boolean;
}

export interface SaveData {
  v: 1;
  coins: number;
  gems: number;
  xp: number;
  level: number;
  owned: Record<string, OwnedSquishy>;
  selected: string;
  freeBoxReadyAt: number;
  daily: { lastDay: string; streak: number };
  quests: { day: string; list: QuestState[] };
  stats: { squishes: number; boxes: number; throws: number; playSeconds: number };
  claimedSets: string[];
  pity: Record<string, number>;
  seenNews: string[];
  scene: string;
  settings: { sound: boolean; haptics: boolean };
  squishCoinBank: number;
  createdAt: number;
}

export interface BoxResult {
  squishy: SquishyDef;
  rarity: RarityDef;
  isNew: boolean;
  duplicateCoins: number;
  newStar: boolean;
}

export type GameEvent =
  | { type: 'change' }
  | { type: 'levelUp'; level: number; reward: Reward; text?: string }
  | { type: 'questDone'; quest: QuestTemplate }
  | { type: 'setComplete'; setId: string }
  | { type: 'toast'; text: string };

type Listener = (e: GameEvent) => void;

export class Game {
  content!: GameContent;
  save!: SaveData;
  private listeners: Listener[] = [];
  private saveTimer = 0;

  on(fn: Listener) {
    this.listeners.push(fn);
    return () => (this.listeners = this.listeners.filter((l) => l !== fn));
  }
  private emit(e: GameEvent) {
    for (const l of this.listeners) l(e);
  }
  private changed() {
    this.emit({ type: 'change' });
    this.scheduleSave();
  }

  // ------------------------------------------------------------ Laden/Speichern
  async init(content: GameContent) {
    this.content = content;
    const raw = await storage.get(SAVE_KEY);
    let save: SaveData | null = null;
    if (raw) {
      try {
        save = JSON.parse(raw);
      } catch {
        save = null;
      }
    }
    this.save = save ? this.migrate(save) : this.newSave();
    this.sanitize();
    this.refreshDailyQuests();
    await this.persist();
  }

  /** Neue Inhalte übernehmen, ohne den Spielstand zu verlieren */
  updateContent(content: GameContent) {
    this.content = content;
    this.sanitize();
    this.changed();
  }

  private newSave(): SaveData {
    const st = this.content.starter;
    const owned: Record<string, OwnedSquishy> = {};
    for (const id of st.squishies) owned[id] = { count: 1, squishes: 0, firstAt: Date.now() };
    return {
      v: 1,
      coins: st.coins,
      gems: st.gems,
      xp: 0,
      level: 1,
      owned,
      selected: st.squishies[0],
      freeBoxReadyAt: 0,
      daily: { lastDay: '', streak: 0 },
      quests: { day: '', list: [] },
      stats: { squishes: 0, boxes: 0, throws: 0, playSeconds: 0 },
      claimedSets: [],
      pity: {},
      seenNews: [],
      scene: this.content.scenes[0].id,
      settings: { sound: true, haptics: true },
      squishCoinBank: 0,
      createdAt: Date.now(),
    };
  }

  private migrate(s: SaveData): SaveData {
    // Fehlende Felder (aus älteren Versionen) mit Standardwerten auffüllen
    const fresh = this.newSave();
    return { ...fresh, ...s, stats: { ...fresh.stats, ...s.stats }, settings: { ...fresh.settings, ...s.settings } };
  }

  /** Spielstand an Inhalte anpassen (z.B. wenn ein Squishy umbenannt/entfernt wurde) */
  private sanitize() {
    const s = this.save;
    if (!this.squishy(s.selected)) {
      s.selected = Object.keys(s.owned).find((id) => this.squishy(id)) ?? this.content.starter.squishies[0];
      if (!s.owned[s.selected]) s.owned[s.selected] = { count: 1, squishes: 0, firstAt: Date.now() };
    }
    if (!this.content.scenes.some((x) => x.id === s.scene)) s.scene = this.content.scenes[0].id;
  }

  private scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => void this.persist(), 600);
  }

  async persist() {
    await storage.set(SAVE_KEY, JSON.stringify(this.save));
  }

  async resetProgress() {
    await storage.remove(SAVE_KEY);
    this.save = this.newSave();
    this.refreshDailyQuests();
    await this.persist();
    this.changed();
  }

  // ------------------------------------------------------------ Nachschlagen
  squishy(id: string) {
    return this.content.squishies.find((s) => s.id === id);
  }
  rarity(id: RarityId) {
    return this.content.rarities.find((r) => r.id === id)!;
  }
  box(id: string) {
    return this.content.boxes.find((b) => b.id === id);
  }
  get selected(): SquishyDef {
    return this.squishy(this.save.selected)!;
  }
  ownedList(): SquishyDef[] {
    return this.content.squishies.filter((s) => this.save.owned[s.id]);
  }
  rarityRank(r: RarityId) {
    return RARITY_ORDER.indexOf(r);
  }

  /** Sterne eines Squishys (durch Doppelte) */
  stars(id: string) {
    const o = this.save.owned[id];
    if (!o) return 0;
    const dups = o.count - 1;
    return this.content.starThresholds.filter((t) => dups >= t).length;
  }

  // ------------------------------------------------------------ Level
  xpForLevel(level: number) {
    const l = this.content.levels;
    return Math.round(l.xpBase * Math.pow(level, l.xpGrowth));
  }

  addXp(amount: number) {
    const s = this.save;
    const max = this.content.levels.maxLevel;
    s.xp += amount;
    while (s.level < max && s.xp >= this.xpForLevel(s.level)) {
      s.xp -= this.xpForLevel(s.level);
      s.level++;
      const ms = this.content.levels.milestones.find((m) => m.level === s.level);
      const reward: Reward = { ...this.content.levels.rewardPerLevel };
      if (ms) {
        for (const [k, v] of Object.entries(ms.reward)) {
          const key = k as keyof Reward;
          if (typeof v === 'number') (reward[key] as number) = ((reward[key] as number) ?? 0) + v;
          else (reward as Record<string, unknown>)[key] = v;
        }
      }
      this.grant(reward, false);
      this.emit({ type: 'levelUp', level: s.level, reward, text: ms?.text });
    }
    this.changed();
  }

  /** Belohnung gutschreiben. Box-Belohnungen werden vom UI geöffnet. */
  pendingBoxes: string[] = [];
  grant(r: Reward, withXp = true) {
    const s = this.save;
    if (r.coins) s.coins += r.coins;
    if (r.gems) s.gems += r.gems;
    if (r.box) this.pendingBoxes.push(r.box);
    if (r.squishy) this.addSquishy(r.squishy);
    if (r.xp && withXp) this.addXp(r.xp);
    this.changed();
  }

  // ------------------------------------------------------------ Squishen
  /** Ein Squish ist passiert. Gibt XP und ab und zu Münzen. */
  onSquish() {
    const s = this.save;
    const def = this.selected;
    const rar = this.rarity(def.rarity);
    const starBonus = 1 + this.stars(def.id) * 0.1;
    s.stats.squishes++;
    const o = s.owned[def.id];
    if (o) o.squishes++;
    s.squishCoinBank += (rar.coinsPer10Squishes / 10) * starBonus;
    let coins = 0;
    if (s.squishCoinBank >= 1) {
      coins = Math.floor(s.squishCoinBank);
      s.squishCoinBank -= coins;
      s.coins += coins;
    }
    this.progressQuests('squish', 1);
    this.progressQuests('squishMaterial', 1, def.material);
    this.progressQuests('squishRarity', 1, def.rarity);
    this.addXp(Math.round(rar.xpPerSquish * starBonus));
    return { xp: Math.round(rar.xpPerSquish * starBonus), coins };
  }

  onThrow() {
    this.save.stats.throws++;
    this.progressQuests('throw', 1);
    this.changed();
  }

  select(id: string) {
    if (!this.save.owned[id]) return;
    this.save.selected = id;
    this.changed();
  }

  // ------------------------------------------------------------ Boxen
  boxAvailable(b: BoxDef) {
    return isWithin(b.availableFrom, b.availableUntil) && this.save.level >= (b.unlockLevel ?? 1);
  }

  visibleBoxes() {
    return this.content.boxes.filter((b) => isWithin(b.availableFrom, b.availableUntil));
  }

  squishyAvailable(s: SquishyDef) {
    return s.available !== false && isWithin(s.availableFrom, s.availableUntil);
  }

  /** Prozent-Chancen einer Box (für die Anzeige – Pflicht im Play Store) */
  oddsPercent(b: BoxDef) {
    const entries = Object.entries(b.odds).filter(([r, w]) => (w ?? 0) > 0 && this.poolFor(b, r as RarityId).length > 0) as [RarityId, number][];
    const total = entries.reduce((a, [, w]) => a + w, 0);
    return entries.map(([r, w]) => ({ rarity: this.rarity(r), percent: (w / total) * 100 }));
  }

  poolFor(b: BoxDef, r: RarityId) {
    return this.content.squishies.filter((s) => s.rarity === r && this.squishyAvailable(s) && (!b.sets?.length || b.sets.includes(s.set)));
  }

  canAfford(b: BoxDef) {
    const c = b.cost;
    if (c.freeCooldownMinutes !== undefined) return Date.now() >= this.save.freeBoxReadyAt;
    if (c.gems) return this.save.gems >= c.gems;
    if (c.coins) return this.save.coins >= c.coins;
    return true;
  }

  /** Box kaufen (bezahlen). Gibt false zurück, wenn nicht genug Geld. */
  payForBox(b: BoxDef) {
    if (!this.boxAvailable(b) || !this.canAfford(b)) return false;
    const c = b.cost;
    if (c.freeCooldownMinutes !== undefined) this.save.freeBoxReadyAt = Date.now() + c.freeCooldownMinutes * 60_000;
    else if (c.gems) this.save.gems -= c.gems;
    else if (c.coins) this.save.coins -= c.coins;
    this.changed();
    return true;
  }

  /** Den Inhalt einer Box auswürfeln und gutschreiben. */
  rollBox(b: BoxDef): BoxResult {
    const s = this.save;
    const entries = this.oddsPercent(b);
    let rarity: RarityId = entries[0].rarity.id;
    let roll = Math.random() * 100;
    for (const e of entries) {
      if (roll < e.percent) {
        rarity = e.rarity.id;
        break;
      }
      roll -= e.percent;
    }
    // Garantie ("Pity"): nach X Boxen ohne Treffer gibt es mindestens die Seltenheit
    if (b.pity) {
      const count = (s.pity[b.id] ?? 0) + 1;
      const minRank = this.rarityRank(b.pity.minRarity);
      if (this.rarityRank(rarity) >= minRank) s.pity[b.id] = 0;
      else if (count >= b.pity.every) {
        rarity = b.pity.minRarity;
        s.pity[b.id] = 0;
      } else s.pity[b.id] = count;
    }
    let pool = this.poolFor(b, rarity);
    if (!pool.length) pool = this.content.squishies.filter((x) => this.squishyAvailable(x));
    // Neue Squishys sind etwas wahrscheinlicher (fühlt sich fairer an)
    const weights = pool.map((x) => (s.owned[x.id] ? 1 : 1.6));
    let w = Math.random() * weights.reduce((a, x) => a + x, 0);
    let pick = pool[0];
    for (let i = 0; i < pool.length; i++) {
      w -= weights[i];
      if (w <= 0) {
        pick = pool[i];
        break;
      }
    }
    const before = this.stars(pick.id);
    const isNew = this.addSquishy(pick.id);
    const rar = this.rarity(pick.rarity);
    const dupCoins = isNew ? 0 : rar.duplicateCoins;
    s.coins += dupCoins;
    s.stats.boxes++;
    this.progressQuests('openBox', 1);
    this.addXp(15);
    return { squishy: pick, rarity: rar, isNew, duplicateCoins: dupCoins, newStar: this.stars(pick.id) > before };
  }

  private addSquishy(id: string) {
    const s = this.save;
    const o = s.owned[id];
    if (o) {
      o.count++;
      this.changed();
      return false;
    }
    s.owned[id] = { count: 1, squishes: 0, firstAt: Date.now() };
    this.progressQuests('collectNew', 1);
    const def = this.squishy(id);
    if (def && this.setProgress(def.set).done && !s.claimedSets.includes(def.set)) this.emit({ type: 'setComplete', setId: def.set });
    this.changed();
    return true;
  }

  // ------------------------------------------------------------ Sammlungen
  setProgress(setId: string) {
    const all = this.content.squishies.filter((s) => s.set === setId);
    const have = all.filter((s) => this.save.owned[s.id]).length;
    return { have, total: all.length, done: have === all.length };
  }

  claimSet(setId: string) {
    const set = this.content.sets.find((x) => x.id === setId);
    if (!set || !this.setProgress(setId).done || this.save.claimedSets.includes(setId)) return null;
    this.save.claimedSets.push(setId);
    this.grant(set.reward);
    return set.reward;
  }

  // ------------------------------------------------------------ Tagesbelohnung
  dailyStatus() {
    const today = todayKey();
    const d = this.save.daily;
    const yesterday = todayKey(new Date(Date.now() - 86_400_000));
    const canClaim = d.lastDay !== today;
    const nextStreak = canClaim ? (d.lastDay === yesterday ? d.streak + 1 : 1) : d.streak;
    const len = this.content.dailyRewards.length;
    const idx = ((nextStreak - 1) % len + len) % len;
    return { canClaim, streak: nextStreak, index: idx, reward: this.content.dailyRewards[idx] };
  }

  claimDaily() {
    const st = this.dailyStatus();
    if (!st.canClaim) return null;
    this.save.daily = { lastDay: todayKey(), streak: st.streak };
    this.grant(st.reward);
    return st.reward;
  }

  // ------------------------------------------------------------ Quests
  refreshDailyQuests() {
    const today = todayKey();
    const q = this.save.quests;
    const valid = q.list.every((x) => this.content.quests.some((t) => t.id === x.id));
    if (q.day === today && valid && q.list.length) return;
    // zufällige, aber pro Tag feste Auswahl
    const pool = [...this.content.quests];
    let seed = 0;
    for (const ch of today) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const picks: QuestState[] = [];
    const types = new Set<string>();
    while (picks.length < this.content.questsPerDay && pool.length) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      const i = seed % pool.length;
      const t = pool.splice(i, 1)[0];
      if (types.has(t.type) && pool.length > this.content.questsPerDay) continue;
      types.add(t.type);
      picks.push({ id: t.id, progress: 0, claimed: false });
    }
    this.save.quests = { day: today, list: picks };
  }

  questList() {
    this.refreshDailyQuests();
    return this.save.quests.list
      .map((q) => ({ state: q, tpl: this.content.quests.find((t) => t.id === q.id)! }))
      .filter((x) => x.tpl);
  }

  private progressQuests(type: QuestTemplate['type'], amount: number, param?: string) {
    for (const { state, tpl } of this.questList()) {
      if (tpl.type !== type || state.claimed || state.progress >= tpl.target) continue;
      if (tpl.param) {
        if (type === 'squishRarity') {
          if (this.rarityRank(param as RarityId) < this.rarityRank(tpl.param as RarityId)) continue;
        } else if (tpl.param !== param) continue;
      }
      state.progress = Math.min(tpl.target, state.progress + amount);
      if (state.progress >= tpl.target) this.emit({ type: 'questDone', quest: tpl });
    }
  }

  claimQuest(id: string) {
    const q = this.questList().find((x) => x.state.id === id);
    if (!q || q.state.claimed || q.state.progress < q.tpl.target) return null;
    q.state.claimed = true;
    this.grant(q.tpl.reward);
    return q.tpl.reward;
  }

  unclaimedQuestCount() {
    return this.questList().filter((q) => !q.state.claimed && q.state.progress >= q.tpl.target).length;
  }

  // ------------------------------------------------------------ Shop
  buyCoins(offerId: string) {
    const o = this.content.coinOffers.find((x) => x.id === offerId);
    if (!o || this.save.gems < o.gems) return false;
    this.save.gems -= o.gems;
    this.save.coins += o.coins;
    this.changed();
    return true;
  }

  // ------------------------------------------------------------ Sonstiges
  setScene(id: string) {
    const sc = this.content.scenes.find((x) => x.id === id);
    if (!sc || sc.unlockLevel > this.save.level) return;
    this.save.scene = id;
    this.changed();
  }
  get scene() {
    return this.content.scenes.find((x) => x.id === this.save.scene) ?? this.content.scenes[0];
  }

  setSetting(key: keyof SaveData['settings'], v: boolean) {
    this.save.settings[key] = v;
    this.changed();
  }

  unseenNews() {
    return this.content.news.filter((n) => !this.save.seenNews.includes(n.id) && isWithin(undefined, n.until));
  }
  markNewsSeen(id: string) {
    if (!this.save.seenNews.includes(id)) this.save.seenNews.push(id);
    this.changed();
  }

  addPlayTime(sec: number) {
    this.save.stats.playSeconds += sec;
  }

  notify(text: string) {
    this.emit({ type: 'toast', text });
  }
}
