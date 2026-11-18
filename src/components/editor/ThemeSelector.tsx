'use client';

import * as React from 'react';
import {
  Check,
  Download,
  FileJson,
  Plus,
  Search,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { THEME_GROUPS } from '@/lib/themes/index';
import { buildThemePreview } from '@/lib/themes/preview';
import type { ThemePreview } from '@/lib/themes/types';
import { cn } from '@/lib/utils';
import { isWeChatDarkThemeRisk } from '@/lib/wechatCompat';
import { useEditorStore } from '@/store/useEditorStore';

const CATEGORY_OPTIONS = [
  { id: 'all', label: '全部' },
  { id: '经典', label: '经典' },
  { id: '潮流', label: '潮流' },
  { id: 'MD 系列', label: 'MD 系列' },
  { id: '更多风格', label: '更多风格' },
  { id: 'custom', label: '自定义' },
] as const;

type CategoryFilter = (typeof CATEGORY_OPTIONS)[number]['id'];

export function ThemeSelector() {
  const theme = useEditorStore((s) => s.theme);
  const setTheme = useEditorStore((s) => s.setTheme);
  const customThemeCss = useEditorStore((s) => s.customThemeCss);
  const setCustomThemeCss = useEditorStore((s) => s.setCustomThemeCss);
  const savedThemes = useEditorStore((s) => s.savedThemes);
  const addSavedTheme = useEditorStore((s) => s.addSavedTheme);
  const updateSavedTheme = useEditorStore((s) => s.updateSavedTheme);
  const deleteSavedTheme = useEditorStore((s) => s.deleteSavedTheme);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState<CategoryFilter>('all');
  const [isSaveDialogOpen, setIsSaveDialogOpen] = React.useState(false);
  const [themeName, setThemeName] = React.useState('');
  const [isEditorHidden, setIsEditorHidden] = React.useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  const importFileRef = React.useRef<HTMLInputElement>(null);
  const importAllFileRef = React.useRef<HTMLInputElement>(null);

  const effectiveThemeId =
    theme === 'default' ? (THEME_GROUPS[0]?.themes[0]?.id ?? 'apple') : theme;

  const currentSavedTheme = React.useMemo(
    () => savedThemes.find((t) => t.id === theme),
    [savedThemes, theme]
  );
  const isCustomOrSaved = theme === 'custom' || Boolean(currentSavedTheme);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredSavedThemes = React.useMemo(() => {
    if (activeCategory !== 'all' && activeCategory !== 'custom') {
      return [];
    }
    if (!normalizedQuery) return savedThemes;
    return savedThemes.filter((t) => t.name.toLowerCase().includes(normalizedQuery));
  }, [activeCategory, normalizedQuery, savedThemes]);

  const filteredGroups = React.useMemo(() => {
    if (activeCategory === 'custom') {
      return [];
    }

    return THEME_GROUPS.filter(
      (group) => activeCategory === 'all' || group.label === activeCategory
    )
      .map((group) => ({
        ...group,
        themes: normalizedQuery
          ? group.themes.filter(
              (t) =>
                t.name.toLowerCase().includes(normalizedQuery) ||
                t.id.toLowerCase().includes(normalizedQuery) ||
                (t.description && t.description.toLowerCase().includes(normalizedQuery))
            )
          : group.themes,
      }))
      .filter((group) => group.themes.length > 0);
  }, [activeCategory, normalizedQuery]);

  const showCustomActions = activeCategory === 'all' || activeCategory === 'custom';
  const hasAnyResults =
    filteredSavedThemes.length > 0 || filteredGroups.length > 0 || (showCustomActions && !normalizedQuery);

  const handleExportTheme = (t: (typeof savedThemes)[number]) => {
    const data = { id: t.id, name: t.name, css: t.css, updatedAt: t.updatedAt };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `textura-theme-${t.name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`已导出主题「${t.name}」`);
  };

  const handleExportAllThemes = () => {
    if (savedThemes.length === 0) {
      toast.error('没有可导出的主题');
      return;
    }
    const data = savedThemes.map((t) => ({
      id: t.id,
      name: t.name,
      css: t.css,
      updatedAt: t.updatedAt,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'textura-themes-all.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${savedThemes.length} 个主题`);
  };

  const handleImportClick = () => {
    importFileRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!parsed.name || typeof parsed.name !== 'string' || !parsed.css || typeof parsed.css !== 'string') {
          toast.error('无效的主题文件：缺少 name 或 css 字段');
          return;
        }
        const newId = `custom-${Date.now()}`;
        addSavedTheme(newId, parsed.name, parsed.css);
        toast.success(`已导入主题「${parsed.name}」`);
      } catch {
        toast.error('文件解析失败，请确认为有效的 JSON 文件');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportAllClick = () => {
    importAllFileRef.current?.click();
  };

  const handleImportAllFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(parsed)) {
          toast.error('批量导入需要 JSON 数组格式');
          return;
        }
        let importedCount = 0;
        for (const item of parsed) {
          if (item.name && typeof item.name === 'string' && item.css && typeof item.css === 'string') {
            const newId = `custom-${Date.now()}-${importedCount}`;
            addSavedTheme(newId, item.name, item.css);
            importedCount += 1;
          }
        }
        if (importedCount > 0) {
          toast.success(`已导入 ${importedCount} 个主题`);
        } else {
          toast.error('未找到有效的主题数据');
        }
      } catch {
        toast.error('文件解析失败，请确认为有效的 JSON 文件');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCssChange = (css: string) => {
    const sanitizedCss = css
      .replace(/<\/style>/gi, '')
      .replace(/<script[^>]*>.*<\/script>/gi, '')
      .replace(/javascript:/gi, '');

    setCustomThemeCss(sanitizedCss);
  };

  const handleSelectCustomTheme = (id: string, css?: string) => {
    setIsEditorHidden(false);
    setTheme(id);
    if (css !== undefined) {
      setCustomThemeCss(css);
    }
  };

  const handleCloseEditor = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (theme === 'custom') {
      setTheme('default');
    } else {
      setIsEditorHidden(true);
    }
  };

  const handleSaveClick = () => {
    setThemeName(currentSavedTheme ? currentSavedTheme.name : '');
    setIsSaveDialogOpen(true);
  };

  const handleConfirmSave = () => {
    if (!themeName.trim()) return;

    if (currentSavedTheme) {
      updateSavedTheme(currentSavedTheme.id, themeName.trim(), customThemeCss);
      toast.success(`已更新主题「${themeName.trim()}」`);
    } else {
      const newId = `custom-${Date.now()}`;
      addSavedTheme(newId, themeName.trim(), customThemeCss);
      setTheme(newId);
      toast.success(`已保存主题「${themeName.trim()}」`);
    }
    setIsSaveDialogOpen(false);
  };

  const handleDeleteTheme = (id: string, name: string) => {
    deleteSavedTheme(id);
    setConfirmDeleteId(null);
    toast.success(`已删除主题「${name}」`);
  };

  const parseCssToStyles = (css: string): Record<string, string> => {
    const styles: Record<string, string> = {};

    const extract = (selectorPart: string, prop: string) => {
      try {
        const blockRegex = new RegExp(`${selectorPart}[^{]*\\{([^}]*)\\}`, 'g');
        let match;
        while ((match = blockRegex.exec(css)) !== null) {
          const content = match[1];
          const propRegex = new RegExp(`${prop}\\s*:\\s*([^;!]+)`, 'i');
          const propMatch = content.match(propRegex);
          if (propMatch) return propMatch[1].trim();
        }
      } catch {
        return null;
      }
      return null;
    };

    const bg = extract('.prose', 'background-color') || extract('container', 'background-color');
    if (bg) styles.container = `background-color: ${bg}`;

    const h1Color = extract('h1', 'color');
    if (h1Color) styles.h1 = `color: ${h1Color}`;

    const pColor = extract('p', 'color');
    if (pColor) styles.p = `color: ${pColor}`;

    const accentColor = extract('a', 'color') || extract('blockquote', 'color');
    if (accentColor) styles.a = `color: ${accentColor}`;

    return styles;
  };

  const renderThemeSwatch = (preview: ThemePreview) => (
    <div
      className="flex h-full w-full flex-col justify-between p-2.5 text-left"
      style={{ backgroundColor: preview.background }}
    >
      <div className="space-y-1.5">
        {/* Heading with accent indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: preview.accent }}
          />
          <div
            className="h-2 w-3/4 rounded-xs"
            style={{ backgroundColor: preview.heading, opacity: 0.9 }}
          />
        </div>

        {/* Body rhythm lines */}
        <div className="space-y-1 pt-0.5">
          <div className="h-1.5 w-full rounded-xs" style={{ backgroundColor: preview.text, opacity: 0.52 }} />
          <div className="h-1.5 w-10/12 rounded-xs" style={{ backgroundColor: preview.text, opacity: 0.45 }} />
        </div>
      </div>

      {/* Mini quote / accent bar */}
      <div
        className="mt-1 flex items-center gap-1.5 rounded-xs px-1.5 py-1"
        style={{
          backgroundColor: `${preview.accent}18`,
          borderLeft: `2px solid ${preview.accent}`,
        }}
      >
        <div className="h-1 w-2/3 rounded-xs" style={{ backgroundColor: preview.accent, opacity: 0.85 }} />
      </div>
    </div>
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-transparent">
      {/* Search + Category Filter Bar */}
      <div className="shrink-0 space-y-2.5 border-b border-border/70 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索主题名称或风格..."
            aria-label="搜索主题"
            className="h-8 bg-background/80 pl-8 pr-7 text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="清空搜索"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          {CATEGORY_OPTIONS.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'shrink-0 rounded-full px-2 py-1 text-[11px] font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Theme Gallery Scroll Body */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 p-3 pb-16">
          {/* Active Custom CSS Editor (when editing custom or saved theme) */}
          {isCustomOrSaved && !isEditorHidden && (
            <div className="space-y-3 rounded-xl border border-primary/25 bg-muted/35 p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="custom-css" className="text-xs font-semibold text-foreground">
                  {currentSavedTheme ? `正在编辑：${currentSavedTheme.name}` : '新建自定义 CSS'}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={handleCloseEditor}
                  title={theme === 'custom' ? '取消编辑' : '收起编辑器'}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Textarea
                id="custom-css"
                value={customThemeCss}
                onChange={(e) => handleCssChange(e.target.value)}
                placeholder=".prose h1 { color: #1B4D47; }"
                className="min-h-[180px] resize-y bg-background font-mono text-xs leading-relaxed"
              />

              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] text-muted-foreground">根选择器为 .prose</span>
                <Button type="button" size="xs" onClick={handleSaveClick} className="h-7 px-2.5">
                  <Save className="h-3 w-3" />
                  {currentSavedTheme ? '保存修改' : '保存为模板'}
                </Button>
              </div>
            </div>
          )}

          {/* Saved Custom Themes */}
          {filteredSavedThemes.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-0.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  我的收藏 ({filteredSavedThemes.length})
                </h3>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={handleExportAllThemes}
                  >
                    <Download className="h-3 w-3" />
                    导出全部
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={handleImportAllClick}
                  >
                    <Upload className="h-3 w-3" />
                    导入
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {filteredSavedThemes.map((t) => {
                  const isActive = theme === t.id;
                  const isConfirming = confirmDeleteId === t.id;
                  return (
                    <div key={t.id} className="group space-y-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectCustomTheme(t.id, t.css)}
                        className={cn(
                          'relative aspect-[4/3] w-full overflow-hidden rounded-xl border transition-all duration-200',
                          isActive
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-border/70 hover:border-border hover:shadow-xs'
                        )}
                      >
                        {renderThemeSwatch(buildThemePreview(parseCssToStyles(t.css || '')))}
                        {isActive && (
                          <div className="absolute right-1.5 top-1.5 rounded-full bg-primary p-1 text-primary-foreground shadow-xs">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </button>

                      <div className="flex items-center justify-between gap-1 px-0.5">
                        <span className="truncate text-xs font-medium text-foreground">{t.name}</span>
                        <div className="flex shrink-0 items-center gap-0.5">
                          {isConfirming ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleDeleteTheme(t.id, t.name)}
                                className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-white"
                              >
                                确认
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded px-1 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                              >
                                取消
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-0.5 opacity-75 transition-opacity group-hover:opacity-100">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                className="h-5 w-5 text-muted-foreground hover:text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportTheme(t);
                                }}
                                title="导出此主题"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(t.id);
                                }}
                                title="删除此主题"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preset Theme Groups */}
          {filteredGroups.map((group) => (
            <div key={group.label} className="space-y-2.5">
              <div className="flex items-center justify-between px-0.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </h3>
                <span className="font-mono text-[10px] text-muted-foreground/80">
                  {group.themes.length}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {group.themes.map((t) => {
                  const isActive = effectiveThemeId === t.id;
                  const darkRisk = isWeChatDarkThemeRisk(t.id);
                  return (
                    <div key={t.id} className="group">
                      <button
                        type="button"
                        onClick={() => setTheme(t.id)}
                        className={cn(
                          'relative aspect-[4/3] w-full overflow-hidden rounded-xl border transition-all duration-200 group-hover:-translate-y-0.5',
                          isActive
                            ? 'border-primary ring-2 ring-primary/20 shadow-xs'
                            : 'border-border/70 hover:border-border hover:shadow-xs'
                        )}
                      >
                        {renderThemeSwatch(t.preview ?? buildThemePreview(t.styles))}

                        {darkRisk && (
                          <span
                            title="暗色主题在微信后台中可能因背景被剥离而影响可读性"
                            className="absolute left-1.5 top-1.5 rounded bg-amber-500/90 px-1 py-0.5 text-[9px] font-medium text-white shadow-2xs"
                          >
                            暗色
                          </span>
                        )}

                        {isActive && (
                          <div className="absolute right-1.5 top-1.5 rounded-full bg-primary p-1 text-primary-foreground shadow-xs">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </button>

                      <div className="mt-1.5 px-0.5">
                        <div className="truncate text-xs font-medium text-foreground">
                          {t.name}
                        </div>
                        {t.description && (
                          <div className="mt-0.5 line-clamp-1 text-[10.5px] text-muted-foreground">
                            {t.description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Custom CSS Creation & Import Section */}
          {showCustomActions && !normalizedQuery && (
            <div className="space-y-2 border-t border-border/70 pt-3">
              <h3 className="px-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                自定义与导入
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectCustomTheme('custom')}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-lg border border-dashed px-2.5 py-2.5 text-xs font-medium transition-colors',
                    theme === 'custom'
                      ? 'border-primary bg-primary/8 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  编写自定义 CSS
                </button>
                <button
                  type="button"
                  onClick={handleImportClick}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-2.5 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50 hover:text-foreground"
                >
                  <FileJson className="h-3.5 w-3.5" />
                  导入 JSON 主题
                </button>
              </div>
            </div>
          )}

          {/* Search Empty State */}
          {!hasAnyResults && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="mb-2.5 h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs font-medium text-foreground">未找到匹配的主题</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                试试更换关键词，或切换回全部分组查看
              </p>
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="mt-3"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
              >
                重置筛选
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Save Custom Theme Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentSavedTheme ? '保存自定义主题' : '保存为新模板'}</DialogTitle>
            <DialogDescription>给你的专属样式起个容易辨认的名称。</DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Label htmlFor="theme-name" className="mb-2 block text-xs text-muted-foreground">
              主题名称
            </Label>
            <Input
              id="theme-name"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirmSave();
                }
              }}
              placeholder="例如：松墨专栏风"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={handleConfirmSave} disabled={!themeName.trim()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <input
        ref={importFileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportFile}
      />
      <input
        ref={importAllFileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportAllFile}
      />
    </div>
  );
}
