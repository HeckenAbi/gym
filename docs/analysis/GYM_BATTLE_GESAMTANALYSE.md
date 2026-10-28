# Gym Battle – Gesamtanalyse

# Abschnitt 1: Gym Battle – Produkt- und UX-Konzep_teil_01.md

### 1. Konkrete Produktanforderungen

- **Produktziel**: Freunde sollen ein Krafttraining schnell protokollieren und sich in privaten Gruppen zu regelmäßigen Trainings motivieren können. Der soziale Teil ist bewusst klein, opt-in und gruppenbasiert. Das Log muss auch ohne Gruppe brauchbar sein.
- **Erste Version**: Eine responsive Web-App, zunächst online nutzbar. PWA-Installation und Offline-Logging sind nicht Teil der ersten Lieferung.
- **UI-Sprache**: Deutsch. Datum, Wochenstart und Zahlenformat folgen dem deutschen Locale; Gewichte werden intern in kg gespeichert, die Anzeige kann später lb unterstützen.
- **Authentifizierung**: Anmeldung erfolgt mit E-Mail und Passwort über Supabase Auth. E-Mail-Bestätigung und Passwort-Reset gehören zum Auth-Flow. Ein separater kostenpflichtiger E-Mail-Dienst wird für Einladungen nicht vorausgesetzt.
- **Freundschaft und Gruppenmitgliedschaft**: Getrennte Konzepte: Eine Freundschaft ist gegenseitig bestätigt; ein Gruppenlink kann direkt eine Gruppeneinladung sein. Nutzer können außerdem Freunde aus ihrer Freundesliste in eine Gruppe einladen.
- **Training**: Ein abgeschlossenes Training ist standardmäßig privat. Um in einer Gruppenrangliste zu zählen, wählt der Nutzer beim Abschluss genau eine Gruppe, mit der dieses Training geteilt wird. Ein Training in mehreren Gruppen gleichzeitig ist nicht Teil des MVP.
- **Rangliste**: Belohnt Trainingshäufigkeit, nicht Gewicht, Volumen oder Körperdaten. Ein abgeschlossener Trainingstag zählt als ein Punkt; pro Nutzer und Gruppenkalenderwoche zählen maximal fünf Trainingstage.
- **Gruppen**: Privat und nur für Mitglieder sichtbar. Es gibt keine globale Suche, keinen öffentlichen Feed, keine Direktnachrichten und keine öffentlichen Profile.
- **Übungskatalog**: Ein kleiner eingebauter Übungskatalog plus eigene, private Übungen. Eine umfangreiche, medizinisch geprüfte Bibliothek wird nicht vorausgesetzt.

### 2. Funktionen und Nutzerabläufe

#### A. Registrierung und erstes Öffnen
1. **Landing/Anmeldeansicht**: „Konto erstellen“ und „Anmelden“; Gruppenlink kann als Return-URL erhalten bleiben.
2. **Registrierung**: Nutzer gibt E-Mail, Passwort und Passwortbestätigung ein und akzeptiert Nutzungsbedingungen/Datenschutzhinweis.
3. **Authentifizierung**: Supabase Auth erstellt die Identität. Bei aktivierter Bestätigung wird eine klare „Prüfe deine E-Mail“-Ansicht gezeigt; erneutes Senden ist möglich und gedrosselt.
4. **Profil-Erstellung**: Nach Authentifizierung legt der Nutzer Anzeigename und eindeutigen Handle fest. Avatar ist optional; Standard ist ein Initialen-Avatar.
5. **Zielmenü**: „Gruppe erstellen“, „Einladung öffnen“ oder „Erst einmal allein trainieren“. Keine erzwungene Kontaktbuch-Synchronisierung.
6. **Weiter zur Übersicht**: Eine kurze Erklärung der privaten Gruppen und des privaten Trainingslogs.

