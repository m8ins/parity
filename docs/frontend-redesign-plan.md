# Frontend-Neugestaltung: OOUX und vertikale Slices

Stand: 16. November 2026. Status: fachliche Richtung und Slice-Zuschnitt abgestimmt; Slice 1 und Slice 1b implementiert, technische und synthetische visuelle Prüfungen bestanden. Slice 2 ist implementiert und zusätzlich mit echter lokaler Supabase-Persistenz und Zwei-Konten-RLS geprüft. Physische Geräteabnahme und Nutzerreview bleiben offen. Slice 3 ist implementiert und synthetisch geprüft; Slices 4–6 nicht begonnen.

Diese Datei ist der Arbeits- und Übergabeplan für spätere Implementierungsagenten. Sie enthält verbindliche Gesprächsentscheidungen und ausdrücklich offene Gestaltungsfragen. Die Dokumentation allein ist kein Auftrag, jetzt Anwendungscode zu ändern.

## Ziel und verbindliche Entscheidungen

Die aktuelle gestalterische Zielbeschreibung steht in `DESIGN.md`. Bei späterer Delegation immer zusätzlich lesen; dort sind auch Zahlen-Typografie und die Empfehlung zur bestehenden Radix/shadcn-Grundlage dokumentiert.

- Das Frontend wird vollständig neu gestaltet. React/Next.js und Supabase bleiben erhalten.
- OOUX leitet die Struktur: Objekte, Beziehungen, Aktionen und Eigenschaften vor einzelnen Screens klären.
- Der Zähler ist das führende Objekt. Der häufigste Einstieg ist das schnelle Erfassen eines Zählerstands.
- Jeder Zähler ist unabhängig erfassbar. Keine feste Strom-und-Gas-Runde, keine angenommene räumliche Nähe, keine erzwungene Reihenfolge oder gemeinsame Erfassung.
- Stilrichtung: Basecamp als Inspiration, „Fisher Price“, größere Schrift, klare und großzügige Bedienelemente, freundlich und etwas verspielt. Subtile, zweckmäßige Animationen sind erwünscht.
- „One thing per page“ bedeutet eine dominante Aufgabe oder Frage. Es schreibt weder eine Seite pro Feld noch bereits konkrete Routen, Dialoge oder Wizards vor.
- Deutsch zuerst, mobile Erfassung am Zähler und barrierearme Bedienung. Ergänzender Produktkontext steht in `PRODUCT.md`.
- Schriftwahl mit echten tabellarischen Ziffern; Zählerstände, Geldbeträge und Zahlenvergleiche erhalten tabular lining numbers. Details und Prüfkriterien stehen in `DESIGN.md`.
- Bestehende Funktionen und Daten bleiben erhalten, sofern nicht ausdrücklich anders entschieden. Keine fachlichen Änderungen als unbemerkter Nebeneffekt eines Redesigns.

### Präzisierte Gestaltungsrichtung

Bestätigt am 15.11.2026, maßgeblich gegenüber früheren offenen Angaben:
- Form-/Interaktionsherkunft Variante A; seit Slice 1b Farbrichtung C „Sanftes Creme + Signalorange“ freigegeben: Atkinson Hyperlegible Next, freundliches kleines Messgerät, klare leicht comichafte Konturen, herausragende Knöpfe; kein Neumorphismus.
- Sanfte Cremeflächen, orange Hauptaktion mit eigener dunkler Aktionsschrift und semantische OKLCH-Rollen einschließlich Rot für Fehler. Eine gemeinsame Tokenquelle aus `foundation.tokens.css`: Primitive → Rollen → Komponenten; Tailwind/shadcn daran anbinden, Radix weiterverwenden.
- Hybride Responsivität: stabile rem-Formularrollen und Messwertstufen; nur Seitentitel und äußere Ränder begrenzt fluid. Spacing auf 4-px-Primitiven. Echte tabellarische Ziffern, deutsche Formate, fachlich nötige Präzision.
- Weiße aktive Eingaben ohne Klick-Ring, zusätzliche Tastaturoutline; rote Fehlerkontur plus Meldung. Knöpfe: 4 px Tiefe, 70/110 ms, cubic-bezier(.16,1,.3,1), Reduced Motion.
- Slice 1: kompaktes Desktop-Modal, mobil Bottom Sheet mit echtem Ziehen am Griff und explizitem Abbrechen. Gemeinsames Formular, Schutz geänderter Eingaben einschließlich Escape/Wischen, kein Dismiss durch Hintergrundklick. Sichere Fokusführung, erreichbare Inhalte bei Tastatur/Safe Areas/Schriftvergrößerung. Speichersperre, Fehler/Wiederholen, Erfolg am richtigen Zähler.
- Internes Designpanel nur in Entwicklung / expliziter Vorschau, vorhandene Palette auswählen/zurücksetzen, keine Supabase-Änderung. Kein Vergleichslabor und keine dekorative Geräteumrahmung im Produkt.

