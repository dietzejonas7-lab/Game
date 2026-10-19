// ===========================================================================
// Alles, was je nach Gerät anders funktioniert:
//  - Speichern (im Browser: localStorage, in der App: Capacitor Preferences)
//  - Vibration (Haptik)
// ===========================================================================
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';

export const isNative = Capacitor.isNativePlatform();

export const storage = {
  async get(key: string): Promise<string | null> {
    try {
      if (isNative) return (await Preferences.get({ key })).value;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string) {
    try {
      if (isNative) await Preferences.set({ key, value });
      else localStorage.setItem(key, value);
    } catch {
      /* Speicher voll oder gesperrt */
    }
  },
  async remove(key: string) {
    try {
      if (isNative) await Preferences.remove({ key });
      else localStorage.removeItem(key);
    } catch {
      /* egal */
    }
  },
};

let hapticsOn = true;
let lastHaptic = 0;
export function setHaptics(on: boolean) {
  hapticsOn = on;
}

/** Kurzes Vibrieren. strength: 'light' | 'medium' | 'heavy' */
export function haptic(strength: 'light' | 'medium' | 'heavy' = 'light', minGapMs = 40) {
  if (!hapticsOn) return;
  const now = performance.now();
  if (now - lastHaptic < minGapMs) return;
  lastHaptic = now;
  if (isNative) {
    const style = strength === 'heavy' ? ImpactStyle.Heavy : strength === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light;
    void Haptics.impact({ style }).catch(() => {});
  } else if ('vibrate' in navigator) {
    try {
      navigator.vibrate(strength === 'heavy' ? 30 : strength === 'medium' ? 15 : 6);
    } catch {
      /* nicht unterstützt */
    }
  }
}