#### B. Private Gruppe erstellen und Freunde einladen
1. **Gruppen erstellen**: Nutzer tippt auf „Gruppen“ und wählt „Gruppe erstellen“.
2. **Formular**: Gruppenname (erforderlich), optional Beschreibung, Zeitzone (Standard aus Profil/Browsereinstellung, editierbar). Sichtbarkeit ist fest „Privat“.
3. **Mitgliedschaft**: Nach Erstellung wird der Ersteller Mitglied mit Rolle owner und landet auf der Gruppenübersicht.
4. **Freunde einladen**: „Freunde einladen“ bietet zwei Wege: vorhandenen bestätigten Freund auswählen oder Einladungslink erstellen/kopieren/teilen. Keine Einladung wird ohne ausdrückliche Aktion verschickt.

### 3. Datenmodell und Datenregeln

- **Benutzer**: E-Mail, Passwort, Anzeigename, Handle, Avatar, Freunde, Gruppen.
- **Gruppen**: Gruppenname, Beschreibung, Zeitzone, Sichtbarkeit (privat), Mitglieder (mit Rollen).
- **Trainings**: Datum, Dauer, Übungen, Gewichte, Notizen, Gruppe (optional).
- **Rangliste**: Nutzer, Gruppe, Anzahl Trainingsstage pro Woche.

### 4. Sicherheit und Berechtigungen

- **Authentifizierung**: Supabase Auth mit E-Mail-Bestätigung und Passwort-Reset.
- **Datenverschlüsselung**: Verschlüsselung der Benutzerdaten und Trainingsdaten.
- **Berechtigungen**: Owner hat volle Kontrolle über die Gruppe und ihre Mitglieder. Andere Mitglieder haben Lese- und Schreibrechte.
- **Zugriffskontrolle**: Nur eingeloggte Nutzer können Trainings protokollieren und Gruppen beitreten.

### 5. UI, Barrierefreiheit und Fehlerfälle

- **UI-Sprache**: Deutsch.
- **Barrierefreiheit**: Mobile: feste Bottom-Navigation mit vier Zielen. Desktop: schmale linke Seitenleiste mit denselben vier Zielen.
- **Fehler- und Randfälle**:
  - E-Mail schon vorhanden
  - Ungültiges Passwort
  - Bestätigungslink abgelaufen
  - Handle vergeben
  - Netzwerkfehler
  - Nutzer öffnet Invite-Link auf anderem Gerät
  - Ungespeicherte Änderungen beim Verlassen des Trainings

### 6. Offene Fragen und Widersprüche

- **Browser-Zurück**: Wie soll das Training bei Browser-Zurück behandelt werden? Soll ein laufendes Training verwerfen oder sich der Nutzer auf das letzte gespeicherte Training zurücksetzen?
- **Kostenpflichtiger E-Mail-Dienst**: Soll ein kostenpflichtiger E-Mail-Dienst für Einladungen vorausgesetzt werden, oder soll die Einladung nur über die App erfolgen?
- **Medizinisch geprüfte Übungskatalog**: Soll eine umfangreiche, medizinisch geprüfte Übungskatalog vorausgesetzt werden, oder soll der eingebaute Übungskatalog ausreichen?
- **Globale Suche und öffentliche Profile**: Soll eine globale Suche und öffentliche Profile vorausgesetzt werden, oder soll die App nur auf Gruppen und Trainingslogs beschränkt sein?

---

# Abschnitt 2: Gym Battle – Produkt- und UX-Konzep_teil_02.md

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

---

# Abschnitt 3: Gym Battle – Produkt- und UX-Konzep_teil_03.md

### 1. Konkrete Produktanforderungen

- **Skeletons statt Springen im Layout**: Ladezustand für Listen und Aktionen getrennt.
- **Leere Zustände erklären den nächsten sinnvollen Schritt und zeigen eine primäre CTA**.
- **Fehlertexte nennen Ursache nur, wenn sie sicher bekannt ist; Retry ist bei transienten Fehlern sichtbar**.
- **Toasts nur für kurze Bestätigung; wichtige Speicherung zusätzlich dauerhaft am Inhalt anzeigen**.
- **Destruktive Aktionen wie Training löschen, Gruppe archivieren oder Freund entfernen brauchen Bestätigung und nennen die Auswirkung**.
- **Formulare behalten Eingaben bei Fehlern. Alle Aktionen sind gegen Doppelklick/mehrfaches Absenden abgesichert**.
- **Tastaturbedienbarkeit, sichtbarer Fokus, Screenreader-Labels und ausreichender Farbkontrast von Anfang an einplanen**.
- **Farbe nie als einziges Signal verwenden: Icon + Text/Statuslabel hinzufügen**.
- **Satzeditor auf schmalen Displays stapeln (Satznummer, Gewicht, Wiederholungen), nicht zu kleine Tabellenfelder**.