Weitere Produktentscheidungen bleiben unverändert; vollständige Navigation späterer Slices bleibt offen.

## Gemeinsame Sprache und Objektmodell

| Objekt / Begriff | Eigenschaften und Beziehungen | Aktionen / Verantwortung |
| --- | --- | --- |
| Zähler | Name, Strom/Gas; besitzt Ablesungen und Abrechnungszeiträume | Finden, öffnen, anlegen, umbenennen, entfernen |
| Ablesung | Datum, Stand, Einheit aus dem Zählertyp; gehört genau einem Zähler, unabhängig von Zeitraumwechseln | Erfassen, ansehen, gemäß bestehendem Funktionsumfang verwalten |
| Abrechnungszeitraum | Beginn, Ende, ein Anbieter; gehört genau einem Zähler | Auswählen, ansehen, abschließen, Folgezeitraum beginnen |
| Vertragskonditionen | Grundpreis, Arbeitspreis, Abschlag und ggf. Gasumrechnungsfaktor ab einem Gültigkeitsdatum; mehrere Sätze pro Zeitraum | Ansehen und Änderung mit Datum hinterlegen |

- In eindeutigem Kontext darf die Oberfläche „Konditionen“ und „Konditionen ändern“ sagen. „Konditionsstand“ ist verworfen.
- Ein Abrechnungszeitraum entspricht dem Zeitraum, für den der Anbieter abrechnet. Meist ein Jahr, aber auch kürzer, etwa bei Anbieterwechsel oder Umzug. Keine feste Jahresdauer voraussetzen.
- Mehrere aufeinanderfolgende Zeiträume können denselben Anbieter haben.
- Preis- und Abschlagsänderungen sind innerhalb eines laufenden Zeitraums möglich und starten nicht automatisch einen neuen Zeitraum.
- Anbieter ist zunächst eine Eigenschaft des Zeitraums, kein eigener Navigationsbereich.
- Schlussabrechnung: tatsächliches Ergebnis eines Zeitraums, einschließlich Erstattung oder Nachzahlung. Im bestehenden Modell Betrag und Datum am Zeitraum; kein neues eigenständiges Backend-Objekt nötig.
- Verbrauch, Kosten und Prognose sind berechnete Ansichten. Tatsächliche Abrechnung und Schätzung müssen unterscheidbar bleiben.

### Abbildung auf die bestehende Implementierung

| Produktbegriff | Bestehender Typ / Tabelle |
| --- | --- |
| Zähler | `Meter` / `meters` |
| Ablesung | `Reading` / `readings` |
| Abrechnungszeitraum | `Contract` / `contracts` |
| Vertragskonditionen | `Rate` / `rates` |

Die Benennung im Code ist historisch. Eine Umbenennung von Tabellen oder eine neue Vertragsentität gehört nicht automatisch zum Redesign. Datenzugriff und Berechnung zunächst weiterverwenden. Einschränkungen der bestehenden Berechnung für variable Zeiträume prüfen und nötige Korrekturen explizit ausweisen, statt sie mit neuer Darstellung zu verdecken.

## Vorbereitung vor der Implementierung

Kurze gemeinsame Designentscheidung, kein separates Großprojekt für ein Designsystem:

1. Objektmodell auf die vorhandenen Aktionen abbilden und Funktionsinventar prüfen.
2. Wenige visuelle Richtungen am selben exemplarischen Ablauf „beliebigen Zähler ablesen“ zeigen; Auswahl gemeinsam treffen.
3. Gewählte Richtung, minimale gemeinsame Gestaltungsregeln und Navigation dokumentieren. Der Modal-/Sheet-Ablauf für Slice 1 ist bestätigt; die genaue Navigation späterer Slices bleibt offen.

Für Slice 1 sind Palette, Schrift, hybride Skalierung und Modal/Sheet entschieden (siehe DESIGN.md). Offen bleiben Illustrationen und genaue Navigation späterer Slices. Implementierungsagenten dürfen die verworfene Ableserunde nicht wieder als Vorgabe einsetzen.

## Slice 1 — Ablesen

**Nutzerziel:** Einen vorhandenen Zähler schnell finden und einen Stand zuverlässig erfassen.

**Umfang:** Einstieg über vorhandene Zähler, Erfassung für einen beliebigen Zähler, bestehende Validierungen, Supabase-Speicherung, verständliche Bestätigung und Wiederfinden des gespeicherten Werts. Hier entsteht die erste minimale gemeinsame UI-Grundlage.

**Außerhalb:** Zählereinrichtung, neue Prognosedarstellung, Tarifpflege, gekoppelte Ableserunde.

**Abnahme:**
- Mit vorbereiteten Strom- und Gaszählern lässt sich jeder einzeln erfassen, ohne den anderen zu bearbeiten.
- Datum, Wert und Einheit sind eindeutig; bestehende fachliche Prüfungen bleiben erhalten.
- Nach Neuladen ist der gespeicherte Wert am richtigen Zähler sichtbar.
- Fehler führen nicht zu einer falschen Erfolgsbestätigung; Wiederholen und Abbrechen sind verständlich.
- Der Kernweg funktioniert mobil und per Tastatur.

