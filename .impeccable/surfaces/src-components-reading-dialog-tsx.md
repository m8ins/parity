---
version: 1
slug: "src-components-reading-dialog-tsx"
primary_target: "src/components/reading-dialog.tsx"
related_targets: ["src/components/dashboard.tsx","src/components/contract-card.tsx"]
---

# Ablesen · Slice 1

Mode: Operate. Nutzer steht am einzelnen Strom- oder Gaszähler. Umfang: vorhandenen Zähler finden, Datum/Stand erfassen, echte Supabase-Aktion, sichtbare Ablesung. Einrichtung und Prognosegestaltung bleiben außerhalb.

## Direction contract

THESIS: Ein unabhängiger Zähler mit eindeutigem Stand und geschützter Erfassung.
OWN-WORLD: Variante A bleibt Form-/Interaktionsherkunft; seit Slice 1b freigegebene Farbrichtung C „Sanftes Creme + Signalorange“. Atkinson Hyperlegible Next, sanfte Cremeflächen, Blaugrau, orange Hauptaktion, rote Fehler, klare Konturen und Knöpfe mit 4 px Drucktiefe. Einzige Tokenquelle: src/app/foundation.tokens.css; gemeinsame Controls: src/app/controls.css.
STORY: Zähler auswählen, Stand erfassen, speichern, Stand und Datum am richtigen Zähler wiederfinden. Fehler erlauben Wiederholen; Abbruch schützt Änderungen.
FIRST VIEWPORT: Übersicht zeigt Zählername, letzten Stand mit Einheit und Datum sowie „Stand erfassen“. Das kompakte Desktop-Modal beziehungsweise mobile Bottom Sheet zeigt Kontext, Datum, Messwert, vorherigen Stand, Speichern und Abbrechen. Dialogtypografie bleibt stabil.
FORM: seed: none (pinned). Nutzerauftrag: „Variante A ist der Nordstern“, „Desktop: kompaktes Modal“, „Mobil: Bottom Sheet, das von unten erscheint“. Signatur: Druckknopf und tatsächlich ziehbarer Sheet-Griff; kein Geräte-Dekor.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Prüfung mit festen synthetischen Fixtures. Browser-HTTP-Mocks sind ausdrücklich kein Nachweis realer Persistenz oder RLS. Fehlende lokale Infrastruktur und echte Mobilgerät-/Screenreaderprüfung offen ausweisen. Slice 1b integriert die gemeinsame Gestaltung; Erfassungsmechanik bleibt erhalten. Weitere fachliche Slices sind nicht begonnen. Aktuelle Regression und Grenzen: docs/verification/slice-1b/README.md und reading-regression/browser-check.json (zehn Prüfungen, 17 Aufnahmen).
