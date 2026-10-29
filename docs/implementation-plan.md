# Gym Battle – Lieferstatus und Betriebsgrenzen

## Implementiert

Die Next.js-/Supabase-App umfasst Gruppen, geteilte Trainings, Ranglisten, Challenges, Cloud-/Offline-Sync und eine Übungsbibliothek. Die exakt mit dem Live-Projekt abgeglichenen Migrationen liegen unter `supabase/migrations/`: `20261029090319_legacy_group_schema_compat.sql`, `20261029092310_community_schema_and_policies.sql`, `20261029092641_community_group_management.sql`, `20261029092725_community_feed_and_sharing.sql`, `20261029092805_community_workout_sync.sql`, `20261029092854_group_league_scoring.sql` und `20261029093100_community_fk_indexes.sql`.

**Gruppen und soziale Funktionen:** private Gruppen mit Owner/Admin/Member-Rollen, sieben Tage gültige Einmal-Einladungen (serverseitig nur SHA-256-Hash), mitgliedschaftsgebundene Feed-/Kommentar-/Reaktionssichtbarkeit und freiwillige Trainingsfreigabe. Owner können verwalten, übertragen oder archivieren.

**Wertung:** ein Punkt je qualifiziertem, ausdrücklich geteiltem Trainingstag; höchstens ein Punkt pro Person und lokalem Gruppentag, aber keine wöchentliche Punkteobergrenze. Qualifikation erfordert mindestens drei Sätze und zehn Wiederholungen, Gewicht null ist zulässig. Vier-Wochen-Saison: Summe der drei besten Wochen. Die Crew-Challenge ist ein gemeinsames Wochenziel von zwei qualifizierten Trainingstagen je aktivem Mitglied, ohne individuelle Bonuspunkte.

**Training und Übungsbibliothek:** revisionierte Cloud-Drafts, atomarer/idempotenter Abschluss, IndexedDB-Outbox und explizite Konfliktwahl. Die Bibliothek umfasst genau 50 Übungen (25 Kurzhantel, 25 Kabelturm) mit schematischen SVG-Loops, Filtern, Technikhinweisen und direkter Übernahme ins Training.

## Live-Projekt „Gym Battle“ – bestätigter Stand

Alle sieben Migrationen sind auf Supabase-Projekt `vbppgevobtshfumdpwms` angewendet: `20261029090319 legacy_group_schema_compat`, `20261029092310 community_schema_and_policies`, `20261029092641 community_group_management`, `20261029092725 community_feed_and_sharing`, `20261029092805 community_workout_sync`, `20261029092854 group_league_scoring` und `20261029093100 community_fk_indexes`.

Die Datenbankprüfung bestätigte 3 Trainings, 0 Gruppen, 0 Mitglieder, 0 Einladungen und 0 punktberechtigte Shares. Die vorhandenen Trainings wurden nicht gelöscht oder umgeschrieben. Die acht vom Supabase-Performanceberater gemeldeten fehlenden Fremdschlüssel-Indizes wurden ergänzt und werden nicht mehr als unindiziert gemeldet.

Schema, RLS, Gruppen-/Einladungsfunktionen, Feed/Teilen, Sync-RPCs und League-Wertung sind installiert. Eine Ende-zu-Ende-Prüfung mit echten Auth-Nutzern wurde noch nicht durchgeführt.

## Kompatibilität und lokale Prüfung

`20261029090319_legacy_group_schema_compat.sql` normalisiert das Legacy-Schema: alte Gruppenpolicies und inkompatible Helper-Signatur werden entfernt; `owner_id` wird verlustfrei in `created_by` überführt; fehlende Gruppen-/Rollen-/Statusfelder werden ergänzt; alte Einladungs-UUIDs werden mit pgcrypto gehasht, bevor die Klartextspalte entfernt wird. Sind Tokens nicht sicher wiederherstellbar, bricht die Migration ab.

`npm run test:community-db` spielt alle sieben lokalen Migrationsdateien sowohl gegen eine frische Basis als auch gegen eine Legacy-Fixture ab. Der Test prüft Rollenübernahme, Token-Hashing, Erhalt der Trainings, Gruppen-/Einladungsabläufe, Draft-Synchronisierung, Feed-/RLS-Verhalten, 3-Satz-/10-Wiederholungs-Qualifikation und unbegrenzte Wochenpunkte. ESLint, TypeScript und `git diff --check` bestehen ebenfalls.

## Supabase-Advisor-Hinweise

Die Advisor-Meldung **RLS Enabled No Policy** für `group_invites` und `workout_autosaves` ist beabsichtigt: Die Tabellen sind für direkten API-Zugriff gesperrt; Aktionen erfolgen ausschließlich über geprüfte RPC-Funktionen. Die Warnungen zu `SECURITY DEFINER` beziehen sich auf diese bewusst exponierten RPC-Endpunkte; sie setzen einen festen `search_path` und prüfen Authentifizierung sowie Gruppen-/Rollenrechte. `get_group_invite_preview` ist absichtlich vor dem Login ausführbar und gibt nur begrenzte Vorschauinformationen für einen Hash zurück.

Der Performance-Advisor meldet weiterhin 27 Policies mit `auth_rls_initplan` (darunter bestehende `friend_requests`-Policies und neue Owner-Policies) sowie bislang unbenutzte Indizes. Die Performance-Hinweise sind keine Datenverlust- oder Zugriffsausfälle; die neuen Tabellen sind noch leer. Supabase Auth meldet außerdem, dass der Schutz vor kompromittierten Passwörtern deaktiviert ist. Diese separate Auth-Einstellung wurde nicht geändert, weil sie das Passwort-/Anmeldeverhalten betrifft.

Referenzen: [SECURITY DEFINER-Hinweis](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS-Initplan-Hinweis](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan), [Supabase-Passwortschutz](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Noch ausstehende Produktivschritte

1. Die Hosting-Umgebungsvariablen von Platzhaltern auf Supabase-URL und Publishable/Anon-Key setzen.
2. Gruppenanlage, Einladung und freiwilliges Teilen eines Trainings mit echten Auth-Nutzern im PC-/Handy-Preview live testen.
3. Kleine UI-Nacharbeiten: Verlauf als aktive Route markieren und Rücksprungadresse nach direktem `/groups`-Login erhalten.
4. Client- und SQL-Eingabegrenzen im Training angleichen; Cloud-Autosave beim Verlassen sichtbar abschließen; Trainingsdetails-Abbrechen soll Änderungen zurücksetzen und mehrere Detailänderungen atomar speichern.

PWA-Erststart ohne Netz ist nicht enthalten.
