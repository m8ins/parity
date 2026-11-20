# Slice 5 · Abrechnen und fortführen

**Aktueller Stand · 19.11.2026:** Technischer Abschlusslauf auf dem bestätigten Tinte-Stand bestanden, einschließlich erneutem echtem lokalem DB-/Browserlauf. Die zwischenzeitliche Sperre der lokalen Umgebung ist behoben. Fachliche Nutzerabnahme und die unten genannten Geräte-/Screenreader-/Cross-Browsergrenzen bleiben offen.

18.11.2026. Ausgangspunkt `codex/slice-4-conditions` einschließlich sämtlicher uncommittierter Dateien zu Konditionen und offenen Zeiträumen. `codex/slice-5-billing-periods` wurde direkt im selben Arbeitsbaum angelegt; kein Worktree, Reset, Stash, Commit oder Verwerfen vorhandener Arbeit. Die Ausgangssuite bestand mit 123 Tests. Maßgeblich sind die späteren Nutzerkorrekturen aus Slices 3/4, insbesondere die reduzierte Verstehen-Ansicht und das tatsächlich offene Ende.

Der Nutzer hat vor der UI-Implementierung bestätigt:

- Eine Abrechnung benötigt zuerst das tatsächliche Zeitraumende über das bestehende „Ende festlegen“. Das erzeugt keinen Folgezeitraum.
- Nur der neueste Zeitraum wird fortgeführt. Bei einem vorhandenen Nachfolger führt die Aktion dorthin. Rückdatierte Übergänge nach dem alten Beginn sind erlaubt. Eine ausdrücklich bestätigte Lücke bleibt bestehen; das alte Ende wird nicht verlängert.
- Spätere Konditionen werden nach ausdrücklicher Prüfung zusätzlich in den neuen Zeitraum übernommen. Die Originale bleiben unverändert. Ohne eindeutige Ausgangskonditionen müssen die Anfangswerte bewusst eingetragen werden.

## Ergebnis

**Abrechnung:** „Verwalten“ → „Abrechnung erfassen“ beziehungsweise „Abrechnung korrigieren“. Der geschützte Dialog benennt Zähler und ausgewählten Zeitraum. Erstattung/Nachzahlung werden über eine segmentierte Auswahl gewählt; eine bewusst eingegebene 0 bedeutet ausgeglichen. Der Betrag wird ohne Vorzeichen eingetragen; gespeichert werden positiv, negativ beziehungsweise ausdrücklich 0. Ein unbekanntes Ergebnis bleibt NULL. Abrechnungsdatum ist erforderlich, gültig zwischen Zeitraumstart und heutigem Berliner Datum. Ein bestehendes Ergebnis einschließlich seiner Genauigkeit wird tatsächlich vorbelegt. Unveränderte Vorbelegung verursacht keinen Verwerfen-Dialog.

Bei offenem Ende verweist der Dialog zum vorhandenen Enddialog. Es wird weder heimlich geschlossen noch ein Jahresende eingeführt. Der Enddialog verwendet weiterhin „Bis einschließlich“, intern gilt der Folgetag exklusiv. Eine Abrechnung bleibt auch nach bereits begonnener Folgeperiode am alten Zeitraum erfassbar.

**Fortführung:** „Verwalten“ → „Neuer Zeitraum / Wechsel“ → Beginn, optionales Ende und Anbieter → editierbare Anfangskonditionen → Prüfung → bestätigte Speicherung → „Neuen Zeitraum ansehen“. Das neue Ende bleibt zunächst leer. Die Vorbelegung berücksichtigt die Datierung am neuen Beginn, einschließlich eines genau dort hinterlegten Satzes, statt blind die letzte Zeile zu verwenden. Ein Wechsel des Beginns nach eigenen Konditionsänderungen verlangt die ausdrückliche Neuübernahme; Zurück erhält Werte.

