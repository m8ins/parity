# Slice 2 · Zähler einrichten

Stand: 16.11.2026. Erweiterung des bestehenden Operate-Dialogs auf Basis von Slice 1b; keine neue Palette, Tokenquelle oder Prognoseansicht. Implementiert sind leerer Einstieg, unabhängige Strom-/Gasanlage, Zeitraum beliebiger Dauer, Anbieter, anfängliche Konditionen, Anfangsablesung und lesbarer Abschluss mit Übergang zur bestehenden Erfassung.

## Ablauf und fachliche Entscheidungen

1. **Zähler:** Name und Strom/Gas. Der Name bleibt wie bisher mindestens zwei Zeichen lang; keine neue maximale Namenslänge. Stromstände sind kWh, Gasstände m³.
2. **Zeitraum und Konditionen:** Anbieter und Ende optional; Beginn, Grundpreis, Arbeitspreis und Abschlag explizit eingeben. Null ist erlaubt und wird von einem leeren Feld unterschieden. Preise behalten die vorhandene Zahlengenauigkeit. Die Konditionen gelten ab Zeitraumstart. Das Ende ist entsprechend dem bestehenden Datenmodell die exklusive Grenze, also der Beginn der nächsten Periode; die UI erklärt dies mit einem konkreten Beispiel. Ende muss nach Beginn liegen; ein Jahr wird nicht erzwungen. Gas benötigt einen bewusst eingetragenen positiven Faktor aus Brennwert × Zustandszahl; kein geschätzter Faktor wird als tatsächlicher Vertragswert vorbelegt.
3. **Anfangsablesung und Prüfung:** Datum und nichtnegativer Stand, Zähler-/Zeitraum-/Konditionsübersicht vor dem Speichern. Die Ablesung muss zwischen Start und Endgrenze liegen und darf nicht in der Zukunft liegen. Die Endgrenze selbst ist als Abschlussstand zulässig. Deutsches Dezimalkomma und Tausenderpunkte werden eindeutig durch denselben Parser wie bei der bestehenden Ablesung verarbeitet. Ein Punkt wird nicht als geratenes Dezimalzeichen behandelt.
4. **Abschluss:** Bestätigung bleibt bis „Zur Übersicht“ sichtbar. Sie erklärt die nächste Erfassung und die Voraussetzung von mindestens zwei Ablesungen für die bestehende Prognose. Wenn der anschließende Listenabruf scheitert, bleibt eine konkrete Meldung mit „Übersicht neu laden“; eine weitere Einrichtung wird bis zum erfolgreichen Abruf nicht angeboten.

Name/Typ dienen der Zuordnung. Zeitraumstart verbindet die anfänglichen Konditionen mit dem Abrechnungszeitraum. Preise/Abschlag sind nötig für die bestehenden Kostenberechnungen; explizite Null ist möglich. Datum/Stand liefern die Basis für späteren Verbrauch. Anbieter und unbekanntes Ende bleiben optional, weil das vorhandene Modell sie nicht verlangt. Bestehende Saisonverteilung bleibt Strom gleichmäßig/Gas H0; die Berechnungslogik ist unverändert. Die Tagesgrenze für diese Einrichtung wird im Browser und in der RPC ausdrücklich in Europe/Berlin bestimmt.

## Atomarität und Wiederholung

Migration: [20261116000001_atomic_meter_setup.sql](../../../supabase/migrations/20261116000001_atomic_meter_setup.sql).

`setup_meter(p_request_id uuid, p_payload jsonb)` liefert die Meter-ID. Eine Transaktion erzeugt Meter, Contract, erste Rate und Reading. Kontozuordnung kommt ausschließlich aus `auth.uid()`, keine vom Client übergebene User-ID. Die additive Belegtabelle hat RLS ohne direkte Client-Policies und entzieht `anon`/`authenticated` den Zugriff. Bestehende Daten und RLS-Policies bleiben erhalten. Die bestehende Seed-Datei benötigt keine Änderung: Die neue Belegtabelle ist intern und additiv; vorhandene Fixtures bleiben gültig. Keine Seedänderung nötig: die interne Belegtabelle ist additiv und vorhandene Fixtures bleiben gültig. Keine Produktivmigration ausgeführt.

