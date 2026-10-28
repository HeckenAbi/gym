# Gym Battle – visueller Frontend-Prototyp


--- Seite 1 ---

Gym Battle – visueller Frontend-Prototyp
Was funktioniert
Der Prototyp enthält Dashboard, Trainingseditor, Crew-Übersicht, Battle Board mit 
Rangliste und Challenges sowie Trainingshistorie und Bestleistungen. Die App-Navigation 
funktioniert auf kleinen und großen Displays. Im Trainingseditor lassen sich Übungen 
ergänzen, Sätze hinzufügen oder entfernen, Gewichte und Wiederholungen verändern, ein 
Training abschließen und die Crew-Freigabe simulieren. Challenge-Teilnahme, Crew-
Erstellung und Einladungslink-Kopieren sind ebenfalls interaktiv.
Was simuliert ist
Alle Namen, Avatare, Trainings, Bestleistungen, Ranglistenplätze und Challenges sind 
Beispieldaten. Es gibt keine Registrierung, keine realen Nutzerkonten, keine persönlichen 
Daten, keine Supabase-Verbindung und keinen Backend-Speicher. Interaktionen 
aktualisieren nur React-Zustand im Browser; ein neu abgeschlossenes Training ist nach 
einem Reload zurückgesetzt. Einladungslinks sind Demo-Text, sie nehmen keine Mitglieder 
auf. Die Teilen-Schaltfläche überträgt keine Trainingsdaten. Eine Herausforderung 
beeinflusst keine echte Rangliste.
Technische Umsetzung
Die Seiten liegen im Next.js App Router ( app/ ), wiederverwendbare Oberflächen in 
components/ , Seed-Daten und flüchtiger Demo-Zustand in lib/ . TypeScript modelliert 
Sessions und Übungen; Tailwind CSS stellt Farb-, Abstands- und Komponentenstil bereit, 
ergänzt durch globale CSS-Basiselemente. Der gemeinsame AppShell hält Desktop-Sidebar, 
mobile Bottom-Navigation und Demo-Kennzeichnung konsistent. Der DemoProvider hält 
kurzfristige Interaktionen während der App-Navigation im Speicher.
Für eine produktive Umsetzung würde DemoProvider durch Supabase Auth und 
Datenbankzugriffe mit PostgreSQL/RLS ergänzt. Einladungen, Trainingsfreigaben und 
Ranglisten müssten serverseitig autorisiert und persistent gespeichert werden; der hier 
sichtbare Prototyp nimmt diese Schritte ausdrücklich nicht vor.
Lokal ausführen
Mit Node.js und pnpm: pnpm install , anschließend pnpm dev . Es sind keine API-Schlüssel 
oder kostenpflichtigen Dienste nötig.
