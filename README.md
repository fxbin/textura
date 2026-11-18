# Textura —— 重塑文字的质感 ✨

<div align="center">
  <img src="public/logo.png" alt="Textura Logo" width="120" />
  <br/>
  <h3>为极致阅读体验而生的下一代排版引擎</h3>
  <p>基于 Next.js + TailwindCSS v4 构建的现代 Markdown 微信排版工具</p>

  <p>
    <a href="https://github.com/fxbin/textura"><img src="https://img.shields.io/badge/Source-fxbin/textura-181717?style=flat-square&logo=github" alt="Source" /></a>
    <a href="https://textura.top"><img src="https://img.shields.io/badge/Website-textura.top-007AFF?style=flat-square&logo=vercel" alt="Website" /></a>
    <img src="https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react" alt="React 19" />
    <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=flat-square&logo=tailwind-css" alt="TailwindCSS" />
  </p>
</div>

---

## 💡 为什么做 Textura？

在信息爆炸的时代，我们每天阅读数万字的内容。然而，大多数的阅读体验都被粗糙的、默认的排版破坏了。
**Textura** (_源自拉丁语，意为“编织、质地、纹理”_) 诞生的初衷，就是解决创作者的排版痛点：

- **告别繁琐**：通过 Markdown 语法一键生成高质量、带内联 CSS 样式的跨平台富文本。
- **专为微信生态设计**：一键复制即可无缝粘贴入微信公众号后台，格式零丢失。
- **禅模式创作**：极简的玻璃拟物化设计 (Glassmorphism)，让你专注于内容本身。

## ✨ 核心特性

- 🎨 **主题引擎驱动**
  - 内置数十种精心调配的预设主题（如：深海、薄荷、MD 经典）。
  - **自定义流体样式**：自带实时 CSS 代码编辑器，搭载安全防注入（XSS）DOMPurify 引擎，写你自己的专属设计。
  - 黄金比例行高、呼吸感字距，自动优化阅读韵律。

- 💻 **所见即所得的极客体验**
  - **三栏式弹性布局**：支持侧边栏自由拉伸与隐藏。
  - **独立设备视图**：支持模拟 iPhone、Android 或 PC 大屏预览您的最终渲染结果。
  - **可控滚动联动 (Scroll Sync)**：随心所欲在对照与解绑状态间丝滑穿梭。长文对比校对如呼吸般自然。

- 🤖 **本地优先 + 云端多模型 AI 助手**
  - **Local-first AI**：支持 Chrome Built-in AI（Prompt API / Summarizer API），提供「智能选择」「Chrome 本地 AI」「仅云端」三种隐私边界。
  - **云端多厂商支持**：接驳 DeepSeek、Kimi、通义千问、智谱 GLM、豆包、OpenAI、Anthropic、Ollama 及自定义 API。
  - 提供润色、排版、摘要、扩写、纠错等辅助能力，本地执行时正文不离开本机，fallback 回退会在界面显式标注。
  - **Local AI 运行要求**：桌面端 Chrome 138+（Windows 10/11、macOS 13+、Linux），安全上下文（HTTPS / localhost），磁盘至少 22 GB 可用空间，GPU 显存 > 4 GB 或 16 GB 内存 + 4 核 CPU，首次显式点击下载需非计费网络；详细策略与兼容性矩阵见 [`docs/local-ai.md`](docs/local-ai.md)。

- ⚡️ **极致的工程与体验**
  - **基于 `useDeferredValue` 防抖渲染**：无论左侧挂载多宏大的文本量，高频输入始终如丝般顺滑。
  - **静默自动保存 (Auto-Save)**：内建无感定时落盘（IndexedDB），断电息屏不丢稿。
  - **状态时光机**：Zustand 结合 IndexedDB 持久化与 Zundo 时间漫游，所有改动皆可追溯 (⌘+Z)。

## 🛠 技术栈

Textura 是一个追求极致前沿 (Bleeding-edge) 体验的工程：

- **框架**: [Next.js 16 (App Router)](https://nextjs.org/) + React 19（已启用 React Compiler）
- **样式**: [TailwindCSS v4](https://tailwindcss.com/) + Shadcn/UI（radix-ui）
- **状态管理**: [Zustand](https://github.com/pmnds/zustand) + IndexedDB 持久化 + Zundo (Undo/Redo)
- **文档引擎**: `markdown-it` + `highlight.js` 语法高亮
- **桌面封装**: 基于 [Tauri 2](https://tauri.app/) 导出 Windows / macOS 跨平台应用

## 🚀 快速开始

克隆仓库并运行本地开发服务器：

\`\`\`bash
# 1. 克隆代码
git clone https://github.com/fxbin/textura.git
cd textura

# 2. 安装依赖 
npm install

# 3. 运行开发环境
npm run dev
\`\`\`

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 即可看到应用。

## 🤝 贡献指南

欢迎参与 Textura 的建设！仓库地址：**https://github.com/fxbin/textura**

1. Fork [本仓库](https://github.com/fxbin/textura)
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

> 💡 AI 协作开发请参考根目录的 [`AGENTS.md`](AGENTS.md)，其中记录了项目的架构约束、禁止改动区与常用命令。

## 📄 许可协议

本项目基于 MIT 协议进行分发。详情请参阅 [LICENSE](LICENSE) 文件。

