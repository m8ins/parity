# Slice 7 · Schreibwege und Wiederholschutz

19.11.2026. Branch `codex/slice-7-write-integrity`, im bestehenden Arbeitsbaum von `codex/slice-6-management` angelegt. Ausgangsarbeitsbaum sauber; vollständiger Slice-6-Stand einschließlich der später wiederhergestellten Verbrauchskurve erhalten. Nutzerabnahme Slices 1–6 gemäß aktuellem Auftrag maßgeblich gegenüber älteren offenen Statuszeilen. Kein Frontend-Redesign, kein Push/Merge/Deployment, keine historischen Migrationen umgeschrieben, kein Reset.

## Ergebnis

[Inventar mit Clientverbrauchern, Tabellen, RLS/Grants, RPCs, Triggern und Sperren](INVENTORY.md). Direkte Rate-/Zeitraummutationen und breite TRUNCATE-Rechte entzogen; legitimer Beginn-/Anbietereditor auf eine kontogeprüfte absolute RPC umgestellt. Name nur als Namensspalte beschreibbar, Ablesungs-Insert über eine begrenzte RPC mit neuem zweckgebundenem Minimalbeleg, direkte Löschung weiter erlaubt; serverseitige Namens-/Ablesungsvalidierung ergänzt. Konditions-RPC sperrt jetzt wie Zeitraumwege zuerst den Zähler. Fassungsarchiv und Erfolgsbeleg bleiben Teil derselben Transaktion.

Vier additive Migrationen, ausschließlich auf dem bekannten lokalen Stack `supabase_db_Parity` / API `127.0.0.1:54321` / DB `54322` angewandt und im lokalen Journal erfasst:

1. `20261119000002_write_integrity.sql`: Rechte, Validierung, Zeit-/Vergleichsformat, dauerhafte Fortführungstombstones, konsistente Konditionssperren, Details-RPC.
2. `20261119000003_unique_condition_dates.sql`: deklarative UNIQUE `(contract_id,effective_from)`; expliziter Abbruch bei Altdubletten, keine Auswahl/Löschung.
3. `20261119000004_continuation_replay_transition.sql`: neues `continuation_version: 1` für bislang unbelegte Fortführungen; erhaltene alte Belege weiterhin wiederholbar.
4. `20261119000005_reading_replay.sql`: Ablesungs-RPC und privater dauerhafter Minimalbeleg, direkter Client-Insert geschlossen; keine bestehenden Ablesungen verändert.

## Technischer Beleg und Vergleich

Die drei vorhandenen privaten Tabellen und der neue Ablesungsbeleg bleiben zweckgebunden, ohne direkten Clientzugriff. Keine generische Request-/Jobverwaltung. Konto+Request-UUID ist je zweckgebundenem Weg der Schlüssel. Keine automatische Befristung und kein periodisches Cleanup: ein einmal verbrauchter Schlüssel bleibt bis zur Kontolöschung verbraucht.

| Feld | Bereits vorhandene Belege | Neue erfolgreiche Aufträge |
|---|---|---|
| `created_at` | NULL, historische Entstehung unbekannt | `transaction_timestamp()` der erfolgreichen Transaktion (Beginn, kein behaupteter Commit-Endzeitpunkt) |
| `recorded_at` | tatsächlicher Upgrade-Transaktionszeitpunkt | tatsächlicher Transaktionszeitpunkt der Formaterfassung |
| `comparison_version` | 0 | 1 |
| `payload` | unverändert vollständig vorhanden | NULL |
| `fingerprint` | NULL | 32 Byte SHA-256 |
| Ergebnis-ID | Setup-ID bzw. Fortführungs-ID, nullable | ebenso; NULL bezeichnet gelöschtes Ergebnis |

`reading_requests` startet ohne Altbelege direkt mit Version 1, Fingerprint, beiden echten Transaktionszeitpunkten und nullable Ergebnis-ID; keine Payloadspalte, Account-FK CASCADE, Reading-FK SET NULL.

