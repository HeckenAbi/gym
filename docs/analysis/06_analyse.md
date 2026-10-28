# Analyse 6: Gym Battle – Produkt- und UX-Konzep_teil_06.md

### 1. Konkrete Produktanforderungen

- **Gruppenverwaltung**
  - Gruppen erstellen, listen, umbenennen, archivieren.
  - Mitgliederliste/Rollen und Freundschaftsanfragen über Handle.
  - Invite-Link erzeugen, Vorschau, Annahme, Ablauf und Widerruf.
  - Einladungsbeitritt atomar und gegen doppelte/konkurrierende Requests abgesichert.
  - Abnahmekriterium: Private Gruppe ist für Nichtmitglieder auch per direkter API nicht sichtbar; nur gültiger Invite fügt Mitglied hinzu.

- **Trainingslog**
  - System-Übungskatalog mit begrenzter Auswahl und eigener privater Übung.
  - Session starten, Übungen hinzufügen, Sätze mit Gewicht/Wiederholungen editieren, Session autospeichern und fortsetzen.
  - Session abschließen, privat lassen oder für genau eine Gruppe freigeben.
  - Historienliste und Detailansicht.
  - Fehler- und Doppelklickverhalten, Save-Status und fehlgeschlagene Speicherung testen.
  - Abnahmekriterium: Nutzer kann eine Session beginnen, schließen, später in History öffnen; fremde Nutzer können private Daten auch per Direktabfrage nicht sehen.

- **Rangliste und Motivation**
  - Gruppenkalenderwoche aus `groups.timezone` berechnen.
  - Rangliste serverseitig aggregieren; nur freigegebene Sessions zählen.
  - Regeln sichtbar machen, Gleichstand behandeln und Vorwoche anzeigen.
  - Übersichtskarte und leere Zustände anbinden.
  - Abnahmekriterium: Tests decken Wochenwechsel/Zeitzone, maximal einen Punkt pro Tag, Wochenlimit 5, Gleichstand, Session-Entteilen und Gruppenwechsel ab.

### 2. Funktionen und Nutzerabläufe

- **Gruppenverwaltung**
  - Nutzer kann eine neue Gruppe erstellen und sie benennen.
  - Nutzer kann Mitglieder hinzufügen durch Invite-Link oder Freundschaftsanfrage.
  - Nutzer kann seine Gruppe archivieren.
  - Nutzer kann seine Gruppe verlassen.

- **Trainingslog**
  - Nutzer kann eine neue Session starten und Übungen hinzufügen.
  - Nutzer kann Sätze mit Gewicht und Wiederholungen editieren.
  - Nutzer kann eine Session abschließen und sie privat oder für eine bestimmte Gruppe freigeben.
  - Nutzer kann seine Trainingshistorie ansehen und Details zu einer bestimmten Session betrachten.

- **Rangliste und Motivation**
  - Nutzer kann die Rangliste der Gruppe ansehen.
  - Nutzer kann die Regeln der Rangliste verstehen.
  - Nutzer kann die Wochenrangliste für Trainingskonsistenz ansehen.

### 3. Datenmodell und Datenregeln

- **Gruppen**
  - `id`: Eindeutige Gruppen-ID.
  - `name`: Name der Gruppe.
  - `members`: Liste der Mitglieder mit Rollen.
  - `timezone`: Zeitzone der Gruppe.
  - `archived`: Status der Gruppe (archiviert oder nicht).

- **Trainingslog**
  - `id`: Eindeutige Session-ID.
  - `user_id`: ID des Nutzers, der die Session gestartet hat.
  - `group_id`: ID der Gruppe, zu der die Session gehört.
  - `exercises`: Liste der Übungen in der Session.
  - `status`: Status der Session (privat, freigegeben).

- **Rangliste**
  - `id`: Eindeutige Rangliste-ID.
  - `group_id`: ID der Gruppe, zu der die Rangliste gehört.
  - `user_id`: ID des Nutzers.
  - `points`: Punkte des Nutzers.
  - `rank`: Rang des Nutzers.

### 4. Sicherheit und Berechtigungen

- **Sicherheitsprüfung**
  - Alle RLS-Policies und Mutationen werden sicherheitsprüft.
  - Rate-Limits für Suche und Invite werden eingerichtet.
  - Keine Secrets im Client.

- **Berechtigungen**
  - Nur gültiger Invite fügt Mitglied hinzu.
  - Fremde Nutzer können private Daten nicht sehen.

### 5. UI, Barrierefreiheit und Fehlerfälle

- **UI**
  - Responsive Design für Mobilviewport, Tablet und Desktop.
  - Tastaturnavigationsbar.
  - Kontrast und Screenreader-Basics.

- **Barrierefreiheit**
  - Barrierefreie UI für alle Nutzer.

- **Fehlerfälle**
  - Abgelaufene Einladung.
  - Gelöschte Gruppe.
  - Veraltete Sitzung.
  - Netzwerkabbruch während Speicherung.
  - Doppelter Abschluss.
  - Gelöschte Übung.

### 6. Offene Fragen und Widersprüche

- **Offene Fragen**
  - Wie wird die Authentifizierung und Autorisierung der Nutzer verwaltet?
  - Wie wird die Benachrichtigung über neue Einladungen und Trainingsdaten implementiert?
  - Wie wird die Datenverwaltung und -sicherheit im Backend implementiert?

- **Widersprüche**
  - Es wird erwähnt, dass die MVP-Grenze bestimmte Funktionen enthält, die nicht enthalten sein sollten. Dies könnte zu Konflikten führen, wenn diese Funktionen in der Zukunft hinzugefügt werden.
