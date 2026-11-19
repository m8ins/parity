`GATE: OFF (no build active)` · Bestehendes Produkt überprüft, keine Buildfreigabe.

# Parity · kritischer Designreview

**Umsetzung auf Nutzerauftrag:** Die fünf priorisierten Empfehlungen und zugehörigen Zugänglichkeitskorrekturen sind umgesetzt. [Nachweis mit Vorher-/Nachher-Vergleich](../../verification/slice-6/design-followup/README.md). Die folgenden Befunde beschreiben den unveränderten Stand vor dieser Nachschärfung.

Software · Haushaltsanwendung für Strom-/Gasverbrauch; Hauptaufgabe „Stand erfassen“, Produktziel früh verständliche Nachzahlungsrisiken.

19.11.2026. Review des unveränderten Arbeitsstands auf `codex/slice-6-management` mit dem lokalen `design-taste-frontend` 2.5.1. Keine Anwendungsdateien, Tokens, Produktentscheidungen oder vorhandenen Übergaben geändert. Die Aussagen zur erwarteten Wirkung sind Designurteile, keine Ergebnisse einer Nutzerstudie.

## Urteil

Parity hat eine erkennbare eigene Sprache. Atkinson, Creme/Orange und die Druckknöpfe passen zum freundlichen Messgerät. Die größte Schwäche liegt in der Informationshierarchie: Ein alter kumulativer Zählerstand zieht den Blick stärker an als das erwartete finanzielle Ergebnis. Gleichzeitig sind die Erklärung des Ergebnisses und auf Mobilgeräten der eigentliche Prognoseteil zu schwer zu finden.

Die nächste Runde sollte Zugang und Gewichtung verbessern. Keine zusätzliche Standardinformation in „Verstehen“, keine neue Farbpalette und keine dekorativen Effekte.

## Priorisierte Befunde

### 1. Hoch · Mobil liegt die Prognose außerhalb des sichtbaren Diagramms

[Detailansicht bei 390 px](detail-390.png): Die Ansicht beginnt links bei Januar; am rechten Rand ist September angeschnitten. Der gestrichelte Zukunftsabschnitt und das Zeitraumende sind zunächst außerhalb des Ausschnitts. Code bestätigt: `.understand-chart-canvas` hat `min-width: 40rem` (640 px), während die sichtbare Fläche nur ungefähr 356 px breit ist. Die Grafik ist horizontal scrollbar und per Tastatur erreichbar; das beantwortet die Auffindbarkeitsfrage noch nicht.

**Empfehlung:** Die mobile Standardgrafik zeigt den gesamten ausgewählten Zeitraum einschließlich der Prognose. Weniger Achsenbeschriftungen und kompaktere Ränder vor breiterem Scrollbereich prüfen. Exakte Daten bleiben im Tooltip und der Monatstabelle. Eine breite Detailgrafik kann ergänzend bestehen. Keine Rechenlogik ändern.

Quelle: `src/app/globals.css:208`, `src/components/contract-chart.tsx:32`.

### 2. Hoch · Die Übersicht priorisiert Bestandszahlen vor der eigentlichen Antwort

[Übersicht Desktop](overview-1440.png), [Mobil](overview-390.png): „24.398,2 kWh“ ist die dominante Zahl. „Voraussichtlich 350,25 € Nachzahlung“ erscheint wesentlich kleiner und in neutraler Tinte unter der Trennlinie. Der erste Wert ist der kumulative Stand, keine Kostenbewertung und kein Periodenverbrauch. Für das Produktziel sollte das finanzielle Ergebnis schneller zu erfassen sein.

**Empfehlung:** Namen und Ergebnis höher gewichten; den letzten Stand weiterhin gut lesbar, aber nachrangiger zeigen. Die vorhandenen Outcome-Rollen gezielt an der Ergebniszeile verwenden, ohne eine weitere Informationskarte oder zusätzliche KPIs einzuführen. Die große Vorbelegung im eigentlichen Erfassungsdialog behalten.

Quelle: `src/app/globals.css:138`, `src/app/globals.css:214`, `src/components/PeriodUnderstanding.tsx:38`.

### 3. Hoch · Die Erklärung ist hinter einer kaum sichtbaren Verlinkung versteckt

Die Karte kommuniziert deutlich „Stand erfassen“. Zum Detail führt dagegen nur der kleine Zählername, der standardmäßig wie eine Beschriftung aussieht; die Unterstreichung erscheint erst bei Hover. Ergebnis und übrige Kartenfläche sind keine Detailverknüpfung. Auf einem Touchscreen fehlt das Hover-Signal vollständig. Dass ein Link technisch vorhanden und per Tastatur erreichbar ist, macht ihn noch nicht visuell verständlich.

**Empfehlung:** Den vorhandenen Ergebnisbereich als erkennbare sekundäre Verknüpfung nutzen oder die klickbare Kontextfläche am Zählernamen deutlicher gestalten. „Stand erfassen“ bleibt die Hauptaktion. Keine zusätzliche Text-/Buttonzeile erzwingen und keine verschachtelte klickbare Gesamtkarte um bestehende Knöpfe bauen.