Die Prüfung zeigt das bisherige und das neue alte Ende ausdrücklich. Bei lückenlosem Anschluss bleibt es unverändert; bei offenem oder früherem Wechsel wird es auf den Tag vor dem neuen Beginn begrenzt. Bei späterem Beginn bleibt das alte Ende erhalten und die Lücke wird mit beiden Tagen benannt. Anfangswerte und spätere Konditionen sind gezielt aufklappbar. Alle späteren Datierungen sind sichtbar; eine Checkbox bestätigt Grenze, gegebenenfalls Lücke und spätere Konditionen vor dem Speichern.

Spätere Sätze werden vollständig kopiert, genau am Übergang gilt der geprüfte editierbare Anfangssatz ohne zusätzliche Dublette. Doppelte oder ungültige spätere Sätze sowie ein neues Ende, das sie ausschließen würde, blockieren mit Klärungsbedarf. Es gibt kein stilles Weglassen, Verschieben oder Löschen. Der Anbieter kann gleich bleiben, wechseln oder bewusst leer sein. Strom und Gas bleiben unabhängig, der Gasfaktor behält seine Genauigkeit.

Der bestehende Zähler und alle Ablesungen bleiben erhalten. Eine Ablesung exakt an der gemeinsamen Grenze ist derselbe Datensatz: Abschlussstand für den alten und Anfangsstand für den neuen Berechnungsbereich. Alte Zeiträume, Originalkonditionen, Fassungsarchiv und Abrechnungsergebnisse bleiben erreichbar. Keine neue Prognoselogik oder Vertragsentität.

Nach bestätigten Antworten aktualisiert die Detailansicht die tatsächlichen lokalen Datensätze und aktualisiert die Serveransicht. Neue Zeitraumwahl wird in `/meter/{id}?period={id}` abgebildet. Die reduzierte Verstehen-Ansicht bleibt bestehen; tatsächliches Ergebnis und Kostenschätzung sind weiter getrennt. Erstattung ist grün, Nachzahlung rot, ausgeglichen/unbekannt neutral. Tatsächliche Abschlagszahlungen werden nicht behauptet.

## Speicherung und additive Migration

[20261118000001_billing_periods.sql](../../../supabase/migrations/20261118000001_billing_periods.sql) wurde zuerst lokal in `BEGIN`/`ROLLBACK` geprüft, anschließend gezielt auf der bekannten Instanz `127.0.0.1:54321` angewandt und mit `supabase migration repair 20261118000001 --status applied --local` journalisiert. Die bestehenden Migrationen `20261116000002`/`000003` waren bereits angewandt und wurden nicht umgeschrieben. Kein Reset, keine Produktivmigration, kein Lesen oder Ändern von Haushaltszeilen. Die neue Migration schreibt keine Bestandszeilen um; bestehende Seeds benötigen keine internen Request-Zeilen und bleiben unverändert gültig.

- `save_billing_settlement` speichert absolute Zielwerte für Betrag/Datum. Kontozugehörigkeit und erwartete Zeitraumgrenzen werden unter Sperre geprüft. Bereits identische Zielwerte liefern den bestätigten Stand; andere inzwischen geänderte Ergebnisse werden abgewiesen. Eine eigene Requesttabelle ist dafür nicht nötig.
- `continue_billing_period` speichert alte Grenze, neue Periode, Anfangssatz, spätere Sätze und Wiederholbeleg in einer PostgreSQL-Transaktion. Konto, gesamte erwartete Zeitraumliste und erwartete Konditionshistorie werden geprüft. Meter-/Perioden-/Rate-Sperren serialisieren die beteiligten Schreibwege; bei Konkurrenz gibt es einen Konflikt oder vollständigen Transaktionsabbruch.
- Private Tabelle `billing_continuation_requests`: Konto/Request als Schlüssel, exakte Payload und erzeugte Zeitraum-ID. Identische Wiederholung liefert aktuelle bestätigte Datensätze, keine zweite Anlage; andere Payload unter demselben Schlüssel wird abgewiesen. Meter bleibt gleich, Ablesungen werden nicht geschrieben.
- Trigger `guard_billing_period` verhindert neue/änderungsbedingt eingeführte Überschneidungen und ungültige Grenzen auch über vorhandene direkte Insert-/Updatewege. Er bereinigt keine Altdaten. Zählerzuordnung einer Periode ist unveränderbar.
- Trigger `a_lock_billing_rate_parent` sperrt bei Rate-Insert/Update/Delete den Elternzeitraum. Damit können auch bestehende direkte Schreibwege den Fortführungssnapshot nicht unbemerkt überholen. Eine Rate kann nicht in einen anderen Zeitraum verschoben werden.
- `loadMeterData` wirft Datenladefehler jetzt weiter, statt bei Konflikt-Neuladen einen fehlgeschlagenen Abruf als leere, bestätigte Historie zu behandeln.

