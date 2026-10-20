// Macht aus Effekten und Bedingungen lesbaren Text, z.B. "Energie ×2".
import type { Effect, GameContent, Requirement } from '../content/types';
import { fmt, fmtMult } from '../engine/format';

function name(c: GameContent, id: string | undefined) {
  if (!id) return '?';
  return (
    c.resources.find((r) => r.id === id)?.name ??
    c.producers.find((p) => p.id === id)?.name ??
    c.epochs.find((e) => e.id === id)?.name ??
    id
  );
}

function icon(c: GameContent, id: string) {
  return c.resources.find((r) => r.id === id)?.icon ?? '';
}

/** power: wie oft der Effekt wirkt (Stufe/Reglerstellung) */
export function describeEffect(c: GameContent, e: Effect, power = 1): string {
  const v = e.value ?? 1;
  const m = Math.pow(v, power);
  const add = v * power;
  switch (e.type) {
    case 'producerMult': return `${name(c, e.target)} ${fmtMult(m)}`;
    case 'resourceMult': return `${icon(c, e.target!)} ${name(c, e.target)} ${fmtMult(m)}`;
    case 'globalMult': return `Alle Produktion ${fmtMult(m)}`;
    case 'clickMult': return `Tippen ${fmtMult(m)}`;
    case 'clickSeconds': return `Tippen +${fmt(add * 100)} % der Produktion pro Sekunde`;
    case 'entropyMult': return `Entropie${e.target ? ' von ' + name(c, e.target) : ''} ${fmtMult(m)}`;
    case 'maxEntropyMult': return `Wärmetod-Grenze ${fmtMult(m)}`;
    case 'costMult': return `Kosten${e.target ? ' von ' + name(c, e.target) : ''} ${fmtMult(m)}`;
    case 'synergy': return `${name(c, e.source)} verstärkt ${name(c, e.target)} (Stärke ${fmt(add)})`;
    case 'offlineHours': return `Offline-Fortschritt +${fmt(add)} h`;
    case 'anomalyRate': return `Anomalien ${fmtMult(m)} so oft`;
    case 'anomalyPower': return `Anomalien ${fmtMult(m)} so stark`;
    case 'autobuy': return `Auto-Kauf: ${name(c, e.target)}`;
    case 'autoCollapse': return 'Automatischer Kollaps beim Wärmetod';
    case 'startResources': return `Start mit +${fmt(add)} ${name(c, e.target)}`;
    case 'prestigeMult': return `Quintessenz ${fmtMult(m)}`;
  }
  return '';
}

export function describeEffects(c: GameContent, list: Effect[], power = 1) {
  return list.map((e) => describeEffect(c, e, power)).join(' · ');
}

/** Beschreibung einer Bedingung (für gesperrte Dinge) */
export function describeReq(c: GameContent, r?: Requirement): string {
  if (!r) return '';
  const parts: string[] = [];
  const amounts = (a: Record<string, number> | undefined, prefix: string) => {
    if (a) for (const k in a) parts.push(`${prefix}${fmt(a[k])} ${icon(c, k)} ${name(c, k)}`);
  };
  amounts(r.resources, 'Besitze ');
  amounts(r.totals, 'Erzeuge ');
  amounts(r.lifetime, 'Insgesamt ');
  if (r.producers) for (const k in r.producers) parts.push(`${r.producers[k]}× ${name(c, k)}`);
  if (r.upgrades) for (const u of r.upgrades) parts.push(`Forschung „${c.upgrades.find((x) => x.id === u)?.name ?? u}“`);
  if (r.epoch) parts.push(`Erreiche ${name(c, r.epoch)}`);
  if (r.epochEver) parts.push(`Erreiche einmal ${name(c, r.epochEver)}`);
  if (r.universes) parts.push(`${r.universes} kollabierte Universen`);
  if (r.heatDeaths) parts.push(`${r.heatDeaths}× Wärmetod`);
  if (r.clicks) parts.push(`${fmt(r.clicks)} Tipps`);
  if (r.anomalies) parts.push(`${r.anomalies} Anomalien gefangen`);
  return parts.join(', ');
}
