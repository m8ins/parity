---
name: Parity
description: Ein freundliches kleines Messgerät mit klaren Affordances und lesbaren Zahlen.
colors:
  canvas: "var(--sys-color-canvas)"
  surface: "var(--sys-color-surface)"
  field: "var(--sys-color-field)"
  field-active: "var(--sys-color-field-active)"
  text: "var(--sys-color-text)"
  text-secondary: "var(--sys-color-text-secondary)"
  action: "var(--sys-color-action)"
  action-text: "var(--sys-color-action-text)"
  action-hover: "var(--sys-color-action-hover)"
  error-surface: "var(--sys-color-error-surface)"
  success-surface: "var(--sys-color-success-surface)"
  overlay: "var(--sys-color-overlay)"
  chart-actual: "var(--sys-color-chart-actual)"
  chart-projected: "var(--sys-color-chart-projected)"
  chart-target: "var(--sys-color-chart-target)"
  border: "var(--sys-color-border)"
  divider: "var(--sys-color-divider)"
  focus: "var(--sys-color-focus)"
  error: "var(--sys-color-error)"
  success: "var(--sys-color-success)"
  disabled: "var(--sys-color-disabled)"
  disabled-text: "var(--sys-color-disabled-text)"
typography:
  body:
    fontFamily: "var(--ref-font-family)"
    fontSize: "var(--ref-font-size-300)"
    fontWeight: "var(--ref-font-weight-regular)"
    lineHeight: "var(--ref-leading-body)"
  title:
    fontFamily: "var(--ref-font-family)"
    fontSize: "var(--ref-font-size-500)"
    fontWeight: "var(--ref-font-weight-bold)"
    lineHeight: "var(--ref-leading-heading)"
rounded:
  control: "var(--sys-radius-control)"
  surface: "var(--sys-radius-surface)"
spacing:
  inline: "var(--sys-gap-inline)"
  label: "var(--sys-gap-label)"
  group: "var(--sys-gap-group)"
  field: "var(--sys-gap-field)"
  section: "var(--sys-gap-section)"
  region: "var(--sys-gap-region)"
  surface-inset: "var(--sys-inset-surface)"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.action-text}"
    rounded: "{rounded.control}"
    padding: "var(--sys-inset-control-block) var(--sys-inset-control-inline)"
  reading-input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "var(--sys-inset-control-block) var(--sys-inset-control-inline)"
---

<!-- Dokumentiert das implementierte Fundament und die visuelle Integration von Slice 1/1b (16.11.2026). Normative Tokenwerte ausschließlich in src/app/foundation.tokens.css; Frontmatter und Sidecar referenzieren diese Quelle. -->

# Design System: Parity

## Overview

**Creative North Star: „Das freundliche kleine Messgerät“**

Dieses Dokument hält die vereinbarte Richtung und das nach Slice 1b integrierte Frontend fest. Die freigegebene Farbrichtung ist C „Sanftes Creme + Signalorange“. Variante A bleibt Herkunft der Form- und Interaktionssprache: Atkinson, klare Konturen, Druckknöpfe und geschützte Erfassung im Modal/Sheet. Slice 2 erweitert die Einrichtung; Slice 3 ergänzt die zeitraumbezogene Verstehensansicht. Slices 4–6 sind nicht begonnen. Technische und synthetische visuelle Prüfungen sind bestanden. Für Slice 2 sind zusätzlich reale lokale Anmeldung, Persistenz und Zwei-Konten-RLS geprüft; die historischen Nachweise von Slice 1b bleiben separat. Physische Geräte-, Screenreader- und Cross-Browser-Abnahme bleiben offen.

Parity soll verständlich, haptisch und etwas verspielt wirken. Basecamps „Fisher Price“-Philosophie steht für deutlich erkennbare Bedienmöglichkeiten; PostHog ist die Referenz für leicht comichafte, herausragende Knöpfe. Teenage Engineering und das vom Nutzer beschriebene Handheld mit Kurbel inspirieren die freundliche Geräteanmutung.

**Key Characteristics:**
- Eindeutige Affordances und stringente Nutzerführung.
- Eine Absicht pro Seite, großzügige Schrift und ruhige Informationshierarchie.
- Plastische Bedienelemente mit klaren Kanten; ausdrücklich kein Neumorphismus.
- Charakter in Typografie und kleinen Animationen, mit Vorrang für Lesbarkeit und Bedienbarkeit.

