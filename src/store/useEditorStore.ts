import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';
import { indexedDBStorage } from './indexedDBStorage';

export type ThemeId =
  | 'default'
  | 'minimal-line'
  | 'card-box'
  | 'mint-fresh'
  | 'side-color'
  | 'tech-blue'
  | 'retro-newspaper'
  | 'lavender-dream'
  | 'autumn-breeze'
  | 'github'
  | 'vue'
  | 'custom'
  | string;

export type DeviceModel =
  | 'iphone-15-pro-max'
  | 'android-flagship'
  | 'pc'
  | 'custom';

export interface SavedTheme {
  id: string;
  name: string;
  css: string;
  updatedAt: number;
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  css: string; // CSS variables or specific styles
  description?: string;
}

export type AiApiProvider = 'openai' | 'anthropic' | 'deepseek' | 'ollama' | 'doubao' | 'qwen' | 'zhipu' | 'custom' | 'none';

export interface AiApiConfig {
  provider: AiApiProvider;
  apiKey: string;
  model: string;
  // 自定义API配置
  customApiUrl?: string;
  customModelName?: string;
}

interface EditorState {
  markdown: string;
  theme: ThemeId;
  fontSize: number;
  deviceModel: DeviceModel;
  customWidth: number;
  customHeight: number;
  customThemeCss: string;
  isSidebarOpen: boolean;
  isScrollSyncEnabled: boolean;
  isStatsVisible: boolean;
  savedThemes: SavedTheme[];
  aiProvider: 'deepseek' | 'kimi' | 'doubao' | 'chatgpt';

  // AI API 配置
  aiApiConfig: AiApiConfig;

  // 设置对话框状态
  isSettingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;

  // Transient state (not persisted typically, but okay here)
  scrollPercentage: number;

  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  setMarkdown: (markdown: string) => void;
  setScrollPercentage: (pct: number) => void;
  setTheme: (theme: ThemeId) => void;
  setFontSize: (size: number) => void;
  setDeviceModel: (model: DeviceModel) => void;
  setCustomSize: (width: number, height: number) => void;
  setCustomThemeCss: (css: string) => void;
  toggleSidebar: () => void;
  toggleScrollSync: () => void;
  toggleStats: () => void;
  setAiProvider: (provider: 'deepseek' | 'kimi' | 'doubao' | 'chatgpt') => void;
  setAiApiConfig: (config: Partial<AiApiConfig>) => void;

  // Actions
  resetMarkdown: () => void;

  // Custom Theme Actions
  addSavedTheme: (id: string, name: string, css: string) => void;
  updateSavedTheme: (id: string, name: string, css: string) => void;
  deleteSavedTheme: (id: string) => void;
}

