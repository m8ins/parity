**Späterer Stand:** Die Nutzerfreigabe zur Verbrauchskurve als Hauptinhalt der Zählerkarte ersetzt die hier dokumentierte Ergebnispriorisierung. [Umsetzung und aktuelle Nachweise](../card-chart/README.md). Dieser Bericht und seine Aufnahmen bleiben als historischer Vergleich erhalten.

`GATE: OFF (no build active)` · Gezielte Nachschärfung der Bestands-App; kein Marketingseiten-Gate-PASS.

# Designreview · umgesetzte Empfehlungen

19.11.2026 · `codex/slice-6-management`. Ausgangspunkt: vollständiger bestehender Slice-6-Arbeitsstand einschließlich aller uncommittierten Arbeiten der vorherigen Slices. Keine vorhandene Arbeit verworfen, kein neuer Branch/Worktree, kein Commit/Push/Merge/Deployment. Grundlage ist der [kritische Review](../../../design-review/2026-11-19-taste/README.md); dessen Vorher-Aufnahmen bleiben erhalten.

Software · Haushaltsanwendung. Bestehende Atkinson-/Creme-/Orange-Sprache und plastische Hauptaktionen bleiben verbindlich. Keine neue Palette, kein neuer Bild-/Hero-/Shader-Baukasten. Deutsche konkrete Aufgabenlabels; keine zusätzlichen Behauptungen oder Standard-KPIs.

## Umgesetzt

| Empfehlung | Tatsächliche Umsetzung |
| --- | --- |
| Vollständige mobile Prognose | Chart nutzt die verfügbare Breite statt einer 640-px-Mindestfläche. Weniger, kurze deutsche Monatslabels und kleinerer rechter Rand; tatsächlicher letzter Datenpunkt gehört zur Tick-Auswahl. Gesamte Kurve einschließlich Zukunft und Zeitraumende bleibt sichtbar. Große Y-Achsenwerte ab einer Million werden kompakt als Mio./Mrd. beschriftet. Exakte Daten, Tooltip und Monatstabelle bleiben unverändert. |
| Ergebnis vor Bestandszahl | Zeitraum/Ergebnis stehen vor dem letzten Stand. Ergebnis nutzt die größere Abschnittsrolle und vorhandene rote/grüne Outcome-Farben; letzter Stand die kleinere Kontrollrolle. Zählername ist deutlicher. Keine zusätzliche Ergebnisfläche oder Kennzahl. |
| Sichtbarer Detailzugang | Name ist dauerhaft als Link erkennbar und mindestens 44 px hoch. Der Ergebnisbereich hat einen zweiten klaren Link mit Richtungspfeil und demselben tatsächlichen Zeitraumparameter. Kein unsichtbar klickbarer Gesamtkartencontainer um bestehende Knöpfe. |
| Kompakte Einrichtung | In gefüllter Übersicht ein sekundärer Button außerhalb der Zählerreihe; zwei Zähler verwenden zwei Spalten. Der leere Einstieg behält die große Einrichtungseinladung. Der allgemeine, wiederholende Einleitungssatz entfällt. Bestehender geschützter Einrichtungsdialog unverändert. |
| Kurzer Löschdialog | Titel „Zähler entfernen“, vollständiger konkreter Name darunter in normaler Textgröße. Name und Löschfolgen gehören zur zugänglichen Dialogbeschreibung. Bei scrollendem Inhalt beginnt Fokus oben an der Aufgabe; sonst auf Abbrechen. Damit springt eine lange Bestätigung beim Öffnen nicht ans untere Ende. Direkter Abbruch, Pending-Sperre und bestätigte Löschung bleiben erhalten. Interne Nachweise werden weiterhin nicht als vollständig gelöscht behauptet. |

Zusätzliche Reviewbefunde: Karten sind semantisch `h2`; ihr kompaktes Ergebnis ist ein Absatz, kein weiterer Abschnittstitel. Der für lange numerische Werte weiterhin nutzbare Tabstopp erhält den gemeinsamen deutlichen Fokus. Chart-Tastaturfokus wird am umgebenden Container sichtbar. Der Zählername im Detail ist eine normale Überschrift; ein expliziter Stift-Button öffnet Umbenennen.

„Ende ändern“ bleibt an seiner ausdrücklich bestätigten Position. Der Detailkopf wird nicht durch eine neue Navigation ersetzt. Skip-Link und Share-Metadaten bleiben separate geringe Hinweise aus dem Review; sie waren nicht Bestandteil der fünf priorisierten Korrekturen.

