'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface ShortcutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl';
const shift = 'Shift';

interface ShortcutItem {
  keys: string[];
  label: string;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutItem[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: '格式化',
    items: [
      { keys: [mod, 'B'], label: '粗体' },
      { keys: [mod, 'I'], label: '斜体' },
      { keys: [mod, 'D'], label: '删除线' },
      { keys: [mod, 'E'], label: '行内代码' },
      { keys: [mod, 'K'], label: '链接' },
      { keys: [mod, '1'], label: '一级标题' },
      { keys: [mod, '2'], label: '二级标题' },
      { keys: [mod, '3'], label: '三级标题' },
    ],
  },
  {
    title: '操作',
    items: [
      { keys: [mod, 'Z'], label: '撤销' },
      { keys: [mod, shift, 'Z'], label: '重做' },
      { keys: [mod, shift, 'F'], label: '正则排版' },
      { keys: [mod, shift, 'L'], label: '链接转引用' },
    ],
  },
];

function KbdBadge({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="pointer-events-none inline-flex h-5 min-w-[1.25rem] select-none items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

function ShortcutRow({ keys, label }: ShortcutItem) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-muted-foreground/60 text-xs">+</span>}
            <KbdBadge>{key}</KbdBadge>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export function ShortcutDialog({ open, onOpenChange }: ShortcutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Keyboard className="h-4 w-4 text-muted-foreground" />
            键盘快捷键
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="space-y-0.5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h3>
              <div className="divide-y divide-border/40">
                {group.items.map((item) => (
                  <ShortcutRow key={item.label} {...item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center text-xs text-muted-foreground">
          按 <KbdBadge>{mod}</KbdBadge> + <KbdBadge>/</KbdBadge> 打开此面板
        </div>
      </DialogContent>
    </Dialog>
  );
}
