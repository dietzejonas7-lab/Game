// Prüft public/content/content.json auf Fehler.
// Aufruf: npm run check:content
import { readFileSync } from 'node:fs';
import { validateContent } from '../src/content/validate.ts';

const file = new URL('../public/content/content.json', import.meta.url);
let data: unknown;
try {
  data = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  console.error('❌ content.json ist kein gültiges JSON:\n  ' + (e as Error).message);
  console.error('   Tipp: Oft fehlt ein Komma oder es ist eins zu viel (z.B. nach dem letzten Eintrag).');
  process.exit(1);
}
const errors = validateContent(data);
if (errors.length) {
  console.error(`❌ ${errors.length} Fehler in content.json:`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
const c = data as { squishies: unknown[]; boxes: unknown[]; contentVersion: number };
console.log(`✅ content.json ist in Ordnung (Version ${c.contentVersion}, ${c.squishies.length} Squishys, ${c.boxes.length} Boxen)`);