**Abhängigkeit:** Gemeinsame visuelle Richtung. Vorhandene Anmeldung und Beispieldaten reichen; Slice 2 ist nicht erforderlich.

**Einstiegspunkte:** `src/components/dashboard.tsx`, `contract-card.tsx`, `reading-dialog.tsx`, `src/app/page.tsx`, Ablesungs- und Interaktionstests.

## Slice 1b — Visuelle Integration und Konsolidierung

**Status:** Implementiert und am 16.11.2026 technisch/visuell mit synthetischen Daten geprüft. Die historische reale Abnahme von Slice 1b bleibt separat; Slice 2 ist inzwischen lokal real geprüft, Slices 3–6 sind nicht begonnen. Gewählt und integriert: C „Sanftes Creme + Signalorange“. Ausgangsbefunde: `docs/verification/visual-integration-critique.md`; Ergebnis, Matrix und Grenzen: `docs/verification/slice-1b/README.md`.

**Nutzerziel:** Vom Einstieg und Login über Zählerübersicht und Erfassung bis zu bestehenden Detail- und Verwaltungsansichten eine zusammenhängende, verständliche Oberfläche erleben.

**Umfang:**
- Gemeinsame Designsprache jetzt konsolidieren: Canvas/Oberflächen, semantische Farben einschließlich Status/Diagrammen, Konturen, Radien, Tiefe, Typorollen und Abstände. Nutzer erlaubt ausdrücklich Anpassungen an Hintergrund und Farben in diesem Slice; das Messgeräte-Leitbild, Atkinson/lesbare Zahlen, OKLCH und der Ausschluss von Neumorphismus bleiben Leitplanken.
- Login mit beiden bestehenden Anmeldewegen und Codezustand, globaler Header/Kontomenü, Profil, Zählerübersicht, Erfassung, Einrichtung, Detailansicht mit Tabs/Tabellen/Diagrammen, Konditionsverwaltung, Zeitraum- und Abrechnungsdialoge auf gemeinsame Regeln bringen.
- Native/Radix-Verhaltensgrundlage behalten. Gemeinsame Button-/Input-/Card-/Tab-/Select-/Dialogvarianten vereinheitlichen, statt weitere ausschließlich für einzelne Screens geltende Override-Schichten anzuhäufen.
- Sichtbare Labels, verständliche deutsche UI-Texte und konsistente Fehler-/Fokus-/Disabled-/Pending-Zustände gehören zur Integration, soweit die vorhandenen Abläufe unverändert bleiben.
- Dark-Mode-Verhalten explizit prüfen: keine Mischung aus alten `dark:`-Farben und neuen hellen Tokens. Unterstützten Modus dokumentieren; keine ungeprüfte neue Dunkelpalette erfinden oder vorhandene Nutzeroption still entfernen.
- Verbindliche Änderungen zentral in `foundation.tokens.css` halten, DESIGN.md und Impeccable-Sidecar mit dem tatsächlich erreichten Stand synchronisieren.

**Außerhalb:** Neue Navigation oder fachliche Workflows, Neuberechnung von Prognosen, Schema/RLS, neue Authentifizierung, vollständige Neugestaltung der Informationsarchitektur späterer Slices. Keine komplette Neuauswahl der Marke pro Bestandsseite. Slice 6 bleibt für die inhaltliche Überarbeitung von Zugang und Verwaltung zuständig.

**Arbeitsfolge:**
1. Repräsentative Referenzkombination aus Login, Übersicht und Erfassung mit gemeinsamer Canvas-/Oberflächenhierarchie abstimmen. Änderungen als Vorschlag zeigen, bevor sie überall ausgerollt werden.
2. Gemeinsame Primitive/Varianten und danach verbleibende lokale Altstile anpassen. Eine sichtbare Hauptaktion, ruhige sekundäre Aktionen; Tiefe signalisiert Bedienbarkeit und wird nicht pauschal auf alle Flächen gelegt.
3. Alle betroffenen Bestandsansichten und Zustände anhand der Matrix prüfen, Dokumentation aktualisieren und erst dann weitere Slices beginnen.

