'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, Monitor, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useEditorStore } from '@/store/useEditorStore';
import { THEMES } from '@/lib/themes/index';
import { md, applyTheme } from '@/lib/markdown';
import { resolveImagePaths } from '@/lib/imageResolver';
import { makeWeChatCompatible, convertLinksToFootnotes, isWeChatDarkThemeRisk } from '@/lib/wechatCompat';
import { copyRichContent } from '@/lib/clipboard';
import { cn, calculateWordCount } from '@/lib/utils';
import 'heti/umd/heti.min.css';
import 'highlight.js/styles/github.css';
import DeviceFrame from '@/components/preview/DeviceFrame';
import { renderMermaidInHtml } from '@/lib/mermaid';
import { Mermaid } from './Mermaid';

export function PreviewPane() {
  const {
    markdown,
    theme,
    fontSize,
    deviceModel,
    setDeviceModel,
    customWidth,
    customHeight,
    setCustomSize,
    customThemeCss,
    isStatsVisible,
    isHetiEnabled,
    imageBasePath,
    registerPreviewScroller,
  } = useEditorStore();
  const [mounted, setMounted] = React.useState(false);
  const [htmlContent, setHtmlContent] = React.useState('');
  const deferredMarkdown = React.useDeferredValue(markdown);
  const setPreviewViewportRef = React.useCallback((node: HTMLDivElement | null) => {
    registerPreviewScroller(node);
  }, [registerPreviewScroller]);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isPresetTheme = React.useMemo(() => THEMES.some((item) => item.id === theme), [theme]);

  React.useEffect(() => {
    if (!isPresetTheme) return;

    let cancelled = false;
    const debounceId = setTimeout(async () => {
      const rawHtml = md.render(deferredMarkdown);
      const resolvedHtml = resolveImagePaths(rawHtml, imageBasePath);
      const themedHtml = applyTheme(resolvedHtml, theme, fontSize);
      const styledHtml = await renderMermaidInHtml(themedHtml);

      if (!cancelled) {
        setHtmlContent(styledHtml);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(debounceId);
    };
  }, [deferredMarkdown, theme, fontSize, isPresetTheme, imageBasePath]);

  const stats = React.useMemo(() => {
    const { charCount, readTime } = calculateWordCount(deferredMarkdown);
    return {
      count: charCount,
      time: readTime,
    };
  }, [deferredMarkdown]);

  const buildStatsHtml = React.useCallback(() => {
    if (!isStatsVisible) {
      return '';
    }

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
          字数 ${stats.count} <span style="margin: 0 4px; color: #ddd;">|</span> 约 ${stats.time} 分钟
        </span>
      </section>
    `;
  }, [isStatsVisible, stats.count, stats.time]);

  const handleCopy = async () => {
    try {
      let contentToCopy = '';
      const statsHtml = buildStatsHtml();

      if (isPresetTheme) {
        contentToCopy = await makeWeChatCompatible(htmlContent, theme);
      } else {
        const previewHtml = contentRef.current?.innerHTML;
        if (!previewHtml) {
          toast.error('未找到可复制的预览内容');
          return;
        }

        contentToCopy = convertLinksToFootnotes(
          `<style>${customThemeCss}</style>${previewHtml}`
        );
      }

      if (statsHtml) {
        contentToCopy = statsHtml + contentToCopy;
      }

      const copyResult = await copyRichContent(contentToCopy, deferredMarkdown);
      if (!copyResult.ok) {
        toast.error('复制失败，请检查浏览器剪贴板权限');
        return;
      }

      if (isPresetTheme) {
        if (isWeChatDarkThemeRisk(theme)) {
          toast.warning('当前为暗色主题，微信可能剥离深色背景导致文字不可见。建议使用浅色主题。');
        } else {
          toast.success(
            copyResult.method === 'clipboard'
              ? '已复制到剪贴板，可直接粘贴到微信公众号'
              : '已通过兼容模式复制，可尝试直接粘贴到微信公众号'
          );
        }
      } else {
        toast.warning('已复制当前预览 HTML。自定义主题仅保证本地预览，粘贴到微信时可能丢失样式。');
      }
    } catch (error) {
      console.error(error);
      toast.error('生成复制内容失败');
    }
  };

  const renderContent = () => (
    <div
      id="print-area"
      className={cn(
        'flex-1 overflow-y-auto overflow-x-hidden no-scrollbar bg-white h-full',
        deviceModel === 'pc' ? 'px-8 md:px-12 lg:px-16 py-8' : 'px-0'
      )}
    >
      <div className="min-h-full" ref={contentRef}>
        {!mounted ? (
          <div className="flex h-32 w-full items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        ) : (
          <>
            {isStatsVisible && (
              <div
                className="animate-in fade-in slide-in-from-top-2 mt-4 mb-6 flex justify-center select-none print:hidden"
                title="此统计信息会跟随复制内容一起输出"
              >
                <div className="inline-flex max-w-full cursor-help items-center gap-3 whitespace-nowrap rounded-full border border-black/5 bg-black/5 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm transition-all hover:bg-black/10 dark:border-white/5 dark:bg-white/10 dark:hover:bg-white/15">
                  <span className="font-mono whitespace-nowrap">字数 {stats.count}</span>
                  <span className="h-3 w-px shrink-0 bg-border/50" />
                  <span className="whitespace-nowrap">约 {stats.time} 分钟</span>
                </div>
              </div>
            )}

            {isPresetTheme ? (
              // WeChat Mode: Raw HTML with inline styles
              <div
                className={cn(isHetiEnabled && 'heti')}
                dangerouslySetInnerHTML={{ __html: htmlContent }}
                style={{
                  fontSize: `${fontSize}px`,
                  // Styles are already inlined by applyTheme, but container padding/etc comes from theme logic
                }}
              />
            ) : (
              <>
                <style dangerouslySetInnerHTML={{ __html: customThemeCss }} />
                <article
                  className={cn('heti', 'prose prose-slate max-w-none p-5 pb-10')}
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.75,
                    textAlign: 'justify',
                  }}
                >
                  <ReactMarkdown
                    rehypePlugins={[rehypeRaw, rehypeHighlight]}
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                      img: ({ ...props }) => {
                        // eslint-disable-next-line @next/next/no-img-element
                        return <img alt="" className="my-4 w-full rounded-lg shadow-sm" {...props} />;
                      },
                      code: ({ inline, className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const isMermaid = match && match[1] === 'mermaid';

                        if (!inline && isMermaid) {
                          return <Mermaid chart={String(children).replace(/\n$/, '')} />;
                        }

                        return (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {markdown}
                  </ReactMarkdown>
                </article>
              </>
            )}

            <div className="h-8" />
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#f5f5f7] dark:bg-[#000000]">
      <div className="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-4 border-b border-black/5 bg-[#f5f5f7]/80 px-4 py-3 backdrop-blur-xl transition-all dark:border-white/10 dark:bg-[#000000]/80">
        <div className="flex shrink-0 items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          <h2 className="hidden text-[13px] font-medium tracking-tight text-foreground/80 sm:block">
            {isPresetTheme ? '微信预览' : '实时预览'}
          </h2>
          <span
            className={cn(
              'hidden rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline-flex',
              isPresetTheme
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
            )}
          >
            {isPresetTheme ? '微信兼容复制' : '自定义主题仅本地保真'}
          </span>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          <Button
            size="sm"
            variant="default"
            onClick={handleCopy}
            className="h-7 rounded-full bg-[#007aff] px-4 text-xs font-medium text-white shadow-sm transition-transform active:scale-95 hover:bg-[#007aff]/90"
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            {isPresetTheme ? '复制到微信' : '复制当前 HTML'}
          </Button>

          <div className="mx-1 h-4 w-px bg-black/10 dark:bg-white/10" />

          {deviceModel === 'custom' && (
            <div className="animate-in fade-in slide-in-from-right-4 mr-2 flex items-center gap-1 duration-300">
              <Input
                type="number"
                value={customWidth}
                onChange={(e) => setCustomSize(Number(e.target.value), customHeight)}
                className="h-8 w-16 px-2 text-xs"
                placeholder="W"
              />
              <span className="text-xs text-muted-foreground">x</span>
              <Input
                type="number"
                value={customHeight}
                onChange={(e) => setCustomSize(customWidth, Number(e.target.value))}
                className="h-8 w-16 px-2 text-xs"
                placeholder="H"
              />
            </div>
          )}

          <Select value={deviceModel} onValueChange={setDeviceModel as any}>
            <SelectTrigger className="h-7 w-[140px] rounded-lg border-none bg-transparent text-xs font-mono text-foreground/80 shadow-none transition-colors hover:bg-black/5 focus:ring-0 dark:hover:bg-white/10">
              <SelectValue placeholder="Select Device" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pc">
                <div className="flex items-center">
                  <Monitor className="mr-2 h-3 w-3" />
                  PC / Web
                </div>
              </SelectItem>
              <SelectItem value="iphone-15-pro-max">
                <div className="flex items-center">
                  <Smartphone className="mr-2 h-3 w-3" />
                  iPhone 15 Pro Max
                </div>
              </SelectItem>
              <SelectItem value="android-flagship">
                <div className="flex items-center">
                  <Smartphone className="mr-2 h-3 w-3" />
                  Android 水滴屏
                </div>
              </SelectItem>
              <SelectItem value="custom">
                <div className="flex items-center">
                  <Monitor className="mr-2 h-3 w-3" />
                  Custom
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div ref={setPreviewViewportRef} className="flex flex-1 items-start justify-center overflow-y-auto p-4 md:p-8">
        <div className="w-full max-w-5xl space-y-3">
          {!isPresetTheme && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-50/80 px-4 py-3 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
              自定义主题适合本地预览与导出 HTML / PDF。若目标是粘贴到微信公众号，建议切换到预设主题以获得更稳定的内联样式。
            </div>
          )}

          {deviceModel === 'custom' ? (
            <div
              className="relative mx-auto overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-apple-lg transition-all duration-300"
              style={{
                width: `${customWidth}px`,
                height: `${customHeight}px`,
                maxWidth: '100%',
              }}
            >
              <div className="relative flex h-full w-full flex-col overflow-hidden bg-white">
                <div className="h-6 w-full shrink-0 border-b bg-muted/20 px-2 text-[10px] leading-6 text-muted-foreground select-none">
                  {customWidth} x {customHeight}
                </div>
                {renderContent()}
              </div>
            </div>
          ) : deviceModel === 'pc' ? (
            <div className="mx-auto min-h-[800px] w-full max-w-[800px] animate-in overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-apple-lg fade-in slide-in-from-bottom-4 duration-500">
              {renderContent()}
            </div>
          ) : (
            <DeviceFrame device={deviceModel}>{renderContent()}</DeviceFrame>
          )}
        </div>
      </div>
    </div>
  );
}
