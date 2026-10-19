// ===========================================================================
// Die Benutzeroberfläche: obere Leiste (Level, Münzen, Diamanten),
// Tabs unten und die einzelnen Bildschirme.
// ===========================================================================
import { audio } from '../audio/audio';
import { APP_VERSION } from '../config';
import type { BoxDef, Reward, SquishyDef } from '../content/types';
import type { Game } from '../game/game';
import { purchase } from '../platform/iap';
import { haptic, setHaptics } from '../platform/platform';
import { Stage, thumbnail } from '../render/stage';
import { formatDuration, formatNumber } from '../util';
import { boxVisual, openBoxSequence } from './boxOpening';
import { clear, confirmDialog, h, modal, toast } from './dom';

type Tab = 'play' | 'collection' | 'boxes' | 'shop' | 'profile';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'play', icon: '🫧', label: 'Spielen' },
  { id: 'collection', icon: '📖', label: 'Sammlung' },
  { id: 'boxes', icon: '🎁', label: 'Boxen' },
  { id: 'shop', icon: '💎', label: 'Shop' },
  { id: 'profile', icon: '⭐', label: 'Profil' },
];

export function rewardText(r: Reward, game: Game) {
  const parts: string[] = [];
  if (r.coins) parts.push(`${formatNumber(r.coins)} 🪙`);
  if (r.gems) parts.push(`${formatNumber(r.gems)} 💎`);
  if (r.xp) parts.push(`${r.xp} XP`);
  if (r.box) parts.push(`${game.box(r.box)?.name ?? 'Box'} 🎁`);
  if (r.squishy) parts.push(game.squishy(r.squishy)?.name ?? 'Squishy');
  return parts.join(' + ');
}

export class App {
  private game: Game;
  private tab: Tab = 'play';
  private stage!: Stage;
  private screens = new Map<Tab, HTMLElement>();
  private hud!: HTMLElement;
  private tabBar!: HTMLElement;
  private carousel!: HTMLElement;
  private playButtons!: HTMLElement;
  private nameLabel!: HTMLElement;
  private hint?: HTMLElement;
  contentSource = '';

  constructor(game: Game) {
    this.game = game;
  }

  mount(root: HTMLElement) {
    this.hud = h('header', { id: 'hud' });
    const main = h('main', { id: 'screens' });
    this.tabBar = h('nav', { id: 'tabs' });
    root.append(this.hud, main, this.tabBar);

    for (const t of TABS) {
      const sec = h('section', { class: 'screen', id: 'screen-' + t.id });
      this.screens.set(t.id, sec);
      main.append(sec);
    }
    this.buildPlay();
    this.renderTabs();
    this.renderHud();
    this.show('play');

    this.game.on((e) => {
      switch (e.type) {
        case 'change':
          this.renderHud();
          this.renderTabs();
          break;
        case 'levelUp':
          this.levelUp(e.level, e.reward, e.text);
          break;
        case 'questDone':
          toast(`✅ Quest geschafft: ${e.quest.text}`);
          audio.ui('coin');
          break;
        case 'setComplete': {
          const set = this.game.content.sets.find((s) => s.id === e.setId);
          toast(`🎉 Sammlung „${set?.name}" komplett! Belohnung abholen im Sammlungs-Tab.`);
          break;
        }
        case 'toast':
          toast(e.text);
          break;
      }
    });

    setHaptics(this.game.save.settings.haptics);
    audio.enabled = this.game.save.settings.sound;
    setTimeout(() => this.startupPopups(), 600);
    setInterval(() => {
      this.game.addPlayTime(1);
      if (this.tab === 'boxes') this.updateBoxTimers();
    }, 1000);
  }

  /** Nach einem Inhalts-Update alles neu zeichnen */
  refresh() {
    this.stage.setScene(this.game.scene);
    if (this.stage.def?.id !== this.game.selected.id || JSON.stringify(this.stage.def) !== JSON.stringify(this.game.selected)) {
      this.stage.setSquishy(this.game.selected, false);
    }
    this.renderCarousel();
    this.renderHud();
    this.show(this.tab);
  }