Der Browser sichert vor Versand den exakten Auftrag im konto-/objektgebundenen `sessionStorage`. Für Fortführung ist der Schlüssel am Zähler gebunden, damit ein bereits tatsächlich angelegter neuer Zeitraum die Wiederaufnahme nach Reload nicht verhindert. Für Abrechnung ist er am ausgewählten Zeitraum gebunden. Unlesbarer oder nicht schreibbarer Speicher führt zu keinem Versand. Pending sperrt Mehrfachübermittlung, Felder und Schließen. Unklare Antworten erhalten die unveränderliche Nutzlast und erlauben „Speicherung prüfen“ auch nach Reload. Strukturierte Ablehnungen erfordern explizites Laden des aktuellen Stands und erneute Prüfung; Eingaben bleiben erhalten. Erfolg wird erst nach bestätigter Antwort angezeigt.

## Schreibwege und Prüfauftrag für Slice 7

| Weg | Rechte und Verantwortung |
| --- | --- |
| `save_billing_settlement(uuid,jsonb,numeric,date,numeric,date)` | Nur `authenticated` darf ausführen; `auth.uid()` → Zählerzuordnung wird serverseitig geprüft. Absoluter Ergebnisvergleich. |
| `continue_billing_period(uuid,jsonb)` | Nur `authenticated`; Konto- und Snapshotprüfung, atomare Anlage und Replay. |
| `billing_continuation_requests` | RLS aktiv, keinerlei direkte Clientrechte, auch keine Leserechte. Nur geprüfte SECURITY-DEFINER-RPC schreibt/liest. FK auf Konto und erzeugten Zeitraum mit `ON DELETE CASCADE`. |
| `guard_billing_period`, `a_lock_billing_rate_parent` | Automatisch bei den genannten Tabellenmutationen; SECURITY DEFINER mit leerem `search_path` und qualifizierten Tabellen. |
| Bisherige Einrichtung, Konditions-RPC, Ende-RPC | Bleiben bestehen; neue Trigger gelten ebenfalls. Ende-RPC setzt absolute Ziele und prüft anschließende Zeiträume. |
| Bisherige direkte Detail-/Rate-/Settlement-Schreibrechte | Nicht pauschal entzogen. Neue Trigger sichern Grenzen/Sperren, ersetzen aber keine allgemeine Schreibweg- und Archivzugangsentscheidung. In Slice 7 inventarisieren. |

Slice 7 muss die neue Requesttabelle ausdrücklich mitprüfen: vollständige Payload, derzeit kein eigener Erstellungszeitpunkt, Aufbewahrungsdauer, späte Wiederholung und Kaskaden bei Konto-/Objektlöschung. Im jetzigen Umfang gelten die Belege solange die referenzierten Objekte bestehen; sie sind kein fachliches Fassungsarchiv. Ein manuell gelöschter Browser-Sitzungsspeicher enthält keinen alten Schlüssel mehr. Ein inzwischen vorhandener Nachfolger verhindert trotzdem eine zweite Fortführung vom alten Zeitraum. Bestehende Legacy-Rechte und deklarative Konditions-Constraints bleiben im geplanten Slice 7; keine ungefragte Altdatenbereinigung.

