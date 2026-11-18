'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import {
  Check,
  ChevronDown,
  Monitor,
  Palette,
  SlidersHorizontal,
  Smartphone,
  Type,
} from 'lucide-react';
import DeviceFrame from '@/components/preview/DeviceFrame';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { resolveImagePaths } from '@/lib/imageResolver';
import { applyTheme, md } from '@/lib/markdown';
import { renderMermaidInHtml } from '@/lib/mermaid';
import { THEMES } from '@/lib/themes/index';
import { calculateWordCount, cn } from '@/lib/utils';
import { isWeChatDarkThemeRisk } from '@/lib/wechatCompat';
import { DeviceModel, useEditorStore } from '@/store/useEditorStore';
import 'heti/umd/heti.min.css';
import 'highlight.js/styles/github.css';
import { Mermaid } from './Mermaid';

interface PreviewPaneProps {
  onOpenThemes?: () => void;
}

const FONT_SIZE_OPTIONS = [
  { size: 14, label: '紧凑' },
  { size: 15, label: '稍小' },
  { size: 16, label: '标准' },
  { size: 17, label: '舒适' },
  { size: 18, label: '较大' },
];

const DEVICE_OPTIONS: {
  id: DeviceModel;
  label: string;
  shortLabel: string;
  icon: typeof Monitor;
}[] = [
  { id: 'pc', label: '桌面阅读宽屏', shortLabel: 'PC', icon: Monitor },
  { id: 'iphone-15-pro-max', label: 'iPhone 15 Pro Max', shortLabel: 'iPhone', icon: Smartphone },
  { id: 'android-flagship', label: 'Android 旗舰屏', shortLabel: 'Android', icon: Smartphone },
  { id: 'custom', label: '自定义视口尺寸', shortLabel: '自定义', icon: SlidersHorizontal },
];