Produktmodell und Umsetzungsslices: `PRODUCT.md` und `docs/frontend-redesign-plan.md`.

## Colors

Farben werden als semantische OKLCH-Tokens organisiert. Komponenten verwenden Rollen statt individueller Farbwerte. Palettenwechsel müssen Text, Flächen, Konturen, Aktionen, Fokus, Status und Diagramme konsistent umfassen.

Der ursprüngliche Ausgangspunkt „Dad's old wallet“ (Blaugrau und Creme) bleibt Herkunft der neutralen Farbwelt. Für Slice 1b wurde C „Sanftes Creme + Signalorange“ bestätigt: sanfte Creme für Canvas, Oberfläche und ruhende Felder; Blaugrau für Text und Konturen; Signalorange für primäre Aktionen. Die dunklere Aktionsschrift hat eine eigene Rolle. Weiß kennzeichnet aktive Felder, Rot Fehler; Erfolg wird ausdrücklich benannt.

Normativ sind ausschließlich `src/app/foundation.tokens.css` und seine semantischen Rollen: `--sys-color-canvas`, `--sys-color-surface`, `--sys-color-field`, `--sys-color-field-active`, `--sys-color-text`, `--sys-color-action`, `--sys-color-action-text` und `--sys-color-action-hover`. Statusflächen, Overlay und Diagrammrollen liegen ebenfalls dort; Diagramme unterscheiden tatsächliche und prognostizierte Werte zusätzlich durch Strichart. Mischungen nicht lokal neu definieren. Die tatsächlich verwendeten Kontrastpaare sind in `docs/verification/slice-1b/browser-check.json` gemessen; OKLCH allein garantiert keinen Kontrast.

Unterstützt wird ausschließlich die freigegebene helle Palette, auch bei dunkler Systemeinstellung. Es gab keine produktive Theme-Auswahl; widersprüchliche lokale Dunkelrezepte wurden entfernt. Das interne Design-/Debugpanel ist nur in Entwicklung verfügbar und verändert keine Supabase-Daten. Historische A/B/C-Explorationen behalten lokale Vergleichswerte, sind aber keine Tokenquelle der Anwendung. Zusätzliche Paletten bedürfen vollständiger Rollen und Kontrastprüfung.

## Typography

Placeholder sind Beispiele, keine eingetragenen Werte: eigene hellere Rolle `--sys-color-placeholder` und Regular-Gewicht verwenden. Eingegebene Werte behalten ihre dunkle Textfarbe und ihr vorgesehenes Gewicht. Die Regel gilt gemeinsam für Inputs, Inputgruppen und Textareas; Labels bleiben dauerhaft sichtbar. Placeholder-Kontrast auf ruhenden und aktiven Feldflächen prüfen.

Verbindlich ist lokal eingebundenes Atkinson Hyperlegible Next mit den Rollen Regular, Semibold und Bold (`--ref-font-weight-*`) und echten tabellarischen Ziffern. Die hybride rem-Skala ist in `foundation.tokens.css` definiert: stabile Rollen für Text (`--sys-font-body`), Hinweise (`--sys-font-support`), Metadaten (`--sys-font-meta`), Labels (`--sys-font-label`), Bedienelemente (`--sys-font-control`), Abschnitte (`--sys-font-section`) und Dialogtitel (`--sys-font-title`). Messwerte (`--sys-font-reading`) wechseln nur zwischen expliziten Größenstufen gemäß den Media Queries der Quelle. Nur Seitentitel (`--sys-font-page-title`) und äußere Seitenränder (`--sys-inset-page`) sind begrenzt fluid. Dialogtexte wachsen nicht mit dem Desktop-Viewport; Browser-Schriftvergrößerung bleibt wirksam. HTML-Überschriftenebene und visuelle Typorolle sind unabhängig.

**Zahlenregel:** Die ausgewählte Schrift muss echte tabellarische Ziffern unterstützen. Für Zählerstände, Geldbeträge, Preise, Kennzahlen, numerische Tabellen und vergleichbare Zahlenreihen `font-variant-numeric: lining-nums tabular-nums` einsetzen; Unterstützung im tatsächlich geladenen Font und den verwendeten Schnitten prüfen. Eine Monospace-Schrift ist dafür nicht erforderlich.