Quelle: `src/components/contract-card.tsx:74` und [mobile Übersicht](overview-390.png).

### 4. Mittel · „Zähler hinzufügen“ bekommt zu viel Fläche

[1440 px](overview-1440.png): Die Hinzufügen-Fläche steht gleich groß neben den beiden tatsächlichen Zählern. [768 px](overview-768.png): Sie wächst zu einer breiten, weitgehend leeren Fläche unter der Zählerreihe. [390 px](overview-390.png): Nach zwei hohen Karten folgt ein weiterer großer Block für eine seltene Einrichtungshandlung.

**Empfehlung:** In einer gefüllten Übersicht ein kompakter, klar benannter sekundärer Button am Listenrand. Die größere Einrichtungsaufforderung bleibt für den [tatsächlich leeren Zustand](empty-390.png) sinnvoll. Die Zustände benötigen unterschiedliche Gewichtung.

Quelle: `src/app/controls.css:94` (`.add-meter`), `src/components/dashboard.tsx`.

### 5. Mittel · Lange Namen übernehmen den Löschdialog

[Vorhandener echter 200-%-Nachweis](../../verification/slice-6/screenshots/mobile-200percent-delete-top.png): Der vollständige lange Zählername steht in der großen Dialogüberschrift und läuft über mehrere Scrollabschnitte. Die Folgen und die sichere Abbruchaktion kommen erst später. Das ist innerhalb der Kontur bedienbar, aber für die Entscheidung unnötig aufwendig.

**Empfehlung:** Kurze Aufgabenüberschrift „Zähler entfernen“; der vollständige konkrete Name direkt darunter in normaler Textgröße. Eindeutige Zuordnung erhalten, Konsequenzen näher an die Entscheidung bringen. Den Schutz gegen versehentliche Löschung beibehalten. Auch der technische Zusatz zu Speicherbelegen/Migrationskopien sollte sprachlich geprüft werden; eine vollständige Datenlöschung darf weiterhin nicht behauptet werden.

Quelle: `src/components/DeleteMeterDialog.tsx:25`. Dieser Befund basiert auf dem vorhandenen Slice-6-Browsernachweis und aktuellem identischem Code; der Dialog wurde in diesem Review nicht erneut geöffnet.

## Zusätzliche technische Nachprüfbefunde

Der Consistency-Checker misst am mobilen Zählernamen ungefähr **99 × 21 px** Trefferfläche. Das stützt Befund 3: Gerade der zentrale Detailzugang sollte eine größere, erkennbare Trefferfläche erhalten.

Die Kartenüberschrift ist ein `h3` direkt nach der Seitenüberschrift `h1`; danach verwendet der Ergebnisblock ein `h2`. Die semantische Reihenfolge stimmt damit nicht mit der visuellen Inhaltsstruktur überein. Heading-Tags korrigieren, ohne automatisch Schriftgrößen zu ändern.

Der statische letzte Zählerstand ist ein zusätzlicher Tabstopp (`strong tabIndex=0`). Der Checker beanstandet dort 2,5:1 Fokuskontrast; die eigene Fokusregel deckt diesen Selektor tatsächlich nicht ab. Prüfen, ob der Stopp nur bei nötigem horizontalem Scrollen gebraucht wird; andernfalls entfernen oder den gemeinsamen deutlichen Fokusstil anwenden. Die Checkeraufnahme wurde angesehen. Dies ist keine vollständige Screenreaderabnahme.

## Weitere Punkte zur bewussten Entscheidung

Der mobile Detailkopf beansprucht viel Höhe: Rückweg, Name, Zeitraum, „Ende ändern“ und zwei Zeilen Tabs vor dem Ergebnis. Das Ergebnis und die Grafik sollten im nächsten Layoutvergleich früher beginnen. „Ende ändern“ wurde ausdrücklich freigegeben; ein Verschieben wäre eine neue bewusste Entscheidung und kein stiller Reviewfix.

Der Zählername in den Details öffnet beim Klicken eine Umbenennung, ohne sichtbare Bearbeitungskennzeichnung. Das erschwert das mentale Modell: In der Übersicht navigiert der Name, im Detail bearbeitet er. Ein expliziter Menü-/Bearbeitungsauslöser wäre verständlicher.

Der Einleitungssatz „Zähler finden, Stand erfassen und Ablesungen im Blick behalten“ beschreibt die Oberfläche, liefert einem wiederkehrenden Nutzer aber keine neue Information. In der gefüllten Übersicht würde ich ihn streichen. Im leeren Zustand darf die Einführung ausführlicher sein.

## Was ich behalten würde

- Atkinson und echte tabellarische Ziffern; keine zweite Schrift für vermeintlich technische Daten.
- Creme/Orange und semantische Statusfarben; keine neue Palette.
- Plastische Hauptaktionen und sichtbarer Tastaturfokus.
- Die reduzierte Detailansicht: Ergebnis, Grafik, weitere Grundlagen geschlossen.
- Geschützte Formulare mit dauerhaften Labels und klarer Speicherrückmeldung.

