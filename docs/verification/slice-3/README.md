# Slice 3 · Verstehen

16.11.2026. Ausgangspunkt `6071b2f` auf `codex/slice-2-meter-setup` geprüft, sauberer Arbeitsstand. Arbeitsbranch `codex/slice-3-understand`. Die Gewichtung „Einschätzung → Verbrauch → Monatswerte → Berechnungsgrundlagen“ wurde im Nutzerdialog bestätigt. Bestehende Foundation und Radix-Komponenten bleiben maßgeblich.

## Oberfläche

Die Zählerkarte zeigt eine kompakte, zeitraumbezogene Einschätzung. „Verbrauch und Kosten verstehen“ öffnet die Details mit dem auf der Karte ausgewählten Zeitraum (`?period=`). Diagramm und Monatstabelle sind nun in der Detailansicht erreichbar. Die Hauptaktion der Karte bleibt „Stand erfassen“.

Die Detailansicht startet mit „Verstehen“. Erfasste Schlussabrechnung, Zeitraum-Kostenschätzung, vertragliche Abschläge und Verbrauch sind getrennt benannt. Datum, Stichtag, exklusive Endgrenze und Einheiten stehen im Kontext. Laufende Perioden erhalten einen rechnerischen monatlichen Orientierungswert; vergangene Perioden nur einen ausdrücklich rückblickenden Monatsvergleich. Es wird keine Restmonats-/Nachholzahlung empfohlen und keine tatsächliche Zahlung behauptet. Fehlendes Ende bleibt als vorläufige +1-Jahr-Annahme sichtbar.

Beobachtete Stände bleiben in kWh (Strom) bzw. m³ (Gas) erhalten; abgeleiteter Verbrauch und Kostenschätzung tragen eigene Labels. Monatswerte und Rechenweg sind progressive Details; Tabellen scrollen lokal. Individuelle Monatsverteilungen bleiben sichtbar und werden berücksichtigt. „Verwalten“, „Konditionen“ und „Ablesungen“ erhalten die vorhandenen Aktionen. Die Ablesungshistorie zeigt ausdrücklich alle Stände des Zählers, unabhängig von der ausgewählten Periode.

Keine neue Erfassung für Konditionen, Folgeperioden oder Schlussabrechnungen; kein Schema-/RLS-/Migrationswechsel. Keine echten Haushaltsdaten verändert.

## Fachliche Korrekturen, getrennt von der Darstellung

`src/lib/calculations.ts` und `src/lib/understanding.test.ts` enthalten die eigenständig prüfbare Fachlogik. Historische API-Feldnamen `projectedYearly*` bleiben für Kompatibilität, repräsentieren jetzt aber ausdrücklich **Zeitraumsummen**.

- Hochrechnungsbasis bleibt die beobachtete Standdifferenz geteilt durch das Verteilungsgewicht der beobachteten Tage. Die Summe wird auf die tatsächlichen Tage des ausgewählten Zeitraums begrenzt. Keine pauschale Jahresverbrauchsanzeige bei 30 Tagen.
- Grundpreis und Abschlag verwenden die bestehende Konvention Monatsbetrag × 12 / Tage des jeweiligen Kalenderjahres. Der Monatsvergleich teilt durch die so ermittelten Monatsanteile des Zeitraums; kurze Zeiträume werden nicht durch zwölf geteilt. Das ist kein Modell tatsächlicher Fälligkeits-/Zahlungstage.
- Konditionen gelten ab `effective_from`. Die erste Rate wird nicht mehr rückwirkend auf eine Lücke angewandt. Fehlende Preise oder Abschläge liefern `null`, ausdrücklich gespeicherte Nullen weiterhin echte Null.
- Gasumrechnung verwendet den datiert gültigen Faktor pro Tag statt den neuesten Faktor rückwirkend. Zwischen Ablesungen bleiben die Stände wie bisher linear interpoliert. Ein unbekannter/ungültiger Gasfaktor liefert keine erfundene kWh-Zahl; die m³-Stände und Standdifferenz bleiben sichtbar.
- Datumsschritte erfolgen über UTC-Kalendertage, ohne Sommerzeit-/Zeitzonendrift. Ablesungen an Anfang und Endgrenze sind erlaubt, Belastungstage ausschließlich `[Start, Ende)`. Andere Perioden liefern weder Hochrechnungsbasis noch versteckte interpolierte Randstände.
- Monatstabelle: tatsächliche Kalendermonate, nur der innerhalb der Periode durch Ablesungen abgedeckte Teil, datierte Tagespreise/Faktoren und taganteiliger Grundpreis. Kein voller Monatsgrundpreis für drei Tage; keine Weiterführung in die Folgeperiode.
- Die Kurve gibt Monats-/Ablesepunkte nach Ablauf der zugehörigen Tage aus (kein bisheriger zusätzlicher Tag). Ohne Anfangsablesung wird keine scheinbar beobachtete kumulierte Null am Periodenbeginn eingeführt. Fallende/doppelt datierte Stände werden nicht hochgerechnet.

