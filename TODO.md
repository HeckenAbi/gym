# Gym Battle – Lieferstatus

## Umgesetzt

- [x] **Private Gruppen und Mitgliedschaften:** private Erstellung, Gruppenzeitzone, Owner/Admin/Member-Rollen, gruppenbezogene Mitgliederliste, kontrollierte Owner-Übergabe, Austritt und bestätigte Archivierung. Keine globale Profilsuche, öffentlichen Profile oder E-Mail-Suche.
- [x] **Einladungen:** Einmal-Link, sieben Tage gültig, widerrufbar, nur Token-Hash in der Datenbank; minimierte Vorschau und authentifizierter, atomarer Beitritt. Owner/Admin können Einladungen verwalten.
- [x] **Opt-in Feed:** Training bleibt privat, bis beim Abschluss explizit eine Gruppe ausgewählt wird. Nur Mitglieder der Gruppe sehen freigegebene Details; Besitzer können privat schalten. Kommentare und Reaktionen sind gruppenbeschränkt.
- [x] **Wochenrangliste:** gruppenlokale Woche/Zeitzone, geteilter abgeschlossener Trainingstag zählt maximal einmal, maximal fünf Punkte pro Woche, Gleichstand teilt Rang. Private Einheiten, Trainingsvolumen und Körperdaten fließen nicht ein.
- [x] **Cloud-Autosave und atomarer Abschluss:** versionierte Drafts, sichtbarer Syncstatus, Idempotenz, Abschluss samt Sätzen und optionaler Gruppenfreigabe in einer Transaktion. Konflikte überschreiben nichts still.
- [x] **Offline-Logging und Synchronisierung:** lokales IndexedDB-Logging, Outbox und automatische Wiederholung bei Netzwiederkehr. Nutzer entscheidet bei Konflikt; auch wenn der Cloud-Draft verschwunden ist, kann lokal als neuer Cloud-Draft gespeichert werden. Funktioniert nach dem Öffnen der App; PWA-Erststart ohne Netz ist nicht enthalten.
- [x] **Prüfungen:** ESLint, TypeScript, Next-Produktionsbuild und reproduzierbarer PGlite-Datenbanktest mit getrennten Nutzeridentitäten. Testskript: `supabase/tests/community-migration.test.mjs`; Ausführung mit `npm run test:community-db`.

## Noch vor Produktivbetrieb erforderlich

- [ ] Die Migration `supabase/migrations/20261028230000_community_and_workout_sync.sql` anhand des tatsächlichen Supabase-Basisschemas prüfen und zunächst auf einer isolierten Supabase-Staging-Instanz mit getrennten Auth-Nutzern ausführen. Sie wurde nicht auf ein unbekanntes oder produktives Projekt angewendet; der PGlite-Test ersetzt keine Supabase-Auth-/PostgREST-/Projektkonfigurationsprüfung.
