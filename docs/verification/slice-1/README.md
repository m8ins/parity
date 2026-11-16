# Slice 1 „Ablesen“ · Umsetzung und Abnahme

Stand: 15.11.2026. Implementiert; technische Prüfungen bestanden. **Reale Supabase-Persistenzabnahme und physische Mobilgeräteprüfung bleiben offen.** Slices 2–6 wurden nicht begonnen. Kein Push, Merge oder Deployment.

## Umsetzung

- Zählerübersicht mit letztem Stand, richtiger Einheit und Datum; jeder vorhandene Zähler bietet „Stand erfassen“. Bestehende Prognosen, Zeitraumauswahl, Details, Einrichtung und Verwaltungsaktionen bleiben verfügbar. Die vorhandene Prognosekarte wird nicht neu konzipiert; ihre Zahlen werden deutsch formatiert.
- Ein Formular und ein Supabase-Datenweg für kompaktes Desktop-Modal und mobiles Bottom Sheet. Die vorhandene `readings`-Insert-/Select-Aktion und der bestehende `loadMeterData`-Loader bleiben erhalten. Kein Schema-/RLS-/Berechnungswechsel.
- Ausschließlich der mindestens 44 px hohe Griff verarbeitet Pointer-/Touch-Ziehen. Die Oberfläche folgt dem Finger; ausreichendes vertikales Ziehen schließt beziehungsweise fragt bei Änderungen nach. Horizontales Ziehen, Formularscrollen, Eingabe und Auswahl sind keine Dismiss-Gesten. Griff ist zusätzlich beschriftet und per Tastatur aktivierbar; „Abbrechen“ bleibt erreichbar.
- Hintergrund schließt nicht. Escape, Griff und Abbrechen schützen Änderungen. Radix übernimmt Fokusbegrenzung und Rückgabe. Pending sperrt Eingabe, Schließen und Mehrfachübermittlung synchron. Fehler bleiben im Dialog, behalten Eingaben und bieten Wiederholen. Erfolg schließt und bestätigt Wert/Datum an der richtigen Karte über `role=status`.
- Gemeinsame Quelle `src/app/foundation.tokens.css`: Primitive → semantische Rollen → Komponenten. Tailwind-Typografieskala und shadcn-Farbvariablen sind daran gebunden; die Tokenprobe importiert dieselbe Quelle. Lokales Atkinson inklusive Lizenz, echte tabellarische Ziffern, rote Fehlerrolle, stabile Formulargrößen, feste Messwertstufen, begrenzt fluide Seitentitel und äußere Ränder. Variante-A-Drucktiefe und Reduced Motion umgesetzt.
- Internes Panel ausschließlich in Entwicklung; Auswahl der einzigen freigegebenen Palette und Zurücksetzen, keine Datenzugriffe. `/design/reading` ist zusätzlich nur bei `PARITY_DESIGN_PREVIEW=1` und Development zugänglich. Die Route hat fixe synthetische Fixtures und verwendet die normalen Komponenten. Es gibt keine simulierte Speicherimplementierung im Produkt: HTTP-Antworten werden ausschließlich vom Browser-Prüfskript abgefangen.

## Ergebnis je Abnahmekriterium

