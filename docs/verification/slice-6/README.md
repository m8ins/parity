**Spätere Nutzerfreigabe umgesetzt:** Verbrauchskurve wieder als Hauptinhalt der Zählerkarte; 179 Tests und gezielte Browserregressionen bestanden. [Aktueller Kartenstand und Nachweise](card-chart/README.md). Die frühere Ergebnispriorisierung unten ist historisch.

# Slice 6 · Verwalten und vervollständigen

**Aktualisierung nach Designreview:** Die priorisierten Korrekturen sind umgesetzt und mit 174 Tests sowie erneutem echtem lokalem Browserweg geprüft. [Aktueller Nachweis und Vorher-/Nachher-Bilder](design-followup/README.md). Die folgenden 169-Test-/Bildnachweise dokumentieren den vorausgehenden technischen Slice-6-Abschluss.

19.11.2026. Branch `codex/slice-6-management`, direkt im bestehenden Arbeitsbaum von `codex/slice-5-billing-periods` angelegt. Ausgangscommit `d49901e` **plus vollständiger uncommittierter Stand** von Slices 4/5 und vorhandenen Skills/Übergaben. [Ausgangsstatus](starting-status.txt). Kein Worktree, Reset, Stash, Commit oder Verwerfen vorhandener Arbeit. Frühere Nutzerkorrekturen einschließlich reduzierter Verstehen-Ansicht, offenem Ende und Tinte-Auswahl bleiben maßgeblich.

## Inventar und Umfang

[Inventar vor Umsetzung](INVENTORY.md) trennt vorhandene Funktionen, konkrete Lücken und unbeauftragte Erweiterungen. Geprüft wurden Code, Tests, Git-Historie (einschließlich früherer Detail-/Kartenwege), Übergaben 1b/2/3/4/5 und die aktuelle gerenderte Anwendung. [Login vorher](before-login.png), [Übersicht vorher](before-overview.png), [Details vorher](before-detail.png) sind aktuelle synthetische Aufnahmen, keine alten Goldens.

Prioritäten: sofortige unbestätigte Löschung und alte Kontozustände; anschließend bestätigtes Umbenennen, eindeutige Links und Ladefehler; schließlich Abmelden/Pending, Sitzungshinweise und Codefokus. Kein allgemeiner Umbau.

Bewusst erhalten: beide Anmeldewege und bisheriges Konto-/Passwortkonzept; Anlage und Wiederaufnahme gesicherter Aufträge; Ablesung mit letzter Standvorbelegung; reduzierte Verstehen-Ansicht; Konditionen und Fassungsarchiv; Abrechnung/Fortführung samt Tinte-Auswahl. Keine neue Palette, Typografie, Prognose oder Abrechnungslogik. Keine Registrierungserweiterung, Recovery, Kontolöschung, Export, Papierkorb oder Wiederherstellung.

## Umgesetzt

[Slice-6-eigene Dateiliste](changed-files.txt) grenzt die Änderungen vom übernommenen Ausgangsstand ab.

**Umbenennen:** Übersicht und Detail verwenden denselben bestehenden Dialogtyp. Er benennt den konkreten Zähler und übernimmt dessen Namen. Bestehende Namensregel wie Einrichtung: mindestens zwei getrimmte Zeichen, keine neue Maximallänge. Fehler erhalten Eingaben, Pending sperrt Änderungen/Schließen/Mehrfachübermittlung. Eine RLS-gefilterte Null-Zeilen-Antwort gilt nicht als Erfolg: nur eine bestätigte Serverzeile wird übernommen. Übersicht/Details erhalten den bestätigten Namen, Serveransicht wird aktualisiert. Fokus kehrt zum Auslöser zurück. Die Guard-Bedingung überschreibt keine inzwischen bewusst fokussierte Folgeaktion.

**Entfernen:** Menü öffnet ausschließlich eine Folgenbestätigung. Abbrechen erhält beim Öffnen den Fokus; kein Formular-Submit und keine Standard-Enter-Löschung. Der Dialog benennt Zähler und alle fachlichen Kaskaden. Pending sperrt Bestätigung und Schließen. Vor jedem Versuch wird die aktuelle Sitzung unabhängig geprüft und mit dem Besitzer des angezeigten Zählers verglichen. Erfolg folgt erst auf einen erfolgreichen Abwesenheitsabruf nach DELETE. Bei Fehler/unklarer Antwort bleibt der Dialog mit „Löschung erneut prüfen“ erhalten. Dasselbe absolute Ziel kann ohne neue Entität/Requesttabelle wiederholt werden. Nach bestätigter Entfernung verschwindet die Karte, die Übersicht bleibt gültig und die Überschrift erhält Fokus. Auch der leere Zustand ist nutzbar. Nach Reload kommt die tatsächliche Abwesenheit aus Supabase. Kein Soft-Delete.

