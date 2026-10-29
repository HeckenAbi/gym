# Gym Battle – Lieferstatus

## Umgesetzt und lokal geprüft

- [x] Private Gruppen, Rollen, geschützte Einladungen, Opt-in-Feed, Kommentare/Reaktionen, Owner-Übergabe und Archivierung.
- [x] Unbegrenzte Wochenwertung: ein Punkt pro qualifiziertem lokalem Trainingstag, maximal ein Punkt pro Tag, mindestens drei Sätze und zehn Wiederholungen; keine rückwirkende Wertung.
- [x] Vier-Wochen-Saison mit Summe der drei besten Wochen und kooperatives Wochenziel ohne individuelle Bonuspunkte.
- [x] Revisioniertes Cloud-Autosave, atomarer Abschluss, IndexedDB-Outbox und bewusste Konfliktauflösung.
- [x] Übungsbibliothek mit genau 50 Übungen (25 Kurzhantel/25 Kabelturm), animierten Vektor-Demos, Suche, Technikhinweisen und Trainingsübernahme.
- [x] Legacy-Kompatibilität getestet: Spaltenumstellung, alte RLS-Policies, alte Helper-Signatur, Token-Hashing und Erhalt der privaten Workouts.
- [x] `npm run test:community-db` besteht auf frischem und auf Legacy-Schema; ESLint, TypeScript, Produktionsbuild und `git diff --check` bestanden.

## Noch offen

- [ ] **Live-Supabase anwenden:** nur Metadaten, Spalten, Policies und aggregierte Zählungen gelesen; keine Datenbankänderung ausgeführt. Die drei Migrationen ändern Schema und RLS des Projekts „Gym Battle“. Vor der Anwendung ist deine ausdrückliche Freigabe erforderlich; danach echte Auth-/PostgREST-Tests mit getrennten Nutzern durchführen.
- [ ] Training: Client- und SQL-Eingabegrenzen angleichen und laufenden Cloud-Autosave beim Verlassen sichtbar abschließen.
- [ ] Trainingsdetails: „Abbrechen“ setzt lokale Änderungen zurück; mehrere Detailänderungen atomar speichern.
- [ ] Navigation/Auth: Verlauf als aktive Route markieren und Rücksprungadresse nach direktem `/groups`-Login erhalten.
