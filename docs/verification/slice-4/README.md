# Slice 4 · Konditionen ändern

**Aktueller Stand nach Nutzerreview:** Offene Abrechnungszeiträume erhalten keine künstliche Jahresgrenze mehr. Direkte Bearbeitung des Zeitraumendes und klarer Speicherweg für neue Konditionen sind umgesetzt. Maßgebliche Ergänzung und finale Prüfungen: [Offene Zeiträume](open-periods/README.md).

16.11.2026. Arbeitsbranch `codex/slice-4-conditions`, unmittelbar auf dem vollständigen Slice-3-Stand `d49901e` angelegt. `git status` war auf `codex/slice-3-understand` sauber; keine fremden Änderungen übernommen, verworfen oder überschrieben. Kein separater Worktree. Die späteren Nutzerkorrekturen aus der Slice-3-Übergabe sind maßgeblich. Ablaufvorschlag und die drei offenen Fachregeln wurden vor der UI-Implementierung bestätigt. Gerenderte Nutzerabnahme dieses Ergebnisses steht aus.

## Ergebnis und Bedienung

- Im bestehenden Tab **Konditionen**: aktuell gültige Werte (bei vergangenen Zeiträumen zum letzten enthaltenen Tag), **Konditionen ändern**, zunächst geschlossene Historie. Keine zusätzliche Kartenumrahmung oder wiederholte Überschrift. Einzelne Historieneinträge und frühere Fassungen öffnen sich bei Bedarf.
- Geschützter Radix-Dialog, mobil dasselbe Formular als Sheet: Datum und Werte → Prüfung → bestätigter Erfolg → aktualisierte Einschätzung desselben Zeitraums. In der Prüfung stehen geänderte Werte als Vorher/Nachher; übernommene Werte bleiben eingeklappt. Keine neue Prognose-/Ersparnisrechnung.
- Die Vorbelegung besteht aus tatsächlichen editierbaren Werten, gültig **am gewählten Datum**, einschließlich Gasfaktor. Ein Datumswechsel übernimmt neue Ausgangswerte; bereits bearbeitete Werte benötigen dafür eine ausdrückliche Entscheidung. Leere Felder werden nicht als 0 behandelt. Ohne Ausgangskonditionen sind alle nötigen Angaben bewusst einzutragen.
- Nach bestätigter Speicherung erhält `ContractDetail` die bestätigte aktuelle Historie. Kosten, Abschläge und Saldo verwenden sie sofort; der Rückweg aktiviert „Verstehen“ im selben Zeitraum mit Tastaturfokus. Nach echtem Reload kommen die Daten aus Supabase. Eine erfasste Schlussabrechnung wird nicht verändert.
- Korrektur-/Löschhistorie ist über **Frühere Fassungen und Löschungen** zugänglich, mit eigener Lade-/Fehlerbehandlung. Frühere Fassungen sind keine aktiven Konditionen.

Die reduzierte Standardansicht aus Slice 3 bleibt erhalten: Ergebnis und Diagramm, übrige Grundlagen zunächst geschlossen. Die echte Vorbelegung und Auswahl des letzten Zählerstands im bestehenden Erfassungsdialog bleiben unverändert. Atkinson, tabellarische Ziffern, Creme/Orange, helle Placeholder und Menüzustände stammen weiterhin aus derselben Foundation. Keine gemeinsamen Primitiven oder Kontrollrezepte verändert; zusätzliche CSS-Regeln sind auf Konditionen begrenzt.

## Bestätigte Fachregeln

