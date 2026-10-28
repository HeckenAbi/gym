# Analyse 2: Gym Battle – Produkt- und UX-Konzep_teil_02.md

### 1. Konkrete Produktanforderungen

- **Gruppenverwaltung:**
  - Nutzer können sich in eine Gruppe einladen, indem sie einen Einladungslink verwenden.
  - Einladungslink kann widerrufen werden; im MVP läuft er nach 7 Tagen ab und ist für eine Person nutzbar.
  - Wiederverwendbare Gruppenlinks können später ergänzt werden.
  - Die Gruppe erscheint für beide Nutzer in der Gruppenliste.
  - Der Owner sieht einen Hinweis, falls noch keine Mitglieder oder Trainings vorhanden sind.

- **Trainingsprotokollierung:**
  - Nutzer können ein Training starten, optional eine bestehende Routine wählen oder ein leeres Training beginnen.
  - Trainingsansicht: Trainingsdauer, Liste der Übungen, Übung hinzufügen, pro Übung schnell editierbare Sätze.
  - Ein Satz erfasst Gewicht (kg) und Wiederholungen; Satz hinzufügen, duplizieren und entfernen.
  - Vorheriger Leistungswert der Übung wird neben der Eingabe gezeigt, falls vorhanden.
  - Änderungen werden nach Eingabe bzw. Satzbestätigung automatisch gespeichert.
  - Sichtbarer Status: „Wird gespeichert“, „Gespeichert“ oder „Nicht gespeichert – erneut versuchen“.
  - Nutzer können das Training beenden und die Übungs-/Satzanzahl, Dauer, optionalen Titel und Teilungswahl (Privat oder mit [Gruppe] teilen) bestätigen.
  - Bei Gruppenfreigabe erklärt die UI genau, welche Mitglieder Trainingsname, Übungen, Sätze, Gewicht, Wiederholungen und Abschlusszeit sehen.
  - Training wird abgeschlossen, ein Erfolgszustand zeigt Zusammenfassung, neue persönliche Bestleistungen (nur wenn zuverlässig errechenbar) und Gruppenergebnis.
  - Abbruch/Recovery: Laufendes Training bleibt als Entwurf erhalten und erscheint als „Training fortsetzen“. Abbrechen löscht erst nach Bestätigung. Bei Netzwerkfehlern werden Eingaben nicht still verworfen; Speichern und Abschluss bleiben gesperrt bzw. in retry-fähigem Zustand.

- **Gruppenrangliste:**
  - Nutzer können eine Gruppe öffnen und die Rangliste ansehen.
  - Standardzeitraum ist die laufende Gruppenkalenderwoche.
  - Mitglieder werden nach Punkten absteigend angezeigt. Gleichstand erhält denselben Rang; sekundär wird alphabetisch nach Anzeigename sortiert.
  - Zeile zeigt Rang, Avatar/Initialen, Anzeigename, Punkte und Anzahl unterschiedlicher Trainingstage.
  - Details eines Trainings sind nur sichtbar, wenn es für diese Gruppe geteilt wurde.
  - Nutzer kann vorherige Woche ansehen.
  - Empty state erläutert die Regel und bietet „Training protokollieren“. Ranglistenplatzierung enthält keine beschämenden Warnungen oder negativen/roten „Verlierer“-Botschaften.

### 2. Funktionen und Nutzerabläufe

- **Sign-in:**
  - E-Mail, Passwort, Anmelden, Passwort vergessen, Konto erstellen.
  - Ladezustand; Validierungsfehler am Feld; falsche Zugangsdaten mit neutraler Meldung; Netzwerkfehler mit Retry; Erfolg/Weiterleitung.

- **Sign-up:**
  - E-Mail, Passwort, Bestätigung, Nutzungsbedingungen-Verweis.
  - Passwortregeln; E-Mail bereits registriert; Bestätigung ausstehend; Bestätigung erneut senden; Rate-limit-Hinweis.

- **Forgot/Reset password:**
  - E-Mail zum Zurücksetzen bzw. neues Passwort aus Link.
  - Unbekannte/ungültige Anfrage ohne unnötige Kontooffenlegung; Link abgelaufen; Passwort erfolgreich geändert.

- **Profil-Onboarding:**
  - Anzeigename, eindeutiger Handle, optional Avatar.
  - Handle verfügbar/vergeben/ungültig; Upload-Fehler; überspringbare Avatar-Auswahl.

- **Training starten/Editor:**
  - Routine oder leer; Übungssuche; Übungsliste; Satzeditor; Timer optional.
  - Leeres Training; Suche ohne Treffer; Übung hinzufügen; Satz leer/ungültig; Speichern; offline/Fehler; Entwurf wiederherstellen; Abbruchdialog.