## Prüfungen

- [138 Tests / 21 Dateien](tests.log) bestanden, darunter 15 neue Dialog-Verhaltenstests und 7 Utilitytests; die Tests des entfernten unsicheren Drei-Schritt-Speicherwegs wurden durch die neuen Fälle ersetzt. Bestehende React/Radix-`act`-Warnungen bleiben sichtbar.
- [Typecheck](typecheck.log), [Lint](lint.log) und [Produktionsbuild](build.log) bestanden. Lint hat ausschließlich zwei vorbestehende Warnungen. Der Build lief mit `npm run build` in einer isolierten temporären Quell-/Abhängigkeitskopie; der laufende Projektserver blieb unberührt. Der erste Sandbox-Build wurde an Turbopacks internem lokalen Port blockiert, die Wiederholung mit den nötigen lokalen Prozessrechten bestand.
- [Impeccable-Detektor](detector.json): keine Befunde an den beiden neuen Dialogen. Bestehende Foundation/Radix-Komponenten unverändert verwendet, keine neue Designsprache oder Variantenrunde.
- [Neue Browsermatrix](browser-check.json): **27 Aufnahmen**, Desktop 1440 px, Mobil 390 px, 320 px mit 200 % Text und zusätzlichen Textabständen. Tastatur-/Dialogfokus, datierte Vorbelegung, spätere Sätze, explizite Grenze/Lücke, vorhandener Nachfolger, offenes Ende, Erstattung/Nachzahlung/Null, Konflikt/Pending/Fehler, Doppelklick, exakte Wiederaufnahme nach Reload und Reduced Motion. Dokument-/Text-/Kontrollgrenzen geprüft. Native Zahlen-/Datumsfelder bleiben bei starker Vergrößerung innerhalb des Feldes bedienbar. Kein Page Error. HTTP-Antworten in dieser Matrix sind synthetisch.
- [Gemeinsame Regressionen](matrix.log): Konditionen **29**, Verstehen **21**, Einrichtung **19** Aufnahmen sowie Ablesung **10 Prüfgruppen/17 Aufnahmen** bestanden. Eigene Kopien der vorhandenen Scripts und Berichte liegen unter den jeweiligen `*-regression/`-Verzeichnissen. Bestehende Vorbelegung, Auswahl und Änderungsschutz bleiben erhalten.
- [Echte lokale API-/DB-Prüfung](live-integration.json), [Script](verify-live.mjs): **10 Gruppen** bestanden. Acht parallele identische Aufträge → genau ein Nachfolger; veränderte Payload, fehlende Bestätigungen und veraltete Snapshots abgewiesen. Ein nur auf einen zufälligen eigenen Test-Provider reagierender temporärer Trigger erzwingt einen Fehler nach altem End-Update und neuem Period-Insert: keine Teilanlage, kein Beleg; derselbe Schlüssel funktioniert danach. Echte parallele Fortführung/Ende/Konditionen/Details sowie direkte überlappende Inserts geprüft. Erstattungsvorzeichen/Null, präzise negative Werte, Gas, Rückdatierung, Lücke, RLS und private Belege geprüft. Testtrigger und eigene Konten entfernt.
- [Echter lokaler Browserweg](live-browser.json), [Script](verify-live-browser.mjs): tatsächliche Anmeldung, Fortführung ohne Abrechnung, Übergangswert exakt am Beginn, späterer Juni-Satz, drei unvervielfachte Zählerablesungen. Nach tatsächlichem Commit wird einmal nur die Antwort verworfen; Reload/Retry sendet exakt dieselbe Request-ID und Payload, es bleiben genau zwei Zeiträume. Erstattung +125,50 €, Nachzahlung −42,25 € und explizite 0 bleiben mit Datum im tatsächlichen Banner nach Reload sichtbar. Gas unabhängig und Folgeperiodennavigation geprüft. Keine Page Errors; eigene Konten/Daten bereinigt.
- Separater Read-only-Review durch einen Sol-Agenten: beide Dialoge, RPCs, Snapshot-/Retrylogik, Integration und Nachweise gelesen, keine bestätigten actionable Findings. Der Review ersetzt keine physische Geräte-/Screenreaderabnahme.