1. **Gleiches Datum:** Genau ein aktiver Konditionssatz pro Zeitraum/Datum. „Änderung“ an einem vorhandenen Datum wird abgewiesen; „Korrigieren“ ändert ausdrücklich den vorhandenen Satz und archiviert die vorherige Fassung. Das Korrekturdatum ist nicht verschiebbar. Ein anderes Datum wird als neue Änderung erfasst.
2. **Vergangenheit und Abrechnung:** Ergänzungen, Korrekturen und Löschungen bleiben erlaubt. Ein gezielter Hinweis erklärt die Änderung der Schätzung und die unveränderte tatsächliche Schlussabrechnung. Keine neue historische Datensperre.
3. **Löschen:** Explizite Folgenbestätigung vor dem Löschen. Ein Vorgänger gilt danach länger; ohne Vorgänger entsteht eine ausdrücklich benannte Lücke. Der entfernte Satz bleibt im Fassungsarchiv. Kein automatischer Ersatz oder rückwirkendes Auffüllen.
4. **Grenzen:** Neue Änderungen nur in `[period_start, period_end)`, auch am Beginn, aber nicht am exklusiven Ende. Zukünftige bekannte Konditionen innerhalb des Zeitraums sind erlaubt. Ohne bekanntes Ende bleibt der Zeitraum offen; die Jahresannahme wird nur als Berechnungsbereich in den Grundlagen erläutert und begrenzt keine neuen Konditionsdaten. Vorhandene Datensätze außerhalb der Grenzen bleiben zur Korrektur/Löschung zugänglich; ihre Wirkung wird auf den gewählten Zeitraum begrenzt bzw. als ohne Wirkung benannt.
5. **Spätere Änderungen:** Jeder Satz bleibt ein vollständiger datierter Wertesatz. Eine Rückdatierung gilt bis zum nächsten Satz; spätere Sätze werden nicht verändert. Der Hinweis auf diese Grenze erscheint gezielt im Formular und in der Prüfung.
6. **Altdubletten:** Keine automatische Datenbereinigung. Neue Dubletten werden serverseitig verhindert. Bei bestehenden Mehrdeutigkeiten gibt es keine zufällige Priorität: `activeRate` liefert für den betroffenen Abschnitt keine eindeutigen Konditionen. Die Historie zeigt den Konflikt; der falsche Eintrag kann ausdrücklich gelöscht werden.

`conditionValues`, Parser und Darstellung erhalten die vorhandene JS-Zahlengenauigkeit; keine Hundertstelbegrenzung. Deutsche Tausenderpunkte und Dezimalkommas werden eindeutig verarbeitet. Ein Punkt wird nicht als geratenes Dezimalzeichen behandelt. Grundpreis, Arbeitspreis und Abschlag dürfen ausdrücklich 0 sein; Gasfaktor muss positiv sein. Die vorhandene Berechnung bleibt datiert, ohne rückwirkende Anwendung der ersten Konditionen auf Lücken, mit der bestehenden taganteiligen Monatsbetragskonvention und ausgewählter Zeitraumdauer.

## Speicherung, Konflikte und Migration

Additive Migration: [20261116000002_dated_conditions.sql](../../../supabase/migrations/20261116000002_dated_conditions.sql).

- `change_conditions(request_id, payload)` prüft Kontozugehörigkeit serverseitig über `auth.uid()` → Zähler → Zeitraum, validiert Angaben und führt Änderung, Fassungsarchiv und Speicherbeleg atomar aus.
- Private Belegtabelle `condition_requests`: Konto/Request bilden den Schlüssel. Identische Wiederholungen führen keine zweite Mutation aus; derselbe Schlüssel mit anderen Angaben wird abgewiesen. Der Replay liefert die **aktuelle** Historie, nicht einen alten Ergebnis-Snapshot. Gelöschte Zeiträume werden nicht durch einen alten Auftrag wiederhergestellt.
- `condition_revisions` archiviert vor Korrektur/Löschung den vollständigen vorherigen Datensatz. Leserechte sind kontogebunden und zusätzlich an den zugehörigen Zeitraum/Zähler gebunden. Direkte Client-Schreibrechte bestehen nicht. Bei einem Fehler werden Archiv und Beleg zusammen mit der Änderung zurückgerollt.
- Request-/Zeitraumlocks und Sperren bestehender Zeilen serialisieren Änderungen. Ein Vergleich der erwarteten Historie und Zeitraumgrenzen verhindert stilles Überschreiben durch veraltete Formulare. Konflikte verlangen explizites Laden und Prüfen; Eingaben bleiben erhalten. Hat sich der Zeitraum selbst verändert, wird nicht still gegen neue Grenzen gespeichert.
- Ein Trigger verhindert neue doppelte Daten auch auf vorhandenen Insertwegen (Einrichtung/Folgezeitraum). Bestehende Altdubletten werden nicht gelöscht. Bestehende RLS-Policies bleiben erhalten.
- Vor dem ersten Versand speichert der Browser den exakten Auftrag im konto-/zeitraumgebundenen `sessionStorage`. Während Pending verhindern Ref-Sperre und deaktivierte Aktionen Mehrfachübermittlung und Schließen. Bei unklarer Antwort bleibt der Auftrag unverändert; **Speicherung prüfen** wiederholt ihn auch nach Reload. Nach bestätigtem Transaktionsfehler ist Bearbeiten nach Prüfung möglich; nach bestätigtem Erfolg wird der Sitzungsbeleg entfernt.
- Nicht lesbarer oder nicht schreibbarer Wiederholschutz führt zu keinem Versand. Geänderte ungespeicherte Eingaben haben Abbruch-/Escape- und Seitenverlassensschutz. „Später prüfen“ bewahrt einen unbestätigten Auftrag; erneutes Öffnen über „Konditionen ändern“ stellt ihn wieder her.