Ein Browserbefund wurde behoben: gleichzeitige modale Menü-/Dialog-Sperren konnten nach Abbrechen Pointer-Ereignisse blockieren. Das **Zählermenü** verwendet nun den bestehenden Radix-Modus `modal={false}`; der eigentliche Bestätigungsdialog behält Fokus- und Hintergrundschutz. Wiederholtes Öffnen/Abbrechen und schnelle Folgeaktionen werden ausdrücklich geprüft. Keine globale Änderung am Dropdown-Primitiv.

**Sitzung/Konto:** Ein kontogebundener Layout-Schutz entfernt alte React-Formulare und Ansichten bei Abmeldung/Kontowechsel und lädt die Serveransicht am bisherigen Link vollständig neu. Dadurch überleben weder alte lokale Entwürfe noch alte RSC-Kontodaten den Wechsel. Gesicherte, bereits kontoabhängige `sessionStorage`-Aufträge aus Slices 2–5 werden nicht gelöscht und bleiben beim selben Konto wiederaufnehmbar. Eine bei Server-Netzwerkfehler unbekannte Sitzung zeigt ausschließlich einen sicheren Wiederladezustand und keine geschützten Inhalte; sie löst keine Reload-Schleife aus. Der explizit aktivierte Development-Fixturebereich ist von diesem Identitätsabgleich ausgenommen, weil seine synthetischen Konten keine Serveranmeldung darstellen; Produktion kann diese Ausnahme nicht aktivieren.

Abmelden hat eigene Pending-/Fehlerzustände und Wiederholung; Erfolg wird nicht aus einer fehlgeschlagenen Antwort abgeleitet. Passwortfelder werden auch beim expliziten Schließen geleert. Abgelaufene/fehlende Sitzung bei Passwortänderung erhält eine verständliche Neuanmeldeaufforderung ohne falschen Erfolg. Codeanforderung fokussiert das Codefeld; bestehende Autofillattribute bleiben erhalten. An-/Abmeldung überlassen den vollständigen Seitenwechsel ausschließlich dem Kontoschutz; ein zusätzliches Router-Refresh hatte einen sofort geöffneten neuen Entwurf wieder entfernen können und entfällt. Anmeldung im direkten Link behält dessen Ziel.

**Navigation:** Zeitraumwahl schreibt die echte Zeitraum-ID in die URL. Reload und Browser-Zurück spiegeln die Auswahl. Ungültige, gelöschte oder fremde Zähler/Zeiträume erhalten dieselbe neutrale Nicht-verfügbar-Ansicht und einen gültigen Rückweg; kein stiller Fallback auf einen anderen Zeitraum, keine fremden Namen. „Zurück zur Übersicht“ ist ein Link auf `/`, unabhängig vom vorherigen Browserziel. Legacy `/contract/{id}` löst den unter RLS zugänglichen Zeitraum zuerst auf und leitet auf dessen tatsächliche Zähler-ID mit Zeitraumparameter weiter; IDs werden nicht gleichgesetzt.

Übersicht und Details geben Abruffehler an eine deutsche Fehleransicht weiter. Ladezustand, unbekannte Route und fehlendes Objekt sind getrennt. „Erneut laden“ setzt die Fehlergrenze zurück **und** fordert neue Serverdaten an; bloßes Zurücksetzen der Grenze hatte im echten Browser keinen neuen Abruf ausgelöst und wurde korrigiert. Fehlertexte enthalten keine technischen Serverdetails.

## Code-Mailvorlage

