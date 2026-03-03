import { PersistStorage, StorageValue } from 'zustand/middleware';

const DB_NAME = 'textura-db';
const STORE_NAME = 'editor-state';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
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
      console.error('Failed to save to IndexedDB:', name);
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
      console.error('Failed to remove from IndexedDB:', name);
    }
  },
};
