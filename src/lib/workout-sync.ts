import { supabase } from "./supabase";
import {
  deleteLocalWorkoutDraft,
  getLocalWorkoutDrafts,
  updateLocalWorkoutDraft,
} from "./workout-offline-store";

export type DraftSyncResult = {
  status: "synced" | "offline" | "error" | "conflict" | "completed" | "idle";
  message?: string;
};

const inFlightByUser = new Map<string, Promise<DraftSyncResult>>();

function isRevisionConflict(error: { code?: string; message?: string } | null) {
  return error?.code === "40001" || error?.message?.includes("draft_revision_conflict") === true;
}

async function syncPendingDrafts(userId: string): Promise<DraftSyncResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const drafts = await getLocalWorkoutDrafts(userId);
    for (const draft of drafts) {
      if (draft.status === "pending" || draft.status === "error" || draft.status === "syncing") {
        await updateLocalWorkoutDraft(userId, draft.clientSessionId, (current) => ({
          ...current,
          status: "offline",
          errorMessage: undefined,
        }));
      }
    }
    return { status: "offline", message: "Offline gespeichert; die Synchronisierung wartet auf eine Verbindung." };
  }

  let attempted = false;
  for (let pass = 0; pass < 8; pass += 1) {
    const drafts = await getLocalWorkoutDrafts(userId);
    const next = drafts.find((draft) => draft.status === "pending" || draft.status === "error" || draft.status === "offline" || draft.status === "syncing");
    if (!next) return attempted ? { status: "synced" } : { status: "idle" };
    attempted = true;
    const sentVersion = next.localVersion;

    await updateLocalWorkoutDraft(userId, next.clientSessionId, (current) => ({
      ...current,
      status: "syncing",
      errorMessage: undefined,
    }));

    if (next.queuedCompletion) {
      const { data, error } = await supabase.rpc("complete_workout_session", {
        p_client_session_id: next.clientSessionId,
        p_expected_revision: next.revision,
        p_payload: next.payload,
        p_group_id: next.shareGroupId ?? null,
      });
      if (error) {
        if (isRevisionConflict(error)) {
          await updateLocalWorkoutDraft(userId, next.clientSessionId, (current) => ({
            ...current,
            status: "conflict",
            errorMessage: "Auf einem anderen Gerät wurde eine neuere Trainingsversion gespeichert.",
          }));
          return { status: "conflict", message: "Konflikt: Wähle, ob du die lokale oder die Cloud-Version verwenden möchtest." };
        }
        await updateLocalWorkoutDraft(userId, next.clientSessionId, (current) => ({
          ...current,
          status: "error",
          errorMessage: "Der vorgemerkte Abschluss konnte noch nicht synchronisiert werden.",
        }));
        return { status: "error", message: "Der vorgemerkte Abschluss konnte nicht synchronisiert werden. Der Entwurf bleibt lokal erhalten." };
      }
      if (!data) return { status: "error", message: "Der Server hat den Abschluss nicht bestätigt. Der Entwurf bleibt erhalten." };
      await deleteLocalWorkoutDraft(userId, next.clientSessionId);
      return { status: "completed" };
    }

    const { data, error } = await supabase.rpc("save_workout_draft", {
      p_client_session_id: next.clientSessionId,
      p_expected_revision: next.revision,
      p_payload: next.payload,
    });

    if (error) {
      if (isRevisionConflict(error)) {
        await updateLocalWorkoutDraft(userId, next.clientSessionId, (current) => ({
          ...current,
          status: "conflict",
          errorMessage: "Auf einem anderen Gerät wurde eine neuere Trainingsversion gespeichert.",
        }));
        return { status: "conflict", message: "Konflikt: Wähle, ob du die lokale oder die Cloud-Version verwenden möchtest." };
      }
      await updateLocalWorkoutDraft(userId, next.clientSessionId, (current) => ({
        ...current,
        status: "error",
        errorMessage: "Cloud-Speicherung fehlgeschlagen. Der lokale Entwurf bleibt erhalten.",
      }));
      return { status: "error", message: "Cloud-Speicherung fehlgeschlagen. Der lokale Entwurf bleibt erhalten; ein erneuter Versuch ist möglich." };
    }

    const newRevision = Number(data);
    if (!Number.isInteger(newRevision) || newRevision < 1) {
      await updateLocalWorkoutDraft(userId, next.clientSessionId, (current) => ({
        ...current,
        status: "error",
        errorMessage: "Der Server hat keinen gültigen Speicherstand bestätigt.",
      }));
      return { status: "error", message: "Der Server hat keinen gültigen Speicherstand bestätigt." };
    }

    await updateLocalWorkoutDraft(userId, next.clientSessionId, (current) => {
      const unchanged = current.localVersion === sentVersion;
      return {
        ...current,
        revision: newRevision,
        status: unchanged ? "synced" : "pending",
        lastSyncedAt: new Date().toISOString(),
        errorMessage: undefined,
      };
    });
  }

  return { status: "error", message: "Viele Änderungen stehen noch aus; die Synchronisierung wird erneut versucht." };
}

export function flushWorkoutDrafts(userId: string): Promise<DraftSyncResult> {
  const existing = inFlightByUser.get(userId);
  if (existing) return existing;
  const operation = syncPendingDrafts(userId).finally(() => inFlightByUser.delete(userId));
  inFlightByUser.set(userId, operation);
  return operation;
}

export function buildWorkoutDraftPayload(input: {
  name: string;
  startedAt: number;
  exercises: Array<{
    name: string;
    exerciseId: string | null;
    sets: Array<{ weight: string; reps: string }>;
  }>;
}) {
  return {
    name: input.name.trim().slice(0, 100) || "Mein Training",
    startedAt: new Date(input.startedAt || Date.now()).toISOString(),
    exercises: input.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      name: exercise.name.slice(0, 120),
      sets: exercise.sets.map((set) => ({ weight: set.weight, reps: set.reps })),
    })),
  };
}
