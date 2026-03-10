'use client';

import { AlertTriangle, RefreshCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDraftRecovery } from '@/hooks/useDraftRecovery';
import { toast } from 'sonner';

function formatRecoveryTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RecoveryBanner() {
  const { draft, restoreDraft, dismissDraft } = useDraftRecovery();

  if (!draft) {
    return null;
  }

  return (
    <div className="relative z-20 border-b border-amber-500/20 bg-amber-50/90 px-4 py-3 text-amber-950 backdrop-blur dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">检测到一份可恢复草稿</p>
            <p className="text-xs opacity-80">
              最近备份时间：{formatRecoveryTime(draft.timestamp)}。这份草稿用于浏览器异常退出或本地存储恢复失败时兜底。
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-amber-500/30 bg-transparent text-xs"
            onClick={() => {
              restoreDraft();
              toast.success('已恢复草稿，并写入历史快照。');
            }}
          >
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
            恢复草稿
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => {
              dismissDraft();
              toast.success('已丢弃恢复草稿。');
            }}
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            忽略
          </Button>
        </div>
      </div>
    </div>
  );
}