  // ------------------------------------------------------------ HUD
  private renderHud() {
    const s = this.game.save;
    const need = this.game.xpForLevel(s.level);
    const pct = Math.min(100, (s.xp / need) * 100);
    clear(this.hud);
    this.hud.append(
      h('div', { class: 'lvl', onclick: () => this.show('profile') },
        h('div', { class: 'lvl-badge' }, String(s.level)),
        h('div', { class: 'xpbar' }, h('div', { class: 'xpfill', style: `width:${pct}%` }), h('span', {}, `${formatNumber(s.xp)} / ${formatNumber(need)} XP`)),
      ),
      h('div', { class: 'cur', onclick: () => this.show('shop') }, h('span', {}, '🪙'), formatNumber(s.coins)),
      h('div', { class: 'cur', onclick: () => this.show('shop') }, h('span', {}, '💎'), formatNumber(s.gems), h('b', { class: 'plus' }, '+')),
    );
  }

  private renderTabs() {
    clear(this.tabBar);
    const freeReady = this.game.visibleBoxes().some((b) => b.cost.freeCooldownMinutes !== undefined && this.game.canAfford(b));
    const setReady = this.game.content.sets.some((st) => this.game.setProgress(st.id).done && !this.game.save.claimedSets.includes(st.id));
    const dots: Partial<Record<Tab, boolean>> = { boxes: freeReady, collection: setReady, play: this.game.unclaimedQuestCount() > 0 || this.game.dailyStatus().canClaim };
    for (const t of TABS) {
      this.tabBar.append(
        h('button', { class: 'tab' + (this.tab === t.id ? ' active' : ''), onclick: () => { audio.unlock(); audio.ui('tap'); this.show(t.id); } },
          h('span', { class: 'tab-icon' }, t.icon),
          h('span', { class: 'tab-label' }, t.label),
          dots[t.id] ? h('i', { class: 'dot' }) : null,
        ),
      );
    }
  }

  show(tab: Tab) {
    this.tab = tab;
    for (const [id, el] of this.screens) el.classList.toggle('active', id === tab);
    this.renderTabs();
    if (tab === 'play') {
      this.stage.start();
      this.renderPlayButtons();
    } else this.stage.stop();
    if (tab === 'collection') this.renderCollection();
    if (tab === 'boxes') this.renderBoxes();
    if (tab === 'shop') this.renderShop();
    if (tab === 'profile') this.renderProfile();
  }

  // ------------------------------------------------------------ Spielen
  private buildPlay() {
    const sec = this.screens.get('play')!;
    const canvas = h('canvas', { id: 'play-canvas' });
    this.nameLabel = h('div', { class: 'squishy-name' });
    this.playButtons = h('div', { class: 'play-buttons' });
    this.carousel = h('div', { class: 'carousel' });
    const hint = h('div', { class: 'play-hint' }, '👆 Drücken, ziehen, werfen!', h('br', {}), h('span', {}, 'Tippe auf den Tisch zum Hüpfen'));
    if (this.game.save.stats.squishes >= 5) hint.classList.add('hidden');
    this.hint = hint;
    sec.append(canvas, this.nameLabel, this.playButtons, hint, this.carousel);
    this.stage = new Stage(canvas);
    this.stage.setScene(this.game.scene);
    this.stage.setSquishy(this.game.selected);
    this.stage.events.onSquish = (x, y) => {
      const r = this.game.onSquish();
      if (this.game.save.stats.squishes >= 5) this.hint?.classList.add('hidden');
      this.stage.floatText(x, y - 20, `+${r.xp} XP`, '#fff');
      if (r.coins) this.stage.floatText(x + 30, y - 4, `+${r.coins} 🪙`, '#ffe066');
      const rar = this.game.rarity(this.game.selected.rarity);
      this.stage.burst(x, y, rar.color, 5);
    };
    this.stage.events.onThrow = () => this.game.onThrow();
    this.renderCarousel();
  }

