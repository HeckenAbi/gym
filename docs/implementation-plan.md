# Gym Battle – Lieferstatus und Betriebsgrenzen

## Implementiert

Die Next.js-/Supabase-App wurde um eine versionierte Community- und Workout-Sync-Schicht erweitert. Die Kern-Datenbankänderung liegt in `supabase/migrations/20261028230000_community_and_workout_sync.sql`; die Liga-Erweiterung in `supabase/migrations/20261029001000_group_league_scoring.sql`.

- **Private Gruppen:** Gruppen mit Zeitzone, Owner/Admin/Member-Rollen und mitgliedschaftsgebundenem Zugriff. Owner können die Inhaberschaft übertragen oder die Gruppe mit bestätigter Aktion archivieren; Admins/Member können austreten.
- **Einladungen:** zufällige Einmal-Tokens, in der Datenbank nur als SHA-256-Hash, sieben Tage gültig, widerrufbar, atomarer Join nach Authentifizierung. Die Vorschau vor dem Beitritt verrät keine Trainingsinhalte. Owner/Admin können Einladungen erstellen und verwalten.
- **Feed und soziale Interaktion:** Trainings bleiben privat, sofern sie beim Abschluss nicht ausdrücklich für eine Gruppe freigegeben werden. Gruppenmitglieder sehen nur Beiträge ihrer Gruppe; Kommentare und Reaktionen sind ebenfalls mitgliedschaftsgebunden. Freigaben lassen sich zurückziehen.
- **Wochenwertung ohne Obergrenze:** ein Punkt je qualifiziertem, ausdrücklich geteiltem Trainingstag; höchstens ein Punkt pro Person und lokalem Gruppentag, aber keine wöchentliche Punkteobergrenze. Mindestens drei gültige Sätze und zehn Wiederholungen sind nötig; Gewicht null ist zulässig.
- **Wertungsschutz:** Punktequalifikation wird beim Teilen gespeichert. Abschluss und Teilen müssen in derselben Gruppenwoche liegen; spätere Freigaben verändern keine abgeschlossenen Wochen. Direkte Client-Inserts abgeschlossener Workouts und direkte Updates des Abschlusszeitpunkts sind gesperrt. Wird die Freigabe widerrufen, verschwindet der Beitrag samt Punkt.
- **Vier-Wochen-Saison:** feste, gruppenzeitzonenbasierte Saisonblöcke. Die Summe der drei besten Wochen von vier bestimmt den Saisonstand. Aktuelle und vorherige Saison werden angezeigt.
- **Crew-Challenge:** wöchentliches Gemeinschaftsziel von zwei qualifizierten Trainingstagen je aktivem Mitglied. Die UI zeigt, wie viele Mitglieder ihr Teilziel erreicht haben; ein gemeinsames Abzeichen vergibt keine zusätzlichen individuellen Ranglistenpunkte.
- **Autosave und Abschluss:** revidierte Draft-RPCs, sichtbarer UI-Synczustand und atomarer/idempotenter Workout-Abschluss. Konflikte werden nicht still überschrieben.
- **Offline-Sync:** IndexedDB-Outbox hält Trainingsdaten lokal und synchronisiert nach Netzwiederkehr. Bei Cloud-Konflikt wählt der Nutzer explizit die lokale oder Cloud-Version; wenn der Cloud-Draft nicht mehr existiert, kann die lokale Version als neuer Cloud-Draft gespeichert werden.
- **Mobile Oberfläche:** Gruppenrouten sind in die vorhandene responsive App-Navigation eingebunden und behalten das bestehende Premium-Grau-/Milchglasdesign. Gruppenerstellung prüft die IANA-Zeitzone vorab und gibt spezifische Hinweise für fehlende RPC-/Migration, Anmeldung, Zeitzone und Verbindung aus.

## Sicherheits- und Datenschutzgrenzen

RLS ist die Sicherheitsgrenze. Gruppen- und Sync-Tabellen sind nicht für beliebige direkte Client-Schreibzugriffe freigegeben; eng begrenzte `SECURITY DEFINER`-RPCs prüfen Authentifizierung, Eigentum und Mitgliedschaft. Alle Definer-Funktionen setzen einen festen `search_path`. Invite-Roh-Tokens werden nicht serverseitig gespeichert; E-Mail-Adressen werden nicht in Profile/Feed eingebaut. Gruppen sind nicht global auffindbar; es gibt keine öffentlichen Profile, öffentlichen Posts oder Direktnachrichten.

## Prüfung

`npm run lint`, `npx tsc --noEmit`, `git diff --check`, `npm run test:community-db` und der Next.js-Produktionsbuild mit nicht echten Supabase-Platzhalterwerten waren für den aktuellen Branch erfolgreich. Die isolierte PGlite-Suite führt beide Migrationen gegen ein minimales Gym-Basisschema aus und prüft unter anderem RLS, Mindestsatz-/Wiederholungsregel, manipulationssichere Abschlusszeit, einen Punkt pro Trainingstag ohne Wochenlimit, verspätete Freigaben, Top-3-von-4-Wochen und das Gruppen-Wochenziel.

## Noch notwendiger Schritt vor Live-Betrieb

Die Migrationen wurden **nicht** auf einem unbekannten oder produktiven Supabase-Projekt ausgeführt. Vor Deployment müssen die tatsächlichen Basistabellen/-spalten und vorhandenen Policies des Zielprojekts gegen beide Migrationen geprüft und der Ablauf auf einer isolierten Supabase-Staging-Instanz mit getrennten Nutzern getestet werden. Der PGlite-Test simuliert Auth über `auth.uid()`; er ersetzt keine Prüfung von Supabase Auth, PostgREST oder der Konfiguration des konkreten Projekts.

Die zuvor bereitgestellte Handyvorschau nutzte `https://example.supabase.co` und einen Platzhalter-Publishable-Key; sie kann daher die Oberfläche, aber keine echten Anmelde-, Gruppen-, Cloud- oder Syncabläufe testen. Offline-Synchronisierung funktioniert für eine bereits geöffnete App mit lokal verfügbaren Browserressourcen; PWA-Installation und Erststart ohne Netzwerk sind nicht enthalten.

## Animierte Übungsbibliothek

Die Bibliothek enthält genau 50 Übungen: 25 Kurzhantel- und 25 Kabelturm-Übungen. Jede Übung hat eine SVG-Bewegungsillustration, Gerät/Muskelgruppe, deutsche und gebräuchliche alternative Suchbegriffe sowie konkrete Hinweise zu Ausführung und typischen Fehlern. Nutzer können nach Name, Synonym, Muskelgruppe oder Gerät filtern, eine Detailansicht öffnen und die Übung direkt zum Trainingsentwurf hinzufügen. Animationen starten nur im sichtbaren Bereich und respektieren reduzierte Bewegung; es sind Vektor-Loops statt gefilmter Videos.

Hauptdateien: `src/data/exercise-library.ts`, `src/components/ExerciseAnimation.tsx`, `app/library/page.tsx`, `app/training/page.tsx` und `public/manus-routes.json`.
