# Quelle: Gym Battle – Produkt- und UX-Konzept.md
# Teil 3

--- Seite 7 ---

Gemeinsame UX-Zustände
• Skeletons statt Springen im Layout; Ladezustand für Listen und Aktionen getrennt.
• Leere Zustände erklären den nächsten sinnvollen Schritt und zeigen eine primäre CTA.
• Fehlertexte nennen Ursache nur, wenn sie sicher bekannt ist; Retry ist bei transienten 
Fehlern sichtbar.
• Toasts nur für kurze Bestätigung; wichtige Speicherung zusätzlich dauerhaft am Inhalt 
anzeigen.
Mitglieder
Mitgliederliste, Rollen, 
Einladung; Owner kann Admins 
verwalten und Gruppe 
archivieren.
Einladung erstellt/widerrufen; 
Nutzer ausgetreten; letzte 
Owner-Änderung; 
Berechtigungsfehler.
Invite-Vorschau
Gruppenname, Einladender, 
Ablaufhinweis, 
Beitreten/Anmelden. Keine 
privaten Posts/Trainings.
Token 
gültig/abgelaufen/widerrufen/v
erbraucht; bereits Mitglied; 
Anmeldung nötig; Gruppe voll, 
falls später eingeführt.
Freunde
Suche nach exaktem 
Handle/Prefix, eingehende 
Anfragen, ausgehende 
Anfragen, bestätigte Freunde.
Keine Freunde; keine Treffer; 
Anfrage ausstehend; 
akzeptiert/abgelehnt; Rate-
limit; keine E-Mail-
Enumeration.
Profil
Anzeigename, Handle, eigene 
Trainingszusammenfassung; 
Profilbearbeitung. 
Standardmäßig nur für 
Freunde und gemeinsame 
Gruppen sichtbar.
Eigenes Profil; fremdes Profil 
mit eingeschränkten Feldern; 
nicht sichtbar; fehlender Avatar.
Einstellungen
Locale/Einheiten, Zeitzone, 
Privatsphäre, 
Benachrichtigungen, 
Passwort/Abmelden, Konto 
löschen.
Speichern; Bestätigung für 
irreversible Kontoaktion; 
Fehlermeldungen; abgelaufene 
Sitzung.
404/Fehler
Knapp erklären, dass Seite 
nicht verfügbar ist; zur 
Übersicht oder Gruppenliste 
zurück.
Nicht zwischen „existiert 
nicht“ und „keine 
Berechtigung“ unterscheiden, 
wenn das Seiten-Dasein sonst 
private Informationen verraten 
würde.



--- Seite 8 ---

• Destruktive Aktionen wie Training löschen, Gruppe archivieren oder Freund entfernen 
brauchen Bestätigung und nennen die Auswirkung.
• Formulare behalten Eingaben bei Fehlern. Alle Aktionen sind gegen 
Doppelklick/mehrfaches Absenden abgesichert.
• Tastaturbedienbarkeit, sichtbarer Fokus, Screenreader-Labels und ausreichender 
Farbkontrast von Anfang an einplanen.
4. Designsystem
Visuelle Richtung
Annahme: hochwertige, sportliche Oberfläche ohne überladene Gaming-Optik. Dunkle 
Anthrazitflächen bilden die ruhige Basis; ein leuchtendes Lime setzt gezielte Akzente für 
Fortschritt und primäre Aktionen. Kein permanentes Neon, keine aggressiven 
„Gewinner/Verlierer“-Farben.
Farbpalette
Token
Wert
Verwendung
background
#0B0F0D
Seitenhintergrund in Dark 
Theme
surface
#141A17
Karten, Navigation
surface-raised
#1C2420
Dialoge, Hover, Eingabeflächen
border
#2A342E
Trennlinien, Umrandungen
text-primary
#F4F7F4
Haupttext
text-secondary
#A6B2AA
Hinweise, Labels
accent
#B7F34A
Primärbutton, aktive 
Navigation, Fortschritt
accent-pressed
#9BD52E
gedrückter Zustand
success
#44D19A
gespeichert/abgeschlossen
warning
#F4C66A
Ablauf/aufmerksam machen
danger
#FF7474
destruktive Aktion/Fehler



--- Seite 9 ---

Farbe nie als einziges Signal verwenden: Icon + Text/Statuslabel hinzufügen. Lime für Text 
nur bei ausreichendem Kontrast nutzen; im Zweifel dunkle Schrift auf Lime-Fläche.
Typografie und Layout
• Schrift: system-ui oder eine lokal gebündelte variable Sans-Schrift; keine externen 
kostenpflichtigen Font-CDNs. Zahlen in Trainingslogs mit tabellarischen Ziffern.
• Typografieskala: 12 px Caption, 14 px Label, 16 px Body, 20 px H3, 24 px H2, 32 px H1. 
Body-Zeilenhöhe 1.45–1.6.
• 4-px Basiseinheit; häufige Abstände 8/12/16/24/32/48 px.
• Mobile Inhaltspadding 16 px, Desktop 24 px; Maximalbreite für Hauptinhalte ca. 1120 px.
• Radius 8 px für Inputs, 12 px für Karten, 16 px für große Panels; Buttons mindestens 44 
px hoch, Touch-Ziele mindestens 44×44 px.
• Responsive Breakpoints orientieren sich an Tailwind-Defaults; mobile zuerst. Satzeditor 
auf schmalen Displays stapeln (Satznummer, Gewicht, Wiederholungen), nicht zu kleine 
Tabellenfelder.
Komponentenbibliothek (MVP)
Button (primary/secondary/quiet/danger), IconButton , TextField , PasswordField , 
NumberField , Select , Checkbox , Avatar , Badge , Card , Tabs , BottomNavigation , Sidebar , 
Dialog/Drawer , Toast , Skeleton , EmptyState , ErrorState , WorkoutSetRow , ExerciseCard , 
LeaderboardRow , InviteLinkPanel , SaveStatus .
Komponentenregeln: Fokuszustand und disabled/loading für alle interaktiven 
Komponenten; Zahleneingaben erlauben Dezimal-Komma in deutscher UI und 
normalisieren intern; Gewicht kann 0 für Körpergewichtsübungen sein, Wiederholungen 
sind positive ganze Zahlen. Kein Button darf im Ladezustand mehrfach auslösen.
5. PostgreSQL-Datenmodell
Alle Tabellen liegen in einem nicht direkt öffentlich erreichbaren Anwendungsschema (z. B. 
public mit konsequent aktivierter RLS). Primärschlüssel UUID. Zeitpunkte als timestamptz 
in UTC; Gruppenkalender verwendet IANA-Zeitzone aus groups.timezone . Referenzielle 
Löschregeln explizit setzen; kein stilles Löschen historischer Trainings durch 
Gruppenlöschung.
Entitäten
Tabelle
Wichtige Felder
Beziehungen / Regeln