### 2. Funktionen und Nutzerabläufe

- **Mitgliederliste, Rollen, Einladung**: Owner kann Admins verwalten und Gruppe archivieren.
- **Einladung erstellt/widerrufen; Nutzer ausgetreten; letzte Owner-Änderung; Berechtigungsfehler**.
- **Invite-Vorschau**: Gruppenname, Einladender, Ablaufhinweis, Beitreten/Anmelden.
- **Token**: Gültig/abgelaufen/widerrufen/verbraucht; bereits Mitglied; Anmeldung nötig; Gruppe voll.
- **Freunde**: Suche nach exaktem Handle/Prefix, eingehende Anfragen, ausgehende Anfragen, bestätigte Freunde.
- **Profil**: Anzeigename, Handle, eigene Trainingszusammenfassung; Profilbearbeitung.
- **Einstellungen**: Locale/Einheiten, Zeitzone, Privatsphäre, Benachrichtigungen, Passwort/Abmelden, Konto löschen.
- **404/Fehler**: Knapp erklären, dass Seite nicht verfügbar ist; zur Übersicht oder Gruppenliste zurück.

### 3. Datenmodell und Datenregeln

- **PostgreSQL-Datenmodell**: Alle Tabellen liegen in einem nicht direkt öffentlich erreichbaren Anwendungsschema (z.B. public mit konsequent aktivierter RLS). Primärschlüssel UUID. Zeitpunkte als timestamptz in UTC; Gruppenkalender verwendet IANA-Zeitzone aus groups.timezone. Referenzielle Löschregeln explizit setzen; kein stilles Löschen historischer Trainings durch Gruppenlöschung.

### 4. Sicherheit und Berechtigungen

- **Berechtigungsfehler**: Nicht zwischen „existiert nicht“ und „keine Berechtigung“ unterscheiden, wenn das Seiten-Dasein sonst private Informationen verraten würde.

### 5. UI, Barrierefreiheit und Fehlerfälle

- **UI**: Hochwertige, sportliche Oberfläche ohne überladene Gaming-Optik. Dunkle Anthrazitflächen bilden die ruhige Basis; ein leuchtendes Lime setzt gezielte Akzente für Fortschritt und primäre Aktionen.
- **Farbpalette**: Token, Wert, Verwendung.
- **Designsystem**: Visuelle Richtung, Farbpalette, Typografie und Layout.
- **Komponentenbibliothek (MVP)**: Button, IconButton, TextField, PasswordField, NumberField, Select, Checkbox, Avatar, Badge, Card, Tabs, BottomNavigation, Sidebar, Dialog/Drawer, Toast, Skeleton, EmptyState, ErrorState, WorkoutSetRow, ExerciseCard, LeaderboardRow, InviteLinkPanel, SaveStatus.
- **Komponentenregeln**: Fokuszustand und disabled/loading für alle interaktiven Komponenten; Zahleneingaben erlauben Dezimal-Komma in deutscher UI und normalisieren intern; Gewicht kann 0 für Körpergewichtsübungen sein, Wiederholungen sind positive ganze Zahlen. Kein Button darf im Ladezustand mehrfach auslösen.

### 6. Offene Fragen und Widersprüche

- **Offene Fragen**: Keine offenen Fragen identifiziert.
- **Widersprüche**: Keine Widersprüche identifiziert.

---

# Abschnitt 4: Gym Battle – Produkt- und UX-Konzep_teil_04.md

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

---

# Abschnitt 5: Gym Battle – Produkt- und UX-Konzep_teil_05.md

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

---

