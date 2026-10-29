# Gym Battle – Lieferstatus und Betriebsgrenzen

## Implementiert

Die Next.js-/Supabase-App umfasst Gruppen, geteilte Trainings, Ranglisten, Challenges, Cloud-/Offline-Sync und eine Übungsbibliothek. Die Migrationen liegen in `supabase/migrations/20261028225000_legacy_group_schema_compat.sql`, `supabase/migrations/20261028230000_community_and_workout_sync.sql` und `supabase/migrations/20261029001000_group_league_scoring.sql`.

**Gruppen und soziale Funktionen:** private Gruppen mit Owner/Admin/Member-Rollen, sieben Tage gültige Einmal-Einladungen (serverseitig nur SHA-256-Hash), mitgliedschaftsgebundene Feed-/Kommentar-/Reaktionssichtbarkeit und freiwillige Trainingsfreigabe. Owner können verwalten, übertragen oder archivieren.

**Wertung:** ein Punkt je qualifiziertem, ausdrücklich geteiltem Trainingstag; höchstens ein Punkt pro Person und lokalem Gruppentag, aber keine wöchentliche Punkteobergrenze. Qualifikation erfordert mindestens drei Sätze und zehn Wiederholungen, Gewicht null ist zulässig. Vier-Wochen-Saison: Summe der drei besten Wochen. Die Crew-Challenge ist ein gemeinsames Wochenziel von zwei qualifizierten Trainingstagen je aktivem Mitglied, ohne individuelle Bonuspunkte.

**Training und Übungsbibliothek:** revisionierte Cloud-Drafts, atomarer/idempotenter Abschluss, IndexedDB-Outbox und explizite Konfliktwahl. Die Bibliothek umfasst genau 50 Übungen (25 Kurzhantel, 25 Kabelturm) mit schematischen SVG-Loops, Filtern, Technikhinweisen und direkter Übernahme ins Training.

## Live-Projekt „Gym Battle“ – read-only Befund

Das verbundene Projekt hatte keinen protokollierten Migrationsverlauf, aber manuell angelegte Gruppentabellen mit älterem Schema: `gym_groups.owner_id` statt `created_by`, keine `role`-/`status`-Spalten in `group_members`, sowie UUID-Token und `used_at`/`revoked` in `group_invites`. Ein bestehendes `is_group_member(target_group uuid)` und alte RLS-Policies waren vorhanden.

Die Tabellenzählung zeigte null Gruppen, Mitglieder und Einladungen sowie drei Trainings, davon null gruppenverknüpft und null mit gesetztem `is_shared`-Flag. Trainingsinhalte wurden nicht gelesen. Es wurden keine Supabase-Tabellen, Policies oder Daten geändert.

## Kompatibilität und lokale Prüfung

Die Vorbereitungsdatei `20261028225000_legacy_group_schema_compat.sql` normalisiert das Legacy-Schema: alte Gruppenpolicies und inkompatible Helper-Signatur werden entfernt; `owner_id` wird verlustfrei in `created_by` überführt; fehlende Gruppen-/Rollen-/Statusfelder werden ergänzt; alte Einladungs-UUIDs werden mit pgcrypto gehasht, bevor die Klartextspalte entfernt wird. Sind Tokens nicht sicher wiederherstellbar, bricht die Migration ab.

`npm run test:community-db` spielt alle drei Migrationen sowohl gegen eine frische Basis als auch gegen eine Legacy-Fixture ab, die dem verbundenen Schema entspricht. Die Legacy-Fixture enthält eine alte Gruppe, Einladung, alte RLS-Policies und drei private Workouts. Der Test bestätigt Rollenübernahme, Token-Hashing, Erhalt der Workouts und die Community-/Ranglistenregeln. Zusätzlich bestanden ESLint, TypeScript, `git diff --check` und der Next.js-Produktionsbuild mit Platzhalterwerten.

## Vor Live-Anwendung

Die Migrationen wurden noch **nicht** auf Supabase ausgeführt. Eine Anwendung auf das verbundene Projekt ändert Tabellenstruktur und RLS-Policies. Dafür ist eine ausdrückliche Freigabe erforderlich; der PGlite-Test ersetzt keine Prüfung mit echten Supabase-Auth-Nutzern/PostgREST. Die temporäre PC-Vorschau nutzt Platzhalterwerte und ist nicht mit diesem Projekt verbunden.

## Weitere bekannte Nacharbeit

Client- und SQL-Eingabegrenzen im Training angleichen; Cloud-Autosave beim Verlassen sichtbar abschließen; Trainingsdetails-Abbrechen soll Änderungen zurücksetzen und mehrere Detailänderungen atomar speichern; Verlauf als aktive Route markieren und Rücksprungadresse nach direktem `/groups`-Login erhalten. PWA-Erststart ohne Netz ist nicht enthalten.
