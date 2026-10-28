# Quelle: Gym Battle – Produkt- und UX-Konzept.md
# Teil 2

--- Seite 4 ---

5. Empfänger öffnet Vorschau mit Gruppenname, Ersteller und ungefährem 
Mitgliederstand; private Inhalte bleiben verborgen. Nach Anmeldung/Bestätigung wird 
die Mitgliedschaft aktiviert.
6. Die Gruppe erscheint für beide Nutzer in der Gruppenliste. Der Owner sieht einen 
Hinweis, falls noch keine Mitglieder oder Trainings vorhanden sind.
Einladungsregeln: Einladungslink kann widerrufen werden; im MVP läuft er nach 7 Tagen 
ab und ist für eine Person nutzbar. Wiederverwendbare Gruppenlinks können später 
ergänzt werden. Diese Default-Werte sind eine Produktannahme und in einer zentralen 
Einstellung konfigurierbar.
C. Training protokollieren
1. Nutzer wählt Training starten.
2. Optional: bestehende Routine wählen oder Leeres Training starten. MVP darf mit 
leerem Training funktionieren; eine ausgefeilte Routineverwaltung ist nicht 
Voraussetzung.
3. Aktive Trainingsansicht: Trainingsdauer, Liste der Übungen, Übung hinzufügen, pro 
Übung schnell editierbare Sätze. Ein Satz erfasst Gewicht (kg) und Wiederholungen; 
Satz hinzufügen, duplizieren und entfernen.
4. Vorheriger Leistungswert der Übung wird neben der Eingabe gezeigt, falls vorhanden. 
Standardwerte können aus der letzten abgeschlossenen eigenen Session vorbelegt, 
aber nicht stillschweigend als erledigt gespeichert werden.
5. Änderungen werden nach Eingabe bzw. Satzbestätigung automatisch gespeichert. 
Sichtbarer Status: „Wird gespeichert“, „Gespeichert“ oder „Nicht gespeichert – erneut 
versuchen“.
6. Nutzer tippt Training beenden. Bestätigungsansicht zeigt Übungs-/Satzanzahl, Dauer, 
optionalen Titel und Teilungswahl: Privat oder mit [Gruppe] teilen.
7. Bei Gruppenfreigabe erklärt die UI genau, welche Mitglieder Trainingsname, Übungen, 
Sätze, Gewicht, Wiederholungen und Abschlusszeit sehen. Nutzer bestätigt.
8. Training wird abgeschlossen, ein Erfolgszustand zeigt Zusammenfassung, neue 
persönliche Bestleistungen (nur wenn zuverlässig errechenbar) und Gruppenergebnis.
Abbruch/Recovery: Laufendes Training bleibt als Entwurf erhalten und erscheint als 
„Training fortsetzen“. Abbrechen löscht erst nach Bestätigung. Bei Netzwerkfehlern 
werden Eingaben nicht still verworfen; Speichern und Abschluss bleiben gesperrt bzw. in 
retry-fähigem Zustand.
D. Gruppenrangliste ansehen



--- Seite 5 ---

