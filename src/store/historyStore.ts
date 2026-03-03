import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DocumentSnapshot {
  id: string;
  content: string;
  timestamp: number;
  label?: string;
}

interface HistoryState {
  snapshots: DocumentSnapshot[];
  maxSnapshots: number;

  addSnapshot: (content: string, label?: string) => void;
  removeSnapshot: (id: string) => void;
  clearSnapshots: () => void;
  getSnapshots: () => DocumentSnapshot[];
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      snapshots: [],
      maxSnapshots: 50,

      addSnapshot: (content: string, label?: string) => set((state) => {
        const newSnapshot: DocumentSnapshot = {
          id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          content,
          timestamp: Date.now(),
          label,
        };

        const updatedSnapshots = [newSnapshot, ...state.snapshots];

        if (updatedSnapshots.length > state.maxSnapshots) {
          updatedSnapshots.pop();
        }

        return { snapshots: updatedSnapshots };
      }),

      removeSnapshot: (id: string) => set((state) => ({
        snapshots: state.snapshots.filter((s) => s.id !== id),
      })),

      clearSnapshots: () => set({ snapshots: [] }),

      getSnapshots: () => get().snapshots,
    }),
    {
      name: 'textura-history',
      partialize: (state) => ({
        snapshots: state.snapshots,
        maxSnapshots: state.maxSnapshots,
      }),
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
  } else if (diffMins < 60) {
    return `${diffMins} 分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours} 小时前`;
  } else if (diffDays < 7) {
    return `${diffDays} 天前`;
  } else {
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
