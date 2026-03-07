'use client';

import * as React from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Wand2,
  Bot,
  Bold,
  Italic,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  Quote,
  List,
  ListOrdered,
  Link2,
  Workflow,
  Undo2,
  Redo2,
  Link,
  Unlink
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { autoFormatMarkdown, formatWeChatLinks } from '@/lib/formatter';
import { handleSmartPaste } from '@/lib/htmlToMarkdown';
import { AiAssistDialog } from './AiAssistDialog';
import { StatsDialog } from './StatsDialog';

export function EditorPane() {
  const {
    markdown,
    setMarkdown,
    setScrollPercentage,
    isScrollSyncEnabled,
    toggleScrollSync
  } = useEditorStore();
  const [isAiDialogOpen, setIsAiDialogOpen] = React.useState(false);
  const [isStatsOpen, setIsStatsOpen] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (isScrollSyncEnabled === false) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight <= clientHeight) return;
    const percentage = scrollTop / (scrollHeight - clientHeight);
    setScrollPercentage(percentage);
  };

  const handleAutoFormat = () => {
    if (!markdown.trim()) {
      toast.error('请先输入一些内容');
      return;
    }
    const formatted = autoFormatMarkdown(markdown);
    setMarkdown(formatted);
    toast.success('一键排版完成！');
  };

  const handleWeChatLinks = () => {
    if (!markdown.trim()) {
      toast.error('请先输入一些内容');
      return;
    }
    const formatted = formatWeChatLinks(markdown);
    setMarkdown(formatted);
    toast.success('链接已转换为引用！');
  };

  const insertFormat = (prefix: string, suffix: string = '', placeholder: string = 'text') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selection = text.substring(start, end);

    const content = selection || placeholder;
    const newText = text.substring(0, start) + prefix + content + suffix + text.substring(end);

    setMarkdown(newText);

    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      // Select the inserted content
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + content.length
      );
    }, 0);
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    handleSmartPaste(e, markdown, setMarkdown);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMod = e.metaKey || e.ctrlKey;
    const isShift = e.shiftKey;

    if (isMod) {
      switch (e.key.toLowerCase()) {
        case 'z':
          e.preventDefault();
          if (isShift) {
            useEditorStore.temporal.getState().redo();
          } else {
            useEditorStore.temporal.getState().undo();
          }
          break;
        case 'y':
          e.preventDefault();
          useEditorStore.temporal.getState().redo();
          break;
        case 'b':
          e.preventDefault();
          insertFormat('**', '**', '粗体');
          break;
        case 'i':
          e.preventDefault();
          insertFormat('*', '*', '斜体');
          break;
        case 'k':
          e.preventDefault();
          insertFormat('[', '](url)', '链接');
          break;
        case 'f':
          if (isShift) {
            e.preventDefault();
            handleAutoFormat();
          }
          break;
        case 'l':
          if (isShift) {
            e.preventDefault();
            handleWeChatLinks();
          }
          break;
      }
    }
  };

  return (
    <div className="h-full w-full bg-transparent flex flex-col relative group">
      <AiAssistDialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen} />

      <div className="sticky top-0 z-10 flex-none px-4 py-2 border-b border-border/40 bg-background/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0 transition-all">
        {/* Formatting Toolbar */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => useEditorStore.temporal.getState().undo()}
            title="撤销 (Cmd+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => useEditorStore.temporal.getState().redo()}
            title="重做 (Cmd+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('**', '**', '粗体')} title="粗体">
            <Bold className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('*', '*', '斜体')} title="斜体">
            <Italic className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('> ', '\n', '引用')} title="引用">
            <Quote className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('```\n', '\n```', '代码块')} title="代码块">
            <Code className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('[', '](url)', '链接')} title="链接">
            <LinkIcon className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('![', '](url)', '图片')} title="图片">
            <ImageIcon className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('- ', '\n', '列表')} title="无序列表">
            <List className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('1. ', '\n', '列表')} title="有序列表">
            <ListOrdered className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('```mermaid\n', '\n```', 'graph TD\n  A[Start] --> B[End]')} title="插入流程图">
            <Workflow className="w-4 h-4" />
          </Button>
        </div>

        {/* Magic Actions */}
        <div className="flex flex-wrap items-center gap-1 shrink-0 pl-2 border-l max-w-[180px] sm:max-w-none">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-primary"
            onClick={handleAutoFormat}
            title="基于规则的快速格式化"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">正则排版</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-primary"
            onClick={handleWeChatLinks}
            title="将外链转换为底部引用"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">链接转引用</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-primary"
            onClick={() => setIsAiDialogOpen(true)}
            title="调用 DeepSeek/Kimi 辅助排版"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI 辅助</span>
          </Button>

          <div className="w-[1px] h-4 bg-border/40 mx-1" />

          <Button
            variant={isScrollSyncEnabled !== false ? "secondary" : "ghost"}
            size="sm"
            className={cn("h-7 px-2 text-xs gap-1.5", isScrollSyncEnabled !== false ? "text-primary/80" : "text-muted-foreground")}
            onClick={toggleScrollSync}
            title="控制两侧面板是否同步滚动"
          >
            {isScrollSyncEnabled !== false ? <Link className="w-3.5 h-3.5" /> : <Unlink className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isScrollSyncEnabled !== false ? "取消联动" : "滚动联动"}</span>
          </Button>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={onPaste}
        onScroll={handleScroll}
        className="flex-1 w-full resize-none bg-transparent p-8 md:p-10 outline-none font-mono text-[15px] md:text-[16px] leading-[1.8] no-scrollbar text-foreground placeholder-muted-foreground"
        placeholder="在这里输入 Markdown 内容..."
        spellCheck={false}
      />

      {/* Bottom Action / Info Bar for Editor */}
      <div className="flex-none px-4 sm:px-6 py-3 sm:py-4 border-t border-border/40 bg-background/50 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 transition-all">
        <div className="flex items-center gap-2 min-w-0">
          <Wand2 size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="text-[12.5px] font-medium text-foreground">
            <span className="hidden sm:inline">支持直接粘贴 <span className="text-muted-foreground">飞书、Notion或Word等</span> 富文本，自动净化为 Markdown</span>
            <span className="sm:hidden">支持直接粘贴 <span className="text-muted-foreground">飞书、Notion或Word等</span> 富文本</span>
          </span>
        </div>
        <div 
          className="text-[12px] font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors hover:bg-muted/50 px-2 py-1 rounded-md select-none"
          onClick={() => setIsStatsOpen(true)}
          title="点击查看详细统计"
        >
          {markdown.length} 字
        </div>
      </div>

      <AiAssistDialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen} />
      <StatsDialog open={isStatsOpen} onOpenChange={setIsStatsOpen} markdown={markdown} />
    </div>
  );
}