Ein Konto-/Request-Beleg und ein Transaktionslock serialisieren identische parallele Aufträge. Derselbe Schlüssel mit identischer Nutzlast liefert dieselbe ID; mit abweichender Nutzlast wird er abgewiesen. Beim Löschen eines Meters bleibt der Beleg mit leerer ID erhalten, sodass eine alte Wiederholung keinen Zähler neu erzeugt.

Vor dem ersten RPC schreibt der Browser Request-ID und vollständige Angaben in kontoabhängigen `sessionStorage`. Schlägt dies fehl, wird nichts gesendet und die Oberfläche nennt den nächsten Schritt. Bei unklarer Antwort bleiben Angaben geschützt; „Speicherung prüfen“ wiederholt denselben Auftrag. Das funktioniert auch nach einem tatsächlichen Reload und erneuten Öffnen. „Später prüfen“ verlässt den Dialog, behält diesen Auftrag aber in derselben Browsersitzung. Nach Erfolg wird der Sitzungsbeleg entfernt. Während des RPC sind Eingaben, Schließen und Mehrfachübermittlung gesperrt. Browser-Seitenverlassen erhält bei Änderungen einen nativen Schutz; Abbruch/Escape/Hintergrund im Dialog erfordern bei Änderungen eine explizite Verlassensbestätigung.

Grenze des Wiederholschutzes: Das Wiederaufnehmen über die Oberfläche gilt für dieselbe Browsersitzung und dasselbe Konto. Ein absichtlich neuer Browserkontext oder gelöschter Sitzungsspeicher enthält den Request-Schlüssel nicht mehr. Serverseitig bleiben verbrauchte Schlüssel geschützt; es gibt keine unsichere inhaltliche Deduplizierung verschiedener bewusst erstellter Zähler.

## Technische Prüfungen

- `npm test -- --run`: 65 Tests in 14 Dateien bestanden. Bestehende Radix-Erfassungstests melden weiterhin React-`act`-Warnungen; keine Testfehler oder unbehandelten Fehler. [Protokoll](tests.log).
- `npm run lint -- --fix`: keine Fehler, zwei vorbestehende ungenutzte Imports in fremden Tests. [Protokoll](lint.log).
- `npx tsc --noEmit`: bestanden. [Protokoll](typecheck.log).
- `npm run build`: bestanden mit synthetischer lokaler URL/Publishable-Key. Ein vorheriger Sandboxlauf scheiterte am Turbopack-Portbinding; der abschließende freigegebene Lauf bestand. [Protokoll](build.log).
- Impeccable-Detektor einmal auf den geänderten UI-Dateien ausgeführt: keine Befunde, [detector.json](detector.json). Vorbestehender Sidecar-Drift wurde nicht repariert.

Neue Verhaltenstests prüfen Schrittfokus/Validierung, Zurück ohne Datenverlust, explizite Null/Genauigkeit/kurzen Zeitraum, genau einen atomaren Aufruf, lesbaren Abschluss, Gasfaktor, Doppelsenden während Pending, unveränderte Wiederholung nach Remount, Kontoabgrenzung des Entwurfs, blockierten Sitzungsspeicher sowie die Wiederherstellung der Übersicht nach fehlgeschlagenem Listenabruf. Utilitytests decken unmögliche/zukünftige Daten, fehlende/negative/nichtendliche Werte und Strom-/Gasumrechnung ab.

## Echte lokale Integration (keine Datenantwort-Mocks)

Die bereits laufende lokale Supabase wurde ausdrücklich unter `127.0.0.1:54321`/DB `54322` geprüft. Kein Reset, keine fremden Datensätze gelöscht. Neue Migration mit `psql` gezielt angewandt, finalen Funktionsstand erneut angewandt und im lokalen Journal mit `supabase migration repair 20261116000001 --status applied --local` erfasst. Nur selbst erzeugte synthetische Konten/Daten wurden nach den Tests entfernt; Auth-Userzahl wieder auf Ausgangswert 1, kein Testtrigger verblieben.

