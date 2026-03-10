import * as React from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { useDocumentStore } from '@/store/documentStore';
import { useHistoryStore } from '@/store/historyStore';

const RECOVERY_KEY = 'textura-recovery-draft';

export interface RecoveryDraft {
  markdown: string;
  timestamp: number;
  documentId?: string;
  documentName?: string;
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
  const markdown = useEditorStore((state) => state.markdown);
  const setMarkdown = useEditorStore((state) => state.setMarkdown);
  const hasHydrated = useEditorStore((state) => state._hasHydrated);
  const currentDocument = useDocumentStore((state) => state.currentDocument);
  const openDocumentSession = useDocumentStore((state) => state.openDocumentSession);
  const [draft, setDraft] = React.useState<RecoveryDraft | null>(null);

  React.useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const storedDraft = readRecoveryDraft();
    if (!storedDraft) {
      return;
    }

    const sameDocument = storedDraft.documentId && storedDraft.documentId === currentDocument?.id;
    if (sameDocument && storedDraft.markdown === markdown) {
      return;
    }

    setDraft(storedDraft);
  }, [currentDocument?.id, hasHydrated, markdown]);

  React.useEffect(() => {
    if (!hasHydrated) {
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
        documentId: currentDocument?.id,
        documentName: currentDocument?.name,
      });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [currentDocument?.id, currentDocument?.name, hasHydrated, markdown]);

  const restoreDraft = React.useCallback(() => {
    if (!draft) {
      return;
    }

    const currentDocumentId = useDocumentStore.getState().currentDocument?.id;
    const historyStore = useHistoryStore.getState();

    historyStore.addSnapshot(markdown, '恢复前备份', currentDocumentId);
    openDocumentSession({
      id: draft.documentId,
      name: draft.documentName || '恢复草稿.md',
      content: draft.markdown,
      source: 'recovery',
    });
    setMarkdown(draft.markdown);
    historyStore.addSnapshot(draft.markdown, '异常恢复', draft.documentId || currentDocumentId);
    writeRecoveryDraft({
      ...draft,
      timestamp: Date.now(),
    });
    setDraft(null);
  }, [draft, markdown, openDocumentSession, setMarkdown]);

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