**Abnahme:**
- Login, Übersicht, Erfassung und Bestandsdialoge wirken wie dieselbe Anwendung; keine unbeabsichtigten neutral/slate-Hintergründe, fremden Statusfarben oder alten Fokus-/Schattenrezepte.
- Gemeinsame Komponenten haben bewusst definierte Varianten und Zustände; normale primäre Aktionen erhalten konsistente Haptik. Tabellen und sekundäre Aktionen bleiben visuell ruhig.
- Desktop und mobile Breiten, 200 % Text, Tastaturfokus, Fehler, Pending/Disabled und Reduced Motion sind geprüft; keine abgeschnittenen Texte oder unerwarteten horizontalen Überläufe.
- Kontrast der tatsächlich verwendeten Farbpaare wird gemessen. Status hat Text/Icon zusätzlich zur Farbe. Zahlen verwenden geeignete tabellarische Ziffern und konsistente Einheiten/Präzision.
- Beide Loginwege, Profil und sämtliche Bestandsdialoge sind mit synthetischen Daten visuell nachgewiesen; nicht erreichbare Zustände werden als offene Abnahme ausgewiesen, nicht als bestanden.
- Slice-1-Regressionsmatrix bleibt erfolgreich (insbesondere Fokus, Änderungsschutz, Griffgeste, Speichersperre und Fehler/Wiederholen). Bestehende Auth-/Fachlogik bleibt erhalten.
- Screenshots vor/nachher, geänderte Tokenrollen, Tests/Lint und verbleibende Grenzen sind unter `docs/verification/slice-1b/` dokumentiert. Produktionsbuild vor Release-PR.

**Abhängigkeit:** Implementiertes Slice-1-Fundament und dessen Review. Echte Persistenz-/physische Geräteabnahme aus Slice 1 bleibt separat offen; ein visueller Integrationspass ersetzt sie nicht.

**Einstiegspunkte / Ownership:** `src/app/foundation.tokens.css`, `globals.css`, `layout.tsx`; `src/components/ui/*`; `auth-screen.tsx`, `header.tsx`, `profile-dialog.tsx` und die bestehenden fachlichen Screens ausschließlich zur visuellen Integration. Ein Sol-Agent übernimmt den Slice zusammenhängend; keine parallelen Änderungen an globalen Tokens/Komponenten.

## Slice 2 — Einrichten

**Nutzerziel:** Einen neuen Zähler mit den notwendigen Anfangsdaten nutzbar machen.

**Umfang:** Leerer Zustand, Zähler, erster Abrechnungszeitraum mit Anbieter, initiale Vertragskonditionen und Anfangsablesung. Pflichtangaben aus vorhandenen Anforderungen ableiten, nicht ungeprüft erweitern.

**Außerhalb:** Spätere Konditionsänderung, Anbieterwechsel, Abschluss.

**Abnahme:**
- Strom und Gas lassen sich unabhängig einrichten und anschließend ablesen.
- Einheit und Gasumrechnung werden korrekt behandelt.
- Validierungsfehler, Abbruch und teilweise fehlgeschlagene Speicherung sind nachvollziehbar; kein stiller Erfolg und keine unbemerkten Duplikate beim Wiederholen.
- Neue Daten sind nach Neuladen vollständig und dem richtigen Konto zugeordnet.

**Abhängigkeit:** Gemeinsame UI/Navigation aus Slice 1; fachlich mit leerem Testkonto prüfbar.

**Einstiegspunkte:** `src/components/contract-form.tsx`, `dashboard.tsx`, `src/lib/types.ts`, Formular- und Interaktionstests.

## Slice 3 — Verstehen

**Status:** Implementiert auf `codex/slice-3-understand` ab `6071b2f`; Gewichtung der Verstehensansicht vom Nutzer bestätigt. Nachweise und gezielte Berechnungskorrekturen: `docs/verification/slice-3/README.md`. Vollständige Nutzerabnahme des Slice 3 bleibt offen. Slice 2 wurde als Ausgangspunkt vom Nutzer abgenommen.

**Nutzerziel:** Verbrauch, Kosten und Prognose eines ausgewählten Zeitraums nachvollziehen.

**Umfang:** Zeitraumwahl, Ablesungsverlauf, Verbrauch, Kosten/Abschläge, Prognose und deren Grundlagen; bestehende Diagramme, Monatsaufschlüsselung, Empfehlungen und Verteilungsannahmen funktional berücksichtigen. Informationen sinnvoll priorisieren, nicht alles gleichrangig darstellen.

**Außerhalb:** Konditionen erfassen, Folgezeitraum anlegen, Schlussabrechnung eingeben.

**Abnahme:**
- Feste Beispieldaten liefern nachprüfbare Ergebnisse, einschließlich mehrerer Konditionen in einem Zeitraum.
- Kurze und vergangene Zeiträume sowie fehlende/zu wenige Ablesungen werden sinnvoll dargestellt; keine erfundenen Werte.
- Prognose, tatsächliche Abrechnung, Einheiten und Bezugszeitraum sind klar unterscheidbar.
- Gasumrechnung und saisonale Verteilung bleiben berücksichtigt.
- Vorhandene Berechnungstests bleiben erfolgreich; erkannte fachliche Lücken werden explizit behoben oder als offene Blocker dokumentiert.

**Abhängigkeit:** UI-Grundlage aus Slice 1. Mit Fixtures unabhängig von den Eingabeoberflächen aus 2, 4 und 5 prüfbar.