- Ziffern sollen beim Wertewechsel nicht seitlich springen. Tabellarische Ziffern allein stabilisieren keine wechselnde Stellenzahl; Layout bei Bedarf entsprechend auslegen.
- Numerische Tabellenspalten rechtsbündig, mit konsistenter Präzision innerhalb derselben Größe. Unterschiedliche Größen wie Euro, ct/kWh und Zählerstände nicht pauschal auf dieselbe Nachkommastellenzahl runden.
- Dezimalkomma, Tausendertrennung, Minuszeichen, Eurozeichen, kWh und m³ sowie deutsche Umlaute prüfen. Werte und zugehörige Einheiten nicht unverständlich umbrechen lassen.
- Gut unterscheidbare Zeichen wie 0/O und 1/l/I bevorzugen. Keine dekorativen Ziffernformen zulasten schneller Erfassung.
- Lesbarkeit im Fließtext erhalten; tabellarische Ziffern gezielt auf Daten anwenden.
- Keine animierten Zählwerke für eingegebene oder finanzielle Werte. Kleine Rückmeldungen können den Zahlenbereich begleiten, ohne das Ablesen zu verzögern.

## Layout

Der Erfassungsdialog benennt den gewählten Zähler im Titel: „Zählerstand für {Name}“. Keine zusätzliche Kontextzeile mit wiederholtem Zählertyp und Einheit; Einheiten bleiben am Eingabefeld sichtbar.

Eine Absicht pro Seite. Eine klare Hauptaktion, erkennbarer Kontext und ein verlässlicher Zurückweg. Zusammengehörige Angaben dürfen auf derselben Seite stehen; das Prinzip bedeutet nicht ein Feld pro Seite.

Mobile Erfassung am Zähler ist ein Kernfall. Großzügige Bedienelemente, sichtbare Labels und überschaubare Informationsdichte gelten auch auf kleinen Bildschirmen. Ergänzende Historie und Berechnungsdetails müssen erreichbar sein, ohne die aktuelle Aufgabe zu überladen.

Slice 1: Zählerübersicht → „Stand erfassen“ → kompaktes Desktop-Modal / mobiles Bottom Sheet (unter 640 px), gemeinsames Formular und Datenweg. Abstände beruhen auf 4-px-Primitiven und semantischen Rollen. Zähler werden unabhängig bedient; keine gekoppelte Strom-und-Gas-Runde.

Unter 360 CSS-px verwendet der Erfassungsdialog die kompakte feste Abstandsstufe `--sys-gap-group` als Seiteninset und Aktionen `--sys-gap-inline` horizontal. Das erhält vollständige Aktionswörter auch bei 200 Prozent Schrift plus Textabständen; Schriftrollen bleiben unverändert.

## Elevation & Depth

Tiefe dient der Erkennbarkeit von Bedienmöglichkeiten. Knöpfe dürfen sichtbar herausragen: klare Kontur, abgesetzte Unterkante beziehungsweise gerichteter Schatten. Beim Drücken kann die Taste diese Tiefe reduzieren, ohne umliegendes Layout zu verschieben.

Inhaltsflächen bleiben flach; Popovers verwenden die gezielte Schattenrolle `--sys-shadow-popover`. Kein Neumorphismus: keine durch weiche Licht-/Schattenpaare in die Grundfläche verschmolzenen Bedienelemente. Aus Variante A erhalten: 4 px Drucktiefe, 70 ms drücken, 110 ms lösen, `cubic-bezier(.16,1,.3,1)`; Reduced Motion schaltet Übergänge und Einfahranimation aus.

Bewegung ist kurz und zweckmäßig: Druckreaktion, Zustandswechsel, Speicherbestätigung. Keine Verzögerung der Aufgabe. `prefers-reduced-motion` berücksichtigen und Erfolg auch ohne Animation vermitteln.

## Shapes

Klare Silhouetten und etwas comichafte, plastische Knöpfe. Ecken dürfen freundlich wirken; 10 px Feld-/Knopfradius, 24 px Oberflächenradius, 2 px Kontur und 3 px Fehler-/Fokusoutline stammen aus dem bestätigten Fundament. Nicht jede Inhaltsfläche erhält automatisch die Tiefe eines drückbaren Elements.

## Components

