# Token-System · 20.11.2026

Umstellung auf Primitive Colors → Semantic Colors → Component Colors. Die bestehende Creme-/Orange-Palette, Typografie, Abstände und Radien bleiben die Grundlage. Neu sind die vollständigen semantischen Rollen, vier konsistente Utility-Farben mit weißen Knockout-Inhalten sowie vollständige Button- und Formularzustände. Tertiary-Text und gedrücktes Orange wurden für den Kontrast geringfügig angepasst.

Quelle: `src/app/foundation.tokens.css`; Verwendung: `controls.css`, `globals.css`, Diagrammkomponente und migrierte Explorationsvorschauen. Architektur und API-Zuordnung stehen in `DESIGN.md`.

## Ergebnis

- `npm test -- --run`: 189 Tests in 28 Dateien bestanden. Recharts meldet in jsdom weiterhin fehlende Layoutmaße; die Browserdiagramme sind separat geprüft.
- `npx tsc --noEmit`: bestanden.
- `npm run lint -- --fix`: bestanden.
- `npm run build`: bestanden. Turbopack benötigte außerhalb der Sandbox lokale Prozess-/Portrechte.
- `node docs/verification/token-system/verify.mjs`: bestanden; Protokoll `browser-check.json`.
- Tokenreferenzen ohne fehlende Ziele oder Zyklen, fünf vollständige Buttonmatrizen; sämtliche Component Colors referenzieren Semantic Colors.
- 35 Text-/Flächenpaare erreichen mindestens 4,5:1, einschließlich aller acht Utility-/Knockout-Paare, Tertiary, Placeholder und primärem Active-Zustand. Browsermessung über relative CSS-Farbkonvertierung nach sRGB, ohne Canvas-Fingerprinting-Rauschen; geringe Rundungsabweichungen möglich.
- 24 tatsächliche Buttonzustände (sechs API-Varianten × normal/hover/active/disabled) entsprechen ihren Tokens. Tastaturoutline sichtbar; Fehlerkontur bleibt bei Fokus erhalten.
- Übersicht, Details, Anmeldung und Tokenkatalog bei 1280/390 px gerendert; kein horizontaler Dokumentüberlauf. Katalog zusätzlich bei 320 px und 200 % Schrift sowie Reduced Motion geprüft.
- Aufnahmen visuell geprüft: Übersicht auf Desktop, Details und Tokenkatalog mobil. Creme/Orange, Drucktiefe, Statusflächen und mobile Anordnung bleiben konsistent.

## Vorschau und Wiederholung

`PARITY_DESIGN_PREVIEW=1 npm run dev -- --hostname 127.0.0.1 --port 3010`, dann `/design/tokens` öffnen. Wie bei den bestehenden Vorschauen benötigt das Root-Layout eine Supabase-Konfiguration; für diese rein synthetische Prüfung wurden ausschließlich lokale Platzhalter verwendet. Es gab keine Anmeldung und keine Datenmutation. Der Katalog ist in Produktion gesperrt und liest Namen direkt aus der Foundation statt einen zweiten Wertekatalog zu pflegen.

Für das Skript optional `PREVIEW_URL`, `PLAYWRIGHT_MODULE` und `BROWSER_PATH` setzen. Standardwerte folgen den bereits vorhandenen lokalen Browserprüfungen. Ergebnisse und PNGs landen neben dem Skript.

Diese Prüfung umfasst keine echte Supabase-Persistenz, Geräte-/Screenreader- oder Cross-Browser-Abnahme. Visited wird als Token und Kontrastpaar geprüft; Browser schützen den tatsächlichen Besuchsstatus vor programmatischem Auslesen. Die bestehenden nativen Link-/Buttonsemantiken bleiben erhalten.

## OKLCH-Nachprüfung der Neutralfarben

Die bisherige Interpolation zwischen Tinte und Creme erzeugte vor allem bei schwachen Rahmen einen grünen Hue (152,4°); auch Secondary/Tertiary drifteten auf 240°/222,5°. Disabled und Highlight waren je nach Auflösung der schwach gesättigten Ausgangsfarben ebenfalls grünlich oder bläulich. Die neue Foundation verwendet ausschließlich explizite Farbprimitive und Aliase, keine dynamischen Farbmischungen.

Gezielt ergänzt: ink/500 und ink/600 für Tertiary/Secondary, neutral/100–300 für Disabled/Highlight/weak sowie vier helle Utility-Primitive mit den Hues ihrer jeweiligen kräftigen Variante. Grün bleibt eine Statusfarbe für Success/Erstattung.

`node docs/verification/token-system/audit-neutrals.mjs` prüft alle 148 Primitive/Semantic/Component Colors und die Farbwinkel/Buntheit der betroffenen Familien. `BEFORE_TOKENS=<Dateipfad>` ermöglicht den optionalen Vergleich mit einem alten rohen CSS-Snapshot. Die Vorher-Aufnahme injiziert diesen ohne Build-Transformationen; sie ist kein Screenshot des früheren Produktionsbuilds. Sehr schwach gesättigte Farben können im Browser einen bedeutungslosen Hue als `none` ausgeben.

`neutral-audit.json` enthält die finalen OKLCH-/Hexwerte und den alten Snapshot. `neutral-before-1280.png` und `neutral-after-1280.png` wurden visuell verglichen. Die erneuten 35 Kontrastpaare (mindestens 4,5:1), 24 Buttonzustände, Mobil-/Textvergrößerungsprüfungen, Lint und Produktionsbuild bestehen. Das Verification-Skript verwendet nun relative CSS-Konvertierung statt Canvas, um Browser-Fingerprinting-Rauschen bei Kontrastmessungen zu vermeiden.