1. Nutzer öffnet eine Gruppe und wählt Rangliste.
2. Standardzeitraum ist die laufende Gruppenkalenderwoche. UI zeigt Datumsbereich, 
Zeitzone und Punkte-Regel: ein freigegebener Trainingstag = 1 Punkt, maximal 5 Punkte 
pro Woche.
3. Mitglieder werden nach Punkten absteigend angezeigt. Gleichstand erhält denselben 
Rang; sekundär wird alphabetisch nach Anzeigename sortiert, nicht nach Trainingslast.
4. Zeile zeigt Rang, Avatar/Initialen, Anzeigename, Punkte und Anzahl unterschiedlicher 
Trainingstage. Details eines Trainings sind nur sichtbar, wenn es für diese Gruppe geteilt 
wurde.
5. Nutzer kann vorherige Woche ansehen. Im MVP werden frühere Wochen nur aus den 
zugänglichen abgeschlossenen, geteilten Trainings berechnet; keine manuelle 
Ergebnisänderung.
6. Empty state erläutert die Regel und bietet „Training protokollieren“. 
Ranglistenplatzierung enthält keine beschämenden Warnungen oder negativen/roten 
„Verlierer“-Botschaften.
3. Seiten, Inhalte und UI-Zustände
Seite
Kerninhalt und Aktionen
Wesentliche UI-Zustände
Sign-in
E-Mail, Passwort, Anmelden, 
Passwort vergessen, Konto 
erstellen.
Laden; Validierungsfehler am 
Feld; falsche Zugangsdaten mit 
neutraler Meldung; 
Netzwerkfehler mit Retry; 
Erfolg/Weiterleitung.
Sign-up
E-Mail, Passwort, Bestätigung, 
Nutzungsbedingungen-Verweis.
Passwortregeln; E-Mail bereits 
registriert; Bestätigung 
ausstehend; Bestätigung 
erneut senden; Rate-limit-
Hinweis.
Forgot/Reset password
E-Mail zum Zurücksetzen bzw. 
neues Passwort aus Link.
Unbekannte/ungültige Anfrage 
ohne unnötige 
Kontooffenlegung; Link 
abgelaufen; Passwort 
erfolgreich geändert.
Profil-Onboarding
Anzeigename, eindeutiger 
Handle, optional Avatar.
Handle 
verfügbar/vergeben/ungültig; 
Upload-Fehler; überspringbare 
Avatar-Auswahl.



--- Seite 6 ---

Übersicht
Willkommen, CTA „Training 
starten“, laufendes Training 
fortsetzen, nächste 
Challenge/Wochenfortschritt, 
zuletzt absolvierte Sessions, 
Gruppen-Kurzliste.
Erstnutzer ohne Gruppe; kein 
Training bisher; laufender 
Entwurf; Gruppenladung; 
Datenfehler und Retry. Keine 
gefälschten Demo-Werte.
Training starten/Editor
Routine oder leer; 
Übungssuche; Übungsliste; 
Satzeditor; Timer optional.
Leeres Training; Suche ohne 
Treffer; Übung hinzufügen; Satz 
leer/ungültig; Speichern; 
offline/Fehler; Entwurf 
wiederherstellen; 
Abbruchdialog.
Training abschließen
Zusammenfassung und 
Freigabewahl.
Keine Übungen/Sätze; 
Freigabe-Dialog; Abschluss 
läuft; Fehler beim Speichern; 
Erfolg.
Training-Detail
Datum, Dauer, Übungen, Sätze, 
ggf. persönliche PR-Markierung 
und geteilte Gruppe.
Privatansicht des Besitzers; 
Gruppenansicht mit nur 
freigegebenen Daten; nicht 
autorisiert/gelöscht.
Historie
Chronologische Liste, 
Datumsfilter einfach, 
Trainingszusammenfassung, 
Suchfeld optional.
Erster Eintrag fehlt; keine 
Treffer; paginiert/lädt mehr; 
Fehler. MVP braucht keine 
komplexe Analyse- oder 
Kalendervisualisierung.
Gruppenliste
Eigene Gruppen, 
Mitgliederanzahl, aktuelle 
Woche, Gruppe erstellen, 
Freunde verwalten.
Noch keine Gruppe; 
Ladezustand; Gruppe 
archiviert; Fehler.
Gruppe erstellen
Name, optional Beschreibung, 
Zeitzone, feste private 
Sichtbarkeit.
Feldvalidierung; Handle nicht 
relevant; Speichern; 
doppelte/fehlgeschlagene 
Anfrage.
Gruppenübersicht
Name, aktuelle 
Gruppenwoche, Ranglisten-
Vorschau, Mitglieder, Einladen, 
Trainings teilen.
Neue leere Gruppe; nur Owner; 
Mitgliedschaft entzogen; 
Gruppe archiviert; fehlende 
Berechtigung.
Rangliste
Zeitraumumschalter Woche 
aktuell/vorherig, Regelhinweis, 
geordnete Mitgliederliste.
Noch keine geteilten Trainings; 
Gleichstände; Nutzer 
außerhalb der Gruppe; 
Abfragefehler; Daten werden 
geladen.


