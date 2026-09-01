import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'local-ai-studio';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('vectors')) {
          const vectorStore = db.createObjectStore('vectors', { keyPath: 'id', autoIncrement: true });
          vectorStore.createIndex('collection', 'collection');
          vectorStore.createIndex('createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains('documents')) {
          const docStore = db.createObjectStore('documents', { keyPath: 'id', autoIncrement: true });
          docStore.createIndex('collection', 'collection');
          docStore.createIndex('createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

/* ── Vector Store ── */
export interface VectorRecord {
  id?: number;
  collection: string;
  text: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export async function addVectors(collection: string, records: VectorRecord[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('vectors', 'readwrite');
  for (const record of records) {
    await tx.store.add({ ...record, collection, createdAt: Date.now() });
  }
  await tx.done;
}

export async function getVectors(collection: string): Promise<VectorRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex('vectors', 'collection', collection);
}

export async function deleteVectors(collection: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('vectors', 'readwrite');
  const index = tx.store.index('collection');
  const keys = await index.getAllKeys(collection);
  for (const key of keys) {
    await tx.store.delete(key);
  }
  await tx.done;
}

export async function getAllCollections(): Promise<string[]> {
  const db = await getDB();
  const all = await db.getAll('vectors');
  const collections = new Set<string>();
  for (const record of all as VectorRecord[]) {
    collections.add(record.collection);
  }
  return Array.from(collections);
}

/* ── Document Store ── */
export interface DocumentRecord {
  id?: number;
  collection: string;
  name: string;
  content: string;
  chunks: string[];
  createdAt: number;
}

export async function addDocument(record: DocumentRecord): Promise<number> {
  const db = await getDB();
  return db.add('documents', { ...record, createdAt: Date.now() }) as Promise<number>;
}

export async function getDocuments(collection: string): Promise<DocumentRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex('documents', 'collection', collection);
}

export async function deleteDocument(id: number): Promise<void> {
  const db = await getDB();
  await db.delete('documents', id);
}

/* ── Settings ── */
export async function getSetting<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const result = await db.get('settings', key);
  return result?.value as T | undefined;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key, value });
}

/* ── Vector Similarity Search ── */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface SearchResult {
  text: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export function searchVectors(
  vectors: VectorRecord[],
  queryEmbedding: number[],
  topK: number = 5
): SearchResult[] {
  const scored = vectors.map(v => ({
    text: v.text,
    score: cosineSimilarity(v.embedding, queryEmbedding),
    metadata: v.metadata,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
