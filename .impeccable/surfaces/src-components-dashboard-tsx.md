---
version: 1
slug: "src-components-dashboard-tsx"
primary_target: "src/components/dashboard.tsx"
related_targets: ["src/components/contract-form.tsx"]
---

# Einrichtung · Slice 2

Mode: Operate. Erweiterung der bestehenden Zählerübersicht, keine neue visuelle Welt. Atkinson, Creme/Orange, Konturen und plastische Buttons aus foundation.tokens.css/controls.css bleiben verbindlich.

Task: Strom oder Gas unabhängig mit Zeitraum beliebiger Dauer, Anbieter, Anfangskonditionen und Anfangsablesung nutzbar machen. Geschützter bestehender Dialog, drei Schritte; Zurück erhält Angaben, Fehler nennt nächsten Schritt, bestätigter Erfolg bleibt lesbar bis „Zur Übersicht“. Ein unklarer Speicherauftrag wird im selben Konto/Sitzung nach Reload sicher wiederaufgenommen. Keine Änderungen an Auth/Prognose oder späterer Verwaltung.

Pflichtfelder begründet in docs/verification/slice-2/README.md. Anbieter/Ende optional, exklusive Endgrenze erklärt. Keine implizite Null, keine geschätzten Gasdaten. Mobile vertikal scrollbar; Feldlabels/Einheiten/Fehler, Tastaturfokus, 200 % und Reduced Motion prüfen. Synthetische Bilder und echte lokale Auth/Persistenz/RLS separat nachweisen. Kein nachträgliches Reparieren des bestehenden Sidecars.