**Einstiegspunkte:** `src/components/contract-detail.tsx`, `contract-chart.tsx`, `contract-monthly-table.tsx`, `src/lib/calculations.ts`, `date-utils.ts` und deren Tests.

## Slice 4 — Konditionen ändern

**Nutzerziel:** Neue Preise oder Abschläge ab einem bestimmten Datum hinterlegen.

**Umfang:** Konditionshistorie, datierte Änderung, Speicherung und nachvollziehbare Auswirkung. Bestehende Verwaltungsmöglichkeiten erhalten.

**Außerhalb:** Neuer Abrechnungszeitraum, Anbieterwechsel, Schlussabrechnung.

**Abnahme:**
- Arbeitspreis, Grundpreis oder Abschlag lassen sich innerhalb desselben Zeitraums ändern.
- Frühere Konditionen bleiben erhalten und nachvollziehbar.
- Kosten berücksichtigen die Gültigkeitsgrenze korrekt; Änderung erzeugt keinen neuen Zeitraum.
- Ungültige oder widersprüchliche Datumsangaben werden entsprechend den fachlichen Regeln behandelt.

**Abhängigkeit:** Gemeinsame UI aus Slice 1. Persistenz und Berechnung separat prüfbar; neue sichtbare Kostenauswirkung wird mit Slice 3 integriert.

**Einstiegspunkte:** `src/components/history-lists.tsx`, `contract-detail.tsx`, `src/lib/calculations.ts`, `src/lib/types.ts`.

## Slice 5 — Abrechnen und fortführen

**Nutzerziel:** Eine tatsächliche Abrechnung festhalten und einen weiteren Zeitraum beginnen.

**Umfang:** Erstattung/Nachzahlung und Datum speichern, alte Zeiträume ansehen, Folgezeitraum mit gleichem oder anderem Anbieter und variabler Dauer beginnen. Abschluss erfassen und Folgezeitraum beginnen nicht unnötig aneinander koppeln.

**Außerhalb:** Neue Vertragsentität, Anbieter-Verzeichnis oder vollständiger Umzugsassistent. Ein Umzug begründet eine Zeitraumgrenze, aber noch keinen weitergehenden Umzugsworkflow.

**Abnahme:**
- Jahreszeitraum, verkürzter Zeitraum und Anbieterwechsel sind abbildbar.
- Derselbe Anbieter ist in aufeinanderfolgenden Zeiträumen möglich.
- Ablesungen bleiben am Zähler, alte Konditionen und Ergebnisse bleiben auffindbar; keine überlappenden Zeiträume.
- Erstattung und Nachzahlung werden mit korrektem Vorzeichen gespeichert und verständlich angezeigt.
- Mehrstufige Speicherfehler erzeugen keine unbemerkte Inkonsistenz oder falsche Erfolgsmeldung.

**Abhängigkeit:** UI-Grundlage aus Slice 1; Integration mit Zeitraumdarstellung aus Slice 3. Vorbereitete Konditionen ersetzen eine Abhängigkeit von Slice 4.

**Einstiegspunkte:** `src/components/contract-detail.tsx`, `src/lib/contracts.ts`, `contracts.test.ts`, `supabase/migrations/`.

## Slice 6 — Verwalten und vervollständigen

**Nutzerziel:** Zugang, Einstellungen und Zähler dauerhaft verwalten.

**Umfang:** Vorhandene Anmeldewege, Abmeldung, Kontoeinstellungen, Zähler umbenennen/entfernen, verbleibende Navigation und Fehlerseiten. Funktionsinventar abgleichen, damit keine alte Oberfläche unbeabsichtigt übrig bleibt.

**Außerhalb:** Neue Kontofunktionen, Sharing, neue Export-/Aufbewahrungsregeln.

**Abnahme:**
- Bestehende Passwort- und E-Mail-Code-Anmeldung sowie Abmeldung funktionieren.
- Vorhandene Einstellungen sind zugänglich und persistent.
- Umbenennen und bestätigtes Entfernen funktionieren; Auswirkungen auf verbundene Daten sind klar.
- Bestehende Kontoisolation bleibt erhalten.
- Alle bisherigen Funktionen sind neuen Wegen zugeordnet; Navigation/Deep Links und nicht gefundene Inhalte werden geprüft.

**Abhängigkeit:** UI-Grundlage aus Slice 1. Abschlussprüfung erfolgt nach Integration aller Slices; Authentifizierung wird bis dahin weiterverwendet.

**Einstiegspunkte:** `src/components/auth-screen.tsx`, `profile-dialog.tsx`, `header.tsx`, `src/app/layout.tsx`, `src/lib/locale.tsx`.

## Gemeinsame Prüfdaten und Definition of Done

