# Slice 1b · Visuelle Integration

16.11.2026 · Phase 1 vom Nutzer optisch bestätigt, Phase 2 ausdrücklich gestartet. **Implementiert und technisch/visuell geprüft. Unabhängiger Abschlussreview: alle drei Reviewbefunde im Nachreview behoben (scoped pass / ship). Reale Backend- und Geräteabnahme bleibt offen.** Kein Push, Merge oder Deployment.

## Gewählte Richtung und Umsetzung

**C + Orange, aufgehellte Beschriftung:** ruhiges Creme, hellere Oberflächen und Felder, weiße aktive Eingaben; Blaugrau für Schrift/Konturen, Orange ausschließlich für Hauptaktionen. Die Auswahl und historischen Vergleiche stehen unter [Exploration](../../../design-explorations/visual-integration/README.md).

Einzige produktive Tokenquelle bleibt `src/app/foundation.tokens.css`: Primitive → semantische Rollen → shadcn-Aliase. Die gewählten OKLCH-Werte liegen dort als benannte Primitive (Canvas/Surface/Field-Creme, Orange/Hover, Action-Ink). `controls.css` enthält gemeinsame Rezepte, keine zweite Palette. Buttons, Inputs, Inputgroups, Cards, Tabs, Selects, Popover, Menüs und normale Dialoge verwenden diese Rezepte. Nur Erfassungsgröße, Zahlendarstellung und Modal-/Sheet-Layout bleiben fachlich speziell.

Login, Header, Konto-/Passwortdialog, Übersicht, Zähleranlage, Detail-/Bearbeitungsansicht, Ablesungs- und Konditionstabellen, Zeitraumwahl, Folgezeitraum- und Schlussabrechnungsdialog wurden integriert. Dauerhafte Labels, deutsche Texte, angekündigte Fehler/Erfolge, erhaltene Eingaben und sichtbare Lade-/Disabled-Zustände. Beide bestehenden Supabase-Anmeldewege einschließlich Codebestätigung bleiben erhalten. Keine Recovery-/Resend-Funktion ergänzt.

Die Zählerkarte benennt den konkreten Grund für eine fehlende Prognose: Zeitraum fehlt, weniger als zwei Ablesungen im Zeitraum, fehlende Konditionen oder fehlender zeitlicher Abstand. Vorhandene Ablesungen bleiben sichtbar; Singular/Plural stimmt. Fehlender Abschlag ist kein `0,00 €`, ein ausdrücklich gespeicherter Nullabschlag bleibt Null. Bei fehlenden Konditionen wird keine aus Defaultnullen entstandene Kostenprognose angezeigt. Die Berechnungsfunktion und die Datenstrukturen wurden nicht geändert.

Erfolge/negative Ergebnisse haben zusätzlich verständlichen Text und vorhandene Icons. Diagrammfarben kommen aus der Foundation; Prognose und tatsächlicher Verbrauch unterscheiden sich auch durch Strichart. Diagrammwerte bleiben über die bestehende Monatstabelle erreichbar. Keine neue Prognoseansicht. Chartanimationen sind ausgeschaltet, um Zahleninhalte nicht zeitverzögert zu zeigen.

Unterstützt ist die freigegebene helle Palette. Es gab keine produktive Theme-Auswahl; die widersprüchlichen lokalen `dark:`-Rezepte wurden entfernt. Eine dunkle Systemeinstellung wurde geprüft und erhält dieselbe konsistente helle Palette. Keine ungeprüfte Dunkelpalette ergänzt.

## Ergebnis der Abnahme

