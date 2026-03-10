'use client';

import * as React from 'react';
import { Clock3, FileClock, FileSearch, HardDriveDownload, MonitorSmartphone } from 'lucide-react';
import { isTauriRuntime, useDocumentStore } from '@/store/documentStore';

function formatSourceLabel(source?: string) {
  switch (source) {
    case 'file':
      return '本地文件';
    case 'example':
      return '示例模板';
    case 'recovery':
      return '恢复草稿';
    default:
      return '本地草稿';
  }
}

function formatTimestamp(timestamp?: number) {
  if (!timestamp) {
    return '尚未保存';
  }

  return new Date(timestamp).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DocumentDetailBar() {
  const currentDocument = useDocumentStore((state) => state.currentDocument);
  const recentDocumentsCount = useDocumentStore((state) => state.recentDocuments.length);
  const isDirty = useDocumentStore((state) => state.isDirty);
  const tauriRuntime = React.useMemo(() => isTauriRuntime(), []);

  return (
    <section className="z-20 border-b border-border/50 bg-background/70 px-4 py-2.5 backdrop-blur-md">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {currentDocument?.name || '未命名文档.md'}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                isDirty
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {isDirty ? '未保存修改' : '已保存'}
            </span>
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">{currentDocument?.path || formatSourceLabel(currentDocument?.source)}</span>
            <span className="h-3 w-px shrink-0 bg-border/70" />
            <span className="shrink-0">文档 ID: {currentDocument?.id?.slice(-6) || '------'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground md:grid-cols-4">
          <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <FileSearch className="h-3.5 w-3.5" />
              <span>来源</span>
            </div>
            <div className="mt-1 text-foreground">{formatSourceLabel(currentDocument?.source)}</div>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              <span>上次保存</span>
            </div>
            <div className="mt-1 text-foreground">{formatTimestamp(currentDocument?.lastSavedAt)}</div>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <HardDriveDownload className="h-3.5 w-3.5" />
              <span>最近文档</span>
            </div>
            <div className="mt-1 text-foreground">{recentDocumentsCount} 个</div>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-2">
            <div className="flex items-center gap-1.5">
              {tauriRuntime ? <MonitorSmartphone className="h-3.5 w-3.5" /> : <FileClock className="h-3.5 w-3.5" />}
              <span>运行环境</span>
            </div>
            <div className="mt-1 text-foreground">{tauriRuntime ? 'Tauri 桌面端' : 'Web 浏览器'}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
