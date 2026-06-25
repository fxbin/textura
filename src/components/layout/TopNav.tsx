'use client';

import * as React from 'react';
import Image from 'next/image';
import { toast } from 'sonner';

// next/image 的 string src 不会自动拼接 basePath，需手动处理。
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
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
  PanelRightOpen,
  Printer,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { copyRichContent } from '@/lib/clipboard';
import { isWeChatDarkThemeRisk, buildCopyHtml } from '@/lib/wechatCompat';
import { examples } from '@/lib/examples';
import { calculateWordCount } from '@/lib/utils';
import { ThemeSelector } from '@/components/editor/ThemeSelector';
import { useTauriRuntime } from '@/hooks/useTauriRuntime';
import {
  openDocumentFromFile,
  openRecentDocument,
  saveDocumentToFile,
  useDocumentStore,
} from '@/store/documentStore';
import { useEditorStore } from '@/store/useEditorStore';
import { SettingsDialog } from './SettingsDialog';
import { HistoryDialog } from './HistoryDialog';

function formatDocumentMeta(currentPath?: string, source?: string, lastSavedAt?: number) {
  if (currentPath) {
    return currentPath;
  }

  if (lastSavedAt) {
    return `上次保存：${new Date(lastSavedAt).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  switch (source) {
    case 'example':
      return '示例文档';
    case 'recovery':
      return '恢复草稿';
    case 'file':
      return '本地文件';
    default:
      return '本地草稿';
  }
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

export function TopNav() {
  const isSidebarOpen = useEditorStore((s) => s.isSidebarOpen);
  const setSidebarOpen = useEditorStore((s) => s.setSidebarOpen);
  const resetMarkdown = useEditorStore((s) => s.resetMarkdown);
  const fontSize = useEditorStore((s) => s.fontSize);
  const setFontSize = useEditorStore((s) => s.setFontSize);
  const markdown = useEditorStore((s) => s.markdown);
  const theme = useEditorStore((s) => s.theme);
  const savedThemes = useEditorStore((s) => s.savedThemes);
  const customThemeCss = useEditorStore((s) => s.customThemeCss);
  const setMarkdown = useEditorStore((s) => s.setMarkdown);
  const isStatsVisible = useEditorStore((s) => s.isStatsVisible);
  const toggleStats = useEditorStore((s) => s.toggleStats);
  const currentDocument = useDocumentStore((state) => state.currentDocument);
  const recentDocuments = useDocumentStore((state) => state.recentDocuments);
  const isDirty = useDocumentStore((state) => state.isDirty);
  const openDocumentSession = useDocumentStore((state) => state.openDocumentSession);
  const markCurrentDocumentSaved = useDocumentStore((state) => state.markCurrentDocumentSaved);
  const tauriRuntime = useTauriRuntime();

  const currentDocumentName = currentDocument?.name || '未命名文档.md';
  const currentDocumentMeta = formatDocumentMeta(currentDocument?.path, currentDocument?.source, currentDocument?.lastSavedAt);
  const canDirectSave = tauriRuntime && Boolean(currentDocument?.path);
  const recentEntries = recentDocuments.filter((item) => item.id !== currentDocument?.id).slice(0, 6);

  const confirmDiscardChanges = React.useCallback(
    (actionLabel: string) => {
      if (!isDirty) {
        return true;
      }

      return window.confirm(`当前文档“${currentDocumentName}”还有未保存修改，仍要${actionLabel}吗？`);
    },
    [currentDocumentName, isDirty]
  );

  const handleReset = () => {
    if (!confirmDiscardChanges('恢复默认示例')) {
      return;
    }

    resetMarkdown();
    const content = useEditorStore.getState().markdown;
    openDocumentSession({
      name: '默认示例.md',
      content,
      source: 'example',
    });
    toast.success('已恢复默认示例');
  };

  const handleLoadExample = (content: string, name: string) => {
    if (!confirmDiscardChanges(`加载示例“${name}”`)) {
      return;
    }

    setMarkdown(content);
    openDocumentSession({
      name: `${name}.md`,
      content,
      source: 'example',
    });
    toast.success(`已加载示例：${name}`);
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
      const fullHtml = buildStandaloneDocument({
        title: 'Textura Export',
        shellWidth,
        contentHtml: exportClone.outerHTML,
      });

      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `textura-export-${new Date().toISOString().split('T')[0]}.html`;
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
      title: 'Textura PDF Export',
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
          if (settled) {
            return;
          }
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

  const handleOpen = async () => {
    if (!confirmDiscardChanges('打开新文件')) {
      return;
    }

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
  };

  const handleOpenRecent = async (documentId: string) => {
    if (!confirmDiscardChanges('打开最近文档')) {
      return;
    }

    const target = recentDocuments.find((item) => item.id === documentId);
    if (!target) {
      toast.error('未找到对应的最近文档记录');
      return;
    }

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
  };

  const handleCopy = async () => {
    try {
      const previewElement = document.getElementById('print-area');
      if (!previewElement) {
        toast.error('未找到预览内容');
        return;
      }

      const isPresetTheme = theme !== 'custom' && !savedThemes.some((item) => item.id === theme);

      const statsHtml = isStatsVisible
        ? (() => {
            const { charCount, readTime } = calculateWordCount(markdown);
            return `
      <section style="
        margin: 20px 10px;
        text-align: center;
        font-size: 14px;
        color: #888;
        letter-spacing: 0.5px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      ">
        <span style="
          display: inline-block;
          padding: 4px 12px;
          background-color: #f7f7f7;
          border-radius: 100px;
          border: 1px solid #eee;
          white-space: nowrap;
          line-height: 1.4;
        ">
          字数 ${charCount} <span style="margin: 0 4px; color: #ddd;">|</span> 约 ${readTime} 分钟
        </span>
      </section>
    `;
          })()
        : '';

      const html = await buildCopyHtml(
        previewElement.innerHTML,
        theme,
        isPresetTheme,
        customThemeCss,
        statsHtml,
      );

      const result = await copyRichContent(html, markdown);
      if (!result.ok) {
        toast.error('复制失败，请检查浏览器剪贴板权限');
        return;
      }

      if (isPresetTheme) {
        if (isWeChatDarkThemeRisk(theme)) {
          toast.warning('当前为暗色主题，微信可能剥离深色背景导致文字不可见。建议使用浅色主题。');
        } else {
          toast.success('已复制到剪贴板，请直接粘贴到公众号后台');
        }
      } else {
        toast.warning('已复制当前预览 HTML。自定义主题在微信中可能丢失样式。');
      }
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('复制失败，请重试');
    }
  };

  const fontSizes = [
    { size: 14, label: '更小' },
    { size: 15, label: '稍小' },
    { size: 16, label: '推荐' },
    { size: 17, label: '稍大' },
    { size: 18, label: '更大' },
  ];

  return (
    <header className="sticky top-0 z-50 flex h-14 w-full shrink-0 items-center justify-between border-b border-border/40 bg-background/80 px-4 backdrop-blur-xl transition-all duration-300">
      <div className="flex min-w-0 items-center gap-3">
        <div className="group flex shrink-0 cursor-pointer items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md">
            <Image src={`${BASE_PATH}/logo.png`} alt="Textura Logo" width={32} height={32} className="object-cover" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-sm font-bold tracking-tight text-foreground/90">Textura</span>
            <span className="text-[10px] font-medium text-muted-foreground">Typesetting Studio</span>
          </div>
        </div>

        <div className="hidden min-w-0 border-l pl-3 md:flex md:flex-col">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{currentDocumentName}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                isDirty ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {isDirty ? '未保存' : '已保存'}
            </span>
          </div>
          <span className="truncate text-[11px] text-muted-foreground">{currentDocumentMeta}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 md:gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="hidden h-8 gap-1.5 text-muted-foreground hover:text-foreground md:flex">
              <FileText className="h-4 w-4" />
              <span className="text-xs font-medium">示例</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>加载示例内容</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {examples.map((example) => (
              <DropdownMenuItem
                key={example.id}
                onClick={() => handleLoadExample(example.content, example.name)}
                className="flex flex-col items-start gap-1 py-2"
              >
                <span className="font-medium">{example.name}</span>
                <span className="text-xs text-muted-foreground">{example.description}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleReset} className="text-destructive focus:text-destructive">
              <RotateCcw className="mr-2 h-4 w-4" />
              恢复默认
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="hidden h-4 md:block" />

        <div className="flex items-center gap-0.5 rounded-lg border border-border/50 bg-secondary/50 p-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleReset}>
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>恢复默认示例</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <FolderOpen className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>文档</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleOpen}>打开本地文件</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">最近文档</DropdownMenuLabel>
              {recentEntries.length === 0 ? (
                <DropdownMenuItem disabled>暂无最近文档</DropdownMenuItem>
              ) : (
                recentEntries.map((item) => (
                  <DropdownMenuItem key={item.id} onClick={() => handleOpenRecent(item.id)} className="flex flex-col items-start gap-0.5 py-2">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.path || formatDocumentMeta(undefined, item.source, item.lastSavedAt)}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Download className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>导出与保存</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleSaveMarkdown(false)}>
                <File className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{tauriRuntime ? '保存 Markdown' : '下载 Markdown'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSaveMarkdown(true)}>
                <File className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{tauriRuntime ? '另存为…' : '下载副本'}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportHtml}>
                <FileCode className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>导出 HTML</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPdf}>
                <Printer className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>打印 / 导出 PDF</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleStats}>
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{isStatsVisible ? '隐藏字数统计' : '显示字数统计'}</span>
              </DropdownMenuItem>
              {canDirectSave && <DropdownMenuSeparator />}
              {canDirectSave && (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  当前文件：{currentDocument?.path}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator orientation="vertical" className="mx-1 h-6 bg-border/40" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground">
              <span>{fontSize}px</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[150px]">
            <DropdownMenuLabel className="text-xs text-muted-foreground">正文字号</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {fontSizes.map((item) => (
              <DropdownMenuItem
                key={item.size}
                onClick={() => setFontSize(item.size)}
                className="cursor-pointer justify-between text-xs"
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono">{item.size}px</span>
                  {fontSize === item.size && <Check className="h-3.5 w-3.5 text-primary" />}
                </span>
                <span className="text-muted-foreground">{item.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <SettingsDialog />
        <HistoryDialog />

        <Sheet open={isSidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground">
              <PanelRightOpen className="h-4 w-4" />
              <span className="text-xs font-medium">样式模板</span>
            </Button>
          </SheetTrigger>
          <SheetContent className="flex w-[400px] flex-col border-l bg-background p-0 sm:w-[540px]">
            <SheetHeader className="shrink-0 border-b px-6 py-4">
              <SheetTitle className="text-base font-medium">选择排版样式</SheetTitle>
              <SheetDescription className="sr-only">
                切换预设主题或编辑自定义样式，并在预览区即时查看排版效果。
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-hidden">
              <ThemeSelector />
            </div>
          </SheetContent>
        </Sheet>

        <Separator orientation="vertical" className="mx-1 h-6 bg-border/40" />

        <Button
          onClick={handleCopy}
          size="sm"
          className="h-8 gap-1.5 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
        >
          <Copy className="h-3.5 w-3.5" />
          复制
        </Button>
      </div>
    </header>
  );
}
