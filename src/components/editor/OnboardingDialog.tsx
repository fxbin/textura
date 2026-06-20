'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/store/useEditorStore';

const STEPS = [
  {
    icon: '✏️',
    title: '编写内容',
    desc: '在左侧编辑器中用 Markdown 写作，或从飞书、Notion、Word 粘贴富文本。',
  },
  {
    icon: '🎨',
    title: '选择主题',
    desc: '从 30+ 精选排版主题中选择一个，右侧实时预览效果。',
  },
  {
    icon: '📋',
    title: '复制到微信',
    desc: '点击「复制」按钮，直接粘贴到微信公众号编辑器，格式完整保留。',
  },
];

export function OnboardingDialog() {
  const { hasSeenOnboarding, setHasSeenOnboarding, _hasHydrated } = useEditorStore();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (_hasHydrated && !hasSeenOnboarding) {
      setOpen(true);
    }
  }, [_hasHydrated, hasSeenOnboarding]);

  const handleDismiss = () => {
    setOpen(false);
    setHasSeenOnboarding(true);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-lg">欢迎使用 Textura</DialogTitle>
          <DialogDescription className="text-center">
            公众号 Markdown 排版工具，三步完成从写作到发布。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {STEPS.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg">
                {step.icon}
              </span>
              <div>
                <p className="text-sm font-medium">
                  <span className="mr-1 text-muted-foreground">{i + 1}.</span>
                  {step.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={handleDismiss} className="w-full">
          开始使用
        </Button>
      </DialogContent>
    </Dialog>
  );
}
