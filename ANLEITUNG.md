# 📖 Anleitung: Kosmogenesis

Diese Anleitung erklärt alles von Anfang an – auch wenn du noch nie programmiert hast.
Lies sie einmal komplett durch und arbeite die Kapitel dann der Reihe nach ab.

**Inhalt**

1. [Das Spielprinzip](#1-das-spielprinzip)
2. [Was ist schon fertig?](#2-was-ist-schon-fertig)
3. [Wie funktioniert die Technik? (einfach erklärt)](#3-wie-funktioniert-die-technik)
4. [Einmalige Einrichtung auf GitHub](#4-einmalige-einrichtung-auf-github)
5. [Das Spiel ausprobieren](#5-das-spiel-ausprobieren)
6. [Inhalte ändern – ohne Neuinstallation](#6-inhalte-ändern--ohne-neuinstallation)
7. [Die Balance prüfen (Simulation)](#7-die-balance-prüfen-simulation)
8. [Was geht nur mit einem App-Update?](#8-was-geht-nur-mit-einem-app-update)
9. [Veröffentlichen im Google Play Store](#9-veröffentlichen-im-google-play-store)
10. [Geld verdienen (später)](#10-geld-verdienen-später)
11. [Kosten im Überblick](#11-kosten-im-überblick)
12. [Welche Datei macht was?](#12-welche-datei-macht-was)
13. [Ideen für später](#13-ideen-für-später)
14. [Wörterbuch](#14-wörterbuch)

---

## 1. Das Spielprinzip

Du bist eine kosmische Kraft und erschaffst ein Universum – vom Urknall bis zum Wärmetod.

**Die Grundschleife (wie in jedem Idle-Spiel):** Tippen erzeugt Energie ⚡. Mit Energie kaufst du
**Strukturen** (z.B. Quantenfluktuationen), die automatisch weiter produzieren – auch wenn die App zu ist.

**Was Kosmogenesis besonders macht – drei Ideen, die es so noch nicht gibt:**

| Idee | Wie es funktioniert | Warum es Spaß macht |
|---|---|---|
| 🔥 **Entropie als Lebensuhr** | Jede Struktur erzeugt Entropie (Unordnung). Erreicht sie die Grenze, stirbt das Universum den **Wärmetod** – nichts produziert mehr. | Man kann nicht einfach blind alles kaufen. **Multiplikatoren** (Forschung) erzeugen keine Entropie, zusätzliche Strukturen schon. Klasse statt Masse! |
| 🌀 **Naturgesetze umschreiben** | Beim Kollaps bekommst du **Quintessenz ✦**. Damit schaltest du Naturgesetze frei und stellst sie beim nächsten Urknall per **Regler** ein (von −10 bis +10). | Jedes Gesetz hat Vor- **und** Nachteile. Mehr Gravitation = mehr Sterne, aber schnelleres Altern. Jedes Universum spielt sich anders – du baust dir deine eigene „Physik“. |
| 🗺️ **7 Epochen der Geschichte des Alls** | Quantenära ⚡ → Teilchen ⚛️ → Atome 💠 → Sterne ⭐ → Galaxien 🌌 → Leben 🧬 → Bewusstsein 🧠. Jede Epoche hat eigene Strukturen, eine eigene Ressource und eigene Grafik. | Man sieht, wie das eigene Universum „erwachsen“ wird. Später erreichst du alles in Sekunden – und gehst immer weiter. |

**Langes Grinden:** Das erste Universum dauert ca. 30 Minuten und kommt bis zum Atomzeitalter. Bis
zum Bewusstsein braucht man viele Universen (bei normalem Spielen mehrere Tage). Danach geht es endlos
weiter: unbegrenzte Ewigkeits-Stufen, 139 Erfolge, Meilensteine bei 25/50/100/200 Einheiten jeder Struktur.

**Weitere Elemente:**
- ☄️ **Anomalien**: Kometen, Supernovae, Gammablitze, Mini-Schwarze-Löcher fliegen über den Bildschirm – antippen für Boni.
- ♾️ **Ewigkeit**: dauerhafte Verbesserungen (bleiben für immer), z.B. Auto-Kauf, mehr Offline-Zeit, automatischer Kollaps.
- 🏆 **Erfolge**: jeder gibt einen kleinen dauerhaften Produktionsbonus.
- 🌙 **Offline-Fortschritt**: Das Universum läuft weiter, während die App zu ist (anfangs bis 3 Stunden).
- 🎃 **Events**: zeitlich begrenzte Aktionen (Beispiel: Halloween-Woche mit +50 % Produktion).

---

## 2. Was ist schon fertig?

| Bereich | Was drin ist |
|---|---|
| **Inhalte** | 7 Epochen, 35 Strukturen, 210 Forschungen, 8 Naturgesetze, 22 Ewigkeits-Verbesserungen, 139 Erfolge, 6 Anomalien, 1 Event |
| **Grafik** | Animierter Sternenhimmel; für jede Epoche ein eigenes Motiv (Singularität, Plasma, Atom, Stern, Spiralgalaxie, Planet, neuronales Netz); Partikel beim Tippen, Urknall-Blitz, Wärmetod-Verdunkelung |
| **Sound** | Töne beim Tippen/Kaufen/Erfolgen, Urknall-Donner, ruhige Weltraum-Musik (alles live erzeugt, abschaltbar) |
| **Vibration** | leichtes Vibrieren beim Tippen und Kaufen |
| **Speichern** | automatisch alle 10 Sekunden und beim Schließen; Spielstand sichern/laden als Text (Einstellungen) |
| **Offline** | Fortschritt wird beim Öffnen nachberechnet, mit Bericht „Willkommen zurück“ |
| **Live-Updates** | Alle Inhalte kommen aus **einer Datei**, die online geändert werden kann – die App holt sie automatisch |
| **Werkzeuge** | Fehlerprüfung für die Inhaltsdatei, Balance-Simulation, Entwickler-Knöpfe zum Testen |
| **Android** | fertiges App-Projekt, App-Icon, Startbild, automatischer Bau auf GitHub |

---

## 3. Wie funktioniert die Technik?

Das Spiel ist mit **Web-Technik** gebaut (HTML, CSS, TypeScript – damit werden auch Webseiten gemacht).
Das Werkzeug **Capacitor** verpackt alles in eine echte Android-App für den Play Store.

- ✅ Du kannst das Spiel **sofort im Browser** testen – am PC oder Handy.
- ✅ **Inhalte lassen sich jederzeit ändern, ohne dass jemand die App neu installieren muss.**
- ✅ Später geht auch eine iPhone-Version mit demselben Code.

```
  ┌──────────────────────┐        lädt beim Start        ┌────────────────────────────┐
  │  App auf dem Handy   │  ──────────────────────────▶  │  content.json auf GitHub   │
  │  (Programmcode)      │   neue Strukturen, Preise,    │  Pages (Internet)          │
  │                      │   Forschung, Events ...       │  ← DU änderst diese Datei  │
  └──────────────────────┘                               └────────────────────────────┘
       ▲ ohne Internet: nimmt die zuletzt geladene Version (oder die eingebaute)
```

Es gibt **zwei Arten von Änderungen**:

| Art | Beispiele | Wie kommt es zu den Spielern? |
|---|---|---|
| **Inhalte** | neue Strukturen, Forschung, Naturgesetze, Erfolge, Preise, Balance, Events, News, ganze neue Epochen | `content.json` ändern → **automatisch, ohne Neuinstallation** |
| **Programmcode** | ganz neue Spielmechaniken, neue Effekt-Arten, neue Grafik-Motive | **App-Update** im Play Store (Kapitel 8) |

> 💡 Bei einem App-Update bleibt der Spielstand der Spieler natürlich erhalten.

---

## 4. Einmalige Einrichtung auf GitHub

Dein Code liegt auf **GitHub**. GitHub kann außerdem automatisch für dich arbeiten („GitHub Actions“):
Fehler prüfen, das Spiel veröffentlichen und die Android-App bauen.

### 4.1 Den Code in den Haupt-Branch bringen
Ich habe alles im Branch `ccr-e65491da-xld3gl` gespeichert. Damit die Automatik läuft, muss das in den
**Haupt-Branch** (meist `main`):

1. Öffne https://github.com/dietzejonas7-lab/Game
2. Wenn oben ein gelber Hinweis „…had recent pushes – **Compare & pull request**“ erscheint: klicken →
   **Create pull request** → **Merge pull request** → **Confirm merge**.
3. Gibt es noch gar keinen `main`-Branch, kannst du meinen Branch umbenennen:
   **Settings → General → Default branch**.

### 4.2 GitHub Pages einschalten (für die Online-Inhalte)
1. Im Repository **Settings** (Zahnrad) → links **Pages**.
2. Bei **Source** „**GitHub Actions**“ auswählen.
3. Fertig. Danach ist das Spiel erreichbar unter **https://dietzejonas7-lab.github.io/Game/**
   und die Inhalte unter https://dietzejonas7-lab.github.io/Game/content/content.json

> ⚠️ GitHub Pages ist im kostenlosen Konto nur für **öffentliche** Repositories verfügbar. Soll dein
> Repository privat bleiben, sag Bescheid – dann nehmen wir einen anderen kostenlosen Dienst
> (z.B. Cloudflare Pages). Dafür muss nur `CONTENT_URL` in `src/config.ts` geändert werden.

### 4.3 Prüfen, ob alles läuft
Im Repository auf **Actions** klicken:
- **Web & Inhalte** – prüft `content.json`, baut das Spiel und veröffentlicht es (✅ = gut, ❌ = Fehler, draufklicken zeigt den Grund).
- **Android App** – baut die App-Datei für dein Handy.

---

## 5. Das Spiel ausprobieren

### 5.1 Am schnellsten: im Browser
Sobald Pages läuft: **https://dietzejonas7-lab.github.io/Game/** öffnen (Handy oder PC).
Tipp: Im Handy-Chrome über ⋮ → „Zum Startbildschirm hinzufügen“ bekommst du ein App-Symbol.

### 5.2 Als echte App auf dem Android-Handy
1. GitHub → **Actions** → links **Android App** → rechts **Run workflow** → **Run workflow**.
2. 5–10 Minuten warten, bis ein grüner Haken erscheint. Den Durchlauf anklicken.
3. Unten bei **Artifacts** **kosmogenesis-test-apk** herunterladen (ZIP – entpacken).
4. `app-debug.apk` aufs Handy bringen (z.B. Google Drive) und antippen → „Unbekannte Quellen“ erlauben → installieren.

### 5.3 Zum Testen: Entwickler-Werkzeuge
Hänge `#dev` an die Adresse (z.B. `https://dietzejonas7-lab.github.io/Game/#dev`). Dann gibt es in den
**Einstellungen ⚙️** Knöpfe wie „Ressourcen ×1000“, „+100 ✦“, „1 Stunde vorspulen“ oder „Anomalie jetzt“ –
perfekt, um neue Inhalte schnell anzuschauen, ohne stundenlang zu spielen.

> ⚠️ Das verändert deinen Spielstand im Browser. Zum „echten“ Spielen danach in den Einstellungen
> „Alles zurücksetzen“.

### 5.4 Am eigenen PC entwickeln (optional, für später)
1. **Node.js** (LTS) installieren: https://nodejs.org und **Git**: https://git-scm.com
2. Ein Terminal öffnen und eingeben:
   ```bash
   git clone https://github.com/dietzejonas7-lab/Game.git
   cd Game
   npm install
   npm run dev
   ```
3. Im Browser `http://localhost:5173` öffnen. **Jede gespeicherte Änderung erscheint sofort** (auch in `content.json`).
4. Auf dem Handy im selben WLAN: die Adresse bei `Network:` öffnen (z.B. `http://192.168.0.23:5173`).
5. Für die Android-App am PC: zusätzlich **Android Studio** installieren, dann `npm run android:sync`
   und `npm run android:open` → in Android Studio auf ▶️.

---

## 6. Inhalte ändern – ohne Neuinstallation

Alle Inhalte stehen in **einer** Datei: [`public/content/content.json`](public/content/content.json).

### 6.1 So änderst du etwas (direkt auf GitHub, sogar vom Handy aus)
1. Auf GitHub die Datei `public/content/content.json` öffnen.
2. Oben rechts auf den **Stift ✏️** („Edit this file“) klicken.
3. Deine Änderung machen.
4. **Ganz wichtig:** oben bei `"contentVersion"` die Zahl um **1 erhöhen** (z.B. `1` → `2`).
   Nur dann wissen die Apps, dass es etwas Neues gibt.
5. **Commit changes…** → nochmal **Commit changes**.
6. Unter **Actions** prüft GitHub die Datei automatisch:
   - ✅ grüner Haken → nach 1–2 Minuten online. Jede App lädt es beim nächsten Öffnen (oder nach
     spätestens 15 Minuten) mit der Meldung „✨ Neue Inhalte geladen!“.
   - ❌ rotes X → Es ist ein Fehler drin, **die Spieler bekommen nichts davon mit**.
     Klick auf den Durchlauf → „Inhalte prüfen“ → dort steht auf Deutsch, was falsch ist.

> 💡 Selbst wenn eine kaputte Datei online gehen sollte: Die App prüft jede Datei selbst und ignoriert
> fehlerhafte Inhalte. Es kann nichts kaputtgehen.

**JSON-Regeln (das Format der Datei):**
- Texte stehen in `"Anführungszeichen"`.
- Zwischen Einträgen steht ein Komma `,` – **nach dem letzten Eintrag einer Liste aber nicht!**
- Listen stehen in `[ ]`, Objekte in `{ }`.
- Zahlen ohne Anführungszeichen, Kommazahlen mit **Punkt**: `1.15` (nicht `1,15`). Große Zahlen: `1e6` = 1.000.000.
- **Ändere nie eine `id`**, die es schon gibt – sonst verlieren Spieler, was sie davon besaßen.

### 6.2 Aufbau der Datei

| Bereich | Was drin steht |
|---|---|
| `balance` | Grundregeln: Tipp-Ertrag, Meilensteine, Wärmetod-Grenze, Quintessenz-Formel, Offline-Stunden, Anomalie-Häufigkeit |
| `resources` | die 7 Ressourcen (Name, Symbol, Farbe) |
| `epochs` | die Epochen (Ressource, Bedingung, Farben, Bild, Einführungstext) |
| `producers` | die Strukturen (Preis, Produktion, Entropie) |
| `upgrades` | Forschung (einmal pro Universum kaufbar) |
| `laws` | Naturgesetze (Regler, Quintessenz-Kosten) |
| `eternals` | Ewigkeit (dauerhaft, Quintessenz-Kosten) |
| `achievements` | Erfolge |
| `anomalies` | die fliegenden Objekte zum Antippen |
| `events` | zeitlich begrenzte Aktionen |
| `news` | Nachrichten, die einmal beim Start erscheinen |

### 6.3 Effekte – die Bausteine für Boni
Forschung, Gesetze, Ewigkeit, Erfolge und Events wirken über eine Liste `"effects"`. Jeder Effekt hat
einen `type`, oft ein `target` (Ziel) und einen `value` (Wert):

| `type` | Wirkung | Beispiel |
|---|---|---|
| `producerMult` | eine Struktur produziert mehr | `{"type": "producerMult", "target": "fluctuation", "value": 2}` |
| `resourceMult` | eine Ressource wird mehr produziert | `{"type": "resourceMult", "target": "stars", "value": 1.5}` |
| `globalMult` | alles wird mehr produziert | `{"type": "globalMult", "value": 2}` |
| `clickMult` | Tippen bringt mehr | `{"type": "clickMult", "value": 3}` |
| `clickSeconds` | Tippen gibt zusätzlich einen Anteil der Produktion pro Sekunde (0.1 = 10 %) | `{"type": "clickSeconds", "value": 0.1}` |
| `entropyMult` | weniger/mehr Entropie (`0.8` = −20 %); optional nur für eine Struktur/Epoche (`target`) | `{"type": "entropyMult", "value": 0.8}` |
| `maxEntropyMult` | Wärmetod-Grenze höher | `{"type": "maxEntropyMult", "value": 1.5}` |
| `costMult` | Preise (`0.9` = 10 % billiger); optional `target` | `{"type": "costMult", "target": "stars", "value": 0.9}` |
| `synergy` | Ressource `source` verstärkt `target` – je mehr davon erzeugt wurde, desto stärker | `{"type": "synergy", "source": "stars", "target": "energy", "value": 0.4}` |
| `offlineHours` | mehr Offline-Stunden | `{"type": "offlineHours", "value": 2}` |
| `anomalyRate` / `anomalyPower` | Anomalien öfter / stärker | `{"type": "anomalyRate", "value": 1.2}` |
| `autobuy` | Auto-Kauf für eine Epoche | `{"type": "autobuy", "target": "quantum"}` |
| `autoCollapse` | Kollaps beim Wärmetod automatisch | `{"type": "autoCollapse"}` |
| `startResources` | jedes Universum startet mit mehr | `{"type": "startResources", "target": "energy", "value": 500}` |
| `prestigeMult` | mehr Quintessenz | `{"type": "prestigeMult", "value": 1.15}` |

**Bedingungen** (`unlock` bzw. `req`) – alle angegebenen Punkte müssen erfüllt sein:
`resources` (besitzen), `totals` (in diesem Universum erzeugt), `lifetime` (insgesamt erzeugt),
`producers` (so viele Strukturen), `upgrades` (Forschungen), `epoch` (in diesem Universum erreicht),
`epochEver` (jemals erreicht), `universes`, `heatDeaths`, `clicks`, `anomalies`.
Beispiel: `"unlock": {"producers": {"red_dwarf": 10}, "universes": 2}`

### 6.4 Beispiele

**Eine neue Forschung** (in `"upgrades"` einfügen, Komma nicht vergessen):
```json
{"id": "dark_flow", "name": "Dunkler Fluss", "icon": "🌊", "desc": "Eine geheimnisvolle Strömung im All.", "cost": {"galaxies": 50000}, "unlock": {"producers": {"spiral_galaxy": 20}}, "effects": [{"type": "resourceMult", "target": "galaxies", "value": 3}]}
```

**Eine neue Struktur** (in `"producers"`):
```json
{"id": "white_dwarf", "name": "Weißer Zwerg", "icon": "⚪", "epoch": "stars", "desc": "Der heiße Rest eines Sterns.", "cost": {"stars": 5000}, "costGrowth": 1.15, "produces": {"stars": 15}, "entropy": 3, "unlock": {"producers": {"yellow_star": 1}}}
```
- `cost`: Preis der ersten Einheit · `costGrowth`: jede weitere kostet so viel mal mehr (1.15 = +15 %)
- `produces`: pro Sekunde und Einheit · `entropy`: Entropie pro Sekunde und Einheit

**Ein Wochenend-Event** (in `"events"`) plus Nachricht (in `"news"`):
```json
{"id": "xmas_2026", "name": "Kosmische Weihnacht", "icon": "🎄", "desc": "Doppelte Produktion!", "from": "2026-12-24", "until": "2026-12-26", "effects": [{"type": "globalMult", "value": 2}]}
```
```json
{"id": "xmas_2026", "title": "🎄 Frohe Weihnachten!", "text": "Vom 24. bis 26.12. produziert dein Universum doppelt so viel.", "from": "2026-12-20", "until": "2026-12-26"}
```

**Das Spiel leichter oder schwerer machen** (in `"balance"`):
- `"maxEntropy": 30000` → größer = Universen leben länger
- `"offlineHours": 3` → mehr Offline-Fortschritt am Anfang
- `"bonusPerPoint": 0.01` → wie stark unbenutzte Quintessenz die Produktion erhöht
- `"anomalies": {"minSeconds": 70, "maxSeconds": 160}` → wie oft Anomalien kommen

**Eine ganz neue Epoche** (z.B. „Multiversum“) geht auch ohne App-Update: neue Ressource in
`"resources"`, neue Epoche in `"epochs"` (als `visual` eins der vorhandenen Bilder: `singularity`, `plasma`,
`atoms`, `stars`, `galaxy`, `life`, `mind`), dazu Strukturen mit `"epoch": "<neue id>"`.
Für ein eigenes neues Bild braucht es ein App-Update – frag mich einfach.

---

## 7. Die Balance prüfen (Simulation)

Bei einem Idle-Spiel ist das Wichtigste, dass es **nicht zu schnell und nicht zu langsam** geht. Dafür gibt
es einen „Bot“, der das Spiel in wenigen Sekunden durchspielt (nur am PC, siehe 5.4):

```bash
npm run simulate              # 10 Universen, 3 Tipps pro Sekunde
npm run simulate -- 40 0      # 40 Universen, ohne Tippen (reiner Idle-Spieler)
```

Du siehst für jedes Universum: wie lange es lebte, wie viel Quintessenz es gab und wann welche Epoche
erreicht wurde. Der Bot kauft immer sofort alles – echte Spieler sind langsamer.

**Aktuelle Werte (Bot, aktiv spielend):**

| Meilenstein | Bot-Spielzeit |
|---|---|
| Teilchenära | 5 min |
| Atomzeitalter / erster Wärmetod | ca. 17 / 31 min |
| Sternenära | ca. 30 min – 1 h |
| Galaxienära | ca. 2–3 h |
| Leben / Bewusstsein | ca. 4–7 h |
| danach | endloses Wachstum (≈ +10–40 % Quintessenz pro Universum) |

> 💡 Faustregel: Wenn du Zahlen änderst, ändere sie in kleinen Schritten (z.B. ×1,5) und lass danach
> die Simulation laufen.

---

## 8. Was geht nur mit einem App-Update?

Alles, was **neuen Programmcode** braucht – z.B. eine neue Effekt-Art, ein neues Grafik-Motiv,
Minispiele, Werbung oder Käufe. Ablauf:

1. Code ändern (z.B. indem du mich darum bittest 🙂).
2. In `src/config.ts` `APP_VERSION` um 1 erhöhen.
3. GitHub → Actions → **Android App** → **Run workflow** → Play-Store-Paket (AAB) herunterladen.
4. In der Play Console als neue Version hochladen (Kapitel 9).

Trick: Brauchen neue Inhalte die neue App-Version, setze in `content.json` `"minAppVersion"` auf die neue
Zahl. Alte Apps ignorieren diese Inhalte dann einfach und stürzen nicht ab.

> Für später: Dienste wie **Capgo** oder **Capawesome Live Update** können sogar Programmcode ohne
> Play-Store-Update ausliefern.

---

## 9. Veröffentlichen im Google Play Store

### 9.1 Entwicklerkonto
1. https://play.google.com/console → mit einem Google-Konto anmelden.
2. Konto-Typ „Privatperson“, **einmalig 25 US-Dollar**, Identität bestätigen.
   > Du musst **mindestens 18 Jahre** alt sein – sonst muss eine erwachsene Person das Konto anlegen.
3. **Neue private Konten** müssen vor der Veröffentlichung einen **geschlossenen Test mit mindestens
   12 Testern über 14 Tage** machen (Stand meines Wissens – die Play Console zeigt die aktuellen Regeln).
   Freunde & Familie mit Android-Handy fragen!

### 9.2 Signatur-Schlüssel erstellen (einmalig)
Jede App muss „unterschrieben“ sein. Java ist bei Android Studio dabei. Im Terminal:
```bash
keytool -genkeypair -v -keystore kosmogenesis-release.keystore -alias kosmogenesis -keyalg RSA -keysize 2048 -validity 10000
```
Passwort ausdenken (aufschreiben!) und die Fragen beantworten.

> 🔐 **Diese Datei und das Passwort NIE verlieren und NIE auf GitHub hochladen!** Sicher aufbewahren
> (USB-Stick + Passwort-Manager). „Play App Signing“ in der Play Console aktiviert lassen (Standard).

### 9.3 Schlüssel bei GitHub hinterlegen
1. Datei in Text umwandeln:
   - Windows (PowerShell): `[Convert]::ToBase64String([IO.File]::ReadAllBytes("kosmogenesis-release.keystore")) | Set-Clipboard`
   - Mac: `base64 -i kosmogenesis-release.keystore | pbcopy` · Linux: `base64 -w0 kosmogenesis-release.keystore`
2. GitHub → **Settings → Secrets and variables → Actions → New repository secret**. Vier Secrets:

| Name | Inhalt |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | der lange Text aus Schritt 1 |
| `ANDROID_KEYSTORE_PASSWORD` | dein Keystore-Passwort |
| `ANDROID_KEY_ALIAS` | `kosmogenesis` |
| `ANDROID_KEY_PASSWORD` | dein Schlüssel-Passwort (meist dasselbe) |

3. Actions → **Android App** → **Run workflow**. Jetzt gibt es zusätzlich **kosmogenesis-playstore-aab**
   mit `app-release.aab` – die kommt in den Play Store. Die Versionsnummer zählt automatisch hoch.

### 9.4 App in der Play Console anlegen
1. **App erstellen** → Name „Kosmogenesis“ (oder dein Wunschname), Deutsch, „Spiel“, „Kostenlos“.
2. **Test und Release → Tests → Geschlossener Test**: Tester hinzufügen, **Neuer Release** →
   `app-release.aab` hochladen → zur Überprüfung senden.
3. **Store-Eintrag**: Kurzbeschreibung, Beschreibung, App-Icon 512×512 (`assets/icon-only.png`
   verkleinern, z.B. mit https://www.iloveimg.com/de/bild-groesse-andern), Funktionsgrafik 1024×500,
   mindestens 2 Screenshots (einfach vom Handy).
   Vorschlag Kurzbeschreibung: *„Erschaffe ein Universum – vom Urknall bis zum Bewusstsein. Aber hüte dich vor der Entropie!“*
4. **App-Inhalte** (Pflicht):
   - **Datenschutzerklärung:** Vorlage `public/datenschutz.html` ausfüllen (gelbe Stellen) → ist dann
     unter https://dietzejonas7-lab.github.io/Game/datenschutz.html erreichbar → Adresse eintragen.
   - **Datensicherheit:** Die App sammelt keine Daten und gibt keine weiter (nur lokaler Spielstand).
   - **Altersfreigabe:** Fragebogen ehrlich ausfüllen (keine Gewalt, keine Käufe, keine Lootboxen → niedrige Freigabe).
   - **Zielgruppe:** z.B. „ab 13“. **Werbung:** „Nein“.
5. Nach dem Test: **Produktionszugriff beantragen** → Release in „Produktion“.

> ⚠️ Die **App-ID** `com.dietzejonas.kosmogenesis` (in `capacitor.config.ts` und `android/app/build.gradle`)
> kann nach dem ersten Upload **nie mehr geändert werden**. Wenn du eine andere willst, sag es mir **vorher**.

---

## 10. Geld verdienen (später)

Im Moment hat das Spiel **keine Werbung und keine Käufe** – das macht die Veröffentlichung einfacher.
Später möglich (braucht ein App-Update, ich baue es dir ein):

- 📺 **Belohnungs-Werbung** (AdMob): „Video ansehen → 2 Stunden Offline-Fortschritt sofort“ oder „Produktion ×2 für 10 Minuten“. Spieler mögen das, weil es freiwillig ist.
- 💎 **Einmalkauf „Kosmischer Förderer“**: dauerhaft ×2 Produktion + keine Werbung. Fair und beliebt.
- ⚠️ Für Einnahmen brauchst du in Deutschland in der Regel ein (Klein-)Gewerbe, und Google behält ca. 15 % ein.

---

## 11. Kosten im Überblick

| Was | Kosten |
|---|---|
| Google Play Entwicklerkonto | einmalig 25 US-Dollar |
| GitHub (Code, Automatik, Pages) | kostenlos (öffentliches Repository) |
| Capacitor, Node.js, Android Studio | kostenlos |
| Optional später: iPhone-Version | Apple-Entwicklerkonto ca. 99 $/Jahr + ein Mac |

---

## 12. Welche Datei macht was?

```
public/content/content.json   ← ALLE Inhalte (hier änderst du am meisten)
public/datenschutz.html       ← Datenschutzerklärung (Vorlage ausfüllen!)
public/icon.svg               ← Symbol im Browser-Tab
src/config.ts                 ← App-Version, Adresse der Online-Inhalte
src/main.ts                   ← Startpunkt
src/content/types.ts          ← Beschreibung des Inhalts-Formats (alle Felder erklärt)
src/content/validate.ts       ← Fehlerprüfung der Inhalte
src/content/loader.ts         ← Laden der Inhalte (online / gespeichert / eingebaut)
src/engine/engine.ts          ← die Spielregeln: Produktion, Entropie, Kollaps, Offline …
src/engine/state.ts           ← was im Spielstand gespeichert wird
src/engine/format.ts          ← Zahlen schön anzeigen (1,5 Mio …)
src/render/cosmos.ts          ← die Grafik in der Mitte
src/ui/app.ts                 ← alle Bildschirme und Menüs
src/ui/describe.ts            ← Texte für Effekte und Bedingungen
src/audio/audio.ts            ← Sounds und Musik
src/styles.css                ← Aussehen der Menüs
src/platform/platform.ts      ← Speichern & Vibration (Browser / Handy)
scripts/check-content.ts      ← npm run check:content
scripts/simulate.ts           ← npm run simulate (Balance-Bot)
android/                      ← das Android-Projekt (von Capacitor erzeugt)
assets/                       ← App-Icon & Startbild (Quelle; neu erzeugen mit npm run icons)
.github/workflows/            ← die GitHub-Automatik
```

---

## 13. Ideen für später

- 🌌 **Weitere Epochen**: Multiversum, Schwarze-Loch-Ära, „Big Rip“ – geht über `content.json`
- 🔁 **Zweite Prestige-Ebene**: „Multiversen“ – mehrere Universen gleichzeitig mit verschiedenen Gesetzen
- 🧪 **Herausforderungen**: Universen mit festen Regeln („keine Klicks“, „Gravitation −10“) für besondere Belohnungen
- ☁️ **Cloud-Speicherstand** (Google Play Games) für Handywechsel
- 🏆 **Google-Play-Erfolge & Ranglisten** („schnellster Wärmetod“)
- 🔔 **Benachrichtigungen**: „Dein Universum ist den Wärmetod gestorben!“
- 🌍 **Englische Version** für mehr Spieler weltweit
- 🍎 **iPhone-Version** (gleicher Code dank Capacitor)

Sag mir einfach, was du als Nächstes willst – ich baue es ein und erkläre es dir.

---

## 14. Wörterbuch

| Begriff | Bedeutung |
|---|---|
| **Idle / Clicker** | Spiel, bei dem man durch Tippen und automatische Produktion immer größere Zahlen erreicht |
| **Prestige / Kollaps** | Neustart mit dauerhaftem Bonus (hier: Quintessenz) |
| **Entropie** | Unordnung. Im Spiel: die Lebensuhr deines Universums |
| **Wärmetod** | Ende eines Universums, wenn die Entropie maximal ist |
| **Repository (Repo)** | Projektordner auf GitHub mit dem ganzen Code und seiner Geschichte |
| **Commit** | ein gespeicherter Änderungsschritt |
| **Branch** | eine „Arbeitskopie“ des Codes; `main` ist die Hauptversion |
| **Pull Request** | Vorschlag, Änderungen aus einem Branch in `main` zu übernehmen |
| **GitHub Actions / Workflow** | Automatik, die bei Änderungen prüft, baut und veröffentlicht |
| **Artifact** | eine Datei, die ein Workflow erzeugt hat (z.B. die App) |
| **GitHub Pages** | kostenloses Webhosting von GitHub |
| **JSON** | einfaches Textformat für Daten (unsere `content.json`) |
| **APK / AAB** | Android-App zum direkten Installieren (Test) / Paket für den Play Store |
| **Keystore** | Datei mit deinem geheimen Signatur-Schlüssel |
| **Capacitor** | Werkzeug, das Web-Code in eine Handy-App verpackt |
