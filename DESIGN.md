---
name: Parity
description: Ein freundliches kleines Messgerät mit klaren Affordances und lesbaren Zahlen.
colors:
  canvas: "var(--sys-color-background-default)"
  surface: "var(--sys-color-background-surface-1)"
  field: "var(--sys-color-background-surface-2)"
  field-active: "var(--sys-color-background-surface-2-hover)"
  text: "var(--sys-color-content-primary)"
  text-secondary: "var(--sys-color-content-secondary)"
  action: "var(--sys-color-background-accent)"
  action-text: "var(--sys-color-content-on-accent)"
  action-hover: "var(--sys-color-background-accent-hover)"
  error-surface: "var(--sys-color-background-utility-error)"
  success-surface: "var(--sys-color-background-utility-success)"
  overlay: "var(--sys-color-overlay)"
  chart-actual: "var(--sys-color-chart-actual)"
  chart-projected: "var(--sys-color-chart-projected)"
  chart-target: "var(--sys-color-chart-target)"
  border: "var(--sys-color-border-default)"
  divider: "var(--sys-color-border-weak)"
  focus: "var(--sys-color-focus)"
  error: "var(--sys-color-content-utility-error)"
  success: "var(--sys-color-content-utility-success)"
  disabled: "var(--sys-color-background-disabled)"
  disabled-text: "var(--sys-color-content-disabled)"
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

Dieses Dokument hält die vereinbarte Richtung und das nach Slice 1b integrierte Frontend fest. Die freigegebene Farbrichtung ist C „Sanftes Creme + Signalorange“. Variante A bleibt Herkunft der Form- und Interaktionssprache: Atkinson, klare Konturen, Druckknöpfe und geschützte Erfassung im Modal/Sheet. Slice 2 erweitert die Einrichtung; Slice 3 ergänzt die zeitraumbezogene Verstehensansicht. Slice 4 ergänzt die datierte Konditionspflege; Slice 5 ergänzt die unabhängige Abrechnung und Zeitraumfortführung; Slice 6 ergänzt die gezielte Verwaltung sowie sichere Zugangs-, Sitzungs- und Navigationszustände; Nachweise unter `docs/verification/slice-6/`. Technische und synthetische visuelle Prüfungen sind bestanden. Für Slice 2 sind zusätzlich reale lokale Anmeldung, Persistenz und Zwei-Konten-RLS geprüft; die historischen Nachweise von Slice 1b bleiben separat. Physische Geräte-, Screenreader- und Cross-Browser-Abnahme bleiben offen.

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

Normativ sind ausschließlich `src/app/foundation.tokens.css` und seine semantischen Rollen: `--sys-color-background-default`, `--sys-color-background-surface-1`, `--sys-color-background-surface-2`, `--sys-color-background-surface-2-hover`, `--sys-color-content-primary`, `--sys-color-background-accent`, `--sys-color-content-on-accent` und `--sys-color-background-accent-hover`. Statusflächen, Overlay und Diagrammrollen liegen ebenfalls dort; Diagramme unterscheiden tatsächliche und prognostizierte Werte zusätzlich durch Strichart. Mischungen nicht lokal neu definieren. Die tatsächlich verwendeten Kontrastpaare sind in `docs/verification/slice-1b/browser-check.json` gemessen; OKLCH allein garantiert keinen Kontrast.

Unterstützt wird ausschließlich die freigegebene helle Palette, auch bei dunkler Systemeinstellung. Es gab keine produktive Theme-Auswahl; widersprüchliche lokale Dunkelrezepte wurden entfernt. Das interne Design-/Debugpanel ist nur in Entwicklung verfügbar und verändert keine Supabase-Daten. Historische A/B/C-Explorationen behalten lokale Vergleichswerte, sind aber keine Tokenquelle der Anwendung. Zusätzliche Paletten bedürfen vollständiger Rollen und Kontrastprüfung.

## Token-System (20.11.2026)

Die neue Struktur ersetzt die bisherigen kurzen Farbrollennamen. Normative Quelle bleibt `src/app/foundation.tokens.css`. Der Entwicklungskatalog unter `/design/tokens` (mit `PARITY_DESIGN_PREVIEW=1`) liest die Namen direkt aus dieser Datei und zeigt echte Komponenten sowie alle Farben.

