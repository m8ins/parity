# Vereinfachung · offene Abrechnungszeiträume

16.11.2026. Maßgebliche Nachkorrektur zum Slice-4-Erststand, vom Nutzer beauftragt. Alle vorhandenen Änderungen auf `codex/slice-4-conditions` sind erhalten.

## Umsetzung

- Fachliches Modell: Zähler, Abrechnungszeitraum und Konditionen. Kein zusätzliches Vertragsobjekt; `Contract` ist nur der historische technische Name.
- Ein fehlendes `period_end` bleibt offen. Keine künstliche Schließung nach einem Jahr, keine entsprechend falsche Vergangenheitswarnung und keine Jahresgrenze für Konditionsänderungen. Der Header zeigt „ab … · offen“, die Konditionsübersicht verwendet die am tatsächlichen Stichtag gültigen Werte.
- Normale Änderung: „Neue Konditionen ab …“ und „Neue Konditionen speichern“. Bestehende Werte bleiben unverändert, Korrekturen liegen weiterhin in der Historie.
- „Ende festlegen“/„Ende ändern“ ist direkt im Kopf erreichbar. Das Ende wird als **bis einschließlich** eingegeben und intern in die exklusive Grenze am Folgetag übersetzt. Leeres Feld bedeutet offenes Ende. Nach bestätigter Speicherung aktualisieren sich Header und Einschätzung sofort; Fehler behalten die Eingabe, Pending verhindert Mehrfachübermittlung/Schließen, geänderte Eingaben haben Abbruchschutz. Tastaturfokus kehrt zum Auslöser zurück.
- Die bestehende Rechenlogik bleibt erhalten: Ohne bekanntes Ende verwendet sie weiterhin einen einjährigen Bereich ab Beginn. Dieser ist ausschließlich eine Schätzungsannahme, erklärt in „Wie wird gerechnet?“. Neue Konditionen außerhalb dieses Bereichs sind erlaubt; die Prüfung erklärt gezielt, dass für ihre Kostenauswirkung das tatsächliche Ende festgelegt werden muss. Der Bereich wird nicht stillschweigend erweitert. Diese Änderung führt keine neue Prognoselogik ein.

## Daten und Migration

[20261116000003_open_billing_periods.sql](../../../../supabase/migrations/20261116000003_open_billing_periods.sql) ersetzt die Konditions-RPC additiv: Nur ein tatsächlich eingetragenes Ende begrenzt neue Datumswerte. Bestehende Wiederholbelege und Fassungsarchive bleiben unverändert.

`set_billing_period_end` prüft Kontozugehörigkeit, Beginn/Ende, erwarteten bisherigen Stand und eine anschließende Periode. Absolute Zielwerte machen die Wiederholung nach verlorener Antwort sicher: Bereits bestätigtes identisches Ende liefert denselben Stand, konkurrierende andere Änderungen werden abgewiesen. Auch beim Wiederholen wird eine inzwischen vorhandene Folgeperiode berücksichtigt. Die Funktion legt keinen neuen Zeitraum an und ändert keine Konditionen, Ablesungen oder Schlussabrechnungen.

Die Migration wurde ausschließlich auf der bekannten lokalen Supabase angewandt und im lokalen Journal als angewandt erfasst. Während der Prüfung wurde die Funktionsdefinition gezielt nachgeschärft; keine bestehenden Haushaltszeilen verändert, kein Reset und keine Produktivmigration. Synthetische Testkonten und Daten wurden nach den Prüfungen entfernt.

## Finale Prüfungen

- [123 Tests / 19 Dateien](tests.log) bestanden, einschließlich offener Zeiträume nach mehr als einem Jahr, Daten außerhalb des Rechenbereichs, weiterhin geschlossener Endgrenzen, inklusiver Datumsumrechnung, Fehler/Wiederholung/Pending, Abbruch und bestätigter Aktualisierung.
- [Typecheck](typecheck.log), [Build](build.log) und [Lint](lint.log) bestanden. Lint: zwei vorbestehende Warnungen. Build in isolierter temporärer Quellkopie, laufender Entwicklungsserver unberührt.
- [Impeccable](detector.json): keine Befunde.
- [Browsermatrizen](matrix.log): Konditionen mit 29 Aufnahmen, Verstehen mit 21 Aufnahmen, Einrichtung mit 19 Aufnahmen sowie bestehende Ablesungsregression bestanden. Desktop/Mobil, Tastatur/Fokus, 320 px/200 % Text und Reduced Motion geprüft. [Vollständige Konditionenmatrix](../browser-check.json).
- [Echte lokale API-Prüfung](live.log): offene Zeiträume bleiben nach neuer Kondition jenseits eines Jahres tatsächlich NULL; Ende setzen, identisch wiederholen und wieder öffnen; veraltete, ungültige, fremde und überlappende Änderungen abgewiesen. Die bisherigen Archiv-, Idempotenz-, Strom-/Gas- und RLS-Prüfungen bestehen weiter. [Strukturierter Nachweis](../live-integration.json).
- [Echter lokaler Browserweg](live-browser.log): neue Konditionen ab Dezember im offenen Zeitraum ab November des Vorjahres gespeichert; Ende bis einschließlich 31. Dezember gesetzt; Reload zeigt denselben Tag, Wiederöffnen und weiterer Reload behalten offenes Ende und Dezemberkonditionen. Frühere echte Persistenz- und Gasregressionsfälle bestehen weiter. [Strukturierter Nachweis](../live-browser.json).

Bilder: [Offener Zeitraum](../screenshots/open-desktop-current.png), [Ende festlegen](../screenshots/open-desktop-end.png), [Neue Konditionen im echten Browser](../screenshots/open-new-conditions-review.png), [Mobil](../screenshots/open-mobile-current.png), [mobiler Enddialog](../screenshots/open-mobile-end.png), [200 % oben](../screenshots/open-200percent-end-top.png), [200 % unten](../screenshots/open-200percent-end-bottom.png).

Reproduktion vom Repositoryroot mit bereits angewandten lokalen Migrationen:

```sh
npm test -- --run
npx tsc --noEmit
npm run lint -- --fix
npm run build
node docs/verification/slice-4/run-preview-matrix.mjs
node docs/verification/slice-4/verify-live.mjs
node docs/verification/slice-4/verify-live-browser.mjs
```

Die letzten beiden Befehle verwenden ausschließlich die bekannte lokale Supabase und eigene neue synthetische Konten. Synthetische Oberflächenprüfungen sind getrennt von echten Persistenznachweisen. Physische Geräte, Screenreader, Safari/Firefox und Nutzerabnahme des gerenderten Ergebnisses bleiben offen. Kein Push, Merge oder Deployment.
