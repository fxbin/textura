'use client';

import React from 'react';
import { Eye, Palette, PanelRightClose, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { EditorPane } from '@/components/editor/EditorPane';
import { OnboardingDialog } from '@/components/editor/OnboardingDialog';
import { PreviewPane } from '@/components/editor/PreviewPane';
import { ThemeSelector } from '@/components/editor/ThemeSelector';
import { RecoveryBanner } from '@/components/layout/RecoveryBanner';
import { TopNav } from '@/components/layout/TopNav';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useDocumentWorkflow } from '@/hooks/useDocumentWorkflow';
import { usePersistedStoresHydration } from '@/hooks/usePersistedStoresHydration';
import { useScrollSync } from '@/hooks/useScrollSync';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/store/useEditorStore';

function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (callback: () => void) => {
      if (typeof window === 'undefined') {
        return () => {};
      }
      const mq = window.matchMedia(query);
      mq.addEventListener('change', callback);
      return () => mq.removeEventListener('change', callback);
    },
    [query]
  );

  const getSnapshot = React.useCallback(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(query).matches;
  }, [query]);

  return React.useSyncExternalStore(subscribe, getSnapshot, () => false);
}

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
  useAutoSave(180000);
  useDocumentWorkflow();
  useScrollSync();

  const isSidebarOpen = useEditorStore((s) => s.isSidebarOpen);
  const setSidebarOpen = useEditorStore((s) => s.setSidebarOpen);

  const isMobile = useMediaQuery('(max-width: 767px)');
  const isCompactDrawer = useMediaQuery('(max-width: 1023px)');

  const [mobileTab, setMobileTab] = React.useState<'edit' | 'preview'>('edit');
  // 窄屏下主题抽屉默认收起，避免首屏黑色遮罩与新手引导叠加。
  const [isCompactThemeOpen, setIsCompactThemeOpen] = React.useState(false);

  const handleOpenThemes = React.useCallback(() => {
    if (isCompactDrawer) {
      setIsCompactThemeOpen(true);
    } else {
      setSidebarOpen(true);
    }
  }, [isCompactDrawer, setSidebarOpen]);

  return (
    <main className="relative flex h-screen w-screen flex-col overflow-hidden bg-background">
      <TopNav
        isCompactViewport={isCompactDrawer}
        isCompactThemeOpen={isCompactThemeOpen}
        onToggleThemeDrawer={() => setIsCompactThemeOpen((open) => !open)}
      />
      <OnboardingDialog />
      <RecoveryBanner />

      {/* Mobile segmented switcher + theme sheet trigger */}
      {isMobile && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/75 bg-card/80 px-3 py-2 backdrop-blur-md md:hidden">
          <div className="inline-flex rounded-lg border border-border/70 bg-muted/60 p-0.5">
            <button
              type="button"
              onClick={() => setMobileTab('edit')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all',
                mobileTab === 'edit'
                  ? 'bg-card text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <PenLine className="h-3.5 w-3.5" />
              编辑源码
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all',
                mobileTab === 'preview'
                  ? 'bg-card text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              微信预览
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCompactThemeOpen(true)}
            className="h-7 gap-1.5 px-2.5 text-xs"
          >
            <Palette className="h-3.5 w-3.5 text-primary" />
            样式模板
          </Button>
        </div>
      )}

      {/* Workspace body */}
      {isMobile ? (
        <div className="relative flex-1 min-h-0 overflow-hidden">
          <div
            className={cn(
              'h-full w-full',
              mobileTab !== 'edit' && 'pointer-events-none invisible absolute inset-0 -z-10'
            )}
            aria-hidden={mobileTab !== 'edit'}
          >
            <ErrorBoundary label="编辑器">
              <EditorPane />
            </ErrorBoundary>
          </div>
          <div
            className={cn(
              'h-full w-full',
              mobileTab !== 'preview' && 'pointer-events-none invisible absolute inset-0 -z-10'
            )}
            aria-hidden={mobileTab !== 'preview'}
          >
            <ErrorBoundary label="预览区">
              <PreviewPane onOpenThemes={handleOpenThemes} />
            </ErrorBoundary>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-w-0 h-full">
            <ResizablePanelGroup orientation="horizontal" className="h-full">
              <ResizablePanel defaultSize={46} minSize={28} className="h-full">
                <ErrorBoundary label="编辑器">
                  <EditorPane />
                </ErrorBoundary>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={54} minSize={30} className="h-full">
                <ErrorBoundary label="预览区">
                  <PreviewPane onOpenThemes={handleOpenThemes} />
                </ErrorBoundary>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>

          {!isCompactDrawer && isSidebarOpen && (
            <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-border/75 bg-card/90 backdrop-blur-md xl:w-[344px]">
              <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/75 px-4">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  <h2 className="text-[13px] font-semibold text-foreground">排版样式库</h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setSidebarOpen(false)}
                  title="收起样式库"
                  aria-label="收起样式库"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ThemeSelector />
              </div>
            </aside>
          )}
        </div>
      )}

      {/* Compact viewport (mobile / tablet) theme sheet without auto-open overlay */}
      <Sheet open={isCompactDrawer && isCompactThemeOpen} onOpenChange={setIsCompactThemeOpen}>
        <SheetContent
          side="right"
          className="flex w-[90vw] max-w-[400px] flex-col border-l border-border/80 bg-card p-0"
        >
          <SheetHeader className="shrink-0 border-b border-border/75 px-5 py-3.5">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
              <Palette className="h-4 w-4 text-primary" />
              选择排版样式
            </SheetTitle>
            <SheetDescription className="sr-only">
              切换预设主题或编辑自定义样式，并在预览区即时查看排版效果。
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            <ThemeSelector />
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
