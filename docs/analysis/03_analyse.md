# Analyse 3: Gym Battle – Produkt- und UX-Konzep_teil_03.md

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
