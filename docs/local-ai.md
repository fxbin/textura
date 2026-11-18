# Chrome Built-in AI / Local AI

Textura 的 AI 执行策略是 **Local-first AI + Cloud fallback**。

## 执行方式

| 模式 | 行为 | 云端上传边界 |
| --- | --- | --- |
| 智能选择（推荐） | 对应本地 API 已就绪、任务与语言支持时走本地；否则使用已配置 Cloud Provider | **可能上传**。任何 fallback 都会在 AI Assistant 中显示实际执行 Provider |
| Chrome 本地 AI | 只允许浏览器内置 AI；不可用时直接报错 | **不会上传**到 Cloud Provider |
| 仅云端 | 保持传统 Provider 行为 | 会直接发送给用户配置的 Provider |

> Smart 模式不会自动下载模型。`downloadable` / `downloading` 都视为“尚未准备”，用户必须在偏好设置中显式点击准备按钮。

## 当前任务矩阵

| 任务 | 英文 Local | 中文 | Local API |
| --- | --- | --- | --- |
| 润色 | ✅ | Cloud fallback | Prompt API |
| 纠错 | ✅ | Cloud fallback | Prompt API |
| 扩写 | ✅ | Cloud fallback | Prompt API |
| 摘要 | ✅ | Cloud fallback | Summarizer API |
| 排版 | 暂不支持 | Cloud | — |

当前生产语言边界跟随 Chrome Built-in AI 官方能力。Textura 目前只对英语开放本地业务路由；即使浏览器支持更多语言，新增业务语言也应先经过回归测试再开放。

## 模型准备与 Capability Detection v2

偏好设置 → AI 配置 → Chrome 本地 AI 会分别基于官方参数独立检测并展示：

- Prompt API：`LanguageModel.availability({ expectedInputs, expectedOutputs })` 与 `LanguageModel.create(...)` 使用完全一致的模态与语言配置（英文润色 / 纠错 / 扩写）。
- Summarizer API：`Summarizer.availability({ type, format, length, expectedInputLanguages, outputLanguage })` 与 `Summarizer.create(...)` 参数完全对齐（英文摘要）。
- 安全上下文校验：若处于非 HTTPS / 非 localhost 环境，直接标记为 `非安全上下文（insecure-context）`。
- 诊断详情（Diagnostics）：设置页内置可展开的诊断详情面板，可对照 Chrome 版本、Origin、安全上下文、Prompt / Summarizer 原始状态与 `error/reason`，并一键复制 `chrome://on-device-internals` 进行核验。

### 桌面版 Chrome 开启条件（若显示 `api-missing`）

1. 使用桌面端 Chrome（建议 138+，且满足官方端侧模型硬件与磁盘 >= 22GB 要求）；Tauri 桌面版内置系统 WebView 不包含 Gemini Nano 组件。
2. 如当前网页渠道默认尚未开放相关全局接口，请在 Chrome 地址栏打开以下 Flags 并设为 `Enabled`，随后**完全重启浏览器**：
   - `chrome://flags/#optimization-guide-on-device-model`（硬件门槛测试可设为 `Enabled BypassPerfRequirement`）
   - `chrome://flags/#prompt-api-for-gemini-nano`
   - `chrome://flags/#summarization-api-for-gemini-nano`
3. 重启后回到 Textura **偏好设置 → AI 配置 → Chrome 本地 AI** 点击「重新检测」，或在 **AI 写作助手** 弹窗的提示横幅内直接点击准备模型；必要时打开 `chrome://on-device-internals` 核对端侧模型加载状态。

可能状态：

- `available`：可以立即本地执行。
- `downloadable`：需要用户主动准备/下载。
- `downloading`：浏览器正在下载；Textura 不会自动把业务请求等待在下载链路上。
- `unavailable`：浏览器、设备、系统资源或 API 不满足条件。

下载进度通过 `downloadprogress` 展示。准备动作必须来自用户直接点击。

## 隐私语义

### Smart

