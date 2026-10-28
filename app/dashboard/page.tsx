
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../src/lib/supabase";
import { AppShell } from "../../src/components/AppShell";

type SetData = {
  weight: number | null;
  reps: number | null;
};

type ExerciseData = {
  exercise_name: string | null;
  workout_sets: SetData[];
};

type Workout = {
  id: string;
  name: string;
  started_at: string;
  finished_at: string | null;
  workout_exercises: ExerciseData[];
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1,
  }).format(value);
}

function getWeekKey(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLastWeeks(count: number, referenceDate: Date) {
  const now = new Date(referenceDate);
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(monday);
    date.setDate(date.getDate() - (count - 1 - index) * 7);

    return {
      key: getWeekKey(date),
      label: date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
      }),
    };
  });
}

function BarChart({
  labels,
  values,
}: {
  labels: string[];
  values: number[];
}) {
  const max = Math.max(...values, 1);

  return (
    <div className="mt-6">
      <div className="flex h-44 items-end gap-2 sm:gap-4">
        {values.map((value, index) => (
          <div
            key={labels[index]}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
          >
            <span className="text-xs text-gray-400">{value || ""}</span>
            <div className="flex h-full w-full items-end">
              <div
                className="w-full rounded-t-lg bg-[#d1d2d6] transition-all duration-500"
                style={{
                  height: `${Math.max((value / max) * 100, value ? 5 : 0)}%`,
                  minHeight: value ? "5px" : "0",
                }}
              />
            </div>
            <span className="text-[10px] text-gray-500 sm:text-xs">
              {labels[index]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart({
  labels,
  values,
}: {
  labels: string[];
  values: number[];
}) {
  const width = 600;
  const height = 210;
  const padX = 24;
  const padY = 25;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = values.map((value, index) => ({
    x: padX + (index / Math.max(values.length - 1, 1)) * (width - padX * 2),
    y:
      height -
      padY -
      ((value - min) / range) * (height - padY * 2),
  }));

  const path = points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");

  const area = `${path} L ${points[points.length - 1]?.x ?? width} ${height - padY} L ${points[0]?.x ?? 0} ${height - padY} Z`;

  return (
    <div className="mt-5">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible"
        role="img"
        aria-label="Trainingsvolumen pro Woche"
      >
        {[0, 1, 2, 3].map((line) => {
          const y = padY + (line / 3) * (height - padY * 2);
          return (
            <line
              key={line}
              x1={padX}
              y1={y}
              x2={width - padX}
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="4 5"
            />
          );
        })}

        <path d={area} fill="rgba(255,255,255,0.08)" />
        <path
          d={path}
          fill="none"
          stroke="#d1d2d6"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#d1d2d6"
            stroke="#090a0c"
            strokeWidth="2"
          />
        ))}
      </svg>

      <div className="mt-2 flex justify-between gap-1 text-[10px] text-gray-500 sm:text-xs">
        {labels.map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [referenceDate, setReferenceDate] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [selectedExercise, setSelectedExercise] = useState("");
  const [workoutQuery, setWorkoutQuery] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setReferenceDate(new Date()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (!active) return;

      if (sessionError || !sessionData.session) {
        router.replace("/");
        return;
      }

      setEmail(sessionData.session.user.email ?? "");

      const { data, error: queryError } = await supabase
        .from("workouts")
        .select(`
          id,
          name,
          started_at,
          finished_at,
          workout_exercises (
            exercise_name,
            workout_sets (
              weight,
              reps
            )
          )
        `)
        .order("started_at", { ascending: false });

      if (!active) return;

      if (queryError) {
        setError("Deine Trainings konnten gerade nicht geladen werden. Bitte versuche es erneut.");
      } else {
        setWorkouts((data ?? []) as unknown as Workout[]);
      }

      setLoading(false);
    }

    loadDashboard();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;

        if (!session) {
          router.replace("/");
        } else {
          setEmail(session.user.email ?? "");
        }
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  const stats = useMemo(() => {
    const completedWorkouts = workouts.filter((workout) => workout.finished_at);
    const weeks = referenceDate ? getLastWeeks(8, referenceDate) : [];
    const weekCounts = new Map(weeks.map((week) => [week.key, 0]));
    const weekVolume = new Map(weeks.map((week) => [week.key, 0]));

    const exercises = new Set<string>();
    let totalVolume = 0;
    let totalSets = 0;
    let bestWeight = 0;
    let bestExercise = "Noch keine Daten";

    for (const workout of completedWorkouts) {
      const weekKey = getWeekKey(new Date(workout.started_at));

      if (weekCounts.has(weekKey)) {
        weekCounts.set(weekKey, (weekCounts.get(weekKey) ?? 0) + 1);
      }

      for (const exercise of workout.workout_exercises ?? []) {
        const name = exercise.exercise_name?.trim();
        if (name) exercises.add(name);

        for (const set of exercise.workout_sets ?? []) {
          const weight = Number(set.weight) || 0;
          const reps = Number(set.reps) || 0;
          const volume = weight * reps;

          totalVolume += volume;
          totalSets += 1;

          if (weekVolume.has(weekKey)) {
            weekVolume.set(
              weekKey,
              (weekVolume.get(weekKey) ?? 0) + volume
            );
          }

          if (weight > bestWeight) {
            bestWeight = weight;
            bestExercise = name || "Unbekannte Übung";
          }
        }
      }
    }

    return {
      weeks,
      completedCount: completedWorkouts.length,
      weekCounts: weeks.map((week) => weekCounts.get(week.key) ?? 0),
      weekVolume: weeks.map((week) => weekVolume.get(week.key) ?? 0),
      totalVolume,
      totalSets,
      bestWeight,
      bestExercise,
      exerciseNames: Array.from(exercises).sort((a, b) => a.localeCompare(b)),
    };
  }, [workouts, referenceDate]);

  const visibleWorkouts = useMemo(() => {
    const query = workoutQuery.trim().toLocaleLowerCase("de-DE");
    if (!query) return workouts;
    return workouts.filter((workout) =>
      workout.name.toLocaleLowerCase("de-DE").includes(query) ||
      new Date(workout.started_at).toLocaleDateString("de-DE").includes(query)
    );
  }, [workouts, workoutQuery]);

  const strengthProgress = useMemo(() => {
    if (!selectedExercise) return [];

    return workouts
      .filter((workout) => workout.finished_at)
      .filter((workout) =>
        workout.workout_exercises?.some(
          (exercise) => exercise.exercise_name === selectedExercise
        )
      )
      .slice()
      .reverse()
      .map((workout) => {
        let best = 0;

        for (const exercise of workout.workout_exercises ?? []) {
          if (exercise.exercise_name !== selectedExercise) continue;

          for (const set of exercise.workout_sets ?? []) {
            best = Math.max(best, Number(set.weight) || 0);
          }
        }

        return {
          label: new Date(workout.started_at).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
          }),
          weight: best,
        };
      })
      .filter((point) => point.weight > 0)
      .slice(-8);
  }, [workouts, selectedExercise]);

  if (loading) {
    return (
      <AppShell>
        <main className="min-h-screen bg-[#090a0c] p-8 text-white" aria-live="polite">
          <div className="mx-auto max-w-7xl animate-pulse space-y-4">
            <div className="h-8 w-56 rounded-lg bg-white/[0.08]" />
            <div className="h-24 rounded-2xl bg-white/[0.04]" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-32 rounded-2xl bg-white/[0.04]" />)}</div>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
    <main className="min-h-screen bg-[#090a0c] px-4 py-6 text-white sm:px-6 md:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Dein Trainingsraum</p>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-400 sm:block">{email}</span>
            <button
              onClick={logout}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/5"
            >
              Abmelden
            </button>
          </div>
        </header>

        <section className="flex flex-col justify-between gap-6 py-10 md:flex-row md:items-end md:py-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/50">
              Dein persönlicher Bereich
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
              Fortschritt beginnt hier.
            </h1>
            <p className="mt-3 max-w-xl text-gray-400">
              Verfolge deine Leistung, analysiere deine Trainings und bleib
              am Ball.
            </p>
          </div>

          <button
            onClick={() => router.push("/training")}
            className="primary-button px-6 py-3"
          >
            + Training starten
          </button>
        </section>

        {error && (
          <p role="alert" className="mb-5 break-words rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
            {error}
          </p>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="glass-panel rounded-2xl p-5">
            <p className="text-sm text-gray-400">Trainings gesamt</p>
            <p className="mt-3 text-3xl font-black">{stats.completedCount}</p>
            <p className="mt-2 text-xs text-gray-500">Abgeschlossene Einheiten</p>
          </article>

          <article className="glass-panel rounded-2xl p-5">
            <p className="text-sm text-gray-400">Trainingssätze</p>
            <p className="mt-3 text-3xl font-black">{stats.totalSets}</p>
            <p className="mt-2 text-xs text-gray-500">Über alle gespeicherten Trainings</p>
          </article>

          <article className="glass-panel rounded-2xl p-5">
            <p className="text-sm text-gray-400">Trainingsvolumen</p>
            <p className="mt-3 text-3xl font-black">
              {formatNumber(stats.totalVolume)} <span className="text-base text-gray-400">kg</span>
            </p>
            <p className="mt-2 text-xs text-gray-500">Gewicht × Wiederholungen</p>
          </article>

          <article className="glass-panel rounded-2xl p-5">
            <p className="text-sm text-gray-400">Höchstes Gewicht</p>
            <p className="mt-3 text-3xl font-black text-white">
              {formatNumber(stats.bestWeight)} <span className="text-base">kg</span>
            </p>
            <p className="mt-2 truncate text-xs text-gray-400">{stats.bestExercise}</p>
          </article>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <article className="glass-panel rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Trainingshäufigkeit</h2>
                <p className="mt-1 text-sm text-gray-400">Deine letzten 8 Wochen</p>
              </div>
              <span className="rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">
                Pro Woche
              </span>
            </div>

            <BarChart
              labels={stats.weeks.map((week) => week.label)}
              values={stats.weekCounts}
            />
          </article>

          <article className="glass-panel rounded-2xl p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-bold">Trainingsvolumen</h2>
              <p className="mt-1 text-sm text-gray-400">
                Bewegtes Gesamtgewicht pro Woche
              </p>
            </div>

            <div className="mt-6">
              <p className="text-2xl font-black">
                {formatNumber(stats.totalVolume)}{" "}
                <span className="text-sm font-medium text-gray-400">kg insgesamt</span>
              </p>
              <LineChart
                labels={stats.weeks.map((week) => week.label)}
                values={stats.weekVolume}
              />
            </div>
          </article>
        </section>

        <section className="glass-panel mt-5 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold">Kraftentwicklung</h2>
              <p className="mt-1 text-sm text-gray-400">
                Vergleiche dein höchstes Arbeitsgewicht pro Training.
              </p>
            </div>

            <select
              value={selectedExercise}
              onChange={(event) => setSelectedExercise(event.target.value)}
              className="rounded-xl border border-white/10 bg-[#090a0c] px-4 py-3 text-sm text-white outline-none focus:border-white/70"
            >
              <option value="">Übung auswählen</option>
              {stats.exerciseNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {!selectedExercise ? (
            <p className="mt-8 rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-gray-500">
              Wähle eine Übung aus, um deine Kraftentwicklung zu sehen.
            </p>
          ) : strengthProgress.length === 0 ? (
            <p className="mt-8 text-sm text-gray-500">
              Für diese Übung sind noch keine Gewichte gespeichert.
            </p>
          ) : (
            <>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white/75">
                  {formatNumber(strengthProgress[strengthProgress.length - 1].weight)} kg
                </span>
                <span className="text-sm text-gray-400">letzter erfasster Wert</span>
              </div>
              <LineChart
                labels={strengthProgress.map((point) => point.label)}
                values={strengthProgress.map((point) => point.weight)}
              />
            </>
          )}
        </section>

        <section className="mt-8">
          <div id="verlauf" className="mb-5 flex flex-col gap-3 scroll-mt-8 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold">Deine Trainings</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">{workouts.length} insgesamt</span>
              <input type="search" value={workoutQuery} onChange={(event) => setWorkoutQuery(event.target.value)} placeholder="Verlauf suchen" aria-label="Trainingsverlauf durchsuchen" className="app-input min-h-10 w-full px-3 text-sm sm:w-48" />
            </div>
          </div>

          {workouts.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center">
              <h3 className="text-lg font-bold">Noch keine Trainings</h3>
              <p className="mt-2 text-gray-400">
                Starte dein erstes Training und speichere deine Sätze.
              </p>
            </div>
          ) : visibleWorkouts.length === 0 ? (
            <div className="glass-panel rounded-2xl p-7 text-center text-sm text-white/55">Keine Trainings für „{workoutQuery}“ gefunden.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {visibleWorkouts.map((workout) => (
                <article
                  key={workout.id}
                  onClick={() => router.push(`/training/${workout.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/training/${workout.id}`);
                    }
                  }}
                  role="link"
                  tabIndex={0}
                  className="glass-panel cursor-pointer rounded-2xl p-5 transition hover:border-white/25 focus:outline-none focus:ring-2 focus:ring-white/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold">{workout.name}</h3>
                    <span className="rounded-lg bg-white/5 px-2 py-1 text-xs text-gray-400">
                      {workout.finished_at ? "Abgeschlossen" : "Entwurf"}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-gray-400">
                    {new Date(workout.started_at).toLocaleString("de-DE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>

                  <p className="mt-4 text-sm font-semibold text-white/75">
                    Training ansehen →
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="konto" className="mt-8 grid scroll-mt-8 gap-4 md:grid-cols-2">
          <article className="glass-panel rounded-2xl p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-white/45">Konto</p>
            <h2 className="mt-3 text-xl font-bold">Privat trainieren.</h2>
            <p className="mt-2 break-all text-sm text-gray-400">Angemeldet als {email || "dein Konto"}</p>
            <button onClick={logout} className="secondary-button mt-5 px-4 py-2 text-sm">Abmelden</button>
          </article>

          <article className="glass-soft rounded-2xl p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-white/45">Dein Fokus</p>
            <h2 className="mt-3 text-xl font-bold">Konstanz schlägt Zufall.</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">Jede gespeicherte Einheit macht deinen Verlauf aussagekräftiger. Deine Daten bleiben deinem Konto zugeordnet.</p>
            <button onClick={() => router.push("/training")} className="mt-5 text-sm font-semibold text-white/75 hover:text-white">Training starten →</button>
          </article>
        </section>

        <footer className="py-10 text-center text-xs text-gray-600">
          GYMBATTLE · Dein Training, deine Entwicklung.
        </footer>
      </div>
    </main>
    </AppShell>
  );
}
