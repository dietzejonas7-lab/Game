// ===========================================================================
// Die Benutzeroberfläche: Anzeige oben, Grafik in der Mitte, Menüs unten.
// ===========================================================================
import { sfx, setMusic, setSound, unlockAudio } from '../audio/audio';
import type { Amounts, GameContent, ProducerDef } from '../content/types';
import { Engine, type GameEvent } from '../engine/engine';
import { fmt, fmtInt, fmtMult, fmtPercent, fmtTime, setNotation } from '../engine/format';
import { haptic, setHaptics, storage } from '../platform/platform';
import { Cosmos } from '../render/cosmos';
import { clear, confirmDialog, h, modal, toast } from './dom';
import { describeEffects, describeReq } from './describe';
import { SAVE_KEY } from '../config';
import { isWithin } from '../engine/engine';

type Tab = 'build' | 'research' | 'laws' | 'eternal' | 'discover';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'build', icon: '🏗️', label: 'Bauen' },
  { id: 'research', icon: '🔬', label: 'Forschung' },
  { id: 'laws', icon: '🌀', label: 'Kosmos' },
  { id: 'eternal', icon: '♾️', label: 'Ewigkeit' },
  { id: 'discover', icon: '🏆', label: 'Erfolge' },
];

export class App {
  contentSource = '';
  private cosmos!: Cosmos;
  private tab: Tab = 'build';
  private buildEpoch = 0;
  private panelSig = '';
  private updaters: (() => void)[] = [];
  private lastUi = 0;
  private lastSave = 0;
  private lastFrame = 0;
  private modalOpen = false;
  private offlineEvents = { epochs: 0, achievements: 0, collapses: 0, gain: 0 };

  // DOM
  private elEpoch!: HTMLElement;
  private elUniverse!: HTMLElement;
  private elQ!: HTMLElement;
  private elRes!: HTMLElement;
  private elEntFill!: HTMLElement;
  private elEntText!: HTMLElement;
  private elStage!: HTMLElement;
  private elCanvas!: HTMLCanvasElement;
  private elAnomaly!: HTMLButtonElement;
  private elBuffs!: HTMLElement;
  private elHint!: HTMLElement;
  private elDead!: HTMLElement;
  private elPanel!: HTMLElement;
  private tabButtons = new Map<Tab, HTMLElement>();
  private resChips = new Map<string, { root: HTMLElement; amt: HTMLElement; rate: HTMLElement }>();

  constructor(private engine: Engine) {
    engine.on((e) => this.onGameEvent(e));
  }

  get c(): GameContent {
    return this.engine.content;
  }
  get s() {
    return this.engine.s;
  }

