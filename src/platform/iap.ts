// ===========================================================================
// In-App-Käufe (Echtgeld).
//
// JETZT: Test-Modus. Es wird kein echtes Geld abgebucht – ein Fenster fragt
// nur "Testkauf?" und gibt die Diamanten. So kann alles ausprobiert werden.
//
// SPÄTER (siehe ANLEITUNG.md, Kapitel "Echtgeld-Käufe"):
// Hier wird Google Play Billing angeschlossen (z.B. über RevenueCat).
// Nur diese eine Datei muss dafür geändert werden – der Rest des Spiels
// ruft nur `purchase(productId)` auf.
// ===========================================================================
import type { ProductDef } from '../content/types';
import { confirmDialog } from '../ui/dom';

export type PurchaseResult = { ok: true; productId: string } | { ok: false; reason: string };

export const IAP_TEST_MODE = true;

export async function purchase(product: ProductDef): Promise<PurchaseResult> {
  if (IAP_TEST_MODE) {
    const ok = await confirmDialog(
      'Testkauf',
      `„${product.name}" (${product.priceLabel})\n\nDas ist ein TEST – es wird kein echtes Geld abgebucht.`,
      'Test-Kauf',
    );
    return ok ? { ok: true, productId: product.productId } : { ok: false, reason: 'abgebrochen' };
  }
  // TODO: Google Play Billing (RevenueCat) – siehe ANLEITUNG.md
  return { ok: false, reason: 'Käufe sind noch nicht eingerichtet' };
}
