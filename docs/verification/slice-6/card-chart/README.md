# Verbrauchskurve wieder auf der Zählerkarte

19.11.2026 · `codex/slice-6-management` · Software / private Haushaltsanwendung.

Die spätere Nutzerfreigabe ersetzt die frühere Reduktion der Karte auf Ergebnis/Stand und die Ergebnispriorisierung des [ersten Designreviews](../design-followup/README.md). Vorhandene Arbeiten bleiben erhalten. Kein Commit, Push, Merge oder Deployment.

## Umsetzung

- Kompakte Verbrauchskurve als Hauptinhalt der Karte, nach Name und Zeitraum. Darunter die kleinere finanzielle Einschätzung, letzter Stand mit Datum und „Stand erfassen“.
- Dieselben `calculateProjection`-Ergebnisse wie in „Verstehen“; keine neue Verbrauchs-, Prognose- oder Abrechnungslogik. Durchgezogener Verlauf aus Ablesungen und gestrichelte Hochrechnung, vorhandene Farben/Legende, kWh auch für Gas. Letzter Gaszählerstand weiterhin m³.
- 10 rem hohe kompakte Grafik, kurze deutsche Monate und kWh-Einheit. Numerische Y-Achse nur in der großen Detailgrafik; exakte Daten per Maus/Pfeiltasten im Tooltip und in der bestehenden Monatstabelle. Tooltip verwendet vollständige deutsche Monatsnamen. Kompakter Tooltip auf die Grafikbreite begrenzt, mit umbrochenen Beschriftungen und bei 200 % nötigenfalls lokalem vertikalen Scrollen; kein abgeschnittener Mengenwert.
- Grafik außerhalb des Ergebnislinks: Tooltip/Chart-Tastaturbedienung löst keine Navigation aus. Name und Ergebnis behalten den tatsächlichen Zähler-/Zeitraumlink. Die Hauptaktion bleibt orange und plastisch.
- Keine erfundene Kurve ohne ausreichende Stände. Bei fehlenden Preisen ist der Verbrauch weiterhin sichtbar, die Kostenlücke ausdrücklich benannt. Gas, Nullverbrauch und große Werte berücksichtigt.
- Nur die geschützte Entwicklungsvorschau hat einen zusätzlichen synthetischen Kartenmodus (`view=cards&scenario=…`). Kein neuer produktiver Datenweg.

„Verstehen“, Einrichtung, Verwaltung, Konto, Datenspeicherung und Schutz unbestätigter Vorgänge bleiben erhalten. Keine neue Abhängigkeit, API, Migration oder Authänderung.

## Gerenderte Ansichten

| Ansicht | Vorher | Nachher |
| --- | --- | --- |
| Übersicht Desktop | [1440 px](../design-followup/screenshots/overview-1440.png) | [1440 px](screenshots/overview-1440.png) |
| Übersicht Mobil | [390 px](../design-followup/screenshots/overview-390.png) | [390 px](screenshots/overview-390.png) |
| Schmal | – | [320 px](screenshots/overview-320.png) |
| Vergrößerter Text | – | [320 px / 200 % und zusätzliche Textabstände](screenshots/overview-200percent.png) |
| Gas | – | [390 px](screenshots/card-gas-390.png) |
| Fehlende Preise | – | [390 px](screenshots/card-missing-390.png) |
| Exakte Werte | – | [Tooltip](screenshots/card-tooltip-390.png) |

Desktop, Mobil und die vergrößerte Ansicht wurden angesehen. Bei 320 px und 200 % plus Textabständen werden Karten lang; Zahlenstände bleiben lokal scrollbar. Dies ist kein Nachweis einer physischen Geräte- oder Screenreaderabnahme.

## Tatsächliche Prüfungen

