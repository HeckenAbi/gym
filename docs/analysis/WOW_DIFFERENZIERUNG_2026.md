# GymBattle: Wow-Differenzierung gegenüber MacroFactor und Trainings-Apps

## Verifizierte Vergleichspunkte

MacroFactor verkauft nicht primär einen Food-Logger, sondern einen adaptiven Regelkreis: Nutzer tracken Essen und Gewicht, daraus werden Energieverbrauch und wöchentliche Kalorien-/Makroziele neu berechnet. Die offizielle Produktseite nennt dynamische wöchentliche Anpassungen, Weight Trend, Goal ETA, Adherence-Neutralität und schnelle Eingabe als Kernnutzen. Quelle: https://macrofactor.com/macrofactor/

Hevy Trainer nimmt dem Nutzer die Trainingsplanung ab. Laut offizieller Beschreibung erzeugt es personalisierte Programme, baut progressive overload ein, passt Arbeitsgewichte automatisch an, zeigt Previous-Werte, startet Rest Timer und gibt bei stockender Progression Hinweise. Quelle: https://www.hevyapp.com/features/workout-plan-generator/

Alpha Progression positioniert die kleinste wertvolle Einheit direkt am Satz: Gewicht und Wiederholungen werden für jeden Arbeitssatz empfohlen. Die Empfehlungen verwenden vergangene Leistung, bereits absolvierte Sätze und verfügbare Gewichtssprünge. Zusätzlich werden PRs, Streaks, Achievements und Charts sichtbar gemacht. Quelle: https://alphaprogression.com/en

Fitbod positioniert sich über „was soll ich heute trainieren?“: Der Plan passt sich an Ziel, Equipment, Trainingshistorie, Fortschritt und Recovery an. Quelle: https://fitbod.me/

## Befund für den aktuellen GymBattle-MVP

GymBattle kann inzwischen loggen, Autosave wiederherstellen, Fortschritt zeigen, mit Crews teilen, kommentieren, reagieren, Challenges verfolgen, Freunde verwalten und Shares zurücknehmen. Das ist ein guter sozialer MVP, aber die Trainingsentscheidung bleibt noch beim Nutzer. Die App dokumentiert, was passiert ist; sie sagt noch nicht stark genug, was als Nächstes sinnvoll ist.

Genau dort liegt die größte Lücke zu MacroFactor, Hevy Trainer, Alpha Progression und Fitbod: ein messbarer Input führt bei ihnen zu einer konkreten nächsten Entscheidung. Ohne diesen „next best action“-Moment bleibt GymBattle austauschbar, auch wenn Brand und Social Layer gut sind.

## Empfohlene Positionierung

Nicht „noch eine Trainings-App“ und nicht „MacroFactor mit Meal Plan“. Die stärkste kleine Positionierung wäre:

> GymBattle ist der Trainingspartner, der dir für jeden Satz sagt, was du heute schaffen solltest – und deine Crew sieht, dass du dranbleibst.

Das verbindet einen persönlichen adaptiven Trainingsnutzen mit dem bestehenden sozialen Kern. Die Differenzierung wäre nicht mehr nur Social Media, sondern „adaptive Progression mit sozialer Konsequenz“.

## Die fünf stärksten kleinen Wow-Features

### 1. Next-Set-Coach

Direkt unter jedem Satz steht: „Letztes Mal: 60 kg × 8. Heute: 62,5 kg × 8“ oder „Gewicht halten, Ziel: 9 Wiederholungen“. Die Regel kann zunächst deterministisch sein: Wenn alle Sätze am oberen Rep-Rand liegen, Gewicht leicht erhöhen; wenn nicht, Gewicht halten; bei deutlichem Einbruch zurückstufen. Nach dem ersten historischen Wert ist die Funktion sofort nützlich.

Das ist die höchste Priorität, weil es den Moment im Gym verbessert und nicht nur nachträglich analysiert.

### 2. Previous-Wert und PR-Moment

Beim Öffnen einer Übung sieht der Nutzer die letzte Leistung, den besten Satz und den aktuellen Rekord. Beim Abschluss erscheint nicht nur „gespeichert“, sondern zum Beispiel: „Bankdrücken: +2,5 kg Bestleistung“ oder „Heute 3 Übungen verbessert“. Das erzeugt einen unmittelbaren emotionalen Payoff.

### 3. Ein-Tap-Workout für heute

Das Dashboard sollte eine Karte „Heute sinnvoll“ zeigen. Sie basiert zunächst auf den zuletzt trainierten Übungen und dem Abstand seit dem letzten Training. Ein Tap startet eine vorbereitete Session. Kein vollständiger AI-Planer nötig: Schon „Dein letzter Push-Tag war vor 5 Tagen – fortsetzen?“ fühlt sich deutlich intelligenter an.

### 4. Satz-Feedback mit RIR/RPE

Nach einem Satz kann der Nutzer optional „zu leicht / passend / zu schwer“ oder RIR 0–4 angeben. Die nächste Empfehlung passt sich sofort an. Damit wird aus einem statischen Logger ein System, das auf die reale Tagesform reagiert, ohne medizinische oder pseudowissenschaftliche Versprechen.

### 5. Wöchentlicher Coach-Check-in

Einmal pro Woche eine kompakte, automatisch erzeugte Rückmeldung: „Du warst 2 von 3 geplanten Tagen da. Kniebeuge +5 kg gegenüber vor 4 Wochen. Nächster Fokus: 1 zusätzlicher Unterkörpertag.“ Das ist das GymBattle-Pendant zur MacroFactor-Wochenanpassung, aber für Training und Crew-Konstanz.

## Priorität für die nächste Umsetzung

1. Previous-Wert plus Next-Set-Coach direkt im Satzeditor.
2. PR-Erkennung beim Abschluss.
3. „Heute trainieren“-Karte auf dem Dashboard.
4. Optionales RIR/RPE pro Satz.
5. Wöchentlicher Coach-Check-in.

Meal Plan, Barcode-Scanner oder ein großer Übungsvideokatalog wären für die aktuelle Positionierung nicht die beste nächste Investition. Sie würden den Funktionsumfang vergrößern, aber nicht den entscheidenden Moment verbessern: „Was soll ich jetzt als Nächstes tun und warum?“
