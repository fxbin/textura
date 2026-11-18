'use client';

import * as React from 'react';
import { Clock, FileText, History, RotateCcw, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { calculateWordCount, cn } from '@/lib/utils';
import { useDocumentStore } from '@/store/documentStore';
import { formatTimestamp, useHistoryStore } from '@/store/historyStore';
import { useEditorStore } from '@/store/useEditorStore';

export function HistoryDialog() {
  const [open, setOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [confirmClear, setConfirmClear] = React.useState(false);

  const markdown = useEditorStore((state) => state.markdown);
  const setMarkdown = useEditorStore((state) => state.setMarkdown);
  const currentDocument = useDocumentStore((state) => state.currentDocument);
  const { snapshots, addSnapshot, removeSnapshot, clearSnapshots } = useHistoryStore();

  const currentSnapshots = React.useMemo(
    () => snapshots.filter((snapshot) => snapshot.documentId === currentDocument?.id),
    [currentDocument?.id, snapshots]
  );

  const activeSnapshot = React.useMemo(
    () =>
      currentSnapshots.find((item) => item.id === selectedId) ?? currentSnapshots[0] ?? null,
    [currentSnapshots, selectedId]
  );

  const activeWordCount = React.useMemo(
    () => (activeSnapshot ? calculateWordCount(activeSnapshot.content).charCount : 0),
    [activeSnapshot]
  );

  const handleSaveSnapshot = () => {
    addSnapshot(markdown, '手动保存', currentDocument?.id);
    toast.success('已保存当前快照');
  };

  const handleRestoreSnapshot = (content: string) => {
    setMarkdown(content);
    setOpen(false);
    toast.success('已恢复所选版本');
  };

  const handleDeleteSnapshot = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    removeSnapshot(id);
    if (selectedId === id) {
      setSelectedId(null);
    }
    toast.success('已删除快照');
  };

  const handleClearHistory = () => {
    clearSnapshots(currentDocument?.id);
    setSelectedId(null);
    setConfirmClear(false);
    toast.success('已清空当前文档历史');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setConfirmClear(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="版本历史"
          className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <History className="h-4 w-4" />
          <span className="hidden lg:inline">历史</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[84vh] w-[95vw] max-w-[95vw] flex-col overflow-hidden sm:max-w-4xl">
        <DialogHeader className="shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
            <div>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-primary" />
                版本历史
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                {currentDocument ? `当前文档：${currentDocument.name}` : '查看、预览并恢复历史快照。'}
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="xs" onClick={handleSaveSnapshot} className="h-7">
                <Save className="h-3.5 w-3.5" />
                保存当前快照
              </Button>

              {currentSnapshots.length > 0 &&
                (confirmClear ? (
                  <div className="flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5">
                    <span className="text-[11px] text-destructive">清空全部?</span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="xs"
                      onClick={handleClearHistory}
                      className="h-5 px-1.5 text-[10px]"
                    >
                      确认
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setConfirmClear(false)}
                      className="h-5 px-1.5 text-[10px]"
                    >
                      取消
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setConfirmClear(true)}
                    className="h-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    清空
                  </Button>
                ))}
            </div>
          </div>
        </DialogHeader>

        {currentSnapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-14 text-center text-muted-foreground">
            <History className="mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm font-medium text-foreground">当前文档还没有历史快照</p>
            <p className="mt-1 text-xs">
              每 3 分钟自动保存一次，或按 <kbd className="rounded border px-1 font-mono text-[10px]">⌘S</kbd> / 点击上方「保存当前快照」
            </p>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 pt-1 md:grid-cols-[260px_1fr]">
            {/* Left Snapshot List */}
            <div className="flex min-h-0 flex-col rounded-xl border border-border/80 bg-muted/25">
              <div className="shrink-0 border-b border-border/70 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
                共 {currentSnapshots.length} 个历史版本
              </div>
              <ScrollArea className="h-[200px] md:h-[400px]">
                <div className="space-y-1.5 p-2">
                  {currentSnapshots.map((snapshot) => {
                    const isSelected = activeSnapshot?.id === snapshot.id;
                    return (
                      <div
                        key={snapshot.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedId(snapshot.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedId(snapshot.id);
                          }
                        }}
                        className={cn(
                          'group cursor-pointer rounded-lg border p-2.5 text-left transition-all',
                          isSelected
                            ? 'border-primary/50 bg-card shadow-2xs ring-1 ring-primary/15'
                            : 'border-transparent hover:border-border/70 hover:bg-card/70'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-foreground">
                            {formatTimestamp(snapshot.timestamp)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="删除快照"
                            className="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={(event) => handleDeleteSnapshot(snapshot.id, event)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>

                        {snapshot.label && (
                          <span className="mt-1 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            {snapshot.label}
                          </span>
                        )}

                        <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                          {snapshot.content.trim().slice(0, 80) || '(空白文稿)'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Right Snapshot Full Content Preview */}
            {activeSnapshot && (
              <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-card">
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/70 px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate font-medium text-foreground">
                      {new Date(activeSnapshot.timestamp).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <span className="h-3 w-px shrink-0 bg-border" />
                    <span className="shrink-0 font-mono">{activeWordCount} 字</span>
                  </div>

                  <Button
                    type="button"
                    size="xs"
                    onClick={() => handleRestoreSnapshot(activeSnapshot.content)}
                    className="h-7 shrink-0 px-3"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    恢复此版本
                  </Button>
                </div>

                <div className="h-[220px] min-h-0 flex-1 overflow-y-auto overflow-x-hidden md:h-[400px]">
                  <pre className="whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-foreground/90">
                    {activeSnapshot.content}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