Die Migration wurde zuerst innerhalb `BEGIN`/`ROLLBACK` lokal auf SQL-Gültigkeit geprüft, danach **gezielt ausschließlich auf der vorhandenen lokalen Instanz** angewandt und mit `supabase migration repair 20261116000002 --status applied --local` im lokalen Journal erfasst. Kein Reset. Keine Produktivmigration. Nicht blind erneut anwenden. Schemaänderungen schreiben keine vorhandenen Haushaltszeilen um; nur neue synthetische Konten und deren Daten wurden für Integrationstests erzeugt und anschließend entfernt. Die vorhandene Seed-Datei bleibt gültig; die neuen internen Tabellen benötigen keine Seed-Zeilen.

## Unabhängige Erwartungswerte

| Fall | Separat nachvollziehbare Erwartung |
| --- | --- |
| Strom, Januar 2025, 310 kWh, 10 kWh/Tag; Wechsel am 16. und 25. | 15 × 10 × 0,30 + 9 × 10 × 0,40 + 7 × 10 × 0,50 = 116 € Arbeitspreis; dazu Grundpreis |
| Derselbe Fall, Grundpreis immer 10 €/Monat, Abschlag 100 €/Monat | Kosten 116 + 120 × 31 / 365 = 126,19178082… €; Abschläge 1.200 × 31 / 365 = 101,91780822… €; Differenz −24,27397260… € |
| Unitfall mit Grundpreis 20 und Abschlag 150 nur vom 16.–24. | Grundpreis (15 × 10 + 9 × 20 + 7 × 10) × 12 / 365; Abschläge (15 × 100 + 9 × 150 + 7 × 200) × 12 / 365 |
| Gasregression Slice 3, 1.000 m³, Faktor 10, Wechsel nach März | H0-Anteil Jan–März 0,44: 4.400 × 0,10 + 5.600 × 0,12 + 120 = 1.232 €; Abschläge 1.560 €; Erstattung +328 € |
| Ersten Konditionssatz löschen, späteren behalten | Echte Lücke bis zum späteren Datum, Kosten/Saldo unbekannt statt rückwirkender Anwendung; nach Reload weiterhin sichtbar |

Neue Utilitytests decken Datum vor/am Beginn/am/ nach Ende, Zukunft, deutsche Gruppierung, Null/Leer, Gaspräzision, datierte Übernahme, Dubletten unabhängig von Reihenfolge und Löschfolgen ab. Neue Verhaltenstests prüfen Einzel-/Mehrfachänderung, Bearbeitungs-/Abbruchschutz, Pending/Doppelklick, exakten Retry nach Remount, Kontoabgrenzung des Entwurfs, blockierten Sitzungsspeicher, Konflikt mit erhaltenen Angaben, Korrektur/Löschung und aktualisierte Einschätzung samt Fokus. Bestehende Berechnungsregressionen bleiben erfolgreich.

