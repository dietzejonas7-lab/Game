# 📖 Anleitung: Squishy World

Diese Anleitung erklärt alles von Anfang an – auch wenn du noch nie programmiert hast.
Lies sie am besten einmal komplett durch und arbeite dann die Kapitel der Reihe nach ab.

**Inhalt**

1. [Was ist schon fertig?](#1-was-ist-schon-fertig)
2. [Wie funktioniert das Ganze? (einfach erklärt)](#2-wie-funktioniert-das-ganze)
3. [Einmalige Einrichtung auf GitHub](#3-einmalige-einrichtung-auf-github)
4. [Das Spiel ausprobieren](#4-das-spiel-ausprobieren)
5. [Inhalte ändern – ohne Neuinstallation](#5-inhalte-ändern--ohne-neuinstallation)
6. [Was geht nur mit einem App-Update?](#6-was-geht-nur-mit-einem-app-update)
7. [Echte Sound-Aufnahmen einbauen](#7-echte-sound-aufnahmen-einbauen)
8. [Veröffentlichen im Google Play Store](#8-veröffentlichen-im-google-play-store)
9. [Echtgeld-Käufe einrichten](#9-echtgeld-käufe-einrichten)
10. [Rechtliches zu Lootboxen & Jugendschutz](#10-rechtliches-zu-lootboxen--jugendschutz)
11. [Kosten im Überblick](#11-kosten-im-überblick)
12. [Welche Datei macht was?](#12-welche-datei-macht-was)
13. [Ideen für später](#13-ideen-für-später)
14. [Wörterbuch](#14-wörterbuch)

---

## 1. Was ist schon fertig?

| Bereich | Was drin ist |
|---|---|
| **Squishy-Physik** | Jedes Squishy ist ein „weicher Körper“: Man kann es **drücken, eindellen, ziehen, dehnen, werfen** – auch mit mehreren Fingern gleichzeitig. Tippen auf den Tisch lässt es hüpfen. |
| **4 Materialien** | **Foam** (Slow Rising – geht langsam wieder auf), **Mochi** (super weich & dehnbar), **Jelly** (wabbelig, glänzend, durchscheinend), **Gel** (prall wie ein Stressball) |
| **Grafik** | Farbverläufe, Schatten, Glanzlichter, Schaumstoff-Poren, Puderzucker, Gesichter die sich mitverformen (und beim Drücken „>_<“ machen), Deko (Glasur, Streusel, Kerne, Blätter, Glitzer …) |
| **Sound** | Alle Geräusche werden in Echtzeit passend zur Physik erzeugt: Knistern beim Slow-Rising, Schmatzen bei Jelly, Quietschen bei Gel, Plumpsen beim Aufprall. Echte Aufnahmen können ergänzt werden (Kapitel 7). |
| **Vibration** | Das Handy vibriert leicht beim Drücken und beim Aufprall. |
| **40 Squishys** | in 6 Sammlungen, 5 Seltenheiten (Gewöhnlich → Mythisch) |
| **Lootboxen** | Gratis-Box (alle 4 Std.), Münz-Boxen, Diamant-Box, Event-Box. Mit „Chancen anzeigen“ (Pflicht im Play Store) und Garantie-System („spätestens jede 10. Box episch“). |
| **Fortschritt** | Spielerlevel mit XP, Belohnungen pro Level und besondere Meilensteine, Sterne für doppelte Squishys, Sammlungs-Belohnungen |
| **Täglich** | Tägliche Belohnung (7-Tage-Serie), 3 tägliche Quests |
| **Shop** | Diamanten (Echtgeld – im Moment nur **Test-Käufe**), Münzen gegen Diamanten |
| **Extras** | 6 Hintergründe (werden mit Level freigeschaltet), News-Popup für Events, Halloween-Event als Beispiel |
| **Live-Updates** | Alle Inhalte kommen aus **einer Datei**, die online geändert werden kann – die App holt sich die neue Version automatisch. |

---

## 2. Wie funktioniert das Ganze?

Das Spiel ist mit **Web-Technik** gebaut (HTML, CSS, TypeScript – das sind die Sprachen, mit denen auch
Webseiten gemacht werden). Ein Werkzeug namens **Capacitor** verpackt das Ganze in eine echte Android-App,
die man im Play Store anbieten kann.

Warum so?

- ✅ Du kannst das Spiel **sofort im Browser** testen – am PC oder auf dem Handy.
- ✅ **Inhalte lassen sich jederzeit ändern, ohne dass jemand die App neu installieren muss.**
- ✅ Später geht auch eine iPhone-Version mit demselben Code.

```
  ┌──────────────────────┐        lädt beim Start        ┌────────────────────────────┐
  │  App auf dem Handy   │  ──────────────────────────▶  │  content.json auf GitHub   │
  │  (Programmcode)      │   neue Squishys, Boxen,       │  Pages (Internet)          │
  │                      │   Events, Preise ...          │  ← DU änderst diese Datei  │
  └──────────────────────┘                               └────────────────────────────┘
       ▲ ohne Internet: nimmt die zuletzt geladene Version (oder die eingebaute)
```

Wichtig zu verstehen – es gibt **zwei Arten von Änderungen**:

| Art | Beispiele | Wie kommt es zu den Spielern? |
|---|---|---|
| **Inhalte** | neue Squishys, Farben, Boxen, Chancen, Preise, Quests, Events, News, Level-Belohnungen | Datei `content.json` ändern → **automatisch, ohne Neuinstallation** |
| **Programmcode** | ganz neue Funktionen (z.B. ein Minispiel), neue Formen-Typen | neues **App-Update** im Play Store (Kapitel 6) |

---

## 3. Einmalige Einrichtung auf GitHub

Dein Code liegt auf **GitHub** (eine Webseite, auf der Code gespeichert wird). GitHub kann außerdem
automatisch für dich arbeiten („GitHub Actions“): Fehler prüfen, das Spiel veröffentlichen und die
Android-App bauen. Dafür musst du einmalig ein paar Einstellungen machen.

### 3.1 Den Code in den Haupt-Branch bringen

Ich habe alles im Branch `ccr-eee069d2-skylhb` gespeichert. Damit die Automatik läuft, muss das der
**Haupt-Branch** (meist `main`) sein:

1. Öffne https://github.com/dietzejonas7-lab/Game
2. Falls oben ein gelber Hinweis „…had recent pushes – Compare & pull request“ erscheint: klicken →
   **Create pull request** → **Merge pull request** → **Confirm merge**.
3. Falls es noch gar keinen `main`-Branch gibt (leeres Repository), ist mein Branch automatisch der
   Haupt-Branch geworden. Du kannst ihn umbenennen: **Settings → General → Default branch → ✏️ → `main`**.

### 3.2 GitHub Pages einschalten (für die Online-Inhalte)

1. Im Repository auf **Settings** (Zahnrad) → links **Pages**.
2. Bei **Source** „**GitHub Actions**“ auswählen.
3. Fertig. Nach jeder Änderung auf dem Haupt-Branch ist das Spiel dann hier erreichbar:
   **https://dietzejonas7-lab.github.io/Game/**
   und die Inhalte hier: https://dietzejonas7-lab.github.io/Game/content/content.json

> ⚠️ GitHub Pages ist im kostenlosen GitHub-Konto nur für **öffentliche** Repositories verfügbar.
> Wenn dein Repository privat bleiben soll, sag mir Bescheid – dann stellen wir die Inhalte auf einen
> anderen kostenlosen Dienst um (z.B. Firebase Hosting oder Cloudflare Pages). Dafür muss nur
> `CONTENT_URL` in `src/config.ts` geändert werden.

### 3.3 Prüfen, ob alles läuft

Im Repository auf **Actions** klicken. Dort siehst du die Abläufe:

- **Web & Inhalte** – prüft `content.json`, baut das Spiel und veröffentlicht es (grüner Haken = alles gut ✅, rotes X = Fehler ❌, draufklicken zeigt den Grund).
- **Android App** – baut die App-Datei für dein Handy.

---

## 4. Das Spiel ausprobieren

### 4.1 Am schnellsten: im Browser

Sobald GitHub Pages läuft (Kapitel 3.2), öffne einfach auf dem Handy oder PC:
**https://dietzejonas7-lab.github.io/Game/**

Tipp: Im Handy-Browser (Chrome) über ⋮ → „Zum Startbildschirm hinzufügen“ bekommst du ein App-Symbol.

### 4.2 Als echte App auf dem Android-Handy

1. GitHub → **Actions** → links **Android App** → rechts **Run workflow** → **Run workflow**.
2. Ca. 5–10 Minuten warten, bis ein grüner Haken erscheint. Den Durchlauf anklicken.
3. Ganz unten bei **Artifacts** die Datei **squishy-world-test-apk** herunterladen (ZIP – entpacken).
4. Die Datei `app-debug.apk` aufs Handy bringen (z.B. per Google Drive, USB-Kabel oder direkt auf dem Handy herunterladen) und antippen.
5. Android fragt, ob du „Apps aus unbekannten Quellen“ erlauben willst → erlauben → installieren.

### 4.3 Am eigenen PC entwickeln (optional, für später)

Wenn du selbst am Code arbeiten willst:

1. **Node.js** installieren: https://nodejs.org (die „LTS“-Version).
2. **Git** installieren: https://git-scm.com
3. Ein Terminal (Windows: „Eingabeaufforderung“ oder „PowerShell“) öffnen und eingeben:
   ```bash
   git clone https://github.com/dietzejonas7-lab/Game.git
   cd Game
   npm install
   npm run dev
   ```
4. Im Browser `http://localhost:5173` öffnen. Jede Änderung an einer Datei erscheint sofort.
5. Auf dem Handy im selben WLAN: die Adresse, die bei `Network:` angezeigt wird (z.B. `http://192.168.0.23:5173`).
6. Für die Android-App am PC brauchst du zusätzlich **Android Studio** (https://developer.android.com/studio).
   Dann: `npm run android:sync` und `npm run android:open` → in Android Studio auf ▶️ drücken.

**Tipp:** In der Browser-Version kannst du an die Adresse `#galerie` anhängen
(z.B. `http://localhost:5173/#galerie`), dann siehst du **alle Squishys auf einen Blick** – perfekt,
um neue zu gestalten.

---

## 5. Inhalte ändern – ohne Neuinstallation

Alle Inhalte stehen in **einer** Datei: [`public/content/content.json`](public/content/content.json).

### 5.1 So änderst du etwas (direkt auf GitHub, sogar vom Handy aus)

1. Auf GitHub die Datei `public/content/content.json` öffnen.
2. Oben rechts auf den **Stift ✏️** („Edit this file“) klicken.
3. Deine Änderung machen.
4. **Ganz wichtig:** oben die Zahl bei `"contentVersion"` um **1 erhöhen** (z.B. von `1` auf `2`).
   Nur dann wissen die Apps, dass es etwas Neues gibt.
5. Rechts oben **Commit changes…** → nochmal **Commit changes**.
6. Unter **Actions** prüft GitHub die Datei automatisch:
   - ✅ grüner Haken → nach 1–2 Minuten ist es online. Jede App lädt es beim nächsten Öffnen
     (oder spätestens nach 15 Minuten) – mit der Meldung „✨ Neue Inhalte geladen!“.
   - ❌ rotes X → Es ist ein Fehler drin, **die Spieler bekommen nichts davon mit**.
     Klick auf den Durchlauf → „Inhalte prüfen“ → dort steht auf Deutsch, was falsch ist.

> 💡 Selbst wenn mal eine kaputte Datei online gehen sollte: Die App prüft jede Datei selbst und
> ignoriert fehlerhafte Inhalte. Es kann also nichts kaputtgehen.

**JSON-Regeln (das Format der Datei):**
- Texte stehen in `"Anführungszeichen"`.
- Zwischen Einträgen steht ein Komma `,` – **nach dem letzten Eintrag einer Liste aber nicht!**
- Listen stehen in `[ ]`, Objekte in `{ }`.
- Farben werden als Hex-Code geschrieben, z.B. `"#ff88aa"`. Farben aussuchen: https://htmlcolorcodes.com/de/

### 5.2 Beispiel: Ein neues Squishy hinzufügen

In der Liste `"squishies"` einen neuen Eintrag einfügen (z.B. nach dem letzten, Komma nicht vergessen):

```json
{ "id": "blueberry", "name": "Blaubeere", "set": "fruits", "rarity": "rare", "material": "jelly", "shape": "round", "size": 0.8,
  "colors": { "body": "#5a6cff", "body2": "#2f3bb8" },
  "face": { "eyes": "sparkle", "mouth": "smile", "blush": true },
  "decorations": [ { "type": "leaf", "color": "#3aa655" }, { "type": "glitter", "color": "#ffffff" } ],
  "description": "Klein, blau und super wabbelig." }
```

Fertig – es taucht automatisch in der Sammlung und in passenden Boxen auf.

**Alle Möglichkeiten für Squishys:**

| Feld | Bedeutung | Mögliche Werte |
|---|---|---|
| `id` | eindeutiger Name (nie wieder ändern, sonst verlieren Spieler es!) | nur Kleinbuchstaben, Zahlen, `_` |
| `name` | Anzeigename | beliebig |
| `set` | Sammlung | eine `id` aus `"sets"` |
| `rarity` | Seltenheit | `common`, `rare`, `epic`, `legendary`, `mythic` |
| `material` | Physik + Sound + Aussehen | `foam` (Slow Rising), `mochi`, `jelly`, `gel` |
| `shape` | Form | `round`, `bun`, `egg`, `pear`, `blob`, `heart`, `star`, `cloud`, `peach`, `strawberry`, `toast`, `ghost`, `cat`, `bear`, `bunny`, `frog` – oder eigene Form (siehe unten) |
| `size` | Größe (optional) | `0.6` bis `1.4`, Standard `1` |
| `colors` | Farben | `body` (Hauptfarbe), `body2` (Schattenfarbe, optional) |
| `face` | Gesicht (optional, `null` = kein Gesicht) | siehe unten |
| `decorations` | Verzierungen (optional) | Liste, siehe unten |
| `physics` | Physik anpassen (optional, für Profis) | z.B. `{ "recovery": 0.3 }` = noch langsameres Aufgehen |
| `sound` | Klang anpassen (optional) | z.B. `{ "pitch": 1.3, "volume": 0.8 }` |
| `description` | Text in der Sammlung | beliebig |
| `available` | `false` = gibt es nicht mehr in Boxen | `true` / `false` |
| `availableFrom` / `availableUntil` | nur in diesem Zeitraum erhältlich | Datum wie `"2026-12-24"` |

**Gesicht (`face`):**
- `eyes`: `dot`, `big`, `happy`, `sleepy`, `wink`, `sparkle`, `heart`, `cross`
- `mouth`: `smile`, `cat`, `o`, `grin`, `tongue`, `flat`, `none`
- `blush`: `true` = rosa Bäckchen
- `y`: Höhe des Gesichts (`-0.5` = weiter oben, `0.4` = weiter unten)
- `scale`: Größe (z.B. `0.8`)
- `color`: Farbe der Augen (z.B. `"#ffffff"` für dunkle Squishys)

**Verzierungen (`decorations`):**

| `type` | Wirkung | Zusätzliche Felder |
|---|---|---|
| `icing` | Glasur oben mit Tropfen | `color`, `drips` (Anzahl), `y` (wie weit runter) |
| `sprinkles` | Streusel | `colors` (Liste!), `count`, `region` (`top` oder `all`) |
| `seeds` | Kerne (Erdbeere, Brötchen) | `color`, `count` |
| `spots` | Flecken/Krater | `color`, `count`, `size` |
| `stripes` | Streifen | `color`, `count`, `dir` (`h` = waagerecht, `v` = senkrecht) |
| `belly` | heller Bauch | `color` |
| `ears` | Innenohren (nur bei `cat`, `bear`, `bunny`) | `color` |
| `leaf` | Blatt/Stiel oben | `color` |
| `heart` | Herz (z.B. Avocado-Kern) | `color`, `y`, `size` |
| `crust` | Kruste am Rand (Toast) | `color` |
| `hole` | Donut-Loch | – |
| `ring` | Planetenring | `color` |
| `stars` | Sternenhimmel | `color`, `count` |
| `glitter` | funkelnder Glitzer (animiert) | `color` |

**Eigene Form** statt eines Namens:
```json
"shape": { "aspect": 1.3, "harmonics": [[3, 0.08, 0]] }
```
`aspect` = Breite/Höhe, `harmonics` = Wellen im Umriss: `[Anzahl Beulen, Stärke, Drehung]`.
Einfach ausprobieren und in der Galerie (`#galerie`) anschauen!

### 5.3 Weitere Beispiele

**Ein Event (z.B. Weihnachten) mit eigener Box und News:**
1. In `"sets"` eine Sammlung `{ "id": "xmas", "name": "Weihnachten", "icon": "🎄", "reward": { "gems": 30 } }` anlegen.
2. Squishys mit `"set": "xmas"` und `"availableUntil": "2026-12-31"` anlegen.
3. In `"boxes"` eine Box mit `"sets": ["xmas"]`, `"availableFrom": "2026-12-01"`, `"availableUntil": "2026-12-31"` anlegen.
4. In `"news"` eine Nachricht mit `"until": "2026-12-31"` eintragen – sie erscheint einmal beim Start.

**Gewinnchancen einer Box ändern:** bei der Box in `"odds"` die Zahlen ändern. Es sind Gewichte –
sie werden automatisch in Prozent umgerechnet (die Summe muss nicht 100 sein).

**Gratis-Box öfter:** bei `"free"` `"freeCooldownMinutes": 240` ändern (z.B. `120` = alle 2 Stunden).

**Spieler-Belohnungen:** unter `"levels"` (`rewardPerLevel`, `milestones`), `"dailyRewards"`, `"quests"`.

**Neue Hintergründe:** in `"scenes"` (Farben + ab welchem Level).

---

## 6. Was geht nur mit einem App-Update?

Alles, was **neuen Programmcode** braucht – z.B. ein neues Minispiel, ein neuer Formen-Typ,
eine neue Verzierungsart oder Werbung. So läuft ein App-Update:

1. Code ändern (z.B. indem du mich darum bittest 🙂).
2. In `src/config.ts` die Zahl `APP_VERSION` um 1 erhöhen.
3. Auf GitHub → Actions → **Android App** → **Run workflow** → neues Play-Store-Paket (AAB) herunterladen.
4. In der Play Console als neue Version hochladen (Kapitel 8).

Trick: Wenn neue Inhalte die neue App-Version brauchen, setze in `content.json`
`"minAppVersion"` auf die neue Zahl. Alte Apps ignorieren diese Inhalte dann einfach und
stürzen nicht ab.

> Für später: Es gibt Dienste (z.B. **Capgo** oder **Capawesome Live Update**), mit denen sogar
> Programmcode ohne Play-Store-Update ausgeliefert werden kann. Das lohnt sich, wenn das Spiel größer ist.

---

## 7. Echte Sound-Aufnahmen einbauen

Die eingebauten Sounds werden live berechnet. Mit echten Aufnahmen klingt es noch realistischer:

1. Aufnahmen besorgen: selbst mit dem Handy aufnehmen (echtes Squishy drücken – leise Umgebung!) oder
   lizenzfreie Sounds z.B. von https://freesound.org (auf Lizenz **CC0** achten).
2. Kurze Dateien schneiden (0,2–1 Sekunde), als `.mp3` speichern, z.B. mit https://www.audacityteam.org.
3. Dateien in den Ordner `public/sounds/` legen (auf GitHub: „Add file → Upload files“).
4. Beim Squishy in `content.json` eintragen:
   ```json
   "sound": { "samples": { "squish": ["sounds/squish1.mp3", "sounds/squish2.mp3"], "impact": ["sounds/plopp.mp3"] } }
   ```
   `squish` = beim Loslassen nach dem Drücken, `release` = beim Loslassen ohne Drücken, `impact` = Aufprall.
   Mehrere Dateien → es wird zufällig abgewechselt (klingt natürlicher).

---

## 8. Veröffentlichen im Google Play Store

### 8.1 Entwicklerkonto
1. https://play.google.com/console → mit einem Google-Konto anmelden.
2. Konto-Typ „Privatperson“ wählen, **einmalig 25 US-Dollar** bezahlen und die Identität bestätigen.
   > Hinweis: Du musst **mindestens 18 Jahre** alt sein. Falls nicht, muss eine erwachsene Person
   > (z.B. Eltern) das Konto anlegen.
3. **Wichtig für neue private Konten:** Google verlangt vor der Veröffentlichung einen
   **geschlossenen Test mit mindestens 12 Testern über 14 Tage** (Stand meines Wissens – Google ändert
   das manchmal, die Play Console zeigt die aktuellen Regeln an). Freunde & Familie mit Android-Handy fragen!

### 8.2 Signatur-Schlüssel erstellen (einmalig)
Jede App im Play Store muss „unterschrieben“ sein. Dafür brauchst du eine Schlüssel-Datei.
Java ist bei Android Studio dabei. Im Terminal:

```bash
keytool -genkeypair -v -keystore squishy-release.keystore -alias squishy -keyalg RSA -keysize 2048 -validity 10000
```
Passwort ausdenken (aufschreiben!) und die Fragen beantworten.

> 🔐 **Diese Datei und das Passwort NIE verlieren und NIE auf GitHub hochladen!**
> Sicher aufbewahren (z.B. USB-Stick + Passwort-Manager). Google bietet zusätzlich „Play App Signing“
> an – das unbedingt aktivieren (ist Standard), dann kann ein verlorener Upload-Schlüssel ersetzt werden.

### 8.3 Schlüssel bei GitHub hinterlegen
Damit GitHub das Play-Store-Paket bauen kann, braucht es den Schlüssel als **Secret** (geheim, niemand kann ihn lesen):

1. Die Datei in Text umwandeln:
   - Windows (PowerShell): `[Convert]::ToBase64String([IO.File]::ReadAllBytes("squishy-release.keystore")) | Set-Clipboard`
   - Mac/Linux: `base64 -i squishy-release.keystore | pbcopy` (Mac) bzw. `base64 -w0 squishy-release.keystore`
2. GitHub → Repository → **Settings → Secrets and variables → Actions → New repository secret**. Vier Secrets anlegen:

| Name | Inhalt |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | der lange Text aus Schritt 1 |
| `ANDROID_KEYSTORE_PASSWORD` | dein Keystore-Passwort |
| `ANDROID_KEY_ALIAS` | `squishy` |
| `ANDROID_KEY_PASSWORD` | dein Schlüssel-Passwort (meist dasselbe) |

3. Actions → **Android App** → **Run workflow**. Jetzt gibt es zusätzlich das Artifact
   **squishy-world-playstore-aab** mit der Datei `app-release.aab` – die kommt in den Play Store.
   Die Versionsnummer wird automatisch hochgezählt.

### 8.4 App in der Play Console anlegen
1. **App erstellen** → Name „Squishy World“ (oder dein Wunschname), Sprache Deutsch, „Spiel“, „Kostenlos“.
2. Links unter **Test und Release → Tests → Geschlossener Test**: Tester (E-Mail-Liste) hinzufügen,
   **Neuer Release** → `app-release.aab` hochladen → speichern → zur Überprüfung senden.
3. Den **Store-Eintrag** ausfüllen: Kurzbeschreibung, Beschreibung, App-Icon (512×512 – liegt als
   `assets/icon-only.png` im Projekt, ggf. verkleinern), Funktionsgrafik (1024×500), mindestens
   2 Screenshots (einfach vom Handy machen).
4. **App-Inhalte** (alles Pflicht):
   - **Datenschutzerklärung:** Vorlage liegt in `public/datenschutz.html` → ausfüllen → ist dann unter
     https://dietzejonas7-lab.github.io/Game/datenschutz.html erreichbar → diese Adresse eintragen.
   - **Datensicherheit:** Die App sammelt aktuell keine Daten und gibt keine weiter (nur lokaler Speicherstand).
   - **Einstufung des Inhalts (Altersfreigabe):** Fragebogen ehrlich ausfüllen – bei „In-App-Käufe“ und
     „zufällige Objekte (Lootboxen)“ **Ja** angeben.
   - **Zielgruppe:** siehe Kapitel 10.
   - **Werbung:** „Nein“ (aktuell keine Werbung).
5. Nach dem 14-tägigen Test: **Produktionszugriff beantragen** → Release in „Produktion“ → veröffentlichen.

> ⚠️ Die **App-ID** `com.squishyworld.app` (in `capacitor.config.ts` und `android/app/build.gradle`)
> kann nach dem ersten Upload **nie mehr geändert werden**. Wenn du eine andere willst (z.B.
> `de.deinname.squishyworld`), sag es mir **vor** dem ersten Upload.

---

## 9. Echtgeld-Käufe einrichten

Im Moment sind Käufe im Shop **simuliert** (Test-Modus, kein echtes Geld). Für echte Käufe:

1. **Zahlungsprofil** in der Play Console anlegen (Einstellungen → Zahlungsprofil). Dafür brauchst du
   ein Bankkonto. In Deutschland musst du für Einnahmen in der Regel ein **Gewerbe anmelden** und
   die Einnahmen versteuern (Kleingewerbe ist unkompliziert – beim Gewerbeamt deiner Stadt).
2. In der Play Console unter **Monetarisieren → Produkte → In-App-Produkte** die Produkte anlegen –
   mit **genau** diesen IDs aus `content.json` → `"products"`: `gems_30`, `gems_160`, `gems_350`, `gems_800`.
   Typ: „Verbrauchbar“. Preise dort festlegen.
3. Ich empfehle den Dienst **RevenueCat** (https://www.revenuecat.com) – er übernimmt die schwierigen
   Teile (Kaufprüfung, Betrugsschutz) und ist für kleine Apps kostenlos. Konto anlegen, mit der Play
   Console verbinden (deren Anleitung folgen).
4. Dann den Code anpassen: Nur die Datei `src/platform/iap.ts` muss geändert werden
   (Plugin `@revenuecat/purchases-capacitor` einbauen, `IAP_TEST_MODE = false`). **Sag mir einfach
   Bescheid, sobald du soweit bist – dann baue ich das ein.**
5. Testen mit „Lizenztestern“ (Play Console → Einstellungen → Lizenztests) – dann wird nichts abgebucht.

> 💡 Google behält von jedem Kauf eine Gebühr ein (derzeit meist **15 %** bis 1 Mio. $ Umsatz im Jahr).

---

## 10. Rechtliches zu Lootboxen & Jugendschutz

> Das hier ist keine Rechtsberatung, sondern eine Übersicht, worauf du achten solltest.

- **Google Play verlangt:** Wenn man Lootboxen (direkt oder indirekt) mit Echtgeld bekommen kann,
  müssen die **Gewinnchancen vor dem Kauf angezeigt** werden. ✅ Ist eingebaut („Chancen anzeigen“).
- **Deutschland (Jugendschutzgesetz):** Lootboxen mit Echtgeld-Bezug können zu einer **höheren
  Altersfreigabe** führen. Die Einstufung passiert automatisch über den IARC-Fragebogen in der Play Console.
- **Belgien** verbietet Lootboxen, die man mit Echtgeld bezahlen kann; auch andere Länder diskutieren
  Regeln. Am einfachsten: In der Play Console das Land **Belgien ausschließen** (und bei neuen Regeln prüfen).
- **Kinder als Zielgruppe:** Wenn du angibst, dass die App (auch) für Kinder unter 13 ist, gelten
  sehr strenge Regeln („Familienrichtlinien“) – kostenpflichtige Lootboxen sind dort praktisch nicht erlaubt.
  Empfehlung: Zielgruppe **ab 13** oder älter wählen – **oder** Echtgeld nur für Dinge ohne Zufall verwenden.
- **Fair bleiben** (gut für Spieler *und* Bewertungen): Alle Squishys sind auch **ohne Geld** erreichbar
  (Gratis-Box, Münzen, Quests), es gibt eine **Garantie** (Pity) und Doppelte geben Münzen und Sterne zurück.
- **Fairere Alternative**, falls du Ärger vermeiden willst: Diamanten nur für Kosmetik/direkte Käufe
  verwenden und die Diamant-Box entfernen – das geht über `content.json`, ohne App-Update.

---

## 11. Kosten im Überblick

| Was | Kosten |
|---|---|
| Google Play Entwicklerkonto | einmalig 25 US-Dollar |
| GitHub (Code, Automatik, Pages) | kostenlos (öffentliches Repository) |
| Capacitor, Node.js, Android Studio | kostenlos |
| RevenueCat (Käufe) | kostenlos bis zu einem gewissen Umsatz |
| Google-Gebühr auf Käufe | ca. 15 % vom Umsatz |
| Optional später: iPhone-Version | Apple-Entwicklerkonto ca. 99 $/Jahr + ein Mac |

---

## 12. Welche Datei macht was?

```
public/content/content.json   ← ALLE Inhalte (hier änderst du am meisten)
public/datenschutz.html       ← Datenschutzerklärung (Vorlage ausfüllen!)
src/config.ts                 ← App-Version und Adresse der Online-Inhalte
src/main.ts                   ← Startpunkt
src/content/                  ← Laden & Prüfen der Inhalte (types.ts = Beschreibung des Formats)
src/game/game.ts              ← Spiellogik: Level, Münzen, Boxen, Quests, Speichern
src/physics/softbody.ts       ← die Squishy-Physik (+ Materialeinstellungen ganz oben)
src/render/shapes.ts          ← die Formen (round, cat, heart …)
src/render/squishyRenderer.ts ← das Zeichnen (Farben, Schatten, Glanz, Gesicht, Deko)
src/render/stage.ts           ← Spielfläche, Touch-Steuerung, Spielschleife
src/audio/audio.ts            ← alle Sounds
src/ui/                       ← Bildschirme, Fenster, Box-Öffnen-Animation
src/styles.css                ← Aussehen der Menüs
src/platform/                 ← Speichern, Vibration, Käufe (iap.ts)
android/                      ← das Android-Projekt (wird von Capacitor erzeugt)
assets/                       ← App-Icon & Startbild (Quelle)
.github/workflows/            ← die GitHub-Automatik
scripts/check-content.ts      ← Fehlerprüfung für content.json
```

---

## 13. Ideen für später

- ☁️ **Cloud-Speicherstand** (Google Play Games / Firebase) – damit der Fortschritt beim Handywechsel bleibt
- 📺 **Belohnungs-Werbung** (AdMob): „Video ansehen → Gratis-Box sofort“
- 🔔 **Benachrichtigungen**: „Deine Gratis-Box ist bereit!“
- 🎮 **Minispiele**: Squishy-Wurf auf Ziele, Stapeln, Reaktionsspiel
- 🎟️ **Saison-Pass** mit Belohnungsstufen
- 🛠️ **Squishy-Werkstatt**: eigene Squishys designen (Farbe, Gesicht, Deko)
- 👫 **Freunde & Tauschen**
- 🏆 **Erfolge** (Achievements) und Ranglisten
- 🍎 **iPhone-Version** (gleicher Code dank Capacitor)

Sag mir einfach, was du als Nächstes willst – ich baue es ein und erkläre es dir.

---

## 14. Wörterbuch

| Begriff | Bedeutung |
|---|---|
| **Repository (Repo)** | Projektordner auf GitHub mit dem ganzen Code und seiner Geschichte |
| **Commit** | ein gespeicherter Änderungsschritt |
| **Branch** | eine „Arbeitskopie“ des Codes; `main` ist die Hauptversion |
| **Pull Request** | Vorschlag, Änderungen aus einem Branch in `main` zu übernehmen |
| **GitHub Actions / Workflow** | Automatik, die bei Änderungen Aufgaben erledigt (prüfen, bauen, veröffentlichen) |
| **Artifact** | eine Datei, die ein Workflow erzeugt hat (z.B. die App) |
| **GitHub Pages** | kostenloses Webhosting von GitHub |
| **JSON** | ein einfaches Textformat für Daten (unsere `content.json`) |
| **APK** | Android-App-Datei zum direkten Installieren (Test) |
| **AAB** | Android-App-Paket für den Play Store |
| **Keystore** | Datei mit deinem geheimen Signatur-Schlüssel |
| **Capacitor** | Werkzeug, das Web-Code in eine Handy-App verpackt |
| **Soft Body** | Physik für weiche, verformbare Körper |
| **Pity / Garantie** | nach X Boxen ohne Glück bekommt man garantiert etwas Seltenes |
| **IAP** | In-App-Purchase = Kauf innerhalb der App |