  private renderPlayButtons() {
    clear(this.playButtons);
    const daily = this.game.dailyStatus();
    const q = this.game.unclaimedQuestCount();
    this.playButtons.append(
      h('button', { class: 'round-btn', onclick: () => this.openQuests() }, '📋', q ? h('i', { class: 'dot' }, String(q)) : null),
      h('button', { class: 'round-btn', onclick: () => this.openDaily() }, '☀️', daily.canClaim ? h('i', { class: 'dot' }, '!') : null),
      h('button', { class: 'round-btn', onclick: () => this.openScenes() }, '🎨'),
    );
    const def = this.game.selected;
    const rar = this.game.rarity(def.rarity);
    const stars = this.game.stars(def.id);
    clear(this.nameLabel);
    this.nameLabel.append(
      h('div', { class: 'nm' }, def.name),
      h('div', { class: 'rr', style: `color:${rar.color}` }, rar.name + (stars ? ' ' + '⭐'.repeat(stars) : '')),
    );
  }

  private renderCarousel() {
    clear(this.carousel);
    const owned = this.game.ownedList().sort((a, b) => this.game.rarityRank(b.rarity) - this.game.rarityRank(a.rarity));
    for (const s of owned) {
      const rar = this.game.rarity(s.rarity);
      const btn = h('button', {
        class: 'car-item' + (s.id === this.game.save.selected ? ' sel' : ''),
        style: `--rc:${rar.color}`,
        onclick: () => this.selectSquishy(s.id),
      }, h('img', { src: thumbnail(s, 56), alt: s.name }));
      this.carousel.append(btn);
    }
    if (owned.length < 3) {
      this.carousel.append(h('button', { class: 'car-item add', onclick: () => this.show('boxes') }, '+'));
    }
  }

  selectSquishy(id: string) {
    audio.ui('tap');
    this.game.select(id);
    this.stage.setSquishy(this.game.selected);
    this.renderCarousel();
    this.renderPlayButtons();
  }

  // ------------------------------------------------------------ Sammlung
  private renderCollection() {
    const sec = this.screens.get('collection')!;
    clear(sec);
    const total = this.game.content.squishies.length;
    const have = this.game.ownedList().length;
    sec.append(h('div', { class: 'screen-title' }, h('h1', {}, 'Sammlung'), h('div', { class: 'pill' }, `${have} / ${total}`)));
    for (const set of this.game.content.sets) {
      const prog = this.game.setProgress(set.id);
      const claimed = this.game.save.claimedSets.includes(set.id);
      const head = h('div', { class: 'set-head' },
        h('div', { class: 'set-name' }, `${set.icon} ${set.name}`),
        h('div', { class: 'set-prog' }, h('div', { class: 'set-bar' }, h('div', { style: `width:${(prog.have / prog.total) * 100}%` })), `${prog.have}/${prog.total}`),
      );
      const rewardRow = prog.done && !claimed
        ? h('button', {
            class: 'btn small glow',
            onclick: () => {
              const r = this.game.claimSet(set.id);
              if (r) {
                audio.ui('coin');
                toast('Belohnung: ' + rewardText(r, this.game));
                this.processPendingBoxes();
                this.renderCollection();
              }
            },
          }, `Belohnung abholen: ${rewardText(set.reward, this.game)}`)
        : h('div', { class: 'set-reward muted' }, claimed ? '✅ Belohnung abgeholt' : `Belohnung: ${rewardText(set.reward, this.game)}`);
      const grid = h('div', { class: 'grid' });
      for (const s of this.game.content.squishies.filter((x) => x.set === set.id)) {
        const owned = this.game.save.owned[s.id];
        const rar = this.game.rarity(s.rarity);
        const limited = s.availableUntil && this.game.squishyAvailable(s);
        grid.append(
          h('button', { class: 'card' + (owned ? '' : ' locked'), style: `--rc:${rar.color}`, onclick: () => this.squishyDetail(s) },
            h('img', { src: thumbnail(s, 76, !owned), alt: '' }),
            h('div', { class: 'card-name' }, owned ? s.name : '???'),
            owned && owned.count > 1 ? h('div', { class: 'count' }, '×' + owned.count) : null,
            owned && this.game.stars(s.id) ? h('div', { class: 'stars' }, '⭐'.repeat(this.game.stars(s.id))) : null,
            limited ? h('div', { class: 'limited' }, '⏳') : null,
          ),
        );
      }
      sec.append(h('div', { class: 'set' }, head, grid, rewardRow));
    }
  }

