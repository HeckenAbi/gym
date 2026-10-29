
"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../src/lib/supabase";

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
  return d.toISOString().slice(0, 10);
}

function getLastWeeks(count: number, now: Date) {
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
                className="w-full rounded-t-lg bg-lime-400 transition-all duration-500"
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

        <path d={area} fill="rgba(163,230,53,0.10)" />
        <path
          d={path}
          fill="none"
          stroke="#a3e635"
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
            fill="#a3e635"
            stroke="#090b10"
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
  const [now, setNow] = useState("2020-01-06T00:00:00.000Z");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedExercise, setSelectedExercise] = useState("");

  useEffect(() => {
    setNow(new Date().toISOString());
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
      const { data: profileData } = await supabase.rpc("get_my_profile");
      if (active) setDisplayName(profileData?.[0]?.display_name ?? "");

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
        setError("Trainings konnten nicht geladen werden: " + queryError.message);
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
    const weeks = getLastWeeks(8, new Date(now));
    const weekCounts = new Map(weeks.map((week) => [week.key, 0]));
    const weekVolume = new Map(weeks.map((week) => [week.key, 0]));

    const exercises = new Set<string>();
    let totalVolume = 0;
    let totalSets = 0;
    let bestWeight = 0;
    let bestExercise = "Noch keine Daten";

    for (const workout of workouts) {
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
      weekCounts: weeks.map((week) => weekCounts.get(week.key) ?? 0),
      weekVolume: weeks.map((week) => weekVolume.get(week.key) ?? 0),
      totalVolume,
      totalSets,
      bestWeight,
      bestExercise,
      exerciseNames: Array.from(exercises).sort((a, b) => a.localeCompare(b)),
    };
  }, [workouts, now]);

  const strengthProgress = useMemo(() => {
    if (!selectedExercise) return [];

    return workouts
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

  const recentWorkout = workouts.find((workout) => workout.finished_at) ?? null;
  const daysSinceWorkout = recentWorkout ? Math.max(0, Math.floor((new Date(now).getTime() - new Date(recentWorkout.started_at).getTime()) / 86400000)) : null;
  const currentWeekWorkouts = stats.weekCounts.at(-1) ?? 0;
  const weeklyTarget = 3;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#090b10] p-8 text-white">
        Dashboard wird geladen ...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090b10] px-4 py-6 text-white sm:px-6 md:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-xl font-black tracking-tight"
          >
            GYM<span className="text-lime-400">BATTLE</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-400 sm:block">{displayName || email}</span>
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
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-lime-400">
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
            className="rounded-xl bg-lime-400 px-6 py-3 font-bold text-black transition hover:bg-lime-300"
          >
            + Training starten
          </button>
        </section>

        {error && (
          <p className="mb-5 break-words rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
            {error}
          </p>
        )}

        {!displayName && (
          <section className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-lime-400/20 bg-lime-400/[0.07] p-5 sm:flex-row sm:items-center">
            <div><p className="font-bold text-lime-200">Mach dein Profil fertig</p><p className="mt-1 text-sm text-gray-400">Setze einen Anzeigenamen, damit deine Crew dich in Feed und Rangliste erkennt.</p></div>
            <button onClick={() => router.push("/profile")} className="shrink-0 rounded-xl bg-lime-400 px-4 py-2 text-sm font-bold text-black">Profil einrichten</button>
          </section>
        )}

        <section className="mb-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-2xl border border-lime-400/25 bg-lime-400/[0.08] p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-widest text-lime-400">Heute sinnvoll</p><h2 className="mt-2 text-2xl font-black">{recentWorkout ? daysSinceWorkout === 0 ? "Du warst heute schon da." : `${daysSinceWorkout} ${daysSinceWorkout === 1 ? "Tag" : "Tage"} seit deinem letzten Training.` : "Dein erstes Training wartet."}</h2><p className="mt-2 text-sm text-gray-300">{recentWorkout ? `Setze mit „${recentWorkout.name}“ den nächsten Schritt.` : "Starte mit einem leeren Training und baue deine Historie auf."}</p><button onClick={() => router.push("/training")} className="mt-5 rounded-xl bg-lime-400 px-4 py-3 text-sm font-bold text-black">Training starten</button></article>
          <article className="rounded-2xl border border-white/10 bg-[#11141c] p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-widest text-lime-400">Wochen-Check-in</p><h2 className="mt-2 text-2xl font-black">{currentWeekWorkouts} von {weeklyTarget} Tagen</h2><p className="mt-2 text-sm text-gray-400">{currentWeekWorkouts >= weeklyTarget ? "Wochenziel geschafft — stark geblieben." : `Noch ${weeklyTarget - currentWeekWorkouts} Training${weeklyTarget - currentWeekWorkouts === 1 ? "" : "en"} bis zu deinem Wochenziel.`}</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-lime-400" style={{ width: `${Math.min(100, (currentWeekWorkouts / weeklyTarget) * 100)}%` }} /></div></article>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-white/10 bg-[#11141c] p-5">
            <p className="text-sm text-gray-400">Trainings gesamt</p>
            <p className="mt-3 text-3xl font-black">{workouts.length}</p>
            <p className="mt-2 text-xs text-gray-500">Gespeicherte Einheiten</p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#11141c] p-5">
            <p className="text-sm text-gray-400">Trainingssätze</p>
            <p className="mt-3 text-3xl font-black">{stats.totalSets}</p>
            <p className="mt-2 text-xs text-gray-500">Über alle gespeicherten Trainings</p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#11141c] p-5">
            <p className="text-sm text-gray-400">Trainingsvolumen</p>
            <p className="mt-3 text-3xl font-black">
              {formatNumber(stats.totalVolume)} <span className="text-base text-gray-400">kg</span>
            </p>
            <p className="mt-2 text-xs text-gray-500">Gewicht × Wiederholungen</p>
          </article>

          <article className="rounded-2xl border border-lime-400/20 bg-lime-400/[0.06] p-5">
            <p className="text-sm text-gray-400">Höchstes Gewicht</p>
            <p className="mt-3 text-3xl font-black text-lime-400">
              {formatNumber(stats.bestWeight)} <span className="text-base">kg</span>
            </p>
            <p className="mt-2 truncate text-xs text-gray-400">{stats.bestExercise}</p>
          </article>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-[#11141c] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Trainingshäufigkeit</h2>
                <p className="mt-1 text-sm text-gray-400">Deine letzten 8 Wochen</p>
              </div>
              <span className="rounded-lg bg-lime-400/10 px-3 py-1 text-xs font-semibold text-lime-400">
                Pro Woche
              </span>
            </div>

            <BarChart
              labels={stats.weeks.map((week) => week.label)}
              values={stats.weekCounts}
            />
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#11141c] p-5 sm:p-6">
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

        <section className="mt-5 rounded-2xl border border-white/10 bg-[#11141c] p-5 sm:p-6">
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
              className="rounded-xl border border-white/10 bg-[#090b10] px-4 py-3 text-sm text-white outline-none focus:border-lime-400"
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
                <span className="text-3xl font-black text-lime-400">
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
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Deine Trainings</h2>
            <span className="text-sm text-gray-400">
              {workouts.length} insgesamt
            </span>
          </div>

          {workouts.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#11141c] p-8 text-center">
              <h3 className="text-lg font-bold">Noch keine Trainings</h3>
              <p className="mt-2 text-gray-400">
                Starte dein erstes Training und speichere deine Sätze.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {workouts.map((workout) => (
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
                  className="cursor-pointer rounded-2xl border border-white/10 bg-[#11141c] p-5 transition hover:border-lime-400/40 focus:outline-none focus:ring-2 focus:ring-lime-400"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold">{workout.name}</h3>
                    <span className="rounded-lg bg-white/5 px-2 py-1 text-xs text-gray-400">
                      {(workout.workout_exercises ?? []).length} Übungen
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-gray-400">
                    {new Date(workout.started_at).toLocaleString("de-DE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>

                  <p className="mt-4 text-sm font-semibold text-lime-400">
                    Training ansehen →
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <button
            onClick={() => router.push("/groups")}
            className="rounded-2xl border border-white/10 bg-[#11141c] p-6 text-left transition hover:border-lime-400/40"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-lime-400">
              Gemeinsam stärker
            </p>
            <h2 className="mt-3 text-xl font-bold">Meine Gruppen</h2>
            <p className="mt-2 text-sm text-gray-400">
              Erstelle eine Crew und trainiere gemeinsam mit Freunden.
            </p>
            <p className="mt-5 text-sm font-semibold text-lime-400">
              Gruppen öffnen →
            </p>
          </button>

          <article className="rounded-2xl border border-white/10 bg-[#11141c] p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-lime-400">
              Dein nächstes Ziel
            </p>
            <h2 className="mt-3 text-xl font-bold">Bleib konstant</h2>
            <p className="mt-2 text-sm text-gray-400">
              Regelmäßige Trainings machen deinen Fortschritt sichtbar.
            </p>
            <button
              onClick={() => router.push("/training")}
              className="mt-5 text-sm font-semibold text-lime-400 hover:text-lime-300"
            >
              Training starten →
            </button>
          </article>
        </section>

        <footer className="py-10 text-center text-xs text-gray-600">
          GYMBATTLE · Dein Training, deine Entwicklung.
        </footer>
      </div>
    </main>
  );
}