| Kriterium | Ergebnis / Nachweis |
| --- | --- |
| Strom und Gas einzeln erfassbar | Bestanden mit Komponenten-/Flowtests und Browsermatrix; jeder Request enthält nur die gewählte Meter-ID und ihre Einheit. |
| Übersicht → Erfassung → Speicheraktion → sichtbare Ablesung | Bestanden gegen synthetischen Adapter und Browser-HTTP-Mocks; echte Supabase-Insert-/Select-Kette im Anwendungscode erhalten. Wert, Datum und Status nur an der richtigen Karte aktualisiert. |
| Nach Neuladen persistent am richtigen Zähler | **Reale Abnahme offen.** Flowtest lädt gespeicherte Fixture-Daten erneut durch den bestehenden Loader; das ist kein Datenbank-/Browser-Reload-Nachweis. |
| Bestehende fachliche Prüfungen | Bestanden: gültiges Datum, keine Zukunft, nichtnegativer Wert. Explizite Null gültig; leere Eingabe kein implizites Nullspeichern. Deutsche Gruppierung/Dezimalkomma eindeutig geparst, ungültige Kalenderdaten abgewiesen. Keine neue Monotonie-, Zeitraum- oder Nachkommastellenregel. Gas bleibt in m³, keine Umrechnung beim Speichern. Bestehende Rechen-/Vertrags-/Datentests bestehen. |
| Fehler / Wiederholen / Abbrechen / Änderungsschutz | Bestanden in Tests und Browser: Fehlerantwort und geworfener Verbindungsfehler, Eingabeerhalt, Wiederholen, Escape/Abbrechen/Wischen mit Schutzdialog, Fortsetzen und Verwerfen; Hintergrundschutz. |
| Speichersperre / Mehrfachübermittlung | Bestanden: Readonly-Felder, deaktivierte Aktionen, synchroner Ref-Guard und unveränderter Request-Snapshot; kein Schließen während Pending. |
| Desktop-Modal / mobiles Sheet / echte Geste | Bestanden bei 320/390/768/1280 px; CDP erzeugt native `isTrusted` Touch-Pointerevents. Sauberes Wischen schließt, geändertes fragt nach; horizontale Geste und Formularscrollen schließen nicht. Screenshot während tatsächlichem Ziehen vorhanden. |
| Tastatur / Fokus / zugänglicher Titel | Bestanden im Browser und Komponententests: Titel/Labels, Feldfehlerbeschreibung, Fokus auf ungültigem Feld, Tab im Dialog, Rückgabe zum Auslöser. Physischer Screenreader nicht geprüft. |
| Bildschirmtastatur / Safe Areas / kleine Viewports | Umsetzung über VisualViewport-Resize/Scroll, dynamische maximale Höhe, scrollbare Inhalte und Safe-Area-Inset. 390×430 px als reduzierte nutzbare Höhe geprüft, Aktionen erreichbar. **Keine reale iOS-/Android-Bildschirmtastatur oder Hardware-Safe-Area-Abnahme.** |
| Lange Zahlen / deutsche Formate / Präzision | Bestanden: 24.681,7 kWh und 999.999,999 m³, weitere Präzision im Domänentest, Tausenderpunkte/Komma, Datum deutsch. Keine pauschale Rundung von Ablesungen. Lange Übersichts-Zahlen bei Vergrößerung lokal scrollbar. |
| Textvergrößerung / Textabstände | Bestanden bei 320×568 px, 200 Prozent Schrift plus 0,12em Zeichenabstand, 0,16em Wortabstand, 1,5 Zeilenhöhe. Kein Dokumentüberlauf; Aktionen erreichbar; Aktionswörter bleiben vollständig. Kleine Ansicht nutzt feste kompakte Abstandsstufen, keine kleinere Schrift. |
| Reduced Motion | Bestanden: Einfahranimation und Übergänge ausgeschaltet, Dialog/Geste/Speichern funktionieren ohne Animation. |
| Variante-A-Knopf / Font | Bestanden im Browser: tatsächlicher Zeigerdruck mit 4 px Bewegung, 70 ms Drücken und 110 ms Lösen; DOM-Ziffernbreiten bei geladenem Atkinson 400/600/700 jeweils identisch unter `tabular-nums`. |
| Kontoisolation | Vorhandene Supabase-Auth und meterbezogene RLS-Policies unverändert. **Live-RLS-Gegenprobe mit zwei Testkonten offen.** |
| Visuelle Prüfung | 17 wesentliche Screenshots gerendert und geöffnet. Unabhängiger Review fand einen Vergrößerungsfehler; korrigiert, vollständige Matrix neu aufgenommen, Verdict Pass `ship` für diesen Fixumfang. Siehe [REVIEW.md](REVIEW.md). |

## Ausgeführte Checks

| Befehl / Check | Ergebnis |
| --- | --- |
| `npm test -- --run` | **46 Tests in 8 Dateien bestanden.** React/Radix meldet im Escape-Dialogtest `act`-/Suspense-Testwarnungen; keine fehlgeschlagenen Assertions. [Log](tests.log) |
| `npm run lint` | **0 Fehler**, 3 vorhandene Warnungen in Header, Contract-Interaktionstest und Calculation-Test. Drittanbieter-Skillbündel und das historische isolierte CJS-Labor sind gezielt aus dem App-Lint ausgeschlossen. [Log](lint.log) |
| `npx tsc --noEmit` | Bestanden; TypeScript außerdem im abschließenden Build bestanden. |
| `npm run build` | **Bestanden**, inklusive TypeScript, Seitengenerierung und Optimierung. Erster Sandbox-Versuch scheiterte an Turbopacks lokalem Portbedarf; Wiederholung mit lokaler Ausführungsfreigabe erfolgreich. [Log](build.log) |
| Browser-Prüfskript | **PASS**: 10 Prüfeinträge, native Touch-Ereignisse, Wortfragmentprüfung, 3 Fontgewichte; keine Page Errors. HTTP-Fehlerantwort ist absichtlich erzeugt. [Maschinenlesbares Protokoll](browser-check.json) |
| Impeccable-Detector | Einmal ausgeführt, `[]`. [Ergebnis](impeccable-check.json) |
| `git diff --check` | Bestanden. |

