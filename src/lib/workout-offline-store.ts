export type WorkoutSetPayload = {
  weight: string;
  reps: string;
};

export type WorkoutExercisePayload = {
  exerciseId: string | null;
  name: string;
  sets: WorkoutSetPayload[];
};

export type WorkoutDraftPayload = {
  name: string;
  startedAt: string;
  exercises: WorkoutExercisePayload[];
};

export type DraftSyncStatus =
  | "pending"
  | "syncing"
  | "synced"
  | "offline"
  | "error"
  | "conflict";

export type LocalWorkoutDraft = {
  key: string;
  userId: string;
  clientSessionId: string;
  payload: WorkoutDraftPayload;
  revision: number;
  localVersion: number;
  status: DraftSyncStatus;
  updatedAt: string;
  lastSyncedAt: string | null;
  queuedCompletion?: boolean;
  shareGroupId?: string | null;
  errorMessage?: string;
};

const DATABASE_NAME = "gym-battle-offline";
const DATABASE_VERSION = 1;
const DRAFT_STORE = "workout-drafts";

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB-Anfrage fehlgeschlagen."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB-Transaktion abgebrochen."));
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB-Transaktion fehlgeschlagen."));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(new Error("Dieser Browser bietet keinen lokalen Offline-Speicher an."));
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DRAFT_STORE)) {
        const store = database.createObjectStore(DRAFT_STORE, { keyPath: "key" });
        store.createIndex("by-user", "userId", { unique: false });
        store.createIndex("by-session", ["userId", "clientSessionId"], { unique: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Offline-Speicher konnte nicht geöffnet werden."));
    request.onblocked = () => reject(new Error("Offline-Speicher wird in einem anderen Tab aktualisiert. Bitte schließe andere Gym-Battle-Tabs und versuche es erneut."));
  });
}

export async function getLocalWorkoutDrafts(userId: string): Promise<LocalWorkoutDraft[]> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(DRAFT_STORE, "readonly");
    const drafts = await requestResult(transaction.objectStore(DRAFT_STORE).index("by-user").getAll(userId)) as LocalWorkoutDraft[];
    await transactionDone(transaction);
    return drafts.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } finally {
    database.close();
  }
}

export async function getLocalWorkoutDraft(userId: string, clientSessionId: string): Promise<LocalWorkoutDraft | null> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(DRAFT_STORE, "readonly");
    const draft = await requestResult(transaction.objectStore(DRAFT_STORE).get(`${userId}:${clientSessionId}`)) as LocalWorkoutDraft | undefined;
    await transactionDone(transaction);
    return draft ?? null;
  } finally {
    database.close();
  }
}

export async function saveLocalWorkoutDraft(
  userId: string,
  clientSessionId: string,
  payload: WorkoutDraftPayload,
  serverRevision: number,
): Promise<LocalWorkoutDraft> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(DRAFT_STORE, "readwrite");
    const store = transaction.objectStore(DRAFT_STORE);
    const key = `${userId}:${clientSessionId}`;
    const previous = await requestResult(store.get(key)) as LocalWorkoutDraft | undefined;
    const draft: LocalWorkoutDraft = {
      key,
      userId,
      clientSessionId,
      payload,
      revision: serverRevision,
      localVersion: (previous?.localVersion ?? 0) + 1,
      status: previous?.status === "conflict" ? "conflict" : "pending",
      updatedAt: new Date().toISOString(),
      lastSyncedAt: previous?.lastSyncedAt ?? null,
      queuedCompletion: previous?.queuedCompletion ?? false,
      shareGroupId: previous?.shareGroupId ?? null,
      errorMessage: previous?.status === "conflict" ? previous.errorMessage : undefined,
    };
    store.put(draft);
    await transactionDone(transaction);
    return draft;
  } finally {
    database.close();
  }
}

export async function putLocalWorkoutDraft(draft: LocalWorkoutDraft): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(DRAFT_STORE, "readwrite");
    transaction.objectStore(DRAFT_STORE).put(draft);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

export async function updateLocalWorkoutDraft(
  userId: string,
  clientSessionId: string,
  update: (current: LocalWorkoutDraft) => LocalWorkoutDraft,
): Promise<LocalWorkoutDraft | null> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(DRAFT_STORE, "readwrite");
    const store = transaction.objectStore(DRAFT_STORE);
    const key = `${userId}:${clientSessionId}`;
    const current = await requestResult(store.get(key)) as LocalWorkoutDraft | undefined;
    if (!current) {
      await transactionDone(transaction);
      return null;
    }
    const next = update(current);
    store.put(next);
    await transactionDone(transaction);
    return next;
  } finally {
    database.close();
  }
}

export async function deleteLocalWorkoutDraft(userId: string, clientSessionId: string): Promise<void> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(DRAFT_STORE, "readwrite");
    transaction.objectStore(DRAFT_STORE).delete(`${userId}:${clientSessionId}`);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}