- **Primitive Colors** `--ref-color-{palette}-{stufe}` enthalten Werte; höhere Stufen sind dunkler. Weiß, Transparenz, Overlay und Schatten sind benannte Sonderwerte. Die vorhandene Palette bleibt erhalten, statt einen vollständigen Tailwind-Katalog einzuführen.
- **Semantic Colors** `--sys-color-{gruppe}-{rolle}` referenzieren Primitive. Gruppen: `content`, `background`, `border`; Statusrollen jeweils unter `utility`. Content hat primary/primary-hover, secondary/secondary-hover, tertiary und on-knockout. Background hat default, surface-1, surface-2 mit Hover sowie disabled. Border hat default/default-hover, weak und knockout. Utility umfasst immer error, warning, success und info.
- **Knockout:** `background-utility-{status}` ist eine helle Statusfläche mit `content-utility-{status}`. Die kräftige Variante `background-utility-{status}-knockout` verwendet ausschließlich `content-on-knockout` (Weiß). Status nicht allein durch Farbe vermitteln. Orange Aktionen verwenden separat `content-on-accent` (dunkel), da Weiß auf dem gewählten Orange nicht genügend Kontrast hat.
- **Ergänzende semantische Rollen:** Fokus, deaktivierter Content, besuchte Links, transparente Flächen, Aktionsfarbe, Menühighlight, Overlay und Diagrammfarben. Erfolg verwendet jetzt Grün; finanzielle Erstattung/Nachzahlung nutzen dieselben success/error-Rollen.
- **Component Colors** `--cmp-button-{variante}-{kanal}[-{zustand}]`: Varianten default, primary, secondary, ghost, danger; Kanäle background/content/border; Zustände ohne Suffix, hover, active und disabled. Alle referenzieren Semantic Colors. Lokale `--button-*` in `controls.css` wählen nur die Variante aus.
- **Button-API:** Das bestehende shadcn `variant="default"` bleibt die orange Hauptaktion und verwendet `button/primary`; `outline` verwendet `button/default`, `destructive` verwendet `button/danger`. Bestehende Aufrufer bleiben damit konsistent. Link-Buttons verwenden link/default, hover und active. Visited gilt nur für echte Textlinks mit href, nicht für Button-Aktionen.
- **Form** `--cmp-form-*`: border, border-focus (Tastaturoutline), border-active (aktive Feldkontur), border-error und border-disabled. background ist die ruhende Fläche; background-2 die aktive Fläche. Dazu kommen Content, Placeholder und Disabled-Rollen. Inputs, Selects und Input Groups verwenden denselben Vertrag; Fehler bleiben auch bei Fokus sichtbar.
- **Link** `--cmp-link-{default|hover|active|visited}`: Textlinks bleiben unterstrichen. Hover und Active haben Vorrang vor Visited. Navigationsflächen und Ergebnislinks erhalten keine pauschale Visited-Färbung.
- **Spacing:** feste `--ref-space-*` auf 4-px-Basis → semantische `--sys-gap-*` und `--sys-inset-*`. **Radius:** Primitive für 10/24 px → `--sys-radius-control` und `--sys-radius-surface`. Typografie und Bewegung bleiben erhalten.

Neue UI nutzt semantische Rollen für Inhalte und Flächen, Komponententokens für vorhandene Komponenten. Keine direkten Primitive Colors in Komponenten, keine neuen Farbmischungen in lokalen Rezepten. Tailwind/shadcn-Farben bleiben Adapter auf dieselben Rollen. Die Explorationsvorschauen wurden auf die neuen Namen migriert; historische Prüfprotokolle behalten ihre damaligen Namen und Messwerte.

### Neutralfarben · OKLCH-Korrektur

Die Prüfung beim Sketch-Übertrag zeigte unerwünschte Farbwinkel in den bisherigen OKLCH-Mischungen zwischen Tinte (264°) und Creme (104,574°): Secondary etwa 240°, Tertiary 222,5° und schwache Rahmen 152,4°. Disabled-Flächen und Highlights waren ebenfalls nicht neutral genug. Kontrast allein prüft diese Farbkonsistenz nicht.

Diese Rollen verwenden jetzt gezielte Primitive statt einer Interpolation zwischen den beiden Farbfamilien. Secondary/Tertiary bleiben auf der Tintenachse (264°), mit C=0,03/0,02. Disabled, Highlight und schwache Rahmen liegen auf der warmen Cremeachse (104,574°), mit sehr geringer Buntheit C=0,008. Die drei neutralen Helligkeiten sind 94,5/92,5/76,5 %. Statusgrün bleibt ausschließlich für Success/Erstattung vorgesehen.

