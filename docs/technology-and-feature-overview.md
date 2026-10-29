# Gym Battle – Technik- und Funktionsübersicht

**Stand: 29. Oktober 2026**

## Kurzfassung

Gym Battle ist eine deutschsprachige, mobile Krafttraining-App mit Trainingsprotokoll, Fortschrittsansicht, animierter Übungsbibliothek und privaten Trainingsgruppen. Einzeltrainings sind standardmäßig privat. Nutzer entscheiden selbst, ob ein abgeschlossenes Training in einer Gruppe geteilt und damit für deren Feed und Wertung berücksichtigt wird.

Die Datenbankseite für Gruppen, Teilen, Offline-/Cloud-Synchronisierung und Liga ist auf dem verbundenen Supabase-Projekt „Gym Battle“ installiert. Die App wurde lokal und mit einer HTTPS-Preview geprüft. Ein stabiler Hosting-Endpunkt und echte Ende-zu-Ende-Tests mit angemeldeten Nutzern sind noch offen.

## Technischer Aufbau

| Bereich | Eingesetzte Technik und Aufgabe |
|---|---|
| Oberfläche | Next.js 16.4.3 App Router, React 19.3, TypeScript 5 und Tailwind CSS 4. Deutsche Oberfläche mit dunklem Graphit-/Schwarz-/Platin-Glass-Stil. |
| Anmeldung und Backend | Supabase Auth für Konten; Supabase Postgres als persistente Datenbank; Supabase RPCs für geprüfte Schreibabläufe. Der Browser verwendet nur URL und öffentlichen Publishable-Key, keinen Service-Role-Key. |
| Zugriffsschutz | PostgreSQL Row Level Security (RLS), gruppengebundene Berechtigungen und serverseitig geprüfte Funktionen. Gruppen- und Workout-Daten werden nicht als öffentliche Tabellen freigegeben. |
| Offline-Training | IndexedDB speichert Trainingsentwürfe und eine ausstehende Abschlusswarteschlange auf dem Gerät. Revisionsnummern erkennen Änderungen auf anderen Geräten; Konflikte werden nicht still überschrieben. |
| PWA | Manifest für den eigenständigen App-Modus, Browser-/Apple-Icons, Service Worker und eine eigenständige Offline-Hinweisseite. Die installierbare App-Hülle wird nach dem ersten Online-Aufruf vorgeladen. |
| Übungsdarstellung | 50 schematische, animierte SVG-Loops mit Technikhinweisen; die Übungen können aus der Bibliothek ins Training übernommen werden. |
| Lokale Datenbanktests | PGlite spielt Migrationen in einer frischen und einer Legacy-Datenbank-Fixture ab. Das ist eine lokale Testdatenbank und nicht das Live-Supabase-Projekt. |

## Was die App kann

### Training protokollieren

Nutzer können Trainingseinheiten benennen, Übungen hinzufügen und Sätze mit Gewicht und Wiederholungen eintragen. Ein Satz lässt sich duplizieren, damit wiederholte Eingaben schneller gehen. Nicht abgeschlossene Entwürfe werden im Browser lokal gespeichert und – sobald möglich – zusätzlich als versionierter Cloud-Entwurf synchronisiert.

Beim Abschluss schützt ein idempotenter RPC gegen doppelte Abschlüsse. Stimmt die lokale Revision nicht mehr mit der Cloud überein, wird ein Konflikt angezeigt und die App verlangt eine bewusste Entscheidung, statt eine Seite unbemerkt zu überschreiben. Wenn die Verbindung fehlt, bleibt der Entwurf in der IndexedDB-Outbox und kann später erneut synchronisiert werden.

### Übungsbibliothek

Die Bibliothek enthält genau 50 Übungen: 25 mit Kurzhanteln und 25 am Kabelturm. Sie zeigt einfache schematische Bewegungsabläufe als Schleifen, Such-/Filtermöglichkeiten und kurze Hinweise zur Ausführung. Eine ausgewählte Übung kann direkt in das Trainingsprotokoll übernommen werden. Die Animationen sind bewusst erklärende Schemata, keine realen Lehrvideos.

### Private Gruppen und Teilen