function useIsMounted() {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function PreviewPane({ onOpenThemes }: PreviewPaneProps) {
  const markdown = useEditorStore((s) => s.markdown);
  const theme = useEditorStore((s) => s.theme);
  const savedThemes = useEditorStore((s) => s.savedThemes);
  const fontSize = useEditorStore((s) => s.fontSize);
  const setFontSize = useEditorStore((s) => s.setFontSize);
  const deviceModel = useEditorStore((s) => s.deviceModel);
  const setDeviceModel = useEditorStore((s) => s.setDeviceModel);
  const customWidth = useEditorStore((s) => s.customWidth);
  const customHeight = useEditorStore((s) => s.customHeight);
  const setCustomSize = useEditorStore((s) => s.setCustomSize);
  const customThemeCss = useEditorStore((s) => s.customThemeCss);
  const isStatsVisible = useEditorStore((s) => s.isStatsVisible);
  const isHetiEnabled = useEditorStore((s) => s.isHetiEnabled);
  const imageBasePath = useEditorStore((s) => s.imageBasePath);
  const registerPreviewScroller = useEditorStore((s) => s.registerPreviewScroller);
  const setSidebarOpen = useEditorStore((s) => s.setSidebarOpen);

  const mounted = useIsMounted();
  const [htmlContent, setHtmlContent] = React.useState('');
  const deferredMarkdown = React.useDeferredValue(markdown);

  const pcScrollerRef = React.useRef<HTMLDivElement>(null);
  const innerScrollerRef = React.useRef<HTMLDivElement>(null);

  const effectiveThemeId = theme === 'default' ? (THEMES[0]?.id ?? 'apple') : theme;

  const activePresetTheme = React.useMemo(
    () => THEMES.find((item) => item.id === effectiveThemeId),
    [effectiveThemeId]
  );
  const activeSavedTheme = React.useMemo(
    () => savedThemes.find((item) => item.id === theme),
    [savedThemes, theme]
  );
  const isPresetTheme = Boolean(activePresetTheme);
  const isDarkThemeRisk = isPresetTheme && isWeChatDarkThemeRisk(effectiveThemeId);

  // Register the active scrollable viewport for scroll sync across ALL device modes
  React.useEffect(() => {
    if (!mounted) return;
    const scroller = deviceModel === 'pc' ? pcScrollerRef.current : innerScrollerRef.current;
    registerPreviewScroller(scroller);
    return () => {
      registerPreviewScroller(null);
    };
  }, [deviceModel, mounted, registerPreviewScroller]);

  React.useEffect(() => {
    if (!isPresetTheme) return;

    let cancelled = false;
    const debounceId = setTimeout(async () => {
      const rawHtml = md.render(deferredMarkdown);
      const resolvedHtml = resolveImagePaths(rawHtml, imageBasePath);
      const themedHtml = applyTheme(resolvedHtml, effectiveThemeId, fontSize);
      const styledHtml = await renderMermaidInHtml(themedHtml);

      if (!cancelled) {
        setHtmlContent(styledHtml);
      }
    }, 160);

    return () => {
      cancelled = true;
      clearTimeout(debounceId);
    };
  }, [deferredMarkdown, effectiveThemeId, fontSize, isPresetTheme, imageBasePath]);

  const stats = React.useMemo(() => {
    const { charCount, readTime } = calculateWordCount(deferredMarkdown);
    return { count: charCount, time: readTime };
  }, [deferredMarkdown]);

  const handleOpenThemePicker = () => {
    if (onOpenThemes) {
      onOpenThemes();
    } else {
      setSidebarOpen(true);
    }
  };

  const activeThemeLabel = activePresetTheme
    ? activePresetTheme.name
    : activeSavedTheme
      ? activeSavedTheme.name
      : '自定义 CSS';

  const activeThemeSwatch = activePresetTheme
    ? activePresetTheme.preview?.accent || activePresetTheme.preview?.heading || '#159A74'
    : '#d97706';

  const renderArticleContent = () => (
    <div
      ref={innerScrollerRef}
      className={cn(
        'bg-white text-neutral-900',
        deviceModel === 'pc'
          ? 'h-auto min-h-full overflow-visible px-7 py-8 md:px-12 lg:px-14'
          : 'h-full overflow-y-auto overflow-x-hidden px-4 py-4 no-scrollbar'
      )}
    >
      {!mounted ? (
        <div className="flex h-36 w-full items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        </div>
      ) : (
        <>
          {isStatsVisible && (
            <div
              data-preview-stats-banner
              className="mt-1 mb-6 flex justify-center select-none print:hidden"
              title="复制正文时会自动附带此字数与阅读时间信息"
            >
              <div className="inline-flex max-w-full items-center gap-2.5 whitespace-nowrap rounded-full border border-neutral-200/80 bg-neutral-100/80 px-3 py-1 text-[11px] font-medium text-neutral-500">
                <span className="font-mono">字数 {stats.count}</span>
                <span className="h-2.5 w-px bg-neutral-300" />
                <span>约 {stats.time} 分钟</span>
              </div>
            </div>
          )}

          {isPresetTheme ? (
            <div
              id="print-area"
              className={cn(isHetiEnabled && 'heti')}
              dangerouslySetInnerHTML={{ __html: htmlContent }}
              style={{ fontSize: `${fontSize}px` }}
            />
          ) : (
            <>
              <style dangerouslySetInnerHTML={{ __html: customThemeCss }} />
              <article
                id="print-area"
                data-preview-custom-body
                className={cn('heti', 'prose prose-slate max-w-none px-2 pb-10 pt-2')}
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
                    img: ({ ...props }) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt="" className="my-4 w-full rounded-lg shadow-sm" {...props} />
                    ),
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

          <div className="h-6" />
        </>
      )}
    </div>
  );

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-preview-canvas">
      {/* Preview Toolbar */}
      <div className="sticky top-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/75 bg-card/85 px-3 py-1.5 backdrop-blur-md sm:px-4">
        {/* Left: Active Theme Status Pill */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleOpenThemePicker}
              className="group/theme inline-flex min-w-0 items-center gap-2 rounded-lg border border-border/70 bg-background/80 px-2.5 py-1 text-left transition-colors hover:border-primary/40 hover:bg-background"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: activeThemeSwatch }}
              />
              <span className="max-w-[110px] truncate text-xs font-medium text-foreground sm:max-w-[160px]">
                {activeThemeLabel}
              </span>
              <span
                className={cn(
                  'hidden rounded-full px-1.5 py-0.5 text-[10px] font-medium sm:inline-flex',
                  !isPresetTheme || isDarkThemeRisk
                    ? 'bg-amber-500/12 text-amber-700 dark:text-amber-300'
                    : 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                )}
              >
                {!isPresetTheme
                  ? '本地预览'
                  : isDarkThemeRisk
                    ? '暗色慎用'
                    : '微信兼容'}
              </span>
              <Palette className="h-3 w-3 shrink-0 text-muted-foreground opacity-60 transition-opacity group-hover/theme:opacity-100" />
            </button>
          </TooltipTrigger>
          <TooltipContent>点击打开样式库切换排版主题</TooltipContent>
        </Tooltip>

        {/* Right: Typography Size & Device Segmented Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Font size quick picker */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="h-7 gap-1 rounded-md border border-border/60 bg-background/60 px-2 font-mono text-[11px] text-muted-foreground hover:bg-background hover:text-foreground"
                  >
                    <Type className="h-3 w-3" />
                    <span>{fontSize}px</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>调整预览与复制字号</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuLabel className="text-xs text-muted-foreground">正文字号</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {FONT_SIZE_OPTIONS.map((item) => (
                <DropdownMenuItem
                  key={item.size}
                  onClick={() => setFontSize(item.size)}
                  className="justify-between text-xs"
                >
                  <span className="flex items-center gap-2 font-mono">
                    {item.size}px
                    {fontSize === item.size && <Check className="h-3.5 w-3.5 text-primary" />}
                  </span>
                  <span className="text-muted-foreground">{item.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Custom dimensions inline inputs */}
          {deviceModel === 'custom' && (
            <div className="flex items-center gap-1 rounded-md border border-border/70 bg-background/80 px-1.5 py-0.5">
              <Input
                type="number"
                min={240}
                max={1280}
                value={customWidth}
                onChange={(e) => setCustomSize(Math.max(240, Number(e.target.value) || 375), customHeight)}
                aria-label="自定义宽度"
                className="h-5 w-12 border-0 bg-transparent px-1 text-center font-mono text-[11px] shadow-none focus-visible:ring-0"
              />
              <span className="text-[10px] text-muted-foreground">×</span>
              <Input
                type="number"
                min={320}
                max={2000}
                value={customHeight}
                onChange={(e) => setCustomSize(customWidth, Math.max(320, Number(e.target.value) || 800))}
                aria-label="自定义高度"
                className="h-5 w-12 border-0 bg-transparent px-1 text-center font-mono text-[11px] shadow-none focus-visible:ring-0"
              />
            </div>
          )}

          {/* Device Segmented Control */}
          <div
            role="group"
            aria-label="预览设备切换"
            className="inline-flex items-center rounded-lg border border-border/70 bg-muted/60 p-0.5"
          >
            {DEVICE_OPTIONS.map((item) => {
              const Icon = item.icon;
              const active = deviceModel === item.id;
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setDeviceModel(item.id)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all',
                        active
                          ? 'bg-card text-foreground shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      <span className="hidden sm:inline">{item.shortLabel}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{item.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>

      {/* Preview Stage */}
      <div
        ref={pcScrollerRef}
        className="flex flex-1 items-start justify-center overflow-y-auto p-4 sm:p-6 md:p-8"
      >
        <div className="w-full max-w-4xl space-y-3">
          {!isPresetTheme && (
            <div className="mx-auto max-w-[740px] rounded-xl border border-amber-500/25 bg-amber-50/85 px-3.5 py-2.5 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              当前处于自定义 CSS 模式，适合本地预览与导出 HTML / PDF；如需粘贴到微信公众号，建议选择预设主题以获取完整内联样式。
            </div>
          )}

          {isDarkThemeRisk && (
            <div className="mx-auto max-w-[740px] rounded-xl border border-amber-500/25 bg-amber-50/85 px-3.5 py-2.5 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              提示：当前所选暗色主题在粘贴到微信公众号时，浅色文字可能会被默认白底影响可读性，发布前请确认预览效果。
            </div>
          )}

          {deviceModel === 'custom' ? (
            <div
              className="relative mx-auto overflow-hidden rounded-[22px] border border-border/80 bg-white shadow-editorial transition-all duration-300"
              style={{
                width: `${customWidth}px`,
                height: `${customHeight}px`,
                maxWidth: '100%',
              }}
            >
              <div className="flex h-full w-full flex-col overflow-hidden bg-white">
                <div className="h-6 w-full shrink-0 border-b border-neutral-100 bg-neutral-50 px-3 text-[10px] leading-6 font-mono text-neutral-500 select-none print:hidden">
                  {customWidth} × {customHeight}
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">{renderArticleContent()}</div>
              </div>
            </div>
          ) : deviceModel === 'pc' ? (
            <div className="mx-auto min-h-[760px] w-full max-w-[740px] overflow-hidden rounded-2xl border border-black/6 bg-white shadow-editorial dark:border-white/10">
              {renderArticleContent()}
            </div>
          ) : (
            <DeviceFrame device={deviceModel}>{renderArticleContent()}</DeviceFrame>
          )}
        </div>
      </div>
    </div>
  );
}
