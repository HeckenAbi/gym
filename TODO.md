# Gym Battle – Lieferstatus

## Umgesetzt

- [x] **Private Gruppen und Mitgliedschaften:** private Erstellung, Gruppenzeitzone, Owner/Admin/Member-Rollen, mitgliedschaftsgebundene Übersicht, kontrollierte Owner-Übergabe, Austritt und bestätigte Archivierung. Keine globale Profilsuche, öffentlichen Profile oder E-Mail-Suche.
- [x] **Einladungen:** einmalig verwendbarer, sieben Tage gültiger und widerrufbarer Link; nur Hash in der DB. Minimale Vorschau ohne private Inhalte und atomarer Beitritt erst nach Authentifizierung. Owner/Admin können Einladungen verwalten.
- [x] **Opt-in Feed:** Trainings bleiben privat, bis beim Abschluss ausdrücklich eine Gruppe freigegeben wird. Mitglieder sehen nur Beiträge ihrer Gruppe; Besitzer können die Freigabe zurückziehen. Kommentare und Reaktionen sind gruppenbeschränkt.
- [x] **Gruppenerstellung diagnostizieren:** gültige IANA-Zeitzone wird vor dem Speichern geprüft. Die Oberfläche unterscheidet Hinweise für fehlende RPC-/Migration, Sitzung/Berechtigung, Zeitzone und nicht erreichbare Supabase-Verbindung.
- [x] **Wochenpunkte ohne Wochenobergrenze:** genau ein Punkt pro qualifiziertem, ausdrücklich geteiltem Trainingstag in der Gruppenzeitzone; mehrere Trainings am selben lokalen Tag zählen einmal. Keine maximale Punktzahl pro Woche. Ein Training braucht mindestens drei gültige Sätze und insgesamt zehn Wiederholungen; Gewicht 0 ist zulässig. Die Freigabe muss in derselben Gruppenwoche wie der Abschluss erfolgen; sie kann keine abgeschlossene Woche rückwirkend verändern.
- [x] **Vier-Wochen-Saison:** feste gruppenzeitzonenbasierte Blöcke; Saisonwertung ist die Summe der drei besten Wochen von vier. Weder Last noch Trainingsvolumen werden gewertet. Aktuelle und vorherige Saison sind sichtbar.
- [x] **Kooperative Crew-Challenge:** gemeinsames Wochenziel von zwei qualifizierten Trainingstagen je aktivem Mitglied. Fortschritt ist sichtbar; bei Erfolg erhält die Gruppe ein gemeinsames Abzeichen ohne individuelle Bonuspunkte.
- [x] **Punktetransparenz und Integrität:** Feed zeigt den Punktstatus; Punkte werden serverseitig dedupliziert und beim Teilen snapshot-basiert vergeben. Direkte Clientänderung des Abschlusszeitpunkts und direkte Inserts abgeschlossener Workouts sind gesperrt; Privatmachen entfernt den zugehörigen Punkt.
- [x] **Cloud-Autosave und Offline-Sync:** revisionierte Drafts, sichtbarer Syncstatus, atomarer Abschluss, IndexedDB-Outbox und explizite Konfliktwahl. Offline-Erststart/PWA ist nicht enthalten.
- [x] **Animierte Übungsbibliothek:** exakt 50 Übungen (25 Kurzhantel, 25 Kabelturm) mit loopenden SVG-Demos, Namen-/Synonym-/Muskelgruppen-/Gerätesuche, Technikhinweisen, häufigen Fehlern und direkter Übernahme in den Trainingsentwurf. Mobil nutzbar, Animationen nur bei sichtbaren Karten und respektieren reduzierte Bewegung. Schematische Vektordemos, keine gefilmten Videos.
- [x] **Prüfungen:** ESLint, TypeScript, `git diff --check`, Produktionsbuild mit Platzhalterwerten und `npm run test:community-db` bestanden. Der PGlite-Test prüft beide Migrationen, RLS, Qualifikation, Tagesdoppel, sieben Punkte in einer Woche, späte Freigaben, Saisonwertung und Crew-Challenge.

## Vor Live-Betrieb bzw. separate Nacharbeit

- [ ] Beide Migrationen mit dem echten Supabase-Basisschema abgleichen und zuerst auf einer isolierten Staging-Instanz mit getrennten Nutzern ausführen. Die bisherige Handyvorschau verwendet Platzhalter und ist nicht mit einer echten Supabase-Datenbank verbunden.
- [ ] Training: Client- und SQL-Eingabegrenzen angleichen; beim Verlassen sicherstellen, dass der laufende Cloud-Autosave-Flush abgeschlossen oder sichtbar ausstehend ist.
- [ ] Trainingsdetails: „Abbrechen“ muss lokale Änderungen zurücksetzen; mehrere Detailänderungen sollten atomar gespeichert werden.
- [ ] Navigation/Auth: den Verlauf als aktive Route markieren und die Rücksprungadresse nach direktem `/groups`-Login erhalten.
