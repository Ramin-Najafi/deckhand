import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { SyncAction } from '../types';

interface DeckhandDB extends DBSchema {
  actions: {
    key: string;
    value: SyncAction;
    indexes: { 'by-created': string };
  };
  cache: {
    key: string; // e.g., 'jobs', 'assets'
    value: any[];
  };
}

let dbPromise: Promise<IDBPDatabase<DeckhandDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<DeckhandDB>('deckhand-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('actions')) {
          const actionStore = db.createObjectStore('actions', { keyPath: 'id' });
          actionStore.createIndex('by-created', 'created_at');
        }
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache');
        }
      },
    });
  }
  return dbPromise;
}

export async function pushAction(action: SyncAction) {
  const db = await getDB();
  await db.add('actions', action);
}

export async function getActions(): Promise<SyncAction[]> {
  const db = await getDB();
  return db.getAllFromIndex('actions', 'by-created');
}

export async function removeAction(id: string) {
  const db = await getDB();
  await db.delete('actions', id);
}

export async function setCache(key: string, data: any[]) {
  const db = await getDB();
  await db.put('cache', data, key);
}

export async function getCache(key: string): Promise<any[] | undefined> {
  const db = await getDB();
  return db.get('cache', key);
}
