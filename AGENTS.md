# AGENTS.md — Textura 项目协作上下文

> 本文件为 AI 协作代理（以及新成员）提供项目的快速认知锚点。
> 内容应与代码保持同步；改动架构、约束或命令后请一并更新。

## 项目概览

**Textura** —— 下一代微信公众号 Markdown 排版工具。将 Markdown 一键转换为带内联 CSS 的高质量富文本，复制即可无缝粘贴到微信公众号后台，格式零丢失。

- **仓库**：https://github.com/fxbin/textura
- **线上**：https://textura.top
- **版本**：1.0.0-beta.3
- **许可**：MIT

双形态交付：
1. **Web 应用**（主）：静态导出，部署于 GitHub Pages / 自建 Docker（nginx）
2. **桌面应用**：基于 Tauri 2 封装为 Windows / macOS 原生应用

## 核心架构约束（改动前必读）

### 1. 静态导出，无服务端运行时
- `next.config.ts` 配置 `output: "export"`，构建产物为纯静态文件（`out/`）。
- **禁止**引入需要 Node.js 运行时的功能：Server Actions、动态 API Routes、中间件、`headers()`/`cookies()` 等。
- `src/app/api/export/pdf` 当前为空目录，PDF 导出走客户端浏览器打印链路，**不是**服务端接口。
- GitHub Pages 部署需 `basePath: '/textura'`（项目页），自定义域名（textura.top）则去掉 basePath。由 `GITHUB_PAGES` / `CUSTOM_DOMAIN` 环境变量控制。

### 2. 客户端直连 AI API
- AI 调用全部在浏览器端发起（`src/lib/aiService.ts`），直连第三方厂商 API。
- 支持：OpenAI / Anthropic / DeepSeek / Doubao(火山) / Qwen(阿里) / Zhipu(智谱) / Ollama(本地) / Custom。
- 使用 SSE 流式响应，含超时控制（连接 60s、分片间 30s）与连续解析失败熔断（10 次）。
- **API Key 仅存于本地 IndexedDB**，不做云同步。Anthropic 走 `anthropic-dangerous-direct-browser-access` 头部。
- 新增 AI 提供商需同时维护：`AiApiProvider` 类型、`getProviderModels`、`getDefaultModel`、`callXxx` 实现。

### 3. 主题系统 = 内联 CSS 注入
- 主题定义于 `src/lib/themes/`，分组：经典 / 潮流 / MD 系列 / 更多风格。
- 渲染管线（`src/lib/markdown.ts` 的 `applyTheme`）：markdown-it 生成 HTML → DOMParser 解析 → 逐元素注入**内联样式** → 序列化为 HTML 字符串。
- 微信后台会剥离 `<style>` 标签与外联 CSS，**必须**使用内联样式才能保真。
- 支持图片网格自动排版（连续单图 `<p>` 两两并排）。
- highlight.js 仅注册常用语言（减体积）；代码块带 macOS 红黄绿圆点装饰。

### 4. 状态与持久化
- 全局状态：`src/store/useEditorStore.ts`（Zustand + `persist` 中间件）。
- 持久化载体：**IndexedDB**（非 localStorage），`indexedDBStorage` 适配器，key = `textura-storage`。
- 历史回溯：`temporal`（zundo）包裹器，仅追踪 `markdown` 字段，上限 100 步。
- Hydration 安全：`usePersistedStoresHydration` 钩子 + `_hasHydrated` 标志，避免 SSR/首屏闪烁。涉及持久化状态的组件应等待 hydration 完成。
- Tauri 端另有 `documentStore` / `historyStore` 处理本地文件工作流。

## 目录结构

```
src/
├── app/                    # Next.js App Router（静态导出）
│   ├── layout.tsx          # 根布局：ThemeProvider + TooltipProvider + Toaster
│   ├── page.tsx            # 主页：三栏布局 + 移动端 Tab 切换
│   └── globals.css
├── components/
│   ├── editor/             # 编辑器、预览、AI 助手、主题选择器、引导对话框
│   ├── layout/             # 顶栏、设置、历史、文档详情栏
│   ├── preview/            # 设备外框
│   └── ui/                 # Shadcn/UI 基础组件
├── hooks/                  # 自动保存、滚动联动、Tauri 运行时、草稿恢复等
├── lib/
│   ├── themes/             # 主题定义（classic/modern/extra/md-main/color-variants）
│   ├── aiService.ts        # 多厂商 AI 调用
│   ├── markdown.ts         # 渲染管线核心
│   ├── clipboard.ts        # 复制到剪贴板
│   ├── htmlToMarkdown.ts   # HTML→MD（turndown）
│   └── wechatCompat.ts     # 微信兼容处理
├── store/                  # Zustand stores
└── types/                  # 类型声明（mammoth、modules）

src-tauri/
└── src/lib.rs              # Tauri 原生菜单（App/文件/编辑/格式/视图/窗口）+ 事件转发
```

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16.1.6（App Router）+ React 19.2.3 |
| 编译 | React Compiler（babel-plugin-react-compiler，已开启 `reactCompiler: true`）|
| 样式 | TailwindCSS v4 + @tailwindcss/typography + Shadcn/UI（radix-ui）|
| 状态 | Zustand 5 + persist + zundo（Undo/Redo）|
| Markdown | markdown-it + highlight.js（按需注册语言）|
| 文档 | mammoth（DOCX 导入）、turndown（HTML→MD）、heti（中文排版）|
| 图表 | mermaid |
| 桌面 | Tauri 2（dialog / fs / shell 插件）|

## 常用命令

```bash
npm install          # 安装依赖
npm run dev          # 本地开发（http://localhost:3000）
npm run build        # 构建静态导出到 out/
npm run lint         # ESLint 检查
npm run tauri:dev    # Tauri 桌面端开发
npm run tauri:build  # 打包桌面应用（Windows/macOS）
```

## 部署

- **Docker**：`docker compose -f docker-compose.yml up -d --build`（源码构建）或 `./deploy.sh`
- **GitHub Pages**：`.github/workflows/github-pages.yml`，由 `CUSTOM_DOMAIN` / `DOMAIN_NAME` 变量控制
- **桌面 Release**：`.github/workflows/release.yml`（打 `v*` tag 触发，仅 Windows/macOS）

## 禁止改动 / 高风险区

- ⚠️ `applyTheme` 的内联样式注入逻辑 —— 直接影响微信复制保真度，需充分回归。
- ⚠️ 持久化 schema（`useEditorStore` 的 `partialize`）—— 改动会破坏老用户数据恢复。
- ⚠️ `next.config.ts` 的 `output: "export"` 与 `basePath` 逻辑 —— 影响所有部署目标。
- ⚠️ Tauri CSP（`tauri.conf.json`）—— 收紧会阻断 AI 跨域请求。

## 代码约定

- 组件目录按职责分组（editor/layout/preview/ui），UI 基础件遵循 Shadcn/UI 约定。
- 中文优先：界面文案、菜单、注释多为中文，保持一致。
- AI 调用统一走 `callAiFormatting` 入口，taskMode 区分 format/polish/summarize/expand/fix。
- 新增持久化字段必须同步更新 `partialize`，否则不会落盘。

## 安全备忘

- `.env*` 已在 `.gitignore` 中忽略 —— **切勿**提交真实凭证（API Key、镜像仓库密码等）。
- AI 调用的 API Key 仅存于用户本地浏览器 IndexedDB，不做云同步。
