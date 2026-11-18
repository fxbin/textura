'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { copyRichContent } from '@/lib/clipboard';
import { resolveImagePaths } from '@/lib/imageResolver';
import { applyTheme, md } from '@/lib/markdown';
import { renderMermaidInHtml } from '@/lib/mermaid';
import { THEMES } from '@/lib/themes/index';
import { calculateWordCount } from '@/lib/utils';
import { buildCopyHtml, isWeChatDarkThemeRisk } from '@/lib/wechatCompat';
import { useEditorStore } from '@/store/useEditorStore';

function buildStatsSectionHtml(markdown: string) {
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
}

export function useWeChatCopy() {
  const markdown = useEditorStore((s) => s.markdown);
  const theme = useEditorStore((s) => s.theme);
  const fontSize = useEditorStore((s) => s.fontSize);
  const customThemeCss = useEditorStore((s) => s.customThemeCss);
  const isStatsVisible = useEditorStore((s) => s.isStatsVisible);
  const imageBasePath = useEditorStore((s) => s.imageBasePath);

  const [isCopying, setIsCopying] = React.useState(false);
  const [hasCopied, setHasCopied] = React.useState(false);
  const resetTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const effectiveThemeId = React.useMemo(
    () => (theme === 'default' ? (THEMES[0]?.id ?? 'apple') : theme),
    [theme]
  );

  const isPresetTheme = React.useMemo(
    () => THEMES.some((item) => item.id === effectiveThemeId),
    [effectiveThemeId]
  );

  const isDarkRisk = React.useMemo(
    () => (isPresetTheme ? isWeChatDarkThemeRisk(effectiveThemeId) : false),
    [effectiveThemeId, isPresetTheme]
  );

  const copyToWeChat = React.useCallback(async () => {
    if (isCopying) return;
    setIsCopying(true);

    try {
      let sourceHtml = '';

      if (isPresetTheme) {
        const rawHtml = md.render(markdown);
        const resolvedHtml = resolveImagePaths(rawHtml, imageBasePath);
        const themedHtml = applyTheme(resolvedHtml, effectiveThemeId, fontSize);
        sourceHtml = await renderMermaidInHtml(themedHtml);
      } else {
        const customNode = document.querySelector('[data-preview-custom-body]') as HTMLElement | null;
        sourceHtml = customNode?.innerHTML ?? '';
      }

      if (!sourceHtml) {
        toast.error('未找到可复制的预览内容');
        return;
      }

      const statsHtml = isStatsVisible ? buildStatsSectionHtml(markdown) : '';
      const contentToCopy = await buildCopyHtml(
        sourceHtml,
        effectiveThemeId,
        isPresetTheme,
        customThemeCss,
        statsHtml
      );

      const result = await copyRichContent(contentToCopy, markdown);
      if (!result.ok) {
        toast.error(
          result.error instanceof Error
            ? result.error.message
            : '复制失败，请检查浏览器剪贴板权限'
        );
        return;
      }

      setHasCopied(true);
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = setTimeout(() => {
        setHasCopied(false);
      }, 2000);

      if (isPresetTheme) {
        if (isDarkRisk) {
          toast.warning('当前为暗色主题，微信可能剥离深色背景导致文字不可见。建议使用浅色主题。');
        } else {
          toast.success(
            result.method === 'clipboard'
              ? '已复制到剪贴板，请直接粘贴到公众号后台'
              : '已通过兼容模式复制，可尝试直接粘贴到公众号后台'
          );
        }
      } else {
        toast.warning('已复制当前预览 HTML。自定义主题在微信中可能丢失样式。');
      }
    } catch (error) {
      console.error('Copy to WeChat failed:', error);
      toast.error('复制失败，请重试');
    } finally {
      setIsCopying(false);
    }
  }, [
    customThemeCss,
    effectiveThemeId,
    fontSize,
    imageBasePath,
    isCopying,
    isDarkRisk,
    isPresetTheme,
    isStatsVisible,
    markdown,
  ]);

  return {
    copyToWeChat,
    isCopying,
    hasCopied,
    isPresetTheme,
    isDarkRisk,
  };
}