[verify-live.mjs](verify-live.mjs) und [live-integration.json](live-integration.json): echte Auth, acht konkurrierende identische Aufrufe → genau ein Meter, geänderte Nutzlast abgewiesen, frischer Client findet denselben Auftrag, alle vier Datensätze inklusive Präzision/Anbieter/Zeitraum nach erneutem Lesen vorhanden. Zweites Konto kann fremde Meter/Contracts/Rates/Readings weder lesen noch eine fremde Ablesung anhängen. Gleicher Request-Schlüssel im zweiten Konto erzeugt unabhängig Gas. Direkter Belegzugriff und anonyme RPC-Ausführung sind abgewiesen.

[atomic-setup.sql](atomic-setup.sql) und [sql-tests.log](sql-tests.log): explizite Transaktion mit eigenen Fixture-Usern, Idempotenz, veränderte Nutzlast, ungültiges Ende/fehlender Stand/NaN. Ein nur für diesen Test angelegter Rate-Trigger erzwingt zusätzlich einen Fehler **nach** Meter- und Contract-Insert; danach existieren weder Teilanlage noch Beleg. Gesamtes Script endet mit ROLLBACK, einschließlich Trigger/Funktion/Fixtures.

[verify-live-browser.mjs](verify-live-browser.mjs) und [live-browser.json](live-browser.json): echte Passwortanmeldung auf `/`, leerer Account, Stromanlage. Playwright lässt die echte RPC antworten/committen (`route.fetch`) und verwirft danach nur die HTTP-Antwort (`route.abort`). Die UI behält die Angaben, tatsächlicher Reload und unveränderter Retry ergeben einen einzigen Zähler. Bestehender Erfassungsdialog speichert die zweite Ablesung; erneuter echter Reload behält beide. Anschließend echte Gasanlage mit sechs Monaten/Faktor 10,7123/m³ und zweiter Gasablesung; Reload zeigt beide Zähler unabhängig. Dieser Lauf wurde nach den finalen Dashboard-Fehler-/Pending-Änderungen wiederholt.

## Synthetische Browsermatrix und Bilder

[verify-setup.mjs](verify-setup.mjs) nutzt die bestehende nur in Development freigeschaltete Route `/design/integration?view=empty`, echte Komponenten und ausschließlich im Prüfschutz abgefangene HTTP-Antworten. [browser-check.json](browser-check.json): Desktop, mobile 390px, 320px plus 200 % Schrift, reduzierte Höhe und Reduced Motion; keine Browserfehler. Neben Dokumentbreite werden Kontroll-/Textbounds und sichtbare Wortfragmente gegen die Dialogkontur geprüft. Lange native Eingabewerte dürfen innerhalb des Eingabefeldes scrollen. Dynamische Fokus-/Viewportänderungen sind vor Aufnahmen beruhigt; lange Dialoge erhalten Top-/Bottom-Belege. Ein früherer ungültiger Compositorcapture wurde ersetzt und ist kein Nachweis.

Reproduzieren (vorhandenes Playwright/Brave, keine neue Projektabhängigkeit):

```sh
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=synthetic-preview-key \
PARITY_DESIGN_PREVIEW=1 npm run dev -- --webpack --hostname 127.0.0.1 --port 3000
node docs/verification/slice-2/verify-setup.mjs
npm test -- --run
npm run lint -- --fix
npx tsc --noEmit
npm run build
```

Echte lokale Prüfungen aus dem Repositoryroot (laufender, bekannter lokaler Stack erforderlich; kein Reset):

```sh
node docs/verification/slice-2/verify-live.mjs
node docs/verification/slice-2/verify-live-browser.mjs
docker exec -i supabase_db_Parity psql -v ON_ERROR_STOP=1 -U postgres -d postgres < docs/verification/slice-2/atomic-setup.sql
```

