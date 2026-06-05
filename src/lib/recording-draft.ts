"use client";

import type { RecordingSource } from "@/components/recording/recording-context";

const DB_NAME = "atlas-recording-drafts";
const DB_VERSION = 2;
const META_STORE = "drafts";
const CHUNK_STORE = "chunks";
const SEGMENT_STORE = "segments";

export interface RecordingDraftMetadata {
  id: string;
  userId: string;
  requestId: string;
  mime: string;
  source: RecordingSource;
  sessionLabel: string;
  seconds: number;
  liveTranscript: string;
  audioPeak: number;
  activeAudioMs: number;
  chunkCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface RecordingDraft {
  metadata: RecordingDraftMetadata;
  chunks: Blob[];
}

export interface RecordingDraftSegment {
  id: string; // `${draftId}:seg:${index}`
  draftId: string;
  index: number;
  blob: Blob;
  mime: string;
  durationSeconds: number;
  uploaded: boolean;
  createdAt: number;
}

interface RecordingDraftChunk {
  id: string;
  draftId: string;
  index: number;
  blob: Blob;
  createdAt: number;
}

export function recordingDraftId(userId: string) {
  return `active:${userId}`;
}

function hasIndexedDb() {
  return typeof indexedDB !== "undefined";
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });
}

async function openDb() {
  if (!hasIndexedDb()) throw new Error("IndexedDB is unavailable.");

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(CHUNK_STORE)) {
        const chunks = db.createObjectStore(CHUNK_STORE, { keyPath: "id" });
        chunks.createIndex("draftId", "draftId", { unique: false });
      }
      if (!db.objectStoreNames.contains(SEGMENT_STORE)) {
        const segs = db.createObjectStore(SEGMENT_STORE, { keyPath: "id" });
        segs.createIndex("draftId", "draftId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function createRecordingDraft(args: {
  userId: string;
  requestId: string;
  mime: string;
  source: RecordingSource;
  sessionLabel: string;
}) {
  const db = await openDb();
  const now = Date.now();
  const metadata: RecordingDraftMetadata = {
    id: recordingDraftId(args.userId),
    userId: args.userId,
    requestId: args.requestId,
    mime: args.mime,
    source: args.source,
    sessionLabel: args.sessionLabel,
    seconds: 0,
    liveTranscript: "",
    audioPeak: 0,
    activeAudioMs: 0,
    chunkCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const readTx = db.transaction(CHUNK_STORE, "readonly");
    const existing = await requestToPromise(
      readTx.objectStore(CHUNK_STORE).index("draftId").getAllKeys(
        IDBKeyRange.only(metadata.id)
      )
    );
    await transactionDone(readTx);

    const writeTx = db.transaction([META_STORE, CHUNK_STORE], "readwrite");
    writeTx.objectStore(META_STORE).put(metadata);
    const chunkStore = writeTx.objectStore(CHUNK_STORE);
    existing.forEach((key) => chunkStore.delete(key));
    await transactionDone(writeTx);
  } finally {
    db.close();
  }
}