Version 0 vergleicht weiterhin exakt mit PostgreSQL-JSONB-Gleichheit, auch nach späteren Objektänderungen. Keine alten Payloads entfernt, keine vermeintlichen historischen Zeitpunkte nachgetragen. Version 1 hasht **serverseitig** das vollständige Eingabeobjekt einschließlich erwarteter Snapshots und Bestätigungen. Diese sind beim Replay Teil der bisherigen Vergleichssemantik; ein anderer erwarteter Stand darf denselben Schlüssel nicht unbemerkt umdeuten. Nach dem Commit müssen sie nicht dauerhaft lesbar als komplette Haushaltssnapshots gespeichert bleiben. Für neue Belege entfällt daher der vollständige Snapshot, für alte bleibt die ursprüngliche Vergleichsgrundlage unverändert.

Kanonisierung V1: rekursive JSONB-Werte, numerische Werte durch `numeric`/`trim_scale` normalisiert, Objektordnung gemäß PostgreSQL-JSONB-Textdarstellung, Arrayreihenfolge unverändert, UTF-8. Hashinput: `parity-request-jsonb-v1:` + normalisiertes JSONB als Text. `1`, `1.0` und `1.000` sind auch verschachtelt gleich; Schlüsselreihenfolge ist bedeutungslos. Fehlend vs. JSON-null, String vs. Zahl, zusätzliche Schlüssel und Arrayreihenfolge bleiben unterscheidbar. Namen/Anbieter werden fachlich beim Schreiben getrimmt, **nicht** nachträglich für den Wiederholvergleich; ein geänderter Eingabeauftrag bleibt ein anderer Auftrag. Kein Client-JSON.stringify als Hashgrundlage.

Versionswechsel: V0 und V1 bleiben lesbar; V1-Hilfsfunktionen und Präfix dürfen nicht semantisch ersetzt werden. Eine künftige Normalisierung benötigt eine neue Vergleichsversion mit eigenem unveränderlichem Algorithmus und Replayzweig. Bei PostgreSQL-Majorupgrades muss die V1-JSONB-Textdarstellung anhand fester Vergleichsvektoren vorab geprüft/erhalten werden; keine pauschale Neuberechnung existierender Digests ohne ursprüngliche Payload. Tests vergleichen verschachtelte Skalen/Objektordnung sowie explizit ungleiche Null-/Array-/Stringvarianten. SHA-256 ist ein technischer Vergleichsbeleg, kein lesbares fachliches Archiv und kein Schutz vor Wörterbuchversuchen durch privilegierte Administratoren.

## Wiederholung, Löschung und Übergang