Der echte Mailtest fand eine weitere konkrete Ausgangslücke: Die lokale Standardmail enthielt nur einen Magic Link und keinen Code für das bestehende Eingabefeld. [sign-in-code.html](../../../supabase/templates/sign-in-code.html) verwendet nun `{{ .Token }}` in einer kurzen deutschen Mail. [config.toml](../../../supabase/config.toml) bindet sie für `auth.email.template.magic_link` ein. Das ist eine Vervollständigung des bisherigen Codewegs, kein neues Auth- oder Registrierungskonzept. Grundlage: [offizielle Supabase-Anleitung für lokale Vorlagen](https://supabase.com/docs/guides/local-development/customizing-email-templates).

Ein bereits laufender lokaler Stack übernimmt die Vorlage nicht durch einen erneuten bloßen `supabase start`. Die Konfiguration benötigt einen regulären lokalen Stop/Start über die bestehenden Datenvolumes; kein Reset. Der zunächst separat neu erstellte Auth-Dienst wurde aus seinem gesicherten ursprünglichen Containerstand wiederhergestellt, bevor der reguläre Neustart erfolgte. [Lokaler Konfigurationsnachweis](local-auth-template.json). Andere Installationen müssen ihre Code-Mailvorlage ausdrücklich übernehmen; die Repository-Konfiguration ändert **kein gehostetes Projekt**. Eine dortige Übernahme/Zustellungsabnahme bleibt offen und ist kein Deployment dieses Slice.

## Tatsächliche Löschfolgen und Rechtekorrektur

| Daten | Verhalten bei Zählerlöschung |
| --- | --- |
| Ablesungen | `meters → readings`, CASCADE |
| Zeiträume inkl. Anbieter/Grenzen/Abrechnungsergebnis | `meters → contracts`, CASCADE |
| Aktive Konditionen | `contracts → rates`, CASCADE |
| Frühere Konditionsfassungen | `contracts → condition_revisions`, CASCADE |
| Fortführungsbelege | `contracts → billing_continuation_requests`, CASCADE |
| Einrichtungsbelege | bleiben mit NULL-Zähler-ID und Payload; alter Auftrag darf keine Neuanlage erzeugen |
| Konditionsbelege | bleiben kontogebunden mit Payload; kein Objekt-FK |
| Historische `*_backup`-Migrationskopien | unabhängig, keine Kaskade; Inhalte unverändert, Clientzugriff jetzt entzogen |

Die letzte Zeile war ein unmittelbar bestätigter Kontoisolationsfehler: reine lokale Katalogabfrage zeigte anonyme/authentifizierte SELECT-Rechte auf vier Tabellen ohne RLS. Die additive Migration [20261119000001_protect_migration_backups.sql](../../../supabase/migrations/20261119000001_protect_migration_backups.sql) aktiviert RLS und entzieht PUBLIC/anon/authenticated sämtliche Rechte. Keine Zeilen gelesen, umgeschrieben oder gelöscht; frühere Migrationen unverändert. Die Migration wurde ausschließlich auf der bekannten lokalen Instanz geprüft/angewandt und journalisiert, [Log](local-migration.log). Kein DB-Reset, keine Produktivmigration. Seed unverändert: keine neuen Tabellen oder fachlichen Pflichtwerte.

Der Löschdialog verspricht deshalb keine vollständige Entfernung interner Belege/Migrationskopien. Aufbewahrung und gezielte Bereinigung bleiben eine ausdrückliche Produktentscheidung; kein heimliches Löschen historischer Daten.

## Prüfung und tatsächliche Ergebnisse

- [Tests](tests.log): 169 Tests / 25 Dateien bestanden, darunter Verhalten zu Namen/Fehler/Retry, Null-Zeilen-Antwort, Sitzung/Kontowechsel, Löschung/Pending/Fokus, Direktlinks und Abruffehlern. Bestehende React/Radix-`act`-Warnungen sichtbar. jsdom kann keinen Dokumentreload ausführen; diese beiden Meldungen aus dem Kontoschutztest sind kein echter Browsernachweis. Echte Neuladung separat im Browser geprüft.
- [Typecheck](typecheck.log) bestanden. [Lint](lint.log): keine Fehler, ausschließlich zwei vorbestehende Warnungen. [Produktionsbuild](build.log) via `npm run build` in isolierter temporärer Kopie bestanden; Projektserver und dessen `.next` unverändert. Turbopack akzeptiert keinen Abhängigkeitssymlink außerhalb seiner Projektwurzel; das reproduzierbare Buildscript verwendet deshalb eine lokale APFS-Dateikopie.
- [Echte lokale DB/API](live-integration.json): bestätigter Name nach frischem Lesen; Null-Zeilen-Update; Konto B kann A nicht lesen/ändern/löschen; erzwungene Löschablehnung ohne Teilverlust; tatsächliche Kaskaden inkl. Ergebnis/Fassungen/Fortführungsbeleg; erhaltene technische Belege und abgewiesene Wiederanlage; fremder Gaszähler bleibt erhalten. Vier Backuptabellen weisen anonymen und angemeldeten Zugriff ab (Abfragen mit Limit 0, keine historischen Inhalte gelesen). `passed` und `cleanup` sind true.
- [Serverfehler und Links im Browser](network-browser.json): Weiterleitungsproxy reicht echte lokale Supabase-Antworten durch; ausdrücklich injizierte Server-GET-Fehler testen Fehlerdarstellung und Wiederholung, keine behauptete Persistenz. Übersicht/Meter/Historie werden bei Fehler weder leer noch fehlend genannt; Retry lädt tatsächlich neu. Eigene Legacy-ID löst richtig auf; fremde Zähler-/Zeitraum-/Legacy-IDs und ungültiger Zeitraum geben keine fremden Namen preis. `passed` und `cleanup` true. Ergänzend tatsächlich gerendert: verzögerter Serverabruf mit Ladezustand sowie Auth-User-Abruffehler mit verborgenen geschützten Inhalten und erfolgreichem Retry.
- [Gemeinsame Regressionen](regressions.log): fünf vorhandene Matrizen mit separaten Kopien der Scripts/Berichte unter `regressions/`: Abrechnung/Fortführung 27 Aufnahmen, Konditionen 29, Verstehen 21, Einrichtung 19 und Erfassung 10 Prüfgruppen/17 Aufnahmen. Synthetische HTTP-Antworten, keine neue Persistenz-/RLS-Behauptung. Alle bestanden.

- [Echter Verwaltungs-/Auth-Browserlauf](live-browser.json): **7 Prüfgruppen, 16 Aufnahmen, keine Page Errors, `passed: true`, `cleanup: true`**. Tatsächliche Passwortanmeldung im direkten Zeitraumlink; Zeitraumwahl, Reload und Browser-Zurück; Namenfehler/Pending mit gesperrtem Escape und erhaltenen Eingaben, echter Retry und tatsächliche Persistenz in Übersicht/Details; Entfernen erst nach Bestätigung, Standard-Enter bricht ab, Fokus/erneutes Öffnen funktionieren. Eine echte DELETE-Commitantwort wird gezielt verworfen: kein falscher Erfolg, erneute Prüfung bestätigt Abwesenheit und führt zur nutzbaren leeren Übersicht mit Überschriftenfokus. Tatsächliche Passwortänderung wird durch Anmeldung mit neuem Passwort gegengeprüft. Abmeldefehler bleibt lesbar, echter Retry meldet ab. Zweites Konto und anderer Tab: ein ungespeicherter Entwurf verschwindet nach dortiger Abmeldung. Der nun tatsächlich lokal zugestellte Code fokussiert sein Feld; falscher Code wird abgewiesen, richtiger Code meldet an. Eigene Mail gezielt gelöscht. Desktop 1280 px, Mobile 390 px, 320 px/200 % plus Textabstände, lange Namen/Adressen und Reduced Motion in der geänderten Umbenennung. HTTP-Fehler-/Pending-Injektion ist von echter Speicherung unterschieden.

Fehlgeschlagene Zwischenläufe zählen nicht als bestandene Abnahme; eigene Testkonten wurden jeweils bereinigt. Die oben verlinkten Endberichte sind maßgeblich. DB und Serverfehler-/Direktlink-Prüfung wurden nach dem lokalen Konfigurationsneustart erneut bestanden. Der abschließende Typecheck/Lint und Produktionsbuild gehören zum letzten Quellstand.

## Bildauswahl und Renderreview

Aktuelle Bilder wurden tatsächlich angesehen; kein Ersetzen des Browsernachweises durch bloße DOM-Messung. Bei 200 % wächst der lange konkrete Zählername über mehrere Scrollabschnitte; Feld, Folgen und Aktionen bleiben innerhalb des Dialogs erreichbar. Ein natives Namensfeld scrollt lange Werte horizontal. Nicht jede Viewport-/Fehler-/Pending-Kombination wurde einzeln aufgenommen.

- [Umbenennen mit Fehler](screenshots/desktop-rename-error.png), [Pending](screenshots/desktop-rename-pending.png), [Mobil](screenshots/mobile-rename.png), [200 % · Feldausschnitt](screenshots/mobile-200percent-rename.png).
- [Entfernen mit Folgen](screenshots/desktop-delete-confirmation.png), [Fehler](screenshots/desktop-delete-error.png), [verlorene Antwort](screenshots/desktop-delete-lost-response.png), [bestätigter Rückweg](screenshots/desktop-delete-success.png).
- [Mobil entfernen](screenshots/mobile-delete.png), [200 % · Titel](screenshots/mobile-200percent-delete-top.png), [Folgen](screenshots/mobile-200percent-delete-consequences.png), [Aktionen](screenshots/mobile-200percent-delete-actions.png).
- [Passwort geändert](screenshots/desktop-password-success.png), [Abmeldefehler](screenshots/desktop-logout-error.png), [fehlende Sitzung](screenshots/desktop-session-required.png), [Reduced Motion](screenshots/desktop-reduced-motion-rename.png).
- [Nicht verfügbar](screenshots/desktop-unavailable-period.png), [Übersichts-Abruffehler](screenshots/desktop-overview-network-error.png), [Zähler-Abruffehler](screenshots/desktop-meter-network-error.png), [Sitzungs-Abruffehler](screenshots/desktop-session-network-error.png), [echter Ladezustand](screenshots/desktop-loading.png).


## Reproduktion

Aus Repositoryroot; bekannte lokale Supabase und vorhandenes Playwright/Brave vorausgesetzt:

```sh
npm test -- --run
npx tsc --noEmit
npm run lint
node docs/verification/slice-6/build-isolated.mjs
node docs/verification/slice-6/run-regressions.mjs
node docs/verification/slice-6/verify-live.mjs
node docs/verification/slice-6/verify-live-browser.mjs
node docs/verification/slice-6/verify-network.mjs
```

Die Migration nicht blind erneut anwenden; erst lokales Journal prüfen. Alle Live-Scripts erzwingen `127.0.0.1:54321`, erstellen eigene zufällige Testkonten und bereinigen diese. Der DB-Testtrigger reagiert ausschließlich auf die eigene zufällige Testzähler-ID und wird in `finally` entfernt. Browser nutzen isolierte Quellkopien/Ports 3008/3009; Proxy ausschließlich lokal auf 54329. Regressionen nutzen 3005. Aufnahmen entstehen temporär und werden nach Browserende kopiert. Eigene Mailpit-Testnachricht gezielt entfernen, kein gemeinsames Postfach leeren.

## Offene Abnahme / Slice 7

- Fachliche Nutzerabnahme, physische iOS-/Android-Geräte und Bildschirmtastaturen, Hardware-Safe-Areas, echter Screenreader, Safari und Firefox bleiben offen. Chromium/Brave und simulierte Viewports ersetzen diese Prüfungen nicht. 200 % Text plus zusätzliche Textabstände ist keine physische Browser-Zoom-/Geräteabnahme.
- Gehostete Übernahme der Code-Mailvorlage und echte externe E-Mailzustellung bleiben offen; die bestätigte Zustellung fand ausschließlich im lokalen Mailpit statt. Keine gehosteten Auth-Einstellungen verändert.
- Echte zeitgesteuerte JWT-Ablaufprüfung während jeder denkbaren laufenden Mutation steht aus; fehlende Sitzung, gemeldeter Sitzungsablauf, Kontowechsel und Abmeldung werden gezielt geprüft. Kein universeller Offline-/Refresh-Token-Nachweis.
- Slice 7 inventarisiert weiterhin alle Requestbelege, vollständigen Payloads, Schreibrechte, Snapshot-/Konditions-Constraints und spätes Replay. Insbesondere erhaltene `meter_setup_requests` mit NULL-ID und `condition_requests` ohne Objekt-FK sowie kaskadierende Fortführungsbelege berücksichtigen. Der aktuelle Slice führt keine neue Belegtabelle ein.
- Historische Backups sind jetzt clientseitig gesperrt, aber nicht bereinigt. Eigentümer-/Servicezugriff bleibt für administrative Zwecke; Aufbewahrung/Löschung ausdrücklich entscheiden. Keine Behauptung einer allgemeinen Kontolöschung oder vollständigen Datenlöschung.
- Allgemeine Legacy-Schreibrechte aus Slices 4/5 werden nicht pauschal entzogen. Der gezielte Backup-Rechteentzug ersetzt die übergreifende Prüfung nicht.
- Kein Push, Merge, Deployment, Datenbankreset oder Zugriff auf echte Haushaltszeilen. Keine weitere Funktion als stiller Ausbau.