# Abschnitt 6: Gym Battle – Produkt- und UX-Konzep_teil_06.md

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

---

# Abschnitt 7: Gym Battle – visueller Frontend-Pro_teil_01.md

### 1. Konkrete Produktanforderungen
- Die App sollte eine visuelle Frontend-Implementierung von Gym Battle bieten.
- Die App sollte auf kleinen und großen Displays funktionieren.
- Die App sollte eine Dashboard-Ansicht haben.
- Die App sollte einen Trainingseditor haben, der Übungen ergänzen, Sätze hinzufügen oder entfernen, Gewichte und Wiederholungen verändern, ein Training abschließen und die Crew-Freigabe simulieren kann.
- Die App sollte eine Crew-Übersicht haben.
- Die App sollte einen Battle Board mit Rangliste und Challenges haben.
- Die App sollte eine Trainingshistorie und Bestleistungen anzeigen.
- Die App sollte Challenge-Teilnahme, Crew-Erstellung und Einladungslink-Kopieren interaktiv gestalten.
- Die App sollte alle Namen, Avatare, Trainings, Bestleistungen, Ranglistenplätze und Challenges als Beispieldaten anzeigen.
- Die App sollte keine Registrierung, keine realen Nutzerkonten, keine persönlichen Daten oder eine Supabase-Verbindung haben.
- Interaktionen sollten nur React-Zustand im Browser aktualisieren.
- Ein neu abgeschlossenes Training sollte nach einem Reload zurückgesetzt werden.
- Einladungslinks sollten Demo-Text sein und keine Mitglieder aufnehmen.
- Die Teilen-Schaltfläche sollte keine Trainingsdaten übertragen.
- Eine Herausforderung sollte keine echte Rangliste beeinflussen.

### 2. Funktionen und Nutzerabläufe
- **Dashboard**: Anzeige von Trainingsdaten, Bestleistungen und Ranglisten.
- **Trainingseditor**: Erstellung, Bearbeitung und Abschluss von Trainings.
- **Crew-Übersicht**: Anzeige der Crew-Mitglieder und deren Trainingsdaten.
- **Battle Board**: Anzeige der Rangliste und Challenges.
- **Trainingshistorie**: Anzeige der historischen Trainingsdaten und Bestleistungen.
- **Challenge-Teilnahme**: Teilnahme an Challenges und Aktualisierung der Rangliste.
- **Crew-Erstellung**: Erstellung neuer Crews.
- **Einladungslink-Kopieren**: Kopieren von Einladungslinks für Crews.

### 3. Datenmodell und Datenregeln
- **Trainingsdaten**: Übungen, Sätze, Gewichte, Wiederholungen.
- **Crew-Daten**: Mitglieder, Trainingsdaten.
- **Challenge-Daten**: Herausforderungen, Teilnehmer.
- **Ranglisten-Daten**: Platzierungen der Crews.

### 4. Sicherheit und Berechtigungen
- Die App sollte keine persönlichen Daten speichern oder verarbeiten.
- Interaktionen sollten nur im Browser durchgeführt werden, ohne Serververbindung.
- Die App sollte keine Authentifizierung oder Autorisierung durchführen.

### 5. UI, Barrierefreiheit und Fehlerfälle
- Die App sollte auf kleinen und großen Displays gut funktionieren.
- Die App sollte eine konsistente UI haben, einschließlich einer Desktop-Sidebar und einer mobile Bottom-Navigation.
- Die App sollte Fehlerfälle wie fehlende Internetverbindung oder unvollständige Daten behandeln.
- Die App sollte Barrierefreiheit beachten, z.B. durch die Verwendung von ARIA-Attribute.

### 6. Offene Fragen und Widersprüche
- Es wird nicht explizit erwähnt, wie die App in einer produktiven Umgebung implementiert werden sollte. Es wird vorgeschlagen, den DemoProvider durch Supabase Auth und Datenbankzugriffe mit PostgreSQL/RLS zu ersetzen.
- Es wird nicht explizit erwähnt, wie die App mit realen Nutzerkonten und Daten umgehen soll.
- Es wird nicht explizit erwähnt, wie die App mit Serverseitigen Autorisierung und Daten持久isierung umgehen soll.

