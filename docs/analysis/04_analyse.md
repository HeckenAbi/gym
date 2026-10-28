# Analyse 4: Gym Battle – Produkt- und UX-Konzep_teil_04.md

### 1. Konkrete Produktanforderungen

- **Benutzerprofile:**
  - Eindeutige Benutzernamen (normalisiert/lowercase)
  - Anzeigename und Avatarpfad (optional)
  - Zeitzone und Gewichtseinheit
  - Erstellung und Aktualisierungstimestamps

- **Freundschaften:**
  - Benutzer-IDs in kanonischer Reihenfolge
  - Eindeutige Paare von Benutzer-IDs
  - Initiierte Freundschaft muss durch den Initiator bestätigt werden
  - Keine Selbstfreundschaft
  - Möglichkeit, Freundschaften zu ablehnen oder zu entfernen

- **Gruppen:**
  - Gruppenname und Beschreibung (optional)
  - Ersteller der Gruppe wird als Owner-Mitglied eingetragen
  - Gruppen sind privat
  - Archivierung der Gruppe (optional)

- **Gruppenmitglieder:**
  - Rollen: Owner, Admin, Mitglied
  - Status: aktiv, verlassen, entfernt
  - Zeitpunkt der Eintritt

- **Gruppenladungen:**
  - Einladungstoken mit Hash
  - Gültigkeitsdatum und Nutzungslimit
  - Möglichkeit, Einladungen zu widerrufen

- **Übungen:**
  - Name, Muskelgruppe, Gerät (optional)
  - Systemübungen für angemeldete Nutzer lesbar
  - Eigene Übungen sind im MVP privat und nur ihrem Ersteller sichtbar

- **Trainingsabläufe:**
  - Titel (optional)
  - Status: in_progress, completed, cancelled
  - Start- und Endzeit
  - Teilen mit einer Gruppe (optional)
  - Erstellung und Aktualisierungstimestamps

- **Übungsabläufe:**
  - Position innerhalb der Session
  - Notizen (optional)

- **Sätze:**
  - Gewicht in kg (nullable)
  - Anzahl der Wiederholungen
  - Status: abgeschlossen
  - Erstellungstimestamp

### 2. Funktionen und Nutzerabläufe

- **Benutzerprofile:**
  - Anzeige und Bearbeitung des eigenen Profils
  - Anzeige der eigenen Trainingsabläufe

- **Freundschaften:**
  - Anfrage und Bestätigung von Freundschaften
  - Ablehnung oder Entfernung von Freundschaften

- **Gruppen:**
  - Erstellung und Bearbeitung von Gruppen
  - Einladung von Freunden in Gruppen
  - Annehmen von Einladungen in Gruppen

- **Trainingsabläufe:**
  - Erstellung und Bearbeitung von Trainingsabläufen
  - Teilen von Trainingsabläufen mit Gruppen
  - Abschließen von Trainingsabläufen

- **Übungsabläufe:**
  - Hinzufügen von Übungen zu Trainingsabläufen
  - Hinzufügen von Sätzen zu Übungsabläufen

- **Sätze:**
  - Hinzufügen von Sätzen zu Übungsabläufen
  - Aktualisieren von Sätzen

### 3. Datenmodell und Datenregeln

- **Indizes:**
  - `group_members(user_id, status)`
  - `group_members(group_id, status)`
  - `workout_sessions(user_id, completed_at)`
  - `workout_sessions(shared_group_id, completed_at)`
  - `workout_exercises(workout_session_id, position)`
  - `workout_sets(workout_exercise_id, position)`

- **Check Constraints:**
  - Gültige Status-/Rollenwerte
  - `weight_kg >= 0`
  - `reps > 0` bei abgeschlossenen Sätzen
  - `expires_at > created_at`
  - `max_uses > 0`

- **Unique Constraints:**
  - Doppelte Freundschaftspaare
  - Doppelte Gruppenmitgliedschaften
  - Doppelte Übungs-/Satzpositionen

- **Atomare Operationen:**
  - Erstellen von Gruppe + Owner-Mitgliedschaft
  - Akzeptieren eines Gruppeninvites + Zählererhöhung

### 4. Sicherheit und Berechtigungen

- **RLS für jede Tabelle aktivieren**
- **service_role in serverseitiger Laufzeit/Secret Store**
- **Authentifizierte Identität aus der validierten Supabase-Session beziehen**
- **RLS ist die Sicherheitsgrenze, UI-Filter nur UX**
- **Server Actions/Route Handlers validieren Eingaben und Zustandsübergänge**
- **Gruppenbeitritt und Einladungstoken serverseitig prüfen**
- **Token stark zufällig, einmalig/nutzungsbegrenzt, gehasht gespeichert, widerrufbar und befristet**
- **Akzeptanz rate-limiten**
- **Keine E-Mail-Suche, keine Kontoexistenzbestätigung bei Passwort-Reset, keine öffentliche Auflistung aller Profile**
- **Nutzer können nur eigene Sessions und untergeordnete Satzdaten bearbeiten**

### 5. UI, Barrierefreiheit und Fehlerfälle

- **Benutzerfreundliche Benutzeroberfläche**
- **Barrierefreie Designprinzipien**
- **Fehlerfallbehandlung:**
  - Benutzerfreundliche Fehlermeldungen
  - Validierung von Eingaben
  - Behandlung von Fehlern bei API-Anfragen

### 6. Offene Fragen und Widersprüche

- **Ranglistenberechnung:**
  - Wie werden gleichstände in der Rangliste behandelt?
  - Wie wird die Rangliste im MVP berechnet und materialisiert?

- **Übungsabläufe:**
  - Wie werden gelöschte eigene Übungen behandelt?
  - Wie wird die Historie der Übungsabläufe bei Katalogänderungen gewahrt?

- **Sätze:**
  - Wie werden Logging-Regeln für Sätze implementiert?
  - Wie werden Sätze in der UI angezeigt und bearbeitet?
