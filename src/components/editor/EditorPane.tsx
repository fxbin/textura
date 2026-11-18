'use client';

import * as React from 'react';
import { useStore } from 'zustand';
import {
  Bold,
  Braces,
  ChevronDown,
  Code,
  Heading,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Keyboard,
  Link,
  Link2,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Sparkles,
  Strikethrough,
  Table2,
  Undo2,
  Unlink,
  Wand2,
  Workflow,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { autoFormatMarkdown, formatWeChatLinks } from '@/lib/formatter';
import { handleSmartPaste } from '@/lib/htmlToMarkdown';
import { calculateWordCount, cn } from '@/lib/utils';
import {
  isTauriRuntime,
  saveDocumentToFile,
  useDocumentStore,
} from '@/store/documentStore';
import { useHistoryStore } from '@/store/historyStore';
import { useEditorStore } from '@/store/useEditorStore';
import { AiAssistDialog } from './AiAssistDialog';
import { ShortcutDialog } from './ShortcutDialog';

interface ToolbarIconButtonProps {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

function ToolbarIconButton({
  label,
  shortcut,
  onClick,
  disabled = false,
  children,
}: ToolbarIconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={disabled}
          onClick={onClick}
          aria-label={label}
          className="h-7 w-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-35"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        <span>{label}</span>
        {shortcut && (
          <kbd className="rounded bg-background/20 px-1 py-0.5 font-mono text-[10px]">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function EditorPane() {
  const markdown = useEditorStore((s) => s.markdown);
  const setMarkdown = useEditorStore((s) => s.setMarkdown);
  const isScrollSyncEnabled = useEditorStore((s) => s.isScrollSyncEnabled);
  const toggleScrollSync = useEditorStore((s) => s.toggleScrollSync);
  const isStatsVisible = useEditorStore((s) => s.isStatsVisible);
  const toggleStats = useEditorStore((s) => s.toggleStats);
  const registerEditorScroller = useEditorStore((s) => s.registerEditorScroller);

  const canUndo = useStore(useEditorStore.temporal, (state) => state.pastStates.length > 0);
  const canRedo = useStore(useEditorStore.temporal, (state) => state.futureStates.length > 0);

  const [isAiDialogOpen, setIsAiDialogOpen] = React.useState(false);
  const [isShortcutOpen, setIsShortcutOpen] = React.useState(false);
  const [aiSelectedText, setAiSelectedText] = React.useState<string | undefined>(undefined);
  const [isDragOver, setIsDragOver] = React.useState(false);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const stats = React.useMemo(() => calculateWordCount(markdown), [markdown]);

  const setTextareaRef = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;
      registerEditorScroller(node);
    },
    [registerEditorScroller]
  );

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

  const handleOpenAiDialog = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start !== end) {
        setAiSelectedText(textarea.value.substring(start, end));
      } else {
        setAiSelectedText(undefined);
      }
    }
    setIsAiDialogOpen(true);
  }, []);

  const handleAiDialogOpenChange = React.useCallback((open: boolean) => {
    setIsAiDialogOpen(open);
    if (!open) {
      setAiSelectedText(undefined);
    }
  }, []);

  const insertFormat = React.useCallback(
    (prefix: string, suffix = '', placeholder = 'text') => {
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
    },
    [restoreTextareaView, setMarkdown]
  );

  /**
   * Smart line-start prefix insertion for headings (# / ## / ###) and lists (- / 1.).
   */
  const insertLinePrefix = React.useCallback(
    (prefix: string, placeholder: string) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const scrollTop = textarea.scrollTop;

      const isHeadingPrefix = /^#{1,6}\s$/.test(prefix);
      const isListPrefix = prefix === '- ' || prefix === '1. ';

      // Multi-line list formatting when user selects several lines
      if (isListPrefix && start !== end && text.substring(start, end).includes('\n')) {
        const blockStart = text.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
        const nextBreak = text.indexOf('\n', end);
        const blockEnd = nextBreak === -1 ? text.length : nextBreak;
        const lines = text.substring(blockStart, blockEnd).split('\n');
        let orderedIndex = 1;
        const transformed = lines
          .map((line) => {
            if (!line.trim()) return line;
            const stripped = line.replace(/^(?:-\s+|\d+\.\s+)/, '');
            if (prefix === '1. ') {
              const item = `${orderedIndex}. ${stripped}`;
              orderedIndex += 1;
              return item;
            }
            return `- ${stripped}`;
          })
          .join('\n');

        const newText = text.substring(0, blockStart) + transformed + text.substring(blockEnd);
        setMarkdown(newText);
        setTimeout(() => {
          restoreTextareaView(blockStart, blockStart + transformed.length, scrollTop);
        }, 0);
        return;
      }

      const lineStart = text.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
      const nextBreak = text.indexOf('\n', start);
      const lineEnd = nextBreak === -1 ? text.length : nextBreak;
      const currentLine = text.substring(lineStart, lineEnd);

      if (!currentLine.trim()) {
        const replacement = `${prefix}${placeholder}`;
        const newText = text.substring(0, lineStart) + replacement + text.substring(lineEnd);
        setMarkdown(newText);
        setTimeout(() => {
          restoreTextareaView(
            lineStart + prefix.length,
            lineStart + replacement.length,
            scrollTop
          );
        }, 0);
        return;
      }

      if (isHeadingPrefix) {
        const existingHeadingMatch = currentLine.match(/^(#{1,6}\s+)/);
        let nextLine: string;
        let delta: number;

        if (existingHeadingMatch) {
          const existingPrefix = existingHeadingMatch[1];
          if (existingPrefix === prefix) {
            nextLine = currentLine.slice(existingPrefix.length);
            delta = -existingPrefix.length;
          } else {
            nextLine = prefix + currentLine.slice(existingPrefix.length);
            delta = prefix.length - existingPrefix.length;
          }
        } else {
          nextLine = prefix + currentLine;
          delta = prefix.length;
        }

        const newText = text.substring(0, lineStart) + nextLine + text.substring(lineEnd);
        const nextPos = Math.max(lineStart, start + delta);
        setMarkdown(newText);
        setTimeout(() => {
          restoreTextareaView(nextPos, nextPos, scrollTop);
        }, 0);
        return;
      }

      if (isListPrefix) {
        const existingListMatch = currentLine.match(/^(?:-\s+|\d+\.\s+)/);
        let nextLine: string;
        let delta: number;

        if (existingListMatch) {
          const existing = existingListMatch[0];
          const wantsOrdered = prefix === '1. ';
          const isCurrentlyOrdered = /^\d+\.\s+/.test(existing);
          if (wantsOrdered === isCurrentlyOrdered) {
            nextLine = currentLine.slice(existing.length);
            delta = -existing.length;
          } else {
            nextLine = prefix + currentLine.slice(existing.length);
            delta = prefix.length - existing.length;
          }
        } else {
          nextLine = prefix + currentLine;
          delta = prefix.length;
        }

        const newText = text.substring(0, lineStart) + nextLine + text.substring(lineEnd);
        const nextPos = Math.max(lineStart, start + delta);
        setMarkdown(newText);
        setTimeout(() => {
          restoreTextareaView(nextPos, nextPos, scrollTop);
        }, 0);
      }
    },
    [restoreTextareaView, setMarkdown]
  );

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

  const insertImageFiles = React.useCallback(
    async (files: File[]) => {
      const imageFiles = files.filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length === 0) return;

      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const text = textarea.value;
      const scrollTop = textarea.scrollTop;

      const mdImages: string[] = [];
      for (const file of imageFiles) {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
        if (dataUrl) {
          const name = file.name.replace(/\.[^.]+$/, '') || 'image';
          mdImages.push(`![${name}](${dataUrl})`);
        }
      }

      if (mdImages.length === 0) return;

      const insertion = '\n' + mdImages.join('\n') + '\n';
      const newText = text.substring(0, cursorPos) + insertion + text.substring(cursorPos);
      setMarkdown(newText);

      const newCursor = cursorPos + insertion.length;
      setTimeout(() => restoreTextareaView(newCursor, newCursor, scrollTop), 0);
      toast.success(`已插入 ${mdImages.length} 张图片`);
    },
    [setMarkdown, restoreTextareaView]
  );

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) setIsDragOver(true);
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      void insertImageFiles(Array.from(e.dataTransfer.files));
    },
    [insertImageFiles]
  );

  const handleImagePaste = React.useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = event.clipboardData?.items;
      if (!items) return false;
      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length === 0) return false;
      event.preventDefault();
      void insertImageFiles(imageFiles);
      return true;
    },
    [insertImageFiles]
  );

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
    toast.success('外链已转换为文末引用');
  }, [markdown, setMarkdown]);

  const handleSaveShortcut = React.useCallback(async () => {
    const docState = useDocumentStore.getState();
    const currentDoc = docState.currentDocument;

    if (isTauriRuntime() && currentDoc?.path) {
      const result = await saveDocumentToFile(markdown, {
        defaultName: currentDoc.name,
        path: currentDoc.path,
      });

      if (result.success) {
        docState.markCurrentDocumentSaved({
          content: markdown,
          name: result.name || currentDoc.name,
          path: result.path ?? currentDoc.path,
          lastSavedAt: result.savedAt,
        });
        toast.success('已保存当前文档');
      } else if (result.error && result.error !== '已取消保存。') {
        toast.error(result.error);
      }
      return;
    }

    useHistoryStore.getState().addSnapshot(markdown, '手动保存', currentDoc?.id);
    toast.success('已保存版本快照');
  }, [markdown]);

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
        insertLinePrefix('# ', '一级标题');
        break;
      case 'format_h2':
        insertLinePrefix('## ', '二级标题');
        break;
      case 'format_h3':
        insertLinePrefix('### ', '三级标题');
        break;
      case 'format_ul':
        insertLinePrefix('- ', '列表项');
        break;
      case 'format_ol':
        insertLinePrefix('1. ', '列表项');
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

    let cancelled = false;
    const cleanupRef: { current: (() => void) | null } = { current: null };

    (async () => {
      const { listen } = await import('@tauri-apps/api/event');
      if (cancelled) return;
      const unlisten = await listen('menu-event', (event) => {
        handleMenuEvent(event.payload as string);
      });
      if (cancelled) {
        unlisten();
      } else {
        cleanupRef.current = unlisten;
      }
    })();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
    };
  }, []);

  const onPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (handleImagePaste(event)) return;
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
      case 'd':
        event.preventDefault();
        insertFormat('~~', '~~', '删除线');
        break;
      case 'e':
        event.preventDefault();
        insertFormat('`', '`', '代码');
        break;
      case 'k':
        event.preventDefault();
        insertFormat('[', '](url)', '链接文字');
        break;
      case '1':
        event.preventDefault();
        insertLinePrefix('# ', '一级标题');
        break;
      case '2':
        event.preventDefault();
        insertLinePrefix('## ', '二级标题');
        break;
      case '3':
        event.preventDefault();
        insertLinePrefix('### ', '三级标题');
        break;
      case 'u':
        event.preventDefault();
        insertLinePrefix(isShift ? '1. ' : '- ', '列表项');
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
      case 's':
        event.preventDefault();
        void handleSaveShortcut();
        break;
      case '/':
        event.preventDefault();
        setIsShortcutOpen(true);
        break;
      default:
        break;
    }
  };

  return (
    <div className="group relative flex h-full w-full flex-col bg-card/55 dark:bg-card/35">
      <AiAssistDialog
        open={isAiDialogOpen}
        onOpenChange={handleAiDialogOpenChange}
        selectedText={aiSelectedText}
      />
      <ShortcutDialog open={isShortcutOpen} onOpenChange={setIsShortcutOpen} />

      {/* Editor Toolbar */}
      <div className="sticky top-0 z-10 flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-b border-border/75 bg-card/85 px-3 py-1.5 backdrop-blur-md sm:px-4">
        <div className="flex flex-wrap items-center gap-0.5">
          <ToolbarIconButton
            label="撤销"
            shortcut="⌘Z"
            disabled={!canUndo}
            onClick={() => useEditorStore.temporal.getState().undo()}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </ToolbarIconButton>
          <ToolbarIconButton
            label="重做"
            shortcut="⌘⇧Z"
            disabled={!canRedo}
            onClick={() => useEditorStore.temporal.getState().redo()}
          >
            <Redo2 className="h-3.5 w-3.5" />
          </ToolbarIconButton>

          <div className="mx-1 h-4 w-px bg-border/80" />

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    aria-label="标题层级"
                    className="h-7 gap-0.5 px-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Heading className="h-3.5 w-3.5" />
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>标题层级 (⌘1 / ⌘2 / ⌘3)</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem onClick={() => insertLinePrefix('# ', '一级标题')}>
                <Heading1 className="h-4 w-4 text-muted-foreground" />
                <span>一级标题</span>
                <kbd className="ml-auto font-mono text-[10px] text-muted-foreground">⌘1</kbd>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => insertLinePrefix('## ', '二级标题')}>
                <Heading2 className="h-4 w-4 text-muted-foreground" />
                <span>二级标题</span>
                <kbd className="ml-auto font-mono text-[10px] text-muted-foreground">⌘2</kbd>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => insertLinePrefix('### ', '三级标题')}>
                <Heading3 className="h-4 w-4 text-muted-foreground" />
                <span>三级标题</span>
                <kbd className="ml-auto font-mono text-[10px] text-muted-foreground">⌘3</kbd>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ToolbarIconButton
            label="粗体"
            shortcut="⌘B"
            onClick={() => insertFormat('**', '**', '粗体')}
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarIconButton>
          <ToolbarIconButton
            label="斜体"
            shortcut="⌘I"
            onClick={() => insertFormat('*', '*', '斜体')}
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarIconButton>
          <ToolbarIconButton
            label="删除线"
            shortcut="⌘D"
            onClick={() => insertFormat('~~', '~~', '删除线')}
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </ToolbarIconButton>

          <div className="mx-1 h-4 w-px bg-border/80" />

          <ToolbarIconButton label="引用" onClick={insertBlockquote}>
            <Quote className="h-3.5 w-3.5" />
          </ToolbarIconButton>
          <ToolbarIconButton
            label="行内代码"
            shortcut="⌘E"
            onClick={() => insertFormat('`', '`', 'code')}
          >
            <Braces className="h-3.5 w-3.5" />
          </ToolbarIconButton>
          <ToolbarIconButton
            label="代码块"
            onClick={() => insertFormat('```\n', '\n```', '代码块')}
          >
            <Code className="h-3.5 w-3.5" />
          </ToolbarIconButton>

          <div className="mx-1 h-4 w-px bg-border/80" />

          <ToolbarIconButton
            label="插入链接"
            shortcut="⌘K"
            onClick={() => insertFormat('[', '](url)', '链接文字')}
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </ToolbarIconButton>
          <ToolbarIconButton
            label="插入图片"
            onClick={() => insertFormat('![', '](url)', '图片描述')}
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </ToolbarIconButton>

          <div className="mx-1 h-4 w-px bg-border/80" />

          <ToolbarIconButton
            label="无序列表"
            shortcut="⌘U"
            onClick={() => insertLinePrefix('- ', '列表项')}
          >
            <List className="h-3.5 w-3.5" />
          </ToolbarIconButton>
          <ToolbarIconButton
            label="有序列表"
            shortcut="⌘⇧U"
            onClick={() => insertLinePrefix('1. ', '列表项')}
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarIconButton>
          <ToolbarIconButton
            label="插入表格"
            onClick={() =>
              insertFormat(
                '\n| 列 1 | 列 2 | 列 3 |\n| :--- | :---: | ---: |\n| 内容 | 内容 | 内容 |\n| 内容 | 内容 | 内容 |\n',
                '\n',
                ''
              )
            }
          >
            <Table2 className="h-3.5 w-3.5" />
          </ToolbarIconButton>
          <ToolbarIconButton
            label="插入 Mermaid 流程图"
            onClick={() =>
              insertFormat('```mermaid\n', '\n```', 'graph TD\n  A[开始] --> B[结束]')
            }
          >
            <Workflow className="h-3.5 w-3.5" />
          </ToolbarIconButton>
          <ToolbarIconButton
            label="分割线"
            onClick={() => insertFormat('\n---\n', '\n', '')}
          >
            <Minus className="h-3.5 w-3.5" />
          </ToolbarIconButton>
        </div>

        {/* Right smart formatting & AI actions */}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={handleAutoFormat}
              >
                <Wand2 className="h-3.5 w-3.5" />
                <span>一键排版</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>自动优化中英文间距与空行 (⌘⇧F)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={handleWeChatLinks}
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>外链转引用</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>将 Markdown 外链转为微信文末参考 (⌘⇧L)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                size="xs"
                className="h-7 gap-1 border border-primary/20 bg-primary/8 px-2.5 text-xs font-medium text-primary hover:bg-primary/14"
                onClick={handleOpenAiDialog}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI 助手</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>润色、排版、摘要、扩写（选中文本时局部处理）</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Markdown Source Area */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {isDragOver && (
          <div className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 backdrop-blur-xs">
            <div className="flex flex-col items-center gap-2 text-primary">
              <ImageIcon className="h-8 w-8" />
              <span className="text-sm font-medium">松开鼠标插入图片</span>
            </div>
          </div>
        )}
        <Textarea
          ref={setTextareaRef}
          value={markdown}
          onChange={(event) => setMarkdown(event.target.value)}
          onPaste={onPaste}
          onKeyDown={handleKeyDown}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="min-h-0 flex-1 resize-none rounded-none border-0 bg-transparent px-6 py-6 font-mono text-[15px] leading-[1.85] text-foreground shadow-none placeholder:text-muted-foreground/55 focus-visible:ring-0 sm:px-8 sm:py-7 lg:px-10 [field-sizing:fixed]"
          placeholder="开始书写 Markdown，或直接粘贴飞书 / Notion / Word 富文本..."
        />
      </div>

      {/* Compact Status Footer */}
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-t border-border/70 bg-card/75 px-3 text-[11.5px] text-muted-foreground backdrop-blur-md sm:px-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <Wand2 className="h-3.5 w-3.5 shrink-0 text-brand-accent" />
          <span className="truncate">
            <span className="hidden sm:inline">
              支持粘贴飞书 / Notion / Word 富文本 · 拖拽或粘贴图片自动插入
            </span>
            <span className="sm:hidden">支持粘贴富文本与图片拖拽</span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleScrollSync}
                className={cn(
                  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors',
                  isScrollSyncEnabled
                    ? 'bg-primary/10 text-primary hover:bg-primary/15'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {isScrollSyncEnabled ? (
                  <Link className="h-3 w-3" />
                ) : (
                  <Unlink className="h-3 w-3" />
                )}
                <span className="hidden md:inline">
                  {isScrollSyncEnabled ? '联动滚动' : '独立滚动'}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent>切换编辑区与预览区同步滚动</TooltipContent>
          </Tooltip>

          <span className="h-3 w-px bg-border/80" />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleStats}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] transition-colors hover:bg-muted hover:text-foreground"
              >
                <span>{stats.charCount} 字</span>
                <span className="text-muted-foreground/60">·</span>
                <span>约 {stats.readTime} 分钟</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {isStatsVisible ? '点击隐藏预览区字数卡片' : '点击在预览区显示字数卡片'}
            </TooltipContent>
          </Tooltip>

          <span className="h-3 w-px bg-border/80" />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setIsShortcutOpen(true)}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="打开快捷键指南"
              >
                <Keyboard className="h-3 w-3" />
                <span className="hidden sm:inline">⌘/</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>查看键盘快捷键</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
