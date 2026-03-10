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
import { makeWeChatCompatible } from '@/lib/wechatCompat';
import { copyRichContent } from '@/lib/clipboard';
import { cn } from '@/lib/utils';
import 'heti/umd/heti.min.css';
import 'highlight.js/styles/github.css';
import DeviceFrame from '@/components/preview/DeviceFrame';
import { Mermaid } from './Mermaid';
import { renderMermaidSVG } from 'beautiful-mermaid';

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
    registerPreviewScroller,
  } = useEditorStore();
  const [mounted, setMounted] = React.useState(false);
  const [htmlContent, setHtmlContent] = React.useState('');
  const deferredMarkdown = React.useDeferredValue(markdown);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (scrollRef.current) {
      registerPreviewScroller(scrollRef.current);
    }
  }, [registerPreviewScroller]);

  const isPresetTheme = React.useMemo(() => THEMES.some((item) => item.id === theme), [theme]);

  React.useEffect(() => {
    const processContent = async () => {
      if (!isPresetTheme) {
        return;
      }

      const rawHtml = md.render(deferredMarkdown);
      let styledHtml = applyTheme(rawHtml, theme);

      const parser = new DOMParser();
      const doc = parser.parseFromString(styledHtml, 'text/html');
      const mermaidBlocks = doc.querySelectorAll('code.language-mermaid');

      if (mermaidBlocks.length > 0) {
        for (let index = 0; index < mermaidBlocks.length; index += 1) {
          const block = mermaidBlocks[index];
          let graphDefinition = block.textContent || '';
          graphDefinition = graphDefinition.replace(/鈥?/g, '"').replace(/鈥?/g, '"');

          try {
            const svg = renderMermaidSVG(graphDefinition, {
              bg: '#ffffff',
              fg: '#1f2937',
              line: '#4b5563',
            });

            const getSvgDimensions = (svgMarkup: string) => {
              const svgParser = new DOMParser();
              const svgDoc = svgParser.parseFromString(svgMarkup, 'image/svg+xml');
              const svgElement = svgDoc.querySelector('svg');
              if (!svgElement) {
                return { width: 0, height: 0 };
              }

              let width = parseFloat(svgElement.getAttribute('width') || '0');
              let height = parseFloat(svgElement.getAttribute('height') || '0');

              if (width === 0 || height === 0) {
                const viewBox = svgElement.getAttribute('viewBox');
                if (viewBox) {
                  const parts = viewBox.split(/\s+|,/).map(Number);
                  if (parts.length === 4) {
                    width = parts[2];
                    height = parts[3];
                  }
                }
              }

              return { width, height };
            };

            const dimensions = getSvgDimensions(svg);
            let fixedSvg = svg;

            if ((!svg.includes('width=') || svg.includes('width="100%"')) && dimensions.width > 0) {
              fixedSvg = fixedSvg.replace('<svg', `<svg width="${dimensions.width}" height="${dimensions.height}"`);
            }

            const image = document.createElement('img');
            const blob = new Blob([fixedSvg], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            await new Promise<void>((resolve, reject) => {
              image.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = 2;
                const finalWidth = image.width || dimensions.width;
                const finalHeight = image.height || dimensions.height;

                if (finalWidth === 0 || finalHeight === 0) {
                  URL.revokeObjectURL(url);
                  resolve();
                  return;
                }

                canvas.width = finalWidth * scale;
                canvas.height = finalHeight * scale;
                const context = canvas.getContext('2d');

                if (context) {
                  context.drawImage(image, 0, 0, canvas.width, canvas.height);
                  const pngUrl = canvas.toDataURL('image/png');
                  const preParent = block.parentElement;

                  if (preParent && preParent.tagName === 'PRE') {
                    const finalImage = document.createElement('img');
                    finalImage.src = pngUrl;
                    finalImage.style.maxWidth = '100%';
                    finalImage.style.height = 'auto';
                    finalImage.style.display = 'block';
                    finalImage.style.margin = '20px auto';
                    preParent.replaceWith(finalImage);
                  }
                }

                URL.revokeObjectURL(url);
                resolve();
              };
              image.onerror = reject;
              image.src = url;
            });
          } catch (error: any) {
            console.error('Failed to render mermaid diagram:', error);
            const preParent = block.parentElement;
            if (preParent && preParent.tagName === 'PRE') {
              const errorDiv = document.createElement('div');
              errorDiv.style.color = '#ef4444';
              errorDiv.style.fontSize = '12px';
              errorDiv.style.padding = '8px';
              errorDiv.style.marginTop = '4px';
              errorDiv.style.backgroundColor = '#fef2f2';
              errorDiv.style.borderRadius = '4px';
              errorDiv.style.border = '1px solid #fee2e2';
              errorDiv.innerText = `Mermaid Error: ${error.message || 'Syntax error'}`;
              preParent.appendChild(errorDiv);
            }
          }
        }

        styledHtml = doc.body.innerHTML;
      }

      setHtmlContent(styledHtml);
    };

    processContent();
  }, [deferredMarkdown, theme, isPresetTheme]);

  const stats = React.useMemo(() => {
    const cleanText = deferredMarkdown.replace(/\s/g, '');
    const charCount = cleanText.length;
    const chineseChars = deferredMarkdown.match(/[\u4e00-\u9fa5]/g) || [];
    const chineseCount = chineseChars.length;
    const nonChineseText = deferredMarkdown.replace(/[\u4e00-\u9fa5]/g, ' ');
    const words = nonChineseText.trim().split(/\s+/).filter((item) => item.length > 0);
    const wordCount = words.length;
    const readTimeMinutes = chineseCount / 400 + wordCount / 200;
    const readTime = Math.ceil(readTimeMinutes) || 1;

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

        contentToCopy = `<style>${customThemeCss}</style>${previewHtml}`;
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
        toast.success(
          copyResult.method === 'clipboard'
            ? '已复制到剪贴板，可直接粘贴到微信公众号'
            : '已通过兼容模式复制，可尝试直接粘贴到微信公众号'
        );
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
      ref={scrollRef}
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
                <div className="inline-flex cursor-help items-center gap-3 rounded-full border border-black/5 bg-black/5 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm transition-all hover:bg-black/10 dark:border-white/5 dark:bg-white/10 dark:hover:bg-white/15">
                  <span className="font-mono">字数 {stats.count}</span>
                  <span className="h-3 w-px bg-border/50" />
                  <span>约 {stats.time} 分钟</span>
                </div>
              </div>
            )}

            {isPresetTheme ? (
              <div
                dangerouslySetInnerHTML={{ __html: htmlContent }}
                style={{
                  fontSize: `${fontSize}px`,
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
                  iPhone 15 Pro
                </div>
              </SelectItem>
              <SelectItem value="android-flagship">
                <div className="flex items-center">
                  <Smartphone className="mr-2 h-3 w-3" />
                  Android
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

      <div className="flex flex-1 items-start justify-center overflow-y-auto p-4 md:p-8">
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
            <DeviceFrame device="mobile">{renderContent()}</DeviceFrame>
          )}
        </div>
      </div>
    </div>
  );
}
