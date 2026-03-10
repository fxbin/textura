'use client';

import * as React from 'react';
import { Clock, History, RotateCcw, Trash2 } from 'lucide-react';
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
import { useEditorStore } from '@/store/useEditorStore';
import { formatTimestamp, useHistoryStore } from '@/store/historyStore';
import { useDocumentStore } from '@/store/documentStore';

export function HistoryDialog() {
  const [open, setOpen] = React.useState(false);
  const markdown = useEditorStore((state) => state.markdown);
  const setMarkdown = useEditorStore((state) => state.setMarkdown);
  const currentDocument = useDocumentStore((state) => state.currentDocument);
  const { snapshots, addSnapshot, removeSnapshot, clearSnapshots } = useHistoryStore();

  const currentSnapshots = React.useMemo(
    () => snapshots.filter((snapshot) => snapshot.documentId === currentDocument?.id),
    [currentDocument?.id, snapshots]
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
    toast.success('已删除快照');
  };

  const handleClearHistory = () => {
    if (!window.confirm('确定清空当前文档的历史快照吗？此操作无法撤销。')) {
      return;
    }

    clearSnapshots(currentDocument?.id);
    toast.success('已清空当前文档历史');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1.5 text-muted-foreground hover:text-primary">
          <History className="h-3.5 w-3.5" />
          History
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[80vh] w-[95vw] max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            版本历史
          </DialogTitle>
          <DialogDescription>
            {currentDocument ? `当前文档：${currentDocument.name}` : '查看并恢复当前文档的历史快照。'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 py-4">
          <div className="flex-1">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-medium">Snapshots ({currentSnapshots.length})</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSaveSnapshot} className="h-7 text-xs">
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Save Current
                </Button>
                {currentSnapshots.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearHistory}
                    className="h-7 text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <ScrollArea className="h-[300px] rounded-md border md:h-[400px]">
              {currentSnapshots.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center p-8 text-muted-foreground">
                  <History className="mb-3 h-12 w-12 opacity-30" />
                  <p className="text-sm">当前文档还没有历史快照</p>
                  <p className="mt-1 text-xs">点击 “Save Current” 保存一个版本</p>
                </div>
              ) : (
                <div className="space-y-2 p-2">
                  {currentSnapshots.map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className="group cursor-pointer rounded-lg border p-3 transition-colors hover:bg-accent/50"
                      onClick={() => handleRestoreSnapshot(snapshot.content)}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{formatTimestamp(snapshot.timestamp)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={(event) => handleDeleteSnapshot(snapshot.id, event)}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {snapshot.content.substring(0, 100)}
                        {snapshot.content.length > 100 ? '...' : ''}
                      </p>
                      {snapshot.label && (
                        <span className="mt-1 inline-block rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {snapshot.label}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
