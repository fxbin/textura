'use client';

import * as React from 'react';
import { Copy, Palette, PenLine } from 'lucide-react';
import { BrandLogo } from '@/components/layout/BrandLogo';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useEditorStore } from '@/store/useEditorStore';

const STEPS = [
  {
    icon: PenLine,
    title: '沉浸写作',
    desc: '在左侧撰写 Markdown，或直接粘贴飞书、Notion、Word 富文本与本地图片。',
  },
  {
    icon: Palette,
    title: '三栏实时换肤',
    desc: '在右侧样式库搜索挑选 30+ 精选内联主题，中间即时校对手机与桌面排版效果。',
  },
  {
    icon: Copy,
    title: '一键复制到公众号',
    desc: '点击右上角「复制到公众号」，所有内联样式与外链参考自动打包，粘贴零丢失。',
  },
];

export function OnboardingDialog() {
  const hasSeenOnboarding = useEditorStore((s) => s.hasSeenOnboarding);
  const setHasSeenOnboarding = useEditorStore((s) => s.setHasSeenOnboarding);
  const hasHydrated = useEditorStore((s) => s._hasHydrated);

  const open = hasHydrated && !hasSeenOnboarding;

  const handleDismiss = () => {
    setHasSeenOnboarding(true);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleDismiss();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mb-2 flex justify-center">
            <BrandLogo size="md" compact />
          </div>
          <DialogTitle className="text-center text-lg font-semibold">
            欢迎来到 Textura 排版禅室
          </DialogTitle>
          <DialogDescription className="text-center text-xs">
            温润纸墨之间的公众号 Markdown 排版工作台，三步完成从撰写到发布。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="flex items-start gap-3 rounded-xl border border-border/75 bg-muted/30 p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    <span className="mr-1.5 font-mono text-xs text-muted-foreground">0{i + 1}</span>
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pb-1 text-[11px] text-muted-foreground">
          <span className="rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 font-mono">
            ⌘/ 快捷键指南
          </span>
          <span className="rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 font-mono">
            ⌘S 存版本快照
          </span>
          <span className="rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 font-mono">
            ⌘⇧F 一键排版
          </span>
        </div>

        <Button onClick={handleDismiss} className="w-full">
          开始排版创作
        </Button>
      </DialogContent>
    </Dialog>
  );
}