| Kriterium | Ergebnis / konkrete Evidenz |
| --- | --- |
| Gemeinsame Gestaltung in Login/Übersicht/Bestandsansichten | 69 Integrationsaufnahmen mit tatsächlichen React-/Radix-Komponenten, synthetischen Fixtures und Browser-HTTP-Mocks. Desktop 1280×960 und Mobile 390×844. Siehe Screenshotindex unten. |
| Beide Loginwege | Passwort, Codeanforderung, Codeeingabe, Codefehler und Wechsel der E-Mail im Browser geprüft. Pending sperrt Eingabe/Wechsel; Fehler erhält Passwort. Komponentenprüfungen testen beide API-Verträge und erfolgreiche Router-Aktualisierung. **Keine reale Anmeldung nachgewiesen.** |
| Konto/Profil | Globales Menü mit synthetischer Session; Passwortbestätigung, lokaler Validierungsfehler, HTTP-Speicherfehler, Pending und Erfolg gerendert. Labels/Live-Regionen geprüft. Echte Passwortänderung nicht ausgeführt. |
| Zähleranlage | Strom/Gas, Umrechnungsfeld, Gasverteilungs-Popover, Speicherfehler und Pending. Fachlicher Create-Chain-Test besteht. Kein neuer Einrichtungsablauf; vorhandene mehrstufige Speicherung bleibt nicht atomar. Fehler weist auf mögliche Teilanlage hin. |
| Detail / Konditionen / Zeiträume / Schlussabrechnung | Desktop/Mobile: Details und Inline-Bearbeitung mit Fehler, Zeitraumauswahl, Folgezeitraum- und Schlussabrechnungsdialog inklusive Fehler, Ablesungstabelle, Konditionen für Strom/Gas inklusive Speicherfehler. Desktop: Pending für Konditionen, Folgezeitraum, Schlussabrechnung. Keine reale Datenmutation. |
| Prognose-Leerzustand | Zwei neue Regressionstests: vorhandene Ablesung wird anerkannt; fehlender Abschlag nicht als Null; Ablesungen außerhalb des gewählten Zeitraums zählen nicht; echte Null erhalten. Berechnungs-/Vertragstests unverändert bestanden. |
| Textvergrößerung | 320×568, 200 % Schrift plus 0,12em Zeichenabstand, 0,16em Wortabstand, 1,5 Zeilenhöhe: Login, Übersicht, Detail, Anlage, Profil, Folgezeitraum, Schlussabrechnung und Konditionen ohne Dokumentüberlauf; Aktionen durch Scrollen erreichbar und vollständige Aktionswörter durch DOM-Wortfragment- und Konturprüfung abgesichert (Kontoadressen dürfen getrennt umbrechen). Lokale Tabellen/Zahlen dürfen horizontal scrollen. |
| Fokus / Fehler / Zustände | Zeigerfokus aktiviert weiße Felder ohne Outline; Tastaturfokus hat sichtbare Outline. Gemeinsamer Modality-Listener ergänzt die native CSS-Fokusbehandlung. Erfassungsdialog behält seinen eigenen getesteten Modality-Zustand. Feldbezogene Erfassungsfehler und Formularmeldungen bleiben verknüpft bzw. angekündigt. |
| Kontraste | 25 tatsächlich verwendete Paare gemessen: Text/sekundärer Text/Fehler ≥4,5:1, Konturen/Fokus ≥3:1; Aktionsschrift auf Normal/Hover sowie Status-/Disabled-Flächen bestehen. Einzelwerte siehe browser-check.json; 8-Bit-Browser-Rasterung kann geringfügig variieren. |
| Reduced Motion | Globale Übergänge/Animationen deaktiviert. Erfassungsmatrix prüft funktionierenden Dialog ohne Einfahranimation; zusätzlich Übersicht mit Reduced Motion aufgenommen. |
| Slice-1-Regressionsmatrix | **Pass**, 10 Prüfeinträge und 17 Screenshots unter reading-regression/. Enthält echte CDP-Touches, Griffziehen/Änderungsschutz, horizontale Geste/Formularscrollen, Hintergrundschutz, Fehler/Wiederholen, Pending/Mehrfachübermittlung, Keyboard/Fokusrückgabe, lange deutsche Werte und Präzision, 200 % Text, kurzen VisualViewport, Reduced Motion und geladene Fontgewichte 400/600/700 mit gleichen Ziffernbreiten. |

