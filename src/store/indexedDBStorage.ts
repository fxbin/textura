import { PersistStorage, StorageValue } from 'zustand/middleware';

const DB_NAME = 'textura-db';
const STORE_NAME = 'editor-state';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbPromise) return dbPromise;

  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this environment'));
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
    request.onsuccess = () => {
      const db = request.result;
      dbInstance = db;
      db.onclose = () => {
        dbInstance = null;
        dbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        dbInstance = null;
        dbPromise = null;
      };
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });

  return dbPromise;
}

async function readSerializedItem(name: string): Promise<string | null> {
  const db = await openDB();
  return await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(name);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : null);
  });
}

async function writeSerializedItem(name: string, serialized: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(serialized, name);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
  });
}

async function deleteSerializedItem(name: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(name);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
  });
}

function readLegacyLocalStorage(name: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(name);
  } catch {
    return null;
  }
}

function removeLegacyLocalStorage(name: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(name);
  } catch {
    // Legacy cleanup failure should not invalidate a successful IndexedDB migration.
  }
}

function parseStorageValue(serialized: string, name: string): StorageValue<unknown> | null {
  try {
    return JSON.parse(serialized) as StorageValue<unknown>;
  } catch (error) {
    console.error(`[indexedDBStorage] Invalid persisted JSON for ${name}:`, error);
    return null;
  }
}

export const indexedDBStorage: PersistStorage<unknown> = {
  getItem: async (name: string): Promise<StorageValue<unknown> | null> => {
    try {
      const serialized = await readSerializedItem(name);
      if (serialized) {
        return parseStorageValue(serialized, name);
      }
    } catch (error) {
      // IndexedDB may be blocked by browser privacy settings. Continue to the legacy
      // fallback so an existing localStorage document/history is still recoverable.
      console.error(`[indexedDBStorage] Failed to read ${name} from IndexedDB:`, error);
    }

    const legacy = readLegacyLocalStorage(name);
    if (!legacy) return null;

    const parsed = parseStorageValue(legacy, name);
    if (!parsed) return null;

    try {
      await writeSerializedItem(name, legacy);
      removeLegacyLocalStorage(name);
    } catch (error) {
      // Migration failure must never hide otherwise valid legacy data. Keep the old
      // localStorage entry and return it for this session.
      console.error(`[indexedDBStorage] Failed to migrate ${name} to IndexedDB:`, error);
    }

    return parsed;
  },

  setItem: async (name: string, value: StorageValue<unknown>): Promise<void> => {
    if (typeof window === 'undefined') return;

    try {
      await writeSerializedItem(name, JSON.stringify(value));
    } catch (error) {
      console.error(`[indexedDBStorage] Failed to persist ${name}:`, error);
      // Do not silently swallow quota/transaction failures: callers should be able to observe persistence failure.
      throw error;
    }
  },

  removeItem: async (name: string): Promise<void> => {
    if (typeof window === 'undefined') return;

    try {
      await deleteSerializedItem(name);
      removeLegacyLocalStorage(name);
    } catch (error) {
      console.error(`[indexedDBStorage] Failed to remove ${name}:`, error);
      throw error;
    }
  },
};