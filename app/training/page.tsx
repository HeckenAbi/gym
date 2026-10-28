"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../src/components/AppShell";
import { supabase } from "../../src/lib/supabase";
import {
  deleteLocalWorkoutDraft,
  getLocalWorkoutDraft,
  getLocalWorkoutDrafts,
  putLocalWorkoutDraft,
  saveLocalWorkoutDraft,
  type LocalWorkoutDraft,
  type WorkoutDraftPayload,
} from "../../src/lib/workout-offline-store";
import { buildWorkoutDraftPayload, flushWorkoutDrafts } from "../../src/lib/workout-sync";

type SetEntry = { id: string; weight: string; reps: string };
type SavedExercise = { id: string; name: string };
type ExerciseEntry = { id: string; exerciseId: string | null; name: string; sets: SetEntry[] };
type PreviousWorkout = { workout_exercises: { exercise_name: string | null; workout_sets: { weight: number | null }[] }[] };
type GroupOption = { id: string; name: string; timezone: string };
type CloudDraft = { client_session_id: string; revision: number; payload: WorkoutDraftPayload; updated_at: string };

type SyncState = "pending" | "syncing" | "synced" | "offline" | "error" | "conflict";
const LEGACY_DRAFT_PREFIX = "gym-battle:workout-draft:";

