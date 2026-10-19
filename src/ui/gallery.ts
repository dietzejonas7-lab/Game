// Vorschau aller Squishys: im Browser die Adresse mit #galerie am Ende öffnen.
// Praktisch, um neue Squishys in content.json zu gestalten.
import type { GameContent } from '../content/types';
import { thumbnail } from '../render/stage';
import { h } from './dom';

export function showGallery(root: HTMLElement, content: GameContent) {
  document.documentElement.style.overflow = 'auto';
  document.body.style.overflow = 'auto';
  root.style.position = 'static';
  root.style.maxWidth = 'none';
  root.append(
    h('h1', { style: 'padding:16px' }, `Galerie – ${content.squishies.length} Squishys (Inhalte v${content.contentVersion})`),
    h('div', { style: 'display:flex;flex-wrap:wrap;gap:12px;padding:16px' },
      ...content.squishies.map((s) => {
        const rar = content.rarities.find((r) => r.id === s.rarity);
        return h('div', { style: `background:#fff;border-radius:16px;padding:8px;text-align:center;width:180px;border:3px solid ${rar?.color}` },
          h('img', { src: thumbnail(s, 160), width: 160, height: 160 }),
          h('div', { style: 'font-weight:800' }, s.name),
          h('div', { style: 'font-size:11px;color:#9a7d92' }, `${s.id} · ${s.material} · ${typeof s.shape === 'string' ? s.shape : 'eigene Form'}`),
        );
      }),
    ),
  );
}