Ein Durchlauf oder Screenshot belegt nur die benannten Zustände. Es wurde nicht jede Kombination aus Loginverfahren, Viewport, Fehlerart und Pending einzeln aufgenommen. Insbesondere Abmelden-Fehler und -Pending, mobile Pending-Varianten außerhalb der Erfassung, sämtliche denkbaren Backendfehler, 200%-Text bei allen Fehler/Pending-Kombinationen und ein echter Screenreader gelten nicht pauschal als bestanden.

## Checks

| Befehl / Nachweis | Ergebnis |
| --- | --- |
| `npm test -- --run` | 54 Tests in 11 Dateien bestanden. Bestehende React/Radix-act-/Suspense-Warnungen bei den Erfassungstests bleiben im [Log](tests.log) sichtbar. |
| `npm run lint` | 0 Fehler, zwei vorbestehende unused-import-Warnungen in Contract-Interaktions- und Calculation-Test. [Log](lint.log) |
| `npx tsc --noEmit` | Bestanden. [Log](types.log) |
| `npm run build` | Bestanden mit synthetischer URL/Publishable-Key, kein Backendnachweis. [Log](build.log) |
| Integrations-Browsermatrix | PASS, 10 Prüfgruppen, 69 Screenshots, keine Page Errors. [Protokoll](browser-check.json) |
| Slice-1-Browsermatrix | PASS. [Protokoll](reading-regression/browser-check.json) |
| Impeccable-Detektor | Einmal auf src/components und src/app, `[]`. [Ergebnis](impeccable-check.json) |
| `git diff --check` | Bestanden. |

Neue Tests behandeln Auth-API-Wege/Fehler/Pending, Prognose-Leerzustände und den Erhalt zusätzlicher Nachkommastellen beim Speichern von Konditionen. Die Konditionsform verwendet keine neue native Schrittweitenvalidierung; der bestehende parseFloat-Datenweg bleibt erhalten. Bestehende Anlagetests wurden ausschließlich auf die geänderten deutschen Labels angepasst. Änderungen an Fachlogik, Schema, Migrationen oder RLS sind nicht Teil dieses Slice. Die vorbestehenden Änderungen, insbesondere `supabase/config.toml` und Slice 1, wurden nicht zurückgesetzt. [Dateiliste relativ zum Arbeitsstand vor Phase 2](changed-files.json).

## Reproduktion

```sh
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=synthetic-preview-key \
PARITY_DESIGN_PREVIEW=1 \
npm run dev -- --webpack --hostname 127.0.0.1 --port 3000
```

Die zusätzliche Route `/design/integration?view=login|overview|detail|gas` ist nur in Development mit `PARITY_DESIGN_PREVIEW=1` erreichbar. Sie nutzt dieselben Komponenten, keine alternative Speicherimplementierung. Auth-/Speicherantworten werden ausschließlich durch die Prüfscripte abgefangen. Eine manuell geöffnete Vorschau simuliert keine Serverantworten.

```sh
node docs/verification/slice-1b/verify-integration.mjs
node docs/verification/slice-1b/verify-reading.mjs
```

Vorhandenes Playwright und Brave erforderlich; Pfade über `PLAYWRIGHT_MODULE`/`BROWSER_PATH`, App-URL über `PREVIEW_URL` austauschbar. Keine neue Projektabhängigkeit. Aufnahmen werden zunächst unter /private/tmp geschrieben und erst nach dem Browserlauf kopiert, um Reloads durch Dateischreiben zu vermeiden.

## Grenzen und weitere Abnahme