function parseDecimal(value: string) {
  const trimmed = value.trim().replace(/\s/g, "");
  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
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

function toEditorState(payload: WorkoutDraftPayload) {
  const started = Date.parse(payload.startedAt);
  return {
    workoutName: payload.name || "Mein Training",
    startedAt: Number.isFinite(started) ? started : Date.now(),
    exercises: (payload.exercises ?? []).map((exercise) => ({
      id: crypto.randomUUID(),
      exerciseId: exercise.exerciseId ?? null,
      name: exercise.name ?? "",
      sets: (exercise.sets ?? []).map((set) => ({
        id: crypto.randomUUID(),
        weight: set.weight ?? "",
        reps: set.reps ?? "",
      })),
    })),
  };
}

function syncLabel(status: SyncState, online: boolean) {
  if (!online || status === "offline") return "Offline – lokal gespeichert";
  if (status === "syncing" || status === "pending") return "Wird synchronisiert …";
  if (status === "synced") return "Mit der Cloud synchronisiert";
  if (status === "conflict") return "Konflikt – Auswahl erforderlich";
  return "Nicht synchronisiert – erneuter Versuch möglich";
}

export default function TrainingPage() {
  const router = useRouter();
  const autosaveTimer = useRef<number | null>(null);
  const [userId, setUserId] = useState("");
  const [clientSessionId, setClientSessionId] = useState("");
  const [serverRevision, setServerRevision] = useState(0);
  const [cloudDraft, setCloudDraft] = useState<CloudDraft | null>(null);
  const [conflictDraft, setConflictDraft] = useState<CloudDraft | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncState>("pending");
  const [online, setOnline] = useState(true);
  const [queuedCompletion, setQueuedCompletion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [workoutName, setWorkoutName] = useState("Mein Training");
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [savedExercises, setSavedExercises] = useState<SavedExercise[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [shareGroupId, setShareGroupId] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [previousPerformance, setPreviousPerformance] = useState<Record<string, number>>({});
  const [startedAt, setStartedAt] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [restRemaining, setRestRemaining] = useState(0);
  const [restDuration, setRestDuration] = useState(90);

  const refreshConflict = useCallback(async () => {
    const { data } = await supabase.rpc("get_my_workout_draft");
    const latest = (data?.[0] as CloudDraft | undefined) ?? null;
    setCloudDraft(latest);
    setConflictDraft(latest);
  }, []);

  const refreshLocalSyncState = useCallback(async (id: string, sessionId: string, messageText?: string) => {
    const local = await getLocalWorkoutDraft(id, sessionId);
    if (local) {
      setServerRevision(local.revision);
      setSyncStatus(local.status);
      if (local.status === "conflict") await refreshConflict();
    }
    if (messageText) setMessage(messageText);
  }, [refreshConflict]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;
      if (sessionError || !sessionData.session) {
        router.replace("/");
        return;
      }

      const id = sessionData.session.user.id;
      setUserId(id);
      setOnline(navigator.onLine);
      const [libraryResult, previousResult, groupsResult, cloudResult] = await Promise.all([
        supabase.from("exercises").select("id, name").eq("user_id", id).order("name", { ascending: true }),
        supabase.from("workouts").select("workout_exercises (exercise_name, workout_sets (weight))").eq("user_id", id).not("finished_at", "is", null).order("started_at", { ascending: false }).limit(40),
        supabase.rpc("get_my_groups"),
        supabase.rpc("get_my_workout_draft"),
      ]);
      if (!active) return;

      if (!libraryResult.error) setSavedExercises(libraryResult.data ?? []);
      else setMessage("Deine Übungsbibliothek konnte nicht geladen werden.");
      setGroups(groupsResult.error ? [] : (groupsResult.data ?? []) as GroupOption[]);

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

      let localDrafts: LocalWorkoutDraft[] = [];
      try {
        localDrafts = await getLocalWorkoutDrafts(id);
      } catch {
        setMessage("Der Browser unterstützt den Offline-Speicher nicht. Verwende die App möglichst mit stabiler Verbindung.");
      }
      const local = localDrafts[0] ?? null;
      const cloud = cloudResult.error ? null : ((cloudResult.data?.[0] as CloudDraft | undefined) ?? null);
      if (cloudResult.error) {
        setSyncStatus(navigator.onLine ? "error" : "offline");
        setMessage("Cloud-Autosave ist noch nicht verfügbar. Der lokale Trainingsentwurf bleibt erhalten.");
      }
      if (cloud) setCloudDraft(cloud);

      let selectedPayload: WorkoutDraftPayload | null = null;
      let selectedSessionId = "";
      let selectedRevision = 0;
      let selectedStatus: SyncState = navigator.onLine ? "pending" : "offline";
      let selectedQueuedFinish = false;

      if (local) {
        selectedPayload = local.payload;
        selectedSessionId = local.clientSessionId;
        selectedRevision = local.revision;
        selectedStatus = local.status;
        selectedQueuedFinish = Boolean(local.queuedCompletion);
        if (cloud && (cloud.client_session_id !== local.clientSessionId || cloud.revision > local.revision)) {
          setConflictDraft(cloud);
          selectedStatus = "conflict";
          setMessage("Es gibt eine neuere oder parallele Cloud-Version. Wähle oben ausdrücklich, welche Version du behalten möchtest.");
        } else if (cloud && cloud.client_session_id === local.clientSessionId && cloud.revision === local.revision && local.status === "synced") {
          selectedPayload = cloud.payload;
        }
        if (local.status === "synced" && cloud && cloud.client_session_id === local.clientSessionId && cloud.revision === local.revision) {
          const syncedLocal: LocalWorkoutDraft = { ...local, payload: cloud.payload, lastSyncedAt: cloud.updated_at, status: "synced" };
          try { await putLocalWorkoutDraft(syncedLocal); } catch { /* Keep the in-memory cloud copy usable. */ }
        }
      } else if (cloud) {
        selectedPayload = cloud.payload;
        selectedSessionId = cloud.client_session_id;
        selectedRevision = cloud.revision;
        selectedStatus = "synced";
        try {
          await putLocalWorkoutDraft({
            key: `${id}:${cloud.client_session_id}`,
            userId: id,
            clientSessionId: cloud.client_session_id,
            payload: cloud.payload,
            revision: cloud.revision,
            localVersion: 1,
            status: "synced",
            updatedAt: cloud.updated_at,
            lastSyncedAt: cloud.updated_at,
          });
        } catch {
          setMessage("Cloud-Training geladen; der Browser kann keine zusätzliche Offline-Kopie anlegen.");
        }
        setMessage("Dein Cloud-Trainingsentwurf wurde wiederhergestellt.");
      } else {
        const legacyKey = `${LEGACY_DRAFT_PREFIX}${id}`;
        const storedDraft = window.localStorage.getItem(legacyKey);
        if (storedDraft) {
          try {
            const legacy = JSON.parse(storedDraft) as { workoutName?: string; exercises?: ExerciseEntry[]; startedAt?: number };
            const legacyStartedAt = Number(legacy.startedAt) || Date.now();
            selectedPayload = {
              name: legacy.workoutName || "Mein Training",
              startedAt: new Date(legacyStartedAt).toISOString(),
              exercises: (legacy.exercises ?? []).map((exercise) => ({
                exerciseId: exercise.exerciseId ?? null,
                name: exercise.name,
                sets: exercise.sets.map((set) => ({ weight: set.weight, reps: set.reps })),
              })),
            };
            selectedSessionId = crypto.randomUUID();
            selectedStatus = navigator.onLine ? "pending" : "offline";
            const migrated = await saveLocalWorkoutDraft(id, selectedSessionId, selectedPayload, 0);
            selectedStatus = migrated.status;
            window.localStorage.removeItem(legacyKey);
            setMessage("Dein bisheriger Browserentwurf wurde in den Offline-Speicher übernommen.");
          } catch {
            setMessage("Ein alter Entwurf konnte nicht vollständig übernommen werden; starte bitte eine neue Einheit.");
          }
        }
      }

      if (!selectedPayload) {
        selectedSessionId = crypto.randomUUID();
        selectedPayload = { name: "Mein Training", startedAt: new Date().toISOString(), exercises: [] };
      }
      const restored = toEditorState(selectedPayload);
      setClientSessionId(selectedSessionId);
      setServerRevision(selectedRevision);
      setSyncStatus(selectedStatus);
      setQueuedCompletion(selectedQueuedFinish);
      setWorkoutName(restored.workoutName);
      setExercises(restored.exercises);
      setStartedAt(restored.startedAt);
      setLoading(false);
      setHydrated(true);
    }

    void initialize();
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (!hydrated || !userId || !clientSessionId || queuedCompletion) return;
    if (autosaveTimer.current !== null) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(async () => {
      const payload = buildWorkoutDraftPayload({ name: workoutName, startedAt, exercises });
      try {
        const local = await saveLocalWorkoutDraft(userId, clientSessionId, payload, serverRevision);
        if (local.status === "conflict") {
          setSyncStatus("conflict");
          await refreshConflict();
          return;
        }
        if (!navigator.onLine) {
          setSyncStatus("offline");
          return;
        }
        setSyncStatus("syncing");
        const result = await flushWorkoutDrafts(userId);
        if (result.status === "completed") {
          router.replace("/dashboard");
          return;
        }
        await refreshLocalSyncState(userId, clientSessionId, result.message);
      } catch {
        setSyncStatus(navigator.onLine ? "error" : "offline");
        setMessage("Der lokale Entwurf konnte nicht geschrieben werden. Lass diese Seite geöffnet und prüfe den Speicherplatz des Browsers.");
      }
    }, 500);
    return () => {
      if (autosaveTimer.current !== null) window.clearTimeout(autosaveTimer.current);
    };
  }, [hydrated, userId, clientSessionId, workoutName, exercises, startedAt, serverRevision, queuedCompletion, refreshConflict, refreshLocalSyncState, router]);

  useEffect(() => {
    const handleOnline = async () => {
      setOnline(true);
      if (!userId) return;
      setSyncStatus("syncing");
      const result = await flushWorkoutDrafts(userId);
      if (result.status === "completed") {
        router.replace("/dashboard");
        return;
      }
      if (clientSessionId) await refreshLocalSyncState(userId, clientSessionId, result.message);
    };
    const handleOffline = () => {
      setOnline(false);
      setSyncStatus((current) => current === "synced" ? "offline" : current);
      setMessage("Keine Verbindung. Deine Eingaben bleiben lokal gespeichert und werden später synchronisiert.");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [userId, clientSessionId, refreshLocalSyncState, router]);

  useEffect(() => {
    if (!hydrated || !queuedCompletion || !userId || !online) return;
    let active = true;
    void flushWorkoutDrafts(userId).then(async (result) => {
      if (!active) return;
      if (result.status === "completed") {
        router.replace("/dashboard");
        return;
      }
      if (clientSessionId) await refreshLocalSyncState(userId, clientSessionId, result.message);
    });
    return () => { active = false; };
  }, [hydrated, queuedCompletion, userId, online, clientSessionId, refreshLocalSyncState, router]);

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
    if (!name || adding || queuedCompletion) return;
    if (!userId) {
      router.replace("/");
      return;
    }
    setAdding(true);
    setMessage("");
    const existing = savedExercises.find((exercise) => exercise.name.toLocaleLowerCase("de-DE") === name.toLocaleLowerCase("de-DE"));
    let exerciseId: string | null = existing?.id ?? null;
    if (!existing && navigator.onLine) {
      const { data: created, error: createError } = await supabase.from("exercises").insert({ user_id: userId, name }).select("id, name").single();
      if (!createError && created) {
        exerciseId = created.id;
        setSavedExercises((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      } else if (createError?.code === "23505") {
        const { data: duplicate } = await supabase.from("exercises").select("id, name").eq("user_id", userId).ilike("name", name).limit(1).maybeSingle();
        if (duplicate) {
          exerciseId = duplicate.id;
          setSavedExercises((current) => current.some((item) => item.id === duplicate.id) ? current : [...current, duplicate].sort((a, b) => a.name.localeCompare(b.name)));
        }
      }
    }
    setExercises((current) => [...current, makeExercise(name, exerciseId)]);
    setExerciseName("");
    if (!exerciseId) setMessage("Übung lokal hinzugefügt. Name und Sätze werden mit dem Training synchronisiert.");
    setAdding(false);
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
      sets: [...exercise.sets, { id: crypto.randomUUID(), weight: exercise.sets.at(-1)?.weight ?? "", reps: duplicate ? exercise.sets.at(-1)?.reps ?? "" : "" }],
    } : exercise));
  }

  function updateSet(exerciseId: string, setId: string, field: "weight" | "reps", value: string) {
    setExercises((current) => current.map((exercise) => exercise.id === exerciseId ? {
      ...exercise,
      sets: exercise.sets.map((set) => set.id === setId ? { ...set, [field]: value } : set),
    } : exercise));
  }

  function validateCompletedWorkout() {
    if (exercises.length === 0) return "Füge zuerst mindestens eine Übung hinzu.";
    for (const exercise of exercises) {
      if (!exercise.name.trim() || exercise.sets.length === 0) return "Jede Übung braucht mindestens einen Satz.";
      for (const set of exercise.sets) {
        const weight = parseDecimal(set.weight);
        const reps = Number(set.reps);
        if (!set.weight.trim() || !set.reps.trim() || !Number.isFinite(weight) || !Number.isInteger(reps) || weight < 0 || reps < 1) {
          return "Bitte trage pro Satz ein gültiges Gewicht (mindestens 0 kg) und mindestens eine Wiederholung ein.";
        }
      }
    }
    return "";
  }

  async function refreshConflictAfterError() {
    const { data } = await supabase.rpc("get_my_workout_draft");
    const latest = (data?.[0] as CloudDraft | undefined) ?? null;
    if (latest) {
      setCloudDraft(latest);
      setConflictDraft(latest);
      setSyncStatus("conflict");
    }
  }

  async function saveWorkout(finish: boolean) {
    if (saving || queuedCompletion) return;
    if (autosaveTimer.current !== null) window.clearTimeout(autosaveTimer.current);
    if (finish) {
      const validationError = validateCompletedWorkout();
      if (validationError) {
        setMessage(validationError);
        return;
      }
    }

    setSaving(true);
    setMessage("");
    const payload = buildWorkoutDraftPayload({ name: workoutName, startedAt, exercises });
    try {
      const local = await saveLocalWorkoutDraft(userId, clientSessionId, payload, serverRevision);
      if (!navigator.onLine) {
        if (finish) {
          await putLocalWorkoutDraft({ ...local, status: "offline", queuedCompletion: true, shareGroupId: shareGroupId || null });
          setQueuedCompletion(true);
          setSyncStatus("offline");
          setMessage(shareGroupId ? "Abschluss und Gruppenfreigabe vorgemerkt. Sobald die Verbindung zurück ist, wird die Einheit sicher synchronisiert." : "Abschluss vorgemerkt. Sobald die Verbindung zurück ist, wird die Einheit sicher synchronisiert.");
        } else {
          await putLocalWorkoutDraft({ ...local, status: "offline" });
          setSyncStatus("offline");
          setMessage("Lokal gespeichert. Die Synchronisierung startet, sobald du wieder online bist.");
        }
        return;
      }

      if (!finish) {
        setSyncStatus("syncing");
        const result = await flushWorkoutDrafts(userId);
        if (result.status === "completed") {
          router.replace("/dashboard");
          return;
        }
        await refreshLocalSyncState(userId, clientSessionId, result.message || (result.status === "synced" ? "Trainingsentwurf in der Cloud gespeichert." : undefined));
        return;
      }

      setSyncStatus("syncing");
      const flushResult = await flushWorkoutDrafts(userId);
      if (flushResult.status === "conflict") {
        await refreshConflict();
        setMessage(flushResult.message || "Vor dem Abschluss muss ein Synchronisierungskonflikt geklärt werden.");
        return;
      }
      if (flushResult.status === "error" || flushResult.status === "offline") {
        setSyncStatus(flushResult.status);
        setMessage(flushResult.message || "Der Entwurf konnte nicht synchronisiert werden. Der lokale Stand bleibt erhalten.");
        return;
      }
      const latestLocal = await getLocalWorkoutDraft(userId, clientSessionId);
      const expectedRevision = latestLocal?.revision ?? serverRevision;
      const { data: workoutId, error: completeError } = await supabase.rpc("complete_workout_session", {
        p_client_session_id: clientSessionId,
        p_expected_revision: expectedRevision,
        p_payload: payload,
        p_group_id: shareGroupId || null,
      });
      if (completeError || !workoutId) {
        if (completeError?.code === "40001") {
          await refreshConflictAfterError();
          setMessage("Eine neuere Version liegt in der Cloud. Wähle zuerst, welche Fassung behalten werden soll.");
        } else {
          setSyncStatus("error");
          setMessage("Abschluss fehlgeschlagen. Dein lokaler Entwurf bleibt erhalten; du kannst es erneut versuchen.");
        }
        return;
      }
      await deleteLocalWorkoutDraft(userId, clientSessionId);
      window.localStorage.removeItem(`${LEGACY_DRAFT_PREFIX}${userId}`);
      router.push("/dashboard");
    } catch {
      setSyncStatus(navigator.onLine ? "error" : "offline");
      setMessage("Speichern fehlgeschlagen. Dein lokaler Entwurf bleibt erhalten; prüfe die Verbindung und versuche es erneut.");
    } finally {
      setSaving(false);
    }
  }

  async function retrySync() {
    if (!userId || saving) return;
    setSyncStatus("syncing");
    const result = await flushWorkoutDrafts(userId);
    if (result.status === "completed") {
      router.replace("/dashboard");
      return;
    }
    if (clientSessionId) await refreshLocalSyncState(userId, clientSessionId, result.message);
  }

  async function leaveToDashboard() {
    if (saving) return;
    if ((exercises.length || queuedCompletion) && !window.confirm("Dein Trainingsentwurf bleibt erhalten. Möchtest du zur Übersicht wechseln?")) return;
    if (autosaveTimer.current !== null) window.clearTimeout(autosaveTimer.current);
    if (!queuedCompletion) {
      try {
        await saveLocalWorkoutDraft(userId, clientSessionId, buildWorkoutDraftPayload({ name: workoutName, startedAt, exercises }), serverRevision);
      } catch {
        setMessage("Der lokale Entwurf konnte nicht gesichert werden. Bleibe auf dieser Seite und prüfe den Browserspeicher.");
        return;
      }
    }
    router.push("/dashboard");
  }

  async function chooseCloudVersion() {
    if (!userId || !cloudDraft) return;
    const confirmed = window.confirm("Die Cloud-Version ersetzt den lokalen Entwurf auf diesem Gerät. Möchtest du fortfahren?");
    if (!confirmed) return;
    try {
      if (clientSessionId) await deleteLocalWorkoutDraft(userId, clientSessionId);
      await putLocalWorkoutDraft({
        key: `${userId}:${cloudDraft.client_session_id}`,
        userId,
        clientSessionId: cloudDraft.client_session_id,
        payload: cloudDraft.payload,
        revision: cloudDraft.revision,
        localVersion: 1,
        status: "synced",
        updatedAt: cloudDraft.updated_at,
        lastSyncedAt: cloudDraft.updated_at,
      });
      const restored = toEditorState(cloudDraft.payload);
      setClientSessionId(cloudDraft.client_session_id);
      setServerRevision(cloudDraft.revision);
      setSyncStatus("synced");
      setQueuedCompletion(false);
      setShareGroupId("");
      setWorkoutName(restored.workoutName);
      setExercises(restored.exercises);
      setStartedAt(restored.startedAt);
      setConflictDraft(null);
      setMessage("Cloud-Version wiederhergestellt.");
    } catch {
      setMessage("Die Cloud-Version konnte nicht lokal wiederhergestellt werden.");
    }
  }

  async function chooseLocalVersion() {
    if (!userId || !clientSessionId) return;
    const confirmed = window.confirm(cloudDraft
      ? "Deine lokale Fassung ersetzt die Cloud-Version dieses Trainings. Das kann die Änderungen eines anderen Geräts überschreiben. Möchtest du fortfahren?"
      : "Es gibt keinen verfügbaren Cloud-Draft mehr. Soll deine lokale Fassung als neuer Cloud-Entwurf gespeichert werden?");
    if (!confirmed) return;
    const payload = buildWorkoutDraftPayload({ name: workoutName, startedAt, exercises });
    if (!cloudDraft) {
      const replacementSessionId = crypto.randomUUID();
      const { data, error: createError } = await supabase.rpc("save_workout_draft", {
        p_client_session_id: replacementSessionId,
        p_expected_revision: 0,
        p_payload: payload,
      });
      const revision = Number(data);
      if (createError || !Number.isInteger(revision) || revision < 1) {
        if (createError?.code === "40001") await refreshConflict();
        setMessage("Der lokale Entwurf konnte nicht als neuer Cloud-Stand gespeichert werden. Prüfe die Verbindung und versuche es erneut.");
        return;
      }
      const now = new Date().toISOString();
      const previous = await getLocalWorkoutDraft(userId, clientSessionId);
      if (previous) await deleteLocalWorkoutDraft(userId, clientSessionId);
      await putLocalWorkoutDraft({
        key: `${userId}:${replacementSessionId}`,
        userId,
        clientSessionId: replacementSessionId,
        payload,
        revision,
        localVersion: (previous?.localVersion ?? 0) + 1,
        status: queuedCompletion ? "pending" : "synced",
        updatedAt: now,
        lastSyncedAt: now,
        queuedCompletion,
        shareGroupId: previous?.shareGroupId ?? null,
      });
      setClientSessionId(replacementSessionId);
      setServerRevision(revision);
      setCloudDraft({ client_session_id: replacementSessionId, revision, payload, updated_at: now });
      setConflictDraft(null);
      setSyncStatus(queuedCompletion ? "pending" : "synced");
      setMessage("Lokale Version als neuer Cloud-Entwurf gespeichert.");
      return;
    }
    const { data, error: replaceError } = await supabase.rpc("replace_my_workout_draft", {
      p_expected_session_id: cloudDraft.client_session_id,
      p_expected_revision: cloudDraft.revision,
      p_client_session_id: clientSessionId,
      p_payload: payload,
    });
    if (replaceError || !Number.isInteger(Number(data))) {
      setMessage("Die Cloud-Version hat sich erneut geändert. Lade den Konflikt neu und entscheide erneut.");
      await refreshConflict();
      return;
    }
    const revision = Number(data);
    const existing = await getLocalWorkoutDraft(userId, clientSessionId);
    if (existing) {
      await putLocalWorkoutDraft({ ...existing, payload, revision, status: queuedCompletion ? "pending" : "synced", localVersion: existing.localVersion + 1, updatedAt: new Date().toISOString(), lastSyncedAt: new Date().toISOString() });
    }
    setServerRevision(revision);
    setConflictDraft(null);
    setCloudDraft({ ...cloudDraft, client_session_id: clientSessionId, revision, payload, updated_at: new Date().toISOString() });
    setSyncStatus(queuedCompletion ? "pending" : "synced");
    setMessage("Lokale Version übernommen und als neuer Cloud-Stand gespeichert.");
    if (queuedCompletion) await retrySync();
  }

  async function cancelQueuedCompletion() {
    if (!userId || !clientSessionId) return;
    const confirmed = window.confirm("Den vorgemerkten Abschluss abbrechen und das Training als laufenden Entwurf behalten?");
    if (!confirmed) return;
    const current = await getLocalWorkoutDraft(userId, clientSessionId);
    if (current) await putLocalWorkoutDraft({ ...current, queuedCompletion: false, shareGroupId: null, status: "pending" });
    setQueuedCompletion(false);
    setShareGroupId("");
    setSyncStatus("pending");
    setMessage("Abschluss zurückgestellt. Das Training bleibt als Entwurf gespeichert.");
  }

  if (loading) {
    return <AppShell><main className="min-h-screen p-8 text-white" aria-live="polite">Training wird vorbereitet …</main></AppShell>;
  }

  return (
    <AppShell>
      <main className="min-h-screen px-4 py-6 text-white sm:px-6 md:px-10">
        <div className="mx-auto max-w-5xl">
          <header className="mb-7 flex items-center justify-between gap-3 border-b border-white/[0.08] pb-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Trainingslog</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Deine Einheit</h1>
            </div>
            <button type="button" disabled={saving} onClick={() => void leaveToDashboard()} className="secondary-button px-4 py-2.5 text-sm disabled:opacity-45">Zur Übersicht</button>
          </header>

          <section className="glass-soft mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3" aria-live="polite">
            <div className="flex items-center gap-2.5 text-xs">
              <span className={`h-2 w-2 rounded-full ${syncStatus === "synced" && online ? "bg-emerald-300" : syncStatus === "error" || syncStatus === "conflict" ? "bg-amber-200" : "bg-white/45"}`} />
              <span className="text-white/72">{syncLabel(syncStatus, online)}</span>
            </div>
            {(syncStatus === "error" || syncStatus === "offline") && online && <button type="button" onClick={() => void retrySync()} className="text-xs font-semibold text-white/70 underline underline-offset-4">Erneut synchronisieren</button>}
          </section>

          {syncStatus === "conflict" && (conflictDraft !== null || cloudDraft === null) && <section className="glass-panel mb-4 rounded-[22px] border-amber-100/20 p-4 sm:p-5" role="alert">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100/65">Versionskonflikt</p>
            <h2 className="mt-2 text-lg font-semibold">{cloudDraft ? "Es gibt lokale und neuere Cloud-Änderungen." : "Der Cloud-Entwurf ist nicht mehr verfügbar."}</h2>
            <p className="mt-2 text-xs leading-5 text-white/52">Nichts wird automatisch überschrieben. Wähle ausdrücklich, welche Fassung du behalten möchtest. {cloudDraft ? "Die lokale Version ersetzt die Cloud-Fassung nach erneuter Prüfung; die Cloud-Version ersetzt nur den lokalen Stand dieses Geräts." : "Du kannst die lokale Fassung als neuen Cloud-Entwurf speichern."}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" disabled={!online || saving} onClick={() => void chooseLocalVersion()} className="primary-button px-4 py-2.5 text-xs">Lokale Version behalten</button>
              {cloudDraft && <button type="button" disabled={saving} onClick={() => void chooseCloudVersion()} className="secondary-button px-4 py-2.5 text-xs">Cloud-Version verwenden</button>}
            </div>
          </section>}

          {queuedCompletion && <section className="glass-soft mb-4 rounded-2xl border-white/15 px-4 py-3 text-sm text-white/72">
            Abschluss ist vorgemerkt und wird bei Verbindung automatisch abgeschlossen.
            <button type="button" onClick={() => void cancelQueuedCompletion()} className="ml-3 text-xs underline underline-offset-4">Abschluss zurückstellen</button>
          </section>}

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <article className="glass-soft rounded-2xl p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Trainingszeit</p><p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{formatTime(elapsedSeconds)}</p></article>
            <article className="glass-soft rounded-2xl p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Übungen</p><p className="mt-2 text-2xl font-semibold tabular-nums">{exercises.length}</p></article>
            <article className="glass-soft col-span-2 rounded-2xl p-4 sm:col-span-1"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Sätze</p><p className="mt-2 text-2xl font-semibold tabular-nums">{setCount}</p></article>
          </section>

          <section className="glass-panel mt-4 rounded-[22px] p-5 sm:p-6">
            <label className="block text-xs font-medium text-white/60" htmlFor="workout-name">Name der Einheit</label>
            <input id="workout-name" disabled={queuedCompletion} value={workoutName} onChange={(event) => setWorkoutName(event.target.value)} className="app-input mt-2 w-full px-4 text-sm sm:text-base disabled:opacity-55" placeholder="z. B. Oberkörper A" />
            <p className="mt-2 text-[11px] text-white/38">Änderungen landen zuerst auf diesem Gerät und werden danach mit der Cloud synchronisiert.</p>
          </section>

          <section className="glass-panel mt-4 rounded-[22px] p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Übungsbibliothek</p><h2 className="mt-1 text-lg font-semibold">Was steht heute an?</h2></div>
              <span className="rounded-full border border-white/[0.09] bg-white/[0.035] px-3 py-1.5 text-[10px] text-white/48">{savedExercises.length} gespeichert</span>
            </div>
            {savedExercises.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
              <div className="flex min-w-0 gap-2">
                <input disabled={queuedCompletion} value={exerciseSearch} onChange={(event) => setExerciseSearch(event.target.value)} className="app-input min-w-0 flex-1 px-3 text-sm disabled:opacity-55" placeholder="Übung suchen" aria-label="Gespeicherte Übung suchen" />
                <select disabled={queuedCompletion} value={selectedExerciseId} onChange={(event) => setSelectedExerciseId(event.target.value)} className="app-input min-w-0 flex-1 px-3 text-sm disabled:opacity-55" aria-label="Gespeicherte Übung auswählen"><option value="">Auswählen</option>{filteredSavedExercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select>
              </div>
              <button type="button" onClick={addSavedExercise} disabled={queuedCompletion || !selectedExerciseId} className="secondary-button px-4 py-2.5 text-sm disabled:opacity-45">Übung hinzufügen</button>
            </div>}
            <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void addExercise(); }}>
              <input disabled={queuedCompletion} value={exerciseName} onChange={(event) => setExerciseName(event.target.value)} className="app-input min-w-0 flex-1 px-3 text-sm disabled:opacity-55" placeholder="Neue Übung, z. B. Kniebeugen" aria-label="Neue Übung" />
              <button type="submit" disabled={queuedCompletion || adding || !exerciseName.trim()} className="secondary-button px-4 py-2.5 text-sm disabled:opacity-45">{adding ? "Wird hinzugefügt …" : "Neue Übung anlegen"}</button>
            </form>
          </section>

          <section className="mt-4 space-y-3" aria-label="Übungen in diesem Training">
            {exercises.length === 0 ? <div className="glass-soft rounded-[22px] px-6 py-10 text-center"><p className="text-sm font-medium text-white/78">Dein Training beginnt mit der ersten Übung.</p><p className="mt-2 text-xs leading-5 text-white/42">Füge sie aus deiner Bibliothek hinzu oder lege sie oben neu an.</p></div> : exercises.map((exercise, exerciseIndex) => {
              const previous = previousPerformance[exercise.name.trim().toLocaleLowerCase("de-DE")];
              return <article key={exercise.id} className="glass-panel rounded-[22px] p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.055] text-xs font-semibold text-white/58">{String(exerciseIndex + 1).padStart(2, "0")}</span><div className="min-w-0"><h3 className="break-words text-base font-semibold sm:text-lg">{exercise.name}</h3>{previous !== undefined ? <p className="mt-1 text-[11px] text-white/48">Letztes Mal: <span className="font-medium text-white/75">bis {new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(previous)} kg</span></p> : <p className="mt-1 text-[11px] text-white/35">Noch kein gespeicherter Vergleich</p>}</div></div>
                  <button type="button" disabled={queuedCompletion} onClick={() => setExercises((current) => current.filter((item) => item.id !== exercise.id))} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white/40 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-35" aria-label={`${exercise.name} entfernen`}>×</button>
                </div>
                <div className="mt-5 grid grid-cols-[38px_minmax(0,1fr)_minmax(0,1fr)_40px] items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/37 sm:grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)_44px]"><span>Satz</span><span>Gewicht · kg</span><span>Wdh.</span><span /></div>
                <div className="mt-2 space-y-2">{exercise.sets.map((set, setIndex) => <div key={set.id} className="grid grid-cols-[38px_minmax(0,1fr)_minmax(0,1fr)_40px] items-center gap-2 rounded-xl border border-white/[0.055] bg-black/15 p-1.5 sm:grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)_44px] sm:p-2">
                  <span className="text-center text-xs font-medium tabular-nums text-white/52">{String(setIndex + 1).padStart(2, "0")}</span>
                  <input disabled={queuedCompletion} type="text" inputMode="decimal" autoComplete="off" value={set.weight} onChange={(event) => updateSet(exercise.id, set.id, "weight", event.target.value)} className="app-input min-w-0 px-2 text-center text-sm tabular-nums sm:px-3 disabled:opacity-55" placeholder="0" aria-label={`${exercise.name}, Satz ${setIndex + 1}, Gewicht in Kilogramm`} />
                  <input disabled={queuedCompletion} type="number" inputMode="numeric" min="1" step="1" value={set.reps} onChange={(event) => updateSet(exercise.id, set.id, "reps", event.target.value)} className="app-input min-w-0 px-2 text-center text-sm tabular-nums sm:px-3 disabled:opacity-55" placeholder="8" aria-label={`${exercise.name}, Satz ${setIndex + 1}, Wiederholungen`} />
                  <button type="button" disabled={queuedCompletion} onClick={() => setExercises((current) => current.map((item) => item.id === exercise.id ? { ...item, sets: item.sets.filter((entry) => entry.id !== set.id) } : item))} className="grid h-10 w-10 place-items-center rounded-xl text-white/35 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-35" aria-label={`Satz ${setIndex + 1} entfernen`}>×</button>
                </div>)}</div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><button type="button" disabled={queuedCompletion} onClick={() => addSet(exercise.id)} className="secondary-button px-3.5 py-2 text-xs disabled:opacity-45">+ Satz hinzufügen</button><button type="button" disabled={queuedCompletion} onClick={() => addSet(exercise.id, true)} className="rounded-xl px-3 py-2 text-xs font-medium text-white/48 transition hover:bg-white/[0.05] hover:text-white/80 disabled:opacity-35">Letzten Satz duplizieren</button></div>
              </article>;
            })}
          </section>

          <section className="glass-panel mt-4 rounded-[22px] p-5 sm:p-6" aria-label="Pausentimer">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Zwischen den Sätzen</p><h2 className="mt-1 text-lg font-semibold">Pausentimer</h2></div><div className="flex items-center gap-2">{[60, 90, 120].map((seconds) => <button key={seconds} type="button" onClick={() => { setRestDuration(seconds); setRestRemaining(seconds); }} className={`min-h-10 rounded-xl border px-3 text-xs font-medium transition ${restDuration === seconds ? "border-white/25 bg-white/[0.09] text-white" : "border-white/[0.08] bg-white/[0.025] text-white/50 hover:text-white"}`}>{seconds / 60}:00</button>)}{restRemaining > 0 && <span role="timer" aria-live="polite" className="ml-1 min-w-16 font-mono text-xl font-semibold tabular-nums">{formatTime(restRemaining)}</span>}</div></div>
            <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setRestRemaining(restDuration)} className="primary-button px-4 py-2.5 text-xs">Pause starten</button>{restRemaining > 0 && <button type="button" onClick={() => setRestRemaining(0)} className="secondary-button px-4 py-2.5 text-xs">Timer stoppen</button>}</div>
          </section>

          <section className="glass-panel mt-4 rounded-[22px] p-5 sm:p-6" aria-labelledby="sharing-title">
            <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-white/40">Freigabe beim Abschluss</p>
            <h2 id="sharing-title" className="mt-1 text-lg font-semibold">Privat oder mit einer Gruppe teilen?</h2>
            <label className="mt-3 block text-xs font-medium text-white/62" htmlFor="share-group">Trainingsfreigabe
              <select id="share-group" disabled={queuedCompletion} value={shareGroupId} onChange={(event) => setShareGroupId(event.target.value)} className="app-input mt-2 w-full px-3 text-sm disabled:opacity-55"><option value="">Privat lassen</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
            </label>
            <p className="mt-2 text-[11px] leading-5 text-white/38">Standard ist „Privat“. Bei einer Freigabe sehen Mitglieder dieser Gruppe nach dem Abschluss Trainingsname, Übungen, Gewichte, Wiederholungen und Abschlusszeit. Die Auswahl wird zusammen mit dem Workout gespeichert.</p>
          </section>

          {message && <p role="status" aria-live="polite" className="glass-soft mt-4 rounded-xl px-4 py-3 text-sm leading-5 text-white/72">{message}</p>}

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => void saveWorkout(false)} disabled={saving || queuedCompletion} className="secondary-button px-5 py-3 text-sm">{saving ? "Speichert …" : "Entwurf speichern"}</button>
            <button type="button" onClick={() => void saveWorkout(true)} disabled={saving || queuedCompletion || syncStatus === "conflict"} className="primary-button px-5 py-3 text-sm">{saving ? "Speichert …" : online ? "Training beenden" : "Abschluss vormerken"}</button>
          </div>
          <p className="mt-3 pb-5 text-center text-[11px] leading-5 text-white/35">Dein Entwurf liegt lokal und wird revisionssicher synchronisiert. Ein Konflikt auf mehreren Geräten wird niemals still überschrieben.</p>
        </div>
      </main>
    </AppShell>
  );
}