Bilder: [Abrechnung Desktop](screenshots/desktop-settlement-Erstattung.png), [Fortführungsprüfung](screenshots/desktop-period-review.png), [spätere Konditionen](screenshots/desktop-future-conditions.png), [Lücke](screenshots/desktop-gap-review.png), [Speicherfehler](screenshots/desktop-period-error.png), [mobiles Gas](screenshots/mobile-gas-conditions.png), [mobile Prüfung](screenshots/mobile-gas-review.png), [200 % Erfassung](screenshots/mobile-200percent-conditions-top.png), [200 % Aktionen](screenshots/mobile-200percent-review-bottom.png).

## Reproduktion und Grenzen

```sh
npm test -- --run
npm run lint -- --fix
npx tsc --noEmit
npm run build
node docs/verification/slice-5/run-preview-matrix.mjs
node docs/verification/slice-5/verify-live.mjs
node docs/verification/slice-5/verify-live-browser.mjs
```

Die letzten zwei Scripts erzwingen die bekannte lokale Supabase. Migration vorher gezielt prüfen/anwenden, niemals unbekannte Datenbanken zurücksetzen. Die globale Supabase-CLI wurde verwendet; die ältere npm-CLI kann die vorhandene `local_smtp`-Konfiguration nicht lesen. Docker/OrbStack muss laufen. Browser-Scripts verwenden vorhandenes Playwright/Brave, Pfade sind über `PLAYWRIGHT_MODULE` und `BROWSER_PATH` austauschbar. Die synthetische Matrix startet eine isolierte Vorschau auf Port 3005, der echte Browserweg auf 3006; Screenshots werden nach Browserende aus `/private/tmp` kopiert.

Physische Bildschirmtastatur, Hardware-Safe-Area, Screenreader, Safari/Firefox und gerenderte Nutzerabnahme bleiben offen. Konkurrierende Legacy-Schreibwege können zu einem vollständigen Deadlock-Abbruch führen; die UI meldet dabei keinen Erfolg und lässt denselben Auftrag sicher prüfen. Kein Upload, Rechnungserkennung, Zahlungsmodell, Umzugsassistent, Authfeature oder neues Prognosemodell. Keine echten Haushaltsdaten verändert. Kein Push, Merge oder Deployment.

### Zwischenzeitliche Umgebungsgrenze · am 19.11.2026 behoben

Nach den erfolgreichen echten lokalen API- und Browserläufen antwortete die lokale Docker-API nicht mehr: `supabase status` und eine reine Sperrstatusabfrage blieben hängen, der HTTP-Gesundheitscheck auf 127.0.0.1:54321 erreichte sein Timeout. OrbStack meldete weiter „Running“. Der zusätzlich gestartete Wiederholungslauf kam deshalb nicht bis zur Anmeldung; es wurden dabei keine neuen Testkonten oder Haushaltsdaten verändert. Nur die eigenen hängenden Prüfprozesse wurden beendet, kein Neustart anderer Container oder Datenbankreset vorgenommen. Die zuvor bestandenen neun DB-Gruppen und der echte Browserbericht bleiben erhalten; dieser spätere Versuch wird nicht als weiterer bestandener Nachweis ausgegeben. Die API-Statusabfrage im Script hat nun ein explizites Timeout.

### Nutzerreview · Ergebnis und Betragsfeld (19.11.2026)