Bewusst unveränderte Annahme: Die gesamte Kostenhochrechnung verwendet das saisonale bzw. individuelle Profil, auch rückblickend. Die Monatswerte verwenden linear interpolierte Stände. Bei Preisänderungen können beide Kostenschätzungen voneinander abweichen. Die UI benennt diesen Unterschied, statt rückblickend ein neues Abrechnungsmodell einzuführen; die erfasste Schlussabrechnung bleibt das tatsächliche Ergebnis. Diese Schätzung rekonstruiert keinen früher gespeicherten Prognosestand.

Eine bestehende Testanforderung wurde ausdrücklich ersetzt: Der Test „Monatswerte nach Ende noch in alter Periode anzeigen“ widerspricht der nun verbindlichen Zeitraumwahl. Er prüft jetzt den Ausschluss der Folgeperiode. Die übrigen bisherigen Berechnungstests bestehen weiter.

## Unabhängige Erwartungswerte

Neue Rechentests prüfen keine bloß kopierte Programmausgabe:

| Fall | Separat nachvollziehbare Erwartung |
| --- | --- |
| Strom, 365 Tage, 3.650 kWh, 30 ct, 10 € Grundpreis | 3.650 × 0,30 + 12 × 10 = 1.215 €; Abschläge 1.200 €; Differenz −15 € |
| Strom, 30 Tage, 300 kWh | Kosten 90 + 120 × 30 / 365 €; Abschläge 1.200 × 30 / 365 €; Verbrauch 300 kWh |
| Januar, Preiswechsel am 16. | 150 kWh × 0,30 + 160 kWh × 0,40; Grundpreis/Abschlag mit 15 bzw. 16 Tagen |
| Gas, 12 Monate, 1.000 m³ × Faktor 10, Wechsel nach März | H0-Anteil Jan–März 0,44: 4.400 × 0,10 + 5.600 × 0,12 + 120 = 1.232 €; Abschläge 1.560 €; Differenz +328 € |
| Zwei Tage Gas, Faktor 10 dann 12 | Je 10 m³/Tag: 100 + 120 = 220 kWh; kein rückwirkender Faktor 12 |
| Individuelles Gasprofil | 170 m³ im Januar, Faktor 1: H0 ergibt 1.000 kWh/Jahr, gleichmäßige Monatsgewichte 2.040 kWh/Jahr |

Weitere Fälle: keine/eine Ablesung, außerhalb/innerhalb/auf Grenzen, keine Preise, verspätete Preise, explizite Null, abnehmende/doppelte Stände, fehlende Anfangsablesung. Die Gas- und Stromfälle sind unabhängig.

## Reproduktion und Nachweise

Feste Fixtures in `src/lib/understanding-fixture.ts`, Stichtag `2026-11-16`. Nur opt-in in Development, mit echten Produktkomponenten und ohne Datenbankschreibzugriff:

```sh
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=synthetic-preview-key \
PARITY_DESIGN_PREVIEW=1 npm run dev -- --webpack --hostname 127.0.0.1 --port 3000
node docs/verification/slice-3/verify-understanding.mjs
node docs/verification/slice-3/verify-reading.mjs
```

Route `/design/integration?view=understand&scenario=electricity|gas|gas-custom|none|one|missing|zero|short|large`; optional `&period=period-previous` für die abgeschlossene Periode mit Schlussabrechnung. Unabhängig von den Eingabeoberflächen Slices 4/5. Browserpfade via `PLAYWRIGHT_MODULE` und `BROWSER_PATH`, URL via `PREVIEW_URL` austauschbar. Screenshotdateien entstehen zunächst unter `/private/tmp`, Kopie ins Repo erst nach Browserende.

