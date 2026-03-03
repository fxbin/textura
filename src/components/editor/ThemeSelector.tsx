'use client';

import * as React from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { THEMES, THEME_GROUPS } from '@/lib/themes/index';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Check, Trash2, Save, X } from 'lucide-react';
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

  const currentSavedTheme = savedThemes.find(t => t.id === theme);
  const isCustomOrSaved = theme === 'custom' || !!currentSavedTheme;

  // Auto-show editor when switching to a custom/saved theme
  React.useEffect(() => {
    if (isCustomOrSaved) {
      setIsEditorVisible(true);
    }
  }, [theme, isCustomOrSaved]);

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

  /** Extract a css property value from an inline style string */
  const extractStyle = (styleStr: string, prop: string): string | null => {
    const regex = new RegExp(`${prop}\\s*:\\s*([^;!]+)`, 'i');
    const match = styleStr.match(regex);
    return match ? match[1].trim() : null;
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
      } catch (e) { return null; }
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

  const renderThemeSwatch = (styles: Record<string, string>) => {
    const bg = extractStyle(styles.container || '', 'background-color') || '#fff';
    const textColor = extractStyle(styles.p || '', 'color') || '#333';
    const h1Color = extractStyle(styles.h1 || '', 'color') || textColor;
    const accentColor = extractStyle(styles.a || styles.blockquote || '', 'color') || h1Color;
    const borderColor = extractStyle(styles.container || '', 'border-color') || 'transparent';

    // Check if it's a dark theme based on background brightness
    // Simple heuristic: if bg is dark, use light borders for contrast
    const isDark = bg.match(/#([0-9a-f]{3}){1,2}/i) ? 
      (parseInt(bg.replace('#', ''), 16) > 0xffffff / 2 ? false : true) : false;

    return (
      <div className="w-full h-full flex flex-col p-3 gap-2" style={{ backgroundColor: bg }}>
        {/* Title Line (H1) */}
        <div className="w-3/4 h-2.5 rounded-sm" style={{ backgroundColor: h1Color, opacity: 0.9 }} />
        
        {/* Secondary Line (H2) */}
        <div className="w-1/2 h-2 rounded-sm" style={{ backgroundColor: h1Color, opacity: 0.7 }} />
        
        {/* Body Lines (P) */}
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="w-full h-1.5 rounded-sm" style={{ backgroundColor: textColor, opacity: 0.6 }} />
          <div className="w-11/12 h-1.5 rounded-sm" style={{ backgroundColor: textColor, opacity: 0.6 }} />
          <div className="w-full h-1.5 rounded-sm" style={{ backgroundColor: textColor, opacity: 0.6 }} />
        </div>

        {/* Accent/Link Line */}
        <div className="w-1/3 h-1.5 rounded-sm mt-1" style={{ backgroundColor: accentColor }} />
      </div>
    );
  };

  return (
    <div className="h-full w-full bg-background/95 backdrop-blur-sm flex flex-col border-l border-border/50 overflow-hidden">
      <div className="flex-none p-4 border-b bg-muted/30 shrink-0">
        <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <span className="w-1 h-4 bg-primary rounded-full"/>
          选择模板
        </h2>
      </div>

      <ScrollArea className="flex-1 h-full">
        <div className="p-4 pb-40 space-y-6">
          {/* Saved Custom Themes */}
          {savedThemes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">我的收藏</h3>
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
                      {renderThemeSwatch(parseCssToStyles(t.css || ''))}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(t.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
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
                 onChange={(e) => setCustomThemeCss(e.target.value)}
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
                      {renderThemeSwatch(t.styles)}
                      
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
    </div>
  );
}