Prüfdaten je Slice reproduzierbar vorbereiten, ohne echte Nutzerdaten vorauszusetzen:
- Leeres Konto; ein Stromzähler; ein Gaszähler; beide unabhängig vorhanden.
- Keine, eine und mehrere Ablesungen; fehlende Daten; Speicherfehler.
- Leitfall des Nutzers: Gas, ein zwölfmonatiger Abrechnungszeitraum, Preisänderung nach einigen Monaten, abschließende Erstattung.
- Kurzer Zeitraum bei Wechsel/Umzug; gleicher Anbieter über mehrere Zeiträume; Nachzahlung als Gegenfall.

Jeder Implementierungsslice liefert UI, echten Datenweg und passende Verifikation zusammen. Gemeinsame Anforderungen:
- Mobile und Desktop-Ansicht visuell prüfen; Screenshots der relevanten Zustände liefern.
- Bei Änderungen an globalen Tokens, Typografie oder gemeinsamen Komponenten immer auch noch nicht umgebaute Verbraucher prüfen: mindestens Login, Übersicht, Erfassung und eine komplexe Bestandsansicht. Alle betroffenen Varianten/Zustände inventarisieren; keine Visuallücke pauschal auf spätere Slices verschieben.
- Tastatur, Labels, Fokus, Fehlertexte, Kontrast und reduzierte Bewegung berücksichtigen. Animationen dürfen Eingabe und Verständnis nicht behindern.
- Lade-, Leer-, Fehler-, Erfolgs- und Abbruchzustände im jeweiligen Umfang abdecken.
- Verhaltensorientierte Tests für geänderte Logik und Interaktionen; bestehende Regeln aus `AGENTS.md` beachten.
- `npm test -- --run` und `npm run lint`; Produktionsbuild vor Release-PR (`npm run build`). Vitest verwenden, keine ungeprüften Jest-Flags übernehmen.
- Bei erforderlichen Schemaänderungen Migration und Seed gemeinsam pflegen und separat begründen. Destruktive Datenbankaktionen nicht automatisch gegen unbekannte Umgebungen ausführen.
- Bestehende lokale Änderungen anderer Arbeit unangetastet lassen.
- Übergabe nennt Änderungen, erfüllte Abnahmekriterien, ausgeführte Checks, Screenshots und verbleibende Einschränkungen. Ein Slice mit offenen Abnahmekriterien ist nicht fertig.

## Delegation an Sol-Subagenten

**Expliziter Nutzerwunsch:** Spätere Umsetzung an Subagenten mit **Sol statt Astra** delegieren. Jetzt noch keine Implementierungsagenten starten.

- Beim späteren Start das Modell explizit auswählen, nicht vom koordinierenden Agenten erben: aktuell verfügbare Modellkennung `gpt-6.1-sol`.
- Für einen Modell-Override `fork_turns: "none"` verwenden. Daher muss der Auftrag alle benötigten Dateipfade, Entscheidungen und den konkreten Umfang enthalten.
- Wenn diese Modellkennung in einer späteren Sitzung nicht verfügbar ist, Verfügbarkeit prüfen und keinen stillen Wechsel zu Astra vornehmen.
- Nach Slice 1 zuerst Slice 1b (visuelle Integration) abschließen. Anschließend weitere fachliche Slices delegieren.
- Unabhängig prüfbar bedeutet nicht beliebig parallel editierbar. Insbesondere Slices 3–5 berühren heute dieselbe `contract-detail.tsx`.
- Standard: ein Implementierungsagent je Slice, sequenzielle Integration. Parallelisierung nur bei klar getrenntem Dateibesitz oder isolierten Worktrees und explizitem Integrationsplan.
- Der koordinierende Agent prüft gegen diesen Plan, vereinheitlicht Gestaltung und integriert. Subagenten erfinden keine eigene visuelle Richtung pro Slice.

### Kopierbarer Arbeitsauftrag

```text
Implementiere Slice <N> aus docs/frontend-redesign-plan.md.

Arbeitsverzeichnis: /Users/martin/git/parity (oder ausdrücklich zugewiesener Worktree).
Lies zuerst AGENTS.md, PRODUCT.md, docs/frontend-redesign-plan.md sowie die
inzwischen vereinbarte Designdokumentation und relevante lokale Skills.
Fehlt die visuelle Entscheidung noch, melde diese Abhängigkeit; erfinde keine
neue Richtung als Teil dieses Implementierungsauftrags.

Dein Umfang ist ausschließlich Slice <N> einschließlich seiner Abnahmekriterien.
Übernommene Vorarbeiten: <integrierte Slices / Commit / Designentscheidung>.
Erlaubte Dateien bzw. Dateibesitz: <konkret einsetzen>.
Parallel laufende Arbeiten und gesperrte Dateien: <konkret einsetzen>.

Halte Zähler unabhängig erfassbar. Verwende die vereinbarten Produktbegriffe.
React/Next.js und Supabase bleiben bestehen. Bewahre vorhandene Funktionen,
Berechnungsregeln, Historie und Kontoisolation. Keine zusätzlichen Features.
Prüfe den Slice mit reproduzierbaren Daten unabhängig von noch fehlenden Slices.
Führe die passenden Tests und visuellen Prüfungen aus.

Liefere: geänderte Dateien, Ergebnis pro Abnahmekriterium, Testbefehle und
Ergebnisse, Screenshot-Pfade, offene Punkte und Hinweise zur Integration.
Kein Push, Merge oder Deployment im Rahmen dieses Auftrags.
```