- **Gleicher Schlüssel, gleiche Angaben:** Requestlock serialisiert, vorhandener Beleg verhindert eine zweite Mutation. Setup liefert dieselbe ID; Ablesung liefert dieselbe unveränderte Zeile; Konditionen/Fortführung liefern gegenwärtige autoritative Objektdaten, keine alten Snapshots zurück.
- **Gleicher Schlüssel, andere Angaben:** zurückgewiesen, unabhängig davon, ob Daten fachlich ähnlich wären. Bei fehlendem/fremdem Objekt kann schon die Kontoprüfung zurückweisen.
- **Parallelität:** gleiche Request-UUID wird serialisiert. Unterschiedliche Zeitraumwege nehmen den gemeinsamen Meterlock vor Zeitraum-/Rate-Sperren. Erwartete Snapshots werden danach gelesen und geprüft. Konflikt statt stiller Überschreibung; deklarative Unique-Constraint bleibt zusätzliche letzte Grenze.
- **Antwort nach Commit verloren:** Browser behält die schon bestehenden konto-/objektgebundenen Aufträge für Einrichtung/Konditionen/Fortführung/Ablesungen im Sitzungsspeicher; identischer Retry funktioniert auch nach Reload. Neue Version wird beim Erstellen des Auftrags gesetzt, kein nachträgliches Umschreiben bereits gesicherter Payloads. Details, Ende, Ergebnis, Name und Löschung sind absolute Zieländerungen; sie benötigen keine neue Requesttabelle.
- **Spätes Replay nach späteren Änderungen:** keine erneute Mutation/Archivierung; Konditionen und Fortführung geben aktuelle Daten zurück. Absolute Änderungen akzeptieren gleichen bestätigten Zielwert, sonst gilt der erwartete Ausgangsstand; sie sind kein historischer Auftragsspeicher.
- **Zähler-/Zeitraumlöschung:** fachliche Zeiträume, Rates, Readings und Korrekturfassungen kaskadieren wie zuvor. Setupbeleg bleibt mit NULL-ID. Konditionsbeleg bleibt ohne Objekt-FK, Replay scheitert bei nicht mehr verfügbarem Zeitraum. Fortführungsbeleg bleibt jetzt mit NULL-Ergebnis-ID, auch wenn nur sein Ergebniszeitraum administrativ gelöscht wurde. Ablesungsbeleg bleibt bei Löschung des Stands oder Zählers ebenfalls mit NULL-Ergebnis-ID. Keine Wiederanlage durch alten Schlüssel.
- **Schon vor Slice 7 verlorene Fortführungsbelege:** ihre Schlüssel sind unbekannt und können nicht rekonstruiert werden. Alte unbelegte Payloads werden deshalb mit `40001` abgewiesen, auch wenn ihr ursprünglicher Snapshot wieder passt. Client muss aktuellen Stand laden und die Fortführung neu prüfen; neue bestätigte Aufträge enthalten `continuation_version: 1`. Erhaltene Altbelege werden vor dieser Formatprüfung verglichen und bleiben identisch wiederholbar. Kein erfundener Altbeleg, keine Datenbereinigung. Bewusst neuer Schlüssel/neuer geprüfter Auftrag darf weiterhin einen Zeitraum anlegen.
- **Kontolöschung:** bestehender Meter-FK auf auth.users ist NO ACTION. Ein direktes Löschen des Kontos mit noch vorhandenen Zählern scheitert weiterhin. Werden eigene fachliche Objekte vorher entfernt und anschließend das Konto administrativ gelöscht, kaskadieren Belege/Archive über user_id. Gelöschtes Authkonto kann alte kontogebundene Schlüssel nicht mehr benutzen. Keine neue Kontolöschfunktion/-policy.
- **Historische Backups:** unverändert unabhängig, geschützt durch Slice-6-RLS/Rechteentzug. Keine Inhalte gelesen oder bereinigt. Ebenso keine Löschung vollständiger Altbelege. Eine spätere Bereinigung dieser Altinhalte benötigt eine separate konkrete Produkt-/Datenverlustentscheidung; diese Umsetzung verlangt dafür keine Freigabe.

Ablesungen bleiben fachlich Append mit zulässigen mehrfachen Ständen, technisch nun über `record_reading`: konto-/zählergebundener Sitzungsspeicher, UUID vor Senden dauerhaft im Sitzungsspeicher, unveränderlicher Payload bei unklarer Antwort, Wiederaufnahme nach Reload und Kontoprüfung vor jedem Clientaufruf. Kein inhaltliches Deduplizieren verschiedener bewusst neuer Schlüssel. Direkte alte Reading-INSERTs werden abgewiesen; vorhandene Zeilen bleiben unverändert, ihnen werden keine erfundenen Belege zugeordnet. Ein verlorener Commit erzeugt bei identischem Retry genau einen neuen Stand. Bei gelöschtem Ergebnis oder definitiv abgewiesenem Auftrag bleibt der alte Auftrag zunächst gesperrt: „Angaben neu prüfen“ löst ihn ausdrücklich nur lokal, speichert nichts und erfordert danach einen bewussten neuen Speicherschritt mit neuer UUID. Kein automatischer Übergang von Replay zu Neuanlage. Bei fremder/fehlender Sitzung bleibt der ursprüngliche Kontoauftrag erhalten. „Später prüfen“ schützt unbestätigte Angaben ohne fälschlich zu behaupten, der Stand sei noch nicht gespeichert. Gesperrter oder defekter Sitzungsspeicher sendet nichts.

## Bestand, Dubletten und Rollout

Vor Anwendung: bekannter Stack und Migrationsjournal bis `20261119000001` geprüft, nur aggregierte Dublettenzahl gelesen: **0 Gruppen**. Keine Haushaltszeilen gelesen/ausgewählt/bereinigt. Vorhandene Rechte, Policies, Funktionen und FKs mit Migrationen/Verbrauchern abgeglichen; ein vorbestehendes Authkonto blieb erhalten. Finaler Katalog-/Journalnachweis: [Schema und Bereinigung](schema-evidence.log), 0 Dublettengruppen, Unique-Constraint vorhanden, 1 Authkonto, 0 Testtrigger.