Keine Prognose-/Abrechnungslogik, API, Authentifizierung, RLS, Migration oder neue Abhängigkeit geändert. Das gesamte finanzielle Zahlenmaterial stammt weiter aus den bisherigen Berechnungen. Die Achsennotation kürzt ausschließlich Beschriftungen.

## Vorher und nachher

| Ansicht | Vorher | Nachher |
| --- | --- | --- |
| Übersicht Desktop | [1440 px](../../../design-review/2026-11-19-taste/overview-1440.png) | [1440 px](screenshots/overview-1440.png) |
| Übersicht Mobil | [390 px](../../../design-review/2026-11-19-taste/overview-390.png) | [390 px](screenshots/overview-390.png) |
| Verstehen Mobil | [390 px](../../../design-review/2026-11-19-taste/detail-390.png) | [390 px](screenshots/detail-390.png) |
| Lange Löschbestätigung | [früherer 200-%-Titel](../screenshots/mobile-200percent-delete-top.png) | [kurze Aufgabe mit Kontext](screenshots/mobile-200percent-delete-top.png) |

Weitere Nachweise: [1024 px](screenshots/overview-1024.png), [768 px](screenshots/overview-768.png), [320 px](screenshots/overview-320.png), [leerer Einstieg](screenshots/empty-390.png), [200 %](screenshots/overview-200percent.png), [große Zahlen/200 %](screenshots/narrow-large-200percent.png), [Dialogaktionen/200 %](screenshots/mobile-200percent-delete-actions.png), [Tastatur/Reduced Motion](screenshots/overview-reduced-motion-focus.png).

Die finalen Bilder wurden angesehen. Extrem lange Namen bei 320 px und 200 % plus zusätzlichen Textabständen bleiben mehrzeilig und erfordern Scrollen; auch eine kurze Dialogüberschrift kann dabei umbrechen. Der Fokus startet dann oben und bleibt sichtbar. Bei extremen Milliardenzahlen wird die Grafik schmaler; exakte Daten bleiben zusätzlich als Text/Monatstabelle zugänglich. Kein universelles Geräte-/Screenreaderurteil daraus ableiten.

## Tatsächliche Prüfungen

- **174 Tests / 26 Dateien bestanden**, [Log](tests.log). Fünf neue Verhaltenstests: Ergebnislink mit echter Zeitraum-ID und sinnvoller Reihenfolge, fehlender Zeitraum, vorhandene Einrichtung weiterhin öffnen, vollständiger Name in der zugänglichen Löschbeschreibung, explizites Umbenennen. Bestehende React/Radix-act-Warnungen und jsdom-Grenzen beim Dokumentreload bleiben im Log sichtbar.
- [Typecheck](typecheck.log) und [Lint](lint.log) bestanden; zwei vorbestehende Warnungen. [Isolierter Produktionsbuild](build.log) bestanden. Der Projektserver und dessen `.next` wurden nicht durch den Build verändert.
- [Gezielte Designmatrix](design-browser.json): **6 Prüfgruppen, 14 Aufnahmen, `passed: true`, keine Page Errors**. 1440/1024/768/390/320 px, tatsächliche Geometrie von Kurven und Zeitraumende, Chart ohne horizontales Scrollen, Ergebnis-/Namenslinks >=44 px, kleinere Bestandszahl, semantische Kartenüberschrift, kompakter Einrichtungszugang mit funktionierendem Dialog, leerer Einstieg, 200 % und Reduced Motion/Fokus. Synthetische Fixtures, keine Persistenzbehauptung.
- [Zusätzliche schmale Matrix](narrow-browser.json): **2 Aufnahmen**, große Zahlen und Gas bei 320 px/200 % plus Textabständen. SVG-Beschriftungen tatsächlich innerhalb der Grafik und untere Achsenlabels ohne Überlappung. Ein zunächst abgeschnittener Einheiten-/Achsentext wurde durch Platz und kompakte Notation behoben. Der alte X-Achsen-Selektor wurde im kopierten Test durch tatsächliche untere Tick-Geometrie ersetzt; bestehende historische Berichte bleiben unverändert.
- [Alle fünf bestehenden Browserregressionen](regressions.log) bestanden: Abrechnung/Fortführung 27 Aufnahmen, Konditionen 29, Verstehen 21, Einrichtung 19 und Ablesung 17 Aufnahmen/10 Prüfgruppen. Scripts und Berichte sind eigene Kopien unter `regressions/`. Die Prüfung enthält auch große Zahlen und vergrößerte Schrift. Keine neuen DB-/RLS-Behauptungen aus Mockantworten.
- [Echter lokaler Browserweg](live-browser.json): **7 Gruppen / 16 Aufnahmen, `passed: true`, `cleanup: true`, keine Page Errors**. Nun ausdrücklich Navigation aus dem Ergebnislink zum richtigen Zeitraum; tatsächliche Namensspeicherung und Reload; bestätigte Löschung, HTTP-Fehler, verlorene echte Commitantwort und Wiederholung, Rückweg und Fokus; Passwort-/Code-Anmeldung und Passwortänderung, Kontowechsel/Zwei-Tab-Abmeldung; großer Löschdialog mit initialem Überschriftenfokus und Scrollposition 0. Alle eigenen synthetischen Konten/Daten und die eigene lokale Mail wurden bereinigt. Kein Lesen/Ändern echter Haushaltszeilen.