Gruppen haben Owner-, Admin- und Member-Rollen. Einladungen sind privat, einmalig verwendbar und laufen nach sieben Tagen ab. In der Datenbank wird nur ein SHA-256-Hash des Einladungs-Tokens gespeichert. Mitglieder können ihren Anzeigenamen für gemeinsame Gruppen festlegen; E-Mail-Adressen werden nicht im Feed oder in der Rangliste angezeigt.

Abgeschlossene Trainings erscheinen nur dann im Gruppenfeed, wenn der Nutzer sie ausdrücklich mit dieser Gruppe teilt. Feed, Kommentare und Reaktionen sind an die Gruppenmitgliedschaft gebunden. Owner können Verwaltungsrechte übertragen oder eine Gruppe archivieren. Trainings bleiben privat, bis eine Freigabe erfolgt.

### Liga und Crew-Challenge

Jeder qualifizierte, abgeschlossene und ausdrücklich geteilte Trainingstag kann einen Punkt bringen. Die Qualifikation verlangt mindestens drei gültige Sätze und insgesamt mindestens zehn Wiederholungen; gültige Gewichte dürfen null sein. Pro Person und Gruppenzeitzone zählt höchstens ein Punkt pro lokalem Kalendertag, aber es gibt **keine Wochenobergrenze**.

Ein Training zählt nur unter den serverseitig geprüften Bedingungen: es wurde abgeschlossen, nach dem Gruppenbeitritt absolviert und innerhalb derselben gruppenlokalen Woche geteilt. Dadurch gibt es keine rückwirkenden Punkte für ältere Trainings. Die Vier-Wochen-Saison summiert die drei punktstärksten Wochen. Die kooperative Wochen-Challenge hat als Ziel zwei qualifizierte Trainingstage pro aktivem Mitglied und vergibt keine individuellen Bonuspunkte.

## Datenbank und Sicherheit

Sieben transaktionale Migrationen sind auf dem Live-Projekt „Gym Battle“ angewendet. Sie decken Legacy-Schema-Kompatibilität, Community-Tabellen und RLS, Gruppenverwaltung/Einladungen, Feed/Sharing, Workout-Sync, League-Scoring und zusätzliche Fremdschlüssel-Indizes ab. Bei der letzten dokumentierten Live-Prüfung waren drei bestehende Trainings vorhanden; Gruppen, Mitglieder, Einladungen und punktberechtigte Shares standen bei null. Die vorhandenen Trainings wurden nicht gelöscht oder umgeschrieben.

RLS schützt den direkten Datenzugriff; sensible Vorgänge laufen über Berechtigungen prüfende RPCs. `SECURITY DEFINER`-Funktionen verwenden einen festen `search_path`. Tabellen für Einladungs- und Autosave-Abläufe sind für direkten Tabellenzugriff gesperrt und werden über die vorgesehenen Funktionen bedient.

Der Supabase-Performance-Advisor meldet weiterhin 27 Hinweise zu `auth_rls_initplan` sowie bislang unbenutzte Indizes. Die acht zuvor gemeldeten fehlenden Fremdschlüssel-Indizes wurden ergänzt. Supabase Leaked-Password-Protection ist laut letzter Prüfung deaktiviert; diese projektweite Auth-Einstellung wurde nicht geändert, weil dazu Dashboard-Zugriff und Planberechtigung geprüft werden müssen.

Die lokale Preview-Konfiguration liegt in `.env.local` und wird durch `.gitignore` von Git ausgeschlossen. Darin stehen nur die clientseitige Supabase-URL und der öffentliche Publishable-Key. Es gibt keinen Service-Role-Key in der Browser-App.

Eine schreibgeschützte Live-Prüfung bestätigte, dass die zentralen Gruppen- und Sync-RPCs im Projekt für `authenticated` ausführbar sind und als `SECURITY DEFINER` unter dem PostgreSQL-Owner laufen. Direkte Tabellenrechte und direkte Ausführung der Gruppen-Helper sind widerrufen; die Funktionen können ihre internen Helfer als Owner ausführen.

## PWA und Offline-Grenzen

Nach einem ersten erfolgreichen Online-Aufruf kann der Service Worker die öffentliche App-Hülle, benötigte Next.js-Dateien, Manifest und Icons bereitstellen. Die vorgeladenen Shell-Routen sind `/`, `/dashboard`, `/training`, `/library` und `/groups`. Bei fehlender Verbindung gibt es einen Offline-Hinweis; lokale Trainingsentwürfe können erhalten bleiben und später synchronisiert werden.