Upgrade tatsächlich auf dem **bestehenden** Schema: vor Migration 02 eigenes synthetisches Konto angelegt und über Slice-6-RPCs echte Setup-/Korrektur-/Fortführungsbelege erzeugt. Nach Upgrade identische Replays/abweichende Payloads, spätere Änderungen und Objektlöschung geprüft; keine ausschließlich frische Datenbank. Spätere V1-Formattransition zusätzlich mit vorheriger/finaler echter Funktionsdefinition innerhalb einer rückgerollten Transaktion geprüft.

Unique-Migration nimmt einen Schreibschutz auf `rates`, inventarisiert erneut auf Dubletten und installiert die Constraint atomar nur bei konfliktfreiem Bestand. Der vorhandene Trigger bleibt erhalten. Synthetische **Altdubletten** wurden sitzungsbegrenzt in einer rückgerollten Upgrade-Transaktion erzeugt: die tatsächliche Migration bricht mit `23505` und ausdrücklicher Meldung ab, beide Datensätze bleiben erhalten, die Constraint wird nicht als vorhanden behauptet. Eine zweite Prüfung auf dem bereits migrierten lokalen Stand rollt auch das temporäre DDL vollständig zurück. Zwei separate reale DB-Sitzungen mit nur sitzungsweise deaktivierten Usertriggern beweisen zusätzlich die konkurrierende Unique-Durchsetzung.

Falls ein Zielbestand Dubletten hat: 03 nicht als angewandt markieren, keinerlei automatische Auswahl. Nach separater autorisierter Detailanalyse konfliktbezogene IDs/Datum/Anzahl und fachliche Varianten für den Besitzer vorlegen; Korrekturarchiv/Lückenfolgen und gezielte Bereinigung pro Gruppe entscheiden lassen. Sicherheitsmigrationen 02/04 sind unabhängig vom Bereinigen; bei blockierter 03 muss 04 im kontrollierten Rollout separat angewandt/journalisiert werden, bevor der Schreibzugang freigegeben wird. Danach Dublettenzahl erneut prüfen, 03 unverändert ausführen und Constraint katalogseitig bestätigen. Keine Veröffentlichung mit fehlender Constraint als abgeschlossen melden.

Vor gehostetem Rollout erneut Journal, Dubletten und tatsächliche Rechte prüfen. Migrationen und dazugehörigen Client koordiniert ausrollen: alte direkte Details-Clients werden nach Rechteentzug abgewiesen, alte unbelegte Fortführungen verlangen neues Prüfen. Keine dauerhafte Kompatibilitätsfreigabe für Archivumgehungen. Gehostete Anwendung/Migration, externe Mailvorlage und Veröffentlichung bleiben ausdrücklich offen.

## Tatsächliche Prüfungen

- `npm test -- --run`: **186 Tests / 28 Dateien bestanden**, einschließlich Ablesungs-Remount/gesperrtem Speicher/Kontowechsel und ausdrücklichem Neuprüfen sowie Details-RPC mit erwartetem Snapshot, bestätigter Serverzeile, erhaltenen Angaben und identischem Retry bei Konflikt. [Log](tests.log).
- `npm run lint`: bestanden, zwei vorbestehende ungenutzte Imports. [Log](lint.log).
- `npx tsc --noEmit`: bestanden. [Log](typecheck.log).
- Produktionsbuild in isolierter temporärer Quellkopie mit eigenem `.next`, laufender Entwicklungsserver unberührt. [Log](build.log).
- [Upgrade](upgrade.json), [echte API-/Konkurrenzprüfung](live-integration.json), [späte Fehler/Formattransition](atomic.json), [Altdubletten](duplicates.log), [Ablesungs-API](reading.json): bestanden, eigene Testkonten/Daten bereinigt. Reale Clientrollen prüfen authentifizierte/fremde/anonyme Zugriffe; PostgreSQL-Adminzugriff dient nur Inventar, gezielten synthetischen Fehlertriggern, Katalogabfragen und Upgradeinstrumentierung.
- [Browser Einrichtung](browser-2/live-browser.json): echte Anmeldung, verlorene tatsächliche Commitantwort, Reload/identischer Retry, Strom und Gas samt weiteren Ablesungen nach Reload; zusätzlich echte verlorene Ablesungs-Commitantwort, gesperrte Wiederaufnahme nach Reload, identische UUID/Payload und genau ein zusätzlicher Stand.
- [Browser Konditionen/Ende](browser-4/live-browser.json): tatsächliche Pflege, Korrekturarchiv, Löschung, Gaspräzision, verlorene Commitantwort/Reload/Retry; offene Zeiträume und tatsächliches Ende nach Reload.
- [Browser Fortführung/Abrechnung](browser-5/live-browser.json): finale versionierte Payload, verlorene Commitantwort/Reload/identischer Retry, genau ein Ergebnis, spätere Konditionen, unabhängige Abrechnung mit allen Vorzeichen/Null nach Reload.
- [Gezielter Browser Verwaltung/Details](browser-6/live-browser.json): Details-RPC mit echter verlorener Commitantwort/identischem absoluten Retry und Reload; bestätigtes Umbenennen, Fehler/Pending, Löschung mit echter verlorener Antwort, Abwesenheitsretry/Reload, Mobile/200-% und ungültige Links.