### Startkonfiguration für den koordinierenden Agenten

Beim verfügbaren Collaboration-Tool: `spawn_agent` mit
`task_name: "frontend_slice_<N>"`, `model: "gpt-6.1-sol"`,
`fork_turns: "none"` und ausgefülltem Arbeitsauftrag als `message`.
Der Modellname im Prompt allein ersetzt die explizite Modellauswahl nicht.

## Fortschritt

| Arbeit | Status |
| --- | --- |
| Fachliches Modell und Slice-Grenzen | Abgestimmt |
| Visuelle Richtung und Ablauf Slice 1 | Form/Interaktion aus A, Farbrichtung C + Orange seit 1b; Modal und Bottom Sheet implementiert |
| Slice 1 | Implementiert; Tests und Browsermatrix bestanden, reale Persistenz- und Geräteabnahme sowie Nutzerreview offen |
| Slice 1b | Implementiert; technische und synthetische visuelle Prüfungen bestanden, reale Abnahme/Nutzerreview offen |
| Slice 2 | Implementiert; 65 Tests, synthetische Browsermatrix sowie echte lokale API-/SQL-/Browser-Persistenz und RLS bestanden; unabhängiges Finishreview abgeschlossen: zwei materielle Korrekturen im gezielten Nachreview als behoben bewertet (ship) |
| Slice 3–6 | Nicht begonnen |

Nach jedem Slice Status und tatsächliche Design-/Integrationsentscheidungen hier aktualisieren. Fachliche Änderungen gegenüber den Gesprächsentscheidungen ausdrücklich sichtbar machen.


### Slice 1 · tatsächliche Integration (15.11.2026)

Gemeinsame Quelle `src/app/foundation.tokens.css`; Exploration importiert sie, Tailwind/shadcn referenzieren dieselben Rollen. Lokales Atkinson mit Lizenz, kompaktes Radix-Modal/Bottom Sheet ohne neue Abhängigkeit. Nur der Griff verarbeitet Ziehen; Hintergrundschutz, Änderungsbestätigung, Fokusführung, Speichersperre und Wiederholen sind integriert. Übersicht zeigt den jüngsten Stand mit Datum und Status am jeweiligen Zähler; bestehende Prognosen und Verwaltungsaktionen bleiben erhalten. Die Werte der vorhandenen Prognosekarte werden lediglich deutsch formatiert, keine neue Prognoseansicht.

Keine Tabellen-, Migrations-, RLS- oder Berechnungsänderung. Bestehende Domäne bleibt erhalten: nichtnegativer Stand, gültiges Datum, nicht in der Zukunft; keine neue Monotonie-, Zeitraum- oder Dezimalstellenbeschränkung. Leere Eingaben werden nicht als implizite Null gespeichert; echte Null bleibt gültig. Deutsche Gruppierung/Dezimalkomma werden eindeutig geparst, unmögliche Kalenderdaten abgewiesen.

Die rein synthetische, explizit freigeschaltete Entwicklungsroute `/design/reading` nutzt dieselben Komponenten. HTTP-Mocks existieren ausschließlich im Browser-Prüfskript. Sie ersetzen keine reale Persistenzabnahme. Das Entwicklungs-Designpanel bietet die einzige freigegebene Palette und Rücksetzen; kein Datenzugriff.

Abnahme, Reproduktion, Checks, Screenshots und Grenzen: `docs/verification/slice-1/README.md`. Keine weiteren Slices begonnen.


### Slice 1b · tatsächliche Integration (16.11.2026)

C „Sanftes Creme + Signalorange“ ist über alle Bestandsansichten integriert: beide Loginwege und Codezustand, Header/Kontomenü, Profil, Übersicht/Erfassung, Zähleranlage, Details/Tabs/Tabellen/Diagramme, Konditionen, Folgezeitraum und Schlussabrechnung. Form- und Interaktionssprache aus A bleibt erhalten. `foundation.tokens.css` ist die einzige normative Tokenquelle; `controls.css` bündelt gemeinsame Varianten, `globals.css` importiert sie. Bestehende Radix/shadcn-Verhaltensgrundlage bleibt bestehen. Nur die helle Palette wird unterstützt; es gab keine produktive Theme-Auswahl, widersprüchliche Dunkelrezepte wurden entfernt.

