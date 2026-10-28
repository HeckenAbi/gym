# Gym Battle – Lieferstatus

## Umgesetzt

- [x] **Private Gruppen und Mitgliedschaften:** private Erstellung, Gruppenzeitzone, Owner/Admin/Member-Rollen, gruppenbezogene Mitgliederliste, kontrollierte Owner-Übergabe, Austritt und bestätigte Archivierung. Keine globale Profilsuche, öffentlichen Profile oder E-Mail-Suche.
- [x] **Einladungen:** Einmal-Link, sieben Tage gültig, widerrufbar, nur Token-Hash in der Datenbank; minimierte Vorschau und authentifizierter, atomarer Beitritt. Owner/Admin können Einladungen erstellen und verwalten.
- [x] **Opt-in Feed:** Training bleibt privat, bis beim Abschluss explizit eine Gruppe freigegeben wird. Nur Gruppenmitglieder sehen freigegebene Details; Besitzer können die Freigabe zurückziehen. Kommentare und Reaktionen sind gruppenbeschränkt.
- [x] **Wochenrangliste:** gruppenlokale Woche, geteilte Trainingstage zählen maximal einmal täglich und höchstens fünf Punkte pro Woche. Gleichstand teilt Rang; Trainingsvolumen und Körperdaten zählen nicht.
- [x] **Cloud-Autosave und atomarer Abschluss:** versionierte Drafts, sichtbarer Syncstatus, Idempotenz, atomarer Abschluss samt Sätzen und optionaler Freigabe; Konflikte überschreiben nichts still.
- [x] **Offline-Sync:** IndexedDB-Outbox und automatische Wiederholung bei Netzwiederkehr. Konflikte erfordern eine bewusste Auswahl; lokaler Entwurf kann notfalls als neuer Cloud-Draft gespeichert werden. PWA-Erststart ohne Netz ist nicht enthalten.
- [x] **Animierte Übungsbibliothek:** genau 50 Übungen (25 Kurzhantel, 25 Kabelturm) mit loopenden Vektor-Demos, Geräteanzeige, kurzen Technikhinweisen, häufigen Fehlern und Namen-/Synonym-/Muskelgruppen-/Gerätesuche. Detailansicht mit direkter Übernahme in den laufenden Trainingsentwurf; mobil nutzbar, Kartenanimationen starten erst im sichtbaren Bereich und beachten „Bewegung reduzieren“. Es sind schematische SVG-Loops, keine gefilmten Videos.
- [x] **Qualitätsprüfungen:** ESLint, TypeScript, Produktionsbuild mit Platzhalter-Supabase-Werten, `git diff --check` und Datenbanktest `npm run test:community-db` erfolgreich.

## Noch vor Produktivbetrieb erforderlich

- [ ] Die Migration `supabase/migrations/20261028230000_community_and_workout_sync.sql` anhand des tatsächlichen Supabase-Basisschemas prüfen und zunächst auf einer isolierten Supabase-Staging-Instanz mit getrennten Auth-Nutzern ausführen. Sie wurde nicht auf ein unbekanntes oder produktives Projekt angewendet; der PGlite-Test ersetzt keine Supabase-Auth-/PostgREST-/Projektkonfigurationsprüfung.
