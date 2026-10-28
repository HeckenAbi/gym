
"use client";

import { useEffect, useState } from "react";
import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../src/lib/supabase";
import { AppShell } from "../../../src/components/AppShell";

type Workout = {
  id: string;
  name: string;
  started_at: string;
  finished_at: string | null;
};

type SetEntry = {
  id: string;
  set_number: number;
  weight: string;
  reps: string;
  persisted: boolean;
};

type ExerciseEntry = {
  id: string;
  exercise_name: string;
  position: number;
  persisted: boolean;
  sets: SetEntry[];
};

function WorkoutDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const workoutId = params.id as string;

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [workoutName, setWorkoutName] = useState("");
  const [originalSetIds, setOriginalSetIds] = useState<string[]>([]);
  const [newExerciseName, setNewExerciseName] = useState("");

  useEffect(() => {
    let active = true;

    async function loadWorkout() {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (!active) return;

      if (sessionError || !sessionData.session) {
        router.replace("/");
        return;
      }

      const { data: workoutData, error: workoutError } = await supabase
        .from("workouts")
        .select("id, name, started_at, finished_at")
        .eq("id", workoutId)
        .single();

      if (!active) return;

      if (workoutError || !workoutData) {
        setError("Training konnte nicht gefunden werden.");
        setLoading(false);
        return;
      }

      const { data: exerciseData, error: exerciseError } = await supabase
        .from("workout_exercises")
        .select("id, exercise_name, position")
        .eq("workout_id", workoutId)
        .order("position", { ascending: true });

      if (!active) return;

      if (exerciseError) {
        setError("Übungen konnten nicht geladen werden.");
        setLoading(false);
        return;
      }

      const exerciseList = exerciseData ?? [];
      const exerciseIds = exerciseList.map((exercise) => exercise.id);

      let loadedSets: {
        id: string;
        set_number: number;
        weight: number;
        reps: number;
        workout_exercise_id: string;
      }[] = [];

      if (exerciseIds.length > 0) {
        const { data: setData, error: setQueryError } = await supabase
          .from("workout_sets")
          .select("id, set_number, weight, reps, workout_exercise_id")
          .in("workout_exercise_id", exerciseIds)
          .order("set_number", { ascending: true });

        if (!active) return;

        if (setQueryError) {
          setError("Sätze konnten nicht geladen werden: " + setQueryError.message);
          setLoading(false);
          return;
        }

        loadedSets = setData ?? [];
      }

      const mappedExercises: ExerciseEntry[] = exerciseList.map((exercise) => ({
        id: exercise.id,
        exercise_name: exercise.exercise_name,
        position: exercise.position,
        persisted: true,
        sets: loadedSets
          .filter((set) => set.workout_exercise_id === exercise.id)
          .map((set) => ({
            id: set.id,
            set_number: set.set_number,
            weight: String(set.weight),
            reps: String(set.reps),
            persisted: true,
          })),
      }));

      setWorkout(workoutData as Workout);
      setWorkoutName(workoutData.name);
      setExercises(mappedExercises);
      setOriginalSetIds(loadedSets.map((set) => set.id));
      setLoading(false);
    }

    loadWorkout();

    return () => {
      active = false;
    };
  }, [router, workoutId]);

  function addExercise() {
    const name = newExerciseName.trim();

    if (!name) return;

    setExercises((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        exercise_name: name,
        position: current.length,
        persisted: false,
        sets: [
          {
            id: crypto.randomUUID(),
            set_number: 1,
            weight: "",
            reps: "",
            persisted: false,
          },
        ],
      },
    ]);

    setNewExerciseName("");
    setMessage("");
  }

  function addSet(exerciseId: string) {
    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: [
                ...exercise.sets,
                {
                  id: crypto.randomUUID(),
                  set_number: exercise.sets.length + 1,
                  weight: exercise.sets.at(-1)?.weight ?? "",
                  reps: "",
                  persisted: false,
                },
              ],
            }
          : exercise
      )
    );
  }

  function updateSet(
    exerciseId: string,
    setId: string,
    field: "weight" | "reps",
    value: string
  ) {
    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.id === setId ? { ...set, [field]: value } : set
              ),
            }
          : exercise
      )
    );
  }

  function removeSet(exerciseId: string, setId: string) {
    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets
                .filter((set) => set.id !== setId)
                .map((set, index) => ({
                  ...set,
                  set_number: index + 1,
                })),
            }
          : exercise
      )
    );
  }

  function removeExercise(exerciseId: string) {
    setExercises((current) =>
      current
        .filter((exercise) => exercise.id !== exerciseId)
        .map((exercise, index) => ({
          ...exercise,
          position: index,
        }))
    );
  }

  async function saveChanges() {
    if (saving) return;

    if (!workoutName.trim()) {
      setMessage("Bitte gib einen Trainingsnamen ein.");
      return;
    }

    if (exercises.length === 0) {
      setMessage("Das Training braucht mindestens eine Übung.");
      return;
    }

    for (const exercise of exercises) {
      if (!exercise.exercise_name.trim() || exercise.sets.length === 0) {
        setMessage("Jede Übung braucht mindestens einen Satz.");
        return;
      }

      for (const set of exercise.sets) {
        if (
          set.weight.trim() === "" ||
          set.reps.trim() === "" ||
          !Number.isFinite(Number(set.weight)) ||
          !Number.isInteger(Number(set.reps)) ||
          Number(set.weight) < 0 ||
          Number(set.reps) < 0
        ) {
          setMessage(
            "Bitte trage für jeden Satz gültiges Gewicht und Wiederholungen ein."
          );
          return;
        }
      }
    }

    setSaving(true);
    setMessage("");

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        router.replace("/");
        return;
      }

      const { error: workoutError } = await supabase
        .from("workouts")
        .update({ name: workoutName.trim() })
        .eq("id", workoutId);

      if (workoutError) throw workoutError;

      const keptExerciseIds = exercises
        .filter((exercise) => exercise.persisted)
        .map((exercise) => exercise.id);

      // Entfernte Übungen löschen; zugehörige Sätze werden per FK kaskadiert.
      const removedExercises = await supabase
        .from("workout_exercises")
        .select("id")
        .eq("workout_id", workoutId);

      if (removedExercises.error) throw removedExercises.error;

      const idsToDelete = (removedExercises.data ?? [])
        .map((item) => item.id)
        .filter((id) => !keptExerciseIds.includes(id));

      if (idsToDelete.length > 0) {
        const { error } = await supabase
          .from("workout_exercises")
          .delete()
          .in("id", idsToDelete);

        if (error) throw error;
      }

      const currentPersistedSetIds = exercises
        .flatMap((exercise) => exercise.sets)
        .filter((set) => set.persisted)
        .map((set) => set.id);

      const removedSetIds = originalSetIds.filter(
        (id) => !currentPersistedSetIds.includes(id)
      );

      if (removedSetIds.length > 0) {
        const { error } = await supabase
          .from("workout_sets")
          .delete()
          .in("id", removedSetIds);

        if (error) throw error;
      }

      const updatedExercises: ExerciseEntry[] = [];

      for (let i = 0; i < exercises.length; i++) {
        const exercise = exercises[i];
        let databaseExerciseId = exercise.id;

        if (exercise.persisted) {
          const { error } = await supabase
            .from("workout_exercises")
            .update({
              exercise_name: exercise.exercise_name.trim(),
              position: i,
            })
            .eq("id", exercise.id);

          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from("workout_exercises")
            .insert({
              workout_id: workoutId,
              exercise_name: exercise.exercise_name.trim(),
              position: i,
            })
            .select("id")
            .single();

          if (error) throw error;
          databaseExerciseId = data.id;
        }

        const updatedSets: SetEntry[] = [];

        for (let j = 0; j < exercise.sets.length; j++) {
          const set = exercise.sets[j];
          const setData = {
            set_number: j + 1,
            weight: Number(set.weight),
            reps: Number(set.reps),
          };

          if (set.persisted) {
            const { error } = await supabase
              .from("workout_sets")
              .update(setData)
              .eq("id", set.id);

            if (error) throw error;

            updatedSets.push({
              ...set,
              ...setData,
              weight: String(setData.weight),
              reps: String(setData.reps),
              persisted: true,
            });
          } else {
            const { data, error } = await supabase
              .from("workout_sets")
              .insert({
                workout_exercise_id: databaseExerciseId,
                ...setData,
              })
              .select("id")
              .single();

            if (error) throw error;

            updatedSets.push({
              ...set,
              id: data.id,
              ...setData,
              weight: String(setData.weight),
              reps: String(setData.reps),
              persisted: true,
            });
          }
        }

        updatedExercises.push({
          ...exercise,
          id: databaseExerciseId,
          position: i,
          persisted: true,
          sets: updatedSets,
        });
      }

      setExercises(updatedExercises);
      setOriginalSetIds(
        updatedExercises.flatMap((exercise) =>
          exercise.sets.map((set) => set.id)
        )
      );
      setWorkout((current) =>
        current ? { ...current, name: workoutName.trim() } : current
      );
      setEditing(false);
      setMessage("Änderungen gespeichert.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Speichern fehlgeschlagen: ${error.message}`
          : "Speichern fehlgeschlagen."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteWorkout() {
    if (deleting) return;

    const confirmed = window.confirm(
      "Möchtest du dieses Training wirklich endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden."
    );

    if (!confirmed) return;

    setDeleting(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("workouts")
        .delete()
        .eq("id", workoutId);

      if (error) throw error;

      router.replace("/dashboard");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Löschen fehlgeschlagen: ${error.message}`
          : "Training konnte nicht gelöscht werden."
      );
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <AppShell><main className="min-h-screen bg-[#090a0c] p-8 text-white" aria-live="polite">Trainingsdetails werden geladen …</main></AppShell>
    );
  }

  if (error || !workout) {
    return (
      <AppShell><main className="min-h-screen bg-[#090a0c] p-8 text-white">
        <p className="text-red-300">{error || "Training nicht gefunden."}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-5 rounded-xl border border-white/15 px-4 py-2"
        >
          Zurück zum Dashboard
        </button>
      </main></AppShell>
    );
  }

  return (
    <AppShell>
    <main className="min-h-screen bg-[#090a0c] px-4 py-6 text-white sm:px-6 md:px-10">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Trainingsdetails</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-gray-300"
          >
            Zurück
          </button>
        </header>

        <section className="py-8 sm:py-10">
          <p className="text-sm font-bold uppercase tracking-widest text-white/45">
            Trainingsdetails
          </p>

          {editing ? (
            <label className="mt-3 block text-sm text-gray-300">
              Trainingsname
              <input
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/70"
              />
            </label>
          ) : (
            <h1 className="mt-3 text-4xl font-black">{workout.name}</h1>
          )}

          <p className="mt-3 text-gray-400">
            Gestartet: {new Date(workout.started_at).toLocaleString("de-DE")}
          </p>

          <p className="mt-2 text-sm">
            {workout.finished_at ? (
              <span className="text-white/75">Abgeschlossen</span>
            ) : (
              <span className="text-yellow-300">
                Gespeichert, nicht abgeschlossen
              </span>
            )}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {!editing ? (
              <button
                onClick={() => {
                  setWorkoutName(workout.name);
                  setMessage("");
                  setEditing(true);
                }}
                className="rounded-xl bg-[#d1d2d6] px-5 py-3 font-bold text-black"
              >
                Training bearbeiten
              </button>
            ) : (
              <>
                <button
                  onClick={() => void saveChanges()}
                  disabled={saving}
                  className="rounded-xl bg-[#d1d2d6] px-5 py-3 font-bold text-black disabled:opacity-50"
                >
                  {saving ? "Speichert ..." : "Änderungen speichern"}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    router.refresh();
                  }}
                  disabled={saving}
                  className="rounded-xl border border-white/15 px-5 py-3 font-bold disabled:opacity-50"
                >
                  Abbrechen
                </button>
              </>
            )}

            <button
              onClick={() => void deleteWorkout()}
              disabled={deleting || saving}
              className="rounded-xl border border-red-400/40 px-5 py-3 font-bold text-red-300 disabled:opacity-50"
            >
              {deleting ? "Löscht ..." : "Training löschen"}
            </button>
          </div>
        </section>

        {editing && (
          <form
            className="mb-6 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addExercise();
            }}
          >
            <input
              value={newExerciseName}
              onChange={(e) => setNewExerciseName(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-white/70"
              placeholder="Neue Übung hinzufügen"
            />
            <button
              type="submit"
              className="rounded-xl border border-white/30 px-4 py-3 font-bold text-white/75"
            >
              + Übung
            </button>
          </form>
        )}

        <section className="space-y-3">
          {exercises.length === 0 ? (
            <p className="rounded-xl border border-white/10 p-5 text-gray-400">
              Für dieses Training wurden keine Übungen gespeichert.
            </p>
          ) : (
            exercises.map((exercise, index) => (
              <article
                key={exercise.id}
                className="glass-panel rounded-2xl p-4 sm:p-5"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  {editing ? (
                    <input
                      value={exercise.exercise_name}
                      onChange={(e) =>
                        setExercises((current) =>
                          current.map((item) =>
                            item.id === exercise.id
                              ? { ...item, exercise_name: e.target.value }
                              : item
                          )
                        )
                      }
                      className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-bold"
                    />
                  ) : (
                    <h2 className="text-xl font-bold">
                      {index + 1}. {exercise.exercise_name}
                    </h2>
                  )}

                  {editing && (
                    <button
                      onClick={() => removeExercise(exercise.id)}
                      className="text-sm text-red-300"
                      type="button"
                    >
                      Entfernen
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-[40px_1fr_1fr_32px] gap-2 border-b border-white/10 pb-3 text-xs text-gray-400">
                  <span>Satz</span>
                  <span>Gewicht (kg)</span>
                  <span>Wdh.</span>
                  <span />
                </div>

                {exercise.sets.map((set, setIndex) => (
                  <div
                    key={set.id}
                    className="grid grid-cols-[40px_1fr_1fr_32px] items-center gap-2 border-b border-white/5 py-3 last:border-0"
                  >
                    <span className="text-gray-400">{setIndex + 1}</span>

                    {editing ? (
                      <input
                        type="number"
                        min="0"
                        step="0.25"
                        value={set.weight}
                        onChange={(e) =>
                          updateSet(
                            exercise.id,
                            set.id,
                            "weight",
                            e.target.value
                          )
                        }
                        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-3"
                        placeholder="kg"
                      />
                    ) : (
                      <span>{Number(set.weight)} kg</span>
                    )}

                    {editing ? (
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={set.reps}
                        onChange={(e) =>
                          updateSet(
                            exercise.id,
                            set.id,
                            "reps",
                            e.target.value
                          )
                        }
                        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-3"
                        placeholder="Wdh."
                      />
                    ) : (
                      <span>{set.reps}</span>
                    )}

                    {editing && (
                      <button
                        type="button"
                        onClick={() => removeSet(exercise.id, set.id)}
                        className="text-gray-500 hover:text-red-300"
                        aria-label={`Satz ${setIndex + 1} entfernen`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}

                {editing && (
                  <button
                    type="button"
                    onClick={() => addSet(exercise.id)}
                    className="mt-3 text-sm font-semibold text-white/75"
                  >
                    + Satz hinzufügen
                  </button>
                )}
              </article>
            ))
          )}
        </section>

        {message && (
          <p aria-live="polite" className="mt-5 break-words text-sm text-white/75">
            {message}
          </p>
        )}
      </div>
    </main>
    </AppShell>
  );
}

export default function WorkoutDetails() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#090a0c] p-8 text-white">Trainingsdetails werden geladen …</main>}>
      <WorkoutDetailsContent />
    </Suspense>
  );
}
