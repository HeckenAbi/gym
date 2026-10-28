# Analyse 5: Gym Battle – Produkt- und UX-Konzep_teil_05.md

### 1. Konkrete Produktanforderungen

- **Datenschutzfreundliche Logs**: Keine Passwörter, Session-Tokens, Einladungs-URLs oder Trainingsdetails in Fehler-/Analytics-Logs.
- **Konto-Löschung**: Sessions, Freundschaften und Mitgliedschaften nach dokumentierter Löschregel behandeln; Anonymisierung des Profilnamens für historische Gruppenpunkte definieren.

### 2. Funktionen und Nutzerabläufe

- **Profil-Management**:
  - Nutzer sieht eigenes Profil; eingeschränkte öffentliche Felder nur bei bestätigter Freundschaft oder gemeinsamer aktiver Gruppe.
  - Handle-Suche über begrenzte Funktion, nie rohe Volltabellenabfrage.
  - Eigenes Profil nur mit `id = auth.uid()`, Profilanlage nach Registrierung serverseitig/Trigger.
  - Nur eigenes Profil und nur erlaubte Profilfelder. Rolle/ID nicht änderbar.

- **Freundschaften**:
  - Nur Teilnehmer der Beziehung.
  - `initiated_by = auth.uid()`, eigener User ist Teilnehmer, kein Duplikat/Selbstlink.
  - Nur Empfänger kann `pending → accepted` setzen; Delete nur durch Beteiligten. Initiator und User-IDs danach unveränderlich.

- **Gruppen**:
  - Aktive Mitglieder; nicht Mitglieder erhalten keine Gruppenmetadaten außer einer minimalen geprüften Invite-Vorschau.
  - Authentifizierter Ersteller; Owner-Mitgliedschaft in derselben atomaren Transaktion anlegen.
  - Owner/Admin darf Name/Beschreibung/Zeitzone nach Policy ändern; Archivieren nur Owner.

- **Gruppenmitgliedschaft**:
  - Aktive Gruppenmitglieder sehen Mitglieder derselben Gruppe.
  - Ausschließlich geprüfter Invite-Flow; kein freies Self-Insert.
  - Nutzer darf eigenen Status auf `left` setzen; Owner/Admin darf regulär verwalten. Selbstbeförderung zu Admin/Owner verbieten. Owner-Verwaltung.

- **Übungen**:
  - Systemkatalog für angemeldete Nutzer; eigene Übung nur Ersteller.
  - Eigene Übung nur mit `owner_id = auth.uid()` und `is_system = false`.
  - Nur Eigentümer; Systemdatensätze nur über privilegierten Wartungspfad.

- **Trainings-Sessions**:
  - Eigentümer vollständig; Gruppenmitglieder nur `completed`-Session mit `shared_group_id` ihrer aktiven Gruppe.
  - Private Session ausschließlich Eigentümer.
  - Nur für `user_id = auth.uid()`, `shared_group_id` muss aktive Mitgliedschaft aufweisen.
  - Nur Eigentümer; Wechsel von `user_id` verboten. Teilen/Entteilen nur als Eigentümer und aktive Mitgliedschaft. Löschen bevorzugt Soft-delete oder explizite Bestätigung.

- **Trainings-Übungen**:
  - Nur wenn Parent-Session lesbar ist.
  - Nur wenn Parent-Session dem Auth-User gehört und bearbeitbar ist.
  - Gleiche Parent-Prüfung; keine Änderung an fremder Session.

- **Trainings-Sets**:
  - Nur wenn Parent-Kette bis Session lesbar ist.
  - Nur wenn Parent-Session dem Auth-User gehört und in_progress ist.
  - Nur Besitzer der laufenden Session; abgeschlossene Sessions schreibgeschützt, außer explizite Owner-Korrektur.

### 3. Datenmodell und Datenregeln

