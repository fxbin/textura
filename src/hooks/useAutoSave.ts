import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { useHistoryStore } from '@/store/historyStore';

export function useAutoSave(intervalMs: number = 300000) {
    const isEnabled = useRef(true);

    useEffect(() => {
        const timer = setInterval(() => {
            if (!isEnabled.current) return;

            const currentMarkdown = useEditorStore.getState().markdown;
            const historyState = useHistoryStore.getState();
            const snapshots = historyState.snapshots;

            // Skip auto-save if content is empty
            if (!currentMarkdown || currentMarkdown.trim() === '') {
                return;
            }

            // Check if it's identical to the most recent snapshot
            const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null;

            if (latestSnapshot && latestSnapshot.content === currentMarkdown) {
                // Unchanged, do not save
                return;
            }

            // Automatically add a snapshot
            historyState.addSnapshot(currentMarkdown, '自动保存');

            // Optional: gentle console log for developers (toast might be too noisy every 5 mins)
            console.debug('📄 Textura Auto-Saved');
        }, intervalMs);

        return () => clearInterval(timer);
    }, [intervalMs]);

    return {
        disable: () => (isEnabled.current = false),
        enable: () => (isEnabled.current = true),
    };
}