Die neue Migration wurde gezielt mit `docker exec -i supabase_db_Parity psql -v ON_ERROR_STOP=1 -U postgres -d postgres < supabase/migrations/20261116000001_atomic_meter_setup.sql` angewandt und anschließend im lokalen Journal erfasst. Nicht blind erneut auf eine bereits migrierte Datenbank anwenden. Ausgangsbranch `codex/frontend-redesign-slices-1-1b` und Commit `c1d8a0f` wurden geprüft; Arbeitsbranch ist `codex/slice-2-meter-setup`.

Build und Dev-Browser nicht gleichzeitig im selben `.next` ausführen. Die echte Browserprüfung verwendet dafür eine separate temporäre Quellkopie mit eigenem `.next`. Browserpfade sind über `PLAYWRIGHT_MODULE`/`BROWSER_PATH`, URL über `PREVIEW_URL` austauschbar. Echte Integrationsskripte verlangen ausdrücklich lokale Infrastruktur; siehe deren Kopfkommentare. Aufnahmen entstehen erst unter `/private/tmp` und werden nach Browserende kopiert.

Synthetisch:

- [Leerer Einstieg](screenshots/desktop-empty.png), [Name/Typ](screenshots/desktop-identity.png), [Validierung](screenshots/desktop-validation.png).
- [Zeitraum oben](screenshots/desktop-period-top.png), [Zeitraum unten](screenshots/desktop-period-bottom.png), [Prüfen](screenshots/desktop-review.png).
- [Pending](screenshots/desktop-pending.png), [Fehler und Wiederholen](screenshots/desktop-retry.png), [Erfolg](screenshots/desktop-success.png), [Übersicht-Ladefehler](screenshots/desktop-overview-reload-error.png).
- [Mobil Gas oben](screenshots/mobile-gas-period-top.png), [Mobil Gas unten](screenshots/mobile-gas-period-bottom.png), [Mobil Prüfen](screenshots/mobile-gas-review.png), [Abbruchschutz](screenshots/mobile-discard.png).
- [320px/200 % Zeitraum oben](screenshots/mobile-gas-200percent.png), [Aktionen unten](screenshots/mobile-gas-200percent-bottom.png), [320px/200 % Prüfung oben](screenshots/mobile-review-200percent.png), [Aktionen unten](screenshots/mobile-review-200percent-bottom.png), [Reduzierte Höhe](screenshots/mobile-reduced-height.png).

Echte lokale Abläufe: [Leeres Konto](screenshots/live-empty.png), [Verlorene Antwort](screenshots/live-lost-response.png), [Wiedergefundener Erfolg](screenshots/live-recovered-success.png), [Zweite Ablesung nach Reload](screenshots/live-reloaded-two-readings.png), [Strom und Gas nach Reload](screenshots/live-reloaded-electricity-and-gas.png).

## Grenzen und Review

Keine physische iOS-/Android-Bildschirmtastatur, Hardware-Safe-Area oder Screenreaderprüfung. Chromium/Brave geprüft; Safari/Firefox und reale Nutzerabnahme offen. Die hier bestandene lokale Auth-/Persistenz-/RLS-Prüfung ersetzt keine Produktionsinfrastrukturabnahme. Auth, Prognoselogik und Slices 3–6 wurden nicht weiterentwickelt. Kein Push, Merge oder Deployment.

Ein unabhängiger frischer Finishreview ergab zunächst zwei konkrete Korrekturen (Leerzustand bei Listenfehler und veralteter Dokumentationsstatus). Nachreview: beide **resolved**, disposition **ship**, begrenzt auf diese Korrekturen nach vorausgehender vollständiger Bildprüfung. [Review](REVIEW.md).

Gemeinsame Verbraucher: Keine UI-Primitiven, zentralen Tokens oder gemeinsamen Kontrollrezepte geändert; die zusätzlichen CSS-Selektoren sind auf Einrichtung/Leerzustand begrenzt. Echte Anmeldung, vorhandene Übersicht/Zählerkarten und bestehender Erfassungsdialog wurden im Live-Browserweg verwendet. Die unveränderten Bestands- und Berechnungstests bleiben grün; Detail-/Konditionsverwaltung wurden in diesem Slice nicht neu gestaltet.


