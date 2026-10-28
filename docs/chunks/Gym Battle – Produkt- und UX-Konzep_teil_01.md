# Quelle: Gym Battle – Produkt- und UX-Konzept.md
# Teil 1

# Gym Battle – Produkt- und UX-Konzept



--- Seite 1 ---

Gym Battle – Produkt- und UX-Konzept
Stand: 28. Oktober 2026
Ziel: Umsetzungsgrundlage für einen Coding-Agenten. Dieses Dokument beschreibt 
Produktumfang, UX, Datenmodell und Sicherheitsanforderungen, enthält aber keinen 
Anwendungscode und keine Deployment-Schritte.
0. Produktziel und explizite Annahmen
Produktziel: Freunde sollen ein Krafttraining schnell protokollieren und sich in privaten 
Gruppen zu regelmäßigen Trainings motivieren können. Der soziale Teil ist bewusst klein, 
opt-in und gruppenbasiert. Das Log muss auch ohne Gruppe brauchbar sein.
Annahmen – zur Bestätigung durch das Produktteam, keine vorgegebenen Fakten:
1. Erste Version ist eine responsive Web-App, zunächst online nutzbar. PWA-Installation 
und Offline-Logging sind nicht Teil der ersten Lieferung.
2. UI-Sprache ist zunächst Deutsch. Datum, Wochenstart und Zahlenformat folgen dem 
deutschen Locale; Gewichte werden intern in kg gespeichert, die Anzeige kann später lb 
unterstützen.
3. Anmeldung erfolgt mit E-Mail und Passwort über Supabase Auth. E-Mail-Bestätigung 
und Passwort-Reset gehören zum Auth-Flow. Ein separater kostenpflichtiger E-Mail-
Dienst wird für Einladungen nicht vorausgesetzt.
4. Freundschaft und Gruppenmitgliedschaft sind getrennte Konzepte: Eine Freundschaft 
ist gegenseitig bestätigt; ein Gruppenlink kann direkt eine Gruppeneinladung sein. 
Nutzer können außerdem Freunde aus ihrer Freundesliste in eine Gruppe einladen.
5. Ein abgeschlossenes Training ist standardmäßig privat. Um in einer Gruppenrangliste zu 
zählen, wählt der Nutzer beim Abschluss genau eine Gruppe, mit der dieses Training 
geteilt wird. Ein Training in mehreren Gruppen gleichzeitig ist nicht Teil des MVP.
6. Die Rangliste belohnt Trainingshäufigkeit, nicht Gewicht, Volumen oder Körperdaten. 
Ein abgeschlossener Trainingstag zählt als ein Punkt; pro Nutzer und 
Gruppenkalenderwoche zählen maximal fünf Trainingstage.
7. Gruppen sind privat und nur für Mitglieder sichtbar. Es gibt keine globale Suche, keinen 
öffentlichen Feed, keine Direktnachrichten und keine öffentlichen Profile.
8. Das MVP verwendet einen kleinen eingebauten Übungskatalog plus eigene, private 
Übungen. Eine umfangreiche, medizinisch geprüfte Bibliothek wird nicht vorausgesetzt.
1. Informationsarchitektur und Navigation



--- Seite 2 ---

Sitemap
Plain Text
/
├── /auth/sign-in
├── /auth/sign-up
├── /auth/forgot-password
├── /auth/reset-password
├── /auth/callback
├── /onboarding/profile
└── /app
    ├── /dashboard
    ├── /workouts
    │   ├── /new
    │   └── /[workoutId]
    ├── /history
    │   └── /[workoutId]
    ├── /groups
    │   ├── /new
    │   ├── /[groupId]
    │   │   ├── /leaderboard
    │   │   ├── /members
    │   │   └── /settings
    │   └── /invite/[token]
    ├── /friends
    ├── /profile
    └── /settings
Primäre Navigation
Mobile: feste Bottom-Navigation mit vier Zielen: Übersicht, Training, Gruppen, Profil. 
„Training starten“ erhält zusätzlich einen auffälligen, gut erreichbaren CTA auf der 
Übersicht und der Trainingshistorie. Freundschaften befinden sich auf der Gruppen-Seite in 
einem sekundären Tab bzw. einer Unterseite, nicht als fünfter Bottom-Tab.
Desktop: schmale linke Seitenleiste mit denselben vier Zielen; Gruppen-Unterseiten zeigen 
eine zweite, lokale Navigation mit „Übersicht“, „Rangliste“, „Mitglieder“ und – für 
Admins – „Einstellungen“. Hauptinhalt bleibt auf eine gut lesbare Maximalbreite begrenzt.
Navigationsregeln:
• Nicht angemeldete Nutzer werden von /app/* zu /auth/sign-in geleitet. Nach 
erfolgreicher Anmeldung geht es zurück zum ursprünglich gewünschten Ziel.
• Neue Nutzer durchlaufen einmalig Profil-Onboarding; ein valider Benutzername und 
Anzeigename sind Voraussetzung für Gruppen und Ranglisten.



--- Seite 3 ---

• Ein gültiger Gruppen-Einladungslink darf vor der Anmeldung eine Vorschau zeigen. Die 
Mitgliedschaft wird erst nach Anmeldung und aktiver Bestätigung erstellt.
• Browser-Zurück soll im Training nicht versehentlich ein laufendes Training verwerfen. 
Beim Verlassen mit ungespeicherten Änderungen erscheint ein Bestätigungsdialog.
2. Nutzerabläufe
A. Registrierung und erstes Öffnen
1. Landing/Anmeldeansicht bietet „Konto erstellen“ und „Anmelden“; Gruppenlink 
kann als Return-URL erhalten bleiben.
2. Nutzer gibt E-Mail, Passwort und Passwortbestätigung ein und akzeptiert 
Nutzungsbedingungen/Datenschutzhinweis, sofern diese in der Produktrealisierung 
bereitgestellt werden.
3. Supabase Auth erstellt die Identität. Bei aktivierter Bestätigung wird eine klare „Prüfe 
deine E-Mail“-Ansicht gezeigt; erneutes Senden ist möglich und gedrosselt.
4. Nach Authentifizierung legt der Nutzer Anzeigename und eindeutigen Handle fest. 
Avatar ist optional; Standard ist ein Initialen-Avatar.
5. Optionales Zielmenü: „Gruppe erstellen“, „Einladung öffnen“ oder „Erst einmal allein 
trainieren“. Keine erzwungene Kontaktbuch-Synchronisierung.
6. Weiter zur Übersicht mit einer kurzen Erklärung der privaten Gruppen und des privaten 
Trainingslogs.
Fehler- und Randfälle: E-Mail schon vorhanden, ungültiges Passwort, Bestätigungslink 
abgelaufen, Handle vergeben, Netzwerkfehler, Nutzer öffnet Invite-Link auf anderem Gerät. 
In jedem Fall bleibt eine klare nächste Aktion sichtbar.
B. Private Gruppe erstellen und Freunde einladen
1. Auf „Gruppen“ tippt der Nutzer auf Gruppe erstellen.
2. Formular: Gruppenname (erforderlich), optional Beschreibung, Zeitzone (Standard aus 
Profil/Browsereinstellung, editierbar). Sichtbarkeit ist fest „Privat“.
3. Nach Erstellung wird der Ersteller Mitglied mit Rolle owner und landet auf der 
Gruppenübersicht.
4. „Freunde einladen“ bietet zwei Wege: vorhandenen bestätigten Freund auswählen 
oder Einladungslink erstellen/kopieren/teilen. Keine Einladung wird ohne 
ausdrückliche Aktion verschickt.


