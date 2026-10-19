// Die Animation beim Öffnen einer Box – inklusive Squishy, das man direkt drücken kann.
import { audio } from '../audio/audio';
import type { BoxDef } from '../content/types';
import type { BoxResult, Game } from '../game/game';
import { haptic } from '../platform/platform';
import { Stage } from '../render/stage';
import { formatNumber } from '../util';
import { h, modal } from './dom';

export function boxVisual(b: BoxDef, size = 110) {
  return h('div', {
    class: 'box-visual',
    style: `--c1:${b.color};--c2:${b.color2 ?? b.color};width:${size}px;height:${size}px`,
  },
    h('div', { class: 'box-lid' }),
    h('div', { class: 'box-body' }),
    h('div', { class: 'box-ribbon' }),
    h('div', { class: 'box-icon' }, b.icon ?? '🎁'),
  );
}

/** Öffnet eine Box (Bezahlung muss vorher passiert sein). */
export function openBoxSequence(game: Game, box: BoxDef, opts: { onPlay?: (id: string) => void; onDone?: () => void; again?: () => boolean } = {}) {
  const result = game.rollBox(box);
  audio.unlock();

  const stageWrap = h('div', { class: 'reveal-stage hidden' });
  const visual = boxVisual(box, 150);
  const hint = h('div', { class: 'tap-hint' }, 'Tippe auf die Box!');
  const info = h('div', { class: 'reveal-info hidden' });
  const rays = h('div', { class: 'rays', style: `--rc:${result.rarity.color}` });
  const root = h('div', { class: 'box-open' }, rays, visual, stageWrap, hint, info);

  let taps = 0;
  let opened = false;
  let stage: Stage | null = null;
  const close = modal(root, {
    dismissable: false,
    className: 'fullscreen',
    onClose: () => {
      stage?.stop();
      opts.onDone?.();
    },
  });

  const needed = result.rarity.id === 'common' ? 2 : 3;
  visual.addEventListener('click', () => {
    if (opened) return;
    taps++;
    audio.ui('boxShake');
    haptic(taps >= needed ? 'heavy' : 'medium');
    visual.classList.remove('shake');
    void visual.offsetWidth;
    visual.classList.add('shake');
    if (taps >= 2) visual.style.filter = `drop-shadow(0 0 ${12 + taps * 8}px ${result.rarity.color})`;
    if (taps >= needed) {
      opened = true;
      setTimeout(() => reveal(result), 260);
    }
  });

  function reveal(r: BoxResult) {
    audio.ui('pop');
    audio.reveal(r.rarity.id);
    haptic('heavy', 0);
    visual.classList.add('burst');
    hint.classList.add('hidden');
    rays.classList.add('on');
    setTimeout(() => {
      visual.remove();
      stageWrap.classList.remove('hidden');
      const canvas = h('canvas', { class: 'reveal-canvas' });
      stageWrap.append(canvas);
      stage = new Stage(canvas, { interactive: true, floorRatio: 0.86, sizeRatio: 0.27 });
      stage.setSquishy(r.squishy);
      stage.events.onSquish = (x, y) => stage?.burst(x, y, r.rarity.color, 6);
      stage.start();

      const badges = h('div', { class: 'badges' });
      if (r.isNew) badges.append(h('span', { class: 'badge new' }, 'NEU!'));
      else badges.append(h('span', { class: 'badge dup' }, `Doppelt: +${formatNumber(r.duplicateCoins)} 🪙`));
      if (r.newStar) badges.append(h('span', { class: 'badge star' }, `⭐ Stufe ${game.stars(r.squishy.id)}`));

      const again = opts.again;
      const children: (HTMLElement | string)[] = [
        h('div', { class: 'rarity-label', style: `color:${r.rarity.color}` }, r.rarity.name),
        h('h2', {}, r.squishy.name),
        badges,
        h('p', { class: 'muted' }, r.squishy.description ?? ''),
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost', onclick: () => close() }, 'Weiter'),
          h('button', {
            class: 'btn',
            onclick: () => {
              opts.onPlay?.(r.squishy.id);
              close();
            },
          }, 'Spielen'),
        ),
        again
          ? h('button', {
              class: 'btn secondary wide',
              onclick: () => {
                if (again()) {
                  const next = opts.onDone;
                  opts.onDone = undefined;
                  close();
                  setTimeout(() => openBoxSequence(game, box, { ...opts, onDone: next }), 200);
                }
              },
            }, 'Nochmal öffnen')
          : '',
      ];
      info.append(...children);
      info.classList.remove('hidden');
    }, 380);
  }
}
