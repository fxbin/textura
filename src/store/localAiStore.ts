import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { indexedDBStorage } from './indexedDBStorage';
import type { LocalAiExecutionMode } from '@/lib/ai/local';

interface LocalAiState {
  executionMode: LocalAiExecutionMode;
  setExecutionMode: (mode: LocalAiExecutionMode) => void;
}

export const useLocalAiStore = create<LocalAiState>()(
  persist(
    (set) => ({
      executionMode: 'smart',
      setExecutionMode: (executionMode) => set({ executionMode }),
    }),
    {
      name: 'textura-local-ai',
      storage: indexedDBStorage,
      partialize: (state) => ({ executionMode: state.executionMode }),
    },
  ),
);