**Implementierte Grundlage:** Bestehende lokale shadcn-Komponenten unter `src/components/ui/` auf Basis von Radix Primitives werden weiterverwendet und über gemeinsame Rezepte in `src/app/controls.css` für Slice 1b vereinheitlicht. Radix trägt komplexes Interaktionsverhalten wie Fokusmanagement, Tastaturbedienung und Dialogzustände; Parity definiert Erscheinungsbild und fachliche Komposition.

Einfache Buttons und Eingaben bleiben semantische native HTML-Elemente in gemeinsamen React-Komponenten. Kein pauschaler Eigenbau komplexer Interaktionsprimitive und kein zusätzlicher vorgefertigter Theme-Layer nötig. Der Erfassungsdialog verwendet diese gemeinsamen Button-/Input-Komponenten und Radix Dialog; das mobile Sheet ist dieselbe Dialoginstanz mit demselben Formular und Datenweg, keine parallele Implementierung.

Radix ersetzt keine Prüfung von Labels, Kontrast, Fokusdarstellung, Fehlerverknüpfung und vollständigen Nutzerwegen. Sichtbare Zustände einschließlich Hover, Fokus, gedrückt, deaktiviert, Laden und Fehler müssen bei jeder betroffenen Oberfläche geprüft werden. Gemeinsame Varianten für Buttons, Inputs, Selects, Tabs, Cards, Popovers und Dialoge liegen in `controls.css`; `globals.css` importiert sie und enthält die spezifische Erfassungs-/Seitenkomposition. Login, Header, Profil, Übersicht, Anlage, Details, Konditionen, Zeiträume und Schlussabrechnung verwenden diese Grundlage.

### Verbindliche Grundlage und Dialogverhalten

**The Single Source Rule.** Einzige gepflegte Tokenquelle: `src/app/foundation.tokens.css`, übernommen aus der Exploration. Primitive `--ref-*` → semantische `--sys-*` → Komponenten. Die Explorationsdatei importiert diese Quelle; Tailwind/shadcn-Aliase referenzieren dieselben Rollen. Keine unabhängig gepflegte zweite Palette oder Schriftgrößenskala. Frontmatter und `.impeccable/design.json` enthalten CSS-Referenzen und Quellenmetadaten; sie brauchen die geladene Foundation und sind kein eigenständiger Tokenexport. Keine synthetischen Tonwertrampen ergänzen.

Klick/Tippen aktiviert weiße Felder ohne Ring; Tab/Shift+Tab ergänzt eine sichtbare Outline. Der globale `InteractionMode` verfolgt die Eingabemodalität; der Erfassungsdialog behält seinen eigenen geprüften Zustand. Fehler behalten rote Konturen und zugeordnete Texte. Numerische Eingaben akzeptieren deutsche Tausenderpunkte/Dezimalkomma; die bestehende Zahlengenauigkeit bleibt erhalten (keine pauschale Reduktion auf Vorschau-Nachkommastellen).

Das mobile Sheet hat einen sichtbaren, mindestens 44 px hohen Gestengriff und „Abbrechen“. Nur der Griff verarbeitet vertikales Ziehen. Hintergrundklick schließt nicht. Escape, Abbrechen und Wischen fragen bei Änderungen vor dem Verwerfen nach. Radix hält Fokus im Dialog und gibt ihn an den Auslöser zurück. Scrollbereich, dynamische Viewporthöhe und Safe Areas halten Inhalte erreichbar. Während Speicherung sind Eingaben, Schließen und Mehrfachübermittlung gesperrt. Fehler erhalten Eingaben und erlauben Wiederholen; Erfolg schließt und wird am Zähler zugänglich bestätigt.

### Gemeinsame Varianten und Rückmeldungen

Primäre Buttons verwenden Orange, Kontur und gerichtete Drucktiefe; Outline-, Secondary-, Ghost- und Link-Aktionen bleiben ruhig. Destruktive Aktionen erhalten Fehlerfarbe und Fehlerfläche. Disabled/Pending sperrt die zugehörige Aktion sichtbar, ohne die Lesbarkeit durch pauschale Deckkraft zu senken. Felder haben sichtbare Labels; Fehler bleiben mit Eingaben verbunden oder als verständliche Formularmeldung angekündigt. Inputs und Selects nutzen Mindesthöhen statt fester Höhen. Tabs und Formularaktionen dürfen auf kleinen Breiten umbrechen; Tabellen und lange Zahlen können lokal horizontal scrollen.

