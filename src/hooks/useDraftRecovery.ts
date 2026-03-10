import * as React from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { useHistoryStore } from '@/store/historyStore';

const RECOVERY_KEY = 'textura-recovery-draft';

export interface RecoveryDraft {
  markdown: string;
  timestamp: number;
}

function readRecoveryDraft(): RecoveryDraft | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(RECOVERY_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as RecoveryDraft;
    if (!parsed.markdown || !parsed.timestamp) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeRecoveryDraft(draft: RecoveryDraft | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!draft) {
    window.localStorage.removeItem(RECOVERY_KEY);
    return;
  }

  window.localStorage.setItem(RECOVERY_KEY, JSON.stringify(draft));
}

export function useDraftRecovery() {
  const { markdown, setMarkdown, _hasHydrated } = useEditorStore((state) => ({
    markdown: state.markdown,
    setMarkdown: state.setMarkdown,
    _hasHydrated: state._hasHydrated,
  }));
  const [draft, setDraft] = React.useState<RecoveryDraft | null>(null);

  React.useEffect(() => {
    if (!_hasHydrated) {
      return;
    }

    const storedDraft = readRecoveryDraft();
    if (!storedDraft || storedDraft.markdown === markdown) {
      return;
    }

    setDraft(storedDraft);
  }, [_hasHydrated, markdown]);

  React.useEffect(() => {
    if (!_hasHydrated) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (!markdown.trim()) {
        writeRecoveryDraft(null);
        return;
      }

      writeRecoveryDraft({
        markdown,
        timestamp: Date.now(),
      });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [_hasHydrated, markdown]);

  const restoreDraft = React.useCallback(() => {
    if (!draft) {
      return;
    }

    const historyStore = useHistoryStore.getState();
    historyStore.addSnapshot(markdown, '恢复前备份');
    setMarkdown(draft.markdown);
    historyStore.addSnapshot(draft.markdown, '异常恢复');
    writeRecoveryDraft({
      markdown: draft.markdown,
      timestamp: Date.now(),
    });
    setDraft(null);
  }, [draft, markdown, setMarkdown]);

  const dismissDraft = React.useCallback(() => {
    writeRecoveryDraft(null);
    setDraft(null);
  }, []);

  return {
    draft,
    restoreDraft,
    dismissDraft,
  };
}