Auch die hellen Utility-Flächen sind explizite Primitive, jeweils mit demselben Hue wie die kräftige Variante (Error 26°, Warning 75°, Success 148°, Info 255°). Es gibt keine dynamischen Farbmischungen mehr in der produktiven Foundation. Das vermeidet Unterschiede beim Auflösen schwach gesättigter Farbtöne und macht den Sketch-Übertrag reproduzierbar. Ausgelesene Werte und Vergleich: `docs/verification/token-system/neutral-audit.json`; Sicht-/Kontrastprüfung im selben Verzeichnis.

## Typography

Placeholder sind Beispiele, keine eingetragenen Werte: eigene hellere Rolle `--sys-color-content-tertiary` und Regular-Gewicht verwenden. Eingegebene Werte behalten ihre dunkle Textfarbe und ihr vorgesehenes Gewicht. Die Regel gilt gemeinsam für Inputs, Inputgruppen und Textareas; Labels bleiben dauerhaft sichtbar. Placeholder-Kontrast auf ruhenden und aktiven Feldflächen prüfen.

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


Menüeinträge in Selects und Dropdowns verwenden nach Nutzerfreigabe eine flache Hervorhebung über die ganze Zeilenbreite (`--sys-color-background-highlight`), ohne innere Kontur oder Rundung. Tastaturfokus erhält zusätzlich eine Unterstreichung, die Auswahl weiterhin den Haken; destruktive Einträge behalten ihre Fehlerfarbe. Die Schließbestätigung der Einrichtung benennt ausschließlich den aktuellen Zustand: ungespeicherte Eingaben verwerfen oder eine unbestätigte Speicherung später prüfen. Safari-Tabnavigation wurde vom Nutzer bestätigt.


## Verstehen · Slice 3

Die bestehenden Zählerdetails starten mit einer zeitraumbezogenen Einschätzung, gefolgt von beobachteten Ständen, abgeleitetem Verbrauch und Verlauf. Monatswerte und Rechenweg sind aufklappbar. Die erfasste Schlussabrechnung bleibt visuell/sprachlich von der Kostenschätzung getrennt; vertragliche Abschläge gelten nicht als tatsächliche Zahlungen. Laufende, kurze und vergangene Zeiträume erhalten passende Bezüge und keine pauschalen Jahreslabels. Die Detailansicht enthält die vollständige Grafik und Monatswerte; nach der späteren Nutzerfreigabe vom 19.11.2026 zeigt auch die Zählerkarte wieder eine kompakte Verbrauchskurve vor Einschätzung und „Stand erfassen“. Die Verknüpfung erhält den auf der Karte gewählten Zeitraum. Bestehende Verwaltung bleibt unter eigenen Tabs erreichbar. Keine neuen Tokens, Palette oder Schriftrampe; Diagrammachsen werden dynamisch bemessen, breite Verläufe bei Bedarf lokal und per Tastatur scrollbar.

Nachweise und bewusst beibehaltene Rechenannahmen: `docs/verification/slice-3/README.md`. Slice 3 nutzt synthetische, unabhängig von Slices 4/5 prüfbare Fixtures. Reale Konto-/Geräte-/Screenreader-/Cross-Browserabnahme daraus nicht ableiten.

Nutzerreview Slice 3: Die erste Fassung wurde wegen zu viel Text verworfen. Die damalige Freigabe war: Icon + Name + Laufzeit im Header; auf der Karte nur letzter Stand und erwartetes Ergebnis. Diese Kartenreduktion wurde durch die spätere Nutzerfreigabe „Verbrauchskurve auf der Karte“ unten abgelöst. Auf „Verstehen“ folgen Ergebnis und Diagramm unmittelbar aufeinander; Kosten, Ablesungen, Monatswerte und Rechenweg bleiben zunächst geschlossen. Kein isoliertes Typ-/doppeltes Zeitraumlabel, keine „Rückblickende Schätzung“. Prognoseergebnisse heißen „Voraussichtlich“, erfasste Schlussabrechnungen behalten die eindeutige Kennzeichnung. Die Zeitraumwahl liegt in den Details; die Karte zeigt den neuesten Zeitraum.