Zwei direkt sichtbare Radiosegmente ersetzen das Dropdown. Native Tastaturnavigation, sichtbarer Fokus und Speichersperre bleiben erhalten. Vorhandene Outcome-Farben und Richtungspfeile geben eine dezente Zustandsrückmeldung, ohne neue Designrollen einzuführen. Betrag verwendet das vorhandene shadcn-Input-Group mit € rechts im Feld und dem zweistelligen Placeholder `15,37`. Bewusste 0 bleibt ausgeglichen; alte unbestätigte Aufträge mit der früheren Auswahl „Ausgeglichen“ werden weiterhin exakt wiederholt. Das UI zeigt dafür 0 im Feld. Bestehende Datengenauigkeit und Speicher-RPC bleiben erhalten.

138 Tests, Typecheck und Lint bestanden (zwei bestehende Warnungen). Aktualisierte Browsermatrix und Buildprotokoll gehören zum Stand dieser Nachkorrektur. Die echten DB- und Browsernachweise wurden beim Abschlusslauf am 19.11.2026 auf dem bestätigten Tinte-Stand erneut ausgeführt; siehe Abschluss unten.


Weitere Gestaltungskorrektur am 19.11.2026: Innenpadding und Abstand der Segmente entfernt. Gemeinsame Außenkontur, bündige aktive Fläche und Trennlinie ersetzen die zwei optisch einzelnen Knöpfe. Fokus liegt innerhalb der Kontur. Die gezielte 27-Aufnahmen-Browsermatrix wird unter `segments-matrix.log` dokumentiert; keine Datenwegänderung.


Nach Vergleich von vier Skizzen wurde am 19.11.2026 „Tinte“ bestätigt und übernommen: dunkle gewählte Hälfte mit heller Schrift, gemeinsamer bündiger Rahmen und orangefarbener Tastaturfokus auf der dunklen Fläche. Keine neuen Farbwerte oder Speicheränderungen. Die aktualisierte gezielte Browsermatrix liegt in `segments-matrix.log`; tatsächliche Ergebnisbanner bleiben grün/rot/neutral.


## Technischer Abschluss · 19.11.2026

Der vollständige aktuelle Quellstand mit der vom Nutzer bestätigten Tinte-Auswahl wurde erneut geprüft:

- 138 Tests / 21 Dateien, Typecheck und Lint bestanden; ausschließlich die zwei vorbestehenden Lint-Warnungen.
- Frischer isolierter Produktionsbuild mit `npm run build` bestanden. Der laufende Projektserver wurde nicht verändert.
- Alle fünf Browsermatrizen bestanden: neue Abläufe, Konditionen, Verstehen, Einrichtung und Ablesung. Desktop/Mobil, Tastatur, 200 % Text und Reduced Motion bleiben nachgewiesen.
- Echte lokale Datenbankprüfung erneut bestanden: 10 Prüfgruppen einschließlich erzwungenem Fehler nach dem ersten Schreibschritt, vollständigem Rollback, parallelen Wiederholungen, konkurrierenden Änderungen und Kontoisolation. Ergänzt: gleicher Anbieter über einen eintägigen sowie einen jährlichen Folgezeitraum; exklusive Grenzen schließen ohne Überlappung an.
- Echter lokaler Produkt-Browserweg erneut bestanden: Fortführung ohne vorherige Abrechnung, spätere Konditionen, tatsächlicher Commit mit verlorener Antwort, Reload und identischer Retry ohne Duplikat; danach Erstattung, Nachzahlung und ausdrückliche Null samt gespeichertem Datum nach Reload. Strom und Gas bleiben unabhängig.
- Beide Testberichte bestätigen `passed: true` und `cleanup: true`; keine Page Errors im echten Browserweg. Alle eigenen Testkonten und der temporäre Fehlertrigger wurden bereinigt. Keine Haushaltsdaten verändert, kein Datenbankreset, keine weitere Migration und kein Push/Merge/Deployment.

Damit ist der zusätzliche lokale Wiederholungslauf nicht mehr offen. Die dokumentierte frühere Störung bleibt als Verlauf erhalten. Ausstehend sind die fachliche Nutzerabnahme beider Aufgaben und die benannten Prüfungen an physischen Geräten, mit Screenreader sowie Safari/Firefox; Slice 7 bleibt separat.
