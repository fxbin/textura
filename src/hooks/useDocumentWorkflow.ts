import * as React from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { useDocumentStore } from '@/store/documentStore';

export function useDocumentWorkflow() {
  const markdown = useEditorStore((state) => state.markdown);
  const ensureCurrentDocument = useDocumentStore((state) => state.ensureCurrentDocument);
  const syncCurrentContent = useDocumentStore((state) => state.syncCurrentContent);

  React.useEffect(() => {
    ensureCurrentDocument(markdown);
  }, [ensureCurrentDocument, markdown]);

  React.useEffect(() => {
    syncCurrentContent(markdown);
  }, [markdown, syncCurrentContent]);

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
}
