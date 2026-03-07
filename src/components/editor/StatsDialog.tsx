'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, AlignLeft, Type, Hash } from 'lucide-react';

interface StatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  markdown: string;
}

export function StatsDialog({ open, onOpenChange, markdown }: StatsDialogProps) {
  const stats = React.useMemo(() => {
    // 移除空白字符进行纯字符统计
    const cleanText = markdown.replace(/\s/g, '');
    const charCount = cleanText.length;
    
    // 统计中文字符
    const chineseChars = markdown.match(/[\u4e00-\u9fa5]/g) || [];
    const chineseCount = chineseChars.length;
    
    // 统计英文单词 (简单匹配非空白序列，排除中文)
    const nonChineseText = markdown.replace(/[\u4e00-\u9fa5]/g, ' ');
    const words = nonChineseText.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    
    // 统计段落 (非空行)
    const paragraphs = markdown.split('\n').filter(line => line.trim().length > 0).length;
    
    // 计算阅读时间
    // 中文：400字/分钟
    // 英文：200词/分钟
    const readTimeMinutes = (chineseCount / 400) + (wordCount / 200);
    const readTime = Math.ceil(readTimeMinutes);

    return {
      charCount,
      chineseCount,
      wordCount,
      paragraphs,
      readTime
    };
  }, [markdown]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            统计字数时间
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="flex flex-col p-4 bg-muted/30 rounded-xl border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Type className="w-4 h-4" />
              <span className="text-xs font-medium">总字符数</span>
            </div>
            <span className="text-2xl font-bold font-mono">{stats.charCount}</span>
          </div>

          <div className="flex flex-col p-4 bg-muted/30 rounded-xl border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">预计阅读时间</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono">{stats.readTime}</span>
              <span className="text-xs text-muted-foreground">分钟</span>
            </div>
          </div>

          <div className="flex flex-col p-4 bg-muted/30 rounded-xl border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Hash className="w-4 h-4" />
              <span className="text-xs font-medium">中文字数</span>
            </div>
            <span className="text-2xl font-bold font-mono">{stats.chineseCount}</span>
          </div>

          <div className="flex flex-col p-4 bg-muted/30 rounded-xl border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <AlignLeft className="w-4 h-4" />
              <span className="text-xs font-medium">段落数</span>
            </div>
            <span className="text-2xl font-bold font-mono">{stats.paragraphs}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