---

# Abschnitt 8: Produktbericht_ Gym-Battle-App_teil_01.md

### 1. Konkrete Produktanforderungen
- **Freundes-Feed**: Nutzer sollten in einem Feed sehen können, was ihre Freunde trainieren.
- **Vergleiche**: Nutzer sollten ihre Trainingsleistungen mit denen ihrer Freunde vergleichen können.
- **Übungsranglisten**: Nutzer sollten ihre Übungen in Ranglisten sehen können.
- **Trainingsprotokoll**: Nutzer sollten ihre Trainingsdaten (Satz-/Wiederholungen, Gewicht, PRs) protokollieren können.
- **Trainingskalender**: Nutzer sollten einen Trainingskalender haben, um ihre Trainings zu planen.
- **Timer**: Nutzer sollten einen Timer haben, um ihre Trainingsdauer zu messen.
- **Krafttrainings-Logs**: Nutzer sollten ihre Krafttrainingsdaten (Stärke, Gewicht) protokollieren können.
- **Routinen**: Nutzer sollten Trainingsroutinen erstellen und verfolgen können.
- **Export**: Nutzer sollten ihre Trainingsdaten exportieren können.
- **Trainings-Sharing**: Nutzer sollten ihre Trainings mit anderen Nutzern teilen können.
- **Offline-Funktionalität**: Die App sollte offline funktionieren und Datenfehler verständlich behandeln.

### 2. Funktionen und Nutzerabläufe
- **Freundes-Feed**: Nutzer können ihre Freunde hinzufügen und sehen, was diese trainieren.
- **Vergleiche**: Nutzer können ihre Trainingsleistungen mit denen ihrer Freunde vergleichen.
- **Übungsranglisten**: Nutzer können ihre Übungen in Ranglisten sehen und sich verbessern.
- **Trainingsprotokoll**: Nutzer können ihre Trainingsdaten (Satz-/Wiederholungen, Gewicht, PRs) protokollieren.
- **Trainingskalender**: Nutzer können ihre Trainings zu einem bestimmten Datum planen.
- **Timer**: Nutzer können einen Timer starten, um ihre Trainingsdauer zu messen.
- **Krafttrainings-Logs**: Nutzer können ihre Krafttrainingsdaten (Stärke, Gewicht) protokollieren.
- **Routinen**: Nutzer können Trainingsroutinen erstellen und verfolgen.
- **Export**: Nutzer können ihre Trainingsdaten exportieren, z.B. in CSV-Format.
- **Trainings-Sharing**: Nutzer können ihre Trainings mit anderen Nutzern teilen, z.B. durch Freigabe eines Links.

### 3. Datenmodell und Datenregeln
- **Nutzerdaten**: Jeder Nutzer hat ein einzigartiges Profil mit Benutzernamen, Passwort, E-Mail-Adresse und Kontostatus (frei, pro).
- **Trainingsdaten**: Jeder Trainingseintrag hat ein einzigartiges ID, Datum, Übung, Satz-/Wiederholungen, Gewicht, PR und Timer.
- **Ranglisten**: Jeder Ranglisteneintrag hat ein einzigartiges ID, Datum, Übung, Satz-/Wiederholungen, Gewicht, PR und Benutzer.
- **Freundesverbindungen**: Jeder Nutzer kann andere Nutzer als Freunde hinzufügen und diese verfolgen.
- **Export**: Nutzer können ihre Trainingsdaten exportieren, z.B. in CSV-Format.

### 4. Sicherheit und Berechtigungen
- **Authentifizierung**: Nutzer müssen sich mit Benutzernamen und Passwörtern anmelden.
- **Verschlüsselung**: Nutzerdaten werden verschlüsselt gespeichert.
- **Berechtigungen**: Nutzer haben unterschiedliche Berechtigungen (frei, pro), je nach Kontostatus.
- **Datenschutz**: Die App hat eine Datenschutzrichtlinie, die Nutzerdaten schützt.

