# Analyse 1: Gym Battle – Produkt- und UX-Konzep_teil_01.md

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
