# Quelle: Gym Battle – Produkt- und UX-Konzept.md
# Teil 4

--- Seite 10 ---

profiles
id (PK/FK auth.users.id ), 
username (unique, 
normalisiert/lowercase), 
display_name , avatar_path 
nullable, timezone , 
weight_unit , created_at , 
updated_at
1:1 zu Auth User. E-Mail bleibt 
in auth.users , nie in 
Profil-/Gruppensuche 
offenlegen.
friendships
id , user_low_id , user_high_id , 
initiated_by , status 
( pending , accepted ), 
created_at , updated_at
Beide User-IDs kanonisch 
sortiert; unique Paar; Initiator 
muss Teilnehmer sein; keine 
Selbstfreundschaft. 
decline / remove löscht oder 
beendet die Beziehung durch 
kontrollierte Aktion.
groups
id , name , description 
nullable, created_by , timezone , 
created_at , archived_at nullable
Creator wird beim Erstellen als 
Owner-Mitglied eingetragen. 
Gruppe privat, keine Public-
Flag im MVP.
group_members
group_id , user_id , role 
( owner , admin , member ), 
status ( active , left , removed ), 
joined_at
PK/unique (group_id,user_id) ; 
aktive Mitglieder sehen 
Gruppeninhalte. Genau ein 
Owner, Übertragung nur über 
kontrollierte Aktion.
group_invites
id , group_id , created_by , 
token_hash , target_user_id 
nullable, expires_at , max_uses , 
use_count , revoked_at , 
created_at
Token wird nur gehasht 
gespeichert; niemals 
Hash/Token an beliebige 
Gruppenmitglieder 
zurückgeben. Gültigkeit und 
Nutzung atomar prüfen.
exercises
id , owner_id nullable, name , 
muscle_group nullable, 
equipment nullable, is_system , 
created_at
Systemübungen sind für 
angemeldete Nutzer lesbar. 
Eigene Übungen sind im MVP 
privat und nur ihrem Ersteller 
sichtbar. Unique 
(normalisierter Name, Owner) 
sinnvoll.



--- Seite 11 ---

Beziehungen (Kurzform)
•
auth.users 1—1 profiles
•
profiles N—N profiles über friendships
•
profiles N—N groups über group_members
•
groups 1—N group_invites
•
profiles 1—N workout_sessions
•
groups 1—N workout_sessions über optionale shared_group_id
•
workout_sessions 1—N workout_exercises 1—N workout_sets
•
exercises 1—N workout_exercises ; gelöschte eigene Übungen hinterlassen den Snapshot-
Namen.
Ranglistenberechnung
Keine vorab gespeicherten Punkte im MVP. Für eine Woche in groups.timezone werden 
abgeschlossene Sessions mit shared_group_id = group_id gezählt. Ein Mitglied erhält maximal 
einen Punkt pro lokalem Gruppenkalendertag und maximal fünf Punkte pro Woche. 
completed_at definiert den Zähltag. Gleichstände teilen den Rang. workout_sessions -Details 
workout_sessions
id , user_id , title nullable, 
status 
( in_progress , completed , cancelle
d ), started_at , completed_at 
nullable, shared_group_id 
nullable, created_at , 
updated_at
Besitzer ist Auth-User. 
shared_group_id nur bei aktiver 
Mitgliedschaft des Besitzers; 
sonst NULL . Eine Session teilt 
sich im MVP höchstens mit 
einer Gruppe.
workout_exercises
id , workout_session_id , 
exercise_id nullable, 
exercise_name_snapshot , 
position , notes nullable
Geordnete Übungen innerhalb 
einer Session; Snapshot erhält 
Historie bei Katalogänderung. 
Parent-Session muss dem 
Nutzer gehören.
workout_sets
id , workout_exercise_id , 
position , weight_kg numeric 
nullable, reps integer nullable, 
is_completed , created_at
Satz gehört genau zu einer 
Übung. Mindestens Gewicht 
oder Wiederholungen je Satz 
zulässig; für MVP Logging-Regel 
Gewicht>=0 und Reps>0, wenn 
Satz abgeschlossen. 
Reihenfolge eindeutig pro 
Übung.



--- Seite 12 ---

erscheinen nur, wenn die Mitgliedschaft aktiv ist und die Session ausdrücklich für diese 
Gruppe freigegeben wurde.
Rangliste zunächst serverseitig aus einer aggregierten SQL-Abfrage bzw. einer RLS-sicheren 
Datenbankfunktion berechnen; erst bei nachgewiesenem Bedarf materialisieren. Keine 
clientseitige Summierung aus Daten, auf die der Nutzer keinen Lesenzugriff haben darf.
Indizes und Integrität
• Indexe auf group_members(user_id,status) , group_members(group_id,status) , 
workout_sessions(user_id,completed_at) , workout_sessions(shared_group_id,completed_at) , 
workout_exercises(workout_session_id,position) , workout_sets(workout_exercise_id,position) .
• Check constraints für gültige Status-/Rollenwerte, weight_kg >= 0 , reps > 0 bei 
abgeschlossenen Sätzen, expires_at > created_at , max_uses > 0 .
• Unique Constraints gegen doppelte Freundschaftspaare, doppelte 
Gruppenmitgliedschaften und doppelte Übungs-/Satzpositionen.
• Erstellen von Gruppe + Owner-Mitgliedschaft sowie Akzeptieren eines Gruppeninvites + 
Zählererhöhung müssen atomar sein.
6. Sicherheit und Supabase-RLS
Sicherheitsgrundsätze
1. RLS für jede Tabelle aktivieren, die über Supabase-APIs erreichbar ist. Standard ist 
„deny“, danach gezielt erlauben.
2.
service_role ausschließlich in serverseitiger Laufzeit/Secret Store, niemals in Browser-
Bundle, Client-Komponente oder URL.
3. Authentifizierte Identität aus der validierten Supabase-Session beziehen; niemals 
user_id aus einem Formular als Berechtigungsbeweis verwenden.
4. RLS ist die Sicherheitsgrenze, UI-Filter sind nur UX. Server Actions/Route Handlers 
validieren zusätzlich Eingaben und Zustandsübergänge.
5. Gruppenbeitritt und Einladungstoken serverseitig prüfen. Token stark zufällig, 
einmalig/nutzungsbegrenzt, gehasht gespeichert, widerrufbar und befristet. Akzeptanz 
rate-limiten.
6. Keine E-Mail-Suche, keine Kontoexistenzbestätigung bei Passwort-Reset, keine 
öffentliche Auflistung aller Profile. Nutzer finden Freunde nur über exakten 
Handle/kleine begrenzte Suche.
7. Nutzer können nur eigene Sessions und untergeordnete Satzdaten bearbeiten. Nach 
Abschluss sind Sessiondaten im MVP nur vom Eigentümer änderbar; Änderungen an 