Weitere Nutzerfreigabe zur Umsetzung: Name und Laufzeit stehen auf gemeinsamer Textgrundlinie. Das Ergebnis erhält ein ruhiges Statusbanner aus bestehenden semantischen Flächen. Die Verbrauchsgrafik trägt kWh an der Y-Achse und deutsche Monatsnamen an der X-Achse; exakte Daten bleiben im Tooltip. Auf schmalen Ansichten darf die Laufzeit unter den Namen umbrechen. Der Name behält die volle verfügbare Breite. Kein zusätzlicher sichtbarer Diagrammtitel.

Statusfarben nach Nutzerauftrag: Nachzahlung erhält rote Schrift/Kontur mit leichter roter Tönung, Erstattung entsprechend Grün; ausgeglichene oder unbekannte Ergebnisse bleiben neutral. Outcome-Farbrollen liegen ausschließlich in `foundation.tokens.css`, allgemeine Formular-Erfolgsrollen bleiben erhalten. Die frühere „Zuletzt“-Zeile im Erfassungsdialog entfällt. Stattdessen steht der letzte gespeicherte Stand als bearbeitbarer, beim Öffnen ausgewählter Wert im Input; ohne Stand bleibt er leer. Die Vorbelegung allein ist keine Änderung und erzeugt keinen Verwerfen-Dialog. Eigene Änderungen bleiben geschützt.


## Konditionen ändern · Slice 4

Der bestehende Konditionen-Tab zeigt die am Stichtag gültigen Werte (bei vergangenen Zeiträumen zum letzten enthaltenen Tag), eine Hauptaktion und eine zunächst geschlossene Historie. Keine zusätzliche Kartenumrahmung oder wiederholte Überschrift. Historieneinträge öffnen ihre Werte und Korrektur-/Löschaktionen erst bei Bedarf. Zukünftige Einträge sind als geplant benannt; alte Fassungen und Löschungen sind getrennt aufklappbar.

Geschützter Radix-Dialog, mobil dasselbe Formular als Bottom Sheet: Gültigkeitsdatum und echte editierbare Werte → kompakte Prüfung geänderter Werte → bestätigter Erfolg mit Rückkehr zur aktualisierten Einschätzung desselben Zeitraums. Unveränderte Werte sind in der Prüfung eingeklappt. Vorbelegung kommt ausschließlich von den am gewählten Datum gültigen Konditionen; bei bearbeiteten Feldern benötigt ein Datumswechsel eine ausdrückliche Neuübernahme. Leere Felder werden nicht als Null behandelt; deutsche Zahlen und vorhandene Genauigkeit bleiben erhalten. Gas hat einen datierten Faktor ohne geschätzte Vorbelegung.

Vom Nutzer bestätigt: ein aktiver Konditionssatz je Datum; ausdrückliche Korrektur mit archivierter vorheriger Fassung. Vergangene/abgerechnete Zeiträume bleiben mit gezieltem Hinweis bearbeitbar, tatsächliche Schlussabrechnungen bleiben bestehen. Löschen verlangt eine Folgenbestätigung: Vorgänger gilt länger oder es entsteht eine klar benannte Lücke. Vorhandene doppelte Datumsstände werden weder still bereinigt noch zufällig für die Berechnung priorisiert.

Speichersperre, konto-/zeitraumgebundener Sitzungsspeicher und serverseitiger Wiederholbeleg schützen auch eine verlorene Antwort mit Reload. Erfolg folgt erst auf bestätigte Speicherung. Konflikte verlangen explizites Neuladen und erneutes Prüfen, Eingaben bleiben dabei erhalten. Atkinson, tabellarische Ziffern, Creme/Orange, helle Placeholder und gemeinsame Menüzustände bleiben unverändert. Zusätzliche CSS-Regeln sind auf Konditionen begrenzt; bei 200 % können Aktionswörter bei Bedarf umbrechen, lange Formulare bleiben scrollbar. Die reduzierte Verstehen-Ansicht und der vorbelegte/markierte letzte Zählerstand bleiben bestehen.

Nachweise und lokale Migrations-/Persistenzgrenzen: `docs/verification/slice-4/README.md`. Kein Slice-5-Ausbau, keine neue Prognoselogik.


### Slice 4 · Offene Abrechnungszeiträume (maßgebliche Vereinfachung)

