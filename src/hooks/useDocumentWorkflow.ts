import * as React from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { isTauriRuntime, useDocumentStore } from '@/store/documentStore';

function getDocumentWindowTitle(name?: string, isDirty?: boolean) {
  const documentName = name || '未命名文档.md';
  return `${isDirty ? '• ' : ''}${documentName} · Textura`;
}

export function useDocumentWorkflow() {
  const markdown = useEditorStore((state) => state.markdown);
  const editorHasHydrated = useEditorStore((state) => state._hasHydrated);
  const ensureCurrentDocument = useDocumentStore((state) => state.ensureCurrentDocument);
  const syncCurrentContent = useDocumentStore((state) => state.syncCurrentContent);
  const documentHasHydrated = useDocumentStore((state) => state._hasHydrated);
  const currentDocumentName = useDocumentStore((state) => state.currentDocument?.name);
  const isDirty = useDocumentStore((state) => state.isDirty);
  const allowCloseRef = React.useRef(false);

  React.useEffect(() => {
    if (!editorHasHydrated || !documentHasHydrated) {
      return;
    }

    ensureCurrentDocument(markdown);
  }, [documentHasHydrated, editorHasHydrated, ensureCurrentDocument, markdown]);

  React.useEffect(() => {
    if (!editorHasHydrated || !documentHasHydrated) {
      return;
    }

    syncCurrentContent(markdown);
  }, [documentHasHydrated, editorHasHydrated, markdown, syncCurrentContent]);

  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!useDocumentStore.getState().isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  React.useEffect(() => {
    const title = getDocumentWindowTitle(currentDocumentName, isDirty);
    document.title = title;

    if (!isTauriRuntime()) {
      return;
    }

    let cancelled = false;

    void import('@tauri-apps/api/window')
      .then(({ getCurrentWindow }) => getCurrentWindow().setTitle(title))
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to sync Tauri window title:', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentDocumentName, isDirty]);

  React.useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let disposed = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const [{ getCurrentWindow }, { confirm }] = await Promise.all([
        import('@tauri-apps/api/window'),
        import('@tauri-apps/plugin-dialog'),
      ]);

      const appWindow = getCurrentWindow();
      cleanup = await appWindow.onCloseRequested(async (event) => {
        if (allowCloseRef.current || !useDocumentStore.getState().isDirty) {
          return;
        }

        event.preventDefault();

        const currentDocument = useDocumentStore.getState().currentDocument;
        const shouldClose = await confirm(
          `当前文档“${currentDocument?.name || '未命名文档.md'}”还有未保存修改，仍要退出吗？`,
          {
            title: '未保存的修改',
            kind: 'warning',
            okLabel: '仍然退出',
            cancelLabel: '继续编辑',
          }
        );

        if (!shouldClose) {
          return;
        }

        allowCloseRef.current = true;
        await appWindow.close();
      });

      if (disposed && cleanup) {
        cleanup();
      }
    })().catch((error) => {
      console.error('Failed to register Tauri close guard:', error);
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);
}