- **179 Tests / 27 Dateien bestanden**: [Testlog](tests.log). Fünf zusätzliche Verhaltenstests zu Reihenfolge/Link und Hauptaktion, identischen Kurvendaten in Karte/Detail, fehlenden/einzelnen Ständen, fehlenden Preisen und Gas-Einheit. Chart in diesen Tests gemockt; echtes Rendering separat geprüft.
- **Typecheck, Lint, isolierter Produktionsbuild bestanden**: [Typecheck](typecheck.log), [Lint](lint.log), [Build](build.log). Zwei bestehende Lintwarnungen zu ungenutzten Testimports; keine neuen Fehler. Bestehende React-act-/jsdom-Warnungen im Testlog nicht verschwiegen. Build in temporärer Kopie, vorhandene Entwicklungsinstanz nicht überschrieben.
- **Gezielte Designmatrix bestanden**, keine Page Errors: [Bericht](design-browser.json), [Script](verify-design.mjs). 20 Aufnahmen bei 1440/1024/768/390/320 px; kompakte Grafik vor Ergebnis und Stand; >=44-px-Links; keine horizontale Dokumentüberbreite; Einrichtung weiterhin erreichbar; leere Übersicht erhalten. Vollständige Detailkurve und Endmonat sichtbar. 320 px/200 % plus Textabstände; Reduced Motion und sichtbarer Fokus. Sechs zusätzliche Kartenfälle: Gas, keine/eine Ablesung, fehlende Preise, Nullverbrauch, große Zahlen.
- **Diagrammbedienung bestanden**: [Bericht](interaction-browser.json), [Script](verify-interaction.mjs). Tastatureinstieg mit Tab, Pfeiltaste zeigt exakte kWh-Werte und Datum, sichtbarer Containerfokus, Tab führt zum Ergebnislink. Maus zeigt Tooltip ohne Navigation. Breitenbegrenzung bei 390 px und 320 px/200 % tatsächlich geprüft; der beim visuellen Review entdeckte abgeschnittene Tooltip ist korrigiert. Der erste Prüfversuch fokussierte nur programmatisch ohne Tastatureinstieg; die bestehende Fokuslogik reagiert auf Tab. Der Test wurde auf tatsächlichen Tastatureinstieg korrigiert, kein Produktfix dafür nötig.
- **Bestehende Verstehen-Regression bestanden**: [Log](understanding-regression.log), [Bericht](regressions/understanding-regression/browser-check.json). 21 Aufnahmen, Zeitraumwechsel per Tastatur, Abrechnung und Schätzung, bestehende Tabs, Kosten/Ablesungen/Monatstabelle, Gas/große Werte/200 % und SVG-Achsenprüfung.
- **Bestehende Ableseregression bestanden**: [Bericht](regressions/reading-regression/browser-check.json). 17 Aufnahmen / 10 Prüfgruppen: Pending, Fehler/Retry, Eingaben erhalten, richtiger Zähler, Fokus, geschützter Abbruch, synthetischer Touchweg, vier Breiten, 200 %/Reduced Motion. HTTP-Antworten gemockt; keine Persistenz- oder RLS-Abnahme daraus.

Im Vorschau-Serverlog meldet Recharts vor der Browser-Vermessung Breite/Höhe `-1`. Die gerenderten Kurven sind in der Browsermatrix sichtbar und geometrisch geprüft; diese Warnung ist kein Page Error und wurde nicht als verschwunden gewertet.

Nur synthetische Daten in isolierter lokaler Vorschau und Brave/Chromium. Keine echten Haushaltsdaten gelesen oder verändert. Keine erneute DB-/RLS-Abnahme für diese Darstellungsänderung; die echten lokalen Nachweise des [Slice-6-Designreviews](../design-followup/README.md) bleiben separat gültig für den dort geprüften Stand. Keine Migration, kein Reset.

## Skills und offene Abnahmen

`design-taste-frontend` und Impeccable für Bestandssprache, Hierarchie, mobile Lesbarkeit, Fokus und Zustände verwendet. Das Taste-Marketing-Gate ist **OFF (no build active)**, [tatsächliche Ausgabe](gate.log); kein Gate-PASS behauptet. Die Produktprüfungen oben sind separate reale Prüfungen, kein Ersatz durch Marketingseitenregeln.

Physische Geräte, Screenreader, Safari/Firefox und Nutzerabnahme bleiben offen. Die ausgeblendete numerische Y-Achse der kompakten Karte ist eine Darstellungsentscheidung; genaue Mengen sind interaktiv bzw. in „Verstehen“ erreichbar. Keine Aussage über ungeprüfte assistive Technologien. Kein neuer sicherheitsrelevanter Schnittstellenbefund für Slice 7; dessen bestehende Beleg-/Schreibrechte-/Konditionsprüfungen bleiben im übergeordneten Slice-6-Bericht bestehen.

### Nutzerkorrektur: gemeinsame Textgrundlinie

„Letzter Stand“ und Zahlenwert stehen nun als Flexelemente mit `align-items: baseline` auf derselben Textgrundlinie. Das bisherige scrollbare Inline-Block-Element hatte seine Unterkante als Grundlinie verwendet. Datum und Status bleiben in eigener Zeile; lange Werte bleiben lokal scrollbar. [Browsermessung](baseline/results.json): 1440/390/320 px jeweils 0 px Grundlinienabweichung, keine Dokumentüberbreite; zusätzlich 320 px/200 % ohne Überbreite. [Mobile Aufnahme](baseline/reading-390.png) angesehen. Reine CSS-Korrektur, keine neue Logik; `git diff --check` bestanden.