  // ------------------------------------------------------------------------
  // Aufbau
  // ------------------------------------------------------------------------
  mount(root: HTMLElement) {
    clear(root);
    this.applySettings();

    this.elEpoch = h('div', { class: 'epoch-name' });
    this.elUniverse = h('div', { class: 'universe-no' });
    this.elQ = h('button', { class: 'q-badge', onclick: () => this.switchTab('laws') });
    this.elRes = h('div', { class: 'res-row' });
    this.elEntFill = h('div', { class: 'ent-fill' });
    this.elEntText = h('div', { class: 'ent-text' });
    const hud = h('header', { id: 'hud' },
      h('div', { class: 'hud-top' },
        h('div', { class: 'hud-title' }, this.elEpoch, this.elUniverse),
        this.elQ,
        h('button', { class: 'icon-btn', 'aria-label': 'Einstellungen', onclick: () => this.openSettings() }, '⚙️'),
      ),
      this.elRes,
      h('div', { class: 'entropy', onclick: () => this.explainEntropy() }, h('div', { class: 'ent-bar' }, this.elEntFill), this.elEntText),
    );

    this.elCanvas = h('canvas', { id: 'cosmos' });
    this.elAnomaly = h('button', { class: 'anomaly hidden', onclick: (e: Event) => this.catchAnomaly(e) });
    this.elBuffs = h('div', { class: 'buffs' });
    this.elHint = h('div', { class: 'stage-hint' });
    this.elDead = h('div', { class: 'dead hidden' },
      h('div', { class: 'dead-box' },
        h('div', { class: 'dead-title' }, '🥶 Wärmetod'),
        h('p', {}, 'Die Entropie hat ihr Maximum erreicht. Alles ist gleichmäßig verteilt, nichts geschieht mehr.'),
        h('button', { class: 'btn glow', onclick: () => this.openCollapse() }, '💥 Neues Universum erschaffen'),
      ),
    );
    this.elStage = h('main', { id: 'stage' }, this.elCanvas, this.elBuffs, this.elHint, this.elAnomaly, this.elDead);

    this.elPanel = h('section', { id: 'panel' });
    const tabs = h('nav', { id: 'tabs' });
    for (const t of TABS) {
      const b = h('button', { class: 'tab', onclick: () => this.switchTab(t.id) }, h('span', { class: 'tab-icon' }, t.icon), h('span', { class: 'tab-label' }, t.label), h('i', { class: 'dot hidden' }));
      this.tabButtons.set(t.id, b);
      tabs.append(b);
    }
    root.append(hud, this.elStage, this.elPanel, tabs);

    this.cosmos = new Cosmos(this.elCanvas);
    this.cosmos.setEpoch(this.engine.epoch, false);
    this.buildEpoch = this.s.run.epoch;

    // Tippen auf den Kosmos (mehrere Finger gleichzeitig gehen auch)
    this.elCanvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      unlockAudio();
      const r = this.elCanvas.getBoundingClientRect();
      this.doClick(e.clientX - r.left, e.clientY - r.top);
    });
    window.addEventListener('resize', () => this.cosmos.resize());
    new ResizeObserver(() => this.cosmos.resize()).observe(this.elStage);
    document.addEventListener('pointerdown', () => unlockAudio(), { once: true });

    this.switchTab('build');
    this.refresh();
    requestAnimationFrame((t) => this.loop(t));
  }

  /** Nach dem Start: Einführung, Offline-Bericht, News */
  async greet(offline: ReturnType<Engine['catchUp']>) {
    const intro = this.c.epochs[0];
    if (!this.s.seenIntros[intro.id]) {
      // Beim allerersten Start nur die Einführung zeigen – News kommen beim nächsten Mal
      await this.showIntro(intro.id);
      return;
    }
    if (offline && offline.seconds > 60) {
      await this.showOffline(offline);
    }
    for (const n of this.c.news) {
      if (this.s.seenNews[n.id] || !isWithin(n.from, n.until)) continue;
      this.s.seenNews[n.id] = true;
      await this.info(n.title, n.text, 'Weiter');
    }
  }

  applySettings() {
    const st = this.s.settings;
    setNotation(st.notation);
    setSound(st.sound);
    setMusic(st.music);
    setHaptics(st.haptics);
  }

  // ------------------------------------------------------------------------
  // Spielschleife
  // ------------------------------------------------------------------------
  private loop(t: number) {
    const dt = this.lastFrame ? Math.min(0.25, (t - this.lastFrame) / 1000) : 0;
    this.lastFrame = t;
    this.engine.tick(dt);
    this.s.lastTick = Date.now();
    const run = this.s.run;
    this.cosmos.frame(dt, {
      entropyFrac: run.entropy / this.engine.maxEntropy(),
      dead: run.dead,
      structures: Object.values(run.producers).reduce((a, b) => a + b, 0),
    });
    this.positionAnomaly();
    if (t - this.lastUi > 200) {
      this.lastUi = t;
      this.refresh();
    }
    if (t - this.lastSave > 10000) {
      this.lastSave = t;
      void this.save();
    }
    requestAnimationFrame((n) => this.loop(n));
  }

  async save() {
    this.s.lastTick = Date.now();
    await storage.set(SAVE_KEY, JSON.stringify(this.s));
  }

  /** Wenn die App wieder in den Vordergrund kommt */
  async resume() {
    const r = this.engine.catchUp();
    this.lastFrame = 0;
    if (r && r.seconds > 60) await this.showOffline(r);
  }

  refresh() {
    this.updateHud();
    this.renderPanel();
    this.updateBadges();
  }

  // ------------------------------------------------------------------------
  // Anzeige oben
  // ------------------------------------------------------------------------
  private updateHud() {
    const e = this.engine;
    const run = this.s.run;
    this.elEpoch.textContent = e.epoch.name;
    this.elUniverse.textContent = `Universum #${this.s.universes + 1}`;
    this.elQ.textContent = `${this.c.balance.prestige.icon} ${fmtInt(this.s.q)}`;
    document.documentElement.style.setProperty('--accent', e.epoch.colors.accent);

    // Ressourcen: alle, die zu erreichten Epochen gehören
    const shown = new Set<string>();
    this.c.epochs.forEach((ep, i) => {
      if (i <= run.epoch) shown.add(ep.resource);
    });
    for (const r of this.c.resources) if ((run.res[r.id] ?? 0) > 0) shown.add(r.id);
    for (const r of this.c.resources) {
      let chip = this.resChips.get(r.id);
      if (!shown.has(r.id)) {
        chip?.root.classList.add('hidden');
        continue;
      }
      if (!chip) {
        const amt = h('b', {});
        const rate = h('small', {});
        const root = h('div', { class: 'res-chip', style: `--rc:${r.color}` }, h('span', { class: 'res-ico' }, r.icon), h('div', {}, amt, rate));
        root.addEventListener('click', () => toast(`${r.icon} ${r.name}`));
        chip = { root, amt, rate };
        this.resChips.set(r.id, chip);
        // in der Reihenfolge der Liste einsortieren
        this.elRes.append(root);
      }
      chip.root.classList.remove('hidden');
      chip.amt.textContent = fmt(e.amount(r.id));
      const rate = e.rates[r.id] ?? 0;
      chip.rate.textContent = rate > 0 ? `+${fmt(rate)}/s` : '';
    }

    // Entropie
    const frac = Math.min(1, run.entropy / e.maxEntropy());
    this.elEntFill.style.width = `${frac * 100}%`;
    this.elEntFill.style.background = frac > 0.85 ? 'linear-gradient(90deg,#ff9d3c,#ff3b3b)' : frac > 0.6 ? 'linear-gradient(90deg,#ffd166,#ff9d3c)' : 'linear-gradient(90deg,#6ee7ff,#b48cff)';
    const ttl = e.timeToHeatDeath();
    this.elEntText.textContent = run.dead
      ? 'Entropie 100 % · Wärmetod'
      : `Entropie ${fmtPercent(frac)} · ${ttl === Infinity ? 'stabil' : 'Wärmetod in ' + fmtTime(ttl)}`;

    // Mitte
    this.elDead.classList.toggle('hidden', !run.dead || this.modalOpen);
    let hint = '';
    if (this.s.clicks < 8 && this.s.universes === 0) hint = '👆 Tippe irgendwo, um Energie zu erzeugen';
    else if (Object.keys(run.producers).length === 0 && this.s.universes === 0) hint = '👇 Kaufe unten deine erste Struktur';
    this.elHint.textContent = hint;
    this.elHint.classList.toggle('hidden', !hint);

    clear(this.elBuffs);
    for (const b of e.buffs) {
      this.elBuffs.append(h('div', { class: 'buff' }, `${b.icon} ${b.kind === 'frenzy' ? 'Produktion' : 'Tippen'} ×${fmt(b.mult)} · ${Math.ceil(b.remaining)} s`));
    }
    if (e.activeEvents().length) {
      for (const ev of e.activeEvents()) this.elBuffs.append(h('div', { class: 'buff event', onclick: () => this.info(`${ev.icon} ${ev.name}`, ev.desc + '\n\n' + describeEffects(this.c, ev.effects)) }, `${ev.icon} ${ev.name}`));
    }
  }

  private updateBadges() {
    const e = this.engine;
    const research = this.c.upgrades.some((u) => e.upgradeVisible(u) && e.canAfford(u.cost));
    const laws = e.canCollapse() || this.c.laws.some((l) => e.meets(l.unlock) && e.lawLevel(l.id) < l.maxLevel && this.s.q >= e.lawCost(l));
    const eternal = this.c.eternals.some((x) => e.meets(x.unlock) && (!x.maxLevel || e.eternalLevel(x.id) < x.maxLevel) && this.s.q >= e.eternalCost(x));
    this.tabButtons.get('research')!.querySelector('.dot')!.classList.toggle('hidden', !research);
    this.tabButtons.get('laws')!.querySelector('.dot')!.classList.toggle('hidden', !laws);
    this.tabButtons.get('eternal')!.querySelector('.dot')!.classList.toggle('hidden', !eternal);
  }

  // ------------------------------------------------------------------------
  // Tippen & Anomalien
  // ------------------------------------------------------------------------
  private doClick(x: number, y: number) {
    const gain = this.engine.click();
    // die "wertvollste" Ressource anzeigen (die aus der spätesten Epoche)
    let best: string | null = null;
    for (const ep of this.c.epochs) if ((gain[ep.resource] ?? 0) > 0) best = ep.resource;
    if (!best) return;
    const r = this.c.resources.find((x) => x.id === best)!;
    this.cosmos.tap(x, y, `+${fmt(gain[best])} ${r.icon}`, r.color);
    sfx.click();
    haptic('light');
  }

  private positionAnomaly() {
    const a = this.engine.anomaly;
    const el = this.elAnomaly;
    if (!a || this.s.run.dead) {
      if (!el.classList.contains('hidden')) el.classList.add('hidden');
      return;
    }
    if (el.dataset.id !== a.def.id + a.expires) {
      el.dataset.id = a.def.id + a.expires;
      el.textContent = a.def.icon;
      el.classList.remove('hidden');
    }
    const w = this.elStage.clientWidth;
    const hgt = this.elStage.clientHeight;
    const t = performance.now() / 1000;
    el.style.transform = `translate(${a.x * w + Math.sin(t * 0.9) * 18 - 28}px, ${a.y * hgt + Math.cos(t * 1.3) * 12 - 28}px)`;
  }

  private catchAnomaly(e: Event) {
    e.stopPropagation();
    const def = this.engine.anomaly?.def;
    const text = this.engine.catchAnomaly();
    if (!def || !text) return;
    sfx.anomaly();
    haptic('medium');
    const r = this.elAnomaly.getBoundingClientRect();
    const sr = this.elStage.getBoundingClientRect();
    this.cosmos.tap(r.left - sr.left + r.width / 2, r.top - sr.top + r.height / 2, '', '#ffffff');
    toast(`${def.icon} ${def.name}: ${text}`);
    this.refresh();
  }

  // ------------------------------------------------------------------------
  // Ereignisse aus der Spiel-Logik
  // ------------------------------------------------------------------------
  private onGameEvent(ev: GameEvent) {
    const offline = this.engine.offline;
    switch (ev.type) {
      case 'epoch':
        if (offline) {
          this.offlineEvents.epochs++;
          this.cosmos?.setEpoch(ev.epoch, false);
          return;
        }
        this.cosmos.setEpoch(ev.epoch, true);
        this.buildEpoch = this.s.run.epoch;
        sfx.epoch();
        haptic('heavy');
        if (!this.s.seenIntros[ev.epoch.id]) void this.showIntro(ev.epoch.id);
        else toast(`✨ ${ev.epoch.name} erreicht!`);
        break;
      case 'achievement':
        if (offline) {
          this.offlineEvents.achievements++;
          return;
        }
        sfx.achievement();
        toast(`🏆 ${ev.def.name}`);
        break;
      case 'heatDeath':
        if (offline) return;
        sfx.heatDeath();
        haptic('heavy');
        break;
      case 'anomalySpawn':
        haptic('light');
        break;
      case 'collapse':
        if (offline) {
          this.offlineEvents.collapses++;
          this.offlineEvents.gain += ev.gain;
          return;
        }
        this.cosmos.setEpoch(this.engine.epoch, false);
        this.cosmos.bang();
        this.buildEpoch = this.s.run.epoch;
        sfx.bang();
        haptic('heavy');
        if (ev.auto) toast(`♾️ Neues Universum! +${fmt(ev.gain)} ${this.c.balance.prestige.icon}`);
        void this.save();
        break;
    }
  }

  // ------------------------------------------------------------------------
  // Fenster
  // ------------------------------------------------------------------------
  private info(title: string, text: string, ok = 'OK'): Promise<void> {
    return new Promise((resolve) => {
      this.modalOpen = true;
      const close = modal(
        h('div', { class: 'dialog' }, h('h2', {}, title), h('p', { class: 'pre' }, text), h('button', { class: 'btn wide', onclick: () => close() }, ok)),
        { onClose: () => { this.modalOpen = false; resolve(); } },
      );
    });
  }

  private async showIntro(epochId: string) {
    const ep = this.c.epochs.find((e) => e.id === epochId);
    if (!ep) return;
    this.s.seenIntros[epochId] = true;
    await this.info(`✨ ${ep.name}`, ep.intro, 'Los geht’s');
  }

  private async showOffline(r: NonNullable<ReturnType<Engine['catchUp']>>) {
    const lines: string[] = [];
    for (const res of this.c.resources) if (r.gained[res.id]) lines.push(`${res.icon} +${fmt(r.gained[res.id])} ${res.name}`);
    const ev = this.offlineEvents;
    if (ev.epochs) lines.push(`✨ ${ev.epochs} neue Epoche(n) erreicht`);
    if (ev.achievements) lines.push(`🏆 ${ev.achievements} Entdeckung(en)`);
    if (ev.collapses) lines.push(`♾️ ${ev.collapses} Universen kollabiert (+${fmt(ev.gain)} ${this.c.balance.prestige.icon})`);
    if (this.s.run.dead) lines.push('🥶 Dein Universum ist inzwischen den Wärmetod gestorben.');
    this.offlineEvents = { epochs: 0, achievements: 0, collapses: 0, gain: 0 };
    const capped = r.capped ? `\n\n(Du warst ${fmtTime(r.elapsed)} weg – angerechnet werden höchstens ${fmtTime(r.seconds)}. Mehr gibt es in der Ewigkeit.)` : '';
    await this.info('🌙 Willkommen zurück!', `Während du ${fmtTime(r.seconds)} weg warst, hat dein Universum weitergearbeitet:\n\n${lines.join('\n') || 'Nichts Neues.'}${capped}`, 'Super!');
  }

  private explainEntropy() {
    const e = this.engine;
    void this.info(
      '🔥 Entropie',
      `Entropie ist die Unordnung im Universum. Jede Struktur erzeugt Entropie – stärkere Strukturen mehr.\n\n` +
        `Erreicht die Entropie die Grenze (${fmt(e.maxEntropy())}), stirbt dein Universum den Wärmetod: Nichts produziert mehr.\n\n` +
        `Dann (oder schon vorher) lässt du es kollabieren und bekommst Quintessenz ${this.c.balance.prestige.icon} für ein stärkeres nächstes Universum.\n\n` +
        `Gerade: +${fmt(e.entropyRate)} Entropie pro Sekunde.\n\nTipp: Forschung, die Entropie senkt oder die Grenze erhöht, verlängert das Leben deines Universums. ` +
        `Multiplikatoren erzeugen keine Entropie – nur zusätzliche Strukturen tun das.`,
    );
  }

  // ------------------------------------------------------------------------
  // Menüs unten
  // ------------------------------------------------------------------------
  private switchTab(t: Tab) {
    this.tab = t;
    for (const [id, b] of this.tabButtons) b.classList.toggle('active', id === t);
    this.panelSig = '';
    this.elPanel.scrollTop = 0;
    this.renderPanel();
  }

  private renderPanel() {
    const sig = this.signature();
    if (sig !== this.panelSig) {
      this.panelSig = sig;
      const scroll = this.elPanel.scrollTop;
      clear(this.elPanel);
      this.updaters = [];
      switch (this.tab) {
        case 'build': this.buildBuild(); break;
        case 'research': this.buildResearch(); break;
        case 'laws': this.buildLaws(); break;
        case 'eternal': this.buildEternal(); break;
        case 'discover': this.buildDiscover(); break;
      }
      this.elPanel.scrollTop = scroll;
    }
    for (const u of this.updaters) u();
  }

  /** Wenn sich diese "Unterschrift" ändert, wird das Menü neu aufgebaut */
  private signature() {
    const e = this.engine;
    const s = this.s;
    switch (this.tab) {
      case 'build':
        return `b|${this.buildEpoch}|${s.run.epoch}|${s.settings.buyAmount}|${this.c.producers.filter((p) => e.producerVisible(p)).map((p) => p.id).join(',')}`;
      case 'research':
        return `r|${this.c.upgrades.filter((u) => e.upgradeVisible(u)).map((u) => u.id).join(',')}|${Object.keys(s.run.upgrades).length}`;
      case 'laws':
        return `l|${s.universes}|${this.c.laws.map((l) => (e.meets(l.unlock) ? e.lawLevel(l.id) + ':' + e.lawSetting(l.id) : 'x')).join(',')}`;
      case 'eternal':
        return `e|${this.c.eternals.map((x) => (e.meets(x.unlock) ? e.eternalLevel(x.id) : 'x')).join(',')}`;
      case 'discover':
        return `d|${Object.keys(s.achievements).length}`;
    }
  }

  private icon(res: string) {
    return this.c.resources.find((x) => x.id === res)?.icon ?? res;
  }

  private costText(cost: Amounts) {
    return Object.entries(cost).map(([r, v]) => `${fmt(v)} ${this.icon(r)}`).join(' + ');
  }

  // ---------- Bauen ----------
  private buildBuild() {
    const e = this.engine;
    const p = this.elPanel;
    const top = h('div', { class: 'panel-top' });
    if (this.s.run.epoch > 0) {
      const chips = h('div', { class: 'chips' });
      this.c.epochs.forEach((ep, i) => {
        if (i > this.s.run.epoch) return;
        const r = this.c.resources.find((x) => x.id === ep.resource);
        chips.append(h('button', { class: 'chip' + (i === this.buildEpoch ? ' active' : ''), onclick: () => { this.buildEpoch = i; this.renderPanel(); } }, `${r?.icon ?? ''} ${ep.name}`));
      });
      top.append(chips);
    }
    const amounts = [1, 10, 100, -1];
    const seg = h('div', { class: 'seg' });
    for (const a of amounts) {
      seg.append(h('button', { class: this.s.settings.buyAmount === a ? 'active' : '', onclick: () => { this.s.settings.buyAmount = a; this.renderPanel(); } }, a < 0 ? 'Max' : `×${a}`));
    }
    top.append(seg);
    p.append(top);

    const ep = this.c.epochs[Math.min(this.buildEpoch, this.s.run.epoch)];
    const list = this.c.producers.filter((x) => x.epoch === ep.id);
    let teaser = false;
    for (const prod of list) {
      if (e.producerVisible(prod)) p.append(this.producerRow(prod));
      else if (!teaser) {
        teaser = true;
        p.append(h('div', { class: 'card locked' }, h('div', { class: 'ico' }, '🔒'), h('div', { class: 'info' }, h('div', { class: 'nm' }, '???'), h('div', { class: 'sub' }, describeReq(this.c, prod.unlock)))));
      }
    }
    // Hinweis auf die nächste Epoche
    const next = this.c.epochs[this.s.run.epoch + 1];
    if (next && this.buildEpoch === this.s.run.epoch) {
      const req = next.unlock?.totals;
      const prog = h('div', { class: 'next-fill' });
      const txt = h('div', { class: 'sub' });
      p.append(h('div', { class: 'card next' }, h('div', { class: 'ico' }, '🔭'), h('div', { class: 'info' }, h('div', { class: 'nm' }, `Nächste Epoche: ${next.name}`), txt, h('div', { class: 'next-bar' }, prog))));
      this.updaters.push(() => {
        let f = 1;
        if (req) for (const k in req) f = Math.min(f, (this.s.run.totals[k] ?? 0) / req[k]);
        prog.style.width = `${Math.min(1, f) * 100}%`;
        txt.textContent = describeReq(this.c, next.unlock) + ` (${fmtPercent(Math.min(1, f))})`;
      });
    }
  }

  private producerRow(prod: ProducerDef) {
    const e = this.engine;
    const cnt = h('span', { class: 'cnt' });
    const sub = h('div', { class: 'sub' });
    const btnAmt = h('span', { class: 'b-amt' });
    const btnCost = h('span', { class: 'b-cost' });
    const btn = h('button', { class: 'buy' }, btnAmt, btnCost);
    btn.addEventListener('click', () => {
      const n = e.buyProducer(prod.id, this.s.settings.buyAmount);
      if (n > 0) {
        sfx.buy();
        haptic('light');
        this.refresh();
      }
    });
    const row = h('div', { class: 'card' },
      h('div', { class: 'ico' }, prod.icon),
      h('div', { class: 'info', onclick: () => this.producerDetail(prod) }, h('div', { class: 'nm' }, prod.name, ' ', cnt), sub),
      btn,
    );
    this.updaters.push(() => {
      const n = e.count(prod.id);
      cnt.textContent = n ? String(n) : '';
      const rate = e.unitRate(prod);
      const resTxt = Object.entries(rate).map(([r, v]) => `+${fmt(v)} ${this.icon(r)}/s`).join(' ');
      sub.textContent = `${resTxt} je · 🔥 +${fmt(e.unitEntropy(prod))}/s`;
      const want = this.s.settings.buyAmount;
      const k = want < 0 ? Math.max(1, e.maxAffordable(prod)) : want;
      const cost = e.producerCost(prod, k);
      btnAmt.textContent = `+${k}`;
      btnCost.textContent = this.costText(cost);
      btn.disabled = this.s.run.dead || !e.canAfford(cost);
    });
    return row;
  }

  private producerDetail(prod: ProducerDef) {
    const e = this.engine;
    const n = e.count(prod.id);
    const ms = this.c.balance.milestones;
    const nextMs = (Math.floor(n / ms.every) + 1) * ms.every;
    const rate = e.unitRate(prod);
    const lines = [
      prod.desc,
      '',
      `Besitz: ${n}`,
      `Produktion je Einheit: ${Object.entries(rate).map(([r, v]) => `${fmt(v)} ${this.icon(r)}/s`).join(', ')}`,
      `Produktion gesamt: ${Object.entries(rate).map(([r, v]) => `${fmt(v * n)} ${this.icon(r)}/s`).join(', ')}`,
      `Entropie je Einheit: ${fmt(e.unitEntropy(prod))}/s (gesamt ${fmt(e.unitEntropy(prod) * n)}/s)`,
      '',
      `⭐ Meilenstein: Bei ${nextMs} Einheiten verdoppelt sich die Produktion (${fmtMult(ms.mult)} alle ${ms.every}).`,
    ];
    void this.info(`${prod.icon} ${prod.name}`, lines.join('\n'));
  }

  // ---------- Forschung ----------
  private buildResearch() {
    const e = this.engine;
    const p = this.elPanel;
    const order = (cost: Amounts) => {
      let v = 0;
      for (const r in cost) {
        const idx = this.c.epochs.findIndex((x) => x.resource === r);
        v = Math.max(v, idx * 1000 + Math.log10(cost[r] + 1));
      }
      return v;
    };
    const list = this.c.upgrades.filter((u) => e.upgradeVisible(u)).sort((a, b) => order(a.cost) - order(b.cost));
    if (!list.length) p.append(h('div', { class: 'empty' }, 'Gerade gibt es nichts zu erforschen. Baue mehr Strukturen – neue Forschung erscheint, sobald du genug davon hast.'));
    for (const u of list) {
      const btn = h('button', { class: 'buy' }, h('span', { class: 'b-cost' }, this.costText(u.cost)));
      btn.addEventListener('click', () => {
        if (e.buyUpgrade(u.id)) {
          sfx.upgrade();
          haptic('medium');
          this.refresh();
        }
      });
      p.append(h('div', { class: 'card' },
        h('div', { class: 'ico' }, u.icon),
        h('div', { class: 'info' }, h('div', { class: 'nm' }, u.name), h('div', { class: 'eff' }, describeEffects(this.c, u.effects)), h('div', { class: 'sub' }, u.desc)),
        btn,
      ));
      this.updaters.push(() => {
        btn.disabled = !e.canAfford(u.cost);
      });
    }
    const done = this.c.upgrades.filter((u) => this.s.run.upgrades[u.id]);
    if (done.length) {
      const det = h('details', { class: 'done' }, h('summary', {}, `✅ Bereits erforscht (${done.length})`));
      for (const u of done) det.append(h('div', { class: 'done-item' }, `${u.icon} ${u.name} – ${describeEffects(this.c, u.effects)}`));
      p.append(det);
    }
  }

  // ---------- Kosmos (Kollaps + Naturgesetze) ----------
  private buildLaws() {
    const e = this.engine;
    const p = this.elPanel;
    const pr = this.c.balance.prestige;
    const gainEl = h('div', { class: 'big-num' });
    const bonusEl = h('div', { class: 'sub' });
    const btn = h('button', { class: 'btn wide', onclick: () => this.openCollapse() }, '💥 Universum kollabieren lassen');
    p.append(h('div', { class: 'card prestige' },
      h('div', { class: 'info' },
        h('div', { class: 'nm' }, `${pr.icon} ${pr.name}`),
        h('div', { class: 'sub' }, `Lass dein Universum kollabieren, um ${pr.name} zu gewinnen. Je mehr du in diesem Universum erzeugt hast, desto mehr bekommst du – und ${fmtMult(pr.heatDeathBonus)} extra, wenn es bis zum Wärmetod gelebt hat.`),
        gainEl, bonusEl, btn,
      ),
    ));
    this.updaters.push(() => {
      const g = e.prestigeGain();
      gainEl.textContent = `+${fmt(g)} ${pr.icon} beim Kollaps`;
      bonusEl.textContent = `Jede nicht ausgegebene ${pr.name} gibt +${fmtPercent(pr.bonusPerPoint)} Produktion. Aktuell: +${fmtPercent(e.quintBonus())}`;
      btn.disabled = !e.canCollapse();
    });

    p.append(h('h3', { class: 'section' }, '🌀 Naturgesetze'));
    p.append(h('p', { class: 'sub pad' }, `Schalte mit ${pr.name} Stufen frei. Die Regler stellst du beim nächsten Urknall ein – nach Plus oder Minus. Jedes Gesetz hat Vor- und Nachteile!`));
    let anyLocked = false;
    for (const l of this.c.laws) {
      if (!e.meets(l.unlock)) {
        if (!anyLocked) p.append(h('div', { class: 'card locked' }, h('div', { class: 'ico' }, '🔒'), h('div', { class: 'info' }, h('div', { class: 'nm' }, '??? (Naturgesetz)'), h('div', { class: 'sub' }, describeReq(this.c, l.unlock)))));
        anyLocked = true;
        continue;
      }
      const lvl = e.lawLevel(l.id);
      const set = e.lawSetting(l.id);
      const btn = h('button', { class: 'buy' }, h('span', { class: 'b-amt' }, lvl >= l.maxLevel ? 'Max' : `Stufe ${lvl + 1}`), h('span', { class: 'b-cost' }, lvl >= l.maxLevel ? '' : `${fmt(e.lawCost(l))} ${pr.icon}`));
      btn.addEventListener('click', () => {
        if (e.buyLawLevel(l.id)) {
          sfx.upgrade();
          this.refresh();
        }
      });
      p.append(h('div', { class: 'card' },
        h('div', { class: 'ico' }, l.icon),
        h('div', { class: 'info' },
          h('div', { class: 'nm' }, l.name, ' ', h('span', { class: 'cnt' }, `${lvl}/${l.maxLevel}`)),
          h('div', { class: 'sub' }, l.desc),
          h('div', { class: 'eff' }, `Regler +1: ${describeEffects(this.c, l.effects, 1)}`),
          h('div', { class: 'eff neg' }, `Regler −1: ${describeEffects(this.c, l.effects, -1)}`),
          lvl > 0 ? h('div', { class: 'setting' }, `Aktuell eingestellt: ${set > 0 ? '+' : ''}${set}`) : null,
        ),
        btn,
      ));
      this.updaters.push(() => {
        btn.disabled = lvl >= l.maxLevel || this.s.q < e.lawCost(l);
      });
    }
  }

  private openCollapse() {
    const e = this.engine;
    if (!e.canCollapse()) return;
    const pr = this.c.balance.prestige;
    const gain = e.prestigeGain();
    const settings: Record<string, number> = {};
    const lawBox = h('div', { class: 'laws-setup' });
    for (const l of this.c.laws) {
      const lvl = e.lawLevel(l.id);
      if (lvl <= 0 || !e.meets(l.unlock)) continue;
      settings[l.id] = e.lawSetting(l.id);
      const val = h('b', {});
      const eff = h('div', { class: 'sub' });
      const input = h('input', { type: 'range', min: -lvl, max: lvl, step: 1, value: settings[l.id] }) as HTMLInputElement;
      const upd = () => {
        const v = Number(input.value);
        settings[l.id] = v;
        val.textContent = (v > 0 ? '+' : '') + v;
        eff.textContent = v === 0 ? 'neutral' : describeEffects(this.c, l.effects, v);
      };
      input.addEventListener('input', upd);
      upd();
      lawBox.append(h('div', { class: 'law-slider' }, h('div', { class: 'law-head' }, `${l.icon} ${l.name}`, val), input, eff));
    }
    const dead = this.s.run.dead;
    const close = modal(
      h('div', { class: 'dialog collapse' },
        h('h2', {}, dead ? '🥶 Neues Universum' : '💥 Kollaps'),
        h('p', {}, dead ? 'Dein Universum ist erstarrt. Aus seiner Asche entsteht ein neues.' : 'Dein Universum stürzt in sich zusammen und wird zu einer neuen Singularität. Strukturen, Ressourcen und Forschung gehen verloren.'),
        h('div', { class: 'big-num' }, `+${fmt(gain)} ${pr.icon} ${pr.name}`),
        h('p', { class: 'sub' }, 'Du behältst: Quintessenz, Naturgesetze, Ewigkeit und Erfolge.'),
        Object.keys(settings).length ? h('h3', { class: 'section' }, 'Naturgesetze für das neue Universum') : null,
        Object.keys(settings).length ? lawBox : null,
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost', onclick: () => close() }, 'Abbrechen'),
          h('button', { class: 'btn glow', onclick: () => { close(); e.collapse(settings); this.switchTab(this.tab); } }, '💥 Urknall!'),
        ),
      ),
      { onClose: () => { this.modalOpen = false; } },
    );
    this.modalOpen = true;
  }

  // ---------- Ewigkeit ----------
  private buildEternal() {
    const e = this.engine;
    const p = this.elPanel;
    const pr = this.c.balance.prestige;
    p.append(h('p', { class: 'sub pad' }, `Ewige Verbesserungen bleiben für immer – über alle Universen hinweg. Bezahlt wird mit ${pr.name} ${pr.icon}.`));
    if (this.s.qTotal === 0) p.append(h('div', { class: 'empty' }, `Lass dein erstes Universum kollabieren, um ${pr.name} zu bekommen.`));
    const locked: HTMLElement[] = [];
    for (const x of this.c.eternals) {
      if (!e.meets(x.unlock)) {
        locked.push(h('div', { class: 'card locked' }, h('div', { class: 'ico' }, '🔒'), h('div', { class: 'info' }, h('div', { class: 'nm' }, x.name), h('div', { class: 'sub' }, describeReq(this.c, x.unlock)))));
        continue;
      }
      const lvl = e.eternalLevel(x.id);
      const maxed = x.maxLevel > 0 && lvl >= x.maxLevel;
      const btn = h('button', { class: 'buy' }, h('span', { class: 'b-amt' }, maxed ? 'Max' : x.maxLevel === 1 ? 'Kaufen' : `Stufe ${lvl + 1}`), h('span', { class: 'b-cost' }, maxed ? '' : `${fmt(e.eternalCost(x))} ${pr.icon}`));
      btn.addEventListener('click', () => {
        if (e.buyEternal(x.id)) {
          sfx.upgrade();
          haptic('medium');
          this.refresh();
        }
      });
      p.append(h('div', { class: 'card' },
        h('div', { class: 'ico' }, x.icon),
        h('div', { class: 'info' },
          h('div', { class: 'nm' }, x.name, ' ', h('span', { class: 'cnt' }, x.maxLevel === 1 ? (lvl ? '✓' : '') : `${lvl}${x.maxLevel ? '/' + x.maxLevel : ''}`)),
          h('div', { class: 'sub' }, x.desc),
          lvl > 0 && x.maxLevel !== 1 ? h('div', { class: 'eff' }, `Jetzt: ${describeEffects(this.c, x.effects, lvl)}`) : null,
        ),
        btn,
      ));
      this.updaters.push(() => {
        btn.disabled = maxed || this.s.q < e.eternalCost(x);
      });
    }
    if (locked.length) {
      p.append(h('h3', { class: 'section' }, '🔒 Noch verborgen'));
      p.append(...locked.slice(0, 4));
    }
  }

  // ---------- Erfolge ----------
  private buildDiscover() {
    const e = this.engine;
    const p = this.elPanel;
    const got = this.c.achievements.filter((a) => this.s.achievements[a.id]);
    let mult = 1;
    for (const a of got) for (const ef of a.effects) if (ef.type === 'globalMult') mult *= ef.value ?? 1;
    p.append(h('div', { class: 'card' }, h('div', { class: 'ico' }, '🏆'), h('div', { class: 'info' }, h('div', { class: 'nm' }, `${got.length} von ${this.c.achievements.length} entdeckt`), h('div', { class: 'eff' }, `Bonus: Alle Produktion ${fmtMult(mult)}`))));
    const grid = h('div', { class: 'ach-grid' });
    const sorted = [...this.c.achievements].sort((a, b) => Number(!!this.s.achievements[b.id]) - Number(!!this.s.achievements[a.id]));
    for (const a of sorted) {
      const ok = !!this.s.achievements[a.id];
      grid.append(h('button', { class: 'ach' + (ok ? ' ok' : ''), onclick: () => this.info(`${a.icon} ${a.name}`, `${a.desc}\n\nBelohnung: ${describeEffects(this.c, a.effects)}\n\n${ok ? '✅ Erreicht' : '🔒 Noch nicht erreicht'}`) },
        h('span', { class: 'ach-ico' }, ok ? a.icon : '❔'), h('span', { class: 'ach-name' }, a.name)));
    }
    p.append(grid);
    void e;
  }

  // ------------------------------------------------------------------------
  // Einstellungen
  // ------------------------------------------------------------------------
  private openSettings() {
    const st = this.s.settings;
    const e = this.engine;
    const toggle = (label: string, key: 'sound' | 'music' | 'haptics' | 'autobuy' | 'autoCollapse') => {
      const input = h('input', { type: 'checkbox' }) as HTMLInputElement;
      input.checked = st[key];
      input.addEventListener('change', () => {
        st[key] = input.checked;
        this.applySettings();
      });
      return h('label', { class: 'toggle' }, h('span', {}, label), input);
    };
    const notation = h('select', {}, h('option', { value: 'names' }, '1,5 Mio'), h('option', { value: 'sci' }, '1,5e6')) as HTMLSelectElement;
    notation.value = st.notation;
    notation.addEventListener('change', () => {
      st.notation = notation.value as 'names' | 'sci';
      this.applySettings();
      this.panelSig = '';
    });
    const stats = [
      ['Spielzeit', fmtTime(this.s.playTime)],
      ['Dieses Universum', fmtTime(this.s.run.time)],
      ['Universen', fmtInt(this.s.universes)],
      ['Wärmetode', fmtInt(this.s.heatDeaths)],
      ['Schnellster Wärmetod', this.s.fastestHeatDeath ? fmtTime(this.s.fastestHeatDeath) : '–'],
      ['Quintessenz gesamt', fmt(this.s.qTotal)],
      ['Bester Kollaps', fmt(this.s.bestGain)],
      ['Tipps', fmtInt(this.s.clicks)],
      ['Anomalien', fmtInt(this.s.anomalies)],
      ['Offline-Grenze', `${fmt(e.mods.offlineHours)} h`],
    ];
    const box = h('div', { class: 'dialog settings' },
      h('h2', {}, '⚙️ Einstellungen'),
      toggle('🔊 Sounds', 'sound'),
      toggle('🎵 Musik', 'music'),
      toggle('📳 Vibration', 'haptics'),
      e.mods.autobuy.size ? toggle('🤖 Auto-Kauf', 'autobuy') : null,
      e.mods.autoCollapse ? toggle('♾️ Auto-Kollaps beim Wärmetod', 'autoCollapse') : null,
      h('label', { class: 'toggle' }, h('span', {}, '🔢 Zahlen'), notation),
      h('h3', { class: 'section' }, '📊 Statistik'),
      h('div', { class: 'stats' }, ...stats.map(([k, v]) => h('div', {}, h('span', {}, k), h('b', {}, v)))),
      h('h3', { class: 'section' }, '💾 Spielstand'),
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost small', onclick: () => this.exportSave() }, 'Sichern (kopieren)'),
        h('button', { class: 'btn ghost small', onclick: () => this.importSave() }, 'Laden (einfügen)'),
      ),
      h('button', { class: 'btn ghost small danger wide', onclick: () => this.resetSave() }, 'Alles zurücksetzen'),
      this.devTools(),
      h('p', { class: 'sub center' }, `Inhalte: Version ${this.c.contentVersion} (${this.contentSource}) · `, h('a', { href: './datenschutz.html', target: '_blank' }, 'Datenschutz')),
      h('button', { class: 'btn wide', onclick: () => close() }, 'Fertig'),
    );
    this.modalOpen = true;
    const close = modal(box, { onClose: () => { this.modalOpen = false; void this.save(); } });
  }

  /** Werkzeuge zum Testen – nur im Browser mit #dev in der Adresse oder bei "npm run dev" */
  private devTools() {
    if (!(import.meta.env.DEV || location.hash.includes('dev'))) return null;
    const e = this.engine;
    const act = (label: string, fn: () => void) => h('button', { class: 'btn ghost small', onclick: () => { fn(); e.invalidate(); this.panelSig = ''; this.refresh(); toast('🛠️ ' + label); } }, label);
    return h('div', { class: 'dev' },
      h('h3', { class: 'section' }, '🛠️ Entwickler-Werkzeuge'),
      h('div', { class: 'dev-grid' },
        act('Ressourcen ×1000', () => {
          for (const r of this.c.resources) {
            const v = (this.s.run.res[r.id] ?? 0) * 1000 + 1000;
            this.s.run.res[r.id] = v;
            this.s.run.totals[r.id] = Math.max(this.s.run.totals[r.id] ?? 0, v);
          }
        }),
        act(`+100 ${this.c.balance.prestige.icon}`, () => { this.s.q += 100; this.s.qTotal += 100; }),
        act('1 Stunde vorspulen', () => { e.simulate(3600); }),
        act('Entropie auf 0', () => { this.s.run.entropy = 0; this.s.run.dead = false; }),
        act('Anomalie jetzt', () => { (e as unknown as { nextAnomaly: number }).nextAnomaly = 0; }),
      ),
    );
  }

  private async exportSave() {
    const txt = btoa(unescape(encodeURIComponent(JSON.stringify(this.s))));
    try {
      await navigator.clipboard.writeText(txt);
      toast('📋 Spielstand kopiert! Bewahre ihn z.B. in einer Notiz auf.');
    } catch {
      prompt('Diesen Text kopieren und aufbewahren:', txt);
    }
  }

  private async importSave() {
    const txt = prompt('Gesicherten Spielstand hier einfügen:');
    if (!txt) return;
    try {
      const json = decodeURIComponent(escape(atob(txt.trim())));
      JSON.parse(json);
      await storage.set(SAVE_KEY, json);
      location.reload();
    } catch {
      toast('❌ Das ist kein gültiger Spielstand.');
    }
  }

  private async resetSave() {
    const ok = await confirmDialog('Alles zurücksetzen?', 'Dein gesamter Fortschritt geht verloren – auch Quintessenz und Erfolge. Das kann nicht rückgängig gemacht werden!', 'Löschen');
    if (!ok) return;
    await storage.remove(SAVE_KEY);
    location.reload();
  }
}