const defaultMarkdown = `# Textura：重塑文字的质感

> “排版是文本的呼吸。” —— 罗伯特·布林赫斯特

欢迎来到 **Textura**，一个专注于**阅读体验**与**视觉美学**的下一代排版引擎。

## 1. 为什么我们需要更好的排版？

在信息爆炸的时代，我们每天阅读数万字的内容。然而，大多数阅读体验都被粗糙的排版破坏了。Textura 致力于解决以下痛点：

- **拥挤的行距**：让眼睛在换行时迷失方向
- **混乱的层级**：无法快速扫描重点
- **平庸的配色**：缺乏情感与氛围

### 我们的解决方案

1. **黄金比例行高**：基于斐波那契数列计算的字间距
2. **语义化色彩**：用颜色传达情绪，而非仅仅是装饰
3. **响应式节奏**：在手机、平板和桌面端保持一致的阅读韵律

## 2. 丰富的表现力

Textura 不仅支持标准的 Markdown 语法，还对复杂内容进行了深度优化。

### 代码之美

内置 **Shiki** 语法高亮引擎，让代码像艺术品一样展示：

\`\`\`tsx
// TexturaTheme.tsx
interface Theme {
  name: string;
  palette: {
    primary: string;
    background: string;
    text: string;
  };
  typography: {
    fontFamily: string;
    lineHeight: number;
  };
}

const renderTheme = (theme: Theme) => {
  return <div style={{ color: theme.palette.text }}>...</div>;
};
\`\`\`

### 数据可视化

表格不再枯燥，支持优雅的隔行变色与对齐：

| 特性 | 传统编辑器 | Textura |
| :--- | :---: | :---: |
| 实时预览 | ❌ | ✅ |
| 主题切换 | ❌ | ✅ |
| 微信兼容 | ⚠️ | ✅ |
| 导出 PDF | ❌ | ✅ |

### 深度引用

> 好的设计是尽可能少的设计。
>
> —— 迪特·拉姆斯

## 3. 📖 Textura 使用指南

Textura 不仅是一个 Markdown 编辑器，更是一个强大的发布工具。

### 🎨 切换主题

点击右侧的 **主题列表**，你可以实时预览不同风格：

- **预设主题**：我们提供了 30+ 款精心设计的模板，如 \`深海\`、\`薄荷\`、\`MD 经典\` 等。
- **自定义 CSS**：点击 \`新建自定义样式\`，编写专属 CSS 代码，打造独一无二的视觉风格。

### 📱 多端预览

在顶部工具栏右侧，你可以切换预览模式：

- **PC 端**：宽屏沉浸式阅读，适合长文审阅。
- **移动端**：模拟手机真实效果，确保在微信中完美呈现。
- **平板**：适配 iPad 等设备，兼顾大屏与触控体验。

### 🚀 一键发布

写作完成后，点击右上角的 **复制** 按钮：

1. Textura 会自动将 Markdown 转换为带内联样式的 HTML。
2. 完美适配微信公众号后台，格式零丢失。
3. 支持外链图片自动处理（需确保图片可公开访问）。

### 📤 导出与分享

点击顶部工具栏的 **导出** 图标：

- **导出 HTML**：获取纯净的代码，方便二次开发。
- **导出 PDF**：生成高质量文档，适合存档与分享。
- **保存本地**：将当前内容保存为 \`.md\` 文件。

### ✨ AI 辅助创作

点击左侧工具栏的 **AI** 按钮，让智能助手帮你：

- **润色文案**：让语言更优美、流畅。
- **续写内容**：打破灵感枯竭的僵局。
- **检查错别字**：确保文章专业无误。

## 4. 准备好开始了吗？

你现在看到的这篇文章，就是由 Textura 渲染生成的。你可以：

- 在**左侧**编辑区修改这段文字，体验实时渲染
- 在**右侧**侧边栏切换 \`深海\`、\`薄荷\` 或 \`MD 经典\` 等主题
- 点击右上角的 **复制** 按钮，直接粘贴到微信公众号后台

---

**Textura** —— 让每一次阅读都成为享受。
`;

const defaultCustomCss = `/* 
 * 自定义样式模板
 * 这里是 CSS 编辑区，您可以修改以下样式来定制您的文章外观。
 * 使用 .prose 作为根选择器，配合标准的 CSS 语法。
 */

/* 全局字体与颜色 */
.prose {
  color: #333333;           /* 正文字体颜色 */
  line-height: 1.75;        /* 行高，推荐 1.6 ~ 2.0 */
  letter-spacing: 0.05em;   /* 字间距 */
  font-size: 16px;          /* 基础字号 */
}

/* 一级标题 (H1) */
.prose h1 {
  text-align: center;       /* 居中对齐 */
  color: #07c160;           /* 微信绿 */
  font-size: 1.8em;         /* 字号大小 */
  margin-top: 40px;         /* 上间距 */
  margin-bottom: 20px;      /* 下间距 */
  border-bottom: 2px solid #07c160; /* 底部边框 */
  padding-bottom: 10px;     /* 边框内部间距 */
}

/* 二级标题 (H2) */
.prose h2 {
  display: inline-block;    /* 根据内容宽度自适应 */
  background: #f0fdf4;      /* 浅绿色背景 */
  color: #166534;           /* 深绿色文字 */
  padding: 5px 15px;        /* 内边距 */
  border-left: 5px solid #07c160; /* 左侧粗边框 */
  border-radius: 0 4px 4px 0; /* 圆角 */
  margin-top: 30px;
  margin-bottom: 15px;
}

/* 引用块 (Blockquote) */
.prose blockquote {
  font-style: normal;       /* 取消斜体 */
  border-left: 4px solid #d1d5db; /* 左侧灰色边框 */
  background-color: #f9fafb;      /* 浅灰背景 */
  color: #6b7280;                 /* 灰色文字 */
  padding: 10px 15px;             /* 内边距 */
  margin: 20px 0;
  border-radius: 4px;
}

/* 重点文字 (Bold) */
.prose strong {
  color: #07c160;           /* 加粗文字变绿 */
  font-weight: 700;
}

/* 列表 (List) */
.prose ul, .prose ol {
  padding-left: 20px;
  margin: 15px 0;
}

/* 图片 (Image) */
.prose img {
  border-radius: 8px;       /* 图片圆角 */
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); /* 图片阴影 */
  margin: 20px auto;        /* 居中 */
  display: block;
}`;

