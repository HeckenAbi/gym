
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../src/lib/supabase";

type SetEntry = {
  id: string;
  weight: string;
  reps: string;
};

type SavedExercise = {
  id: string;
  name: string;
};

type ExerciseEntry = {
  id: string;
  exerciseId: string | null;
  name: string;
  sets: SetEntry[];
};

export default function TrainingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [workoutName, setWorkoutName] = useState("Mein Training");
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [savedExercises, setSavedExercises] = useState<SavedExercise[]>([]);
  const [exerciseName, setExerciseName] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [clientSessionId, setClientSessionId] = useState("");
  const [draftRevision, setDraftRevision] = useState(0);
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    async function initialize() {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        router.replace("/");
        return;
      }

      const { data: library, error: libraryError } = await supabase
        .from("exercises")
        .select("id, name")
        .eq("user_id", data.session.user.id)
        .order("name", { ascending: true });

      if (libraryError) {
        setMessage(`Übungsbibliothek konnte nicht geladen werden: ${libraryError.message}`);
      } else {
        setSavedExercises(library ?? []);
      }

      const { data: draftData } = await supabase.rpc("get_my_workout_draft");
      const draft = draftData?.[0] as {
        client_session_id: string;
        revision: number;
        payload: { workoutName?: string; exercises?: ExerciseEntry[] };
      } | undefined;
      if (draft?.payload?.exercises?.length) {
        setClientSessionId(draft.client_session_id);
        setDraftRevision(draft.revision);
        setWorkoutName(draft.payload.workoutName || "Mein Training");
        setExercises(draft.payload.exercises);
        setMessage("Dein gespeicherter Entwurf wurde wiederhergestellt.");
      } else {
        setClientSessionId(crypto.randomUUID());
      }

      setLoading(false);
    }

    initialize();
  }, [router]);

  async function persistDraft() {
    if (loading || saving || !clientSessionId || exercises.length === 0) return;
    setAutosaveStatus("saving");
    const { data, error } = await supabase.rpc("save_workout_draft", {
      p_client_session_id: clientSessionId,
      p_expected_revision: draftRevision,
      p_payload: { workoutName, exercises },
    });
    if (error) setAutosaveStatus("error");
    else {
      setDraftRevision(Number(data ?? draftRevision + 1));
      setAutosaveStatus("saved");
    }
  }

  // persistDraft intentionally captures the latest draft values.
  useEffect(() => {
    if (loading || !clientSessionId || exercises.length === 0) return;
    const timer = window.setTimeout(() => { void persistDraft(); }, 700);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutName, exercises, clientSessionId, loading]);

  function createWorkoutExercise(
    name: string,
    exerciseId: string | null
  ): ExerciseEntry {
    return {
      id: crypto.randomUUID(),
      exerciseId,
      name,
      sets: [
        {
          id: crypto.randomUUID(),
          weight: "",
          reps: "",
        },
      ],
    };
  }

  async function addExercise() {
    const name = exerciseName.trim();

    if (!name || adding) return;

    setAdding(true);
    setMessage("");

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        router.replace("/");
        return;
      }

      const existing = savedExercises.find(
        (exercise) => exercise.name.toLowerCase() === name.toLowerCase()
      );

      let exerciseId: string;

      if (existing) {
        exerciseId = existing.id;
      } else {
        const { data: created, error: createError } = await supabase
          .from("exercises")
          .insert({
            user_id: userData.user.id,
            name,
          })
          .select("id, name")
          .single();

        if (createError) {
          // Falls die Übung bereits in der Datenbank existiert,
          // versuchen wir, sie aus der Bibliothek zu laden.
          if (createError.code === "23505") {
            const { data: duplicate, error: duplicateError } =
              await supabase
                .from("exercises")
                .select("id, name")
                .eq("user_id", userData.user.id)
                .ilike("name", name)
                .limit(1)
                .maybeSingle();

            if (duplicateError || !duplicate) {
              throw createError;
            }

            exerciseId = duplicate.id;

            setSavedExercises((current) =>
              current.some((item) => item.id === duplicate.id)
                ? current
                : [...current, duplicate].sort((a, b) =>
                    a.name.localeCompare(b.name)
                  )
            );
          } else {
            throw createError;
          }
        } else {
          exerciseId = created.id;

          setSavedExercises((current) =>
            [...current, created].sort((a, b) =>
              a.name.localeCompare(b.name)
            )
          );
        }
      }

      setExercises((current) => [
        ...current,
        createWorkoutExercise(name, exerciseId),
      ]);

      setExerciseName("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Übung konnte nicht hinzugefügt werden: ${error.message}`
          : "Übung konnte nicht hinzugefügt werden."
      );
    } finally {
      setAdding(false);
    }
  }

  function addSavedExercise() {
    const selected = savedExercises.find(
      (exercise) => exercise.id === selectedExerciseId
    );

    if (!selected) {
      setMessage("Wähle zuerst eine Übung aus.");
      return;
    }

    setExercises((current) => [
      ...current,
      createWorkoutExercise(selected.name, selected.id),
    ]);

    setSelectedExerciseId("");
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
                  weight: exercise.sets.at(-1)?.weight ?? "",
                  reps: "",
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

  function removeExercise(exerciseId: string) {
    setExercises((current) =>
      current.filter((exercise) => exercise.id !== exerciseId)
    );
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

      const { data: workout, error: workoutError } = await supabase
        .from("workouts")
        .insert({
          user_id: userData.user.id,
          name: workoutName.trim() || "Mein Training",
          finished_at: finish ? new Date().toISOString() : null,
        })
        .select("id")
        .single();

      if (workoutError) throw workoutError;

      for (let i = 0; i < exercises.length; i++) {
        const exercise = exercises[i];

        const { data: workoutExercise, error: exerciseError } =
          await supabase
            .from("workout_exercises")
            .insert({
              workout_id: workout.id,
              exercise_id: exercise.exerciseId,
              exercise_name: exercise.name.trim(),
              position: i,
            })
            .select("id")
            .single();

        if (exerciseError) throw exerciseError;

        const { error: setsError } = await supabase
          .from("workout_sets")
          .insert(
            exercise.sets.map((set, index) => ({
              workout_exercise_id: workoutExercise.id,
              set_number: index + 1,
              weight: Number(set.weight),
              reps: Number(set.reps),
            }))
          );

        if (setsError) throw setsError;
      }

      setMessage(
        finish
          ? "Training gespeichert und abgeschlossen."
          : "Training gespeichert."
      );

      if (finish) {
        await supabase.rpc("discard_my_workout_draft", { p_client_session_id: clientSessionId });
        router.push("/dashboard");
      }
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

  if (loading) {
    return (
      <main className="min-h-screen bg-[#090b10] p-8 text-white">
        Lade Training ...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090b10] p-5 text-white md:p-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between border-b border-white/10 pb-5">
          <div className="text-xl font-black">
            GYM<span className="text-lime-400">BATTLE</span>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-gray-300"
          >
            Zurück
          </button>
        </header>

        <p className="text-sm font-bold uppercase tracking-widest text-lime-400">
          Trainingstagebuch
        </p>

        <h1 className="mt-2 text-4xl font-black">Neues Training</h1>
        <p className="mt-2 text-xs text-gray-500" aria-live="polite">
          {autosaveStatus === "saving" && "Entwurf wird gespeichert ..."}
          {autosaveStatus === "saved" && "Entwurf gespeichert"}
          {autosaveStatus === "error" && "Entwurf konnte nicht gespeichert werden"}
        </p>

        <label className="mt-6 block text-sm text-gray-300">
          Trainingsname
          <input
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none focus:border-lime-400"
            placeholder="z. B. Push Day"
          />
        </label>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-lg font-bold">Übungsbibliothek</h2>
          <p className="mt-1 text-sm text-gray-400">
            Wähle eine gespeicherte Übung oder füge eine neue hinzu.
          </p>

          {savedExercises.length > 0 ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <select
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-[#11141b] px-4 py-3 text-white outline-none focus:border-lime-400"
              >
                <option value="">Gespeicherte Übung auswählen</option>
                {savedExercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={addSavedExercise}
                className="rounded-xl border border-lime-400/50 px-4 py-3 font-bold text-lime-400"
              >
                Hinzufügen
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-400">
              Noch keine gespeicherten Übungen. Füge unten deine erste hinzu.
            </p>
          )}

          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void addExercise();
            }}
          >
            <input
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-lime-400"
              placeholder="Neue Übung, z. B. Bankdrücken"
            />

            <button
              type="submit"
              disabled={adding || !exerciseName.trim()}
              className="rounded-xl bg-lime-400 px-4 py-3 font-bold text-black disabled:opacity-50"
            >
              {adding ? "Speichert ..." : "+ Neue Übung"}
            </button>
          </form>
        </section>

        <div className="mt-6 space-y-4">
          {exercises.map((exercise, exerciseIndex) => (
            <article
              key={exercise.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">
                    {exerciseIndex + 1}. {exercise.name}
                  </h2>
                  {exercise.exerciseId && (
                    <p className="mt-1 text-xs text-lime-400">
                      In Bibliothek gespeichert
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeExercise(exercise.id)}
                  className="text-sm text-red-300"
                >
                  Entfernen
                </button>
              </div>

              <div className="mb-2 grid grid-cols-[40px_1fr_1fr_32px] gap-2 text-xs text-gray-400">
                <span>Satz</span>
                <span>Gewicht (kg)</span>
                <span>Wdh.</span>
                <span />
              </div>

              {exercise.sets.map((set, setIndex) => (
                <div
                  key={set.id}
                  className="mb-2 grid grid-cols-[40px_1fr_1fr_32px] items-center gap-2"
                >
                  <span className="text-sm text-gray-400">
                    {setIndex + 1}
                  </span>

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
                    placeholder="0"
                  />

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
                    placeholder="0"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setExercises((current) =>
                        current.map((item) =>
                          item.id === exercise.id
                            ? {
                                ...item,
                                sets: item.sets.filter(
                                  (entry) => entry.id !== set.id
                                ),
                              }
                            : item
                        )
                      )
                    }
                    className="text-gray-500 hover:text-red-300"
                    aria-label={`Satz ${setIndex + 1} entfernen`}
                  >
                    ×
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => addSet(exercise.id)}
                className="mt-2 text-sm font-semibold text-lime-400"
              >
                + Satz hinzufügen
              </button>
            </article>
          ))}
        </div>

        {message && (
          <p
            aria-live="polite"
            className="mt-5 break-words text-sm text-lime-300"
          >
            {message}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void saveWorkout(false)}
            disabled={saving}
            className="flex-1 rounded-xl border border-white/15 px-5 py-3 font-bold disabled:opacity-50"
          >
            {saving ? "Speichert ..." : "Training speichern"}
          </button>

          <button
            type="button"
            onClick={() => void saveWorkout(true)}
            disabled={saving}
            className="flex-1 rounded-xl bg-lime-400 px-5 py-3 font-bold text-black disabled:opacity-50"
          >
            {saving ? "Speichert ..." : "Training beenden"}
          </button>
        </div>
      </div>
    </main>
  );
}
