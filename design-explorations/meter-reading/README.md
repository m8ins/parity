# Parity · Zählerstand vergleichen

Isolierte Designexploration, kein Anwendungscode. Variante A mit Atkinson Hyperlegible Next ist vom Nutzer als Nordstern gewählt. Die historische Exploration bleibt erhalten; Slice 1 ist inzwischen in der Anwendung implementiert (siehe `../../docs/verification/slice-1/README.md`).

## Lokal öffnen

Aus dem Repository-Hauptverzeichnis:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory .
```

Dann http://127.0.0.1:4173/design-explorations/meter-reading/index.html öffnen. Der Repository-Server ist nötig, weil die Tokenprobe inzwischen die gemeinsame Anwendungsquelle importiert. Alternativ `index.html` direkt im Browser öffnen; alle Schriften und Dateien liegen lokal. Kein Build und keine Installation erforderlich.

Ab 1000 px werden beide Varianten nebeneinander gezeigt. Darunter schaltet „Variante A/B“ zwischen identisch positionierten Ansichten um. Die Regler gelten für beide Varianten. Der Rückweg „Zu den Zählern“ fokussiert in diesem begrenzten Prototyp die Zählerauswahl.

Direkte Vergleichsfälle:

- `/?view=a` und `/?view=b` — mobile Stromansicht.
- `/?view=a&meter=gas` und `/?view=b&meter=gas` — unabhängige Gasansicht.
- `/?state=active` zeigt das weiß hinterlegte aktive Feld, `/?state=input-focus` zusätzlich die Tastatur-Outline.
- `/?state=focus`, `pressed`, `invalid`, `saving`, `saved`, `failure`, `empty` — gemeinsame Zustände; mit `meter=gas` kombinierbar.

Speichern dauert simuliert eine Sekunde, danach erscheint die Bestätigung. Der einstellbare Zustand „Wird gespeichert“ bleibt zum Betrachten stehen. „Speicherfehler“ lässt sich mit „Erneut speichern“ beheben. Keine API-Aufrufe, kein Local Storage und keine Persistenz. Datum und Validierungsgrenze sind für den Vergleich fest auf den 15.11.2026 gesetzt. Das ist eine Demonstration, keine vollständige fachliche Validierung der Anwendung.

## Unterschiede

| | Variante A | Variante B |
| --- | --- | --- |
| Schrift | Atkinson Hyperlegible Next | Nunito Sans |
| Charakter | Offene Formen; stark differenzierte 0/O und 1/l/I | Weichere Formen; weniger markant differenzierte Zeichen |
| Knopf | Radius 10 px; Unterkante/Drucktiefe 4 px | Radius 21 px; Unterkante/Drucktiefe 7 px |
| Druckanimation | 70 ms drücken, 110 ms lösen; `cubic-bezier(.16,1,.3,1)` | 140 ms; Standard-`ease-out` |
| Gemeinsam | Aufbau, Größen, Inhalte, Konturen, Farbrollen, Feldverhalten | Identisch |

Die Zahlenprobe unter den Entwürfen zeigt kurze und lange Zählerstände, Dezimalkomma, Tausenderpunkte, kWh, m³, ct/kWh, Euro und echtes Minuszeichen. Die Werte einer Zeile sind in beiden Varianten gleich, jede Größe hat ihre eigene Präzision. Der Nordstern A stammt aus der Nutzerentscheidung; B bleibt als Vergleich erhalten.

## Palette und Schriftprüfung

Semantische CSS-Rollen verwenden ausschließlich dieselbe OKLCH-Ausgangspalette und daraus gemischte Flächen:

- Blaugrau #3B465C → `oklch(39.375129% 0.04015540 263.947164)`
- Creme #E9E8D4 → `oklch(92.640917% 0.02656370 104.574367)`
- Kontrast dieses Ausgangspaars: **7,65:1**. Aktuelle Browserkontraste: Sekundärtext auf Vorschaugrund **4.60:1**, Knopftext **5.75:1**, Fehlertext auf Gerätefläche **6.72:1**, Speicherknopf **5.36:1** (gerasterte sRGB-Messung).
- Nach Nutzerfeedback ist die gemeinsame Gerätefläche aufgehellt: 65 % Ausgangscreme + 35 % Weiß in OKLCH, mit fehlendem Weiß-Farbton (`none`), damit der Cremeton erhalten bleibt. Die Ausgangsfarben selbst bleiben unverändert. Fehler erhalten als zusätzliche semantische Rolle `oklch(46% .16 26)` sowie eine durchgezogene 3-px-Kontur und erklärenden Text. Auch ungültige Datumsfelder werden so markiert. Die zusätzliche Konturstärke wird über Innenabstände ausgeglichen.
- Während des Speicherns bleibt die Taste deaktiviert, verwendet Sekundärtextfarbe, eine ruhige durchgezogene Kontur und keine erhöhte Unterkante. Der redundante Standardhinweis unter dem Knopf entfällt; die Live-Region bleibt für Zustandsmeldungen vorhanden.
- Numerische Elemente verwenden `font-variant-numeric: lining-nums tabular-nums`.
- Atkinson enthält im tatsächlichen Font `tnum` in GSUB. Nunito Sans benötigt keinen `tnum`-Schalter: Seine Standardziffern sind bereits tabellarisch. Ein fehlender Feature-Tag wird hier ausdrücklich nicht als Nachweis proportionaler Ziffern gewertet.
- Tatsächlich geladene Fontdateien im Browser gemessen, jeweils Ziffern 0–9 in 400, 600, 700 bei 40 px: Atkinson **25,28125 px**, Nunito **24 px**, jeweils jede Ziffer gleich breit.

Fonts sind mit SIL Open Font License lokal beigelegt. Quellen:

- https://github.com/google/fonts/tree/main/ofl/atkinsonhyperlegiblenext
- https://github.com/google/fonts/tree/main/ofl/nunitosans

## Prüfung und Screenshots

`browser-check.json` dokumentiert 320, 390, 768 und 1280 px, beide Zähler und beide Varianten, einschließlich langer Eingaben bis `999.999,999 m³`. Geprüft: keine horizontalen Überläufe oder abgeschnittenen Werte, echte Tastatur-Fokusfolge, echte Druckreaktion, Validierungsfehler mit Fokus und verknüpften Fehlermeldungen, Speichern/Bestätigung einschließlich gesperrter Eingaben während des Speicherns, Wiederholen nach Speicherfehler, fehlende Persistenz, reduzierte Bewegung und keine externen Anfragen oder Browserfehler. Desktop- und mobile Screenshots wurden visuell geprüft. Kein Test gegen echte Mobilgeräte oder Screenreader; der Browserlauf verwendet Chromium/Brave.

`font-and-color-check.json` dokumentiert Fontfeatures und Farbkonvertierung. `impeccable-check.json` enthält die statische Prüfung des lokalen Skills.

Reproduktion mit einer **bereits vorhandenen** Playwright-Installation und Browserdatei, ohne Projektabhängigkeiten zu ändern:

```sh
PREVIEW_URL=http://127.0.0.1:4173/design-explorations/meter-reading \
PLAYWRIGHT_MODULE=/absoluter/pfad/zu/playwright \
BROWSER_PATH=/absoluter/pfad/zum/browser \
node design-explorations/meter-reading/verify.cjs
```

Wesentliche Screenshots:

- [Desktop · Strom](screenshots/desktop.png), [Desktop · Gas](screenshots/desktop-gas.png)
- [Mobil · A](screenshots/mobile-a.png), [Mobil · B](screenshots/mobile-b.png)
- [Mobil · Gas A](screenshots/mobile-a-gas.png), [Mobil · Gas B](screenshots/mobile-b-gas.png)
- [Echter Tastaturfokus](screenshots/mobile-a-keyboard-focus.png), [echter Druckzustand](screenshots/mobile-a-pressed.png)
- [Eingabefehler](screenshots/mobile-b-gas-error.png), [gespeichert](screenshots/mobile-a-saved.png)
- [Speicherfehler](screenshots/desktop-failure.png), [Speichern](screenshots/desktop-saving.png)
- [Reduzierte Bewegung](screenshots/mobile-b-reduced-motion.png)

Alle Arbeitsergebnisse liegen ausschließlich in diesem Verzeichnis. Anwendung, Projektabhängigkeiten, Supabase und vorhandene Design-/Planungsdateien bleiben unangetastet.

## Aktive Eingabe und Tastaturfokus

Beim Klick oder Tippen werden Datums- und Zahlenfeld weiß, ohne zusätzliche Outline. Bei Tastaturnavigation mit Tab/Shift+Tab kommt die sichtbare 3-px-Outline hinzu. Fehler behalten ihre rote 3-px-Kontur und zugeordneten Texte in beiden Fällen. Reines Tippen nach einem Klick aktiviert keinen zusätzlichen Ring. Weil Browser Textfelder auch nach einem Klick als `:focus-visible` behandeln können, wird die Eingabemodalität für diese beiden Felder explizit nachgeführt. Geometrie und Innenabstände ändern sich beim Fokuswechsel nicht. Buttons behalten ihre bestehende Fokusdarstellung.

Neue Screenshotbeispiele: [Klick im Zahlenfeld](screenshots/mobile-a-input-active.png), [Tastaturfokus im Zahlenfeld](screenshots/mobile-a-input-focus.png), [Datum per Tastatur](screenshots/mobile-a-date-focus.png), [Fehler plus Tastaturfokus](screenshots/mobile-a-error-focus.png).

## Vorschlag für das gemeinsame Fundament

[tokens.html](tokens.html) zeigt eine gesonderte Typografie-/Spacing-Probe. [foundation.tokens.css](foundation.tokens.css) enthält die kommentierten Primitive und semantischen Rollen als direkt verwendbare CSS-Custom-Properties. **Status: hybride Richtung abgestimmt; weiterhin isolierte Designbasis.** Die bestehenden A/B-Ansichten importieren diese Datei bewusst noch nicht. Farben und A-Richtung stammen aus den bisherigen Entscheidungen; die bereinigte 18/16/14-px-Textskala und die 4-px-Abstandsskala sind Vorschläge. Keine Änderungen an Anwendungscode oder globaler Designdokumentation.

Für Folgeagenten: `foundation.tokens.css` ist die einzige Codequelle dieses Vorschlags. Bestätigte A-Eigenschaften nicht mit den neu vorgeschlagenen Skalen verwechseln; Der genaue Dialogablauf ist vor Slice 1 noch festzuhalten; der hybride Ansatz ist inzwischen abgestimmt. Komponenten konsumieren `--sys-*`; `--ref-*` dient der Definition der Rollen. In der späteren Anwendung bestehende shadcn-Variablen/Tailwind-Utilities auf diese gemeinsame Quelle abbilden, keine zweite unabhängige Palette anlegen. Die Sichtprobe verwendet die Token-Datei bereits; die ursprüngliche A/B-Probe verwendet weiterhin ihren bisherigen Stand.

Prüfung des Vorschlags: `node design-explorations/meter-reading/verify-tokens.cjs` mit bereits vorhandenem Playwright/Browser (Umgebungsvariablen wie bei `verify.cjs`). Ergebnisse in `tokens-check.json`, Screenshots `screenshots/tokens-1280.png` und `screenshots/tokens-390.png`. Geprüft bei 320/390/768/1280 px, zusätzlich 200 Prozent Textvergrößerung zusammen mit benutzerdefinierten Textabständen. Keine Dokumentüberläufe; lange vergrößerte Zahlen bleiben in lokal horizontal scrollbar zugänglichen Bereichen. Kein vollständiger WCAG-Konformitätsnachweis.

Der statische Token-Check meldet zwei Einträge: Die Schrift-Shorthands werden statisch als 16/16/16 fehlinterpretiert; der Browser misst tatsächlich 28/22/18 px. Der Creme-Hinweis betrifft die ausdrücklich vorgegebene Palette. Der unabhängige Impeccable-Review bewertet den konkreten Vorschlag mit `ship`, ohne materielle Korrekturen. Dieser frühere Review war keine Nutzerfreigabe; die später bestätigte hybride Richtung ist im folgenden Entscheidungsabschnitt festgehalten.

Primärquellen für die weitere Umsetzung: [WAI Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog), [WAI Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html). Insbesondere sind die WCAG-Textabstände ein Robustheitsprüffall, keine vorgeschriebenen Standard-Zeilenhöhen.

## Entscheidung: hybrides responsives System

Der Nutzer hat den hybriden Ansatz bestätigt: Formulartexte, Labels, Buttons, Hinweise und Daten verwenden stabile rem-Größen beziehungsweise feste Darstellungsstufen. Nur `--sys-font-page-title` (28–32 px) und `--sys-inset-page` (16–32 px) interpolieren begrenzt mit `clamp()` zwischen 360 und 1240 CSS-px bei 16-px-Browserbasis. Dialogtitel bleiben über `--sys-font-title` bei 28 px. Innere Abstände bleiben im 4-px-System; kein automatisches Mitwachsen des Formulars auf breiten Desktops. Die Token-Datei ist weiterhin isoliert, ihre Übernahme in die Anwendung ist nicht begonnen. Die Modal-Empfehlung und ihr genauer Ablauf sind vor Slice 1 abschließend festzuhalten. Frühere Entwurfskennzeichnungen in diesem Verlauf dokumentieren den damaligen Stand; diese Entscheidung ergänzt ihn.

## Übernahme in Slice 1

`foundation.tokens.css` importiert jetzt `../../src/app/foundation.tokens.css` statt eigene Werte zu pflegen. Die gemeinsame Quelle ist damit im Anwendungscode; frühere Aussagen zur ausschließlich isolierten Basis dokumentieren den damaligen Stand. Die A/B-Probe bleibt ein historisches Vergleichslabor, keine produktive Oberfläche.
