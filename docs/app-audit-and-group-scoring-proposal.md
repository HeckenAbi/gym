# Gym Battle – Funktionsprüfung und Gruppenliga

## Prüfungsgrenze

Die Prüfung umfasst Repository-Code und eine isolierte PGlite-PostgreSQL-Instanz mit synthetischen Nutzern. Sie ist kein Abnahmetest gegen das tatsächliche Supabase- oder Hosting-Projekt. PGlite bestätigt die Migration und zentrale RLS-/Wertungspfade, aber nicht Live-Auth, PostgREST, echte Umgebungsvariablen oder E-Mail-/Redirect-Einstellungen.

Die zuvor bereitgestellte Handyvorschau wurde mit `https://example.supabase.co` und einem Platzhalter-Publishable-Key gestartet. Sie kann die UI zeigen, ist aber nicht mit einer echten Datenbank verbunden; Anmeldung, Gruppenerstellung, Cloud-Speicherung und Sync können dort nicht funktionieren.

## Ergebnis nach Bereichen

| Bereich | Einschätzung aus dem Repository | Wichtigste Grenze |
| --- | --- | --- |
| Anmeldung und Passwort-Reset | Anmelde-, Registrierungs- und Reset-Abläufe sowie Einladung-Rückkehrpfad sind verbunden. | Supabase-Redirect- und E-Mail-Einstellungen wurden nicht live geprüft. Ein direkter `/groups`-Aufruf ohne Session verliert das Rückkehrziel. |
| Dashboard und Trainingsverlauf | Lädt eigene Workouts, Sätze und Fortschritt; Suche und Trainingsdetails sind eingebunden. | Der Verlauf-Navigationspunkt wird nicht als aktiv markiert. Keine Live-Abfrage mit echten Nutzerdaten. |
| Training, Autosave und Offline | Lokaler Entwurf, Cloud-Draft, Konfliktentscheidung und atomarer Abschluss sind angelegt. | Client und SQL haben nicht deckungsgleiche Eingabegrenzen. Beim Verlassen vor Ablauf des Autosave-Timers kann die Cloud-Synchronisierung noch ausstehen. |
| Trainingsdetails bearbeiten | Laden, Bearbeiten und Löschen sind verbunden. | „Abbrechen“ setzt geänderten React-State nicht zurück. Mehrere Datenbank-Schreibschritte sind nicht gemeinsam transaktional. |
| Gruppen, Feed und Einladungen | Gruppen-/Einladungs-RPCs und RLS sind mit der UI verbunden; Freigabe bleibt opt-in. Gruppenerstellungsfehler werden jetzt nach Migration, Sitzung, Zeitzone und Verbindung unterschieden. | Der echte Supabase-Migrationsstand ist weiterhin unbekannt. |
| Gruppenliga | Wochenpunkte ohne Wochenobergrenze, feste Vier-Wochen-Saisons, Crew-Challenge und Punktstatus im Feed sind implementiert. | Die neue Migration muss noch im echten Zielprojekt auf Staging geprüft werden. |
| Übungsbibliothek | 50 Übungen mit Suche/Aliasen, Filtern, Detailhinweisen und direkter Übernahme in ein Training. | Animationen sind schematische SVG-Loops, keine gefilmten Videos. Live-Anmeldung und Trainingsübergabe benötigen echtes Supabase. |

## Gruppenerstellung

Der Gruppen-Handler ruft `create_private_group` mit den in der Repository-Migration definierten Parametern auf. Die Gruppe und Owner-Mitgliedschaft werden in der RPC atomar erstellt; der isolierte Datenbanktest bestätigt diesen Pfad. Das Problem beim zuletzt geteilten Vorschaulink war die fehlende echte Supabase-Verbindung durch Platzhalterwerte. Für eine andere gehostete Version sind Migration, Schema, Berechtigung und Projektumgebungswerte vor Ort zu prüfen.

Die Gruppenoberfläche prüft die IANA-Zeitzone nun vor dem Speichern und zeigt getrennte Hinweise für fehlende RPC-/Migration, abgelaufene Anmeldung, ungültige Zeitzone und nicht erreichbares Supabase. Die Migration wurde nicht auf ein unbekanntes oder produktives Projekt angewendet.

## Implementierte Liga-Regeln

- **Wochenwertung:** ein Punkt je qualifiziertem Trainingstag; höchstens ein Punkt pro Person und lokalem Gruppentag, aber keine Wochenobergrenze. Mehrere Einheiten am selben Tag zählen einmal. Qualifikation erfordert mindestens drei gültige Sätze und insgesamt zehn Wiederholungen; Gewicht 0 bleibt erlaubt.
- **Teilnahme:** nur abgeschlossene, ausdrücklich für genau diese Gruppe geteilte Trainings zählen. Abschluss und Teilen müssen in derselben Gruppenwoche geschehen. Eine spätere Freigabe kann keine geschlossene Woche rückwirkend verändern. Beim Teilen wird die Punktequalifikation gespeichert; direkt veränderbare Abschlusszeitpunkte sind serverseitig gesperrt. Privat gemachte Trainings verlieren ihren Punkt.
- **Vier-Wochen-Saison:** feste, gruppenzeitzonenbasierte Saisonblöcke. Die Saisonwertung ist die Summe der drei punktstärksten Wochen aus vier; Gewicht und Gesamtvolumen bleiben außen vor. Die aktuelle und vorherige Saison sind abrufbar.
- **Crew-Challenge:** gemeinsames Wochenziel von zwei qualifizierten Trainingstagen je aktivem Mitglied. Die UI zeigt Fortschritt und bei vollständigem Ziel ein gemeinsames Abzeichen. Dieses Abzeichen vergibt keine zusätzlichen Einzelpunkte.
- **Transparenz:** der Feed kennzeichnet, ob ein geteilter Beitrag einen Ligapunkt gebracht hat. Die Ranglistenansicht erklärt die Wochen- und Saisonregeln.

## Verifikation der neuen Wertung

`npm run test:community-db` führt beide Migrationen in isoliertem PGlite aus. Die Tests prüfen unter anderem mindestens drei Sätze/zehn Wiederholungen, null Gewicht, direkte Finished-at-Manipulation, Ein-Punkt-pro-Tag-Deduplizierung, sieben verschiedene Punkte in einer Woche (also keine Wochenobergrenze), verspätete Freigabe, Drei-aus-vier-Saisonwertung, Crew-Challenge und Mitgliedschaftstrennung.

Zusätzlich bestanden für den aktuellen Feature-Branch ESLint, TypeScript, `git diff --check` sowie ein Next.js-Produktionsbuild mit nicht echten Supabase-Platzhalterwerten. Diese Prüfungen ersetzen keine Live-Abnahme.

## Noch erforderlicher Live-Schritt

Vor einem Einsatz müssen die vorhandene Supabase-Basis und Policies des tatsächlichen Projekts mit beiden versionierten Community-/Liga-Migrationen abgeglichen und die Anwendung zuerst auf einer isolierten Supabase-Staging-Instanz mit getrennten Nutzern getestet werden. Die temporäre Vorschau muss außerdem auf echte Hosting-Umgebungswerte zeigen. Erst danach können Gruppenerstellung, Trainingsteilung und Rangliste mit einem echten Handy-Login abgenommen werden.
