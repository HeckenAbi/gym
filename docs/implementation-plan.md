# Gym Battle – Lieferstatus und Betriebsgrenzen

## Implementiert

Die vorhandene Next.js-/Supabase-App wurde um eine versionierte Community- und Workout-Sync-Schicht erweitert. Die Datenbankänderung liegt in `supabase/migrations/20261028230000_community_and_workout_sync.sql`.

- **Private Gruppen:** Gruppen mit Zeitzone, Owner/Admin/Member-Rollen und mitgliedschaftsgebundenem Zugriff. Owner können die Inhaberschaft übertragen oder die Gruppe mit bestätigter Aktion archivieren; Admins/Member können austreten.
- **Einladungen:** zufällige Einmal-Tokens, in der Datenbank nur als SHA-256-Hash, sieben Tage gültig, widerrufbar, atomarer Join nach Authentifizierung. Die Vorschau vor dem Beitritt verrät keine Trainingsinhalte. Owner/Admin können Einladungen erstellen und verwalten.
- **Feed und soziale Interaktion:** Trainings bleiben privat, sofern sie beim Abschluss nicht ausdrücklich für eine Gruppe freigegeben werden. Gruppenmitglieder sehen nur Beiträge ihrer Gruppe; Kommentare und Reaktionen sind ebenfalls mitgliedschaftsgebunden. Freigaben lassen sich zurückziehen.
- **Rangliste:** Serverberechnung nach abgeschlossenen und explizit geteilten Trainings, Gruppe-Zeitzone und lokalem Kalendertag; höchstens fünf Punkte pro Woche, Gleichstand teilt den Rang. Volumen und Körperdaten sind keine Wertung.
- **Cloud-Autosave und Abschluss:** revidierte Draft-RPCs, sichtbarer UI-Synczustand und atomarer/idempotenter Workout-Abschluss. Konflikte werden nicht still überschrieben.
- **Offline-Sync:** IndexedDB-Outbox hält Trainingsdaten lokal und synchronisiert nach Netzwiederkehr. Bei Cloud-Konflikt wählt der Nutzer explizit die lokale oder Cloud-Version; wenn der Cloud-Draft nicht mehr existiert, kann die lokale Version als neuer Cloud-Draft gespeichert werden.
- **Mobile Oberfläche:** Gruppenrouten sind in die vorhandene responsive App-Navigation eingebunden und behalten das bestehende Premium-Grau-/Milchglasdesign.

## Sicherheits- und Datenschutzgrenzen

RLS ist die Sicherheitsgrenze. Gruppen- und Sync-Tabellen sind nicht für direkte beliebige Client-Abfragen freigegeben; eng begrenzte `SECURITY DEFINER`-RPCs prüfen Authentifizierung, Eigentum und Mitgliedschaft. Alle Definer-Funktionen setzen einen festen `search_path`. Invite-Roh-Tokens werden nicht serverseitig gespeichert; E-Mail-Adressen werden nicht in Profile/Feed eingebaut. Gruppen sind nicht global auffindbar; es gibt keine öffentlichen Profile, öffentlichen Posts oder Direktnachrichten.

## Verifikation

- `npm run lint` – erfolgreich.
- `npx tsc --noEmit` – erfolgreich.
- `npm run build` mit nicht echten öffentlichen Supabase-Platzhalterwerten – erfolgreich.
- `npm run test:community-db` – Migration wurde in einer isolierten PGlite-PostgreSQL-Instanz gegen ein minimales Gym-Basisschema ausgeführt; geprüft wurden Profil-Fallback, private Mitgliedschaft, Einmal-Einladung, Revisionen/Konfliktauflösung, atomarer Abschluss inkl. Dezimalkomma, Gruppenfeed, Kommentar/Reaktion, Rangliste, RLS-Isolation, Owner-Wechsel und Archivierung.

## Noch notwendiger Schritt vor Live-Betrieb

Die Migration wurde **nicht** auf einem unbekannten oder produktiven Supabase-Projekt ausgeführt. Vor Deployment müssen die tatsächlichen Basistabellen/-spalten und vorhandenen Policies des Zielprojekts gegen die Migration geprüft und der Ablauf auf einer isolierten Supabase-Staging-Instanz mit getrennten Nutzern getestet werden. Der PGlite-Smoke-Test simuliert Auth über `auth.uid()`; er ersetzt keine Prüfung von Supabase Auth, PostgREST oder Konfiguration des konkreten Projekts.

Offline-Synchronisierung funktioniert für die bereits geöffnete App mit lokal verfügbaren Browserressourcen; PWA-Installation und Erststart ohne Netzwerk wurden nicht als Bestandteil dieser Lieferung umgesetzt.

## Animierte Übungsbibliothek

Die Bibliothek enthält genau 50 Übungen: 25 Kurzhantel- und 25 Kabelturm-Übungen. Jede Übung hat eine leichtgewichtige SVG-Bewegungsillustration, Gerät/Muskelgruppe, deutsche und gebräuchliche alternative Suchbegriffe sowie konkrete Hinweise zu Ausführung und typischen Fehlern. Nutzer können nach Name, Synonym, Muskelgruppe oder Gerät filtern, die Animation in einer Detailansicht ansehen und die Übung direkt zum Trainingsentwurf hinzufügen.

Die Animationen sind Vektor-Loops statt 50 eingebettete Videodateien, damit sie auf Mobilgeräten zügig laden und sich skalieren lassen. Vorschauanimationen starten nur im sichtbaren Bereich; reduzierte Bewegung wird respektiert. Die Illustrationen erklären schematisch die Bewegung und sind keine gefilmte oder medizinisch individualisierte Bewegungsanalyse. ESLint, TypeScript, der Produktionsbuild und der Community-Datenbank-Smoke-Test liefen erfolgreich.

Hauptdateien: `src/data/exercise-library.ts` (50 katalogisierte Übungen und Technik-Cues), `src/components/ExerciseAnimation.tsx` (wiederverwendbare, gerätebewusste Animation), `app/library/page.tsx` (responsive Suche, Filter und Detailansicht), `app/training/page.tsx` (Übung aus der Bibliothek in die aktuelle Einheit übernehmen) sowie `public/manus-routes.json`.
