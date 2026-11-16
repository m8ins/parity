# Visuelle Integration nach Slice 1 · Critique

15.11.2026 · Zwei unabhängige Sol-Assessments: A Designreview, B Detektor/Quellen. A wurde abgeschlossen, bevor B-Ergebnisse in die Synthese eingingen. Kein Anwendungscode geändert.

## Ergebnis

Die Designsprache des Erfassungsdialogs passt zum bestätigten Messgeräte-Leitbild: große lesbare Werte, klare Felder, ruhige Cremeflächen und gerichtete Knopftiefe. Kein Neumorphismus. Der aktuelle Mischzustand entsteht vor allem durch unvollständige Übernahme in Bestandsansichten. Empfehlung: Atkinson, Creme/Blaugrau und plastische Hauptaktionen behalten; Canvas/Oberflächen und gemeinsame Varianten in Slice 1b zusammenhängend abstimmen. Eine neue Palette ist nach der verfügbaren Evidenz nicht erforderlich, darf im beauftragten Integrationsslice jedoch gezielt verglichen werden.

## Evidenz und Grenzen

- Quellen: `src/components/auth-screen.tsx`, Header, Dashboard, Karten, gemeinsame UI-Komponenten, `src/app/globals.css`, `foundation.tokens.css` und DESIGN.md.
- Gerenderte Evidenz: vorhandene Slice-1-Aufnahmen unter `docs/verification/slice-1/screenshots/`, insbesondere Desktop-Übersicht/Modal und mobile Übersicht/Gas-Sheet. Diese sind keine neuen Aufnahmen des gesamten heutigen App-Zustands.
- Browseranbieter nicht verfügbar (`iab` abgewiesen, Inventar leer). Lokaler Playwright/Brave-Ersatzstart gelang nach Sandbox-Eskalation: Login live aufgenommen und visuell geprüft, siehe [Login vorher](slice-1b/screenshots/login-before.png) im Verifikationsverzeichnis. Bestätigt: nahezu weißer Canvas unter Cremeheader, kleine weich beschattete Cremekarte, flache kleine Controls. Keine Anmeldung ausgelöst; Serverantworten und authentifizierte Detail-/Profilansichten bleiben ungeprüft. Browser sauber geschlossen.
- Detektor: `impeccable detect --json src/components`, Exit 0, Ausgabe `[]`. Keine Meldungen, keine False Positives. Das ist kein Nachweis funktionaler Barrierefreiheit oder visueller Konsistenz. Kein Browser-Overlay.
- Keine Anmeldung, keine echten Datenänderungen. Fehlende reale Persistenz- und Geräteabnahme aus Slice 1 bleibt bestehen.

## Stärken

1. Erfassung hat eine erkennbare Absicht: Datum, neuer Stand, vorheriger Stand und Speichern. Werte und Einheiten sind gut lesbar.
2. Gerichtete Knopftiefe signalisiert eine Aktion; ruhige Container vermeiden den Eindruck, alles sei drückbar.
3. Atkinson und deutsche Zahlenformate geben dem Instrument eine eigenständige, zugängliche Identität.

## Prioritäten für Slice 1b

### P1 · Login in dieselbe visuelle und sprachliche Anwendung integrieren

`auth-screen.tsx` nutzt `bg-neutral-50 dark:bg-slate-950` statt Canvas, generische englische Texte, flache Standardbuttons und kleine Standardinputs. Die neue Schrift und Teile der Farben sind global, die alte Komposition und Zustandsrezepte bleiben lokal bestehen. Alle Loginzustände auf gemeinsame Flächen-, Typo-, Eingabe- und Aktionsrollen bringen; beide Anmeldeverfahren erhalten. Labels und Texte auf Deutsch vereinheitlichen. Kein neues Authentifizierungssystem.

### P1 · Dauerhafte Labels und verständliche Auth-Zustände

E-Mail, Passwort und Code haben nur Platzhalter, keine zugeordneten Labels. Nachrichten sind ununterschiedene gedämpfte Texte ohne Live-/Alert-Semantik; rohe Backendfehler werden direkt angezeigt. „Magic Link“ verspricht einen Link, die Oberfläche fordert anschließend einen Code. Bestehenden Ablauf eindeutig benennen, Felder persistent beschriften, Autocomplete/Codeeingabe sinnvoll konfigurieren und Fehler mit verständlicher Wiederaufnahme verbinden. Neue Funktionen wie Passwort-Recovery oder Code-Resend sind kein automatischer Bestandteil von 1b und bleiben gesondert zu planen.

### P2 · Gemeinsame Komponenten und Farbrollen vollständig integrieren