### 5. UI, Barrierefreiheit und Fehlerfälle
- **Benutzerfreundliche UI**: Die App hat eine benutzerfreundliche Benutzeroberfläche.
- **Barrierefreiheit**: Die App ist barrierefrei und unterstützt assistive Technologien.
- **Fehlerfälle**: Die App behandelt Fehlerfallen verständlich und bietet Lösungen.

### 6. Offene Fragen und Widersprüche
- **Community-Feed**: Ob der Feed für alle Nutzer relevant ist und wie er die Motivation beeinflusst.
- **Ranglisten**: Ob Ranglisten für alle Nutzer relevant sind und wie sie die Motivation beeinflusst.
- **Benutzerfreundlichkeit**: Ob die Benutzeroberfläche für alle Nutzer intuitiv ist und wie sie die Benutzerfreundlichkeit verbessert werden kann.
- **Datenschutz**: Ob die Datenschutzrichtlinie für alle Nutzer verständlich und angemessen ist und wie sie verbessert werden kann.
- **Offline-Funktionalität**: Ob die Offline-Funktionalität für alle Nutzer nützlich ist und wie sie verbessert werden kann.

---

# Abschnitt 9: Produktbericht_ Gym-Battle-App_teil_02.md

### 1. Konkrete Produktanforderungen
- **Schnelles Trainingslog**: Benutzer können Übung, Gewicht, Wiederholungen eingeben und vorherige Werte direkt anzeigen. Trainingsdaten können offline zwischenspeichern.
- **Private Battle-Gruppe**: Benutzer können eine private Battle-Gruppe per Einladungslink erstellen, mit einer maximalen Gruppengröße von 2-8 Personen. Gruppen können Pseudonyme verwenden.
- **Wochen-Challenges**: Gruppen können für sieben Tage eine Challenge wählen, z.B. zwei Gym-Besuche, drei Trainings oder eine frei gewählte Challenge. Challenges haben einen festeren Start/Ende und eine Ergebnisübersicht.
- **Fairer Fortschritts-Score**: Benutzer erhalten Punkte für absolvierte Sessions und persönliche Bestleistungen, nicht nur absolute Last. Regeln vor Start sichtbar machen.
- **Ein-Klick-Session-Abschluss**: Benutzer können eine Session mit Kudos/Reaktionen abschließen.
- **Gruppenergebnis**: Kein Pflicht-Feed. Gruppen können Ergebnisse teilen, Log privat halten, Rangliste/Benachrichtigungen ausblenden.
- **Persönliche Historie**: Benutzer erhalten eine einfache Fortschrittsanzeige für letzte Gewichte, Trainingshäufigkeit und PRs.
- **Flexible Erinnerungen**: Benutzer können flexible, freundliche Erinnerungen für selbst gewählte Trainingstagen einrichten, Ruhezeiten und Streak-Schutz statt beschämender Schuldmeldungen.
- **Challenge-Vorlagen und Wiederholung**: Vordefinierte Challenge-Vorlagen und Wiederholungen (z.B. „2× diese Woche“, „Comeback-Woche“) sowie eigene Challenge-Namen.

### 2. Funktionen und Nutzerabläufe
- **Trainingslog**: Benutzer können Übung, Gewicht, Wiederholungen eingeben und vorherige Werte direkt anzeigen. Trainingsdaten können offline zwischenspeichern.
- **Battle-Gruppe**: Benutzer erstellen eine private Battle-Gruppe per Einladungslink, mit maximal 2-8 Personen. Gruppen können Pseudonyme verwenden.
- **Challenge-Management**: Benutzer wählen eine Challenge für sieben Tage, z.B. zwei Gym-Besuche, drei Trainings oder eine frei gewählte Challenge. Challenges haben einen festeren Start/Ende und eine Ergebnisübersicht.
- **Fortschritts-Score**: Benutzer erhalten Punkte für absolvierte Sessions und persönliche Bestleistungen, nicht nur absolute Last. Regeln vor Start sichtbar machen.
- **Session-Abschluss**: Benutzer können eine Session mit Kudos/Reaktionen abschließen.
- **Ergebnis-Teilung**: Gruppen können Ergebnisse teilen, Log privat halten, Rangliste/Benachrichtigungen ausblenden.
- **Persönliche Fortschrittsanzeige**: Benutzer erhalten eine einfache Fortschrittsanzeige für letzte Gewichte, Trainingshäufigkeit und PRs.
- **Erinnerungen**: Benutzer können flexible, freundliche Erinnerungen für selbst gewählte Trainingstagen einrichten, Ruhezeiten und Streak-Schutz statt beschämender Schuldmeldungen.
- **Challenge-Vorlagen**: Vordefinierte Challenge-Vorlagen und Wiederholungen (z.B. „2× diese Woche“, „Comeback-Woche“) sowie eigene Challenge-Namen.