## Prüfungen und Bilder

- [Tests](tests.log): **116 Tests / 17 Dateien bestanden**. Vorbestehende React/Radix-`act`-Warnungen bleiben sichtbar.
- [Typecheck](typecheck.log): `npx tsc --noEmit` bestanden.
- [Lint](lint.log): `npm run lint -- --fix`, keine Fehler, zwei vorbestehende Warnungen.
- [Produktionsbuild](build.log): `npm run build` bestanden, auf finalem Quellstand in isolierter temporärer Kopie, mit synthetischer lokaler Konfiguration. Der erste isolierte Versuch mit symlinked `node_modules` wurde von Turbopack abgewiesen; [Protokoll](build-attempt-symlink.log). Mit lokaler Dateikopie der Abhängigkeiten lief derselbe Build unverändert erfolgreich. Keine Projektkonfiguration angepasst; laufendes `.next` nicht überschrieben.
- [Impeccable-Detektor](detector.json): keine Befunde. Vorbestehender Sidecar-Drift wurde nicht repariert.
- [Konditionen-Browsermatrix](browser-check.json): 23 Aufnahmen; Desktop 1440 px, Mobil 390 px, 320 px mit 200 % Schrift plus Textabständen. Tastatur/Fokus, Datumsschutz, Abbruch, Prüfung, Pending, Fehler, identischer Retry nach Reload, Erfolg, Korrektur/Löschfolgen, Gaspräzision, lange Werte und Reduced Motion. Dokument-/Text-/Kontrollgrenzen geprüft. Keine Page Errors. Synthetische HTTP-Antworten, keine Persistenzbehauptung.
- [Verstehen-Regression](understanding-regression/browser-check.json): unveränderte 21-Aufnahmen-Matrix auf finalem Stand bestanden.
- [Einrichtungsregression](setup-regression/browser-check.json): unveränderte Matrix, 19 Bilder bestanden.
- [Ablesungsregression](reading-regression/browser-check.json): zehn Prüfgruppen, 17 Bilder bestanden, einschließlich bestehender Vorbelegung/Genauigkeit, Tastatur, Fehler/Pending und Reduced Motion. Alle Regressionen getrennt unter Slice 4 abgelegt.

Wichtige Bilder: [Standardansicht](screenshots/desktop-current.png), [Tastatur/Erfassung](screenshots/desktop-edit-keyboard.png), [Prüfung](screenshots/desktop-review.png), [Datumsschutz](screenshots/desktop-date-protection.png), [Fehler/Wiederholung](screenshots/desktop-uncertain.png), [Historie](screenshots/desktop-history.png), [historische Korrektur](screenshots/desktop-historical-correction.png), [Löschfolgen](screenshots/desktop-delete-gap.png), [mobiles Gas-Sheet](screenshots/mobile-gas-edit.png), [320 px/200 % Erfassung oben](screenshots/mobile-200percent-edit-top.png), [Aktionen unten](screenshots/mobile-200percent-edit-bottom.png), [Prüfung unten](screenshots/mobile-200percent-review-bottom.png), [Fehler bei 200 %](screenshots/mobile-200percent-error-bottom.png).

### Echte lokale Persistenz (keine Datenantwort-Mocks)

[API-Prüfung](live-integration.json) / [Script](verify-live.mjs): reale lokale Auth/PostgREST/PostgreSQL. Acht parallele identische Aufträge → genau ein neuer Satz. Veränderte Nutzlast und veraltete Historie abgewiesen. Rückdatierung erhält spätere Konditionen. Grenzen und Zukunft, Kontoisolation, Archivzugriff, historische Korrektur am Beginn bei vorhandener Schlussabrechnung, explizite Nullen und Gaspräzision geprüft. Löschung mit Lücke, exakter Delete-Retry, alter Create-Replay nach Löschung und frischer authentifizierter Client geprüft. Ungültige Korrektur rollt Archiv/Beleg zurück; anonyme Ausführung abgewiesen. Eigene Testkonten und Daten bereinigt.