- **profiles**: Nutzer sieht eigenes Profil; eingeschränkte öffentliche Felder nur bei bestätigter Freundschaft oder gemeinsamer aktiver Gruppe.
- **friendships**: Nur Teilnehmer der Beziehung. `initiated_by = auth.uid()`, eigener User ist Teilnehmer, kein Duplikat/Selbstlink. Nur Empfänger kann `pending → accepted` setzen; Delete nur durch Beteiligten. Initiator und User-IDs danach unveränderlich.
- **groups**: Aktive Mitglieder; nicht Mitglieder erhalten keine Gruppenmetadaten außer einer minimalen geprüften Invite-Vorschau. Authentifizierter Ersteller; Owner-Mitgliedschaft in derselben atomaren Transaktion anlegen. Owner/Admin darf Name/Beschreibung/Zeitzone nach Policy ändern; Archivieren nur Owner.
- **group_members**: Aktive Gruppenmitglieder sehen Mitglieder derselben Gruppe. Ausschließlich geprüfter Invite-Flow; kein freies Self-Insert. Nutzer darf eigenen Status auf `left` setzen; Owner/Admin darf regulär verwalten. Selbstbeförderung zu Admin/Owner verbieten. Owner-Verwaltung.
- **exercises**: Systemkatalog für angemeldete Nutzer; eigene Übung nur Ersteller. Eigene Übung nur mit `owner_id = auth.uid()` und `is_system = false`. Nur Eigentümer; Systemdatensätze nur über privilegierten Wartungspfad.
- **workout_sessions**: Eigentümer vollständig; Gruppenmitglieder nur `completed`-Session mit `shared_group_id` ihrer aktiven Gruppe. Private Session ausschließlich Eigentümer. Nur für `user_id = auth.uid()`, `shared_group_id` muss aktive Mitgliedschaft aufweisen. Nur Eigentümer; Wechsel von `user_id` verboten. Teilen/Entteilen nur als Eigentümer und aktive Mitgliedschaft. Löschen bevorzugt Soft-delete oder explizite Bestätigung.
- **workout_exercises**: Nur wenn Parent-Session lesbar ist. Nur wenn Parent-Session dem Auth-User gehört und bearbeitbar ist. Gleiche Parent-Prüfung; keine Änderung an fremder Session.
- **workout_sets**: Nur wenn Parent-Kette bis Session lesbar ist. Nur wenn Parent-Session dem Auth-User gehört und in_progress ist. Nur Besitzer der laufenden Session; abgeschlossene Sessions schreibgeschützt, außer explizite Owner-Korrektur.

### 4. Sicherheit und Berechtigungen

- **RLS-Policy-Matrix**:
  - Lesen, Einfügen, Ändern/Löschen
  - `profiles`: Nur eigenes Profil und nur erlaubte Profilfelder. Rolle/ID nicht änderbar.
  - `friendships`: Nur Teilnehmer der Beziehung. `initiated_by = auth.uid()`, eigener User ist Teilnehmer, kein Duplikat/Selbstlink. Nur Empfänger kann `pending → accepted` setzen; Delete nur durch Beteiligten. Initiator und User-IDs danach unveränderlich.
  - `groups`: Aktive Mitglieder; nicht Mitglieder erhalten keine Gruppenmetadaten außer einer minimalen geprüften Invite-Vorschau. Authentifizierter Ersteller; Owner-Mitgliedschaft in derselben atomaren Transaktion anlegen. Owner/Admin darf Name/Beschreibung/Zeitzone nach Policy ändern; Archivieren nur Owner.
  - `group_members`: Aktive Gruppenmitglieder sehen Mitglieder derselben Gruppe. Ausschließlich geprüfter Invite-Flow; kein freies Self-Insert. Nutzer darf eigenen Status auf `left` setzen; Owner/Admin darf regulär verwalten. Selbstbeförderung zu Admin/Owner verbieten. Owner-Verwaltung.
  - `exercises`: Systemkatalog für angemeldete Nutzer; eigene Übung nur Ersteller. Eigene Übung nur mit `owner_id = auth.uid()` und `is_system = false`. Nur Eigentümer; Systemdatensätze nur über privilegierten Wartungspfad.
  - `workout_sessions`: Eigentümer vollständig; Gruppenmitglieder nur `completed`-Session mit `shared_group_id` ihrer aktiven Gruppe. Private Session ausschließlich Eigentümer. Nur für `user_id = auth.uid()`, `shared_group_id` muss aktive Mitgliedschaft aufweisen. Nur Eigentümer; Wechsel von `user_id` verboten. Teilen/Entteilen nur als Eigentümer und aktive Mitgliedschaft. Löschen bevorzugt Soft-delete oder explizite Bestätigung.
  - `workout_exercises`: Nur wenn Parent-Session lesbar ist. Nur wenn Parent-Session dem Auth-User gehört und bearbeitbar ist. Gleiche Parent-Prüfung; keine Änderung an fremder Session.
  - `workout_sets`: Nur wenn Parent-Kette bis Session lesbar ist. Nur wenn Parent-Session dem Auth-User gehört und in_progress ist. Nur Besitzer der laufenden Session; abgeschlossene Sessions schreibgeschützt, außer explizite Owner-Korrektur.

### 5. UI, Barrierefreiheit und Fehlerfälle

- **UI, Barrierefreiheit und Fehlerfälle**: Keine spezifischen Anforderungen in der Quelle.

### 6. Offene Fragen und Widersprüche

- **Offene Fragen und Widersprüche**: Keine spezifischen Anforderungen in der Quelle.
