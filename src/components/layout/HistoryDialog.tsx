'use client';

import * as React from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { useHistoryStore, formatTimestamp } from '@/store/historyStore';
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
import { History, RotateCcw, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';

export function HistoryDialog() {
  const [open, setOpen] = React.useState(false);
  const { markdown, setMarkdown } = useEditorStore();
  const { snapshots, addSnapshot, removeSnapshot, clearSnapshots } = useHistoryStore();

  const handleSaveSnapshot = () => {
    addSnapshot(markdown, '手动保存');
    toast.success('已保存当前快照');
  };

  const handleRestoreSnapshot = (content: string) => {
    setMarkdown(content);
    setOpen(false);
    toast.success('已恢复历史版本');
  };

  const handleDeleteSnapshot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeSnapshot(id);
    toast.success('已删除快照');
  };

  const handleClearHistory = () => {
    if (window.confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
      clearSnapshots();
      toast.success('已清空历史记录');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs gap-1.5 text-muted-foreground hover:text-primary"
        >
          <History className="w-3.5 h-3.5" />
          历史
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            版本历史
          </DialogTitle>
          <DialogDescription>
            保存和恢复文档的历史版本
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 py-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">历史快照 ({snapshots.length})</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveSnapshot}
                  className="h-7 text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  保存当前
                </Button>
                {snapshots.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearHistory}
                    className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    清空
                  </Button>
                )}
              </div>
            </div>

            <ScrollArea className="h-[300px] md:h-[400px] rounded-md border">
              {snapshots.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                  <History className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">暂无历史记录</p>
                  <p className="text-xs mt-1">点击"保存当前"保存快照</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {snapshots.map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className="p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group"
                      onClick={() => handleRestoreSnapshot(snapshot.content)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(snapshot.timestamp)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDeleteSnapshot(snapshot.id, e)}
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                      <p className="text-xs line-clamp-2 text-muted-foreground">
                        {snapshot.content.substring(0, 100)}
                        {snapshot.content.length > 100 ? '...' : ''}
                      </p>
                      {snapshot.label && (
                        <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
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