### 3. Datenmodell und Datenregeln
- **Trainingsdaten**: Benutzer können Übung, Gewicht, Wiederholungen eingeben. Vorherige Werte werden automatisch angezeigt.
- **Battle-Gruppen**: Benutzer können eine private Battle-Gruppe erstellen, mit maximal 2-8 Personen. Gruppen können Pseudonyme verwenden.
- **Challenges**: Benutzer wählen eine Challenge für sieben Tage, z.B. zwei Gym-Besuche, drei Trainings oder eine frei gewählte Challenge. Challenges haben einen festeren Start/Ende und eine Ergebnisübersicht.
- **Fortschritts-Score**: Benutzer erhalten Punkte für absolvierte Sessions und persönliche Bestleistungen, nicht nur absolute Last. Regeln vor Start sichtbar machen.
- **Session-Abschluss**: Benutzer können eine Session mit Kudos/Reaktionen abschließen.
- **Ergebnis-Teilung**: Gruppen können Ergebnisse teilen, Log privat halten, Rangliste/Benachrichtigungen ausblenden.
- **Persönliche Fortschrittsanzeige**: Benutzer erhalten eine einfache Fortschrittsanzeige für letzte Gewichte, Trainingshäufigkeit und PRs.
- **Erinnerungen**: Benutzer können flexible, freundliche Erinnerungen für selbst gewählte Trainingstagen einrichten, Ruhezeiten und Streak-Schutz statt beschämender Schuldmeldungen.
- **Challenge-Vorlagen**: Vordefinierte Challenge-Vorlagen und Wiederholungen (z.B. „2× diese Woche“, „Comeback-Woche“) sowie eigene Challenge-Namen.

### 4. Sicherheit und Berechtigungen
- **Datensicherheit**: Benutzerdaten werden sicher gespeichert und geschützt.
- **Berechtigungen**: Benutzer haben Kontrollen über ihre Daten, z.B. Ergebnisse teilen, Log privat halten, Rangliste/Benachrichtigungen ausblenden.

### 5. UI, Barrierefreiheit und Fehlerfälle
- **Benutzerfreundliche UI**: Die Benutzeroberfläche ist benutzerfreundlich und intuitiv.
- **Barrierefreiheit**: Die App ist barrierefrei und unterstützt verschiedene Geräte und Plattformen.
- **Fehlerfälle**: Die App hat Fehlerfälle abgefangen und Fehlermeldungen anzeigt.

### 6. Offene Fragen und Widersprüche
- **Globale Ranglisten**: Die Implementierung von globalen Ranglisten erhöht Moderations- und Integrationsaufwand.
- **Öffentliche Profile/Feed**: Die Implementierung von öffentlichen Profilen/Feed erhöht Moderations- und Integrationsaufwand.
- **Chat**: Die Implementierung eines Chat-Systems erhöht Moderations- und Integrationsaufwand.
- **KI-Coach**: Die Implementierung eines KI-Coaches erhöht Moderations- und Integrationsaufwand.
- **Riesige Übungsbibliothek**: Die Implementierung einer riesigen Übungsbibliothek erhöht Moderations- und Integrationsaufwand.
- **Wearable-Synchronisation**: Die Implementierung von Wearable-Synchronisation erhöht Moderations- und Integrationsaufwand.
- **Detaillierte Körperdaten**: Die Implementierung detaillierter Körperdaten erhöht Moderations- und Integrationsaufwand.