export async function appendRecordingDraftChunk(
  userId: string,
  blob: Blob,
  patch: Partial<
    Pick<
      RecordingDraftMetadata,
      | "seconds"
      | "liveTranscript"
      | "audioPeak"
      | "activeAudioMs"
      | "sessionLabel"
      | "source"
      | "mime"
    >
  > = {}
) {
  const db = await openDb();
  const draftId = recordingDraftId(userId);

  try {
    const tx = db.transaction([META_STORE, CHUNK_STORE], "readwrite");
    const metaStore = tx.objectStore(META_STORE);
    const chunkStore = tx.objectStore(CHUNK_STORE);
    const metadata = await requestToPromise(
      metaStore.get(draftId)
    ) as RecordingDraftMetadata | undefined;
    if (!metadata) return;

    const now = Date.now();
    const index = metadata.chunkCount;
    const chunk: RecordingDraftChunk = {
      id: `${draftId}:${index}`,
      draftId,
      index,
      blob,
      createdAt: now,
    };

    chunkStore.put(chunk);
    metaStore.put({
      ...metadata,
      ...patch,
      chunkCount: index + 1,
      updatedAt: now,
    });
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

export async function updateRecordingDraftMetadata(
  userId: string,
  patch: Partial<
    Pick<
      RecordingDraftMetadata,
      | "seconds"
      | "liveTranscript"
      | "audioPeak"
      | "activeAudioMs"
      | "sessionLabel"
      | "source"
      | "mime"
    >
  >
) {
  const db = await openDb();
  const draftId = recordingDraftId(userId);

  try {
    const tx = db.transaction(META_STORE, "readwrite");
    const store = tx.objectStore(META_STORE);
    const metadata = await requestToPromise(
      store.get(draftId)
    ) as RecordingDraftMetadata | undefined;
    if (!metadata) return;
    store.put({ ...metadata, ...patch, updatedAt: Date.now() });
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

export async function getRecordingDraft(userId: string): Promise<RecordingDraft | null> {
  const db = await openDb();
  const draftId = recordingDraftId(userId);

  try {
    const tx = db.transaction([META_STORE, CHUNK_STORE], "readonly");
    const metadata = await requestToPromise(
      tx.objectStore(META_STORE).get(draftId)
    ) as RecordingDraftMetadata | undefined;
    if (!metadata) return null;

    const chunks = await requestToPromise(
      tx.objectStore(CHUNK_STORE).index("draftId").getAll(IDBKeyRange.only(draftId))
    ) as RecordingDraftChunk[];
    await transactionDone(tx);

    return {
      metadata,
      chunks: chunks.sort((a, b) => a.index - b.index).map((chunk) => chunk.blob),
    };
  } finally {
    db.close();
  }
}

export async function putRecordingSegment(
  userId: string,
  segment: Omit<RecordingDraftSegment, "id" | "draftId" | "createdAt">
) {
  const db = await openDb();
  const draftId = recordingDraftId(userId);
  try {
    const tx = db.transaction(SEGMENT_STORE, "readwrite");
    tx.objectStore(SEGMENT_STORE).put({
      ...segment,
      id: `${draftId}:seg:${segment.index}`,
      draftId,
      createdAt: Date.now(),
    } satisfies RecordingDraftSegment);
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

export async function markRecordingSegmentUploaded(userId: string, index: number) {
  const db = await openDb();
  const draftId = recordingDraftId(userId);
  try {
    const tx = db.transaction(SEGMENT_STORE, "readwrite");
    const store = tx.objectStore(SEGMENT_STORE);
    const seg = (await requestToPromise(
      store.get(`${draftId}:seg:${index}`)
    )) as RecordingDraftSegment | undefined;
    if (seg) store.put({ ...seg, uploaded: true });
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

export async function getRecordingSegments(
  userId: string
): Promise<RecordingDraftSegment[]> {
  const db = await openDb();
  const draftId = recordingDraftId(userId);
  try {
    const tx = db.transaction(SEGMENT_STORE, "readonly");
    const segs = (await requestToPromise(
      tx.objectStore(SEGMENT_STORE).index("draftId").getAll(IDBKeyRange.only(draftId))
    )) as RecordingDraftSegment[];
    await transactionDone(tx);
    return segs.sort((a, b) => a.index - b.index);
  } finally {
    db.close();
  }
}

export async function clearRecordingDraft(userId: string) {
  const db = await openDb();
  const draftId = recordingDraftId(userId);

  try {
    const readTx = db.transaction([CHUNK_STORE, SEGMENT_STORE], "readonly");
    const keys = await requestToPromise(
      readTx.objectStore(CHUNK_STORE).index("draftId").getAllKeys(
        IDBKeyRange.only(draftId)
      )
    );
    const segKeys = await requestToPromise(
      readTx.objectStore(SEGMENT_STORE).index("draftId").getAllKeys(
        IDBKeyRange.only(draftId)
      )
    );
    await transactionDone(readTx);

    const writeTx = db.transaction([META_STORE, CHUNK_STORE, SEGMENT_STORE], "readwrite");
    writeTx.objectStore(META_STORE).delete(draftId);
    const chunkStore = writeTx.objectStore(CHUNK_STORE);
    keys.forEach((key) => chunkStore.delete(key));
    const segStore = writeTx.objectStore(SEGMENT_STORE);
    segKeys.forEach((key) => segStore.delete(key));
    await transactionDone(writeTx);
  } finally {
    db.close();
  }
}
