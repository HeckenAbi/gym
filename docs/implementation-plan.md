# Gym Battle – Umsetzungsplan

## Ausgangslage

Das Repository enthält eine Next.js-App mit E-Mail/Passwort-Anmeldung, Trainingsanlage und -bearbeitung sowie einem Dashboard mit Trainings- und Kraftstatistiken. Vorhanden sind außerdem umfangreiche Produktkonzepte, aber kein versioniertes Datenbankschema bzw. keine Supabase-Migrationen. Der konkrete Supabase-Endpunkt und der Live-Schema-Stand sind in dieser Arbeitsumgebung nicht verfügbar. Neue Tabellen, Gruppen-/Freundesfunktionen und produktive Datenänderungen werden daher nicht vorgetäuscht oder auf einer unbekannten Datenbank ausgeführt.

## Ziel und Umfang

Die vorhandenen, datenbankgestützten Abläufe werden auf den Kernstandard moderner Krafttraining-Apps gehoben: schnelle mobile Navigation, hochwertiger dunkler Grauton-/Schwarz-Look mit zurückhaltendem Milchglas, Wiederaufnahme eines lokal zwischengespeicherten Trainingsentwurfs, Anzeige der letzten Leistung pro Übung, Pausentimer, klarer Speicherzustand sowie besser lesbare Verlauf-/Fortschrittsdarstellung. Die bestehende Supabase-Tabellenstruktur und alle vorhandenen Datenzugriffe bleiben erhalten.

Die aktuelle Implementierung deckt keine Gruppen, Ranglisten, Einladungen, Profileinstellungen, Routinen, Passwort-Zurücksetzen oder serverseitige Autospeicherung ab. Gruppen- und Freundesfunktionen sowie sichere Ranglisten benötigen zunächst eine versionierte Migration, bestätigte Tabellen-/RLS-Regeln und verfügbare Testzugänge. Diese Punkte werden anhand des Produktkonzepts und des Wettbewerbsvergleichs als nächste Ausbaustufe dokumentiert, statt sie mit unechten Beispieldaten als funktionsfähig auszugeben.

## Design

- **Bewegung:** Zurückhaltender Dark-Industrial-Premium-Look mit matter Oberfläche und transparenten Glasflächen.
- **Prinzipien:** Klarer Trainingsfokus, hohe Lesbarkeit, wenige starke Akzente und mobile Bedienelemente mit ausreichend großen Touch-Flächen.
- **Farben:** Anthrazit und Schwarz als Grundflächen; abgestufte Grautöne für Hierarchie; gebrochenes Platinweiß für Primäraktionen. Das bisher dominante Limettengrün wird stark reduziert.
- **Layout:** Schmale Desktop-Seitenleiste und mobile Bottom-Navigation; Trainingseditoren bleiben einspaltig und vermeiden enge Tabellen auf kleinen Displays.
- **Signatur:** Dezente Glasränder, zurückhaltende Lichtreflexe und kompakte Leistungskennzahlen.
- **Interaktion:** Sofortige Rückmeldung für Speichern, Wiederherstellen, Timer und Fehler; Inhalte bleiben beim Verlassen als Browserentwurf erhalten.
- **Typografie:** Vorhandene Geist-Familie; klare numerische Kennzahlen und ruhige Fließtexte.
- **Marke:** „GYM BATTLE“ bleibt erhalten; die visuelle Signatur wird platinfarben statt neonfarben.

## Implementierungsansatz und Struktur

- `app/layout.tsx`, `app/globals.css`: deutsche Metadaten, Design-Tokens, dunkle Basis und Premium-Glass-Komponenten.
- `src/components/AppShell.tsx`: wiederverwendbare Desktop-Seitenleiste und mobile Bottom-Navigation.
- `app/page.tsx`: polierte Produkt-Landingpage und robusterer Anmelde-/Registrierungsablauf inklusive Passwort-Reset.
- `app/dashboard/page.tsx`: responsives Dashboard, abgeschlossene Trainingsstatistik, Verlauf, Fortschrittsanzeige und Kontobereich.
- `app/training/page.tsx`: mobiler Trainingseditor, Browser-Entwurf/Wiederaufnahme, letzte Leistungswerte und Pausentimer.
- `app/training/[id]/page.tsx`: responsivere Trainingsdetails und Bearbeitung.
- `docs/competitive-review.md`: belegter Vergleich ausgewählter Trainings-Apps anhand offizieller Quellen/Screenshots sowie Lücken und priorisierte nächste Schritte.

## Grenzen und Schutz der Daten

Es wird weder auf eine Supabase-Datenbank geschrieben noch eine Schemaänderung angewendet. Trainingsentwürfe liegen lokal im Browser und werden nach erfolgreicher serverseitiger Speicherung entfernt. Gruppen/Ranglisten und echte serverseitige Wiederaufnahme bleiben offen, bis eine überprüfbare Migration, RLS-Tests und ein testbares Supabase-Projekt vorliegen.
