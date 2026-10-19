// ===========================================================================
// Lädt die Spielinhalte – OHNE dass die App neu installiert werden muss.
//
// Reihenfolge:
//  1. Online-Version von CONTENT_URL laden (neueste Inhalte)
//  2. Wenn kein Internet: zuletzt gespeicherte Online-Version
//  3. Wenn es die auch nicht gibt: die Version, die in der App eingebaut ist
//
// Kaputte Inhalte (Tippfehler) werden erkannt und ignoriert.
// ===========================================================================
import { APP_VERSION, CONTENT_URL } from '../config';
import { storage } from '../platform/platform';
import type { GameContent } from './types';
import { validateContent } from './validate';

const CACHE_KEY = 'squishy.contentCache';

export interface LoadedContent {
  content: GameContent;
  source: 'online' | 'cache' | 'eingebaut';
}

function usable(c: unknown): c is GameContent {
  const errs = validateContent(c);
  if (errs.length) {
    console.warn('Inhalte fehlerhaft, werden ignoriert:', errs);
    return false;
  }
  return (c as GameContent).minAppVersion <= APP_VERSION;
}

async function fetchJson(url: string, timeoutMs: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const sep = url.includes('?') ? '&' : '?';
    const res = await fetch(url + sep + 't=' + Date.now(), { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function loadContent(): Promise<LoadedContent> {
  // eingebaute Version (liegt in der App unter /content/content.json)
  let bundled: GameContent | null = null;
  try {
    bundled = await fetchJson('./content/content.json', 5000);
  } catch {
    /* sollte nie passieren */
  }

  if (CONTENT_URL) {
    try {
      const online = await fetchJson(CONTENT_URL, 4000);
      if (usable(online) && (!bundled || online.contentVersion >= bundled.contentVersion)) {
        await storage.set(CACHE_KEY, JSON.stringify(online));
        return { content: online, source: 'online' };
      }
    } catch (e) {
      console.info('Online-Inhalte nicht erreichbar:', e);
    }
    const cachedRaw = await storage.get(CACHE_KEY);
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw);
        if (usable(cached) && (!bundled || cached.contentVersion >= bundled.contentVersion)) {
          return { content: cached, source: 'cache' };
        }
      } catch {
        /* kaputter Cache */
      }
    }
  }
  if (bundled && usable(bundled)) return { content: bundled, source: 'eingebaut' };
  throw new Error('Keine gültigen Spielinhalte gefunden');
}

/** Prüft im Hintergrund, ob es neue Inhalte gibt (z.B. wenn die App wieder geöffnet wird). */
export async function checkForUpdate(currentVersion: number): Promise<GameContent | null> {
  if (!CONTENT_URL) return null;
  try {
    const online = await fetchJson(CONTENT_URL, 4000);
    if (usable(online) && online.contentVersion > currentVersion) {
      await storage.set(CACHE_KEY, JSON.stringify(online));
      return online;
    }
  } catch {
    /* offline */
  }
  return null;
}