- **Training abschließen:**
  - Zusammenfassung und Freigabewahl.
  - Keine Übungen/Sätze; Freigabe-Dialog; Abschluss läuft; Fehler beim Speichern; Erfolg.

- **Training-Detail:**
  - Datum, Dauer, Übungen, Sätze, ggf. persönliche PR-Markierung und geteilte Gruppe.
  - Privatansicht des Besitzers; Gruppenansicht mit nur freigegebenen Daten; nicht autorisiert/gelöscht.

- **Historie:**
  - Chronologische Liste, Datumsfilter einfach, Trainingszusammenfassung, Suchfeld optional.
  - Erster Eintrag fehlt; keine Treffer; paginiert/lädt mehr; Fehler.

- **Gruppenliste:**
  - Eigene Gruppen, Mitgliederanzahl, aktuelle Woche, Gruppe erstellen, Freunde verwalten.
  - Noch keine Gruppe; Ladezustand; Gruppe archiviert; Fehler.

- **Gruppe erstellen:**
  - Name, optional Beschreibung, Zeitzone, feste private Sichtbarkeit.
  - Feldvalidierung; Handle nicht relevant; Speichern; doppelte/fehlgeschlagene Anfrage.

- **Gruppenübersicht:**
  - Name, aktuelle Gruppenwoche, Ranglisten-Vorschau, Mitglieder, Einladen, Trainings teilen.
  - Neue leere Gruppe; nur Owner; Mitgliedschaft entzogen; Gruppe archiviert; fehlende Berechtigung.

- **Rangliste:**
  - Zeitraumumschalter Woche aktuell/vorherig, Regelhinweis, geordnete Mitgliederliste.
  - Noch keine geteilten Trainings; Gleichstände; Nutzer außerhalb der Gruppe; Abfragefehler; Daten werden geladen.

### 3. Datenmodell und Datenregeln

- **Gruppen:**
  - Name, Beschreibung, Zeitzone, Mitglieder, Trainings.

- **Trainings:**
  - Training-ID, Name, Dauer, Übungen, Sätze, Gewicht, Wiederholungen, Abschlusszeit, Teilungswahl (Privat oder Gruppe).

- **Übungen:**
  - Übung-ID, Name, Beschreibung, Trainings-ID.

- **Sätze:**
  - Satz-ID, Gewicht, Wiederholungen, Übung-ID.

- **Mitglieder:**
  - Mitglied-ID, Anzeigename, Handle, Avatar, Gruppen.

- **Ranglisten:**
  - Rang-ID, Mitglied-ID, Punkte, Trainingsstage.

### 4. Sicherheit und Berechtigungen

- **Authentifizierung:**
  - Benutzer müssen sich mit E-Mail und Passwort anmelden.
  - Passwort vergessen und neues Passwort über Link zurücksetzen.

- **Berechtigungen:**
  - Owner kann Trainings protokollieren, Mitglieder einladen und Trainings teilen.
  - Mitglieder können Trainings protokollieren und teilen, wenn sie in einer Gruppe sind.
  - Nur Owner kann Gruppen erstellen und Mitglieder verwalten.

### 5. UI, Barrierefreiheit und Fehlerfälle

- **UI:**
  - Benutzerfreundliche Benutzeroberfläche mit klaren Labels und Icons.
  - Konsistente Farbschema und Schriftarten.

- **Barrierefreiheit:**
  - Texte sind lesbar und zugänglich für Screenreaders.
  - Tastenabkürzungen für Benutzer mit Behinderungen.

- **Fehlerfälle:**
  - Validierung von Eingabefeldern.
  - Fehlermeldungen bei Netzwerkfehlern und Datenbankproblemen.
  - Retry-Funktionalität bei Netzwerkfehlern.

### 6. Offene Fragen und Widersprüche

- **Einladungslink:**
  - Wie werden die Einladungslinks verwaltet und gespeichert?
  - Welche Sicherheitsmaßnahmen werden für die Einladungslinks angewendet?

- **Ranglistenplatzierung:**
  - Wie werden Punkte berechnet und wie werden gleichstände behandelt?
  - Welche Informationen werden für gleichstehende Mitglieder angezeigt?

- **Offline-Funktionalität:**
  - Wie werden offline-Funktionalität und Datenverwaltung implementiert?
  - Welche Daten werden offline gespeichert und wie werden sie wiederhergestellt?

- **Datenfehler und Retry:**
  - Wie werden Datenfehler und Retry-Funktionalität implementiert?
  - Welche Fehler werden abgefangen und wie werden sie behandelt?
