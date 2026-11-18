'use client';

import * as React from 'react';
import { Keyboard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ShortcutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutItem {
  keys: string[];
  label: string;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutItem[];
}

function useIsMac() {
  return React.useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform),
    () => true
  );
}

function KbdBadge({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="pointer-events-none inline-flex h-5 min-w-[1.35rem] select-none items-center justify-center rounded border border-border bg-muted/80 px-1.5 font-mono text-[11px] font-medium text-foreground/85 shadow-2xs">
      {children}
    </kbd>
  );
}

function ShortcutRow({ keys, label }: ShortcutItem) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[13px] text-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <React.Fragment key={`${label}-${index}`}>
            {index > 0 && <span className="text-xs text-muted-foreground/60">+</span>}
            <KbdBadge>{key}</KbdBadge>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export function ShortcutDialog({ open, onOpenChange }: ShortcutDialogProps) {
  const isMac = useIsMac();
  const mod = isMac ? '⌘' : 'Ctrl';
  const shift = 'Shift';

  const groups: ShortcutGroup[] = [
    {
      title: '文本与排版',
      items: [
        { keys: [mod, 'B'], label: '粗体' },
        { keys: [mod, 'I'], label: '斜体' },
        { keys: [mod, 'D'], label: '删除线' },
        { keys: [mod, 'E'], label: '行内代码' },
        { keys: [mod, 'K'], label: '插入链接' },
        { keys: [mod, '1'], label: '一级标题' },
        { keys: [mod, '2'], label: '二级标题' },
        { keys: [mod, '3'], label: '三级标题' },
        { keys: [mod, 'U'], label: '无序列表' },
        { keys: [mod, shift, 'U'], label: '有序列表' },
      ],
    },
    {
      title: '文档与效率',
      items: [
        { keys: [mod, 'Z'], label: '撤销' },
        { keys: [mod, shift, 'Z'], label: '重做' },
        { keys: [mod, 'S'], label: '保存 / 存快照' },
        { keys: [mod, shift, 'F'], label: '一键排版' },
        { keys: [mod, shift, 'L'], label: '外链转文末引用' },
        { keys: [mod, '/'], label: '打开此快捷键指南' },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Keyboard className="h-4 w-4 text-primary" />
            键盘快捷键
          </DialogTitle>
          <DialogDescription>
            在编辑区聚焦时可使用以下快捷键高效排版。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 pt-1 sm:grid-cols-2">
          {groups.map((group) => (
            <div key={group.title} className="space-y-1">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h3>
              <div className="divide-y divide-border/50">
                {group.items.map((item) => (
                  <ShortcutRow key={item.label} {...item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
