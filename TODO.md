# Gym Battle – Lieferstatus

## Umgesetzt

- [x] Premium-Dark-/Glass-UI mit deutscher Oberfläche und responsiver Navigation für Desktop und Smartphone.
- [x] Trainingsprotokoll mit Übungen, Sätzen, Gewicht und Wiederholungen; Sätze duplizieren; browserlokale Entwürfe.
- [x] Revisionsbasiertes Cloud-Autosave, atomarer/idempotenter Trainingsabschluss, IndexedDB-Outbox und bewusste Konfliktauflösung.
- [x] Übungsbibliothek mit genau 50 Übungen (25 Kurzhantel/25 Kabelturm), animierten SVG-Demos, Filtern, Technikhinweisen und Trainingsübernahme.
- [x] Private Gruppen, Owner/Admin/Member-Rollen, sieben Tage gültige Einmal-Einladungen mit serverseitigem SHA-256-Hash, freiwilliges Teilen, mitgliedsgebundener Feed, Kommentare/Reaktionen und Owner-Übergabe/Archivierung.
- [x] Unbegrenzte Wochenwertung: ein Punkt pro qualifiziertem, ausdrücklich geteiltem Trainingstag; maximal ein Punkt pro Person und lokalem Tag; Qualifikation mindestens drei gültige Sätze und insgesamt zehn Wiederholungen; keine Wochenobergrenze und keine rückwirkenden Punkte.
- [x] Vier-Wochen-Saison mit Summe der drei besten Wochen sowie kooperative Wochen-Challenge mit zwei qualifizierten Trainingstagen pro aktivem Mitglied, ohne individuelle Bonuspunkte.
- [x] Sieben Supabase-Migrationen auf dem Live-Projekt „Gym Battle“ angewendet. Bei der letzten Bestandsprüfung: 3 Trainings erhalten, 0 Gruppen, 0 Mitglieder, 0 Einladungen; keine Trainingsdaten umgeschrieben.
- [x] Verlauf-Navigation reagiert auf `#verlauf`; direkte Aufrufe von `/groups` und `/groups/:id` behalten ihr `returnTo` nach dem Login.
- [x] Installierbare PWA-Hülle mit eigenem dunklem Platin-Icon, Manifest, Service Worker und Offline-Fallback. Die öffentliche Shell wird vorgeladen; Einladungs-/Reset-URLs und API-/Nutzerdaten werden nicht vom Service Worker gecacht.
- [x] Lokale Preview-Konfiguration mit Supabase-URL und öffentlichem Publishable-Key in `.env.local`; die Datei wird von Git ignoriert und nicht eingecheckt.

## Geprüft

- [x] `npm run test:community-db` gegen frisches und Legacy-Schema, inklusive Invite-Hashing, RLS-Isolation, Konflikten, Abschluss-Idempotenz, Qualifikation und unbegrenzten Punkten.
- [x] ESLint, TypeScript, `git diff --check` und optimierter Next.js-Produktionsbuild.
- [x] HTTPS-Preview: Landingpage, `manus-routes.json` (9 App-Routen), Manifest, Service Worker, Offline-Seite und beide Installationsicons antworten erfolgreich.
- [x] Sandbox-Browser bestätigt den aktivierten Service Worker und vorgeladene Cache-Einträge für `/`, `/dashboard`, `/training`, `/library`, `/groups`, Offline-Fallback, Manifest und Icons.
- [x] Read-only-Liveprüfung bestätigt sieben angewendete Migrationen und authentifizierte `SECURITY DEFINER`-RPCs; direkter Tabellen-/Helperzugriff ist im aktuellen Modell widerrufen.
- [x] Chromium-Test im mobilen Viewport 390×844: kein horizontaler Überlauf; bei simulierter Offline-Verbindung lädt `/training` nach Cache-Aufbau mit HTTP 200.

## Noch offen

- [ ] **Stabiles Hosting:** Die echten `NEXT_PUBLIC_SUPABASE_URL`- und `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`-Werte in einem tatsächlich gebundenen, dauerhaften Hosting-Projekt setzen; aktuell läuft nur eine sitzungsgebundene Preview.
- [ ] **Live-Ende-zu-Ende-Test:** Mit echten angemeldeten Nutzern Gruppe erstellen, Einladung annehmen, Training freiwillig teilen, Feed/Rangliste/Punkte und Sync prüfen. Dafür wurden keine Testgruppen in der Live-Datenbank angelegt.
- [ ] **Physischer Geräte-/Sync-Test:** Auf einem echten Smartphone im Flugmodus einen Trainingsentwurf öffnen und lokal speichern, dann nach Wiederverbindung synchronisieren. Der browser-simulierte Offline-Routentest ist bestanden; PWA-Cache braucht mindestens einen vorherigen Online-Aufruf.
- [ ] **Training-Polish:** Client- und SQL-Eingabegrenzen angleichen; Cloud-Autosave beim Verlassen sichtbar abschließen; „Abbrechen“ in Trainingsdetails soll Änderungen zurücksetzen und mehrere Detailänderungen atomar speichern.
- [ ] **Supabase-Advisor:** 27 `auth_rls_initplan`-Hinweise und Hinweise auf bislang unbenutzte Indizes prüfen; die acht fehlenden Fremdschlüssel-Indizes wurden bereits ergänzt.
- [ ] **Auth-Sicherheitseinstellung:** Supabase Leaked-Password-Protection ist weiterhin deaktiviert; Dashboard-/Planberechtigung wurde nicht verifiziert.
