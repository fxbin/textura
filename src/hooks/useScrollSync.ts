import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/useEditorStore';

export function useScrollSync() {
  const { editorRef, previewRef, isScrollSyncEnabled } = useEditorStore((state) => state);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isScrollSyncEnabled || !editorRef || !previewRef) {
      return;
    }

    const editor = editorRef;
    const preview = previewRef;

    const scrollCB = (sourceName: 'editor' | 'preview') => {
      let source: HTMLElement | null;
      let target: HTMLElement | null;

      // Clear any pending re-attach timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (sourceName === 'preview') {
        source = preview;
        target = editor;
        
        // Remove target listener to prevent feedback loop
        target.removeEventListener('scroll', handleEditorScroll);
        
        // Re-attach after delay
        timeoutRef.current = setTimeout(() => {
          target?.addEventListener('scroll', handleEditorScroll);
        }, 300);
      } else {
        source = editor;
        target = preview;
        
        // Remove target listener
        target.removeEventListener('scroll', handlePreviewScroll);
        
        // Re-attach after delay
        timeoutRef.current = setTimeout(() => {
          target?.addEventListener('scroll', handlePreviewScroll);
        }, 300);
      }

      if (!source || !target) return;

      const sourceHeight = source.scrollHeight - source.offsetHeight;
      const targetHeight = target.scrollHeight - target.offsetHeight;

      if (sourceHeight <= 0 || targetHeight <= 0) return;

      const percentage = source.scrollTop / sourceHeight;
      const targetScrollTop = percentage * targetHeight;

      target.scrollTo({ top: targetScrollTop, behavior: 'auto' });
    };

    const handleEditorScroll = () => scrollCB('editor');
    const handlePreviewScroll = () => scrollCB('preview');

    editor.addEventListener('scroll', handleEditorScroll);
    preview.addEventListener('scroll', handlePreviewScroll);

    return () => {
      editor.removeEventListener('scroll', handleEditorScroll);
      preview.removeEventListener('scroll', handlePreviewScroll);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [editorRef, previewRef, isScrollSyncEnabled]);
}
