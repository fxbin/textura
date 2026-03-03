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
    savedThemes
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
    if (isPresetTheme) {
      // Use markdown-it + applyTheme for presets (WeChat compatible)
      const rawHtml = md.render(markdown);
      const styledHtml = applyTheme(rawHtml, theme);
      setHtmlContent(styledHtml);
    } else {
      // Use ReactMarkdown logic implicitly (handled in render)
      // Actually, let's try to unify. 
      // For custom themes, we rely on customThemeCss injected style.
      // But we can still use md.render() to get HTML.
      // However, ReactMarkdown allows components like Mermaid.
      // If we switch entirely to md.render, we lose Mermaid unless we implement a plugin.
      // Raphael doesn't seem to have Mermaid support in its markdown.ts.
      // Textura does.
      // Compromise: Use ReactMarkdown for preview, but generate HTML string for Copy.
      // Wait, Raphael's key feature is the *preview* matching the *copy*.
      // If I use ReactMarkdown for preview, it might look different from what I copy (which uses md.render).
      // I should prioritize WYSIWYG.
      // I will use md.render for everything if possible.
      // But Mermaid... 
      // I'll stick to ReactMarkdown for now for the *visual preview* if it's a custom theme, 
      // but for Preset Themes (WeChat), I MUST use `dangerouslySetInnerHTML` to see exactly what will be pasted.
      if (isPresetTheme) {
        const rawHtml = md.render(markdown);
        const styledHtml = applyTheme(rawHtml, theme);
        setHtmlContent(styledHtml);
      }
    }
  }, [markdown, theme, isPresetTheme]);

  const handleCopy = async () => {
    try {
      let contentToCopy = '';
      if (isPresetTheme) {
        // Generate WeChat compatible HTML
        const rawHtml = md.render(markdown);
        const themeHtml = applyTheme(rawHtml, theme);
        contentToCopy = await makeWeChatCompatible(themeHtml, theme);
      } else {
        // For custom themes, we can't easily inline styles. 
        // Just copy the raw HTML from the container? 
        // Or warn user.
        toast.error("自定义主题暂不支持一键复制到微信（需内联样式支持）");
        return;
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
      if (state.scrollPercentage !== prevState.scrollPercentage) {
        if (scrollRef.current) {
          const el = scrollRef.current;
          el.scrollTop = state.scrollPercentage * (el.scrollHeight - el.clientHeight);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const renderContent = () => (
    <div 
      id="print-area" 
      className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden no-scrollbar bg-white h-full",
        deviceModel === 'pc' ? "px-8 md:px-12 lg:px-16 py-8" : "px-0"
      )}
      ref={scrollRef}
    >
      <div className="min-h-full" ref={contentRef}>
        {!mounted ? (
           <div className="w-full h-32 flex items-center justify-center">
             <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
           </div>
        ) : (
          <>
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
                        img: ({node, ...props}) => <img className="rounded-lg shadow-sm my-4 w-full" {...props} />,
                        code: ({node, inline, className, children, ...props}: any) => {
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
              <SelectItem value="iphone-15-pro-max">
                <div className="flex items-center"><Smartphone className="w-3 h-3 mr-2"/>iPhone 15 Pro</div>
              </SelectItem>
              <SelectItem value="android-flagship">
                <div className="flex items-center"><Smartphone className="w-3 h-3 mr-2"/>Android</div>
              </SelectItem>
              <SelectItem value="pc">
                <div className="flex items-center"><Monitor className="w-3 h-3 mr-2"/>PC / Web</div>
              </SelectItem>
              <SelectItem value="custom">
                <div className="flex items-center"><Monitor className="w-3 h-3 mr-2"/>Custom</div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center items-start">
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