- Keine echte Supabase-Anmeldung, E-Mailzustellung, Passwortänderung, Persistenz nach echtem Browserreload oder Zwei-Konten-RLS-Gegenprobe. Lokale Infrastruktur-/Konfigurationsgrenzen aus Slice 1 bleiben offen. Kein Datenbankreset und keine echten Haushaltsdaten genutzt.
- Keine physischen iOS-/Android-Bildschirmtastaturen, Hardware-Safe-Areas oder Screenreader geprüft. Reduzierter Viewport simuliert nur die verfügbare Fläche.
- Browser prüft Chromium/Brave, keine separate Safari-/Firefox-Abnahme.
- Bestehende mehrstufige Zähleranlage ist nicht atomar. Der neue Fehlertext verschweigt mögliche Teilanlage nicht; Transaktion/Duplikatprävention gehört in den fachlichen Einrichtungsslice.
- Änderungen am Profil bleiben nach Erfolg als lesbare Bestätigung sichtbar; Schließen erfolgt explizit statt nach dem früheren kurzen Timer. Keine neue Kontofunktion.
- Die historischen A/B/C-Explorationen halten ihre lokalen Varianten explizit fest, damit die produktive Foundation-Umstellung die beschrifteten Vergleiche nicht verfälscht. Diese Overrides sind keine Tokenquelle der App.

## Screenshots

Vorher: [Login vor Integration](screenshots/login-before.png), [Slice-1-Übersicht](../slice-1/screenshots/desktop-overview.png), [Slice-1-Modal](../slice-1/screenshots/desktop-modal.png).

Nachher, automatisch aus dem erfolgreichen Lauf:

