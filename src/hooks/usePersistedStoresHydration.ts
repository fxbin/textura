import * as React from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { useHistoryStore } from '@/store/historyStore';

export function usePersistedStoresHydration() {
  React.useEffect(() => {
    if (!useDocumentStore.persist.hasHydrated()) {
      void useDocumentStore.persist.rehydrate();
    }

    if (!useHistoryStore.persist.hasHydrated()) {
      void useHistoryStore.persist.rehydrate();
    }
  }, []);
}
