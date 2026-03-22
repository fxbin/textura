'use client';

import * as React from 'react';
import Image from 'next/image';
import juice from 'juice';
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
import { makeWeChatCompatible } from '@/lib/wechatCompat';
import { examples } from '@/lib/examples';
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

export function TopNav() {
  const {
    isSidebarOpen,
    setSidebarOpen,
    resetMarkdown,
    fontSize,
    setFontSize,
    markdown,
    theme,
    savedThemes,
    customThemeCss,
    setMarkdown,
    isStatsVisible,
    toggleStats,
  } = useEditorStore();
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
      const previewElement = document.querySelector('#print-area');
      if (!previewElement) {
        toast.error('未找到预览内容');
        return;
      }

      const htmlContent = (previewElement as HTMLElement).cloneNode(true) as HTMLElement;
      const styleTags = document.querySelectorAll('style');
      let css = '';
      styleTags.forEach((tag) => {
        css += tag.innerHTML;
      });

      const inlinedHtml = juice(htmlContent.innerHTML, {
        extraCss: css,
        applyStyleTags: true,
        removeStyleTags: false,
        preserveImportant: true,
      });

      const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Textura Export</title>
  <style>
    body { margin: 0; padding: 20px; background-color: #fff; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>${inlinedHtml}</body>
</html>`;

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
    const clone = previewElement.cloneNode(true) as HTMLElement;
    clone.id = 'print-area';
    clone.style.height = 'auto';
    clone.style.overflow = 'visible';

    const styles = Array.from(document.querySelectorAll('style'))
      .map((tag) => tag.innerHTML)
      .join('\n');
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map((link) => link.outerHTML)
      .join('\n');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Textura PDF Export</title>
  ${links}
  <style>
    ${styles}
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
    }
    body {
      min-height: auto;
      background-image: none !important;
    }
    .print-shell {
      width: 800px;
      margin: 0 auto;
      padding: 24px;
      box-sizing: border-box;
      background: #ffffff;
    }
    .print-shell img {
      max-width: 100%;
      height: auto;
    }
    @media print {
      body * {
        visibility: visible !important;
      }
      .print-shell {
        width: auto;
        margin: 0;
        padding: 0;
      }
      #print-area {
        position: static !important;
        left: auto !important;
        top: auto !important;
        width: auto !important;
        height: auto !important;
        overflow: visible !important;
        padding: 0 !important;
        background: #ffffff !important;
        z-index: auto !important;
      }
      #print-area, #print-area * {
        visibility: visible !important;
      }
    }
    @page {
      size: A4;
      margin: 10mm;
    }
  </style>
</head>
<body>
  <div class="print-shell">${clone.outerHTML}</div>
</body>
</html>`;
  };

  const exportPdfViaTauriBrowser = async (markup: string) => {
    const [{ writeTextFile }, { downloadDir, join }, { open }, { save }] = await Promise.all([
      import('@tauri-apps/plugin-fs'),
      import('@tauri-apps/api/path'),
      import('@tauri-apps/plugin-shell'),
      import('@tauri-apps/plugin-dialog'),
    ]);

    const fileName = `textura-print-${new Date().toISOString().split('T')[0]}.html`;

    try {
      const downloadsPath = await downloadDir();
      const targetPath = await join(downloadsPath, fileName);
      await writeTextFile(targetPath, markup);
      await open(targetPath);
      return { ok: true, usedSaveDialog: false, cancelled: false };
    } catch (error) {
      console.warn('Failed to write printable HTML to downloads:', error);
    }

    const targetPath = await save({
      defaultPath: fileName,
      filters: [{ name: 'HTML', extensions: ['html'] }],
    });

    if (!targetPath) {
      return { ok: false, usedSaveDialog: true, cancelled: true };
    }

    await writeTextFile(targetPath, markup);
    await open(targetPath);
    return { ok: true, usedSaveDialog: true, cancelled: false };
  };

  const handleExportPdf = async () => {
    const element = document.getElementById('print-area');
    if (!element) {
      toast.error('未找到预览内容');
      return;
    }

    const markup = buildPdfExportMarkup(element);

    if (tauriRuntime) {
      toast.loading('姝ｅ湪鍑嗗 PDF 鎵撳嵃鏂囨。...', { id: 'pdf-export' });

      try {
        const result = await exportPdfViaTauriBrowser(markup);
        toast.dismiss('pdf-export');

        if (!result.ok) {
          if (!result.cancelled) {
            toast.error('瀵煎嚭 PDF 澶辫触');
          }
          return;
        }

        toast.success(
          result.usedSaveDialog
            ? '宸插啓鍏ユ墦鍗版枃妗ｏ紝骞跺湪绯荤粺娴忚鍣ㄤ腑鎵撳紑銆傝浣跨敤鈥滄墦鍗?鍙︿繚瀛樹负 PDF鈥濄€?'
            : '宸插湪绯荤粺娴忚鍣ㄤ腑鎵撳紑鎵撳嵃鏂囨。銆傝浣跨敤鈥滄墦鍗?鍙︿繚瀛樹负 PDF鈥濄€?'
        );
        return;
      } catch (error) {
        console.error('Tauri PDF export failed:', error);
        toast.dismiss('pdf-export');
        toast.error('妗岄潰鐗?PDF 瀵煎嚭澶辫触');
        return;
      }
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    toast.loading('正在准备打印预览...', { id: 'pdf-export' });

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
      toast.success('已打开打印窗口');

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

      const fallbackWindow = window.open('', '_blank', 'noopener,noreferrer');
      if (fallbackWindow) {
        fallbackWindow.document.write(markup);
        fallbackWindow.document.close();
        toast.error('系统打印被拦截，已在新标签页打开可打印内容。');
      } else {
        toast.error('打开打印窗口失败');
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

      const presetTheme = theme !== 'custom' && !savedThemes.some((item) => item.id === theme);
      const html = presetTheme
        ? await makeWeChatCompatible(previewElement.innerHTML, theme)
        : `<style>${customThemeCss}</style>${previewElement.innerHTML}`;

      const result = await copyRichContent(html, markdown);
      if (!result.ok) {
        toast.error('复制失败，请检查浏览器剪贴板权限');
        return;
      }

      if (presetTheme) {
        toast.success('已复制到剪贴板，请直接粘贴到公众号后台');
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
            <Image src="/logo.png" alt="Textura Logo" width={32} height={32} className="object-cover" />
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