Ein fehlendes Ende wird im Kopf und in der Zeitraumwahl als „offen“ dargestellt. Ein angenommener einjähriger Berechnungsbereich ist keine tatsächliche Zeitraumgrenze und erzeugt weder einen historischen Zustand noch eine Eingabesperre. Die Annahme wird in „Wie wird gerechnet?“ erklärt. Neue Konditionen nach dem Berechnungsbereich bleiben zulässig; nur in diesem Fall erklärt die Prüfung knapp, dass für ihre Kostenauswirkung das tatsächliche Ende festzulegen ist. Es wird keine automatische Erweiterung oder neue Prognoselogik eingeführt.

Die Hauptaktion bleibt „Konditionen ändern“, die Prüfung benennt „Neue Konditionen ab …“, gespeichert wird mit „Neue Konditionen speichern“. Korrekturen sind eine Nebenaktion der Historie. Ein zusätzliches Vertragsobjekt existiert fachlich nicht. Direkt neben der Laufzeit steht „Ende festlegen“/„Ende ändern“. Der geschützte Dialog verwendet das verständliche „Bis einschließlich (optional)“; die exklusive Datenbankgrenze bleibt intern. Leeres Ende ist tatsächlich leer, kein vorgeschlagener Jahreswert. Darstellung, Fokus und 200-%-Verhalten wurden geprüft; Nachweise unter `docs/verification/slice-4/open-periods/`.


## Abrechnen und fortführen · Slice 5

Zwei getrennte Aufgaben unter „Verwalten“: tatsächliche Abrechnung erfassen/korrigieren und einen weiteren Zeitraum beginnen. Die Abrechnung benennt Zähler und ausgewählten Zeitraum; Die segmentierte Auswahl Erstattung/Nachzahlung steuert das interne Vorzeichen ohne manuelle Vorzeicheneingabe; eine bewusst eingetragene 0 bedeutet ausgeglichen. Ein tatsächliches Ende muss vorher über den vorhandenen Enddialog festgelegt werden. NULL bleibt unbekannt, 0 ist ausdrücklich ausgeglichen. Tatsächliches Ergebnis und Schätzung bleiben getrennt; bestehende Outcome-Farben gelten unverändert.

Fortführung im vorhandenen geschützten Radix-Modal/mobilen Sheet: Zeitraumangaben → editierbare Konditionen zum Beginn → kompakte Prüfung. Keine Jahresvorgabe, neues Ende zunächst leer. Bei eigenen Konditionsänderungen verlangt ein neuer Beginn die ausdrückliche Neuübernahme. Die Prüfung zeigt alte/neue Grenze, gegebenenfalls die erhaltene Lücke sowie spätere Konditionsdaten und verlangt ausdrückliche Bestätigung. Werte sind aufklappbar, keine zusätzliche dauerhaft offene Detailtabelle in „Verstehen“. Nach bestätigter Anlage führt die Abschlussaktion zum neuen Zeitraum. Vorhandener Nachfolger führt dorthin statt zu einer zweiten Anlage.

Vor Versand gespeicherte konto-/objektgebundene Aufträge erhalten Eingaben bei unklarer Antwort und erlauben identischen Retry nach Reload. Pending sperrt Schließen und Mehrfachübermittlung; Konflikte verlangen aktuellen Stand und erneute Prüfung. Es gibt keine neue Foundation, Farbpalette, Typografie oder Bewegungswelt. Die beiden zusätzlichen Kompositionen verwenden vorhandene Dialog-/Konditionsrezepte und zentrale Tokens; Aktionen umbrechen bei 200 % Text. Nachweise einschließlich echter lokaler Speicherung und Grenzen: `docs/verification/slice-5/README.md`.

Nutzerreview 19.11.2026: Das Ergebnis-Dropdown ist durch zwei native Radiosegmente „Erstattung“/„Nachzahlung“ ersetzt. Auswahl verwendet vorhandene grüne/rote Outcome-Rollen, Richtungspfeile und eine kurze Bewegung gemäß den bestehenden Bewegungs-Tokens; Reduced Motion setzt die Dauer auf 0. Tab und Pfeiltasten funktionieren nativ. Eine ausdrücklich eingegebene 0 zeigt „Abrechnung ausgeglichen“; fehlende Eingabe bleibt unbekannt. Betrag mit sichtbarem Label, Placeholder `15,37` und Eurozeichen als rechtsbündigem shadcn-Input-Group-Addon. Vorhandene gespeicherte Genauigkeit wird nicht beschnitten.