export const useEditorStore = create<EditorState>()(
  temporal(
    persist(
      (set) => ({
        markdown: defaultMarkdown,
        theme: 'default',
        fontSize: 16,
        deviceModel: 'pc',
        customWidth: 375,
        customHeight: 800,
        customThemeCss: defaultCustomCss,
        isSidebarOpen: true,
        isScrollSyncEnabled: true,
        isStatsVisible: false,
        savedThemes: [],
        aiProvider: 'deepseek',
        aiApiConfig: {
          provider: 'deepseek',
          apiKey: '',
          model: 'deepseek-chat',
        },
        isSettingsOpen: false,
        scrollPercentage: 0,
        _hasHydrated: false,

        setHasHydrated: (state) => set({ _hasHydrated: state }),
        setMarkdown: (markdown) => set({ markdown }),
        setScrollPercentage: (scrollPercentage) => set({ scrollPercentage }),
        setTheme: (theme) => set({ theme }),
        setFontSize: (fontSize) => set({ fontSize }),
        setDeviceModel: (deviceModel) => set({ deviceModel }),
        setCustomSize: (customWidth, customHeight) => set({ customWidth, customHeight }),
        setCustomThemeCss: (customThemeCss) => set({ customThemeCss }),
        toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
        toggleScrollSync: () => set((state) => ({ isScrollSyncEnabled: !state.isScrollSyncEnabled })),
        toggleStats: () => set((state) => ({ isStatsVisible: !state.isStatsVisible })),
        setAiProvider: (aiProvider) => set({ aiProvider }),
        setAiApiConfig: (config) => set((state) => ({
          aiApiConfig: { ...state.aiApiConfig, ...config }
        })),
        setSettingsOpen: (open) => set({ isSettingsOpen: open }),
        resetMarkdown: () => set({ markdown: defaultMarkdown }),

        addSavedTheme: (id, name, css) => set((state) => {
          const newTheme: SavedTheme = {
            id,
            name,
            css,
            updatedAt: Date.now(),
          };
          return { savedThemes: [...state.savedThemes, newTheme] };
        }),

        updateSavedTheme: (id, name, css) => set((state) => ({
          savedThemes: state.savedThemes.map((t) =>
            t.id === id ? { ...t, name, css, updatedAt: Date.now() } : t
          )
        })),

        deleteSavedTheme: (id) => set((state) => ({
          savedThemes: state.savedThemes.filter((t) => t.id !== id),
          theme: state.theme === id ? 'default' : state.theme
        })),
      }),
      {
        name: 'textura-storage',
        storage: indexedDBStorage,
        partialize: (state) => ({
          savedThemes: state.savedThemes,
          customThemeCss: state.customThemeCss,
          markdown: state.markdown,
          theme: state.theme,
          isSidebarOpen: state.isSidebarOpen,
          isScrollSyncEnabled: state.isScrollSyncEnabled,
          isStatsVisible: state.isStatsVisible,
          aiProvider: state.aiProvider,
          aiApiConfig: state.aiApiConfig
        }),
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true);
        },
      }
    ),
    {
      partialize: (state) => ({ markdown: state.markdown }),
      limit: 100,
    }
  ));