Gemeinsamer `InteractionMode` ergänzt Zeiger-/Tastaturfokus: weißes aktives Feld ohne Klickoutline, sichtbare Tastaturoutline. Erfassungsdialog und Modal-/Sheet-Mechanik blieben in Phase 2 unverändert; seine Regression ist erneut geprüft. Labels, Fehler, Pending und Status sind deutsch/konsistent. Profil-Erfolg bleibt bis zum expliziten Schließen sichtbar. Prognose-Leerzustände nennen konkrete Gründe, erkennen vorhandene Ablesungen an und unterscheiden fehlenden Abschlag von ausdrücklich gespeicherter Null. Berechnungsfunktion, Schema, Migrationen und RLS bleiben unverändert. Die vorhandene mehrstufige Zähleranlage bleibt nicht atomar; der Fehlertext benennt mögliche Teilanlage, die fachliche Verbesserung gehört in Slice 2.

Nachweis: `docs/verification/slice-1b/README.md` mit 69 Integrationsaufnahmen in zehn Prüfgruppen und 25 gemessenen Kontrastpaaren; Erfassungsregression mit zehn Prüfungen/17 Aufnahmen. 54 Tests in elf Dateien, TypeScript und Produktionsbuild bestanden; Lint ohne Fehler mit zwei vorbestehenden Warnungen. Review und Folgekorrekturen: `docs/verification/slice-1b/REVIEW.md`. Screenshots und Logs liegen im selben Nachweisverzeichnis.

Offen bleiben reale Supabase-Anmeldung/E-Mailzustellung, Passwortänderung, Persistenz nach echtem Reload, Zwei-Konten-RLS, physische iOS-/Android-Tastaturen, Hardware-Safe-Areas und Screenreader; Chromium/Brave ersetzt keine Safari-/Firefox-Abnahme. Nicht jede Viewport-/Fehler-/Pending-Kombination wurde geprüft. Das technische/visuelle Ergebnis ist kein vollständiger Produktionsfreigabenachweis und ersetzt nicht die reale Slice-1-/1b-Abnahme.


### Slice 2 · tatsächliche Integration (16.11.2026)

Bestehender Einrichtungsdialog erweitert: Zähler → Zeitraum/Konditionen → Anfangsablesung/Prüfung → explizit geschlossener Erfolg. Leerer Einstieg erklärt benötigte Unterlagen. Strom/Gas unabhängig, deutsche Zahlen mit voller bisheriger Genauigkeit; Anbieter und Ende optional, keine Jahresvorgabe. Die exklusive Endgrenze wird erklärt, Ende nach Beginn validiert. Preise/Abschlag erfordern bewusst eingegebene Werte (0 erlaubt), Gas einen positiven Faktor aus der Abrechnung; kein stiller Null- oder geschätzter Faktorwert. Bereichs-/Datumsvalidierung vor Speicherung und im Server. Tagesgrenze dieses Flows konsistent Europe/Berlin.

Neue additive Migration `20261116000001_atomic_meter_setup.sql`: atomare kontogebundene RPC mit allen vier Anfangsdatensätzen; konto-/requestgebundener Beleg und Transaktionslock machen paralleles Wiederholen serverseitig idempotent. Browser schreibt Request/Angaben vor Senden in kontogebundenen Sitzungsspeicher. Unklare Antwort schützt Angaben und ermöglicht denselben Retry auch nach echtem Reload; gesperrter Sitzungsspeicher sendet nichts. Bestehende RLS, Historie und Berechnungen bewahrt. Übersicht-Ladefehler nach erfolgreichem Setup erhält explizite Recovery statt stumm leerer Übersicht/erneuter Einrichtung.

Nachweise `docs/verification/slice-2/README.md`: 65 Tests/13 Dateien, Typecheck und Lint ohne Fehler (2 bestehende Warnungen), Detektor ohne Befunde. 19 synthetische Aufnahmen einschließlich Gas, Abbruch, Pending/Fehler/Erfolg, 320px/200 % und reduzierte Höhe. Zusätzlich echte lokale Supabase: zwei Konten/RLS, acht parallele identische Aufrufe, Nutzlastkonflikt, wiederaufgefundenes Ergebnis, alle Relationen/Präzision und erzwungener später Fehler mit Rollback. Echte Browseranmeldung, absichtlich verlorene Antwort nach tatsächlichem Commit, Reload/Retry ohne Duplikat, Strom- und Gasanlage/weitere Ablesungen nach Reload. Kein Reset; eigene Testkonten/-daten bereinigt. Physische Geräte, Safari/Firefox, Screenreader und Nutzerabnahme offen; unabhängiges Finishreview abgeschlossen: zwei materielle Korrekturen im gezielten Nachreview als behoben bewertet (ship). Kein Push/Merge/Deployment.

Nachkorrekturen nach Nutzerreview: Safari-Tabnavigation bestätigt, Abbrechen als Ghost. Freigegebene flache Menühervorhebung zentral für Select/Dropdown übernommen; Schließbestätigung trennt ungespeicherte Eingaben von unbestätigter Speicherung ohne technischen Auftragstext. 65 Tests/14 Dateien, Lint/Typecheck/Build und aktualisierte Browsermatrix bestanden; Nachweise im Slice-2-Verzeichnis.