Weitere Nutzerkorrektur am 19.11.2026: Segmentauswahl als zusammenhängendes Bedienelement mit gemeinsamem Außenrahmen und durchgehender Trennlinie. Kein Innenpadding und kein Abstand zwischen den Segmenten, keine separat gerundeten Teilknöpfe. Die aktive Fläche reicht bündig bis an die gemeinsame Kontur; Tastaturfokus wird innen gezeichnet.


Bestätigte Auswahl am 19.11.2026: Segmentstil „Tinte“. Beide Optionen verwenden dieselbe dunkle Text-/Konturrolle als gewählte Fläche und die helle Oberflächenrolle als Schriftfarbe. Der Fokus auf der dunklen Auswahl wird innen orange gezeichnet. Der gemeinsame bündige Rahmen bleibt; grüne/rote Ergebnisbanner in „Verstehen“ behalten ihre Bedeutung.


## Verwalten und vervollständigen · Slice 6

Bestehende Operate-Oberflächen werden gezielt vervollständigt, ohne neue Palette oder zusätzliche Standardinhalte in „Verstehen“. Umbenennen in Übersicht/Details verwendet denselben kontextgebundenen Dialog mit bestätigtem Servernamen; Namensregel bleibt mindestens zwei getrimmte Zeichen ohne neue Maximallänge. Fehler erhalten Eingaben, Pending sperrt Übermittlung/Schließen, Abbrechen gibt den Fokus zurück.

Zählerentfernung beginnt mit einer ausdrücklichen Folgenbestätigung. Der konkrete Name und die fachlich kaskadierenden Daten werden genannt. Bei überschaubarem Inhalt erhält Abbrechen den Anfangsfokus; bei scrollenden langen Bestätigungen beginnt der Fokus oben an der Aufgabenüberschrift. Enter allein darf keine Löschung auslösen. Die destruktive Bestätigung bleibt sekundär zur sicheren Abbruchmöglichkeit. Nach bestätigter Abwesenheit führt die Übersicht weiter und erhält Überschriftenfokus. Unklare Antwort heißt nicht Erfolg; die Löschung kann erneut geprüft werden. Interne Belege/Migrationskopien werden nicht als vollständig gelöscht behauptet.

Das Zählermenü beendet seinen Fokus-/Pointerzustand vor dem Öffnen eines Verwaltungsdialogs; keine überlappenden modalen Menüsperren. Rückgabe überschreibt keine neuere bewusste Fokusaktion. Scrollbare bestehende Dialoge und umbrechende gemeinsame Aktionen bleiben bei langen Namen und 200 % Text erreichbar. Keine neue Komponente für Farben/Typografie/Bewegung.

Zeitraumwahl gehört in den Link. Ungültige, gelöschte oder fremde Objekte zeigen eine neutrale Nicht-verfügbar-Ansicht mit gültigem Rückweg. Ladefehler erhalten eine getrennte Wiederladeansicht; sie dürfen weder „leer“ noch „nicht vorhanden“ behaupten. Der explizite Übersichtsrückweg ist unabhängig von Browser-Zurück. Legacy-Zeitraumlinks werden über den tatsächlich zugehörigen Zähler aufgelöst.

Anmeldung erhält beide bisherigen Wege und Autofillattribute; erfolgreiche Codeanforderung fokussiert die Codeeingabe. Abmelden hat Pending/Fehler/Wiederholung. Fehlende/abgelaufene Sitzung benennt die notwendige Anmeldung. Kontowechsel entfernt alte Formulare/Ansichten und lädt den bisherigen Link neu; bereits gesicherte kontoabhängige Aufträge bleiben für dasselbe Konto erhalten. Die bestehende Passwortänderung wird nicht erweitert. An-/Abmeldung überlassen das Neuladen ausschließlich dem Kontoschutz, um keinen zweiten Seitenwechsel mit verlorenen neuen Entwürfen auszulösen. Die lokale Code-Mailvorlage zeigt tatsächlich den OTP-Token in deutscher Sprache; keine neue Auth-Methode.

Tatsächliche Prüfungen und offene Geräte-/Screenreader-/Browserabnahmen sind im Slice-6-Nachweis dokumentiert. Historische Backuptabellen wurden ausschließlich durch eine additive Clientrechte-/RLS-Korrektur geschützt, ohne Datenbereinigung; Aufbewahrung bleibt Slice-7-/Produktentscheidung.


## Designreview · umgesetzte Nachschärfung (19.11.2026)