- [desktop-login-code](screenshots/desktop-login-code.png)
- [desktop-login-password](screenshots/desktop-login-password.png)
- [desktop-login-pending](screenshots/desktop-login-pending.png)
- [desktop-login-error](screenshots/desktop-login-error.png)
- [desktop-login-code-entry](screenshots/desktop-login-code-entry.png)
- [desktop-login-code-error](screenshots/desktop-login-code-error.png)
- [mobile-login](screenshots/mobile-login.png)
- [desktop-overview](screenshots/desktop-overview.png)
- [desktop-account-menu](screenshots/desktop-account-menu.png)
- [desktop-profile](screenshots/desktop-profile.png)
- [desktop-profile-error](screenshots/desktop-profile-error.png)
- [desktop-profile-pending](screenshots/desktop-profile-pending.png)
- [desktop-profile-save-error](screenshots/desktop-profile-save-error.png)
- [desktop-profile-success](screenshots/desktop-profile-success.png)
- [desktop-create-meter](screenshots/desktop-create-meter.png)
- [desktop-create-gas](screenshots/desktop-create-gas.png)
- [desktop-gas-distribution](screenshots/desktop-gas-distribution.png)
- [desktop-create-pending](screenshots/desktop-create-pending.png)
- [desktop-create-error](screenshots/desktop-create-error.png)
- [desktop-rename](screenshots/desktop-rename.png)
- [desktop-monthly-table](screenshots/desktop-monthly-table.png)
- [desktop-detail](screenshots/desktop-detail.png)
- [desktop-period-select](screenshots/desktop-period-select.png)
- [desktop-detail-edit](screenshots/desktop-detail-edit.png)
- [desktop-detail-error](screenshots/desktop-detail-error.png)
- [desktop-rollover](screenshots/desktop-rollover.png)
- [desktop-rollover-pending](screenshots/desktop-rollover-pending.png)
- [desktop-rollover-error](screenshots/desktop-rollover-error.png)
- [desktop-settlement](screenshots/desktop-settlement.png)
- [desktop-settlement-pending](screenshots/desktop-settlement-pending.png)
- [desktop-settlement-error](screenshots/desktop-settlement-error.png)
- [desktop-readings](screenshots/desktop-readings.png)
- [desktop-rates](screenshots/desktop-rates.png)
- [desktop-rates-pending](screenshots/desktop-rates-pending.png)
- [desktop-rates-error](screenshots/desktop-rates-error.png)
- [desktop-gas-rates](screenshots/desktop-gas-rates.png)
- [mobile-overview](screenshots/mobile-overview.png)
- [mobile-account-menu](screenshots/mobile-account-menu.png)
- [mobile-profile](screenshots/mobile-profile.png)
- [mobile-profile-error](screenshots/mobile-profile-error.png)
- [mobile-profile-save-error](screenshots/mobile-profile-save-error.png)
- [mobile-profile-success](screenshots/mobile-profile-success.png)
- [mobile-create-meter](screenshots/mobile-create-meter.png)
- [mobile-create-gas](screenshots/mobile-create-gas.png)
- [mobile-gas-distribution](screenshots/mobile-gas-distribution.png)
- [mobile-create-error](screenshots/mobile-create-error.png)
- [mobile-rename](screenshots/mobile-rename.png)
- [mobile-monthly-table](screenshots/mobile-monthly-table.png)
- [mobile-detail](screenshots/mobile-detail.png)
- [mobile-period-select](screenshots/mobile-period-select.png)
- [mobile-detail-edit](screenshots/mobile-detail-edit.png)
- [mobile-detail-error](screenshots/mobile-detail-error.png)
- [mobile-rollover](screenshots/mobile-rollover.png)
- [mobile-rollover-error](screenshots/mobile-rollover-error.png)
- [mobile-settlement](screenshots/mobile-settlement.png)
- [mobile-settlement-error](screenshots/mobile-settlement-error.png)
- [mobile-readings](screenshots/mobile-readings.png)
- [mobile-rates](screenshots/mobile-rates.png)
- [mobile-rates-error](screenshots/mobile-rates-error.png)
- [mobile-gas-rates](screenshots/mobile-gas-rates.png)
- [mobile-login-200percent](screenshots/mobile-login-200percent.png)
- [mobile-detail-200percent](screenshots/mobile-detail-200percent.png)
- [mobile-overview-200percent](screenshots/mobile-overview-200percent.png)
- [mobile-create-200percent](screenshots/mobile-create-200percent.png)
- [mobile-profile-200percent](screenshots/mobile-profile-200percent.png)
- [mobile-rollover-200percent](screenshots/mobile-rollover-200percent.png)
- [mobile-settlement-200percent](screenshots/mobile-settlement-200percent.png)
- [mobile-rates-200percent](screenshots/mobile-rates-200percent.png)
- [desktop-system-dark-reduced-motion](screenshots/desktop-system-dark-reduced-motion.png)

Erfassungsregression: [Übersicht](reading-regression/screenshots/desktop-overview.png), [Modal](reading-regression/screenshots/desktop-modal.png), [Sheet](reading-regression/screenshots/mobile-sheet-gas.png), [Änderungsschutz](reading-regression/screenshots/mobile-swipe-discard.png), [200 % Schrift](reading-regression/screenshots/mobile-200percent-text.png). Alle 17 Aufnahmen liegen unter reading-regression/screenshots/.

## Abschlussreview und korrigierte Befunde

[REVIEW.md](REVIEW.md) hält Erstbefunde und scoped Nachreviews fest: kompakte Insets, gestapelte Aktionen und lesbare vollständige Aktionswörter innerhalb der Konturen; keine unbeabsichtigte Hundertstel-Grenze in der Konditionsverwaltung; Wortfragment-/Konturprüfungen statt bloßer Dokumentbreite. Alle drei Befunde als behoben bewertet. Der abschließende Build und die anschließende Erfassungsregression wurden getrennt ausgeführt, nachdem ein gleichzeitiger Build einen vorherigen Dev-Browserlauf durch veraltete JS-Chunks gestört hatte. Frühere fehlgeschlagene Zwischenläufe sind kein Nachweis des Endstands; maßgeblich sind die finalen Pass-Protokolle und Aufnahmen.
