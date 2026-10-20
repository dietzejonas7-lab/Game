# 🌌 Kosmogenesis

Ein Idle-/Clicker-Spiel fürs Handy: Erschaffe ein Universum vom Urknall bis zum Bewusstsein.
Jede Struktur erzeugt **Entropie** – erreicht sie die Grenze, stirbt dein Universum den **Wärmetod**.
Beim Neustart schreibst du die **Naturgesetze** um und jedes Universum spielt sich anders.

**👉 Alles Wichtige steht in der [ANLEITUNG.md](ANLEITUNG.md)** (Schritt für Schritt, auch ohne Vorkenntnisse).

## Kurz-Befehle

```bash
npm install            # einmalig: benötigte Pakete laden
npm run dev            # Spiel im Browser starten (mit Live-Neuladen)
npm run check:content  # content.json auf Fehler prüfen
npm run simulate       # Balance testen: ein Bot spielt das Spiel durch
npm run build          # fertige Version bauen
npm run android:sync   # Web-Teil in das Android-Projekt kopieren
npm run icons          # App-Icon & Startbild aus assets/ neu erzeugen
```

- Alle Inhalte (Epochen, Strukturen, Forschung, Gesetze, Events): `public/content/content.json`
- Test-Werkzeuge im Browser: `#dev` an die Adresse hängen → Einstellungen ⚙️
