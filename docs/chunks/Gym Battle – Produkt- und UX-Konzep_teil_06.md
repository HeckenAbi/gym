# Quelle: Gym Battle – Produkt- und UX-Konzept.md
# Teil 6

--- Seite 16 ---

Phase 3 – Gruppen, Freundschaften und Einladungen
• Gruppen erstellen, listen, umbenennen, archivieren.
• Mitgliederliste/Rollen und Freundschaftsanfragen über Handle.
• Invite-Link erzeugen, Vorschau, Annahme, Ablauf und Widerruf.
• Einladungsbeitritt atomar und gegen doppelte/konkurrierende Requests abgesichert.
Abnahmekriterium: Private Gruppe ist für Nichtmitglieder auch per direkter API nicht 
sichtbar; nur gültiger Invite fügt Mitglied hinzu.
Phase 4 – Trainingslog
• System-Übungskatalog mit begrenzter Auswahl und eigener privater Übung.
• Session starten, Übungen hinzufügen, Sätze mit Gewicht/Wiederholungen editieren, 
Session autospeichern und fortsetzen.
• Session abschließen, privat lassen oder für genau eine Gruppe freigeben.
• Historienliste und Detailansicht.
• Fehler- und Doppelklickverhalten, Save-Status und fehlgeschlagene Speicherung testen.
Abnahmekriterium: Nutzer kann eine Session beginnen, schließen, später in History 
öffnen; fremde Nutzer können private Daten auch per Direktabfrage nicht sehen.
Phase 5 – Rangliste und Motivation
• Gruppenkalenderwoche aus groups.timezone berechnen.
• Rangliste serverseitig aggregieren; nur freigegebene Sessions zählen.
• Regeln sichtbar machen, Gleichstand behandeln und Vorwoche anzeigen.
• Übersichtskarte und leere Zustände anbinden.
Abnahmekriterium: Tests decken Wochenwechsel/Zeitzone, maximal einen Punkt pro Tag, 
Wochenlimit 5, Gleichstand, Session-Entteilen und Gruppenwechsel ab.
Phase 6 – Qualität und MVP-Härtung
• End-to-end-Flows: Registrierung, Invite-Annahme, Gruppe, Training, Freigabe, 
Rangliste, Verlassen der Gruppe.
• Responsive Prüfung bei schmalem Mobilviewport, Tablet und Desktop; Tastatur, Fokus, 
Kontrast und Screenreader-Basics prüfen.
• Fehlerfälle: abgelaufene Einladung, gelöschte Gruppe, veraltete Sitzung, 
Netzwerkabbruch während Speichern, doppelter Abschluss, gelöschte Übung.



--- Seite 17 ---

• Sicherheitsprüfung aller RLS-Policies und Mutationen, Rate-Limits für Suche/Invite, 
keine Secrets im Client.
• Erst danach PWA-Manifest/Installierbarkeit; Offline-Logging, Push und Wearables 
bewusst aus dem ersten Release heraushalten.
8. MVP-Grenze und Nicht-Ziele
MVP enthält: Registrierung/Anmeldung, Profil/Handle, Freundschaftseinladungen, private 
Gruppen, Gruppenlink, Übungsauswahl, Gewicht/Wiederholungen pro Satz, 
Trainingshistorie, explizite Gruppenteilung und Wochenrangliste für Trainingskonsistenz.
MVP enthält nicht: globale Ranglisten, öffentlicher Social Feed, Chat, GPS, 
Gesundheitsdaten/Wearables, KI-Coach, Trainingsprogramme mit Periodisierung, 
Körpermaße, Social Login, komplexe Badges, Push-Nachrichten, Abo/Bezahlschranke, PWA-
Offlinesync.
Produktprinzip: Ein Nutzer darf ohne Freunde und ohne Gruppe ein gutes Trainingslog 
erhalten. Der soziale Wettbewerb wird nur innerhalb der selbst gewählten Gruppe sichtbar 
und nur mit bewusst freigegebenen Trainingsdaten gespeist.
