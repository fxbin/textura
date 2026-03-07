'use client';

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
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Smartphone, Tablet, Monitor } from "lucide-react";
import { toast } from "sonner";
import { useEditorStore } from '@/store/useEditorStore';
import { THEMES } from '@/lib/themes/index';
import { md, applyTheme } from '@/lib/markdown';
import { makeWeChatCompatible } from '@/lib/wechatCompat';
import { cn } from '@/lib/utils';
import 'heti/umd/heti.min.css';
import 'highlight.js/styles/github.css';
import DeviceFrame from '@/components/preview/DeviceFrame';
import { Mermaid } from './Mermaid';
// import mermaid from 'mermaid';
import { renderMermaidSVG } from 'beautiful-mermaid';

export function PreviewPane() {
  const {
    markdown: storeMarkdown,
    theme,
    fontSize,
    deviceModel,
    setDeviceModel,
    customWidth,
    customHeight,
    setCustomSize,
    customThemeCss,
    savedThemes,
    isStatsVisible
  } = useEditorStore();
  const [mounted, setMounted] = React.useState(false);
  const [htmlContent, setHtmlContent] = React.useState('');

  // 性能优化：使用 useDeferredValue 解耦高频输入导致的大开销重新渲染
  const markdown = React.useDeferredValue(storeMarkdown);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isPresetTheme = React.useMemo(() => {
    return THEMES.some(t => t.id === theme);
  }, [theme]);

  // Generate HTML content based on mode
  React.useEffect(() => {
    const processContent = async () => {
      if (isPresetTheme) {
        // Use markdown-it + applyTheme for presets (WeChat compatible)
        const rawHtml = md.render(markdown);
        let styledHtml = applyTheme(rawHtml, theme);

        // Process Mermaid Diagrams
        // Find all mermaid code blocks and replace them with images
        const parser = new DOMParser();
        const doc = parser.parseFromString(styledHtml, 'text/html');
        const mermaidBlocks = doc.querySelectorAll('code.language-mermaid');

        if (mermaidBlocks.length > 0) {
          // Initialize mermaid if needed (safe to call multiple times)
          // mermaid.initialize({
          //   startOnLoad: false,
          //   theme: 'default',
          //   securityLevel: 'loose',
          // });

          for (let i = 0; i < mermaidBlocks.length; i++) {
            const block = mermaidBlocks[i];
            let graphDefinition = block.textContent || '';
            const id = `mermaid-svg-${Date.now()}-${i}`;
            
            // Try to auto-fix common Chinese quote issues in mermaid code
            // Replace Chinese quotes with English quotes
            graphDefinition = graphDefinition
              .replace(/“/g, '"')
              .replace(/”/g, '"');

            try {
              // Render SVG using beautiful-mermaid
              const svg = renderMermaidSVG(graphDefinition, {
                bg: '#ffffff',
                fg: '#1f2937', // gray-800
                // Optional: make it look a bit nicer
                line: '#4b5563', // gray-600
              });
              
              // Helper to parse SVG dimensions
              const getSvgDimensions = (svgStr: string) => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(svgStr, 'image/svg+xml');
                const svgEl = doc.querySelector('svg');
                if (!svgEl) return { width: 0, height: 0 };
                
                let width = parseFloat(svgEl.getAttribute('width') || '0');
                let height = parseFloat(svgEl.getAttribute('height') || '0');
                
                if (width === 0 || height === 0) {
                  const viewBox = svgEl.getAttribute('viewBox');
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

              const dims = getSvgDimensions(svg);
              
              // Force dimensions on the SVG string if needed for img.onload to pick it up correctly
              let fixedSvg = svg;
              if (!svg.includes('width=') || svg.includes('width="100%"')) {
                 if (dims.width > 0) {
                   // Replace or inject width/height
                   fixedSvg = fixedSvg.replace('<svg', `<svg width="${dims.width}" height="${dims.height}"`);
                 }
              }

              // Convert SVG to PNG Data URL for WeChat compatibility
              // WeChat doesn't support inline SVG well, but supports base64 images
              const img = document.createElement('img');
              const svgBlob = new Blob([fixedSvg], { type: 'image/svg+xml;charset=utf-8' });
              const url = URL.createObjectURL(svgBlob);
              
              await new Promise((resolve, reject) => {
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  // Scale up for better quality (Retina)
                  const scale = 2; 
                  // Use dimensions from SVG parsing if img.width is unreliable (e.g. 0)
                  const finalWidth = img.width || dims.width;
                  const finalHeight = img.height || dims.height;

                  if (finalWidth === 0 || finalHeight === 0) {
                    // Fallback or skip
                    resolve(null);
                    return;
                  }

                  canvas.width = finalWidth * scale;
                  canvas.height = finalHeight * scale;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    // Fill white background for non-transparent result (safer for copy-paste)
                    // But maybe transparent is better? WeChat usually has white bg.
                    // Let's keep it transparent but ensure we draw correctly.
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const pngUrl = canvas.toDataURL('image/png');
                    
                    // Replace the <pre><code>...</code></pre> with the <img>
                    const preParent = block.parentElement;
                    if (preParent && preParent.tagName === 'PRE') {
                      const finalImg = document.createElement('img');
                      finalImg.src = pngUrl;
                      finalImg.style.maxWidth = '100%';
                      finalImg.style.height = 'auto';
                      finalImg.style.display = 'block';
                      finalImg.style.margin = '20px auto';
                      preParent.replaceWith(finalImg);
                    }
                  }
                  URL.revokeObjectURL(url);
                  resolve(null);
                };
                img.onerror = reject;
                img.src = url;
              });
            } catch (err: any) {
              console.error('Failed to render mermaid diagram:', err);
              // Leave as code block if failed, but add error message
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
                errorDiv.innerText = `Mermaid Error: ${err.message || 'Syntax error'}`;
                preParent.appendChild(errorDiv);
              }
            }
          }
          styledHtml = doc.body.innerHTML;
        }
        
        setHtmlContent(styledHtml);
      } else {
        // For custom mode, we use ReactMarkdown in the render directly
        // But we might want to set htmlContent for consistency if we switch back
      }
    };

    processContent();
  }, [markdown, theme, isPresetTheme]);

  const handleCopy = async () => {
    try {
      let contentToCopy = '';
      let statsHtml = '';

      // Generate Stats HTML if visible
      if (isStatsVisible) {
        // 使用内联样式确保兼容性，参考微信公众号排版风格
        statsHtml = `
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
      }

      if (isPresetTheme) {
        // Use the processed htmlContent which includes Mermaid images
        contentToCopy = await makeWeChatCompatible(htmlContent, theme);
      } else {
        // For custom themes, we can't easily inline styles. 
        // Just copy the raw HTML from the container? 
        // Or warn user.
        toast.error("自定义主题暂不支持一键复制到微信（需内联样式支持）");
        return;
      }

      // Prepend stats if enabled
      if (statsHtml) {
        contentToCopy = statsHtml + contentToCopy;
      }

      const blob = new Blob([contentToCopy], { type: 'text/html' });
      const textBlob = new Blob([markdown], { type: 'text/plain' });

      // Try using the Clipboard API
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blob,
            'text/plain': textBlob,
          })
        ]);
        toast.success("已复制到剪贴板，可直接粘贴到微信公众号");
      } catch (err) {
        console.error('Clipboard API failed', err);
        // Fallback
        toast.error("复制失败，请重试");
      }
    } catch (err) {
      console.error(err);
      toast.error("生成预览失败");
    }
  };

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Sync scroll from Editor
  React.useEffect(() => {
    const unsubscribe = useEditorStore.subscribe((state, prevState) => {
      // Only sync if enabled
      if (state.isScrollSyncEnabled === false) return;

      if (state.scrollPercentage !== prevState.scrollPercentage) {
        if (scrollRef.current) {
          const el = scrollRef.current;
          el.scrollTop = state.scrollPercentage * (el.scrollHeight - el.clientHeight);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const stats = React.useMemo(() => {
    // 移除空白字符进行纯字符统计
    const cleanText = markdown.replace(/\s/g, '');
    const charCount = cleanText.length;
    
    // 统计中文字符
    const chineseChars = markdown.match(/[\u4e00-\u9fa5]/g) || [];
    const chineseCount = chineseChars.length;
    
    // 统计英文单词
    const nonChineseText = markdown.replace(/[\u4e00-\u9fa5]/g, ' ');
    const words = nonChineseText.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    
    // 计算阅读时间
    const readTimeMinutes = (chineseCount / 400) + (wordCount / 200);
    const readTime = Math.ceil(readTimeMinutes) || 1;

    return {
      count: charCount,
      time: readTime
    };
  }, [markdown]);

  const renderContent = () => (
    <div
      id="print-area"
      className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden no-scrollbar bg-white h-full",
        deviceModel === 'pc' ? "px-8 md:px-12 lg:px-16 py-8" : "px-0"
      )}
    >
      <div className="min-h-full" ref={contentRef}>
        {!mounted ? (
          <div className="w-full h-32 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats Banner */}
            {isStatsVisible && (
              <div 
                className="flex justify-center mb-6 mt-4 animate-in fade-in slide-in-from-top-2 select-none print:hidden"
                title="此统计信息将会被复制到剪贴板"
              >
                <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 backdrop-blur-sm border border-black/5 dark:border-white/5 text-[11px] font-medium text-muted-foreground shadow-sm transition-all hover:bg-black/10 dark:hover:bg-white/15 cursor-help">
                   <span className="font-mono">字数 {stats.count}</span>
                   <span className="w-px h-3 bg-border/50" />
                   <span>约 {stats.time} 分钟</span>
                </div>
              </div>
            )}

            {isPresetTheme ? (
              // WeChat Mode: Raw HTML with inline styles
              <div
                dangerouslySetInnerHTML={{ __html: htmlContent }}
                style={{
                  fontSize: `${fontSize}px`,
                  // Styles are already inlined by applyTheme, but container padding/etc comes from theme logic
                }}
              />
            ) : (
              // Custom Mode: ReactMarkdown + CSS Style Tag
              <>
                <style dangerouslySetInnerHTML={{ __html: customThemeCss }} />
                <article
                  className={cn("heti", "prose prose-slate max-w-none p-5 pb-10")}
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.75,
                    textAlign: 'justify'
                  }}
                >
                  <ReactMarkdown
                    rehypePlugins={[rehypeRaw, rehypeHighlight]}
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                      img: ({ node, ...props }) => <img className="rounded-lg shadow-sm my-4 w-full" {...props} />,
                      code: ({ node, inline, className, children, ...props }: any) => {
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
                      }
                    }}
                  >
                    {markdown}
                  </ReactMarkdown>
                </article>
              </>
            )}
            {/* Bottom padding for safe area */}
            <div className="h-8" />
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full w-full bg-[#f5f5f7] dark:bg-[#000000] flex flex-col relative overflow-hidden group">

      <div className="sticky top-0 z-20 flex-none px-4 py-3 border-b border-black/5 dark:border-white/10 bg-[#f5f5f7]/80 dark:bg-[#000000]/80 backdrop-blur-xl flex justify-between items-center gap-4 shrink-0 transition-all">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          <h2 className="text-[13px] font-medium text-foreground/80 hidden sm:block tracking-tight">
            {isPresetTheme ? '微信预览' : '实时预览'}
          </h2>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          <Button
            size="sm"
            variant="default"
            onClick={handleCopy}
            className="h-7 text-xs bg-[#007aff] hover:bg-[#007aff]/90 text-white shadow-sm rounded-full px-4 font-medium transition-transform active:scale-95"
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            复制
          </Button>

          <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-1" />

          {deviceModel === 'custom' && (
            <div className="flex items-center gap-1 mr-2 animate-in fade-in slide-in-from-right-4 duration-300">
              <Input
                type="number"
                value={customWidth}
                onChange={(e) => setCustomSize(Number(e.target.value), customHeight)}
                className="w-16 h-8 text-xs px-2"
                placeholder="W"
              />
              <span className="text-muted-foreground text-xs">x</span>
              <Input
                type="number"
                value={customHeight}
                onChange={(e) => setCustomSize(customWidth, Number(e.target.value))}
                className="w-16 h-8 text-xs px-2"
                placeholder="H"
              />
            </div>
          )}

          <Select value={deviceModel} onValueChange={setDeviceModel as any}>
            <SelectTrigger className="w-[140px] h-7 text-xs font-mono bg-transparent border-none shadow-none focus:ring-0 text-foreground/80 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors">
              <SelectValue placeholder="Select Device" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pc">
                <div className="flex items-center"><Monitor className="w-3 h-3 mr-2" />PC / Web</div>
              </SelectItem>
              <SelectItem value="iphone-15-pro-max">
                <div className="flex items-center"><Smartphone className="w-3 h-3 mr-2" />iPhone 15 Pro</div>
              </SelectItem>
              <SelectItem value="android-flagship">
                <div className="flex items-center"><Smartphone className="w-3 h-3 mr-2" />Android</div>
              </SelectItem>
              <SelectItem value="custom">
                <div className="flex items-center"><Monitor className="w-3 h-3 mr-2" />Custom</div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center items-start"
        ref={scrollRef}
      >
        {deviceModel === 'custom' ? (
          <div
            className="relative bg-white shadow-apple-lg rounded-[24px] overflow-hidden border border-black/5 mx-auto transition-all duration-300"
            style={{
              width: `${customWidth}px`,
              height: `${customHeight}px`,
              maxWidth: '100%'
            }}
          >
            <div className="w-full h-full overflow-hidden flex flex-col relative bg-white">
              <div className="h-6 w-full bg-muted/20 border-b flex items-center px-2 text-[10px] text-muted-foreground select-none shrink-0">
                {customWidth} x {customHeight}
              </div>
              {renderContent()}
            </div>
          </div>
        ) : deviceModel === 'pc' ? (
          <div className="w-full max-w-[800px] min-h-[800px] bg-white shadow-apple-lg rounded-[24px] overflow-hidden border border-black/5 mx-auto transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
            {renderContent()}
          </div>
        ) : (
          <DeviceFrame device={deviceModel.includes('iphone') ? 'mobile' : 'mobile'}>
            {renderContent()}
          </DeviceFrame>
        )}
      </div>
    </div>
  );
}
