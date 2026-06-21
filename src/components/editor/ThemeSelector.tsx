'use client';

import * as React from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { THEME_GROUPS } from '@/lib/themes/index';
import type { ThemePreview } from '@/lib/themes/types';
import { buildThemePreview } from '@/lib/themes/preview';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Check, Trash2, Save, X, Download, Upload, FileJson } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ThemeSelector() {
  const {
    theme, setTheme,
    customThemeCss, setCustomThemeCss,
    savedThemes, addSavedTheme, updateSavedTheme, deleteSavedTheme
  } = useEditorStore();

  const [isSaveDialogOpen, setIsSaveDialogOpen] = React.useState(false);
  const [themeName, setThemeName] = React.useState("");
  const [isEditorVisible, setIsEditorVisible] = React.useState(true);

  const importFileRef = React.useRef<HTMLInputElement>(null);
  const importAllFileRef = React.useRef<HTMLInputElement>(null);

  const currentSavedTheme = savedThemes.find(t => t.id === theme);
  const isCustomOrSaved = theme === 'custom' || !!currentSavedTheme;

  // --- Theme Export / Import handlers ---

  const handleExportTheme = (t: typeof savedThemes[number]) => {
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
    const data = savedThemes.map(t => ({ id: t.id, name: t.name, css: t.css, updatedAt: t.updatedAt }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `textura-themes-all.json`;
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
          toast.error('无效的的主题文件：缺少 name 或 css 字段');
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
    // Reset so the same file can be re-imported
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
            importedCount++;
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

  // Auto-show editor when switching to a custom/saved theme
  React.useEffect(() => {
    if (isCustomOrSaved) {
      setIsEditorVisible(true);
    }
  }, [theme, isCustomOrSaved]);

  // CSS Sanitization to prevent XSS breakout from <style> tags
  // We sanitize the raw input by removing any script tags or closing style tags 
  // that could allow breaking out of the context.
  const handleCssChange = (css: string) => {
    // Basic anti-XSS for <style> blocks
    const sanitizedCss = css
      .replace(/<\/style>/gi, '')   // Prevent breaking out of the style block
      .replace(/<script[^>]*>.*<\/script>/gi, '') // Remove inline scripts
      .replace(/javascript:/gi, ''); // Remove JS protocols

    setCustomThemeCss(sanitizedCss);
  };

  const handleCloseEditor = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (theme === 'custom') {
      // If creating new custom theme, close means cancel -> go back to default
      setTheme('default');
    } else {
      // If editing existing theme, just hide the editor
      setIsEditorVisible(false);
    }
  };

  const handleSaveClick = () => {
    if (currentSavedTheme) {
      setThemeName(currentSavedTheme.name);
    } else {
      setThemeName("");
    }
    setIsSaveDialogOpen(true);
  };

  const handleConfirmSave = () => {
    if (!themeName.trim()) return;

    if (currentSavedTheme) {
      updateSavedTheme(currentSavedTheme.id, themeName, customThemeCss);
    } else {
      const newId = `custom-${Date.now()}`;
      addSavedTheme(newId, themeName, customThemeCss);
      setTheme(newId);
    }
    setIsSaveDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个模板吗？此操作无法撤销。')) {
      deleteSavedTheme(id);
    }
  };

  const parseCssToStyles = (css: string): Record<string, string> => {
    const styles: Record<string, string> = {};

    // Helper to extract property from a CSS block for a given selector
    // This is a heuristic parser
    const extract = (selectorPart: string, prop: string) => {
      // Find a block that contains the selector
      // This is hard with regex. Let's just look for "selector { ... prop: value ... }"
      // Simplified: look for `selector` followed by `{` then `prop`
      try {
        const blockRegex = new RegExp(`${selectorPart}[^{]*\\{([^}]*)\\}`, 'g');
        let match;
        while ((match = blockRegex.exec(css)) !== null) {
          const content = match[1];
          const propRegex = new RegExp(`${prop}\\s*:\\s*([^;!]+)`, 'i');
          const propMatch = content.match(propRegex);
          if (propMatch) return propMatch[1].trim();
        }
      } catch { return null; }
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

  const renderThemeSwatch = (preview: ThemePreview) => {
    return (
      <div className="w-full h-full flex flex-col p-3 gap-2" style={{ backgroundColor: preview.background }}>
        {/* Title Line (H1) */}
        <div className="w-3/4 h-2.5 rounded-sm" style={{ backgroundColor: preview.heading, opacity: 0.9 }} />

        {/* Secondary Line (H2) */}
        <div className="w-1/2 h-2 rounded-sm" style={{ backgroundColor: preview.heading, opacity: 0.7 }} />

        {/* Body Lines (P) */}
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="w-full h-1.5 rounded-sm" style={{ backgroundColor: preview.text, opacity: 0.6 }} />
          <div className="w-11/12 h-1.5 rounded-sm" style={{ backgroundColor: preview.text, opacity: 0.6 }} />
          <div className="w-full h-1.5 rounded-sm" style={{ backgroundColor: preview.text, opacity: 0.6 }} />
        </div>

        {/* Accent/Link Line */}
        <div className="w-1/3 h-1.5 rounded-sm mt-1" style={{ backgroundColor: preview.accent }} />
      </div>
    );
  };

  return (
    <div className="h-full w-full bg-background flex flex-col overflow-hidden">
      <div className="flex-none p-4 border-b bg-muted/30 shrink-0 hidden">
        <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <span className="w-1 h-4 bg-primary rounded-full" />
          选择模板
        </h2>
      </div>

      <ScrollArea className="flex-1 h-full">
        <div className="p-4 pb-40 space-y-6">
          {/* Saved Custom Themes */}
          {savedThemes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">我的收藏</h3>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={handleExportAllThemes}
                    title="导出全部主题"
                  >
                    <Download className="w-3 h-3 mr-0.5" /> 导出全部
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={handleImportAllClick}
                    title="批量导入主题"
                  >
                    <Upload className="w-3 h-3 mr-0.5" /> 导入
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {savedThemes.map((t) => (
                  <div key={t.id} className="group relative">
                    <button
                      onClick={() => {
                        setTheme(t.id);
                        setCustomThemeCss(t.css);
                      }}
                      className={cn(
                        "w-full aspect-[4/3] rounded-lg border-2 transition-all overflow-hidden relative shadow-sm hover:shadow-md",
                        theme === t.id
                          ? "border-primary ring-2 ring-primary/20 ring-offset-1"
                          : "border-transparent hover:border-border/80"
                      )}
                    >
                      {renderThemeSwatch(buildThemePreview(parseCssToStyles(t.css || '')))}
                      {theme === t.id && (
                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                          <div className="bg-primary text-primary-foreground rounded-full p-1 shadow-sm">
                            <Check className="w-4 h-4" />
                          </div>
                        </div>
                      )}
                    </button>
                    <div className="flex items-center justify-between mt-1.5 px-0.5">
                      <span className="text-xs font-medium truncate max-w-[80px]">{t.name}</span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-muted-foreground hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportTheme(t);
                          }}
                          title="导出主题"
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(t.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create New Custom Theme Button */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">自定义</h3>
            <button
              onClick={() => setTheme('custom')}
              className={cn(
                "w-full p-3 rounded-lg border-2 border-dashed transition-all duration-200 group relative flex items-center justify-center gap-2 hover:bg-muted/50",
                theme === 'custom'
                  ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                  : "border-border hover:border-primary/50"
              )}
            >
              <span className={cn(
                "font-medium text-sm",
                theme === 'custom' ? "text-primary" : "text-muted-foreground group-hover:text-primary"
              )}>
                + 新建自定义样式
              </span>
            </button>
            <button
              onClick={handleImportClick}
              className="w-full p-3 rounded-lg border-2 border-dashed border-border transition-all duration-200 flex items-center justify-center gap-2 hover:bg-muted/50 hover:border-primary/50 group"
            >
              <FileJson className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="font-medium text-sm text-muted-foreground group-hover:text-primary transition-colors">
                导入主题文件
              </span>
            </button>
          </div>

          {/* Editor Area */}
          {isCustomOrSaved && isEditorVisible && (
            <div className="p-4 border rounded-lg bg-muted/20 space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <Label htmlFor="custom-css" className="text-xs font-medium text-muted-foreground">
                  CSS 编辑器
                </Label>
                <div className="flex gap-2">
                  {currentSavedTheme && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(currentSavedTheme.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> 删除
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-muted-foreground/10"
                    onClick={handleCloseEditor}
                    title={theme === 'custom' ? "取消编辑" : "收起编辑器"}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Textarea
                id="custom-css"
                value={customThemeCss}
                onChange={(e) => handleCssChange(e.target.value)}
                placeholder=".prose h1 { color: red; }"
                className="font-mono text-xs min-h-[200px] resize-y bg-background"
              />

              <div className="flex justify-between items-center">
                <p className="text-[10px] text-muted-foreground">
                  .prose 为根选择器
                </p>
                <Button size="sm" onClick={handleSaveClick}>
                  <Save className="w-4 h-4 mr-1" />
                  {currentSavedTheme ? '保存修改' : '保存模板'}
                </Button>
              </div>
            </div>
          )}

          {THEME_GROUPS.map((group) => (
            <div key={group.label} className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{group.label}</h3>
              <div className="grid grid-cols-2 gap-3">
                {group.themes.map((t) => (
                  <div key={t.id} className="group">
                    <button
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        "w-full aspect-[4/3] rounded-xl border transition-all overflow-hidden relative shadow-sm hover:shadow-md group-hover:-translate-y-0.5 duration-300",
                        theme === t.id
                          ? "border-primary ring-2 ring-primary/20 ring-offset-2"
                          : "border-border/40 hover:border-border"
                      )}
                    >
                      {renderThemeSwatch(t.preview ?? buildThemePreview(t.styles))}

                      {theme === t.id && (
                        <div className="absolute inset-0 bg-black/5 dark:bg-white/10 flex items-center justify-center backdrop-blur-[1px]">
                          <div className="bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg scale-100 animate-in zoom-in duration-200">
                            <Check className="w-4 h-4" />
                          </div>
                        </div>
                      )}
                    </button>
                    <div className="mt-2 px-1">
                      <div className="text-xs font-medium text-foreground/90">{t.name}</div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{t.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentSavedTheme ? '重命名/保存' : '保存新模板'}</DialogTitle>
            <DialogDescription>
              给你的自定义模板起个好听的名字吧。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                名称
              </Label>
              <Input
                id="name"
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                className="col-span-3"
                placeholder="例如：我的绿色主题"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>取消</Button>
            <Button onClick={handleConfirmSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden file inputs for theme import */}
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
