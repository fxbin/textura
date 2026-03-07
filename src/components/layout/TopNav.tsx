'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Download, Copy, PanelRightClose, PanelRightOpen,
  FileText, ChevronDown, FolderOpen, Save, Check,
  RotateCcw, Sparkles, Printer, FileCode, FileImage, File, Clock
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import juice from 'juice';
import { SettingsDialog } from './SettingsDialog';
import { HistoryDialog } from './HistoryDialog';
import { useEditorStore } from '@/store/useEditorStore';
import { saveDocumentToFile, openDocumentFromFile } from '@/store/documentStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeSelector } from '@/components/editor/ThemeSelector';
import { examples } from '@/lib/examples';

export function TopNav() {
  const { 
    isSidebarOpen, 
    toggleSidebar, 
    resetMarkdown, 
    fontSize, 
    setFontSize, 
    markdown, 
    setMarkdown,
    isStatsVisible,
    toggleStats
  } = useEditorStore();

  const handleReset = () => {
    if (window.confirm('确定要恢复默认示例内容吗？当前内容将被覆盖。')) {
      resetMarkdown();
      toast.success('已恢复默认示例');
    }
  };

  const handleLoadExample = (content: string, name: string) => {
    if (window.confirm(`确定要加载示例“${name}”吗？当前内容将被覆盖。`)) {
      setMarkdown(content);
      toast.success(`已加载示例：${name}`);
    }
  };

  const handleSaveMarkdown = async () => {
    const result = await saveDocumentToFile(markdown, 'document.md');
    if (result.success) {
      toast.success('Markdown 文档已保存');
    }
  };

  const handleExportHtml = () => {
    try {
      const previewElement = document.querySelector('.heti');
      if (!previewElement) {
        toast.error('未找到预览内容');
        return;
      }

      const htmlContent = previewElement.outerHTML;
      const styleTag = previewElement.parentElement?.querySelector('style');
      const css = styleTag ? styleTag.innerHTML : '';

      const inlinedHtml = juice(htmlContent, {
        extraCss: css,
        applyStyleTags: true,
        removeStyleTags: true,
        preserveImportant: true
      });

      const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Textura Export</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #fff;">
  ${inlinedHtml}
</body>
</html>`;

      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `textura-export-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('HTML 已导出');
    } catch (e) {
      console.error('Export HTML failed:', e);
      toast.error('导出 HTML 失败');
    }
  };

  const handleExportPdf = () => {
    window.print();
  };

  const handleOpen = async () => {
    const result = await openDocumentFromFile();
    if (result.success && result.content !== undefined) {
      setMarkdown(result.content);
      toast.success(`已打开: ${result.name}`);
    }
  };

  const fontSizes = [
    { size: 14, label: '更小' },
    { size: 15, label: '稍小' },
    { size: 16, label: '推荐' },
    { size: 17, label: '稍大' },
    { size: 18, label: '更大' },
  ];

  const handleCopy = () => {
    try {
      const previewElement = document.querySelector('.heti');
      if (!previewElement) {
        toast.error('未找到预览内容');
        return;
      }

      const htmlContent = previewElement.outerHTML;
      const styleTag = previewElement.parentElement?.querySelector('style');
      const css = styleTag ? styleTag.innerHTML : '';

      const inlinedHtml = juice(htmlContent, {
        extraCss: css,
        applyStyleTags: true,
        removeStyleTags: true,
        preserveImportant: true
      });

      const blob = new Blob([inlinedHtml], { type: 'text/html' });
      const plainText = new Blob([previewElement.textContent || ''], { type: 'text/plain' });

      const item = new ClipboardItem({
        'text/html': blob,
        'text/plain': plainText
      });

      navigator.clipboard.write([item]).then(() => {
        toast.success('已复制到剪贴板，请直接粘贴到公众号后台');
      }).catch((err) => {
        console.error('Clipboard write failed:', err);
        legacyCopy(inlinedHtml);
      });

    } catch (e) {
      console.error('Copy failed:', e);
      toast.error('复制失败，请重试');
    }
  };

  const legacyCopy = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    const range = document.createRange();
    range.selectNode(tempDiv);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      try {
        document.execCommand('copy');
        toast.success('已复制到剪贴板 (Legacy Mode)');
      } catch (e) {
        toast.error('复制失败');
      }
      selection.removeAllRanges();
    }
    document.body.removeChild(tempDiv);
  }

  return (
    <header className="h-14 border-b border-border/40 bg-background/80 backdrop-blur-xl flex items-center px-4 justify-between flex-none z-50 sticky top-0 w-full shrink-0 transition-all duration-300">
      {/* Left: Brand */}
      <div className="flex items-center gap-3 select-none">
        <div className="flex items-center gap-2 group cursor-pointer transition-opacity hover:opacity-80">
          <div className="w-8 h-8 flex items-center justify-center overflow-hidden rounded-md">
            <Image src="/logo.png" alt="Textura Logo" width={32} height={32} className="object-cover" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-bold text-sm tracking-tight text-foreground/90">Textura</span>
            <span className="text-[10px] text-muted-foreground font-medium">禅模式排版</span>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Example Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground hidden md:flex">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-medium">示例</span>
              <ChevronDown className="w-3 h-3 opacity-50" />
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
              <RotateCcw className="w-4 h-4 mr-2" />
              恢复默认
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-4 hidden md:block" />

        {/* File Operations Group */}
        <div className="flex items-center gap-0.5 bg-secondary/50 p-1 rounded-lg border border-border/50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleReset}>
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>恢复默认示例</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleOpen}>
                <FolderOpen className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>打开文件</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Download className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>导出与保存</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSaveMarkdown}>
                <File className="w-4 h-4 mr-2 text-muted-foreground" />
                <span>保存 Markdown</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportHtml}>
                <FileCode className="w-4 h-4 mr-2 text-muted-foreground" />
                <span>导出 HTML</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPdf}>
                <Printer className="w-4 h-4 mr-2 text-muted-foreground" />
                <span>打印 / 导出 PDF</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleStats}>
                <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                <span>{isStatsVisible ? '隐藏字数统计' : '显示字数统计'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1 bg-border/40" />

        {/* Font Size & Settings */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 font-medium text-xs text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors">
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
                className="justify-between text-xs cursor-pointer"
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

        <Sheet open={isSidebarOpen} onOpenChange={toggleSidebar}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground gap-1.5"
            >
              <PanelRightOpen className="w-4 h-4" />
              <span className="text-xs font-medium">样式模板</span>
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col bg-background border-l">
             <SheetHeader className="px-6 py-4 border-b shrink-0">
               <SheetTitle className="text-base font-medium">选择排版样式</SheetTitle>
             </SheetHeader>
             <div className="flex-1 overflow-hidden">
               <ThemeSelector />
             </div>
          </SheetContent>
        </Sheet>

        <Separator orientation="vertical" className="h-6 mx-1 bg-border/40" />

        {/* Primary Action */}
        <Button
          onClick={handleCopy}
          size="sm"
          className="h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-95 font-medium text-xs gap-1.5 rounded-md"
        >
          <Copy className="w-3.5 h-3.5" />
          复制
        </Button>
      </div>
    </header>
  );
}
