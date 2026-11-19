# Inventar vor Umsetzung · 19.11.2026

Ausgang: d49901e auf codex/slice-5-billing-periods, einschließlich aller Änderungen aus starting-status.txt. Neuer Branch im selben Arbeitsbaum; kein Stash/Reset/Commit. Git-Historie und Übergaben 1b, 2, 3, 4 einschließlich offene Zeiträume, 5 geprüft. Aktuelle Bilder before-*.png stammen aus isolierter Development-Vorschau mit synthetischen Fixtures.

| Bereich | Einordnung | Befund / Umfang |
| --- | --- | --- |
| Passwort-/Code-Anmeldung | vorhanden, Tests + historische synthetische Browserbelege | Beide Wege erhalten; Fokus nach Codeanforderung ergänzen. Späterer echter Mailtest deckt Magic-Link-only-Vorlage ohne sichtbaren OTP auf; deutsche Codevorlage ergänzen und tatsächlich zustellen. |
| Abmelden | konkrete Lücke | Kein Fehler/Pending; kein Schutz gegen alte Kontozustände. |
| Passwortänderung | vorhanden | Validierung, Pending, Fehler/Wiederholen vorhanden; explizites Schließen setzt Felder nicht zurück. Sitzungshinweis ergänzen. |
| Umbenennen Übersicht/Detail | konkrete Lücke | Nur nichtleer statt >=2 getrimmte Zeichen; Update ohne bestätigte Zeile als Erfolg; Fokus und Kontext ergänzen. |
| Entfernen | P1 | Menü löscht sofort; kein Bestätigungsdialog/Pending/unklare Antwort. |
| Zeitraumwahl | Regression | Auswahl nicht in URL; ungültige Auswahl fällt still auf neuesten Zeitraum zurück. |
| Rückweg | konkrete Lücke | „Zur Übersicht“ nutzt Browser-Back und kann extern führen. |
| Legacy /contract/[id] | konkrete Lücke | Synchrone params und ungeprüfte Gleichsetzung mit Meter-ID. Historische Vertrags-ID muss über RLS auf zugehörigen Zähler aufgelöst werden. |
| Fehlend / Netzwerk | konkrete Lücke | Meterabfrage ignoriert Fehler; Übersicht ebenfalls; kein gemeinsamer Recovery-Zustand. |
| Kontowechsel | P1 | Lokale React-Zustände können RSC-Refresh überleben; kontoabhängige Dialoge müssen verworfen und Serveransicht neu geladen werden. Gesicherte kontoabhängige Aufträge bleiben erhalten. |
| Bestehende Slices 1–5 | unverändert | Foundation, Verstehen, Erfassung, Einrichtung, Konditionen, Abrechnung/Fortführung bewahren; Regressionen prüfen. |
| Neue Authverfahren/Recovery/Export/Papierkorb | außerhalb Umfang | Keine Ergänzung. |

## Löschfolgen aus dem Schema

meters → contracts + readings CASCADE; contracts → rates + condition_revisions + billing_continuation_requests CASCADE. Ergebnis/Anbieter/Grenzen liegen in contracts. meter_setup_requests bleibt mit meter_id NULL und ursprünglicher Payload; condition_requests bleibt ohne Objekt-FK mit Payload. Alte Wiederholung der Einrichtung darf keinen neuen Zähler erzeugen. Keine Behauptung vollständiger technischer Datenlöschung.

contracts_backup/readings_backup/contract_prices_backup/contract_payments_backup sind historische unabhängige Migrationskopien ohne FK/RLS. Lokale reine Katalogabfrage bestätigt SELECT für anon/authenticated. Gezielter Rechteentzug/RLS als unmittelbare Kontoisolationskorrektur; keine Daten lesen/umschreiben/löschen. Aufbewahrungsentscheidung und Belegprüfung bleiben Slice 7.
