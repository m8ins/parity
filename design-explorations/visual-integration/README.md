# Slice 1b · Phase 1: Flächenvergleich

16.11.2026 · **C + Orange mit aufgehellter Beschriftung bestätigt; Phase 2 beauftragt.** Aktueller Integrationsstand und Prüfungen: [Slice 1b](../../docs/verification/slice-1b/README.md). Die folgenden Vergleiche dokumentieren Phase 1.

## Lokal öffnen

Vom Repositoryverzeichnis aus:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

[Vergleichsansicht](http://127.0.0.1:4173/design-explorations/visual-integration/)

Über „Ansicht“ zwischen Login, Zählerübersicht und geöffnetem Erfassungsdialog wechseln. „Viewport“ zeigt beide bei identischen 1280×960 oder 390×844 CSS-px. Desktop-Vorschauen werden zum direkten Vergleich verkleinert; „Einzeln öffnen“ zeigt eine Variante in der verfügbaren Browserbreite. Mobile Übersicht innerhalb des Frames scrollbar. Die Vergleichsseite selbst stapelt bei kleinen Breiten A und B.

Statischer Repo-Server erforderlich: Foundation wird unverändert aus `/src/app/foundation.tokens.css` importiert, der vorhandene lokale Font aus `/public/fonts/` geladen. Kein Next-/Supabase-Setup nötig. Keine neuen Abhängigkeiten.

## Aufgehellte Buttonbeschriftung · aktueller Stand

Auf Nutzerwunsch wurde ausschließlich die Beschriftung der orangefarbenen Hauptaktionen aufgehellt: von `oklch(25% .03 264)` auf **`oklch(33% .035 264)`**. Sie wirkt nun erkennbarer blaugrau statt beinahe schwarz. Orange, C-Flächen und sämtliche anderen Rollen bleiben gleich. Die Vergleichsansicht und alle Orange-Screenshots zeigen diesen Stand.

Die Browsermatrix wurde erneut ausgeführt: **37 Prüfeinträge bestanden**, keine Page Errors. Aktueller Textkontrast **4,93:1**, bei Hover **5,38:1**; beide über 4,5:1. Der Review-Nachtrag bewertet nur diese Verfeinerung. Phase 2 ist weiter unbegonnen.

## Versuch · C + Orange

Nutzerauftrag: „ja, lass uns das so ausprobieren. C + Orange“. Dies ist weiterhin **Phase 1**, keine Freigabe zur Integration.

Die Vergleichsansicht startet jetzt mit **C / C + Orange**. A/B und A/C bleiben über „Vergleich“ verfügbar. C + Orange übernimmt sämtliche C-Flächen. Nur Hauptaktionen und ihre Beschriftung ändern sich:

- Aktion: `oklch(74% .18 46)` · klares, leicht rötliches Orange
- Hover: `oklch(77% .17 46)`
- Aktionsbeschriftung: `oklch(33% .035 264)` · aufgehelltes dunkles Blaugrau
- Kontur, Unterkante, 4-px-Drucktiefe und Tastaturfokus bleiben aus der Foundation.

Orange kennzeichnet Hauptaktionen für beide Zählertypen; es ist weder eine Gas- noch eine Warnfarbe. Sekundäre Aktionen bleiben ruhig. Formulare senden weiterhin nichts. Keine Marke oder exakte Referenzfarbe aus Cron oder Grid Systems übernommen.

**Empfehlung zur Ansicht:** C + Orange gibt der Hauptaktion mehr Gewicht und dem ruhigen Cremesystem einen klaren Gegenpol. Ob diese zusätzliche Präsenz gewünscht ist, bleibt die nächste Nutzerentscheidung. Keine weitere Farbe wird verstreut als Dekoration eingesetzt.

| C + Orange | Desktop | Mobil |
| --- | --- | --- |
| Login | [Screenshot](screenshots/orange-desktop-login.png) | [Screenshot](screenshots/orange-mobile-login.png) |
| Übersicht | [Screenshot](screenshots/orange-desktop-overview.png) | [Screenshot](screenshots/orange-mobile-overview.png) |
| Dialog | [Screenshot](screenshots/orange-desktop-dialog.png) | [Screenshot](screenshots/orange-mobile-dialog.png) |

Direktvergleich: [Login](screenshots/comparison-orange-desktop-login.png) · [Übersicht](screenshots/comparison-orange-desktop-overview.png) · [Desktop-Dialog](screenshots/comparison-orange-desktop.png) · [Mobile Dialog-Viewports](screenshots/comparison-orange-mobile.png).

**Aktueller Prüflauf:** 37 Prüfeinträge über A, B, C und Orange bestanden; keine Page Errors. Orange auf Desktop 1280×960, Mobile 390×844 sowie 320×568 mit 200 % Schrift und zusätzlichen Textabständen geprüft. Sechs reguläre Orange-Ansichten und vier Vergleichsaufnahmen visuell geöffnet. Font und tabellarische Ziffern geprüft. 24 Kontrastpaare für Orange bestanden: Aktionsbeschriftung **4,93:1**, bei Hover **5,38:1**; Kontur auf Orange **3,72:1**, bei Hover **4,06:1**. Textpaare ≥4,5:1, nichttextliche Konturpaare ≥3:1. Browser-Rasterung kann die letzte Dezimalstelle leicht verändern.

`node --check` für die drei JS/MJS-Dateien und `git diff --check` bestanden. Impeccable einmal für diesen Versuch ausgeführt, siehe `impeccable-check-orange.json`. Abschlussreview als Ergänzung in `REVIEW.md`. Die unten beschriebenen funktionalen Grenzen gelten unverändert: insbesondere keine reale Authentifizierung, produktive Dialogregression, Geräte- oder Screenreaderabnahme. App-Tests und App-Lint wurden für den isolierten Farbversuch nicht erneut ausgeführt.

## Aktualisierung nach Nutzerfeedback · Variante C

Der Nutzer bevorzugt den Charakter von Creme, empfindet A im Hintergrund aber als zu kräftig; B ist zu neutral. Daraus folgt **C · Sanftes Creme**: hellerer Canvas mit erhaltener Wärme. Ausschließlich die lokalen Flächenrollen ändern sich:

- Canvas: `oklch(95.8% .019 104.574367)`
- Oberfläche: `oklch(97.5% .0125 104.574367)`
- Ruhendes Feld: `oklch(97.7% .0118 104.574367)`
- Aktives Feld: vorhandenes Weiß

Der Cremeton behält den Hue der Foundation; Helligkeit steigt und Chroma sinkt moderat. Konturen und Hauptaktionen bleiben unverändert. **Aktuelle Empfehlung: C** als Antwort auf das Feedback. Noch keine Freigabe oder Integration.

Die Vergleichsansicht startet mit A/C. Unter „Flächen“ bleibt A/B verfügbar. [A/C Desktop](screenshots/comparison-ac-desktop.png) · [A/C Mobile Viewports](screenshots/comparison-ac-mobile.png).

| C | Desktop | Mobil |
| --- | --- | --- |
| Login | [Screenshot](screenshots/c-desktop-login.png) | [Screenshot](screenshots/c-mobile-login.png) |
| Übersicht | [Screenshot](screenshots/c-desktop-overview.png) | [Screenshot](screenshots/c-mobile-overview.png) |
| Dialog | [Screenshot](screenshots/c-desktop-dialog.png) | [Screenshot](screenshots/c-mobile-dialog.png) |

Erweiterte Browsermatrix: **28 Prüfeinträge bestanden**, keine Page Errors; 22 Kontrastpaare auch für C bestanden. Alle sechs C-Ansichten und beide A/C-Vergleiche gerendert und visuell geöffnet. 320 px mit Textvergrößerung erneut geprüft. Aktuelles Messprotokoll in `browser-check.json`; Werte sind aus gerastertem 8-Bit-sRGB und können durch Rundung leicht schwanken.

## Ursprüngliche Varianten und Empfehlung

**A · Warmes Creme:** bestehende Foundation unverändert, Creme-Canvas, aufgehellte Creme als Oberfläche und ruhige Feldabstufung. Wirkt wie ein zusammenhängendes, freundliches Messgerät. **Empfehlung: A**, weil die Flächen den bestätigten Charakter deutlicher tragen und aktive weiße Eingaben erkennbarer abheben.

**B · Heller, neutraler:** Canvas `oklch(97% .006 105)`, Oberfläche `oklch(99% .003 105)`, ruhendes Feld `oklch(98% .004 105)`. Wirkt luftiger und zurückhaltender; die Kontur übernimmt mehr der Trennung. Aktive Felder bleiben weiß. Eine gültige Alternative, wenn die große Cremefläche zu präsent wirkt.

B überschreibt ausschließlich die semantischen Flächenrollen in der isolierten CSS-Datei. Text, sekundärer Text, Aktion/Hover, Fokus, Kontur, Trennlinien, Typografie, Abstände, Inhalt und Knopftiefe sind in beiden Varianten identisch. Die Foundation bleibt einzige Quelle der übernommenen Systemwerte; B ist ein lokaler Kandidat, keine zusätzliche produktive Palette.

Beide Varianten zeigen denselben deutschen Login mit permanenten Labels und beiden auswählbaren Verfahren, dieselben synthetischen Strom-/Gasdaten sowie denselben Dialog. Die bestehende Informationsstruktur bleibt erhalten. Der kleine Prognosehinweis ist in beiden gleich: eine vorhandene Ablesung wird anerkannt, die Voraussetzung für die Schätzung konkret genannt; keine erfundene Null und keine Berechnungsänderung.

## Prüfung und Grenzen

- Ursprüngliche A/B-Browsermatrix: **19 Prüfeinträge bestanden**, keine Page Errors. Desktop 1280×960, Mobile 390×844; alle drei Ansichten je Variante aufgenommen.
- 320×568 mit 200 % Schrift plus Textabständen: kein Dokumentüberlauf in Login, Übersicht und Dialog; Dialogaktionen durch Scrollen erreichbar. Vergrößerte Inhalte dürfen vertikal scrollen.
- Font tatsächlich geladen; tabellarische Ziffernbreiten im Browser gemessen. Alias `Parity Preview Atkinson` lädt dieselbe vorhandene Atkinson-Datei, um die importierte Next-Font-URL unter dem statischen Server nicht doppelt zu registrieren.
- 22 Kontrastpaare je Variante über Browser-sRGB-Rasterung und WCAG-Luminanzformel gemessen: Text/sekundärer Text/Fehler auf Canvas, Oberfläche, Feld und aktivem Feld ≥4,5:1; Kontur/Fokus ≥3:1; Aktionstext auf Normal/Hover ≥4,5:1. **Kleinster Wert 4,74:1**, inklusive Konturpaare. Dekorative Trennlinien sind keine Feldbegrenzungen und benötigen keinen 3:1-Kontrast.
- `browser-check.json` enthält sämtliche gemessenen Paare und tatsächlichen Checks. `verify.mjs` reproduziert die Matrix mit vorhandener Playwright-/Brave-Installation; Pfade über `PLAYWRIGHT_MODULE` und `BROWSER_PATH` austauschbar.
- `node --check` für alle drei JS/MJS-Dateien und `git diff --check`: bestanden. Explorationsdateien werden von der vorhandenen ESLint-Konfiguration ignoriert; der gezielte ESLint-Aufruf ist **kein bestandener Lintnachweis**. App-Tests/Build nicht erneut ausgeführt, da kein Anwendungscode geändert wurde.
- Impeccable-Detektor einmal ausgeführt, Ausgabe `[]`. Unabhängiger Abschlussreview siehe `REVIEW.md`; keine Produktionsfreigabe.

**Bewusste Grenze:** statischer visueller Prototyp, keine Radix-Implementierung. Er zeigt Desktop-Modal und mobiles Bottom Sheet, ersetzt aber keine Fokusfalle, Escape-/Wisch-/Änderungsschutzprüfung. Griff hier ausschließlich Darstellung. Konto-/Verwaltungsaktionen sind Vorschauplatzhalter; Formulare senden nichts. Keine Auth-, Persistenz-, RLS-, reale Tastatur-/Safe-Area- oder Screenreaderabnahme. Fehler-/Lade-/Disabled-Zustände und gesamte Slice-1-Regressionsmatrix gehören zur Integration nach der Auswahl und gelten hier nicht als geprüft.

Anwendungscode, gemeinsame Tokens, DESIGN.md, bestehende Metadaten und Slice-Plan wurden nicht geändert. Bestehende Arbeitsverzeichnisänderungen bleiben erhalten. Kein Push, Merge oder Deployment.

## Screenshots

| Ansicht | A Desktop | B Desktop | A Mobil | B Mobil |
| --- | --- | --- | --- | --- |
| Login | [A](screenshots/a-desktop-login.png) | [B](screenshots/b-desktop-login.png) | [A](screenshots/a-mobile-login.png) | [B](screenshots/b-mobile-login.png) |
| Übersicht | [A](screenshots/a-desktop-overview.png) | [B](screenshots/b-desktop-overview.png) | [A](screenshots/a-mobile-overview.png) | [B](screenshots/b-mobile-overview.png) |
| Dialog | [A](screenshots/a-desktop-dialog.png) | [B](screenshots/b-desktop-dialog.png) | [A](screenshots/a-mobile-dialog.png) | [B](screenshots/b-mobile-dialog.png) |

[Desktop direkt vergleichen](screenshots/comparison-desktop.png) · [Mobile Viewports direkt vergleichen](screenshots/comparison-mobile.png). Letzteres zeigt zwei mobile Frames auf der Desktop-Vergleichsseite. Zusätzliche `*-320-text-*.png` dokumentieren die Textvergrößerung.

## Richtung für die spätere Integration

Nach der Nutzerwahl ausschließlich die ausgewählte Flächenhierarchie zentral in der Foundation übernehmen; keine Vorschau-CSS-Schicht in die App kopieren. Danach gemeinsame shadcn-Varianten und alle Bestandsansichten gemäß Slice-Plan/Critique konsolidieren, die volle Zustands-/Regressionsmatrix prüfen und erst dann DESIGN.md, Impeccable-Metadaten und Plan aktualisieren. Aktuell wartet die Arbeit auf die Auswahl zwischen C und C + Orange; die früheren Flächenvergleiche bleiben als Referenz erhalten.