Die fünf priorisierten Empfehlungen aus `docs/design-review/2026-11-19-taste/` sind umgesetzt. Auf Zählerkarten stehen Zeitraum und finanzielles Ergebnis vor dem nachrangigen letzten Stand. Ergebnis verwendet die Abschnittsrolle und vorhandene rote/grüne Outcome-Farben; der letzte Stand die Kontrollrolle. Namen sind `h2`, kompakte Ergebnisse Absätze. Namens- und Ergebnisbereich sind erkennbare, mindestens 44 px hohe Detailverknüpfungen; der Ergebnislink erhält die tatsächliche Zeitraum-ID. „Stand erfassen“ bleibt die plastische Hauptaktion. Keine zusätzliche Standardinformation oder weitere Ergebnisfläche.

In gefüllter Übersicht liegt „Zähler hinzufügen“ als kompakte sekundäre Aktion außerhalb der Zählerreihe; der leere Einstieg behält seine größere Einladung. Der wiederholende Einleitungssatz entfällt. Zwei vorhandene Zähler werden in zwei Spalten verteilt. Umbenennen in der Detailansicht ist ein expliziter Stift-Button neben einer normalen Überschrift; „Ende ändern“ bleibt unverändert erreichbar.

Die Grafik zeigt standardmäßig den vollständigen Zeitraum einschließlich Zukunft auf der tatsächlich verfügbaren Breite. Keine feste 640-px-Mindestfläche mehr. Weniger, kurze deutsche Monatslabels; vollständige Daten weiter im Tooltip und in der Monatstabelle. Achsenwerte ab einer Million verwenden lesbare Mio./Mrd.-Notation, ausschließlich als Beschriftung. Einheiten- und Monatsränder berücksichtigen 200 % Text; Tabellen bleiben bei Bedarf lokal scrollbar. Tastaturfokus im Chart ist am Container sichtbar.

Die Löschaufgabe hat den kurzen Titel „Zähler entfernen“ und den vollständigen Namen in normaler Schrift direkt darunter, als Teil der zugänglichen Beschreibung. Bei langem scrollendem Inhalt bleibt der Anfangsfokus oben an der Aufgabe; bei passendem Inhalt auf Abbrechen. Der Kontext darf durch Autofokus nicht zunächst aus dem Ausschnitt verschwinden. Pending, bewusste Bestätigung und Folgen bleiben erhalten; geschützte interne Nachweise werden nicht als vollständig gelöscht behauptet.

174 Tests, Typecheck/Lint/isolierter Build, die fünf Regressionen, gezielte Geometrie-/200-%-/Fokusprüfung und echter lokaler Browserweg bestanden. Produktive Performance-, Nutzer-, Geräte-, Screenreader- und weitere Browserabnahme daraus nicht ableiten. Die Marketing-Gateregeln des verwendeten Taste-Skills sind keine Produktanforderungen an diese private Datenanwendung. Nachweise und Vorher-/Nachher-Vergleich: `docs/verification/slice-6/design-followup/README.md`.


### Verbrauchskurve auf der Karte · spätere Nutzerfreigabe (19.11.2026)

Die kompakte Grafik ist wieder Hauptinhalt der Zählerkarte: Name und Zeitraum → Legende und Verbrauchskurve → kurze finanzielle Einschätzung → letzter Stand mit Datum → „Stand erfassen“. Diese Entscheidung ersetzt die frühere Reduktion auf Ergebnis/Stand und die Ergebnispriorisierung des ersten Designreviews. Die reduzierte Detailansicht bleibt erhalten.

Die Karte verwendet exakt dieselben berechneten Daten wie „Verstehen“. Durchgezogener, aus Ablesungen abgeleiteter Verlauf und gestrichelte Hochrechnung bleiben unterscheidbar. Kompakte Grafik mit 10 rem Höhe, deutschen Monatslabels, kWh-Einheit und ausgeblendeter numerischer Y-Achse; exakte Daten erscheinen per Maus oder Tastatur im Tooltip, vollständige Achsen/Monatswerte in „Verstehen“. Keine zweite Berechnung oder neue Farbrolle. Auch Gasverläufe bleiben kWh, der letzte Gaszählerstand m³. Bei fehlenden Preisen bleibt der Verbrauch sichtbar; bei weniger als zwei Ständen wird keine Kurve erfunden.

