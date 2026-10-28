"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../src/components/AppShell";
import { ExerciseAnimation } from "../../src/components/ExerciseAnimation";
import {
  EXERCISE_CATEGORIES,
  EXERCISE_EQUIPMENT,
  EXERCISE_LIBRARY,
  type ExerciseCategory,
  type ExerciseEquipment,
  type LibraryExercise,
} from "../../src/data/exercise-library";

const QUEUED_EXERCISE_KEY = "gym-battle:library-exercise";

type Filter = "Alle" | ExerciseEquipment;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("de-DE").trim();
}

function storeExerciseForTraining(exercise: LibraryExercise) {
  window.sessionStorage.setItem(QUEUED_EXERCISE_KEY, JSON.stringify({ id: exercise.id, name: exercise.name, createdAt: Date.now() }));
}

function ExerciseCard({ exercise, onOpen, onAdd }: { exercise: LibraryExercise; onOpen: () => void; onAdd: () => void }) {
  return (
    <article className="glass-panel overflow-hidden rounded-[22px]">
      <button type="button" onClick={onOpen} className="block w-full text-left" aria-label={`${exercise.name} ansehen`}>
        <ExerciseAnimation exercise={exercise} compact />
        <div className="px-4 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/[0.1] bg-white/[0.055] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/65">{exercise.equipment}</span>
            <span className="text-[11px] font-medium text-white/40">{exercise.category}</span>
          </div>
          <h2 className="mt-3 text-[16px] font-bold leading-snug text-white">{exercise.name}</h2>
          <p className="mt-1 line-clamp-1 text-[12px] text-white/45">{exercise.muscles.join(" · ")}</p>
          <p className="mt-3 line-clamp-2 min-h-10 text-[12px] leading-5 text-white/65">{exercise.cues[0]}</p>
        </div>
      </button>
      <div className="flex items-center justify-between gap-3 px-4 pb-4 pt-3">
        <button type="button" onClick={onOpen} className="text-xs font-semibold text-white/50 transition hover:text-white">Technik ansehen</button>
        <button type="button" onClick={onAdd} className="secondary-button min-h-10 px-3 text-xs">Zum Training +</button>
      </div>
    </article>
  );
}