[Echter Browserweg](live-browser.json) / [Script](verify-live-browser.mjs): reale Anmeldung und Speicherung über Produktkomponenten in isolierter lokaler App-Kopie. Einmal wird nach `route.fetch` mit tatsächlichem Commit ausschließlich die HTTP-Antwort verworfen. Browserreload und exakter Retry bestätigen denselben einzelnen Datensatz. Danach tatsächlicher Kosten-/Saldovergleich mit obigen festen Erwartungen und erneutem Reload. Korrekturarchiv in der UI, Null-Abschlag, bestätigte Löschung und weiterhin unbekannte Kosten nach Reload. Gasregression mit 1.232 € und 328 € Erstattung, zusätzliche präzise Faktoränderung und Reload, tatsächliche Schlussabrechnung unverändert, Strom unabhängig. Keine Page Errors; eigene Daten bereinigt.

## Reproduktion

Aus dem Repositoryroot, mit vorhandener Playwright-/Brave-Installation; keine neue Projektabhängigkeit:

```sh
npm test -- --run
npm run lint -- --fix
npx tsc --noEmit
npm run build
node docs/verification/slice-4/run-preview-matrix.mjs
```

`run-preview-matrix.mjs` erstellt eine temporäre Quellkopie mit eigenem `.next`, startet nur dort eine opt-in synthetische Vorschau auf 127.0.0.1:3005, führt alle vier Browsermatrizen aus und beendet den eigenen Server. Die Einzel-Scripts akzeptieren `PREVIEW_URL`; Browserpfade sind über `PLAYWRIGHT_MODULE` und `BROWSER_PATH` austauschbar. Screenshots entstehen zunächst unter `/private/tmp` und werden nach Browserende kopiert. Builds nicht gleichzeitig im selben `.next` wie einen Dev-Server ausführen.

Nur bei bereits bekannter laufender **lokaler** Supabase mit angewandter Migration, kein Reset:

```sh
node docs/verification/slice-4/verify-live.mjs
node docs/verification/slice-4/verify-live-browser.mjs
```

Beide Skripte erzwingen `http://127.0.0.1:54321`; der Browserweg startet seine eigene temporäre App auf Port 3004. Keine echten Haushaltszeilen werden gelesen oder verändert. Interne Service-Zugangsdaten aus lokalem CLI-Status werden weder protokolliert noch ins Repo geschrieben.

## Grenzen und Review

Synthetische Vorschau und echte lokale Persistenz sind getrennte Nachweise. Keine Produktionsinfrastrukturabnahme, physische Mobilgerätetastatur, Hardware-Safe-Area, Screenreader- oder Safari-/Firefox-Prüfung. Die Screenshots bei 320 px/200 % bilden stark vergrößerte, vertikal scrollbar erreichbare Ansichten ab; lange Wörter dürfen lokal umbrechen. Kein neues Ziehgestenverhalten im Konditions-Sheet; Abbrechen, Escape, Schließen und vertikales Scrollen sind vorhanden. Die vorhandene Ablesegeste bleibt unverändert und regressionsgeprüft.

Wiederaufnahme gilt im selben Konto, Zeitraum und derselben Browsersitzung. Ein bewusst gelöschter Sitzungsspeicher bzw. neuer Browserkontext enthält den alten Request-Schlüssel nicht. Serverbelege verhindern die Wiederholung verbrauchter Schlüssel; die Datumsprüfung verhindert zusätzlich unbemerkte zweite aktive Sätze am selben Datum. Historienarchive bleiben an den Zeitraum gebunden; bestehendes Löschen eines ganzen Zählers/Zeitraums entfernt dessen Archiv ebenfalls.

Eigenreview von Datenweg, UI und gerenderten Nachweisen; kein unabhängiger Agentenreview behauptet. Kein neuer Zeitraum, Anbieterwechsel oder neue Schlussabrechnungserfassung, keine Auth-/Zählereinrichtungsneugestaltung, keine neue Prognoselogik. Keine echten Haushaltsdatenänderungen. Kein Push, Merge oder Deployment.