- [Tests](tests.log): 78 Tests/16 Dateien bestanden. Bestehende React/Radix-act-Warnungen bleiben sichtbar.
- [Typecheck](typecheck.log): bestanden.
- [Lint](lint.log): keine Fehler, zwei vorbestehende Warnungen.
- [Zeitzonenprüfung](timezone.log): Berechnungstests zusätzlich unter America/Los_Angeles bestanden.
- [Browsermatrix](browser-check.json): 18 Aufnahmen, Zeitraumwechsel mit Tastatur, bestehende Verwaltung erreichbar, keine Page Errors. Desktop 1440px, Mobile 390px, 320px mit 200 % Schrift plus Textabständen. Dokument-/Text-/Kontrollbounds geprüft; lokale Tabellenüberläufe erlaubt.
- [Detektor](detector.json): einmal ausgeführt, keine Befunde.

Wichtige Bilder: [Strom](screenshots/desktop-electricity.png), [Gas abgeschlossen](screenshots/desktop-gas-completed.png), [kurzer Zeitraum](screenshots/desktop-short.png), [fehlende Konditionen](screenshots/desktop-missing.png), [Nullwerte](screenshots/desktop-zero.png), [Mobil](screenshots/mobile-electricity.png), [320px/200 % Gas](screenshots/mobile-gas-200percent.png), [320px/200 % große Zahlen](screenshots/mobile-large-200percent.png). Alle 18 Bilder stehen im Browserprotokoll.

## Grenzen

Synthetische Browsernachweise, keine neue reale Supabase-Persistenz-/RLS-Abnahme (Datenweg und Schema unverändert). Keine physische Mobilgerätetastatur, kein Screenreader, keine Safari-/Firefox-Abnahme. Bestehende Slice-2-Nachweise bleiben unverändert. Keine Veröffentlichung, kein Push/Merge/Deployment. Unbekannte tatsächliche Zahlungen, zukünftige Änderungen und Anbieter-Abrechnungskonventionen werden nicht ergänzt.

## Abschlussreview und Diagrammkorrektur

[Unabhängiger Review](REVIEW.md): Erstreview **fix**, ein P2 zu abgeschnittenen/überlappenden SVG-Achsen bei großen Zahlen und 200 % Schrift. Dynamische Y-Achsenbreite und eine lokal scrollbar zugängliche 40rem-Zeichenfläche mit geschützten Datumsrändern beheben den Platzmangel. Die neue Prüfung kontrolliert SVG-Textgrenzen und X-Labelüberschneidungen ausdrücklich, zusätzlich zur Dokument-/Kontrollbreite.

[Erfassungsregression](reading-regression/browser-check.json): unverändertes bestehendes Prüfscript unter eigenem Slice-3-Ausgabepfad wiederholt, **pass**, zehn Prüfgruppen mit 17 Screenshots. Enthält unabhängige Strom-/Gaserfassung, Speichern/Fehler/Pending, Änderungsschutz, Touch-/Tastaturverhalten, Präzision, Schriftvergrößerung und Fontziffern. HTTP-Antworten synthetisch, keine reale Speicherung behauptet.

Abschluss: [Produktionsbuild](build.log), 78/78 Tests, Typecheck und Lint ohne Fehler bestanden. Die letzte vollständige 18-Aufnahmen-Matrix besteht einschließlich SVG-Grenz-/Überlappungsprüfungen. Der unabhängige Nachreview bewertet den einzigen P2 als **resolved**, Disposition **ship** im Umfang dieses Befunds. Keine neue Tokenquelle oder allgemeine Foundation-Änderung; die zusätzliche Diagramm-/Verstehenskomposition folgt dem bestehenden System. `git diff --check` bestanden.

## Nutzerreview · reduzierte Ansicht (maßgeblich für den aktuellen Stand)

Der Nutzer verwarf die erste Informationsdichte ausdrücklich als „Bleiwüste“. Die vorherigen Beschreibungen der sichtbaren Kostenblöcke und der Gewichtung sind damit historisch. Aktuell:

