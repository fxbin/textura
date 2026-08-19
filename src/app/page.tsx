'use client';

import React from 'react';
import { toast } from 'sonner';
import { EditorPane } from '@/components/editor/EditorPane';
import { DocumentDetailBar } from '@/components/layout/DocumentDetailBar';
import { PreviewPane } from '@/components/editor/PreviewPane';
import { RecoveryBanner } from '@/components/layout/RecoveryBanner';
import { TopNav } from '@/components/layout/TopNav';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { OnboardingDialog } from '@/components/editor/OnboardingDialog';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useDocumentWorkflow } from '@/hooks/useDocumentWorkflow';
import { usePersistedStoresHydration } from '@/hooks/usePersistedStoresHydration';
import { useScrollSync } from '@/hooks/useScrollSync';

export default function Home() {
  // Register storage error reporting before hydration effects run, so IndexedDB
  // read/migration failures during initial restore are visible to the user.
  React.useEffect(() => {
    const handleStorageError = () => {
      toast.error('本地数据持久化失败。请检查浏览器存储权限或可用空间，重要内容建议立即下载 Markdown 备份。', {
        id: 'textura-storage-error',
        duration: 8000,
      });
    };

    window.addEventListener('textura-storage-error', handleStorageError);
    return () => window.removeEventListener('textura-storage-error', handleStorageError);
  }, []);

  usePersistedStoresHydration();
  // Use a shorter interval (e.g., 3 minutes) or the default 5 minutes
  useAutoSave(180000); // 3 minutes for peace of mind
  useDocumentWorkflow();

  // Enable scroll synchronization
  useScrollSync();

  // Detect mobile viewport (below 768px)
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Mobile tab state: which pane is visible on small screens
  const [mobileTab, setMobileTab] = React.useState<'edit' | 'preview'>('edit');

  return (
    <main className="h-screen w-screen flex flex-col overflow-hidden bg-background relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none select-none" />
      <TopNav />
      <OnboardingDialog />
      <RecoveryBanner />
      <DocumentDetailBar />

      {/* Mobile tab bar — only visible below 768px */}
      {isMobile && (
        <div className="flex border-b border-border/40 bg-background/80 md:hidden">
          <button
            type="button"
            onClick={() => setMobileTab('edit')}
            className={`flex-1 py-2 text-center text-sm transition-colors ${
              mobileTab === 'edit'
                ? 'border-b-2 border-primary font-medium'
                : 'text-muted-foreground'
            }`}
          >
            编辑
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`flex-1 py-2 text-center text-sm transition-colors ${
              mobileTab === 'preview'
                ? 'border-b-2 border-primary font-medium'
                : 'text-muted-foreground'
            }`}
          >
            预览
          </button>
        </div>
      )}

      {isMobile ? (
        <div className="flex-1 min-h-0 z-10">
          {mobileTab === 'edit' ? (
            <ErrorBoundary label="编辑器">
              <EditorPane />
            </ErrorBoundary>
          ) : (
            <ErrorBoundary label="预览区">
              <PreviewPane />
            </ErrorBoundary>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 z-10">
          <ResizablePanelGroup orientation="horizontal" className="h-full">
            <ResizablePanel defaultSize={40} minSize={20} className="h-full">
              <ErrorBoundary label="编辑器">
                <EditorPane />
              </ErrorBoundary>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={60} minSize={30} className="h-full">
              <ErrorBoundary label="预览区">
                <PreviewPane />
              </ErrorBoundary>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}
    </main>
  );
}
