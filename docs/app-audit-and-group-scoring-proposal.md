# Gym Battle – Funktionsprüfung und Gruppenliga

**Aktualisiert am 29. Oktober 2026.** Dieser Stand ersetzt die früheren Hinweise im Dokument, dass der Supabase-Migrationsstand unbekannt sei oder die Community-Migration noch nicht angewendet wurde.

## Prüfungsgrenze

Die Prüfung umfasst Repository-Code, PGlite-Tests mit synthetischen Nutzern, den Live-Migrationsverlauf und ausgewählte schreibgeschützte Rechte-/Bestandsabfragen auf dem Supabase-Projekt „Gym Battle“ sowie die HTTPS-Preview. Es wurde **kein** echter Benutzer angemeldet; Gruppenerstellung, Einladungsbeitritt, Teilen und Cloud-Sync wurden daher nicht als angemeldeter Nutzer gegen Live-Daten ausgeführt. Es wurden keine Testgruppen oder Einladungen in der Live-Datenbank angelegt.

Die Live-Historie enthält sieben Einträge: `20261029090319`, `20261029092310`, `20261029092641`, `20261029092725`, `20261029092805`, `20261029092854` und `20261029093100`. Bei der letzten Bestandsprüfung waren drei Trainings vorhanden und null Gruppen, Gruppenmitglieder oder Einladungen. Die vorhandenen Trainings wurden nicht umgeschrieben.

Eine frühere, inzwischen abgelöste Handyvorschau verwendete Platzhalterwerte und hatte keine Datenbankverbindung. Die aktuelle sitzungsgebundene Preview verwendet eine echte Supabase-URL und einen öffentlichen Publishable-Key aus einer von Git ignorierten `.env.local`-Datei. Es wurde kein dauerhaftes Hostingprojekt konfiguriert.

## Ergebnis nach Bereichen

| Bereich | Aktueller Stand | Verbleibende Grenze |
| --- | --- | --- |
| Anmeldung und Passwort-Reset | Login-/Registrierungs-/Reset-Abläufe sind vorhanden. Direkte Aufrufe von `/groups` und `/groups/:id` behalten das Rücksprungziel; Login-Modal mit `returnTo=/groups` wurde im Browser geöffnet. | Kein Login mit einem realen Nutzer; Supabase-E-Mail- und Redirect-Einstellungen nicht live durchgespielt. Leaked-Password-Schutz ist weiterhin deaktiviert. |
| Dashboard und Trainingsverlauf | Verlauf-Navigation wird bei `#verlauf` aktiv hervorgehoben. | Keine Live-Abfrage mit einem eingeloggten Nutzer. |
| Training, Autosave und Offline | Lokale Entwürfe, revisionsbasiertes Cloud-Autosave, Offline-Abschlussvormerkung, Wiederverbindungs-Sync und Konfliktentscheidung sind implementiert. PWA-App-Hülle wurde bei 390×844 getestet; `/training` wurde bei simulierter Offline-Verbindung aus dem Cache mit HTTP 200 geöffnet. | Echte Anmeldung und anschließender Sync mit einem Testkonto stehen aus. Client und SQL haben noch nicht deckungsgleiche Eingabegrenzen; Cloud-Flush beim Verlassen wird nicht sichtbar abgewartet. |
| Trainingsdetails bearbeiten | Laden, Bearbeiten und Löschen sind verbunden. | „Abbrechen“ setzt geänderten React-State nicht zuverlässig auf einen Snapshot zurück. Mehrere Datenbank-Schreibschritte sind nicht gemeinsam transaktional. |
| Gruppen, Feed und Einladungen | Sieben Community-/League-Migrationen sind live. UI verwendet die vorgesehenen RPCs; Einladung ist ein einmalig nutzbarer, sieben Tage gültiger Bearer-Link mit serverseitig gespeichertem Hash. | Echte Gruppenerstellung, Einladung und Feed-/Kommentar-/Reaktionstests mit getrennten Live-Nutzern stehen noch aus. |
| Gruppenliga | Unbegrenzte Wochenpunkte, Vier-Wochen-Saison, Crew-Challenge und Punktstatus im Feed sind live implementiert. Die relevanten Gruppen-RPCs sind für `authenticated` ausführbar und `SECURITY DEFINER` unter `postgres`; die Funktionseigentümer können die intern gesperrten Gruppen-Helper verwenden. | Keine Live-Wertung mit realen Trainingsdaten erprobt. |
| Übungsbibliothek | 50 Übungen, aufgeteilt in 25 Kurzhantel und 25 Kabelturm, mit Suche/Filtern, Technikhinweisen und schematischen animierten SVG-Loops. | Die Animationen sind keine gefilmten Videoanleitungen. |
| PWA | Manifest, Icons, Service Worker und Offline-Hinweis sind vorhanden. Cache-Routen, Icons und Offline-Trainingsroute wurden im Browser geprüft. | Erster Start braucht mindestens einen Onlinebesuch; echte Smartphone-/Flugmodusprüfung steht noch aus. |

## Gruppenerstellung und Rechte

