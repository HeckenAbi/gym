# Gym Battle – Lieferstatus und Betriebsgrenzen

## Implementiert

Die Next.js-/Supabase-App umfasst Gruppen, geteilte Trainings, Ranglisten, Challenges, Cloud-/Offline-Sync und eine Übungsbibliothek. Die nummerierten Migrationen liegen in `supabase/migrations/`: `20261029090319_legacy_group_schema_compat.sql`, `20261029091500_community_schema_and_policies.sql`, `20261029091600_community_group_social.sql`, `20261029091700_community_workout_sync.sql` und `20261029091800_group_league_scoring.sql`. Die Community-Funktionen sind auf drei transaktionale Schritte verteilt; Funktionen und ihre Berechtigungen werden jeweils gemeinsam angelegt.

**Gruppen und soziale Funktionen:** private Gruppen mit Owner/Admin/Member-Rollen, sieben Tage gültige Einmal-Einladungen (serverseitig nur SHA-256-Hash), mitgliedschaftsgebundene Feed-/Kommentar-/Reaktionssichtbarkeit und freiwillige Trainingsfreigabe. Owner können verwalten, übertragen oder archivieren.

**Wertung:** ein Punkt je qualifiziertem, ausdrücklich geteiltem Trainingstag; höchstens ein Punkt pro Person und lokalem Gruppentag, aber keine wöchentliche Punkteobergrenze. Qualifikation erfordert mindestens drei Sätze und zehn Wiederholungen, Gewicht null ist zulässig. Vier-Wochen-Saison: Summe der drei besten Wochen. Die Crew-Challenge ist ein gemeinsames Wochenziel von zwei qualifizierten Trainingstagen je aktivem Mitglied, ohne individuelle Bonuspunkte.

**Training und Übungsbibliothek:** revisionierte Cloud-Drafts, atomarer/idempotenter Abschluss, IndexedDB-Outbox und explizite Konfliktwahl. Die Bibliothek umfasst genau 50 Übungen (25 Kurzhantel, 25 Kabelturm) mit schematischen SVG-Loops, Filtern, Technikhinweisen und direkter Übernahme ins Training.

## Live-Projekt „Gym Battle“ – bestätigter Stand

Die Migration `legacy_group_schema_compat` ist auf Projekt `vbppgevobtshfumdpwms` angewendet (Supabase-Version `20261029090319`). Sie hat das Legacy-Gruppenschema kompatibel gemacht und Einladungstokens gehasht. Die anschließende Prüfung ergab 0 Gruppen, 0 Mitglieder und 0 Einladungen; die drei vorhandenen Trainings blieben erhalten. Alte Gruppen-Policies wurden entfernt.

Die drei Community-Teilmigrationen und die League-Migration sind **noch nicht live angewendet**. Bis sie ausgeführt sind, sind Gruppenanlage, Community-Feed, Cloud-Autosave und neue Wertung in der Live-Datenbank noch nicht freigeschaltet.

## Kompatibilität und lokale Prüfung

`20261029090319_legacy_group_schema_compat.sql` normalisiert das Legacy-Schema: alte Gruppenpolicies und inkompatible Helper-Signatur werden entfernt; `owner_id` wird verlustfrei in `created_by` überführt; fehlende Gruppen-/Rollen-/Statusfelder werden ergänzt; alte Einladungs-UUIDs werden mit pgcrypto gehasht, bevor die Klartextspalte entfernt wird. Sind Tokens nicht sicher wiederherstellbar, bricht die Migration ab.

`npm run test:community-db` spielt alle fünf lokalen Migrationsdateien sowohl gegen eine frische Basis als auch gegen eine Legacy-Fixture ab, die dem verbundenen Schema entspricht. Der Test bestätigt Rollenübernahme, Token-Hashing, Erhalt der Trainings, Gruppen-/Einladungsabläufe, Draft-Synchronisierung, Feed-/RLS-Verhalten, 3-Satz-/10-Wiederholungs-Qualifikation und unbegrenzte Wochenpunkte. Der PGlite-Test und `git diff --check` bestanden nach der Aufteilung.

## Noch ausstehende Live-Schritte

1. Die drei Community-Teilmigrationen und danach die League-Migration auf Supabase anwenden.
2. Die Hosting-Umgebungsvariablen von Platzhaltern auf Supabase-URL und Publishable/Anon-Key setzen.
3. Gruppenanlage und freiwilliges Teilen eines Trainings mit echten Auth-Nutzern im PC-/Handy-Preview live testen.
4. Kleine UI-Nacharbeiten: Verlauf als aktive Route markieren und Rücksprungadresse nach direktem `/groups`-Login erhalten.

## Weitere bekannte Nacharbeit

Client- und SQL-Eingabegrenzen im Training angleichen; Cloud-Autosave beim Verlassen sichtbar abschließen; Trainingsdetails-Abbrechen soll Änderungen zurücksetzen und mehrere Detailänderungen atomar speichern. PWA-Erststart ohne Netz ist nicht enthalten.
