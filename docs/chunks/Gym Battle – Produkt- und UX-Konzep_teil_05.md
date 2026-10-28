# Quelle: Gym Battle – Produkt- und UX-Konzept.md
# Teil 5

--- Seite 13 ---

geteilten Daten müssen als Eigentümeraktion erfolgen.
8. Datenschutzfreundliche Logs: keine Passwörter, Session-Tokens, Einladungs-URLs oder 
Trainingsdetails in Fehler-/Analytics-Logs.
9. Konto löschen muss Sessions, Freundschaften und Mitgliedschaften nach 
dokumentierter Löschregel behandeln; geteilte Gruppenhistorie darf nicht 
versehentlich personenbezogene Daten weiter zeigen. MVP kann Anonymisierung des 
Profilnamens für historische Gruppenpunkte definieren.
RLS-Policy-Matrix
Tabelle
Lesen
Einfügen
Ändern/Löschen
profiles
Nutzer sieht eigenes 
Profil; eingeschränkte 
öffentliche Felder nur 
bei bestätigter 
Freundschaft oder 
gemeinsamer aktiver 
Gruppe. Handle-Suche 
über begrenzte 
Funktion, nie rohe 
Volltabellenabfrage.
Eigenes Profil nur mit 
id = auth.uid() ; 
Profilanlage nach 
Registrierung 
serverseitig/Trigger.
Nur eigenes Profil und 
nur erlaubte 
Profilfelder. Rolle/ID 
nicht änderbar.
friendships
Nur Teilnehmer der 
Beziehung.
initiated_by = auth.uid() , 
eigener User ist 
Teilnehmer, kein 
Duplikat/Selbstlink.
Nur Empfänger kann 
pending → accepted 
setzen; Delete nur 
durch Beteiligten. 
Initiator und User-IDs 
danach 
unveränderlich.
groups
Aktive Mitglieder; 
nicht Mitglieder 
erhalten keine 
Gruppenmetadaten 
außer einer minimalen 
geprüften Invite-
Vorschau.
Authentifizierter 
Ersteller; Owner-
Mitgliedschaft in 
derselben atomaren 
Transaktion anlegen.
Owner/Admin darf 
Name/Beschreibung/Z
eitzone nach Policy 
ändern; Archivieren 
nur Owner.
group_members
Aktive 
Gruppenmitglieder 
sehen Mitglieder 
derselben Gruppe.
Ausschließlich 
geprüfter Invite-Flow; 
kein freies Self-Insert.
Nutzer darf eigenen 
Status auf left setzen; 
Owner/Admin darf 
regulär verwalten. 
Selbstbeförderung zu 
Admin/Owner 
verbieten. Owner-



--- Seite 14 ---

Policy-Implementierungshinweise:
• RLS-Prüfungen für Gruppenmitgliedschaft können in eng begrenzten 
Datenbankfunktionen gekapselt werden, um Policy-Rekursion zu vermeiden. Falls 
Wechsel nur atomar 
und kontrolliert.
group_invites
Owner/Admin 
verwalten Metadaten; 
Mitglieder dürfen 
höchstens einen 
Erstellungsdialog 
auslösen. Roher 
Token/Hash nie lesbar. 
Invite-Vorschau nur 
über validierende 
Funktion/Route.
Owner/Admin darf 
Invite mit created_by = 
auth.uid() erstellen.
Owner/Admin kann 
widerrufen; 
Nutzungszähler nur in 
atomarer 
Serverfunktion 
aktualisieren.
exercises
Systemkatalog für 
angemeldete Nutzer; 
eigene Übung nur 
Ersteller.
Eigene Übung nur mit 
owner_id = auth.uid() 
und is_system = false .
Nur Eigentümer; 
Systemdatensätze nur 
über privilegierten 
Wartungspfad.
workout_sessions
Eigentümer 
vollständig; 
Gruppenmitglieder 
nur completed -
Session mit 
shared_group_id ihrer 
aktiven Gruppe. 
Private Session 
ausschließlich 
Eigentümer.
Nur für user_id = 
auth.uid() ; 
shared_group_id muss 
aktive Mitgliedschaft 
aufweisen.
Nur Eigentümer; 
Wechsel von user_id 
verboten. 
Teilen/Entteilen nur 
als Eigentümer und 
aktive Mitgliedschaft. 
Löschen bevorzugt 
Soft-delete oder 
explizite Bestätigung.
workout_exercises
Nur wenn Parent-
Session lesbar ist.
Nur wenn Parent-
Session dem Auth-
User gehört und 
bearbeitbar ist.
Gleiche Parent-
Prüfung; keine 
Änderung an fremder 
Session.
workout_sets
Nur wenn Parent-Kette 
bis Session lesbar ist.
Nur wenn Parent-
Session dem Auth-
User gehört und 
in_progress ist.
Nur Besitzer der 
laufenden Session; 
abgeschlossene 
Sessions 
schreibgeschützt, 
außer explizite Owner-
Korrektur.



--- Seite 15 ---

SECURITY DEFINER verwendet wird: festen search_path setzen, Ausführungsrechte 
einschränken, Auth-Identität selbst prüfen und nur minimale Funktion freigeben.
• Einladungsbeitritt soll eine einzige transaktionale Funktion/Route verwenden, die 
Token validiert, Status/Ablauf prüft, Membership anlegt und Zähler erhöht. Keine 
clientseitige Mehrschritt-Logik, die teilweise erfolgreiche Zustände hinterlässt.
• Tabellen dürfen keine Policy enthalten, die nur auf vom Client änderbare role - oder 
user_id -Werte vertraut. Für UPDATE sowohl USING (alter Zustand) als auch WITH 
CHECK (neuer Zustand) festlegen.
• Tests mit mindestens zwei Auth-Usern und getrennten Gruppen: jede Policy für 
erlaubten und verbotenen Zugriff testen, einschließlich direkter REST-Abfragen statt 
ausschließlich UI-Klickpfaden.
7. Implementierungsplan nach Abhängigkeiten
Phase 1 – Produktschnitt und Grundlagen
• Festschreiben der Annahmen: Ranglistenregel, Gruppenzeitzone, Einladungsablauf, 
Profile-Sichtbarkeit, ob Sessiondaten nach Abschluss editierbar sind.
• Supabase Projekt lokal/Entwicklungsumgebung, Schema-Migrationen und Testdaten 
einrichten. Migrationen versioniert halten.
• Datenmodell, Constraints, Indizes, RLS und minimal nötige Transaktionsfunktionen 
zuerst anlegen.
• Supabase Auth für E-Mail/Passwort plus Redirect-/Callback-Flow und Sessionhandling 
in Next.js SSR festlegen.
Abnahmekriterium: Tabellen und RLS-Tests belegen Isolation zwischen zwei Nutzern; kein 
Gruppen- oder Sessionzugriff ohne Mitgliedschaft/Eigentum.
Phase 2 – App-Shell und Auth
• App Router Layouts für Auth, Onboarding und geschützten App-Bereich.
• Responsive Navigation, Design-Tokens, Formular-/Button-/Dialog-/Toast-/Empty-State-
Komponenten.
• Registrierung, Anmeldung, Abmelden, Passwort-Reset, Callback, Profil-Onboarding.
• Zugriffsprüfung serverseitig in geschützten Seiten; UI-Redirect allein ist kein Schutz.
Abnahmekriterium: Registrierter Nutzer kann Profil vervollständigen; nicht 
authentifizierter Request kann keine App-Daten lesen.