## Nachkorrektur · Tastatur und Aktionsgewicht

Nach Nutzerfeedback: SelectTrigger hat einen expliziten Tabstopp (`tabIndex=0`, vom Aufrufer überschreibbar). Der gemeinsame Select nutzt zusätzlich denselben expliziten Tastaturmodus-Fokus wie Inputs. „Abbrechen“/„Später prüfen“ in der Einrichtung sind Ghost; „Zurück“ bleibt Outline. Neue Verhaltenstests sichern Name → Tab → Zählertyp und die unterschiedliche Aktionsgewichtung. Gesamtsuite 63/63, Typecheck und Lint ohne Fehler.

[verify-refinements.mjs](verify-refinements.mjs) / [refinements.json](refinements.json) prüfen im Chromium-Browser den echten Tab-/Shift-Tab-Weg, sichtbaren Fokus und Auswahl. Safari wurde vom Nutzer als betroffener Browser benannt. Ein echter Safari-WebDriver-Test war nicht verfügbar: Safari meldet, dass „Allow remote automation“ deaktiviert ist; keine Einstellungen verändert. Der Safari-Fall ist damit gezielt abgesichert, aber auf dem tatsächlichen Browser noch nicht bestätigt.

[Ghost-Abbruch](screenshots/setup-ghost-cancel.png), [Select-Vorschlag](screenshots/select-hover-proposal.png), [Dropdown-Vorschlag](screenshots/dropdown-hover-proposal.png). Die beiden Menüvorschläge sind ausschließlich im Browser injiziert: flache, durchgehende Zeilentönung ohne inneren Rahmen/Rundung, zusätzliche Unterstreichung für Tastaturfokus. Die produktiven Menüstile bleiben bis zur Auswahl unverändert. Die vorherige Abschlussreview gilt dem damaligen Slice-Stand; diese schmalen Korrekturen wurden separat getestet, ohne weiteren Impeccable-Lauf.


## Übernahme Menüvorschlag und verständliche Schließbestätigung

Der Nutzer bestätigt Tab-Navigation auch in Safari und gibt den Menüvorschlag frei. Die gemeinsame Menüregel verwendet jetzt die zentrale Rolle `--sys-color-menu-highlight`: durchgehende Zeilenfläche ohne inneren Rahmen oder Rundung. Tastaturfokus wird zusätzlich unterstrichen, Auswahlhaken und rote destruktive Aktionen bleiben erhalten. Gilt für Selects, Dropdowns sowie deren Checkbox-/Radio-/Untermenüeinträge. Die vorangehenden Vorschlagsaufnahmen dokumentieren die vorherige Entscheidungsphase; die Gestaltung ist jetzt produktiv übernommen.

Die Schließbestätigung unterscheidet ungespeicherte Angaben („Eingaben verwerfen?“; noch kein Zähler angelegt) und eine tatsächlich unbestätigte Speicherung („Später weiterprüfen?“; Angaben erhalten und konkreter Rückweg). Keine technische Sammelmeldung mit „gesendetem Auftrag“ mehr. Zwei neue Verhaltenstests prüfen diese Zustände mit echtem Einrichtungsformular.

65/65 Tests, Typecheck und Build bestanden; Lint ohne Fehler mit zwei bestehenden Warnungen. Aktualisierte 19-Aufnahmen-Einrichtungsmatrix bestanden. [verify-menu-confirmation.mjs](verify-menu-confirmation.mjs) / [menu-confirmation.json](menu-confirmation.json) prüfen zusätzlich die produktiven Menüflächen, Tastaturmarkierung und beide Schließbestätigungen ohne Style-Injektion. Bilder: [Ungespeichert](screenshots/confirmation-unsaved.png), [Unbestätigt](screenshots/confirmation-unconfirmed.png), [Select](screenshots/select-hover-flat.png), [Dropdown](screenshots/dropdown-hover-flat.png), [Destruktiv](screenshots/dropdown-destructive-hover-flat.png). Kein weiterer Impeccable-Lauf.