## Anwendung des Skills und Prüfgrenzen

Der Skill zielt überwiegend auf Unternehmens-/Produktmarketingseiten. Seine Kriterien für Klartext, tatsächliches Produkt, konsistente Komponenten, erkennbare Aktionen, Ränder und mobile Lesbarkeit sind hier hilfreich. Vorgeschriebene Hero-Bühnen, Bildschirmabschnitte, ausgeloste Paletten, Fotomengen, Produktlogos, Shader und inszenierte Animationen würden die bestehenden Produktentscheidungen einer Datenanwendung verdrängen. Sie wurden weder eingebaut noch als fehlende Produktfunktion gewertet. Die vorhandenen fachlichen Diagramme und Lucide-Symbole sind keine durch Fotos oder fremde Markenlogos zu ersetzenden Dekorationen.

Die Screenshot-Scripts des Skills wurden unverändert eingesetzt, jeweils mit genau einem eigenen Headless-Brave im Vordergrund. Acht neue Aufnahmen: Übersicht bei 1440/1024/768/390, Detail bei 1440/390, Login und leerer Zustand bei 390. Die Vorschau ist eine isolierte Quellkopie mit explizit synthetischen Daten. Vorschauhinweis, Entwicklungsindikator und Debugpanel wurden nicht vor dem Checker verborgen und gehören nicht zur Bewertung produktiver Inhalte.

[Consistency-Log](consistency.log), [Rohbericht](checker/report.json), [sämtliche offenen FAIL-Meldungen](checker-findings.md): **54 FAIL / 14 WARN** im Quicklauf. Diese Zahl ist keine Anzahl bestätigter Parity-Probleme. Der Lauf prüft keine Formulare, Hover-/Scroll-Walks oder Reduced Motion erneut; diese Einschränkungen stehen im Rohbericht.

Einordnung der Automatik:

- **App-relevant:** Überschriftenreihenfolge, zu kleine Detail-Linkfläche und Fokus auf dem numerischen Tabstopp; oben getrennt festgehalten. Die gemeldete dominante Zahlenhierarchie unterstützt eine Designfrage, beweist aber keinen allgemeinen Größenverstoß für Datenanwendungen.
- **Marketing-/Kit-Annahmen:** Hero-Höhe, bildschirmweise Abschnittshöhen, fehlendes Abschluss-CTA/Visual/Moment und `.wrap`-Raster. Nicht als Grund verwenden, die Haushaltsanwendung in eine Werbeseite umzubauen. Vorschauhinweis und Debugpanel sind ausdrücklich synthetische Entwicklungsoberflächen.
- **Fehlklassifikation:** `shader-lint` untersucht generierten Webpack-JavaScript-Code als GLSL. Die Anwendung verwendet hier keinen Shader. Der Vorwurf einer fehlenden Input-Group-Outline ignoriert die vorhandene Eltern-Outline unter `html[data-keyboard=true] .parity-input-group:focus-within` (`controls.css:49`). Der deutsch formulierte Button „Stand erfassen“ scheitert außerdem an einer englischen Verb-Liste; seine Formulierung ist fachlich passend.
- **Offene geringe Hinweise:** Ein Skip-Link wäre sinnvoll. Share-Metadaten sind keine Priorität für die private Kontenansicht und wurden nicht ergänzt. Die übrigen Rohmeldungen bleiben unverändert nachvollziehbar dokumentiert; kein automatisches PASS und kein Waiver.

[Layout-Log](layout.log): **Checkerfehler**, `r.sections is not iterable` nach fehlenden Kit-Layoutdaten; keine bestandene Layoutprüfung. Keine Kit-Datei geändert und kein Wiederholungslauf zum Kaschieren. Die acht Screenshotaufnahmen sind erfolgreich; ihre visuelle Bewertung ist davon getrennt. Performance wurde an der Development-Vorschau bewusst nicht als Produktionsbudget bewertet.

Ein aktiver Neubau wurde für einen reinen Review nicht angelegt. [Gate-Ergebnis](gate.log): `GATE: OFF (no build active)`. Keine Waiver und keine behauptete Buildfreigabe. Automatische Consistency-/Layout-Ergebnisse stehen separat; Marketing-/Kit-Annahmen werden von App-Befunden getrennt. Kein neuer Funktionstest, keine Produktions-Performanceabnahme und keine erneute physische Geräte-/Screenreader-/Safari-/Firefoxprüfung. Die bestehenden Slice-6-Nachweise werden dadurch weder ersetzt noch pauschal erweitert.

## Empfohlene nächste Runde

Zuerst einen begrenzten Vergleich von Zählerkarte und mobilem Detailkopf/Diagramm erstellen. Dieselben synthetischen Inhalte in der jetzigen und überarbeiteten Fassung zeigen. Ziel: erwartetes Ergebnis und Erklärung schneller finden, bestehenden Stand weiterhin sicher erfassen. Erst nach diesem Vergleich Konturen, Rundungen und weitere optische Feinheiten anfassen.
