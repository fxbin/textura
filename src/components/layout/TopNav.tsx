'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
  Check,
  ChevronDown,
  Clock,
  Copy,
  Download,
  File,
  FileCode,
  FileText,
  FolderOpen,
  Loader2,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Printer,
  RotateCcw,
  Sparkles,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { examples } from '@/lib/examples';
import { cn } from '@/lib/utils';
import { useTauriRuntime } from '@/hooks/useTauriRuntime';
import { useWeChatCopy } from '@/hooks/useWeChatCopy';
import {
  openDocumentFromFile,
  openRecentDocument,
  saveDocumentToFile,
  useDocumentStore,
} from '@/store/documentStore';
import { useHistoryStore } from '@/store/historyStore';
import { useEditorStore } from '@/store/useEditorStore';
import { BrandLogo } from './BrandLogo';
import { HistoryDialog } from './HistoryDialog';
import { SettingsDialog } from './SettingsDialog';

interface TopNavProps {
  isCompactViewport?: boolean;
  isCompactThemeOpen?: boolean;
  onToggleThemeDrawer?: () => void;
}

interface PendingGuardAction {
  label: string;
  run: () => void | Promise<void>;
}

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

function formatDocumentMeta(currentPath?: string, source?: string, lastSavedAt?: number) {
  if (currentPath) {
    return currentPath;
  }

  if (lastSavedAt) {
    return `保存于 ${new Date(lastSavedAt).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  return formatSourceLabel(source);
}

function inlineComputedStyles(sourceElement: Element, targetElement: Element) {
  const computedStyle = window.getComputedStyle(sourceElement);
  const cssText = Array.from(computedStyle)
    .map((property) => {
      const value = computedStyle.getPropertyValue(property);
      const priority = computedStyle.getPropertyPriority(property);
      return `${property}: ${value}${priority ? ` !${priority}` : ''};`;
    })
    .join(' ');

  if (cssText) {
    targetElement.setAttribute('style', cssText);
  }

  const sourceChildren = Array.from(sourceElement.children);
  const targetChildren = Array.from(targetElement.children);
  const childCount = Math.min(sourceChildren.length, targetChildren.length);

  for (let index = 0; index < childCount; index += 1) {
    inlineComputedStyles(sourceChildren[index], targetChildren[index]);
  }
}

function clonePreviewWithInlineStyles(previewElement: HTMLElement) {
  const clone = previewElement.cloneNode(true) as HTMLElement;
  inlineComputedStyles(previewElement, clone);

  clone.id = 'print-area';
  clone.style.height = 'auto';
  clone.style.minHeight = 'auto';
  clone.style.overflow = 'visible';
  clone.style.maxWidth = '100%';
  clone.style.width = '100%';

  clone.querySelectorAll('script').forEach((node) => node.remove());

  return clone;
}

function buildStandaloneDocument(options: {
  title: string;
  shellWidth: number;
  contentHtml: string;
  printMode?: boolean;
}) {
  const { title, shellWidth, contentHtml, printMode = false } = options;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    body {
      padding: 24px;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .export-shell {
      width: min(100%, ${shellWidth}px);
      margin: 0 auto;
      background: #ffffff;
      box-sizing: border-box;
    }
    .export-shell,
    .export-shell * {
      box-sizing: border-box;
    }
    .export-shell img,
    .export-shell svg {
      max-width: 100%;
      height: auto;
    }
    ${
      printMode
        ? `
    @media print {
      body {
        padding: 0;
      }
      .export-shell {
        width: 100%;
        margin: 0;
      }
    }
    @page {
      size: A4;
      margin: 10mm;
    }`
        : ''
    }
  </style>
</head>
<body>
  <div class="export-shell">${contentHtml}</div>
</body>
</html>`;
}

export function TopNav({
  isCompactViewport = false,
  isCompactThemeOpen = false,
  onToggleThemeDrawer,
}: TopNavProps) {
  const isSidebarOpen = useEditorStore((s) => s.isSidebarOpen);
  const toggleSidebar = useEditorStore((s) => s.toggleSidebar);
  const resetMarkdown = useEditorStore((s) => s.resetMarkdown);
  const markdown = useEditorStore((s) => s.markdown);
  const setMarkdown = useEditorStore((s) => s.setMarkdown);
  const isStatsVisible = useEditorStore((s) => s.isStatsVisible);
  const toggleStats = useEditorStore((s) => s.toggleStats);

  const currentDocument = useDocumentStore((state) => state.currentDocument);
  const recentDocuments = useDocumentStore((state) => state.recentDocuments);
  const isDirty = useDocumentStore((state) => state.isDirty);
  const openDocumentSession = useDocumentStore((state) => state.openDocumentSession);
  const markCurrentDocumentSaved = useDocumentStore((state) => state.markCurrentDocumentSaved);
  const renameCurrentDocument = useDocumentStore((state) => state.renameCurrentDocument);

  const tauriRuntime = useTauriRuntime();
  const { copyToWeChat, isCopying, hasCopied, isPresetTheme } = useWeChatCopy();
  const { resolvedTheme, setTheme: setAppTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [isRenaming, setIsRenaming] = React.useState(false);
  const [draftName, setDraftName] = React.useState('');
  const [pendingAction, setPendingAction] = React.useState<PendingGuardAction | null>(null);

  const currentDocumentName = currentDocument?.name || '未命名文档.md';
  const currentDocumentMeta = formatDocumentMeta(
    currentDocument?.path,
    currentDocument?.source,
    currentDocument?.lastSavedAt
  );
  const canDirectSave = tauriRuntime && Boolean(currentDocument?.path);
  const recentEntries = recentDocuments.filter((item) => item.id !== currentDocument?.id).slice(0, 6);
  const isThemePanelOpen = isCompactViewport ? isCompactThemeOpen : isSidebarOpen;

  const startRenaming = () => {
    setDraftName(currentDocumentName);
    setIsRenaming(true);
  };

  const commitRename = () => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== currentDocumentName) {
      renameCurrentDocument(trimmed);
      toast.success('已更新文档名称');
    }
    setIsRenaming(false);
  };

  const cancelRename = () => {
    setIsRenaming(false);
    setDraftName(currentDocumentName);
  };

  const runWithUnsavedGuard = React.useCallback(
    (label: string, action: () => void | Promise<void>) => {
      if (!isDirty) {
        void action();
        return;
      }

      setPendingAction({ label, run: action });
    },
    [isDirty]
  );

  const handleConfirmDiscard = async (saveSnapshotFirst: boolean) => {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);

    if (saveSnapshotFirst) {
      useHistoryStore.getState().addSnapshot(markdown, '切换文档前备份', currentDocument?.id);
      toast.success('已备份当前版本到历史快照');
    }

    await action.run();
  };

  const handleReset = () => {
    runWithUnsavedGuard('恢复默认示例', () => {
      resetMarkdown();
      const content = useEditorStore.getState().markdown;
      openDocumentSession({
        name: '默认示例.md',
        content,
        source: 'example',
      });
      toast.success('已恢复默认示例');
    });
  };

  const handleLoadExample = (content: string, name: string) => {
    runWithUnsavedGuard(`加载示例「${name}」`, () => {
      setMarkdown(content);
      openDocumentSession({
        name: `${name}.md`,
        content,
        source: 'example',
      });
      toast.success(`已加载示例：${name}`);
    });
  };

  const handleSaveMarkdown = async (forceDialog = false) => {
    const result = await saveDocumentToFile(markdown, {
      defaultName: currentDocumentName,
      path: currentDocument?.path,
      forceDialog,
    });

    if (!result.success) {
      if (result.error && result.error !== '已取消保存。') {
        toast.error(result.error);
      }
      return;
    }

    markCurrentDocumentSaved({
      content: markdown,
      name: result.name || currentDocumentName,
      path: result.path ?? currentDocument?.path,
      lastSavedAt: result.savedAt,
    });

    if (tauriRuntime) {
      toast.success(forceDialog || !currentDocument?.path ? '已另存为 Markdown 文件' : '已保存当前文档');
    } else {
      toast.success('已下载 Markdown 文件');
    }
  };

  const handleExportHtml = () => {
    try {
      const previewElement = document.querySelector('#print-area') as HTMLElement | null;
      if (!previewElement) {
        toast.error('未找到预览内容');
        return;
      }

      const exportClone = clonePreviewWithInlineStyles(previewElement);
      const shellWidth = Math.max(Math.round(previewElement.getBoundingClientRect().width), 320);
      const baseTitle = currentDocumentName.replace(/\.(md|markdown|txt)$/i, '') || 'Textura Export';
      const fullHtml = buildStandaloneDocument({
        title: baseTitle,
        shellWidth,
        contentHtml: exportClone.outerHTML,
      });

      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${baseTitle}-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast.success('HTML 已导出');
    } catch (error) {
      console.error('Export HTML failed:', error);
      toast.error('导出 HTML 失败');
    }
  };

  const buildPdfExportMarkup = (previewElement: HTMLElement) => {
    const clone = clonePreviewWithInlineStyles(previewElement);
    const shellWidth = Math.max(Math.round(previewElement.getBoundingClientRect().width), 320);

    return buildStandaloneDocument({
      title: currentDocumentName.replace(/\.(md|markdown|txt)$/i, '') || 'Textura PDF Export',
      shellWidth,
      contentHtml: clone.outerHTML,
      printMode: true,
    });
  };

  const handleExportPdf = async () => {
    const element = document.getElementById('print-area');
    if (!element) {
      toast.error('未找到预览内容');
      return;
    }

    const markup = buildPdfExportMarkup(element);

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    toast.loading(tauriRuntime ? '正在打开系统打印窗口...' : '正在准备打印预览...', { id: 'pdf-export' });

    try {
      const frameDoc = iframe.contentDocument;
      if (!frameDoc) {
        throw new Error('初始化打印窗口失败');
      }

      frameDoc.open();
      frameDoc.write(markup);
      frameDoc.close();

      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        throw new Error('无法访问打印窗口');
      }

      toast.dismiss('pdf-export');
      toast.success(tauriRuntime ? '已打开系统打印窗口，请选择“保存为 PDF”。' : '已打开打印窗口');

      await new Promise<void>((resolve) => {
        let settled = false;
        const cleanup = () => {
          if (settled) return;
          settled = true;
          frameWindow.removeEventListener('afterprint', cleanup);
          setTimeout(() => {
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
          }, 0);
          resolve();
        };

        frameWindow.addEventListener('afterprint', cleanup, { once: true });
        setTimeout(cleanup, 2000);
        frameWindow.focus();
        frameWindow.print();
      });
    } catch (error) {
      console.error('Print export failed:', error);
      toast.dismiss('pdf-export');

      if (tauriRuntime) {
        toast.error('桌面端无法直接调起打印窗口，请重试。');
      } else {
        const fallbackWindow = window.open('', '_blank', 'noopener,noreferrer');
        if (fallbackWindow) {
          fallbackWindow.document.write(markup);
          fallbackWindow.document.close();
          toast.error('系统打印被拦截，已在新标签页打开可打印内容。');
        } else {
          toast.error('打开打印窗口失败');
        }
      }

      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    }
  };

  const handleOpen = () => {
    runWithUnsavedGuard('打开本地文件', async () => {
      const result = await openDocumentFromFile();
      if (result.success && result.content !== undefined) {
        setMarkdown(result.content);
        openDocumentSession({
          name: result.name || '导入文档.md',
          content: result.content,
          path: result.path,
          source: result.path ? 'file' : 'untitled',
        });
        toast.success(`已打开：${result.name}`);
        if (result.warning) {
          toast.warning(result.warning);
        }
        return;
      }

      if (result.error && result.error !== '已取消打开文件。') {
        toast.error(result.error);
      }
    });
  };

  const handleOpenRecent = (documentId: string) => {
    const target = recentDocuments.find((item) => item.id === documentId);
    if (!target) {
      toast.error('未找到对应的最近文档记录');
      return;
    }

    runWithUnsavedGuard(`切换至「${target.name}」`, async () => {
      const result = await openRecentDocument(target);
      if (result.success && result.content !== undefined) {
        setMarkdown(result.content);
        openDocumentSession({
          id: target.id,
          name: result.name || target.name,
          content: result.content,
          path: result.path ?? target.path,
          source: target.source,
          lastSavedAt: target.lastSavedAt,
        });
        toast.success(`已打开最近文档：${target.name}`);
        return;
      }

      toast.error(result.error || '打开最近文档失败');
    });
  };

  const handleThemeToggleClick = () => {
    if (isCompactViewport && onToggleThemeDrawer) {
      onToggleThemeDrawer();
    } else {
      toggleSidebar();
    }
  };

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <>
      <header className="sticky top-0 z-40 flex h-[52px] w-full shrink-0 items-center justify-between gap-2 border-b border-border/75 bg-background/85 px-3 backdrop-blur-xl sm:px-4">
        {/* Left: Brand + Document Workspace Capsule */}
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <BrandLogo hideWordmarkOnMobile />

          <div className="h-5 w-px shrink-0 bg-border/80" />

          <div className="flex min-w-0 items-center gap-1 rounded-lg border border-border/70 bg-card/85 px-2 py-1 shadow-2xs">
            {isRenaming ? (
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitRename();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelRename();
                  }
                }}
                autoFocus
                aria-label="重命名文档"
                className="h-6 w-32 border-primary/40 bg-background px-1.5 text-xs font-medium sm:w-44"
              />
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={startRenaming}
                    className="group/rename flex min-w-0 items-center gap-1.5 rounded px-1 py-0.5 text-left transition-colors hover:bg-muted/70"
                  >
                    <span className="max-w-[96px] truncate text-xs font-medium text-foreground sm:max-w-[180px] sm:text-[13px]">
                      {currentDocumentName}
                    </span>
                    <Pencil className="hidden h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/rename:opacity-80 sm:block" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>点击重命名文档</TooltipContent>
              </Tooltip>
            )}

            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                isDirty
                  ? 'bg-amber-500/12 text-amber-700 dark:text-amber-300'
                  : 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
              )}
              title={currentDocumentMeta}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  isDirty ? 'bg-amber-500' : 'bg-emerald-500'
                )}
              />
              <span className="hidden sm:inline">{isDirty ? '未保存' : '已保存'}</span>
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="文档与示例菜单"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                <div className="px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-foreground">
                      {currentDocumentName}
                    </span>
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {tauriRuntime ? 'Tauri 桌面端' : 'Web 版'}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    {currentDocumentMeta}
                  </p>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleOpen}>
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span>打开本地文件 (MD / TXT / DOCX)</span>
                </DropdownMenuItem>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <span>加载示例模板</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-60">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      精选排版示例
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {examples.map((example) => (
                      <DropdownMenuItem
                        key={example.id}
                        onClick={() => handleLoadExample(example.content, example.name)}
                        className="flex flex-col items-start gap-0.5 py-2"
                      >
                        <span className="text-xs font-medium">{example.name}</span>
                        <span className="text-[11px] text-muted-foreground">{example.description}</span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleReset}
                      className="text-destructive focus:text-destructive"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>恢复默认介绍文档</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
                  最近文档 ({recentEntries.length})
                </DropdownMenuLabel>
                {recentEntries.length === 0 ? (
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    暂无其他最近文档
                  </DropdownMenuItem>
                ) : (
                  recentEntries.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => handleOpenRecent(item.id)}
                      className="flex flex-col items-start gap-0.5 py-1.5"
                    >
                      <span className="w-full truncate text-xs font-medium">{item.name}</span>
                      <span className="w-full truncate text-[11px] text-muted-foreground">
                        {item.path || formatDocumentMeta(undefined, item.source, item.lastSavedAt)}
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Right: Utilities + Theme Panel Toggle + Primary Copy CTA */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="保存与导出"
                    className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden xl:inline">导出</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>保存 Markdown 或导出 HTML / PDF</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground">保存与导出</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleSaveMarkdown(false)}>
                <File className="h-4 w-4 text-muted-foreground" />
                <span>{tauriRuntime ? '保存 Markdown' : '下载 Markdown'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSaveMarkdown(true)}>
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>{tauriRuntime ? '另存为…' : '下载副本'}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportHtml}>
                <FileCode className="h-4 w-4 text-muted-foreground" />
                <span>导出独立 HTML</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPdf}>
                <Printer className="h-4 w-4 text-muted-foreground" />
                <span>打印 / 导出 PDF</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={isStatsVisible} onCheckedChange={toggleStats}>
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>附带字数与阅读时间</span>
              </DropdownMenuCheckboxItem>
              {canDirectSave && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled className="truncate text-[11px] text-muted-foreground">
                    {currentDocument?.path}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <HistoryDialog />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setAppTheme(isDark ? 'light' : 'dark')}
                aria-label="切换明暗外观"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isDark ? '切换至纸墨亮色模式' : '切换至砚台暗色模式'}</TooltipContent>
          </Tooltip>

          <SettingsDialog />

          <Button
            variant={isThemePanelOpen ? 'secondary' : 'ghost'}
            size="sm"
            onClick={handleThemeToggleClick}
            className={cn(
              'hidden h-8 gap-1.5 px-2.5 text-xs font-medium transition-colors md:inline-flex',
              isThemePanelOpen
                ? 'border border-primary/25 bg-primary/10 text-primary hover:bg-primary/15'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {isThemePanelOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
            <span className="hidden lg:inline">样式模板</span>
          </Button>

          <div className="mx-0.5 h-4 w-px bg-border/80" />

          <Button
            onClick={copyToWeChat}
            disabled={isCopying}
            size="sm"
            className={cn(
              'h-8 gap-1.5 rounded-lg px-3 text-xs font-medium shadow-xs transition-all active:scale-[0.98] sm:px-3.5',
              hasCopied
                ? 'bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:text-emerald-950'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {isCopying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : hasCopied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {hasCopied ? '已复制' : isCopying ? '处理中…' : isPresetTheme ? '复制到公众号' : '复制 HTML'}
            </span>
            <span className="sm:hidden">{hasCopied ? '已复制' : '复制'}</span>
          </Button>
        </div>
      </header>

      {/* Controlled Unsaved Changes Guard Dialog */}
      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => { if (!open) setPendingAction(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>当前文档有未保存修改</DialogTitle>
            <DialogDescription>
              文档「{currentDocumentName}」尚未保存，在{pendingAction?.label}前是否需要先保留一份快照？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setPendingAction(null)}>
              取消
            </Button>
            <Button variant="secondary" onClick={() => void handleConfirmDiscard(true)}>
              存快照并继续
            </Button>
            <Button variant="destructive" onClick={() => void handleConfirmDiscard(false)}>
              直接丢弃
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