  private squishyDetail(s: SquishyDef) {
    const owned = this.game.save.owned[s.id];
    const rar = this.game.rarity(s.rarity);
    const mat: Record<string, string> = { foam: 'Slow Rising Schaumstoff', mochi: 'Mochi (dehnbar)', jelly: 'Jelly (wabbelig)', gel: 'Gel-Stressball' };
    const nextStar = this.game.content.starThresholds[this.game.stars(s.id)];
    let close = () => {};
    const content = h('div', { class: 'detail', style: `--rc:${rar.color}` },
      h('img', { src: thumbnail(s, 150, !owned), alt: '' }),
      h('div', { class: 'rarity-label', style: `color:${rar.color}` }, rar.name),
      h('h2', {}, owned ? s.name : '???'),
      h('p', { class: 'muted' }, owned ? s.description ?? '' : 'Noch nicht gefunden. Öffne Boxen, um es zu finden!'),
      owned
        ? h('div', { class: 'stats' },
            h('div', {}, h('b', {}, mat[s.material]), h('span', {}, 'Material')),
            h('div', {}, h('b', {}, String(owned.squishes)), h('span', {}, 'Mal gesquisht')),
            h('div', {}, h('b', {}, '⭐'.repeat(this.game.stars(s.id)) || '–'), h('span', {}, nextStar !== undefined ? `${owned.count - 1}/${nextStar} Doppelte bis zum nächsten Stern` : 'Max. Sterne!')),
          )
        : null,
      s.availableUntil && this.game.squishyAvailable(s) ? h('p', { class: 'limited-text' }, `⏳ Nur bis ${new Date(s.availableUntil).toLocaleDateString('de-DE')} erhältlich`) : null,
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost', onclick: () => close() }, 'Schließen'),
        owned ? h('button', { class: 'btn', onclick: () => { close(); this.selectSquishy(s.id); this.show('play'); } }, 'Spielen') : null,
      ),
    );
    close = modal(content);
  }

  // ------------------------------------------------------------ Boxen
  private renderBoxes() {
    const sec = this.screens.get('boxes')!;
    clear(sec);
    sec.append(h('div', { class: 'screen-title' }, h('h1', {}, 'Boxen')));
    const list = h('div', { class: 'box-list' });
    for (const b of this.game.visibleBoxes()) {
      const unlocked = this.game.boxAvailable(b);
      const isFree = b.cost.freeCooldownMinutes !== undefined;
      const costLabel = isFree ? 'GRATIS' : b.cost.gems ? `${b.cost.gems} 💎` : `${formatNumber(b.cost.coins ?? 0)} 🪙`;
      const btn = h('button', {
        class: 'btn' + (isFree ? ' glow' : ''),
        'data-box': b.id,
        disabled: !unlocked,
        onclick: () => this.tryOpenBox(b),
      }, unlocked ? costLabel : `🔒 Level ${b.unlockLevel}`);
      list.append(
        h('div', { class: 'box-card', style: `--c1:${b.color};--c2:${b.color2 ?? b.color}` },
          boxVisual(b, 86),
          h('div', { class: 'box-info' },
            h('h3', {}, b.name, b.availableUntil ? h('span', { class: 'tag' }, 'Event') : null),
            h('p', { class: 'muted' }, b.description ?? ''),
            h('button', { class: 'link', onclick: () => this.showOdds(b) }, 'Chancen anzeigen'),
          ),
          btn,
        ),
      );
    }
    sec.append(list);
    this.updateBoxTimers();
  }

  private updateBoxTimers() {
    for (const b of this.game.visibleBoxes()) {
      if (b.cost.freeCooldownMinutes === undefined) continue;
      const btn = this.screens.get('boxes')!.querySelector<HTMLButtonElement>(`[data-box="${b.id}"]`);
      if (!btn) continue;
      const left = this.game.save.freeBoxReadyAt - Date.now();
      btn.disabled = left > 0;
      btn.classList.toggle('glow', left <= 0);
      btn.textContent = left > 0 ? `⏱ ${formatDuration(left)}` : 'GRATIS';
    }
  }

  private showOdds(b: BoxDef) {
    const odds = this.game.oddsPercent(b);
    let close = () => {};
    const content = h('div', { class: 'dialog' },
      h('h2', {}, `${b.name} – Chancen`),
      h('table', { class: 'odds' },
        ...odds.map((o) => h('tr', {},
          h('td', { style: `color:${o.rarity.color};font-weight:800` }, o.rarity.name),
          h('td', {}, `${o.percent.toFixed(o.percent < 1 ? 2 : 1).replace('.', ',')} %`),
          h('td', { class: 'muted' }, `${this.game.poolFor(b, o.rarity.id).length} Squishys`),
        )),
      ),
      b.pity ? h('p', { class: 'muted' }, `Garantie: Spätestens jede ${b.pity.every}. Box enthält mindestens „${this.game.rarity(b.pity.minRarity).name}".`) : null,
      h('p', { class: 'muted small' }, 'Noch nicht gesammelte Squishys sind innerhalb einer Seltenheit etwas wahrscheinlicher.'),
      h('button', { class: 'btn wide', onclick: () => close() }, 'OK'),
    );
    close = modal(content);
  }

  private tryOpenBox(b: BoxDef) {
    audio.unlock();
    if (!this.game.payForBox(b)) {
      audio.ui('error');
      if (b.cost.gems) toast('Nicht genug Diamanten 💎');
      else if (b.cost.coins) toast('Nicht genug Münzen 🪙 – squishe mehr oder erledige Quests!');
      return;
    }
    openBoxSequence(this.game, b, {
      onPlay: (id) => {
        this.selectSquishy(id);
        this.show('play');
      },
      onDone: () => {
        this.renderCarousel();
        if (this.tab === 'boxes') this.renderBoxes();
        this.processPendingBoxes();
      },
      again: b.cost.freeCooldownMinutes === undefined ? () => this.game.payForBox(b) || (toast('Nicht genug Guthaben'), false) : undefined,
    });
  }

  /** Boxen aus Belohnungen (Level-Up, Tagesbonus ...) nacheinander öffnen */
  processPendingBoxes(): void {
    const id = this.game.pendingBoxes.shift();
    if (!id) return;
    const b = this.game.box(id);
    if (!b) return this.processPendingBoxes();
    openBoxSequence(this.game, b, {
      onPlay: (sid) => {
        this.selectSquishy(sid);
        this.show('play');
      },
      onDone: () => {
        this.renderCarousel();
        setTimeout(() => this.processPendingBoxes(), 250);
      },
    });
  }

  // ------------------------------------------------------------ Shop
  private renderShop() {
    const sec = this.screens.get('shop')!;
    clear(sec);
    sec.append(h('div', { class: 'screen-title' }, h('h1', {}, 'Shop')));
    sec.append(h('h3', { class: 'section' }, '💎 Diamanten'));
    const gems = h('div', { class: 'shop-grid' });
    for (const p of this.game.content.products) {
      gems.append(
        h('button', {
          class: 'shop-item',
          onclick: async () => {
            const res = await purchase(p);
            if (res.ok) {
              this.game.grant({ gems: p.gems });
              audio.ui('coin');
              haptic('medium');
              toast(`+${p.gems} 💎`);
            }
          },
        },
          p.badge ? h('div', { class: 'ribbon' }, p.badge) : null,
          h('div', { class: 'big' }, '💎'),
          h('div', { class: 'amt' }, formatNumber(p.gems)),
          h('div', { class: 'muted small' }, p.name),
          h('div', { class: 'price' }, p.priceLabel),
        ),
      );
    }
    sec.append(gems);
    sec.append(h('h3', { class: 'section' }, '🪙 Münzen'));
    const coins = h('div', { class: 'shop-grid' });
    for (const o of this.game.content.coinOffers) {
      coins.append(
        h('button', {
          class: 'shop-item',
          onclick: () => {
            if (this.game.buyCoins(o.id)) {
              audio.ui('coin');
              toast(`+${formatNumber(o.coins)} 🪙`);
            } else {
              audio.ui('error');
              toast('Nicht genug Diamanten');
            }
          },
        },
          h('div', { class: 'big' }, '🪙'),
          h('div', { class: 'amt' }, formatNumber(o.coins)),
          h('div', { class: 'muted small' }, o.name),
          h('div', { class: 'price' }, `${o.gems} 💎`),
        ),
      );
    }
    sec.append(coins);
    sec.append(h('p', { class: 'muted small center' }, 'Testversion: Käufe sind simuliert, es wird kein echtes Geld abgebucht.'));
  }

  // ------------------------------------------------------------ Profil
  private renderProfile() {
    const sec = this.screens.get('profile')!;
    const s = this.game.save;
    clear(sec);
    const mins = Math.floor(s.stats.playSeconds / 60);
    const nextMs = this.game.content.levels.milestones.find((m) => m.level > s.level);
    sec.append(
      h('div', { class: 'screen-title' }, h('h1', {}, 'Profil')),
      h('div', { class: 'profile-card' },
        h('div', { class: 'lvl-badge big' }, String(s.level)),
        h('div', {},
          h('h2', {}, `Level ${s.level}`),
          h('div', { class: 'muted' }, `${formatNumber(s.xp)} / ${formatNumber(this.game.xpForLevel(s.level))} XP bis Level ${s.level + 1}`),
          nextMs ? h('div', { class: 'small' }, `🎯 Level ${nextMs.level}: ${rewardText(nextMs.reward, this.game)}`) : null,
        ),
      ),
      h('div', { class: 'stat-grid' },
        stat('🫧', formatNumber(s.stats.squishes), 'Squishes'),
        stat('📖', `${this.game.ownedList().length}/${this.game.content.squishies.length}`, 'Gesammelt'),
        stat('🎁', formatNumber(s.stats.boxes), 'Boxen geöffnet'),
        stat('🤾', formatNumber(s.stats.throws), 'Würfe'),
        stat('🔥', String(s.daily.streak), 'Tage in Folge'),
        stat('⏱', `${mins} min`, 'Spielzeit'),
      ),
      h('h3', { class: 'section' }, 'Einstellungen'),
      toggle('🔊 Sound', s.settings.sound, (v) => { this.game.setSetting('sound', v); audio.enabled = v; }),
      toggle('📳 Vibration', s.settings.haptics, (v) => { this.game.setSetting('haptics', v); setHaptics(v); }),
      h('button', { class: 'btn ghost wide', onclick: () => this.openScenes() }, '🎨 Hintergrund wählen'),
      h('button', {
        class: 'btn ghost wide danger',
        onclick: async () => {
          if (await confirmDialog('Spielstand löschen?', 'Alle Squishys, Münzen und Level gehen verloren.', 'Löschen')) {
            await this.game.resetProgress();
            this.refresh();
            toast('Spielstand zurückgesetzt');
          }
        },
      }, 'Spielstand zurücksetzen'),
      h('p', { class: 'muted small center' }, `App-Version ${APP_VERSION} · Inhalte v${this.game.content.contentVersion} (${this.contentSource})`),
    );

    function stat(icon: string, v: string, label: string) {
      return h('div', { class: 'stat' }, h('div', { class: 'ic' }, icon), h('b', {}, v), h('span', {}, label));
    }
    function toggle(label: string, on: boolean, cb: (v: boolean) => void) {
      const input = h('input', { type: 'checkbox', checked: on }) as HTMLInputElement;
      input.addEventListener('change', () => cb(input.checked));
      return h('label', { class: 'toggle' }, h('span', {}, label), input, h('i', {}));
    }
  }

  // ------------------------------------------------------------ Popups
  private startupPopups() {
    const news = this.game.unseenNews()[0];
    if (news) {
      let close = () => {};
      close = modal(
        h('div', { class: 'dialog news' },
          h('h2', {}, news.title),
          h('p', {}, news.text),
          h('button', { class: 'btn wide', onclick: () => close() }, 'Cool!'),
        ),
        { onClose: () => { this.game.markNewsSeen(news.id); setTimeout(() => this.maybeDaily(), 300); } },
      );
    } else this.maybeDaily();
  }

  private maybeDaily() {
    if (this.game.dailyStatus().canClaim) this.openDaily();
  }

  private openDaily() {
    const st = this.game.dailyStatus();
    let close = () => {};
    const days = h('div', { class: 'daily-grid' });
    this.game.content.dailyRewards.forEach((r, i) => {
      const done = st.canClaim ? i < st.index : i <= st.index;
      const today = st.canClaim && i === st.index;
      days.append(
        h('div', { class: 'day' + (done ? ' done' : '') + (today ? ' today' : '') },
          h('div', { class: 'small' }, `Tag ${i + 1}`),
          h('div', { class: 'big' }, r.box ? '🎁' : r.gems ? '💎' : '🪙'),
          h('div', { class: 'small' }, rewardText(r, this.game)),
        ),
      );
    });
    close = modal(
      h('div', { class: 'dialog' },
        h('h2', {}, '☀️ Tägliche Belohnung'),
        h('p', { class: 'muted' }, st.canClaim ? `Tag ${st.streak} in Folge – komm jeden Tag wieder!` : 'Heute schon abgeholt. Bis morgen!'),
        days,
        st.canClaim
          ? h('button', {
              class: 'btn wide glow',
              onclick: () => {
                const r = this.game.claimDaily();
                close();
                if (r) {
                  audio.ui('coin');
                  haptic('medium');
                  toast('Erhalten: ' + rewardText(r, this.game));
                  this.renderPlayButtons();
                  this.processPendingBoxes();
                }
              },
            }, 'Abholen!')
          : h('button', { class: 'btn wide ghost', onclick: () => close() }, 'OK'),
      ),
    );
  }

  private openQuests() {
    let close = () => {};
    const render = () => {
      const list = h('div', { class: 'quest-list' });
      for (const { state, tpl } of this.game.questList()) {
        const done = state.progress >= tpl.target;
        list.append(
          h('div', { class: 'quest' + (state.claimed ? ' claimed' : '') },
            h('div', { class: 'q-main' },
              h('div', { class: 'q-text' }, tpl.text),
              h('div', { class: 'set-bar' }, h('div', { style: `width:${(state.progress / tpl.target) * 100}%` })),
              h('div', { class: 'small muted' }, `${state.progress}/${tpl.target} · ${rewardText(tpl.reward, this.game)}`),
            ),
            state.claimed
              ? h('span', { class: 'q-done' }, '✅')
              : h('button', {
                  class: 'btn small' + (done ? ' glow' : ''),
                  disabled: !done,
                  onclick: () => {
                    const r = this.game.claimQuest(state.id);
                    if (r) {
                      audio.ui('coin');
                      toast('Erhalten: ' + rewardText(r, this.game));
                      clear(body);
                      body.append(render());
                      this.renderPlayButtons();
                      this.processPendingBoxes();
                    }
                  },
                }, 'Abholen'),
          ),
        );
      }
      return list;
    };
    const body = h('div', {}, render());
    close = modal(
      h('div', { class: 'dialog' },
        h('h2', {}, '📋 Tägliche Quests'),
        h('p', { class: 'muted small' }, 'Jeden Tag gibt es neue Aufgaben.'),
        body,
        h('button', { class: 'btn wide ghost', onclick: () => close() }, 'Schließen'),
      ),
    );
  }

  private openScenes() {
    let close = () => {};
    const grid = h('div', { class: 'scene-grid' });
    for (const sc of this.game.content.scenes) {
      const locked = sc.unlockLevel > this.game.save.level;
      grid.append(
        h('button', {
          class: 'scene' + (sc.id === this.game.save.scene ? ' sel' : '') + (locked ? ' locked' : ''),
          style: `background:linear-gradient(${sc.bgTop},${sc.bgBottom} 70%,${sc.table} 70%)`,
          onclick: () => {
            if (locked) return toast(`Ab Level ${sc.unlockLevel}`);
            this.game.setScene(sc.id);
            this.stage.setScene(this.game.scene);
            close();
          },
        }, h('span', {}, locked ? `🔒 Lv ${sc.unlockLevel}` : sc.name)),
      );
    }
    close = modal(h('div', { class: 'dialog' }, h('h2', {}, '🎨 Hintergrund'), grid, h('button', { class: 'btn wide ghost', onclick: () => close() }, 'Schließen')));
  }

  private levelUp(level: number, reward: Reward, text?: string) {
    audio.ui('levelup');
    haptic('heavy', 0);
    let close = () => {};
    close = modal(
      h('div', { class: 'dialog levelup' },
        h('div', { class: 'lvl-badge huge' }, String(level)),
        h('h2', {}, 'Level aufgestiegen!'),
        text ? h('p', {}, text) : null,
        h('p', { class: 'reward' }, rewardText(reward, this.game)),
        h('button', { class: 'btn wide glow', onclick: () => close() }, 'Super!'),
      ),
      { onClose: () => setTimeout(() => this.processPendingBoxes(), 200) },
    );
  }
}