Die interaktive Grafik liegt außerhalb des Ergebnislinks. Name und Ergebnis führen weiterhin zum tatsächlichen Zähler und Zeitraum; die Grafik lässt sich mit Tab/Pfeiltasten bedienen. Finanzielles Ergebnis und letzter Stand verwenden die kleinere Kontrollschrift; die plastische Hauptaktion bleibt erhalten. Bei 200 % Text darf die Karte wachsen, lange numerische Stände bleiben lokal scrollbar. Nachweise: `docs/verification/slice-6/card-chart/README.md`.

### Verbrauchskurve ohne Anfangsablesung (20.11.2026)

In Karte und Detail bleibt der aus Ablesungen abgeleitete Verbrauch sichtbar, auch wenn am Zeitraumstart kein Stand vorliegt. Die durchgezogene Kurve beginnt bei der ersten Ablesung mit null und endet bei der letzten; außerhalb dieses Bereichs bleibt sie unterbrochen. Ein datierter Hinweis erklärt den späteren Bezugsbeginn und den davor unbekannten Verbrauch. Die gestrichelte Hochrechnung gilt weiterhin für den gesamten Zeitraum. Keine erfundene Anfangsablesung, keine Änderung der Prognose- oder Kostenrechnung.

### Detailansicht · Nutzerreview vom 20.11.2026

Diese Freigabe ersetzt die früheren Vorgaben zum sichtbaren Umbenennungsstift, zur Endaktion im Header und zu eingeklappten Monatswerten. Links stehen Zurück, Typicon und Name, rechts eine ruhige Zeitraumwahl mit Monat/Jahr. Die Auswahloptionen und die Verwaltung behalten exakte inklusive Datumsgrenzen. Im Tab „Ablesungen“ entfällt die Zeitraumwahl, da dort weiterhin die gesamte Zählerhistorie gilt.

Der Name öffnet per Klick oder Tastatur einen Inline-Editor mit ausgewähltem bisherigen Namen. Hover und Tastaturfokus kennzeichnen die Nebenaktion. Enter beziehungsweise der benannte Bestätigungsknopf speichern; Escape und Abbrechen verwerfen. Pending sperrt Eingabe und Abbruch; Fehler erhalten den Entwurf. Unter Verwalten gibt es keine zusätzliche Umbenennungsaktion. Das Umbenennungsmenü der Übersicht behält seinen bestehenden Dialog.

Die Haupttabs erhalten eine gemeinsame untere Trennlinie und eine aktive Unterstreichung; auf schmalen Ansichten bilden sie zwei gleich breite Spalten und wechseln bei großer Schrift in eine Spalte. „Neuen Zeitraum anlegen“ steht mit Abstand neben beziehungsweise unter „Zeitraumdetails“. Die Endaktion liegt bei „Bis einschließlich“. Verwaltungsdaten bilden responsive, durch feine Linien getrennte Zeilen; Speicherfehler erscheinen ausschließlich im betroffenen Bereich.

„Ablesungen“ steht mit seiner Hinzufügen-Aktion unmittelbar über der Tabelle, ohne äußere Karte oder zusätzlichen Tabellenrahmen. Konditionen verwenden eine kompakte zweispaltige Liste mit Trennlinien. Eurobeträge zeigen stets zwei Nachkommastellen; ct/kWh und Umrechnungsfaktoren behalten ihre Genauigkeit. Eingabewerte werden dadurch nicht gerundet.

In Verstehen folgt auf das Ergebnis eine Werkzeugzeile: links die Diagrammlegende, rechts der zusammenhängende Switcher „Verlauf / Monatswerte“. In der Monatsansicht entfällt die Diagrammlegende; der Switcher bleibt rechts über der Tabelle. Auf schmalen Ansichten darf die Zeile umbrechen. Das Ergebnis bleibt beim Wechsel sichtbar. Die Monatsansicht benennt ausdrücklich den durch Ablesungen abgedeckten Teilzeitraum, genaue Teilmonatsgrenzen, geschätzte Werte und die exklusive Bis-Grenze. Sie erfindet keine zukünftigen Monatswerte. Prognose- und Kostenrechnung bleiben unverändert.

Nachweise und Produktionsgrenze: `docs/verification/detail-refinement/README.md`. Die öffentlich erreichbare Produktions-API meldet für `save_billing_period_details` am 20.11.2026 `404/PGRST202`. Eine additive Wiederherstellung mit Schema-Reload liegt in `supabase/migrations/20261120000001_restore_period_details_rpc.sql`; keine produktive Migration wurde während dieser Änderung ausgeführt.
