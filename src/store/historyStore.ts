import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { indexedDBStorage } from './indexedDBStorage';

export interface DocumentSnapshot {
  id: string;
  content: string;
  timestamp: number;
  label?: string;
  documentId?: string | null;
}

interface HistoryState {
  snapshots: DocumentSnapshot[];
  maxSnapshots: number;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  addSnapshot: (content: string, label?: string, documentId?: string | null) => void;
  removeSnapshot: (id: string) => void;
  clearSnapshots: (documentId?: string | null) => void;
  getSnapshots: (documentId?: string | null) => DocumentSnapshot[];
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      snapshots: [],
      maxSnapshots: 50,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      addSnapshot: (content, label, documentId) =>
        set((state) => {
          const newSnapshot: DocumentSnapshot = {
            id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            content,
            timestamp: Date.now(),
            label,
            documentId,
          };

          const updatedSnapshots = [newSnapshot, ...state.snapshots];
          if (updatedSnapshots.length > state.maxSnapshots) {
            updatedSnapshots.pop();
          }

          return { snapshots: updatedSnapshots };
        }),

      removeSnapshot: (id) =>
        set((state) => ({
          snapshots: state.snapshots.filter((snapshot) => snapshot.id !== id),
        })),

      clearSnapshots: (documentId) =>
        set((state) => ({
          snapshots:
            documentId === undefined
              ? []
              : state.snapshots.filter((snapshot) => snapshot.documentId !== documentId),
        })),

      getSnapshots: (documentId) => {
        if (documentId === undefined) {
          return get().snapshots;
        }

        return get().snapshots.filter((snapshot) => snapshot.documentId === documentId);
      },
    }),
    {
      name: 'textura-history',
      storage: indexedDBStorage,
      skipHydration: true,
      partialize: (state) => ({
        snapshots: state.snapshots,
        maxSnapshots: state.maxSnapshots,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return '刚刚';
  }

  if (diffMins < 60) {
    return `${diffMins} 分钟前`;
  }

  if (diffHours < 24) {
    return `${diffHours} 小时前`;
  }

  if (diffDays < 7) {
    return `${diffDays} 天前`;
  }

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}