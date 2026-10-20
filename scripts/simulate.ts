// ===========================================================================
// Spielt das Spiel automatisch durch, um die Balance zu prüfen.
// Aufruf:  npm run simulate            (10 Universen, 3 Tipps pro Sekunde)
//          npm run simulate -- 30 0    (30 Universen, ohne Tippen = reiner Idle-Spieler)
//          npm run simulate -- 30 3 2  (… und jedes Universum spätestens nach 2 Stunden beenden)
//
// Der "Bot" kauft einfach immer, was er sich leisten kann. Echte Spieler sind
// meist etwas langsamer – die Zeiten sind also eher die untere Grenze.
// ===========================================================================
import { readFileSync } from 'node:fs';
import type { GameContent } from '../src/content/types.ts';
import { Engine } from '../src/engine/engine.ts';
import { fmt, fmtTime } from '../src/engine/format.ts';
import { newSave } from '../src/engine/state.ts';

const universes = Number(process.argv[2] ?? 10);
const clicksPerSecond = Number(process.argv[3] ?? 3);
const maxRunHours = Number(process.argv[4] ?? 4);

const file = process.env.SIM_CONTENT ?? new URL('../public/content/content.json', import.meta.url);
const content = JSON.parse(readFileSync(file, 'utf8')) as GameContent;
const eng = new Engine(content, newSave());
eng.s.settings.autoCollapse = false;
let totalTime = 0;

// Naturgesetze, die der Bot positiv einstellt (Rest bleibt auf 0)
const positiveLaws = new Set(['gravity', 'fine_structure', 'cosmological_constant', 'strong_force', 'dark_matter', 'anthropic']);

for (let u = 1; u <= universes; u++) {
  const epochTimes: string[] = [];
  let t = 0;
  let lastEpoch = eng.s.run.epoch;
  while (!eng.s.run.dead && t < maxRunHours * 3600) {
    for (let i = 0; i < clicksPerSecond; i++) eng.click();
    if (eng.anomaly && Math.random() < 0.6) eng.catchAnomaly();
    // Forschung: billigste zuerst
    for (const up of content.upgrades) if (eng.upgradeVisible(up)) eng.buyUpgrade(up.id);
    // Strukturen: von teuer nach billig, so viele wie möglich
    for (let i = content.producers.length - 1; i >= 0; i--) eng.buyProducer(content.producers[i].id, -1);
    eng.tick(1);
    t++;
    // Ein echter Spieler startet neu, wenn sich das lohnt (Gewinn verdoppelt seine Quintessenz)
    if (t % 60 === 0 && eng.s.qTotal > 0 && eng.prestigeGain() >= eng.s.qTotal) break;
    if (eng.s.run.epoch !== lastEpoch) {
      lastEpoch = eng.s.run.epoch;
      epochTimes.push(`${content.epochs[lastEpoch].name} @${fmtTime(t)}`);
    }
  }
  totalTime += t;
  const gain = eng.prestigeGain();
  const dead = eng.s.run.dead;
  console.log(
    `Universum ${String(u).padStart(3)} | ${dead ? 'Wärmetod' : 'Abbruch '} nach ${fmtTime(t).padEnd(10)} | ` +
      `+${fmt(gain).padEnd(7)} ✦ | gesamt gespielt ${fmtTime(totalTime).padEnd(12)} | ${epochTimes.join(', ')}`,
  );
  eng.collapse();
  // Quintessenz ausgeben: immer das Billigste kaufen
  for (let i = 0; i < 500; i++) {
    const options: { cost: number; buy: () => boolean }[] = [];
    for (const l of content.laws)
      if (eng.meets(l.unlock) && eng.lawLevel(l.id) < l.maxLevel) options.push({ cost: eng.lawCost(l), buy: () => eng.buyLawLevel(l.id) });
    for (const e of content.eternals)
      if (eng.meets(e.unlock) && (!e.maxLevel || eng.eternalLevel(e.id) < e.maxLevel))
        options.push({ cost: eng.eternalCost(e), buy: () => eng.buyEternal(e.id) });
    options.sort((a, b) => a.cost - b.cost);
    if (!options.length || options[0].cost > eng.s.q) break;
    options[0].buy();
  }
  for (const l of content.laws) {
    const st = eng.s.laws[l.id];
    if (st) st.setting = positiveLaws.has(l.id) ? st.level : 0;
  }
  eng.invalidate();
}
