import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { useDocumentStore } from '@/store/documentStore';
import { useHistoryStore } from '@/store/historyStore';

export function useAutoSave(intervalMs: number = 300000) {
  const isEnabled = useRef(true);
  const editorHasHydrated = useEditorStore((state) => state._hasHydrated);
  const documentHasHydrated = useDocumentStore((state) => state._hasHydrated);
  const historyHasHydrated = useHistoryStore((state) => state._hasHydrated);

  useEffect(() => {
    if (!editorHasHydrated || !documentHasHydrated || !historyHasHydrated) {
      return;
    }

    const timer = setInterval(() => {
      if (!isEnabled.current) {
        return;
      }

      const currentMarkdown = useEditorStore.getState().markdown;
      const currentDocumentId = useDocumentStore.getState().currentDocument?.id;
      const historyState = useHistoryStore.getState();
      const snapshots = historyState.getSnapshots(currentDocumentId);

      if (!currentMarkdown.trim()) {
        return;
      }

      const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null;
      if (latestSnapshot?.content === currentMarkdown) {
        return;
      }

      historyState.addSnapshot(currentMarkdown, '自动保存', currentDocumentId);
      console.debug('Textura Auto-Saved');
    }, intervalMs);

    return () => clearInterval(timer);
  }, [documentHasHydrated, editorHasHydrated, historyHasHydrated, intervalMs]);

  return {
    disable: () => {
      isEnabled.current = false;
    },
    enable: () => {
      isEnabled.current = true;
    },
  };
}
