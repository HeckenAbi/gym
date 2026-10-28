export type ExerciseEquipment = "Kurzhantel" | "Kabelturm";
export type ExerciseCategory = "Brust" | "Rücken" | "Schulter" | "Bizeps" | "Trizeps" | "Beine" | "Gesäß" | "Core";
export type ExerciseMotion =
  | "press-horizontal" | "fly" | "pullover" | "row" | "shrug"
  | "press-overhead" | "raise-lateral" | "raise-front" | "rear-fly"
  | "curl" | "curl-hammer" | "curl-rotation" | "triceps-overhead"
  | "triceps-lying" | "triceps-kickback" | "triceps-pushdown" | "squat" | "hinge" | "lunge"
  | "step-up" | "hip-thrust" | "pulldown" | "straight-pulldown"
  | "face-pull" | "upright-row" | "cable-squat" | "pull-through" | "calf-raise"
  | "glute-kickback" | "woodchop";
export type CableAnchor = "high" | "middle" | "low";
export type ExerciseSurface = "flat" | "incline" | "floor";

export type LibraryExercise = {
  id: string;
  name: string;
  equipment: ExerciseEquipment;
  category: ExerciseCategory;
  muscles: string[];
  aliases: string[];
  setup: string;
  cues: [string, string];
  avoid: string;
  motion: ExerciseMotion;
  cableAnchor?: CableAnchor;
  position?: "lying";
  surface?: ExerciseSurface;
  unilateral?: boolean;
  cableAttachment?: "foot";
};

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  {
    id: "db-bench-press", name: "Kurzhantel-Bankdrücken", equipment: "Kurzhantel", category: "Brust",
    muscles: ["Brust", "Trizeps", "vordere Schulter"], aliases: ["Bankdrücken Kurzhanteln", "Dumbbell bench press", "DB bench"],
    setup: "Auf die Bank legen, Füße fest aufstellen, Hanteln neben der Brust halten.",
    cues: ["Handgelenke über den Ellenbogen halten.", "Kontrolliert absenken, dann ohne Schwung nach oben drücken."],
    avoid: "Kein starkes Hohlkreuz und die Hanteln oben nicht gegeneinander schlagen.", motion: "press-horizontal", position: "lying", surface: "flat",
  },
  {
    id: "db-incline-press", name: "Kurzhantel-Schrägbankdrücken", equipment: "Kurzhantel", category: "Brust",
    muscles: ["obere Brust", "Trizeps", "vordere Schulter"], aliases: ["Schrägbank mit Hanteln", "Incline dumbbell press", "DB incline press"],
    setup: "Bank leicht schräg einstellen und die Hanteln neben der oberen Brust starten.",
    cues: ["Schulterblätter sanft nach hinten ziehen.", "Die Hanteln über der Brust kontrolliert zusammenführen."],
    avoid: "Die Bank nicht unnötig steil stellen und Schultern nicht zu den Ohren ziehen.", motion: "press-horizontal", position: "lying", surface: "incline",
  },
  {
    id: "db-floor-press", name: "Kurzhantel-Floor-Press", equipment: "Kurzhantel", category: "Brust",
    muscles: ["Brust", "Trizeps"], aliases: ["Floor press", "Bodendrücken", "Kurzhantel Bodenpressen"],
    setup: "Auf den Rücken legen, Knie beugen und Hanteln über den Ellenbogen halten.",
    cues: ["Oberarme langsam bis zum Boden absenken.", "Aus einer stabilen Position nach oben drücken."],
    avoid: "Die Ellenbogen nicht hart auf den Boden fallen lassen.", motion: "press-horizontal", position: "lying", surface: "floor",
  },
  {
    id: "db-fly", name: "Kurzhantel-Fliegende", equipment: "Kurzhantel", category: "Brust",
    muscles: ["Brust", "vordere Schulter"], aliases: ["Fliegende mit Hanteln", "Dumbbell fly", "Butterfly Kurzhantel"],
    setup: "Auf eine flache Bank legen und die Hanteln mit leicht gebeugten Armen über der Brust halten.",
    cues: ["Die Ellenbogen bleiben weich gebeugt.", "Arme seitlich öffnen und die Brust zum Schließen nutzen."],
    avoid: "Nicht tiefer öffnen, als die Schulter sich angenehm anfühlt.", motion: "fly", position: "lying", surface: "flat",
  },
  {
    id: "db-pullover", name: "Kurzhantel-Pullover", equipment: "Kurzhantel", category: "Brust",
    muscles: ["Brust", "Latissimus"], aliases: ["Pullover mit Hantel", "Dumbbell pullover", "DB pullover"],
    setup: "Auf die Bank legen und eine Hantel mit beiden Händen über der Brust halten.",
    cues: ["Rippen unten und Bauch leicht angespannt halten.", "Die Hantel mit kleinem Ellenbogenknick hinter den Kopf führen."],
    avoid: "Kein schmerzhaftes Überstrecken der Schulter oder des Rückens.", motion: "pullover", position: "lying", surface: "flat",
  },
  {
    id: "db-one-arm-row", name: "Einarmiges Kurzhantelrudern", equipment: "Kurzhantel", category: "Rücken",
    muscles: ["Latissimus", "oberer Rücken", "Bizeps"], aliases: ["Einarmiges Rudern", "One arm dumbbell row", "DB row"],
    setup: "Eine Hand und ein Knie auf der Bank abstützen, Rücken lang halten.",
    cues: ["Hantel Richtung Hüfte ziehen.", "Ellenbogen dicht am Körper führen und langsam absenken."],
    avoid: "Den Oberkörper nicht aufdrehen und nicht mit Schwung reißen.", motion: "row",
  },
  {
    id: "db-bent-row", name: "Vorgebeugtes Kurzhantelrudern", equipment: "Kurzhantel", category: "Rücken",
    muscles: ["Latissimus", "oberer Rücken", "Bizeps"], aliases: ["Rudern vorgebeugt", "Bent-over dumbbell row", "DB bent row"],
    setup: "Hüfte nach hinten schieben, Oberkörper schräg und Rücken neutral halten.",
    cues: ["Beide Ellenbogen kontrolliert nach hinten ziehen.", "Den Nacken lang lassen und die Hanteln ruhig absenken."],
    avoid: "Rücken nicht runden und die Bewegung nicht aus dem Schwung holen.", motion: "row",
  },
  {
    id: "db-chest-supported-row", name: "Brustgestütztes Kurzhantelrudern", equipment: "Kurzhantel", category: "Rücken",
    muscles: ["oberer Rücken", "Latissimus", "Bizeps"], aliases: ["Brustgestütztes Rudern", "Chest supported row", "Schrägbankrudern"],
    setup: "Brust auf eine Schrägbank legen, Füße stabil aufstellen und Hanteln hängen lassen.",
    cues: ["Ellenbogen Richtung Hosentaschen ziehen.", "Brust bleibt an der Bank, Rückweg langsam kontrollieren."],
    avoid: "Nicht mit dem Oberkörper von der Bank abheben.", motion: "row",
  },
  {
    id: "db-shrug", name: "Kurzhantel-Shrugs", equipment: "Kurzhantel", category: "Schulter",
    muscles: ["Nacken", "oberer Trapez"], aliases: ["Schulterheben", "Dumbbell shrug", "Nackenziehen Kurzhantel"],
    setup: "Aufrecht stehen, Hanteln seitlich halten und die Arme locker lassen.",
    cues: ["Schultern gerade nach oben heben.", "Oben kurz halten und ruhig absenken."],
    avoid: "Schultern nicht kreisen und den Kopf nicht nach vorn schieben.", motion: "shrug",
  },
  {
    id: "db-reverse-fly", name: "Vorgebeugtes Reverse Fly", equipment: "Kurzhantel", category: "Schulter",
    muscles: ["hintere Schulter", "oberer Rücken"], aliases: ["Reverse fly", "Reverse Butterfly Kurzhantel", "vorgebeugtes Seitheben"],
    setup: "Hüfte nach hinten schieben, Oberkörper vorbeugen und Hanteln unter den Schultern halten.",
    cues: ["Arme seitlich öffnen, als würdest du die Flügel ausbreiten.", "Leicht gebeugte Ellenbogen beibehalten."],
    avoid: "Nicht hochreißen oder den Rücken runden.", motion: "rear-fly",
  },
  {
    id: "db-shoulder-press", name: "Kurzhantel-Schulterdrücken", equipment: "Kurzhantel", category: "Schulter",
    muscles: ["Schulter", "Trizeps"], aliases: ["Schulterdrücken Hanteln", "Dumbbell shoulder press", "Overhead press Kurzhantel"],
    setup: "Sitzend oder stehend starten, Hanteln auf Schulterhöhe halten.",
    cues: ["Bauch anspannen und Handgelenke über den Ellenbogen halten.", "Hanteln kontrolliert über den Kopf drücken."],
    avoid: "Rippen nicht nach vorn schieben und nicht ins Hohlkreuz fallen.", motion: "press-overhead",
  },
  {
    id: "db-arnold-press", name: "Arnold Press", equipment: "Kurzhantel", category: "Schulter",
    muscles: ["Schulter", "Trizeps"], aliases: ["Arnold-Drücken", "Arnold dumbbell press", "rotierendes Schulterdrücken"],
    setup: "Hanteln vor der Brust halten, Handflächen zeigen zunächst zum Körper.",
    cues: ["Beim Hochdrücken die Hände ruhig nach vorn drehen.", "Kontrolliert zur Startposition zurückkehren."],
    avoid: "Nicht ruckartig drehen oder die Ellenbogen gewaltsam nach hinten ziehen.", motion: "press-overhead",
  },
  {
    id: "db-lateral-raise", name: "Kurzhantel-Seitheben", equipment: "Kurzhantel", category: "Schulter",
    muscles: ["seitliche Schulter"], aliases: ["Seitheben", "Lateral raise", "Dumbbell side raise"],
    setup: "Aufrecht stehen, Hanteln neben den Oberschenkeln halten und Ellenbogen leicht beugen.",
    cues: ["Arme seitlich bis etwa Schulterhöhe heben.", "Schultern tief lassen und langsam absenken."],
    avoid: "Nicht mit Schwung arbeiten und die Hanteln nicht deutlich über Schulterhöhe heben.", motion: "raise-lateral",
  },
  {
    id: "db-front-raise", name: "Kurzhantel-Frontheben", equipment: "Kurzhantel", category: "Schulter",
    muscles: ["vordere Schulter"], aliases: ["Frontheben", "Dumbbell front raise", "Frontheben Kurzhantel"],
    setup: "Aufrecht stehen und die Hanteln vor den Oberschenkeln halten.",
    cues: ["Eine oder beide Hanteln nach vorn bis etwa Schulterhöhe führen.", "Rumpf ruhig halten und langsam absenken."],
    avoid: "Nicht nach hinten lehnen oder die Hantel hochschwingen.", motion: "raise-front",
  },
  {
    id: "db-biceps-curl", name: "Kurzhantel-Bizepscurls", equipment: "Kurzhantel", category: "Bizeps",
    muscles: ["Bizeps", "Unterarm"], aliases: ["Bizeps Curl", "Dumbbell curl", "Curls mit Hanteln"],
    setup: "Aufrecht stehen, Arme seitlich hängen lassen und Handflächen nach vorn drehen.",
    cues: ["Ellenbogen nahe am Oberkörper halten.", "Hanteln beugen und langsam wieder ablassen."],
    avoid: "Oberkörper nicht nach hinten schwingen.", motion: "curl",
  },
  {
    id: "db-hammer-curl", name: "Kurzhantel-Hammercurls", equipment: "Kurzhantel", category: "Bizeps",
    muscles: ["Bizeps", "Brachialis", "Unterarm"], aliases: ["Hammer Curls", "Hammer curl", "neutraler Bizepscurl"],
    setup: "Hanteln seitlich halten, Daumen zeigen nach vorn.",
    cues: ["Handflächen einander zugewandt lassen.", "Ohne Schwung bis zur Schulter beugen und kontrolliert senken."],
    avoid: "Handgelenke nicht einknicken und Ellenbogen nicht nach vorn werfen.", motion: "curl-hammer",
  },
  {
    id: "db-concentration-curl", name: "Konzentrationscurl", equipment: "Kurzhantel", category: "Bizeps",
    muscles: ["Bizeps"], aliases: ["Concentration curl", "Konzentrationscurls", "sitzender Einzelcurl"],
    setup: "Sitzend den Oberarm an der Innenseite des Oberschenkels abstützen.",
    cues: ["Nur den Unterarm beugen.", "Oben kurz anspannen und langsam strecken."],
    avoid: "Den Oberarm nicht vom Bein lösen und nicht ruckartig arbeiten.", motion: "curl",
  },
  {
    id: "db-zottman-curl", name: "Zottman-Curl", equipment: "Kurzhantel", category: "Bizeps",
    muscles: ["Bizeps", "Unterarm"], aliases: ["Zottman curl", "Curl mit Drehung", "Unterarmcurl Hantel"],
    setup: "Aufrecht stehen und die Hanteln mit Handflächen nach vorn halten.",
    cues: ["Hochcurlen, oben die Hände drehen und mit Handflächen nach unten absenken.", "Die Drehung langsam und schmerzfrei ausführen."],
    avoid: "Handgelenke nicht gewaltsam verdrehen.", motion: "curl-rotation",
  },
  {
    id: "db-overhead-triceps", name: "Überkopf-Trizepsstrecken", equipment: "Kurzhantel", category: "Trizeps",
    muscles: ["Trizeps"], aliases: ["Overhead triceps extension", "Trizepsdrücken über Kopf", "French press Kurzhantel"],
    setup: "Eine Hantel mit beiden Händen über dem Kopf halten, Ellenbogen zeigen nach vorn.",
    cues: ["Unterarme hinter den Kopf beugen.", "Ellenbogen möglichst ruhig halten und wieder strecken."],
    avoid: "Kein Hohlkreuz und keine erzwungene tiefe Dehnung.", motion: "triceps-overhead",
  },
  {
    id: "db-skull-crusher", name: "Liegendes Trizepsstrecken", equipment: "Kurzhantel", category: "Trizeps",
    muscles: ["Trizeps"], aliases: ["Skull crusher", "French press liegend", "lying dumbbell extension"],
    setup: "Auf die Bank legen und Hanteln mit fast gestreckten Armen über der Brust halten.",
    cues: ["Ellenbogen beugen und Hanteln neben den Kopf führen.", "Unterarme wieder nach oben strecken."],
    avoid: "Hanteln nicht Richtung Gesicht fallen lassen und Ellenbogen nicht weit spreizen.", motion: "triceps-lying", position: "lying", surface: "flat",
  },
  {
    id: "db-triceps-kickback", name: "Kurzhantel-Trizeps-Kickback", equipment: "Kurzhantel", category: "Trizeps",
    muscles: ["Trizeps"], aliases: ["Trizeps Kickback", "Dumbbell kickback", "Rückstoß Trizeps"],
    setup: "Oberkörper vorbeugen, Rücken lang halten und Ellenbogen am Körper anwinkeln.",
    cues: ["Unterarme nach hinten strecken.", "Oberarme ruhig halten und langsam beugen."],
    avoid: "Nicht aus dem Rücken reißen oder den Oberarm mitschwingen lassen.", motion: "triceps-kickback",
  },
  {
    id: "db-goblet-squat", name: "Goblet Squat", equipment: "Kurzhantel", category: "Beine",
    muscles: ["Oberschenkel", "Gesäß", "Rumpf"], aliases: ["Kniebeuge mit Hantel", "Goblet squat", "Kurzhantel-Kniebeuge"],
    setup: "Eine Hantel nah vor der Brust halten, Füße etwa schulterbreit aufstellen.",
    cues: ["Hüfte zwischen die Beine absenken.", "Ganzen Fuß am Boden lassen und über die Fersen hochdrücken."],
    avoid: "Knie nicht nach innen fallen lassen; nur so tief gehen, wie du stabil bleibst.", motion: "squat",
  },
  {
    id: "db-romanian-deadlift", name: "Kurzhantel-Rumänisches Kreuzheben", equipment: "Kurzhantel", category: "Beine",
    muscles: ["hintere Oberschenkel", "Gesäß", "Rückenstrecker"], aliases: ["RDL", "Romanian deadlift", "Kurzhantel-Kreuzheben"],
    setup: "Hanteln vor den Oberschenkeln halten, Knie leicht beugen und Rücken lang machen.",
    cues: ["Hüfte nach hinten schieben, Hanteln dicht an den Beinen führen.", "Aufrichten, indem du die Hüfte nach vorn bringst."],
    avoid: "Nicht in den Rücken runden und die Knie nicht in eine tiefe Kniebeuge schieben.", motion: "hinge",
  },
  {
    id: "db-reverse-lunge", name: "Kurzhantel-Rückwärtsausfallschritt", equipment: "Kurzhantel", category: "Beine",
    muscles: ["Oberschenkel", "Gesäß"], aliases: ["Reverse lunge", "Ausfallschritt rückwärts", "Dumbbell lunge"],
    setup: "Aufrecht stehen und Hanteln seitlich halten.",
    cues: ["Einen Fuß kontrolliert nach hinten setzen.", "Vorderes Bein belastet lassen und zurück in den Stand drücken."],
    avoid: "Schritt nicht zu schmal setzen und das vordere Knie nicht nach innen drehen.", motion: "lunge",
  },
  {
    id: "db-calf-raise", name: "Kurzhantel-Wadenheben", equipment: "Kurzhantel", category: "Beine",
    muscles: ["Waden"], aliases: ["Wadenheben", "Standing calf raise dumbbell", "Wadenheben mit Hanteln"],
    setup: "Aufrecht stehen, Hanteln seitlich halten und Füße hüftbreit stellen.",
    cues: ["Fersen langsam heben und oben kurz halten.", "Kontrolliert bis zu einer angenehmen Dehnung absenken."],
    avoid: "Nicht federn oder über die Fußaußenkanten kippen.", motion: "calf-raise",
  },

  {
    id: "cable-chest-press", name: "Kabel-Brustdrücken", equipment: "Kabelturm", category: "Brust",
    muscles: ["Brust", "Trizeps", "vordere Schulter"], aliases: ["Cable chest press", "Kabeldrücken", "Brustpresse Kabelzug"],
    setup: "Griffe etwa auf Brusthöhe einstellen und stabil versetzt stehen.",
    cues: ["Rumpf anspannen und Griffe vor der Brust zusammenführen.", "Kontrolliert zurückgehen, ohne die Schulter nach vorn kippen zu lassen."],
    avoid: "Nicht ins Hohlkreuz ziehen lassen oder die Gewichte zusammenschlagen.", motion: "press-horizontal", cableAnchor: "middle",
  },
  {
    id: "cable-low-high-fly", name: "Kabel-Flys von unten nach oben", equipment: "Kabelturm", category: "Brust",
    muscles: ["obere Brust", "vordere Schulter"], aliases: ["Low to high cable fly", "Kabel-Flys unten oben", "Cable crossover low high"],
    setup: "Griffe unten einhängen, leicht nach vorn treten und Arme öffnen.",
    cues: ["Griffe in einem Bogen vor der oberen Brust zusammenführen.", "Ellenbogen leicht beugen und Brustkorb ruhig halten."],
    avoid: "Nicht mit gestreckten Ellenbogen reißen.", motion: "fly", cableAnchor: "low",
  },
  {
    id: "cable-high-low-fly", name: "Kabel-Flys von oben nach unten", equipment: "Kabelturm", category: "Brust",
    muscles: ["Brust", "untere Brust"], aliases: ["High to low cable fly", "Kabel-Flys oben unten", "Cable crossover high low"],
    setup: "Griffe oben einhängen und einen stabilen Schritt nach vorn machen.",
    cues: ["Arme bogenförmig nach vorn und unten zusammenführen.", "Schultern unten halten und die Rückführung bremsen."],
    avoid: "Nicht aus dem Rücken nach vorn fallen.", motion: "fly", cableAnchor: "high",
  },
  {
    id: "cable-crossover", name: "Kabel-Crossover", equipment: "Kabelturm", category: "Brust",
    muscles: ["Brust"], aliases: ["Cable crossover", "Kabelzug Überkreuzen", "Standing cable fly"],
    setup: "Beide Griffe auf Brusthöhe einstellen, mittig stehen und leicht nach vorn lehnen.",
    cues: ["Griffe vor dem Brustbein zusammenführen.", "Ellenbogen weich lassen und kontrolliert öffnen."],
    avoid: "Nicht die Schultern hochziehen oder weit hinter den Körper öffnen.", motion: "fly", cableAnchor: "middle",
  },
  {
    id: "cable-one-arm-press", name: "Einarmiges Kabel-Brustdrücken", equipment: "Kabelturm", category: "Brust",
    muscles: ["Brust", "Trizeps", "Rumpf"], aliases: ["Single arm cable press", "Einarmiges Brustdrücken Kabel", "Cable press einarmig"],
    setup: "Griff auf Brusthöhe einstellen, seitlich zum Turm stehen und stabil ausrichten.",
    cues: ["Griff gerade nach vorn drücken.", "Rumpf gegen das Verdrehen stabil halten."],
    avoid: "Becken und Brustkorb nicht zum Turm mitdrehen.", motion: "press-horizontal", cableAnchor: "middle", unilateral: true,
  },
  {
    id: "cable-lat-pulldown", name: "Latzug breit", equipment: "Kabelturm", category: "Rücken",
    muscles: ["Latissimus", "oberer Rücken", "Bizeps"], aliases: ["Latziehen", "Wide grip lat pulldown", "Latzug zur Brust"],
    setup: "Breiten Griff einhängen, hinsetzen und Knie unter die Polster klemmen.",
    cues: ["Brust leicht anheben und Ellenbogen nach unten ziehen.", "Griff zur oberen Brust führen und langsam wieder hochlassen."],
    avoid: "Nicht hinter den Nacken ziehen oder stark nach hinten schaukeln.", motion: "pulldown", cableAnchor: "high",
  },
  {
    id: "cable-close-pulldown", name: "Latzug eng", equipment: "Kabelturm", category: "Rücken",
    muscles: ["Latissimus", "Bizeps"], aliases: ["Close grip lat pulldown", "Enger Latzug", "V-Griff Latziehen"],
    setup: "Engen oder V-Griff einhängen und aufrecht unter dem Polster sitzen.",
    cues: ["Ellenbogen nah am Körper nach unten führen.", "Kontrolliert bis zum oberen Brustbereich ziehen."],
    avoid: "Nicht mit dem Oberkörper stark zurücklehnen.", motion: "pulldown", cableAnchor: "high",
  },
  {
    id: "cable-seated-row", name: "Sitzendes Kabelrudern", equipment: "Kabelturm", category: "Rücken",
    muscles: ["Latissimus", "mittlerer Rücken", "Bizeps"], aliases: ["Seated cable row", "Kabelrudern sitzend", "Rudern am Kabel"],
    setup: "Füße stabil aufstellen, Griff fassen und mit langem Rücken sitzen.",
    cues: ["Ellenbogen Richtung Hüfte ziehen.", "Brust bleibt ruhig; Arme langsam nach vorn strecken."],
    avoid: "Nicht mit dem Oberkörper vor- und zurückwippen.", motion: "row", cableAnchor: "low",
  },
  {
    id: "cable-one-arm-row", name: "Einarmiges Kabelrudern", equipment: "Kabelturm", category: "Rücken",
    muscles: ["Latissimus", "mittlerer Rücken", "Bizeps"], aliases: ["Single arm cable row", "Einarmiges Rudern Kabel", "Kabelrudern einarmig"],
    setup: "Griff auf mittlerer Höhe einhängen und mit stabiler Haltung zum Turm stehen.",
    cues: ["Ellenbogen kontrolliert nach hinten ziehen.", "Schulterblatt bewegt sich mit, Oberkörper bleibt ruhig."],
    avoid: "Nicht den Oberkörper verdrehen oder den Griff ruckartig ziehen.", motion: "row", cableAnchor: "middle", unilateral: true,
  },
  {
    id: "cable-straight-pulldown", name: "Gestreckter Kabel-Pulldown", equipment: "Kabelturm", category: "Rücken",
    muscles: ["Latissimus", "Rumpf"], aliases: ["Straight arm pulldown", "Gestrecktes Latziehen", "Kabelzug mit gestreckten Armen"],
    setup: "Seil oder Stange oben einhängen, leicht nach vorn treten und Arme fast gestreckt halten.",
    cues: ["Griff in einem Bogen bis zu den Oberschenkeln führen.", "Schultern tief halten und langsam zurücklassen."],
    avoid: "Ellenbogen nicht stark beugen und nicht aus dem Rücken reißen.", motion: "straight-pulldown", cableAnchor: "high",
  },
  {
    id: "cable-face-pull", name: "Face Pull", equipment: "Kabelturm", category: "Schulter",
    muscles: ["hintere Schulter", "oberer Rücken"], aliases: ["Facepull", "Seilzug zum Gesicht", "Kabel Face Pull"],
    setup: "Seil auf Augenhöhe einhängen und mit beiden Händen greifen.",
    cues: ["Seil zum Gesicht ziehen und Hände auseinanderführen.", "Ellenbogen ungefähr auf Schulterhöhe halten."],
    avoid: "Nicht ins Hohlkreuz fallen oder die Schultern hochziehen.", motion: "face-pull", cableAnchor: "high",
  },
  {
    id: "cable-reverse-fly", name: "Kabel-Reverse-Fly", equipment: "Kabelturm", category: "Schulter",
    muscles: ["hintere Schulter", "oberer Rücken"], aliases: ["Cable reverse fly", "Reverse cable crossover", "hintere Schulter Kabel"],
    setup: "Griffe etwa auf Schulterhöhe einstellen und Arme vor dem Körper kreuzen.",
    cues: ["Arme seitlich öffnen, bis sie auf einer Linie sind.", "Bewegung kontrollieren und Brustkorb ruhig halten."],
    avoid: "Nicht mit Schwung ziehen oder die Ellenbogen durchdrücken.", motion: "rear-fly", cableAnchor: "middle",
  },
  {
    id: "cable-lateral-raise", name: "Einarmiges Kabel-Seitheben", equipment: "Kabelturm", category: "Schulter",
    muscles: ["seitliche Schulter"], aliases: ["Cable lateral raise", "Seitheben am Kabel", "Kabelzug-Seitheben"],
    setup: "Griff unten einhängen, seitlich zum Turm stehen und den Arm vor dem Körper starten lassen.",
    cues: ["Arm seitlich bis etwa Schulterhöhe heben.", "Schulter tief lassen und langsam absenken."],
    avoid: "Nicht mit dem Oberkörper kippen oder den Arm hochreißen.", motion: "raise-lateral", cableAnchor: "low", unilateral: true,
  },
  {
    id: "cable-front-raise", name: "Kabel-Frontheben", equipment: "Kabelturm", category: "Schulter",
    muscles: ["vordere Schulter"], aliases: ["Cable front raise", "Frontheben am Kabel", "Kabelzug nach vorne heben"],
    setup: "Griff unten einhängen und mit dem Rücken zum Turm stehen.",
    cues: ["Arm kontrolliert vor dem Körper heben.", "Rumpf stabil und Schulter unten lassen."],
    avoid: "Nicht nach hinten lehnen oder über Schulterhöhe reißen.", motion: "raise-front", cableAnchor: "low", unilateral: true,
  },
  {
    id: "cable-upright-row", name: "Kabel-Aufrechtes Rudern", equipment: "Kabelturm", category: "Schulter",
    muscles: ["Schulter", "oberer Trapez"], aliases: ["Cable upright row", "Aufrechtes Rudern Kabel", "Kabelzug zum Kinn"],
    setup: "Geraden Griff unten einhängen, Hände etwa schulterbreit halten.",
    cues: ["Griff nah am Körper bis zu einer angenehmen Höhe ziehen.", "Ellenbogen führen, Handgelenke locker lassen."],
    avoid: "Nicht höher ziehen, wenn die Schulter zwickt; kein Schwung.", motion: "upright-row", cableAnchor: "low",
  },
  {
    id: "cable-biceps-curl", name: "Kabel-Bizepscurls", equipment: "Kabelturm", category: "Bizeps",
    muscles: ["Bizeps"], aliases: ["Cable curl", "Bizepscurls am Kabel", "Kabelzug Bizeps"],
    setup: "Geraden Griff unten einhängen und aufrecht vor dem Turm stehen.",
    cues: ["Ellenbogen am Oberkörper halten und Griff beugen.", "Langsam strecken, damit das Kabel gespannt bleibt."],
    avoid: "Nicht den Rücken nach hinten schwingen.", motion: "curl", cableAnchor: "low",
  },
  {
    id: "cable-rope-hammer-curl", name: "Seil-Hammercurls am Kabel", equipment: "Kabelturm", category: "Bizeps",
    muscles: ["Bizeps", "Unterarm"], aliases: ["Rope hammer curl", "Hammercurl Kabel", "Seilcurl neutral"],
    setup: "Seil unten einhängen und die Enden mit neutralem Griff halten.",
    cues: ["Ellenbogen ruhig lassen und Unterarme beugen.", "Das Seil oben leicht auseinanderführen, dann kontrolliert senken."],
    avoid: "Nicht mit dem Oberkörper wippen.", motion: "curl-hammer", cableAnchor: "low",
  },
  {
    id: "cable-behind-body-curl", name: "Kabelcurl hinter dem Körper", equipment: "Kabelturm", category: "Bizeps",
    muscles: ["Bizeps"], aliases: ["Behind the body cable curl", "Bayesian curl", "Kabelcurl von hinten"],
    setup: "Griff unten einhängen, dem Turm den Rücken zudrehen und Arm leicht hinter dem Oberkörper starten lassen.",
    cues: ["Ellenbogen an Ort und Stelle halten.", "Unterarm beugen und langsam wieder strecken."],
    avoid: "Schulter nicht nach vorn ziehen und keine schmerzhafte Dehnung erzwingen.", motion: "curl", cableAnchor: "low",
  },
  {
    id: "cable-rope-pushdown", name: "Trizepsdrücken mit Seil", equipment: "Kabelturm", category: "Trizeps",
    muscles: ["Trizeps"], aliases: ["Rope pushdown", "Trizepsdrücken Kabel", "Seil-Pushdown"],
    setup: "Seil oben einhängen, aufrecht stehen und Ellenbogen am Körper anlegen.",
    cues: ["Unterarme nach unten strecken.", "Unten das Seil leicht auseinanderziehen und kontrolliert zurückführen."],
    avoid: "Ellenbogen nicht nach vorn und hinten schieben.", motion: "triceps-pushdown", cableAnchor: "high",
  },
  {
    id: "cable-overhead-triceps", name: "Überkopf-Trizepsstrecken am Kabel", equipment: "Kabelturm", category: "Trizeps",
    muscles: ["Trizeps"], aliases: ["Overhead cable extension", "Überkopf Trizeps Kabel", "Seilzug French press"],
    setup: "Seil unten einhängen, mit dem Rücken zum Turm stehen und Hände hinter den Kopf nehmen.",
    cues: ["Ellenbogen nach vorn zeigen lassen.", "Unterarme nach oben strecken und langsam beugen."],
    avoid: "Rippen nicht nach vorn schieben und nicht ruckartig strecken.", motion: "triceps-overhead", cableAnchor: "low",
  },
  {
    id: "cable-one-arm-pushdown", name: "Einarmiges Trizepsdrücken", equipment: "Kabelturm", category: "Trizeps",
    muscles: ["Trizeps"], aliases: ["Single arm cable pushdown", "Einarmiger Pushdown", "Trizepsdrücken einarmig"],
    setup: "Einzelgriff oben einhängen und mit stabilem Stand zum Turm stehen.",
    cues: ["Ellenbogen am Körper halten und Unterarm strecken.", "Langsam in die Beugung zurückkehren."],
    avoid: "Schulter nicht drehen und den Rumpf nicht mitbewegen.", motion: "triceps-pushdown", cableAnchor: "high", unilateral: true,
  },
  {
    id: "cable-squat", name: "Kabel-Kniebeuge", equipment: "Kabelturm", category: "Beine",
    muscles: ["Oberschenkel", "Gesäß", "Rumpf"], aliases: ["Cable squat", "Kniebeuge am Kabel", "Kabelzug Squat"],
    setup: "Griff auf Brusthöhe halten, leicht zurücktreten und Füße schulterbreit stellen.",
    cues: ["Hüfte zwischen die Beine senken und die Fersen am Boden lassen.", "Mit stabilem Rumpf wieder aufrichten."],
    avoid: "Nicht vom Kabel nach vorn ziehen lassen und Knie nicht nach innen fallen lassen.", motion: "cable-squat", cableAnchor: "middle",
  },
  {
    id: "cable-pull-through", name: "Kabel-Pull-Through", equipment: "Kabelturm", category: "Gesäß",
    muscles: ["Gesäß", "hintere Oberschenkel"], aliases: ["Pull through", "Cable pull-through", "Kabelzug zwischen den Beinen"],
    setup: "Seil unten einhängen, dem Turm den Rücken zudrehen und das Seil zwischen den Beinen halten.",
    cues: ["Hüfte nach hinten schieben, Knie leicht beugen.", "Hüfte nach vorn strecken und Gesäß anspannen."],
    avoid: "Nicht in den unteren Rücken überstrecken.", motion: "pull-through", cableAnchor: "low",
  },
  {
    id: "cable-glute-kickback", name: "Kabel-Kickback fürs Gesäß", equipment: "Kabelturm", category: "Gesäß",
    muscles: ["Gesäß", "hintere Oberschenkel"], aliases: ["Glute kickback", "Cable glute kickback", "Po-Kickback Kabel"],
    setup: "Fußschlaufe unten befestigen und am Turm stabil festhalten.",
    cues: ["Bein kontrolliert nach hinten führen.", "Becken gerade halten und ohne Schwung zurückkehren."],
    avoid: "Nicht ins Hohlkreuz ausweichen oder das Bein hochschwingen.", motion: "glute-kickback", cableAnchor: "low", unilateral: true, cableAttachment: "foot",
  },
  {
    id: "cable-woodchop", name: "Kabel-Holzhacker", equipment: "Kabelturm", category: "Core",
    muscles: ["Rumpf", "schräge Bauchmuskeln", "Schulter"], aliases: ["Woodchop", "Cable wood chop", "Diagonalzug Kabel"],
    setup: "Griff hoch oder tief einhängen, seitlich zum Turm stehen und beide Hände nutzen.",
    cues: ["Griff diagonal vor dem Körper führen.", "Rumpf kontrolliert mitdrehen und Stand stabil halten."],
    avoid: "Nicht ruckartig reißen oder nur mit den Armen arbeiten.", motion: "woodchop", cableAnchor: "high",
  },
];

export const EXERCISE_CATEGORIES: ExerciseCategory[] = ["Brust", "Rücken", "Schulter", "Bizeps", "Trizeps", "Beine", "Gesäß", "Core"];
export const EXERCISE_EQUIPMENT: ExerciseEquipment[] = ["Kurzhantel", "Kabelturm"];