Browserdaten stammen aus echter lokaler Supabase. Ein Commit wird tatsächlich durch `route.fetch()` abgeschlossen und nur dessen HTTP-Antwort verworfen. Einzelne Verwaltungsfehler werden zusätzlich ausdrücklich durch synthetische HTTP-Fehler injiziert, nicht als echte Persistenzfehler ausgegeben. Seeds der kopierten alten Browserprüfungen auf erlaubte RPCs umgestellt. Keine neuen Produktoberflächen oder synthetischen Designmatrizen.

Ein zunächst übernommener **vollständiger Auth-/Verwaltungslauf** brach später beim zweiten Kontologin nach injiziertem Logoutfehler ab (Timeout, beim Reload wieder Anmeldeansicht); kein bestandener Auth-Gesamtnachweis. [Fehlversuch](browser-6/full-auth-attempt-live-browser.json), [Log](browser-6/full-auth-attempt-run.log). Seine zuvor erfolgreichen Schreibwegprüfungen ersetzen nicht den Gesamtlauf. Die finale gezielte Verwaltungsregression endet nach den für Slice 7 relevanten Schreib-/Reload-/Linkprüfungen. Unveränderte Passwort-/OTP-/Zwei-Tab-Authflüsse werden für Slice 7 nicht als neu vollständig bestanden gemeldet; historische Slice-6-Nachweise bleiben separat. Keine Authimplementierung verändert. Physische Geräte, Screenreader, Safari/Firefox und gehostete Abnahme nicht erneut durchgeführt.

## Reproduktion

Vom Repositoryroot, ausschließlich bekannter laufender lokaler Stack. Skripte verifizieren dessen API-Adresse und erzeugen ausschließlich eigene synthetische Konten. Keine Remote-URL einsetzen.

```sh
node docs/verification/slice-7/verify-live.mjs
node docs/verification/slice-7/verify-atomic.mjs
node docs/verification/slice-7/verify-reading.mjs
node docs/verification/slice-7/verify-duplicates.mjs
node docs/verification/slice-7/browser-2/verify-live-browser.mjs
node docs/verification/slice-7/browser-4/verify-live-browser.mjs
node docs/verification/slice-7/browser-5/verify-live-browser.mjs
node docs/verification/slice-7/browser-6/verify-live-browser.mjs
npm test -- --run
npm run lint
npx tsc --noEmit
node docs/verification/slice-6/build-isolated.mjs
```

Einmalige ursprüngliche Upgradefolge (nicht blind auf bereits migriertem Bestand wiederholen): `verify-upgrade.mjs before` auf Slice 6 → bekannte lokale Migrationen gezielt mit `docker exec -i supabase_db_Parity psql -v ON_ERROR_STOP=1 -U postgres -d postgres` anwenden → nur tatsächlich angewandte Versionen über `supabase migration repair ... --status applied --local` journalisieren → `verify-upgrade.mjs after`. Das nur temporäre Fixture unter `/private/tmp/parity-slice7-upgrade.json` enthält ausschließlich eigene synthetische Zugangsdaten, wird mit 0600 erzeugt und nach Bereinigung entfernt; gehört nie in Git. `verify-atomic.mjs` prüft den Übergang unabhängig auf dem finalen Stand erneut in einer rückgerollten Transaktion. Browser verwenden jeweils isolierte Quellkopien und beenden ihre eigenen Server.