Die Haptik liegt derzeit in `.parity-button`, die Felder in `.reading-input`; andere Verbraucher behalten Standardrezepte. Dashboard-Hinzufügen verwendet neutral/slate-Flächen und weichen Kartenschatten; Statusblöcke nutzen feste Rot-/Grünklassen; Diagramme eigene Farbwerte. Gemeinsame Varianten definieren, lokale Altstile gezielt ablösen, Status und Diagramme an Rollen binden. Ruhige sekundäre Aktionen brauchen nicht dieselbe Tiefe wie primäre Buttons. `color-scheme: light` und verbleibende `dark:`-Klassen auf widersprüchliche Zustände prüfen.

### P2 · Leeren Prognosezustand der vorhandenen Karte präzisieren

Die Beispieldaten zeigen einen vorhandenen Zählerstand und darunter dominant „Keine Daten“, „0,00 € / Jahr“ sowie „1 Ablesungen“. Fehlende Prognose ist nicht fehlende Ablesung. Als kleinere, konkrete Erklärung darstellen, warum noch keine Prognose vorliegt; Singular/Plural korrigieren. Fehlender Abschlag darf nicht ohne Grundlage als reale Null erscheinen. Keine neue Prognoseansicht oder Berechnungslogik im Integrationsslice; eventuelle Datenmodellfragen separat ausweisen.

## Heuristische Bewertung

Provisorische Bewertung des bestehenden Logins und seines Übergangs zur neuen Designsprache, **nicht** der gesamten Anwendung oder der Qualität von Slice 1. Auth-Ergebnisse wurden nicht live ausgelöst.

| Heuristik | Punkte (0–4) | Kernbefund |
| --- | --- | --- |
| Systemstatus | 2 | Loading vorhanden, Nachrichten nicht zugänglich angekündigt |
| Sprache der Nutzer | 1 | Englisch und Link/Code-Widerspruch |
| Kontrolle | 2 | Andere E-Mail möglich; Recovery begrenzt |
| Konsistenz | 1 | Alte Flächen/Controls, neue globale Typografie |
| Fehlerprävention | 2 | Native Pflichtfelder, Codehilfen fehlen |
| Wiedererkennen | 2 | Platzhalter verschwinden |
| Effizienz | 2 | Zwei Wege und Form-Submit, Autofill-Hinweise fehlen |
| Minimalismus | 3 | Überschaubare Komposition |
| Fehlerbehebung | 1 | Rohe Backendtexte ohne konkrete Hilfe |
| Hilfe | 1 | Kaum Erklärung zu Codeverfahren |
| **Gesamt** | **17/40** | Befund dient Priorisierung, keine Messung des Gesamtdesigns |

## Kognitive Last, emotionale Wirkung und Personas

Keine beobachtete Entscheidung mit mehr als vier Optionen. Der Login hat wenig Inhalt, erzeugt aber unnötige Denkarbeit durch verschwindende Feldnamen und Code/Link-Begriffe. Der Erfassungsdialog wirkt fokussiert; die Übersicht gewichtet den fehlenden Prognosezustand zu stark.

Die Erfassung vermittelt Verlässlichkeit. Der generische Login und rohe Fehler schaffen dagegen Unsicherheit vor dem eigentlichen Produkt; „Keine Daten“ nach einer sinnvollen ersten Ablesung entwertet gefühlt den Fortschritt.

- Neue Haushaltsnutzer müssen verstehen, ob ein Link oder Code erwartet wird.
- Tastatur-/Screenreader-Nutzer brauchen dauerhafte Labels und angekündigte Zustände.
- Ablenkung beim mobilen Ablesen macht eine klare erste Ablesung und ruhige sekundäre Informationen besonders wertvoll.

Kleine Beobachtung: Zählertyp und Einheit wiederholen sich im Dialog teils mehrfach. Nachrangig straffen, ohne Kontext zu verlieren. Entwicklungsbanner und Debugpanel wurden nicht als Produktionsfehler gewertet.

## Noch gemeinsam zu wählen

1. Flächen: bestehendes warmes Creme beibehalten und konsistent anwenden (Empfehlung), oder Canvas etwas heller/neutraler vergleichen. In beiden Fällen blaugraue Konturen und hellere Oberflächen erhalten.
2. Hierarchie: reine Stilangleichung oder zusätzlich den beschriebenen kleinen Prognose-Leerzustand verständlicher und leiser machen (Empfehlung). Keine neue fachliche Ansicht.

Umsetzung und Abnahmematrix: Slice 1b in `docs/frontend-redesign-plan.md`. Erst gemeinsame Login-/Übersicht-/Dialogansicht vergleichen, dann Komponentenregeln ausrollen. DESIGN.md erst mit tatsächlich entschiedenen Änderungen aktualisieren.