Der Service Worker speichert keine Supabase-API-Antworten, keine eingeloggten Profil-/Feed-Daten, keine Einladungs-URLs mit Token und keine Passwort-Reset-URLs. Der Offline-Cache ersetzt keine Anmeldung und keine Cloud-Synchronisierung. Ein erstmaliger App-Aufruf ohne vorherige Netzwerkverbindung ist nicht möglich; App-Installation und Cache benötigen mindestens einen Online-Aufruf.

Ein Chromium-Test im mobilen Viewport 390×844 zeigte keinen horizontalen Überlauf. Nach dem Online-Cache-Aufbau wurde `/training` bei simulierter Offline-Verbindung mit HTTP 200 aus der App-Hülle geladen. Das ist ein Browser-/Netzwerksimulationstest, noch kein Test auf einem physischen Smartphone.

## Geprüfter Stand

- `npm run test:community-db`: bestanden; frisches und Legacy-Schema, Einladungs-Hashing, Trainingsschutz, Berechtigungsisolation, Draft-Revisionen, Abschluss, Qualifikation, unbegrenzte Wochenpunkte, Saison, Challenge, Feed und Owner-Abläufe.
- `npm run lint`: bestanden.
- `npx tsc --noEmit`: bestanden.
- `npm run build`: optimierter Produktionsbuild erfolgreich.
- HTTPS-Preview: Startseite, Routenmanifest mit neun App-Routen, PWA-Manifest, Service Worker, Offline-Seite und 192-/512-Pixel-Icons lieferten HTTP 200.
- Sandbox-Browser: Service Worker war aktiviert; die App-Shell-Routen und PWA-Dateien lagen im Cache.
- Mobiler Chromium-Test: 390×844 ohne horizontale Überbreite; `/training` im simulierten Offline-Modus mit HTTP 200 aus dem Cache geladen.

Nicht ausgeführt wurden ein physischer Flugmodus-/Smartphone-Test, eine Anmeldung mit einem realen Konto und ein Live-Ende-zu-Ende-Test für Gruppenerstellung, Einladungsbeitritt, Teilen und Sync. Die Gruppen-/Einladungszahlen in der Live-Datenbank wurden zum Testen nicht verändert.

## Nächste Schritte

1. Die beiden öffentlichen Supabase-Variablen in einem dauerhaft gebundenen Hosting-Projekt hinterlegen; die aktuell laufende HTTPS-Preview ist sitzungsgebunden und kein dauerhafter Produktionshost.
2. Mit einem realen Testkonto Gruppenanlage, Einladungsbeitritt, Opt-in-Teilen, Feed, Wertung und den Sync nach Wiederverbindung durchspielen.
3. Den Offline-/Wiederverbindungstest auf einem echten Smartphone durchführen und noch offene Trainingsdetails prüfen: Eingabegrenzen zwischen Browser und SQL angleichen, Autosave beim Verlassen sichtbar abschließen, Abbrechen zurücksetzen und Detailänderungen atomar speichern.
4. Verbleibende Supabase-Advisor-Hinweise untersuchen und Leaked-Password-Protection im Auth-Dashboard prüfen, bevor sie aktiviert wird.

## Wichtige Projektdateien

- `app/training/page.tsx` – Trainingseditor und lokale/Cloud-Abläufe.
- `src/lib/workout-sync.ts` und `src/lib/workout-offline-store.ts` – Synchronisierung und IndexedDB-Outbox.
- `app/library/page.tsx` sowie die Übungsdaten unter `src/lib/` – Übungsbibliothek und SVG-Bewegungen.
- `app/groups/page.tsx` und `app/groups/[id]/page.tsx` – Gruppenübersicht, Feed, Rangliste und Verwaltung.
- `app/manifest.ts`, `public/sw.js`, `public/offline.html` – PWA-Manifest, Offline-Cache und Fallback.
- `supabase/migrations/` – sieben versionierte Live-Migrationen.
- `supabase/tests/community-migration.test.mjs` – lokale PGlite-Migrationstests.