Build-Erfolg ohne Laufzeitkonfiguration ist kein funktionierender Login-/Datenbanknachweis.

## Reproduktion der synthetischen Browserprüfung

Keine neue Projektabhängigkeit. Benötigt eine bereits vorhandene Playwright-Installation und einen Browser; Pfade sind per Umgebungsvariable austauschbar.

```sh
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=synthetic-preview-key \
PARITY_DESIGN_PREVIEW=1 \
npm run dev -- --webpack --hostname 127.0.0.1 --port 3000
```

In einem zweiten Terminal:

```sh
PLAYWRIGHT_MODULE=/absoluter/pfad/zu/playwright \
BROWSER_PATH=/absoluter/pfad/zum/browser \
node docs/verification/slice-1/verify.mjs
```

Das Skript fängt ausschließlich die synthetische Loopback-Supabase-URL ab. Es schreibt Screenshots während des Laufs in ein temporäres Verzeichnis und kopiert sie erst danach hierher, damit Ausgabedateien den Entwicklungsserver nicht während der Interaktionen neu laden. Es wartet vor Gesten auf das Ende der Einfahranimation und vor Aufnahmen auf endliche Animationen.

## Fehlende lokale Infrastruktur und verbleibende Abnahme

- Keine `.env.local`; auch `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` fehlen in der normalen Shell-Umgebung. Dummywerte wurden nur für die isolierte Vorschau gesetzt.
- `docker info` scheitert: der konfigurierte Socket `/Users/martin/.orbstack/run/docker.sock` ist nicht vorhanden. Somit kein erreichbarer lokaler Supabase-Stack. Kein Datenbankreset oder Schreiben in echte Konten durchgeführt.
- Für die reale Persistenzabnahme: OrbStack/Docker und `supabase start`, lokale URL/Publishable-Key konfigurieren, einen dedizierten synthetischen Testnutzer mit Strom-/Gaszählern vorbereiten (bestehende Seed-Anleitung beachten). Beide einzeln erfassen, Browser wirklich neu laden, Werte/Datum am richtigen Zähler und Live-RLS mit zweitem Konto prüfen. Nicht gegen echte Haushaltsdaten testen und keine Datenbank mit unbekanntem Inhalt zurücksetzen.
- Physische Bildschirmtastatur/Safe Areas auf iOS oder Android und Screenreader sind noch manuell zu prüfen. Der kleine Chromium-Viewport simuliert ausschließlich die verfügbare Fläche.
- Die vorbestehende Änderung an `supabase/config.toml` blieb unangetastet. Ergänzt wurden die Slice-bezogenen Impeccable-Metadaten (Surface-Brief und referenzierender Design-Sidecar). DESIGN.md und Plan wurden wie ausdrücklich beauftragt zusammengeführt; die Exploration wurde nur für die gemeinsame Tokenquelle und deren Reproduktion angepasst.

## Screenshots

Desktop:

- [Übersicht](screenshots/desktop-overview.png)
- [Modal](screenshots/desktop-modal.png)
- [Echter Druckzustand](screenshots/desktop-pressed.png)
- [Validierungsfehler](screenshots/desktop-validation.png)
- [Verwerfen bestätigen](screenshots/desktop-discard.png)
- [Speicherfehler](screenshots/desktop-save-error.png)
- [Speichern gesperrt](screenshots/desktop-saving.png)
- [Gespeicherter Stand und Status](screenshots/desktop-saved.png)

Mobil:

- [Übersicht](screenshots/mobile-overview.png)
- [Gas-Sheet mit langem Wert](screenshots/mobile-sheet-gas.png)
- [Tastaturfokus](screenshots/mobile-keyboard-focus.png)
- [Während echter Touch-Ziehbewegung](screenshots/mobile-swipe-in-progress.png)
- [Änderungsschutz nach Wischen](screenshots/mobile-swipe-discard.png)
- [Gas gespeichert](screenshots/mobile-gas-saved.png)
- [200 Prozent Schrift und Textabstände](screenshots/mobile-200percent-text.png)
- [Kleiner nutzbarer Viewport](screenshots/mobile-short-viewport.png)
- [Reduzierte Bewegung](screenshots/mobile-reduced-motion.png)
