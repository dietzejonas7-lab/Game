// ===========================================================================
// Zentrale Einstellungen.
// ===========================================================================

/**
 * Version der App selbst (nicht der Inhalte).
 * Erhöhen, wenn neuer PROGRAMMCODE in den Play Store kommt.
 * Inhalte mit "minAppVersion" höher als diese Zahl werden ignoriert –
 * so stürzt eine alte App nie wegen neuer Inhalte ab.
 */
export const APP_VERSION = 1;

/**
 * Von hier holt sich die App neue Inhalte (Strukturen, Forschung, Events ...).
 * Standard: die Datei auf GitHub Pages (wird automatisch bei jedem Push
 * veröffentlicht – siehe ANLEITUNG.md).
 * Leer lassen ('') = nur eingebaute Inhalte verwenden.
 */
export const CONTENT_URL = 'https://dietzejonas7-lab.github.io/Game/content/content.json';

/** Wie oft (Minuten) im Hintergrund nach neuen Inhalten geschaut wird */
export const UPDATE_CHECK_MINUTES = 15;

/** Unter diesem Namen wird der Spielstand gespeichert */
export const SAVE_KEY = 'kosmo.save';
