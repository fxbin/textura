import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/useEditorStore';

export function useScrollSync() {
  const { editorRef, previewRef, isScrollSyncEnabled } = useEditorStore((state) => state);
  const isSyncingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isScrollSyncEnabled || !editorRef || !previewRef) {
      return;
    }

    const editor = editorRef;
    const preview = previewRef;

    const syncScroll = (source: HTMLElement, target: HTMLElement) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;

      const sourceHeight = source.scrollHeight - source.offsetHeight;
      const targetHeight = target.scrollHeight - target.offsetHeight;

      if (sourceHeight <= 0 || targetHeight <= 0) {
        isSyncingRef.current = false;
        return;
      }

      const percentage = source.scrollTop / sourceHeight;
      const targetScrollTop = percentage * targetHeight;

      target.scrollTop = targetScrollTop;

      // Release the lock after the next frame so the target's
      // own scroll event (triggered by the programmatic scroll)
      // is ignored, preventing feedback loops.
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    };

    const handleEditorScroll = () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => syncScroll(editor, preview));
    };

    const handlePreviewScroll = () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => syncScroll(preview, editor));
    };

    editor.addEventListener('scroll', handleEditorScroll, { passive: true });
    preview.addEventListener('scroll', handlePreviewScroll, { passive: true });

    return () => {
      editor.removeEventListener('scroll', handleEditorScroll);
      preview.removeEventListener('scroll', handlePreviewScroll);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [editorRef, previewRef, isScrollSyncEnabled]);
}
