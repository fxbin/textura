import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { indexedDBStorage } from './indexedDBStorage';
import type { LocalAiExecutionMode } from '@/lib/ai/local';

export type SettingsTab = 'general' | 'ai' | 'workspace';

interface LocalAiState {
  executionMode: LocalAiExecutionMode;
  setExecutionMode: (mode: LocalAiExecutionMode) => void;
  settingsTab: SettingsTab;
  setSettingsTab: (tab: SettingsTab) => void;
}

export const useLocalAiStore = create<LocalAiState>()(
  persist(
    (set) => ({
      executionMode: 'smart',
      setExecutionMode: (executionMode) => set({ executionMode }),
      settingsTab: 'general',
      setSettingsTab: (settingsTab) => set({ settingsTab }),
    }),
    {
      name: 'textura-local-ai',
      storage: indexedDBStorage,
      partialize: (state) => ({ executionMode: state.executionMode }),
    },
  ),
);