Der Gruppen-Handler ruft `create_private_group` mit den in der Repository-Migration definierten Parametern auf. Gruppe und Owner-Mitgliedschaft werden in der RPC atomar erstellt; PGlite bestätigt diesen Pfad. Der zuvor geteilte Preview-Link scheiterte an Platzhalterwerten; die aktuelle Preview ist mit echten öffentlichen Supabase-Werten konfiguriert. Der Live-Migrationsverlauf wurde erneut geprüft.

Der aktuelle Zugriffsschutz sperrt direkten API-Zugriff auf sensible Gruppen-, Kommentar-, Reaktions-, Profil- und Autosave-Tabellen. Die UI verwendet dafür Gruppen-/Sync-RPCs. Eine schreibgeschützte Live-Prüfung bestätigte, dass die relevanten RPCs für `authenticated` ausführbar sind und unter einem festen Funktions-Owner mit `SECURITY DEFINER` laufen. Die Helper `is_group_member` und `is_group_admin` sind für direkte Aufrufe durch `authenticated`/`anon` widerrufen; das ist im aktuellen Modell beabsichtigt, weil die Tabellenrechte ebenfalls gesperrt sind und die RPC-Owner die Helper weiterhin ausführen können. Es wurde kein zusätzlicher Helper-Grant vorgenommen.

## Implementierte Liga-Regeln

- **Wochenwertung:** ein Punkt je qualifiziertem Trainingstag; höchstens ein Punkt pro Person und lokalem Gruppentag, aber keine Wochenobergrenze. Mehrere Einheiten am selben Tag zählen einmal. Qualifikation erfordert mindestens drei gültige Sätze und insgesamt zehn Wiederholungen; Gewicht null bleibt erlaubt.
- **Teilnahme:** nur abgeschlossene, ausdrücklich für genau diese Gruppe geteilte Trainings zählen. Abschluss und Teilen müssen in derselben Gruppenwoche geschehen. Eine spätere Freigabe kann keine geschlossene Woche rückwirkend verändern. Beim Teilen wird die Punktequalifikation gespeichert; direkt veränderbare Abschlusszeitpunkte sind serverseitig gesperrt. Privat gemachte Trainings verlieren ihren Punkt.
- **Vier-Wochen-Saison:** feste, gruppenzeitzonenbasierte Saisonblöcke. Die Saisonwertung ist die Summe der drei punktstärksten Wochen aus vier; Gewicht und Gesamtvolumen bleiben außen vor. Die aktuelle und vorherige Saison sind abrufbar.
- **Crew-Challenge:** gemeinsames Wochenziel von zwei qualifizierten Trainingstagen je aktivem Mitglied. Die UI zeigt Fortschritt und bei vollständigem Ziel ein gemeinsames Abzeichen. Dieses Abzeichen vergibt keine zusätzlichen Einzelpunkte.
- **Transparenz:** der Feed kennzeichnet, ob ein geteilter Beitrag einen Ligapunkt gebracht hat. Die Ranglistenansicht erklärt die Wochen- und Saisonregeln.

## Verifikation

`npm run test:community-db` spielt die Community-/League-Migrationen in PGlite auf einem frischen und einem Legacy-Schema ab. Die Tests umfassen unter anderem mindestens drei Sätze/zehn Wiederholungen, Nullgewicht, Schutz des Abschlusszeitpunkts, Ein-Punkt-pro-Tag-Deduplizierung, mehrere punktberechtigte Tage pro Woche, verspätete Freigabe, Drei-aus-vier-Saisonwertung, Crew-Challenge, Feed/Kommentare/Reaktionen, RLS-Isolation und Owner-Übergabe.

Für den aktuellen Stand bestanden ESLint, TypeScript, `git diff --check` und der Next.js-Produktionsbuild. Die HTTPS-Preview lieferte für App, Route-Manifest, PWA-Manifest, Service Worker, Offline-Seite und Icons HTTP 200. Ein mobiler Chromium-Test bei 390×844 zeigte keine horizontale Überbreite. Nach dem Cache-Aufbau wurde `/training` bei simulierter Offline-Verbindung mit HTTP 200 aus der Offline-Shell geöffnet.

## Noch erforderliche Schritte

1. In einem dauerhaft gebundenen Hostingprojekt die öffentlichen Werte `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` setzen; die jetzige Preview ist sitzungsgebunden und keine stabile Produktions-URL.
2. Mit getrennten echten Auth-Nutzern Gruppe erstellen, Einladung annehmen, ein Training freiwillig teilen und Feed, Kommentar/Reaktion, Rangliste/Punkte sowie Wiederverbindungs-Sync prüfen.
3. Die verbleibenden Trainingsdetails verbessern: Client-/SQL-Eingabegrenzen angleichen, Cloud-Autosave beim Verlassen sichtbar abschließen, Abbrechen zurücksetzen und Detailänderungen atomar speichern.
4. Die verbliebenen Supabase-Advisor-Hinweise (`auth_rls_initplan`, unbenutzte Indizes) prüfen und Leaked-Password-Protection mit Dashboard-/Planberechtigung abgleichen.
5. Die Offline-Prüfung auf einem echten Smartphone wiederholen; die synthetische Browserprüfung ersetzt keinen vollständigen Geräte-/Flugmodus-Abnahmetest.
