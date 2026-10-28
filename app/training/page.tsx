"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../src/components/AppShell";
import { supabase } from "../../src/lib/supabase";

type SetEntry = { id: string; weight: string; reps: string };
type SavedExercise = { id: string; name: string };
type ExerciseEntry = { id: string; exerciseId: string | null; name: string; sets: SetEntry[] };
type WorkoutDraft = { workoutName: string; exercises: ExerciseEntry[]; startedAt: number };

type PreviousWorkout = { workout_exercises: { exercise_name: string | null; workout_sets: { weight: number | null }[] }[] };

const DRAFT_PREFIX = "gym-battle:workout-draft:";

function parseDecimal(value: string) {
  const trimmed = value.trim().replace(/\s/g, "");
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  return Number(normalized);
}

function makeSet(): SetEntry {
  return { id: crypto.randomUUID(), weight: "", reps: "" };
}

function makeExercise(name: string, exerciseId: string | null): ExerciseEntry {
  return { id: crypto.randomUUID(), exerciseId, name, sets: [makeSet()] };
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function TrainingPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [workoutName, setWorkoutName] = useState("Mein Training");
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [savedExercises, setSavedExercises] = useState<SavedExercise[]>([]);
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [previousPerformance, setPreviousPerformance] = useState<Record<string, number>>({});
  const [startedAt, setStartedAt] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [restRemaining, setRestRemaining] = useState(0);
  const [restDuration, setRestDuration] = useState(90);

  useEffect(() => {
    let active = true;

    async function initialize() {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error || !data.session) {
        router.replace("/");
        return;
      }

      const id = data.session.user.id;
      setUserId(id);
      const [libraryResult, previousResult] = await Promise.all([
        supabase.from("exercises").select("id, name").eq("user_id", id).order("name", { ascending: true }),
        supabase.from("workouts").select("workout_exercises (exercise_name, workout_sets (weight))").eq("user_id", id).not("finished_at", "is", null).order("started_at", { ascending: false }).limit(40),
      ]);
      if (!active) return;

      if (libraryResult.error) {
        setMessage("Deine Übungsbibliothek konnte nicht geladen werden.");
      } else {
        setSavedExercises(libraryResult.data ?? []);
      }

      const previous: Record<string, number> = {};
      for (const workout of (previousResult.data ?? []) as unknown as PreviousWorkout[]) {
        for (const exercise of workout.workout_exercises ?? []) {
          const key = exercise.exercise_name?.trim().toLocaleLowerCase("de-DE");
          if (!key || previous[key] !== undefined) continue;
          const best = Math.max(0, ...(exercise.workout_sets ?? []).map((set) => Number(set.weight) || 0));
          if (best > 0) previous[key] = best;
        }
      }
      setPreviousPerformance(previous);

      const storedDraft = window.localStorage.getItem(`${DRAFT_PREFIX}${id}`);
      let restoredStart = Date.now();
      if (storedDraft) {
        try {
          const draft = JSON.parse(storedDraft) as WorkoutDraft;
          if (Array.isArray(draft.exercises)) {
            setWorkoutName(draft.workoutName || "Mein Training");
            setExercises(draft.exercises);
            restoredStart = draft.startedAt || restoredStart;
            setMessage("Dein lokaler Trainingsentwurf wurde wiederhergestellt.");
          }
        } catch {
          window.localStorage.removeItem(`${DRAFT_PREFIX}${id}`);
        }
      }
      setStartedAt(restoredStart);
      setLoading(false);
      setHydrated(true);
    }

    void initialize();
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (!hydrated || !userId) return;
    const draft: WorkoutDraft = { workoutName, exercises, startedAt: startedAt || Date.now() };
    window.localStorage.setItem(`${DRAFT_PREFIX}${userId}`, JSON.stringify(draft));
  }, [hydrated, userId, workoutName, exercises, startedAt]);

  useEffect(() => {
    if (!startedAt) return;
    const update = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [startedAt]);

  useEffect(() => {
    if (restRemaining <= 0) return;
    const interval = window.setInterval(() => setRestRemaining((remaining) => Math.max(0, remaining - 1)), 1000);
    return () => window.clearInterval(interval);
  }, [restRemaining]);

  const filteredSavedExercises = useMemo(() => {
    const query = exerciseSearch.trim().toLocaleLowerCase("de-DE");
    return savedExercises.filter((exercise) => exercise.name.toLocaleLowerCase("de-DE").includes(query));
  }, [savedExercises, exerciseSearch]);

  const setCount = exercises.reduce((total, exercise) => total + exercise.sets.length, 0);

  async function addExercise() {
    const name = exerciseName.trim();
    if (!name || adding) return;
    setAdding(true);
    setMessage("");
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        router.replace("/");
        return;
      }

      const existing = savedExercises.find((exercise) => exercise.name.toLocaleLowerCase("de-DE") === name.toLocaleLowerCase("de-DE"));
      let exerciseId: string;
      if (existing) {
        exerciseId = existing.id;
      } else {
        const { data: created, error: createError } = await supabase.from("exercises").insert({ user_id: userData.user.id, name }).select("id, name").single();
        if (createError) {
          if (createError.code === "23505") {
            const { data: duplicate, error: duplicateError } = await supabase.from("exercises").select("id, name").eq("user_id", userData.user.id).ilike("name", name).limit(1).maybeSingle();
            if (duplicateError || !duplicate) throw createError;
            exerciseId = duplicate.id;
            setSavedExercises((current) => current.some((item) => item.id === duplicate.id) ? current : [...current, duplicate].sort((a, b) => a.name.localeCompare(b.name)));
          } else {
            throw createError;
          }
        } else {
          exerciseId = created.id;
          setSavedExercises((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
        }
      }
      setExercises((current) => [...current, makeExercise(name, exerciseId)]);
      setExerciseName("");
    } catch {
      setMessage("Übung konnte nicht hinzugefügt werden. Deine Eingabe bleibt erhalten.");
    } finally {
      setAdding(false);
    }
  }

  function addSavedExercise() {
    const selected = savedExercises.find((exercise) => exercise.id === selectedExerciseId);
    if (!selected) {
      setMessage("Wähle zuerst eine Übung aus.");
      return;
    }
    setExercises((current) => [...current, makeExercise(selected.name, selected.id)]);
    setSelectedExerciseId("");
    setMessage("");
  }

  function addSet(exerciseId: string, duplicate = false) {
    setExercises((current) => current.map((exercise) => exercise.id === exerciseId ? {
      ...exercise,
      sets: [...exercise.sets, { id: crypto.randomUUID(), weight: duplicate ? exercise.sets.at(-1)?.weight ?? "" : exercise.sets.at(-1)?.weight ?? "", reps: duplicate ? exercise.sets.at(-1)?.reps ?? "" : "" }],
    } : exercise));
  }

  function updateSet(exerciseId: string, setId: string, field: "weight" | "reps", value: string) {
    setExercises((current) => current.map((exercise) => exercise.id === exerciseId ? {
      ...exercise,
      sets: exercise.sets.map((set) => set.id === setId ? { ...set, [field]: value } : set),
    } : exercise));
  }

  async function saveWorkout(finish: boolean) {
    if (saving) return;
    if (exercises.length === 0) {
      setMessage("Füge zuerst mindestens eine Übung hinzu.");
      return;
    }
    for (const exercise of exercises) {
      if (!exercise.name.trim() || exercise.sets.length === 0) {
        setMessage("Jede Übung braucht mindestens einen Satz.");
        return;
      }
      for (const set of exercise.sets) {
        const weight = parseDecimal(set.weight);
        const reps = Number(set.reps);
        if (!set.weight.trim() || !set.reps.trim() || !Number.isFinite(weight) || !Number.isInteger(reps) || weight < 0 || reps < 1) {
          setMessage("Bitte trage pro Satz ein gültiges Gewicht (mindestens 0 kg) und mindestens eine Wiederholung ein.");
          return;
        }
      }
    }

    setSaving(true);
    setMessage("");
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        router.replace("/");
        return;
      }
      const { data: workout, error: workoutError } = await supabase.from("workouts").insert({
        user_id: userData.user.id,
        name: workoutName.trim() || "Mein Training",
        finished_at: finish ? new Date().toISOString() : null,
      }).select("id").single();
      if (workoutError) throw workoutError;

      for (let index = 0; index < exercises.length; index++) {
        const exercise = exercises[index];
        const { data: workoutExercise, error: exerciseError } = await supabase.from("workout_exercises").insert({
          workout_id: workout.id,
          exercise_id: exercise.exerciseId,
          exercise_name: exercise.name.trim(),
          position: index,
        }).select("id").single();
        if (exerciseError) throw exerciseError;

        const { error: setsError } = await supabase.from("workout_sets").insert(exercise.sets.map((set, setIndex) => ({
          workout_exercise_id: workoutExercise.id,
          set_number: setIndex + 1,
          weight: parseDecimal(set.weight),
          reps: Number(set.reps),
        })));
        if (setsError) throw setsError;
      }

      window.localStorage.removeItem(`${DRAFT_PREFIX}${userData.user.id}`);
      if (finish) {
        router.push("/dashboard");
      } else {
        router.push(`/training/${workout.id}`);
      }
    } catch {
      setMessage("Speichern fehlgeschlagen. Dein Browser-Entwurf bleibt erhalten; prüfe vor einem erneuten Versuch, ob bereits ein Training angelegt wurde.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <AppShell><main className="min-h-screen bg-[#090a0c] p-8 text-white" aria-live="polite">Training wird vorbereitet …</main></AppShell>;
  }

  return (
    <AppShell>
      <main className="min-h-screen bg-[#090a0c] px-4 py-6 text-white sm:px-6 md:px-10">
        <div className="mx-auto max-w-5xl">
          <header className="mb-7 flex items-center justify-between gap-3 border-b border-white/[0.08] pb-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Trainingslog</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Deine Einheit</h1>
            </div>
            <button onClick={() => { if (exercises.length && !window.confirm("Dein Entwurf ist lokal gespeichert. Möchtest du das Training verlassen?")) return; router.push("/dashboard"); }} className="secondary-button px-4 py-2.5 text-sm">Zur Übersicht</button>
          </header>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <article className="glass-soft rounded-2xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Trainingszeit</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{formatTime(elapsedSeconds)}</p>
            </article>
            <article className="glass-soft rounded-2xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Übungen</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{exercises.length}</p>
            </article>
            <article className="glass-soft col-span-2 rounded-2xl p-4 sm:col-span-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Sätze</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{setCount}</p>
            </article>
          </section>

          <section className="glass-panel mt-4 rounded-[22px] p-5 sm:p-6">
            <label className="block text-xs font-medium text-white/60" htmlFor="workout-name">Name der Einheit</label>
            <input id="workout-name" value={workoutName} onChange={(event) => setWorkoutName(event.target.value)} className="app-input mt-2 w-full px-4 text-sm sm:text-base" placeholder="z. B. Oberkörper A" />
            <p className="mt-2 text-[11px] text-white/38">Dein Entwurf wird auf diesem Gerät zwischengespeichert.</p>
          </section>

          <section className="glass-panel mt-4 rounded-[22px] p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Übungsbibliothek</p>
                <h2 className="mt-1 text-lg font-semibold">Was steht heute an?</h2>
              </div>
              <span className="rounded-full border border-white/[0.09] bg-white/[0.035] px-3 py-1.5 text-[10px] text-white/48">{savedExercises.length} gespeichert</span>
            </div>

            {savedExercises.length > 0 && (
              <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                <div className="flex min-w-0 gap-2">
                  <input value={exerciseSearch} onChange={(event) => setExerciseSearch(event.target.value)} className="app-input min-w-0 flex-1 px-3 text-sm" placeholder="Übung suchen" aria-label="Gespeicherte Übung suchen" />
                  <select value={selectedExerciseId} onChange={(event) => setSelectedExerciseId(event.target.value)} className="app-input min-w-0 flex-1 px-3 text-sm" aria-label="Gespeicherte Übung auswählen">
                    <option value="">Auswählen</option>
                    {filteredSavedExercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}
                  </select>
                </div>
                <button type="button" onClick={addSavedExercise} disabled={!selectedExerciseId} className="secondary-button px-4 py-2.5 text-sm disabled:opacity-45">Übung hinzufügen</button>
              </div>
            )}

            <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void addExercise(); }}>
              <input value={exerciseName} onChange={(event) => setExerciseName(event.target.value)} className="app-input min-w-0 flex-1 px-3 text-sm" placeholder="Neue Übung, z. B. Kniebeugen" aria-label="Neue Übung" />
              <button type="submit" disabled={adding || !exerciseName.trim()} className="secondary-button px-4 py-2.5 text-sm disabled:opacity-45">{adding ? "Wird hinzugefügt …" : "Neue Übung anlegen"}</button>
            </form>
          </section>

          <section className="mt-4 space-y-3" aria-label="Übungen in diesem Training">
            {exercises.length === 0 ? (
              <div className="glass-soft rounded-[22px] px-6 py-10 text-center">
                <p className="text-sm font-medium text-white/78">Dein Training beginnt mit der ersten Übung.</p>
                <p className="mt-2 text-xs leading-5 text-white/42">Füge sie aus deiner Bibliothek hinzu oder lege sie oben neu an.</p>
              </div>
            ) : exercises.map((exercise, exerciseIndex) => {
              const previous = previousPerformance[exercise.name.trim().toLocaleLowerCase("de-DE")];
              return (
                <article key={exercise.id} className="glass-panel rounded-[22px] p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.055] text-xs font-semibold text-white/58">{String(exerciseIndex + 1).padStart(2, "0")}</span>
                      <div className="min-w-0">
                        <h3 className="break-words text-base font-semibold sm:text-lg">{exercise.name}</h3>
                        {previous !== undefined ? <p className="mt-1 text-[11px] text-white/48">Letztes Mal: <span className="font-medium text-white/75">bis {new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(previous)} kg</span></p> : <p className="mt-1 text-[11px] text-white/35">Noch kein gespeicherter Vergleich</p>}
                      </div>
                    </div>
                    <button type="button" onClick={() => setExercises((current) => current.filter((item) => item.id !== exercise.id))} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white/40 transition hover:bg-white/[0.06] hover:text-white" aria-label={`${exercise.name} entfernen`}>×</button>
                  </div>

                  <div className="mt-5 grid grid-cols-[38px_minmax(0,1fr)_minmax(0,1fr)_40px] items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/37 sm:grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)_44px]">
                    <span>Satz</span><span>Gewicht · kg</span><span>Wdh.</span><span />
                  </div>
                  <div className="mt-2 space-y-2">
                    {exercise.sets.map((set, setIndex) => (
                      <div key={set.id} className="grid grid-cols-[38px_minmax(0,1fr)_minmax(0,1fr)_40px] items-center gap-2 rounded-xl border border-white/[0.055] bg-black/15 p-1.5 sm:grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)_44px] sm:p-2">
                        <span className="text-center text-xs font-medium tabular-nums text-white/52">{String(setIndex + 1).padStart(2, "0")}</span>
                        <input type="text" inputMode="decimal" autoComplete="off" value={set.weight} onChange={(event) => updateSet(exercise.id, set.id, "weight", event.target.value)} className="app-input min-w-0 px-2 text-center text-sm tabular-nums sm:px-3" placeholder="0" aria-label={`${exercise.name}, Satz ${setIndex + 1}, Gewicht in Kilogramm`} />
                        <input type="number" inputMode="numeric" min="1" step="1" value={set.reps} onChange={(event) => updateSet(exercise.id, set.id, "reps", event.target.value)} className="app-input min-w-0 px-2 text-center text-sm tabular-nums sm:px-3" placeholder="8" aria-label={`${exercise.name}, Satz ${setIndex + 1}, Wiederholungen`} />
                        <button type="button" onClick={() => setExercises((current) => current.map((item) => item.id === exercise.id ? { ...item, sets: item.sets.filter((entry) => entry.id !== set.id) } : item))} className="grid h-10 w-10 place-items-center rounded-xl text-white/35 transition hover:bg-white/[0.06] hover:text-white" aria-label={`Satz ${setIndex + 1} entfernen`}>×</button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <button type="button" onClick={() => addSet(exercise.id)} className="secondary-button px-3.5 py-2 text-xs">+ Satz hinzufügen</button>
                    <button type="button" onClick={() => addSet(exercise.id, true)} className="rounded-xl px-3 py-2 text-xs font-medium text-white/48 transition hover:bg-white/[0.05] hover:text-white/80">Letzten Satz duplizieren</button>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="glass-panel mt-4 rounded-[22px] p-5 sm:p-6" aria-label="Pausentimer">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Zwischen den Sätzen</p>
                <h2 className="mt-1 text-lg font-semibold">Pausentimer</h2>
              </div>
              <div className="flex items-center gap-2">
                {[60, 90, 120].map((seconds) => <button key={seconds} type="button" onClick={() => { setRestDuration(seconds); setRestRemaining(seconds); }} className={`min-h-10 rounded-xl border px-3 text-xs font-medium transition ${restDuration === seconds ? "border-white/25 bg-white/[0.09] text-white" : "border-white/[0.08] bg-white/[0.025] text-white/50 hover:text-white"}`}>{seconds / 60}:00</button>)}
                {restRemaining > 0 && <span role="timer" aria-live="polite" className="ml-1 min-w-16 font-mono text-xl font-semibold tabular-nums">{formatTime(restRemaining)}</span>}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setRestRemaining(restDuration)} className="primary-button px-4 py-2.5 text-xs">Pause starten</button>
              {restRemaining > 0 && <button type="button" onClick={() => setRestRemaining(0)} className="secondary-button px-4 py-2.5 text-xs">Timer stoppen</button>}
            </div>
          </section>

          {message && <p role="status" aria-live="polite" className="glass-soft mt-4 rounded-xl px-4 py-3 text-sm leading-5 text-white/72">{message}</p>}

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => void saveWorkout(false)} disabled={saving} className="secondary-button px-5 py-3 text-sm">{saving ? "Speichert …" : "Zwischenspeichern"}</button>
            <button type="button" onClick={() => void saveWorkout(true)} disabled={saving} className="primary-button px-5 py-3 text-sm">{saving ? "Speichert …" : "Training beenden"}</button>
          </div>
          <p className="mt-3 pb-5 text-center text-[11px] leading-5 text-white/35">Dein Training wird beim Beenden in deinem Konto gespeichert. Der Entwurf auf diesem Gerät bleibt bei einem Fehler erhalten.</p>
        </div>
      </main>
    </AppShell>
  );
}