- Karten: letzter Stand, Zeitraum, voraussichtliche Nachzahlung/Erstattung, „Details ansehen“ und „Stand erfassen“. Keine Kosten-/Abschlagstabelle oder Berechnungserklärung auf der Karte. Zeitraumwechsel erfolgt in den Details; Karten zeigen den neuesten Zeitraum.
- Header der Details: Flamme/Blitz, Name und Laufzeit in Klammern bzw. Zeitraumwahl. Keine zusätzliche Typzeile und kein zweites Zeitraumlabel im Inhalt. Datumsspanne ist präzise und deutsch formatiert; unbekanntes Ende bleibt vorläufig markiert.
- „Verstehen“: Ergebnis, direkt danach Diagramm mit kurzer Linienlegende. Kosten/Abschläge, Ablesungen, Monatswerte und Rechenweg sind standardmäßig geschlossen. Die Formulierung „Rückblickende Schätzung“ entfällt; nicht abgerechnete Ergebnisse tragen „Voraussichtlich“, eine erfasste Schlussabrechnung behält ihren eigenen Nachweis.
- „Neuer Zeitraum / Wechsel“ liegt unter „Verwalten“. Bestehende Erfassungs-/Verwaltungsfunktionen und die Berechnung sind unverändert.

Finale Prüfung: 78/78 Tests, Typecheck, Lint ohne Fehler (zwei bestehende Warnungen), 21 Browseraufnahmen inklusive SVG-Achsengrenzen und 320px/200 % bestanden. Neu: [Standardansicht](screenshots/desktop-default.png), [Karten](screenshots/desktop-cards.png), [mobile Karten](screenshots/mobile-cards.png). Die ausführliche Stromaufnahme zeigt bewusst geöffnete Panels; die Standardaufnahme zeigt die tatsächliche Startansicht. Der zuvor dokumentierte Produktionsbuild gehört zum Stand vor dieser reinen Darstellungsreduktion; kein neuer Releasebuild in diesem Nachlauf.

Weitere Nutzerkorrekturen: Header auf Textgrundlinie ausgerichtet. Ergebnis als Statusbanner mit vorhandenen semantischen Flächen hervorgehoben. „Verbrauch · kWh“ entfällt; kWh steht an der Y-Achse, die X-Achse zeigt deutsche Monatsnamen. Der Tooltip behält das genaue Datum. Bei 200 % erhält der Name die volle verfügbare Breite. Die Browsermatrix prüft diese Breite sowie die SVG-Grenzen einschließlich Achseneinheit. Frischer Abschlussreview **ship**, Headerbefund nach Korrektur **resolved**; siehe REVIEW.md. 78 Tests/Typecheck/Lint und alle 21 Browseraufnahmen bestanden.

## Nutzerreview · Statusfarben und vorbelegter Stand

Ausdrücklich beauftragt: grüne Erstattung, rote Nachzahlung, neutrale ausgeglichene oder noch unbekannte Ergebnisse. Neue Outcome-Rollen in der vorhandenen `foundation.tokens.css` verwenden eine grüne Primitive und die bestehende rote Primitive; allgemeine Erfolgs-/Fehlerrollen anderer Formulare bleiben unverändert. Status bleibt durch Betrag und Text verständlich. [Browserprotokoll](banner-prefill/browser-check.json): Text-/Konturkontraste Rot 5,96:1, Grün 5,51:1, Neutral 8,84:1.

Der Erfassungsdialog befüllt beim Öffnen den tatsächlichen Input mit dem zuletzt gespeicherten Stand und markiert den Wert zur direkten Bearbeitung. Deutsche Formatierung und vorhandene Genauigkeit bleiben erhalten; explizite Null wird „0“, ohne gespeicherten Stand bleibt das Feld leer. Die frühere „Zuletzt“-Zeile mit beiden Trennlinien entfällt. Die Vorbelegung gehört zum Ausgangszustand und löst allein keinen Änderungsschutz aus; Änderungen am Stand/Datum werden weiterhin geschützt. Es erfolgt kein automatisches Speichern.

85 Tests/16 Dateien, Typecheck und Lint ohne Fehler (zwei bestehende Warnungen) bestanden. Vollständige Verstehen-Matrix (21 Bilder) und Erfassungsregression (zehn Gruppen/17 Bilder) erneut bestanden. Zusätzlich vier Bannerzustände, echte Input-Vorbelegung für Strom/Gas, direkte Abbrechen-Möglichkeit und Schutz bearbeiteter Werte im Browser geprüft. [Stromdialog](banner-prefill/screenshots/reading-prefill-electricity.png), [mobiles Gas-Sheet](banner-prefill/screenshots/reading-prefill-gas.png), [Rot](banner-prefill/screenshots/banner-electricity.png), [Grün](banner-prefill/screenshots/banner-gas.png), [Neutral](banner-prefill/screenshots/banner-zero.png). Modal-/Sheet-Captures sind beruhigte Viewportaufnahmen, keine Vollseitencaptures während Animationen.