Deutsche Labels, Fehler-, Pending- und Erfolgsrückmeldungen gehören zur gemeinsamen Grundlage. Profil-Erfolg bleibt lesbar bis zum expliziten Schließen, statt nach einem kurzen Timer zu verschwinden. Prognose-Leerzustände nennen konkrete fehlende Voraussetzungen; vorhandene Ablesungen gelten nicht als fehlende Daten. Ein fehlender Abschlag wird nicht als Null dargestellt; eine ausdrücklich gespeicherte Null bleibt erhalten. Berechnungsfunktion, Schema und RLS wurden dafür nicht verändert.

Das Designpanel ist ausschließlich in Entwicklung verfügbar, wählt die freigegebene Palette und setzt zurück; keine Datenzugriffe. Das Vergleichslabor und die dekorative Geräteumrahmung werden nicht übernommen.

Nachweise und Grenzen: `docs/verification/slice-1b/README.md`, `browser-check.json`, `reading-regression/browser-check.json` und `REVIEW.md` im selben Verzeichnis (abschließendes Nachreview: pass/ship für alle drei korrigierten Befunde). 69 Integrationsaufnahmen in zehn Prüfgruppen, 25 gemessene Kontrastpaare sowie zehn Erfassungsprüfungen mit 17 Aufnahmen sind synthetische Browsernachweise. 54 Tests in elf Dateien, TypeScript und Produktionsbuild bestanden; Lint: keine Fehler, zwei vorbestehende Warnungen. Keine reale Supabase-Anmeldung/Persistenz/RLS-Gegenprobe, physische Bildschirmtastatur, Hardware-Safe-Area oder Screenreaderabnahme daraus ableiten.

## Do's and Don'ts

Do:
- Bedienbarkeit durch Form, Kontrast und konsistente Zustände sichtbar machen.
- Zahlenformen, Ausrichtung, Genauigkeit und Einheiten als zentrale Typografieanforderung behandeln.
- Freundlichkeit in präzisen Details zeigen und die aktuelle Aufgabe priorisieren.
- Austauschbare Paletten über gemeinsame semantische Rollen definieren.

Don't:
- Neumorphismus einsetzen.
- Zähler in einen erzwungenen gemeinsamen Ablauf koppeln.
- Lesbarkeit für dekorative Schrift oder Animation opfern.
- Status ausschließlich durch Farbe oder Bewegung ausdrücken.
- Offene Schrift-, Token- oder Layoutentscheidungen als bereits freigegeben ausgeben.


## Einrichtung · Slice 2

Die Einrichtung erweitert die bestehende Übersicht und den geschützten Radix-Dialog im gleichen Operate-System. Drei Schritte ordnen Zähleridentität, Zeitraum/Konditionen und Anfangsablesung mit Zusammenfassung; Zurück erhält Angaben. Keine neue Token-, Farb- oder Typografieentscheidung. Lange Formulare bleiben vertikal scrollbar, Aktionen umbrechen beziehungsweise stapeln bei schmaler Breite und 200 % Schrift. Der leere Einstieg nennt Aufgabe und benötigte Unterlagen.

Sichtbare Labels/Einheiten, Feldfehler mit Fokus und Verknüpfung, Schutz beim Verlassen, gesperrte Übermittlung und explizit geschlossener Erfolg gehören zum Ablauf. Bei unklarer Speicherantwort werden Eingaben bis zur Bestätigung geschützt und derselbe Auftrag auch nach Reload wiederaufgenommen. „Abbrechen“ ist im Einrichtungsdialog eine Ghost-Aktion, „Zurück“ bleibt Outline und die Fortsetzung primär. Select-Auslöser haben einen expliziten Tabstopp und sichtbaren Fokus im Tastaturmodus. Der Abschluss erklärt die nächste Stand-Erfassung. Fehlgeschlagener Listenabruf erhält eine konkrete Wiederladeaktion. Exklusive Endgrenze, ausdrückliche Null und bewusst eingetragener Gasfaktor vermeiden irreführende Anfangsdaten.

Nachweise: `docs/verification/slice-2/README.md` und Browser-/Integrationsprotokolle. Im Unterschied zu den rein synthetischen Nachweisen von Slice 1b wurden hier echte lokale Supabase-Anmeldung, transaktionale Speicherung, Zwei-Konten-RLS, verlorene Antwort nach Commit und tatsächliche Browserreloads für Strom/Gas geprüft. Geräte-/Screenreader-/Cross-Browser-Abnahme bleibt offen; unabhängiges Finishreview ist separat zu bewerten. Vorbestehender Sidecar-Drift bleibt unverändert.