Der erste Live-Wiederholungslauf endete **vor jeder Testkontoanlage** im lokalen CLI-Status-Timeout, [Log](live-browser-initial-status-timeout.log). Danach schloss der reine Statusabruf ab und die bekannte lokale Auth-API antwortete mit HTTP 200. Der erfolgreiche Wiederholungslauf verwendete diese frisch geprüfte lokale Konfiguration über `PARITY_LOCAL_CONFIG`; die URL wird weiterhin hart auf `127.0.0.1:54321` geprüft. Die Datei mit Schlüsseln bleibt ausschließlich privat unter `/private/tmp`, nicht im Repository. Kein erneuter Stack-Neustart, keine Migration und kein Datenbankreset für diese Designkorrekturen. Der Endbericht ist maßgeblich, nicht der fehlgeschlagene Zwischenlauf.

## Skill-Checker

[Unveränderter Consistency-Checker](skill-checker.log), [Rohbericht](skill-checker/report.json): Quicklauf bei 1440/390 px. **PASS** für Überschriftenreihenfolge, sichtbaren Fokus, Größenhierarchie, Kontrast und fehlenden Dokumentüberlauf. Der zuvor zu kleine Zählerlink wird nicht mehr beanstandet. „tap-size“ warnt noch am unveränderten kleinen Parity-Logo. Kein Waiver und keine Änderung an Kit-Dateien.

Insgesamt meldet der Checker **44 FAIL / 10 WARN**. Das ist kein abgenommenes Gesamt-Gate: Weiterhin unpassende Marketingregeln zu Hero, Bildschirmabschnitten, Abschluss-CTA, Anzahl von Abschnittsüberschriften und Kit-Raster sowie die bekannten Fehlklassifikationen von Webpack-JavaScript als Shader und der am Elterncontainer gezeichneten Input-Group-Outline. Der deutsch formulierte Button „Stand erfassen“ bleibt wegen einer englischen Verb-Liste ein WARN. Rohmeldungen bleiben erhalten. Keine Fotos, Hero-Animationen oder Shader zum Befriedigen dieser Regeln eingeführt.

[Gate](gate.log): `GATE: OFF (no build active)`. Diese gezielte Komponentennachschärfung der vorhandenen privaten App eröffnet keinen Marketingseiten-Neubau. Die fachlichen, visuellen und realen lokalen Prüfungen oben sind separat belegt; kein automatisches Gate-PASS behauptet. Kein Produktions-Performancebenchmark an der Development-Vorschau.

## Reproduktion und Grenzen

```sh
npm test -- --run
npx tsc --noEmit
npm run lint
node docs/verification/slice-6/build-isolated.mjs
node docs/verification/slice-6/design-followup/run-regressions.mjs
PREVIEW_URL=http://127.0.0.1:3010 node docs/verification/slice-6/design-followup/verify-design.mjs
PREVIEW_URL=http://127.0.0.1:3010 node docs/verification/slice-6/design-followup/verify-narrow.mjs
node docs/verification/slice-6/design-followup/verify-live-browser.mjs
```

Für die gezielten synthetischen Scripts ist eine explizit aktivierte Development-Vorschau mit `PARITY_DESIGN_PREVIEW=1` erforderlich; nur lokale synthetische URL/Keys verwenden. Der Live-Lauf verlangt dagegen die bekannte echte lokale Supabase; optional eine privat gespeicherte, frisch geprüfte Status-JSON über `PARITY_LOCAL_CONFIG` angeben. Vorhandenes Playwright/Brave wie in Slice 6, keine neue Projektabhängigkeit.

Nutzerreview und physische Geräte-, Bildschirmtastatur-, Screenreader-, Safari-/Firefox-Abnahme bleiben offen. Externe Mailzustellung/gehostete Vorlagenübernahme und die Slice-7-Themen bleiben wie in der Slice-6-Übergabe offen. Die UI-Korrektur erweitert keine Lösch-/Wiederherstellungs- oder Aufbewahrungspolitik.