Smart 是便利模式，不等价于“纯本地”。当以下情况发生时可以使用 Cloud fallback：

- 当前任务未开放本地能力。
- 当前文本语言不支持本地能力。
- 对应 Built-in API 不存在或不可用。
- 模型尚未准备完成。
- 本地运行发生非用户主动取消的运行时错误。

AI Assistant 会显示“本次实际执行”，例如 `Chrome 本地 AI` 或 `DeepSeek（fallback）`。

### Explicit Local

显式选择 `Chrome 本地 AI` 是严格隐私边界：

- 不静默 fallback Cloud。
- **区分具体拦截原因（不再笼统提示）**：
  - 接口未开启 / 非 Chrome / Tauri WebView（`explicit-local-api-unavailable` + 对应 Flag / 运行环境提示）；
  - 当前文稿为中文或非英文（`explicit-local-language-unsupported` / `summarizer-language-unsupported`，明确说明 Chrome 本地 AI 当前仅支持英文，引导一键切回「智能选择」或「仅云端」）；
  - 模型未准备（`local-download-required`，支持弹窗内或设置页直接点击下载）；
  - 任务不支持（`local-task-unsupported`，如 `排版`）。
- 用户点击停止后不会转而调用 Cloud。

## 兼容性矩阵

下面是预期行为。发布前需要在真实环境中逐项验证。

| 环境 | Prompt API | Summarizer API | Textura 预期 |
| --- | --- | --- | --- |
| Chrome Desktop（满足设备条件） | capability 检测 | capability 检测 | available 时可本地执行 |
| Chrome Desktop（模型未下载） | downloadable/downloading | downloadable/downloading | Smart 走 Cloud；设置页允许显式准备 |
| Edge / Chromium 但无对应 API | unavailable | unavailable | 不报 JS 错误，Smart 走 Cloud |
| Safari | unavailable | unavailable | 不报 JS 错误，Smart 走 Cloud |
| Firefox | unavailable | unavailable | 不报 JS 错误，Smart 走 Cloud |
| Chrome Android / iOS | unavailable | unavailable | 不尝试本地执行 |
| Tauri WebView | 取决于 WebView | 取决于 WebView | capability 为准，不按 UA 猜测 |

## 回归清单

### Capability / 下载

1. 非支持浏览器打开设置页，无未捕获异常。
2. Prompt / Summarizer 状态分别可见。
3. `downloadable` 不会因为点击“开始生成”自动下载。
4. 点击准备按钮后能显示下载进度。
5. 下载完成后重新检测为 `available`。

### 路由

1. Smart + English polish + Prompt available → Local。
2. Smart + English summarize + Summarizer available → Local。
3. Smart + Chinese → Cloud fallback。
4. Smart + model downloadable → Cloud fallback。
5. Explicit Local + Chinese → error，Cloud 不应收到请求。
6. Explicit Local + format → UI 禁用 / 不调用 Cloud。
7. Explicit Cloud → 始终使用原 Provider。

### 流式与取消

1. Prompt API 流式文本持续更新。
2. Summarizer API 流式摘要持续更新。
3. 本地生成过程中点击“停止生成”能终止读取。
4. 用户主动停止后不得触发 Cloud fallback。

### 兼容旧配置

1. 原 DeepSeek / OpenAI / Anthropic / Qwen / Doubao / Zhipu / Ollama / Custom 配置不丢失。
2. 切换 Local/Smart 不修改原 API Key 与模型。
3. 再切回 Cloud 后原配置继续可用。

## CI 与自动化回归

Pull Request 与 `main` 分支推送会执行：

```bash
npm ci
npm run lint
npm test
npm run build
```

`npm test` 使用 Node 24 内置测试运行器覆盖 Capability Detection v2（options 一致性、独立检测、安全上下文、错误捕获、进度归一化）、中英文路由边界、无自动下载约束、主动取消不回退云端以及诊断输出；真实 Chrome 设备的端到端模型下载仍可配合设置页「诊断详情」与 `chrome://on-device-internals` 对照复核。
