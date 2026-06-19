import { PersistStorage, StorageValue } from 'zustand/middleware';

const DB_NAME = 'textura-db';
const STORE_NAME = 'editor-state';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  // Return cached connection if still open
  if (dbInstance) return Promise.resolve(dbInstance);
  // Return in-flight promise if a connection is being opened
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
      // Reset cache when the connection is unexpectedly closed
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

export const indexedDBStorage: PersistStorage<unknown> = {
  getItem: async (name: string): Promise<StorageValue<unknown> | null> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(name);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            resolve(JSON.parse(result) as StorageValue<unknown>);
          } else {
            resolve(null);
          }
        };
      });
    } catch {
      return null;
    }
  },

  setItem: async (name: string, value: StorageValue<unknown>): Promise<void> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(JSON.stringify(value), name);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch {
      // Ignore non-browser environments such as SSR/build.
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(name);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch {
      // Ignore non-browser environments such as SSR/build.
    }
  },
};
