'use client';

import * as React from 'react';
import { listen } from '@tauri-apps/api/event';
import {
  BarChart2,
  Bold,
  Bot,
  Code,
  Image as ImageIcon,
  Italic,
  Link,
  Link2,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
  Unlink,
  Wand2,
  Workflow,
} from 'lucide-react';
import { toast } from 'sonner';
import { useEditorStore } from '@/store/useEditorStore';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { autoFormatMarkdown, formatWeChatLinks } from '@/lib/formatter';
import { handleSmartPaste } from '@/lib/htmlToMarkdown';
import { AiAssistDialog } from './AiAssistDialog';

export function EditorPane() {
  const {
    markdown,
    setMarkdown,
    isScrollSyncEnabled,
    toggleScrollSync,
    toggleStats,
    registerEditorScroller,
  } = useEditorStore();
  const [isAiDialogOpen, setIsAiDialogOpen] = React.useState(false);
  
  // Use callback ref to ensure registration
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const setTextareaRef = React.useCallback((node: HTMLTextAreaElement | null) => {
    textareaRef.current = node; // Keep ref for internal usage (insertFormat)
    registerEditorScroller(node);
  }, [registerEditorScroller]);

  const restoreTextareaView = React.useCallback(
    (selectionStart: number, selectionEnd: number, scrollTop: number) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionEnd);
      textarea.scrollTop = scrollTop;
    },
    []
  );

  const insertFormat = (prefix: string, suffix = '', placeholder = 'text') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const scrollTop = textarea.scrollTop;
    const selection = text.substring(start, end);
    const content = selection || placeholder;
    const newText = text.substring(0, start) + prefix + content + suffix + text.substring(end);

    setMarkdown(newText);

    setTimeout(() => {
      restoreTextareaView(
        start + prefix.length,
        start + prefix.length + content.length,
        scrollTop
      );
    }, 0);
  };

  const insertBlockquote = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const scrollTop = textarea.scrollTop;

    if (start !== end) {
      const selectedText = text.substring(start, end);
      const quotedSelection = selectedText
        .split('\n')
        .map((line) => (line.trim() ? `> ${line}` : '>'))
        .join('\n');
      const newText = text.substring(0, start) + quotedSelection + text.substring(end);

      setMarkdown(newText);

      setTimeout(() => {
        restoreTextareaView(start, start + quotedSelection.length, scrollTop);
      }, 0);
      return;
    }

    const lineStart = text.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const nextLineBreak = text.indexOf('\n', start);
    const lineEnd = nextLineBreak === -1 ? text.length : nextLineBreak;
    const currentLine = text.substring(lineStart, lineEnd);

    if (currentLine.trim()) {
      const isAlreadyQuoted = currentLine.startsWith('> ');
      const quotedLine = isAlreadyQuoted ? currentLine : `> ${currentLine}`;
      const newText = text.substring(0, lineStart) + quotedLine + text.substring(lineEnd);
      const caretOffset = isAlreadyQuoted ? 0 : 2;

      setMarkdown(newText);

      setTimeout(() => {
        restoreTextareaView(start + caretOffset, start + caretOffset, scrollTop);
      }, 0);
      return;
    }

    const insertion = '> ';
    const newText = text.substring(0, start) + insertion + text.substring(end);
    setMarkdown(newText);

    setTimeout(() => {
      restoreTextareaView(start + insertion.length, start + insertion.length, scrollTop);
    }, 0);
  }, [restoreTextareaView, setMarkdown]);

  const handleAutoFormat = React.useCallback(() => {
    if (!markdown.trim()) {
      toast.error('请先输入一些内容');
      return;
    }

    const formatted = autoFormatMarkdown(markdown);
    setMarkdown(formatted);
    toast.success('一键排版完成');
  }, [markdown, setMarkdown]);

  const handleWeChatLinks = React.useCallback(() => {
    if (!markdown.trim()) {
      toast.error('请先输入一些内容');
      return;
    }

    const formatted = formatWeChatLinks(markdown);
    setMarkdown(formatted);
    toast.success('链接已转换为引用');
  }, [markdown, setMarkdown]);

  const handleMenuEvent = React.useEffectEvent((id: string) => {
    switch (id) {
      case 'format_bold':
        insertFormat('**', '**', '加粗');
        break;
      case 'format_italic':
        insertFormat('*', '*', '斜体');
        break;
      case 'format_strike':
        insertFormat('~~', '~~', '删除线');
        break;
      case 'format_link':
        insertFormat('[', '](url)', '链接文字');
        break;
      case 'format_code':
        insertFormat('`', '`', '代码');
        break;
      case 'format_h1':
        insertFormat('# ', '', '标题');
        break;
      case 'format_h2':
        insertFormat('## ', '', '标题');
        break;
      case 'format_h3':
        insertFormat('### ', '', '标题');
        break;
      case 'format_ul':
        insertFormat('- ', '', '列表项');
        break;
      case 'format_ol':
        insertFormat('1. ', '', '列表项');
        break;
      case 'format_wechat_links':
        handleWeChatLinks();
        break;
      case 'toggle_stats':
        toggleStats();
        break;
      default:
        break;
    }
  });

  React.useEffect(() => {
    if (typeof window === 'undefined' || !('__TAURI__' in window)) {
      return;
    }

    const unlisten = listen('menu-event', (event) => {
      handleMenuEvent(event.payload as string);
    });

    return () => {
      unlisten.then((dispose) => dispose());
    };
  }, []);

  const onPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    handleSmartPaste(event, markdown, setMarkdown);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMod = event.metaKey || event.ctrlKey;
    const isShift = event.shiftKey;

    if (!isMod) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'z':
        event.preventDefault();
        if (isShift) {
          useEditorStore.temporal.getState().redo();
        } else {
          useEditorStore.temporal.getState().undo();
        }
        break;
      case 'y':
        event.preventDefault();
        useEditorStore.temporal.getState().redo();
        break;
      case 'b':
        event.preventDefault();
        insertFormat('**', '**', '粗体');
        break;
      case 'i':
        event.preventDefault();
        insertFormat('*', '*', '斜体');
        break;
      case 'k':
        event.preventDefault();
        insertFormat('[', '](url)', '链接');
        break;
      case 'f':
        if (isShift) {
          event.preventDefault();
          handleAutoFormat();
        }
        break;
      case 'l':
        if (isShift) {
          event.preventDefault();
          handleWeChatLinks();
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="group relative flex h-full w-full flex-col bg-transparent">
      <AiAssistDialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen} />

      <div className="sticky top-0 z-10 flex shrink-0 flex-wrap items-center justify-between gap-2 overflow-x-auto border-b border-border/40 bg-background/80 px-4 py-2 backdrop-blur-md transition-all no-scrollbar">
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => useEditorStore.temporal.getState().undo()}
            title="撤销 (Cmd+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => useEditorStore.temporal.getState().redo()}
            title="重做 (Cmd+Shift+Z)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <div className="mx-1 h-4 w-px bg-border" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('**', '**', '粗体')} title="粗体">
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('*', '*', '斜体')} title="斜体">
            <Italic className="h-4 w-4" />
          </Button>
          <div className="mx-1 h-4 w-px bg-border" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={insertBlockquote} title="引用">
            <Quote className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('```\n', '\n```', '代码块')} title="代码块">
            <Code className="h-4 w-4" />
          </Button>
          <div className="mx-1 h-4 w-px bg-border" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('[', '](url)', '链接')} title="链接">
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('![', '](url)', '图片')} title="图片">
            <ImageIcon className="h-4 w-4" />
          </Button>
          <div className="mx-1 h-4 w-px bg-border" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('- ', '\n', '列表')} title="无序列表">
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('1. ', '\n', '列表')} title="有序列表">
            <ListOrdered className="h-4 w-4" />
          </Button>
          <div className="mx-1 h-4 w-px bg-border" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => insertFormat('```mermaid\n', '\n```', 'graph TD\n  A[Start] --> B[End]')}
            title="插入流程图"
          >
            <Workflow className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-w-[180px] shrink-0 border-l pl-2 sm:max-w-none">
          <div className="flex flex-wrap items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-primary"
              onClick={handleAutoFormat}
              title="基于规则的快速格式化"
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">正则排版</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-primary"
              onClick={handleWeChatLinks}
              title="将外链转换为底部引用"
            >
              <Link2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">链接转引用</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-primary"
              onClick={toggleStats}
              title="显示或隐藏字数统计"
            >
              <BarChart2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">字数统计</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-primary"
              onClick={() => setIsAiDialogOpen(true)}
              title="调起 AI 辅助排版"
            >
              <Bot className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">AI 辅助</span>
            </Button>

            <div className="mx-1 h-4 w-px bg-border/40" />

            <Button
              variant={isScrollSyncEnabled ? 'secondary' : 'ghost'}
              size="sm"
              className={cn('h-7 gap-1.5 px-2 text-xs', isScrollSyncEnabled ? 'text-primary/80' : 'text-muted-foreground')}
              onClick={toggleScrollSync}
              title="控制两侧面板是否同步滚动"
            >
              {isScrollSyncEnabled ? <Link className="h-3.5 w-3.5" /> : <Unlink className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{isScrollSyncEnabled ? '取消联动' : '滚动联动'}</span>
            </Button>
          </div>
        </div>
      </div>

      <Textarea
        ref={setTextareaRef}
        value={markdown}
        onChange={(event) => setMarkdown(event.target.value)}
        onPaste={onPaste}
        onKeyDown={handleKeyDown}
        className="min-h-0 flex-1 resize-none rounded-none border-0 bg-transparent p-8 font-mono text-base leading-relaxed focus-visible:ring-0"
        placeholder="开始输入 Markdown..."
      />

      <div className="flex flex-none flex-wrap items-center justify-between gap-2 border-t border-border/40 bg-background/50 px-4 py-3 backdrop-blur-md transition-all sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-2">
          <Wand2 size={14} className="shrink-0 text-blue-600 dark:text-blue-400" />
          <span className="text-[12.5px] font-medium text-foreground">
            <span className="hidden sm:inline">
              支持直接粘贴 <span className="text-muted-foreground">飞书、Notion 或 Word</span> 富文本，并自动净化为 Markdown
            </span>
            <span className="sm:hidden">
              支持直接粘贴 <span className="text-muted-foreground">飞书、Notion 或 Word</span> 富文本
            </span>
          </span>
        </div>
        <div
          className="cursor-pointer select-none rounded-md px-2 py-1 font-mono text-[12px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          onClick={toggleStats}
          title="点击切换预览区字数统计"
        >
          {markdown.length} 字
        </div>
      </div>
    </div>
  );
}