Menüeinträge in Selects und Dropdowns verwenden nach Nutzerfreigabe eine flache Hervorhebung über die ganze Zeilenbreite (`--sys-color-menu-highlight`), ohne innere Kontur oder Rundung. Tastaturfokus erhält zusätzlich eine Unterstreichung, die Auswahl weiterhin den Haken; destruktive Einträge behalten ihre Fehlerfarbe. Die Schließbestätigung der Einrichtung benennt ausschließlich den aktuellen Zustand: ungespeicherte Eingaben verwerfen oder eine unbestätigte Speicherung später prüfen. Safari-Tabnavigation wurde vom Nutzer bestätigt.


## Verstehen · Slice 3

Die bestehenden Zählerdetails starten mit einer zeitraumbezogenen Einschätzung, gefolgt von beobachteten Ständen, abgeleitetem Verbrauch und Verlauf. Monatswerte und Rechenweg sind aufklappbar. Die erfasste Schlussabrechnung bleibt visuell/sprachlich von der Kostenschätzung getrennt; vertragliche Abschläge gelten nicht als tatsächliche Zahlungen. Laufende, kurze und vergangene Zeiträume erhalten passende Bezüge und keine pauschalen Jahreslabels. Diagramme und Monatswerte liegen in der Detailansicht; die Zählerkarte behält eine kompakte Einschätzung und die Hauptaktion „Stand erfassen“. Die Verknüpfung erhält den auf der Karte gewählten Zeitraum. Bestehende Verwaltung bleibt unter eigenen Tabs erreichbar. Keine neuen Tokens, Palette oder Schriftrampe; Diagrammachsen werden dynamisch bemessen, breite Verläufe bei Bedarf lokal und per Tastatur scrollbar.

Nachweise und bewusst beibehaltene Rechenannahmen: `docs/verification/slice-3/README.md`. Slice 3 nutzt synthetische, unabhängig von Slices 4/5 prüfbare Fixtures. Reale Konto-/Geräte-/Screenreader-/Cross-Browserabnahme daraus nicht ableiten.

Nutzerreview Slice 3: Die erste Fassung wurde wegen zu viel Text verworfen. Maßgeblich ist jetzt: Icon + Name + Laufzeit im Header; auf der Karte nur letzter Stand und erwartetes Ergebnis. Auf „Verstehen“ folgen Ergebnis und Diagramm unmittelbar aufeinander; Kosten, Ablesungen, Monatswerte und Rechenweg bleiben zunächst geschlossen. Kein isoliertes Typ-/doppeltes Zeitraumlabel, keine „Rückblickende Schätzung“. Prognoseergebnisse heißen „Voraussichtlich“, erfasste Schlussabrechnungen behalten die eindeutige Kennzeichnung. Die Zeitraumwahl liegt in den Details; die Karte zeigt den neuesten Zeitraum.

Weitere Nutzerfreigabe zur Umsetzung: Name und Laufzeit stehen auf gemeinsamer Textgrundlinie. Das Ergebnis erhält ein ruhiges Statusbanner aus bestehenden semantischen Flächen. Die Verbrauchsgrafik trägt kWh an der Y-Achse und deutsche Monatsnamen an der X-Achse; exakte Daten bleiben im Tooltip. Auf schmalen Ansichten darf die Laufzeit unter den Namen umbrechen. Der Name behält die volle verfügbare Breite. Kein zusätzlicher sichtbarer Diagrammtitel.

Statusfarben nach Nutzerauftrag: Nachzahlung erhält rote Schrift/Kontur mit leichter roter Tönung, Erstattung entsprechend Grün; ausgeglichene oder unbekannte Ergebnisse bleiben neutral. Outcome-Farbrollen liegen ausschließlich in `foundation.tokens.css`, allgemeine Formular-Erfolgsrollen bleiben erhalten. Die frühere „Zuletzt“-Zeile im Erfassungsdialog entfällt. Stattdessen steht der letzte gespeicherte Stand als bearbeitbarer, beim Öffnen ausgewählter Wert im Input; ohne Stand bleibt er leer. Die Vorbelegung allein ist keine Änderung und erzeugt keinen Verwerfen-Dialog. Eigene Änderungen bleiben geschützt.