function ExerciseDetails({ exercise, onClose, onAdd }: { exercise: LibraryExercise; onClose: () => void; onAdd: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"));
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="exercise-detail-title" className="glass-panel max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] p-4 sm:rounded-[28px] sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/[0.1] bg-white/[0.055] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/65">{exercise.equipment}</span>
              <span className="text-xs text-white/45">{exercise.category} · {exercise.muscles.join(" · ")}</span>
            </div>
            <h2 id="exercise-detail-title" className="mt-2 text-xl font-extrabold tracking-tight text-white">{exercise.name}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="secondary-button min-h-10 w-10 shrink-0 px-0 text-xl" aria-label="Details schließen">×</button>
        </div>
        <ExerciseAnimation exercise={exercise} />
        <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Ausgangsposition</h3>
          <p className="mt-2 text-sm leading-6 text-white/80">{exercise.setup}</p>
          <h3 className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-white/45">Darauf achten</h3>
          <ol className="mt-2 space-y-2">
            {exercise.cues.map((cue, index) => <li key={cue} className="flex gap-3 text-sm leading-6 text-white/80"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-white/15 text-[10px] font-bold text-white/55">{index + 1}</span><span>{cue}</span></li>)}
          </ol>
          <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">Häufig vermeiden</p>
            <p className="mt-1 text-xs leading-5 text-white/70">{exercise.avoid}</p>
          </div>
          <p className="mt-4 text-[11px] leading-5 text-white/35">Allgemeine Orientierung, keine individuelle Trainings- oder Gesundheitsberatung. Bei Schmerzen die Bewegung abbrechen.</p>
        </div>
        {exercise.aliases.length > 0 && <p className="mt-4 text-xs leading-5 text-white/40"><span className="font-semibold text-white/55">Auch bekannt als:</span> {exercise.aliases.join(" · ")}</p>}
        <button type="button" onClick={onAdd} className="primary-button mt-5 w-full px-4">Übung zum Training hinzufügen</button>
      </section>
    </div>
  );
}

export default function ExerciseLibraryPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [equipment, setEquipment] = useState<Filter>("Alle");
  const [category, setCategory] = useState<ExerciseCategory | "Alle">("Alle");
  const [selected, setSelected] = useState<LibraryExercise | null>(null);
  const [notice, setNotice] = useState("");
  const closeDetails = useCallback(() => setSelected(null), []);

  const results = useMemo(() => {
    const search = normalize(query);
    return EXERCISE_LIBRARY.filter((exercise) => {
      if (equipment !== "Alle" && exercise.equipment !== equipment) return false;
      if (category !== "Alle" && exercise.category !== category) return false;
      if (!search) return true;
      const haystack = normalize([exercise.name, exercise.equipment, exercise.category, ...exercise.muscles, ...exercise.aliases].join(" "));
      return haystack.includes(search);
    });
  }, [query, equipment, category]);

  function addToTraining(exercise: LibraryExercise) {
    try {
      storeExerciseForTraining(exercise);
    } catch {
      setNotice("Dein Browser konnte die Übung nicht zwischenspeichern. Öffne das Training und füge sie dort manuell hinzu.");
      return;
    }
    router.push("/training");
  }

  const dumbbellCount = EXERCISE_LIBRARY.filter((exercise) => exercise.equipment === "Kurzhantel").length;
  const cableCount = EXERCISE_LIBRARY.length - dumbbellCount;

  return (
    <AppShell>
      <main className="mx-auto max-w-[1240px] px-4 pb-10 pt-7 sm:px-7 sm:pt-9 lg:px-10">
        <header className="mb-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/40">GYM BATTLE · WISSEN</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-[-0.045em] text-white sm:text-[40px]">Übungsbibliothek</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">Bewegung ansehen, Technik verstehen und die passende Übung ins Training übernehmen.</p>
            </div>
            <div className="flex gap-2 text-[11px] text-white/50">
              <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1.5">{EXERCISE_LIBRARY.length} Übungen</span>
              <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1.5">{dumbbellCount} Kurzhantel · {cableCount} Kabel</span>
            </div>
          </div>
        </header>

        <section aria-label="Übungen suchen und filtern" className="glass-panel mb-6 grid gap-3 rounded-[22px] p-3 sm:grid-cols-[minmax(0,1fr)_190px_170px] sm:p-4">
          <label className="sr-only" htmlFor="exercise-search">Übung, Synonym oder Muskelgruppe suchen</label>
          <input id="exercise-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Übung, anderes Wort oder Muskelgruppe …" className="app-input w-full px-4 text-sm" />
          <label className="sr-only" htmlFor="equipment-filter">Gerät auswählen</label>
          <select id="equipment-filter" value={equipment} onChange={(event) => setEquipment(event.target.value as Filter)} className="app-input w-full px-3 text-sm">
            <option value="Alle">Alle Geräte</option>{EXERCISE_EQUIPMENT.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <label className="sr-only" htmlFor="category-filter">Muskelgruppe auswählen</label>
          <select id="category-filter" value={category} onChange={(event) => setCategory(event.target.value as ExerciseCategory | "Alle")} className="app-input w-full px-3 text-sm">
            <option value="Alle">Alle Muskelgruppen</option>{EXERCISE_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </section>

        <div className="mb-4 flex items-center justify-between gap-3 text-xs text-white/45" aria-live="polite">
          <p>{results.length} {results.length === 1 ? "Übung" : "Übungen"} gefunden</p>
          {(query || equipment !== "Alle" || category !== "Alle") && <button type="button" onClick={() => { setQuery(""); setEquipment("Alle"); setCategory("Alle"); }} className="font-semibold text-white/70 hover:text-white">Filter zurücksetzen</button>}
        </div>

        {notice && <p role="status" className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">{notice}</p>}

        {results.length > 0 ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((exercise) => <ExerciseCard key={exercise.id} exercise={exercise} onOpen={() => setSelected(exercise)} onAdd={() => addToTraining(exercise)} />)}
        </div> : <div className="glass-panel rounded-[22px] px-5 py-12 text-center">
          <h2 className="text-lg font-bold text-white">Keine passende Übung gefunden</h2>
          <p className="mt-2 text-sm text-white/50">Probiere ein anderes Stichwort, einen englischen Namen oder setze die Filter zurück.</p>
          <button type="button" onClick={() => { setQuery(""); setEquipment("Alle"); setCategory("Alle"); }} className="secondary-button mt-5 px-4">Alle Übungen anzeigen</button>
        </div>}

        <p className="mt-6 text-center text-[11px] leading-5 text-white/30">Die Animationen sind einfache schematische Bewegungsabläufe. Wähle ein Gewicht, das du kontrolliert bewegen kannst.</p>
      </main>
      {selected && <ExerciseDetails exercise={selected} onClose={closeDetails} onAdd={() => addToTraining(selected)} />}
    </AppShell>
  );
}
