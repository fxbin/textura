'use client';

import { AiApiProvider, AiApiConfig } from '@/store/useEditorStore';

const FORMATTING_PROMPT = `请将以下内容重新排版为适合微信公众号阅读的 Markdown 格式。

【排版结构要求】：
1. 一级标题：必须以 "## " 开头，并使用中文数字编号（如 "## 一、核心观点"）。
2. 二级标题：必须以 "### " 开头，并使用括号编号（如 "### （一）详细说明"）。
3. 三级标题：必须以 "#### " 开头，并使用数字编号（如 "#### 1. 具体步骤"）。
4. 列表：使用 "- " 开头。
5. 重点：保留原文核心意图，优化段落间距，适当添加 Emoji 增加趣味性（可选）。
6. 禁忌：不要输出任何"好的"、"如下"等客套话，直接输出 Markdown 代码。

【原文内容】：
`;

export type AiTaskMode = 'format' | 'polish' | 'summarize' | 'expand' | 'fix';

export const TASK_PROMPTS: Record<AiTaskMode, string> = {
  format: FORMATTING_PROMPT,
  polish: `请润色以下内容，使其更加流畅、专业。保持原文核心意思不变，优化措辞和段落结构。直接输出润色后的内容。

【原文内容】：
`,
  summarize: `请对以下内容进行精炼总结，提取核心观点和关键信息。用 Markdown 格式输出。

【原文内容】：
`,
  expand: `请对以下内容进行扩展和丰富，补充细节、案例或解释。用 Markdown 格式输出。

【原文内容】：
`,
  fix: `请检查并修正以下内容中的语法错误、错别字、标点符号问题。直接输出修正后的内容。

【原文内容】：
`,
};

interface AiResponse {
  success: boolean;
  content?: string;
  error?: string;
}

// ── Shared utilities ──

const AI_FETCH_TIMEOUT = 60_000;       // 60s for initial connection
const AI_CHUNK_TIMEOUT = 30_000;       // 30s between stream chunks
const MAX_CONSECUTIVE_PARSE_ERRORS = 10;

/** Create an AbortController that auto-aborts after `ms` milliseconds. */
function createTimeoutController(ms: number): { controller: AbortController; clear: () => void } {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return {
    controller,
    clear: () => clearTimeout(id),
  };
}

/** Read an SSE stream with inter-chunk timeout and parse-error tracking. */
async function readSseStream(
  response: Response,
  extractContent: (json: unknown) => string,
  onChunk: (accumulated: string) => void,
): Promise<AiResponse> {
  const reader = response.body?.getReader();
  if (!reader) return { success: false, error: '无法读取响应流' };

  const decoder = new TextDecoder();
  let result = '';
  let consecutiveErrors = 0;
  let chunkTimer: ReturnType<typeof setTimeout> | null = null;

  const resetChunkTimer = () => {
    if (chunkTimer) clearTimeout(chunkTimer);
    chunkTimer = setTimeout(() => {
      reader.cancel().catch(() => {});
    }, AI_CHUNK_TIMEOUT);
  };

  try {
    resetChunkTimer();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      resetChunkTimer();

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const content = extractContent(json);
          if (content) {
            result += content;
            onChunk(result);
          }
          consecutiveErrors = 0;
        } catch (e) {
          consecutiveErrors++;
          console.debug(`[AI Stream] JSON parse error (${consecutiveErrors}/${MAX_CONSECUTIVE_PARSE_ERRORS}):`, e);
          if (consecutiveErrors >= MAX_CONSECUTIVE_PARSE_ERRORS) {
            return { success: false, error: 'AI 响应格式异常，连续解析失败过多' };
          }
        }
      }
    }
  } finally {
    if (chunkTimer) clearTimeout(chunkTimer);
  }

  return { success: true, content: result };
}

// 获取不同provider的模型列表
export const getProviderModels = (provider: AiApiProvider): string[] => {
  switch (provider) {
    case 'openai':
      return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4'];
    case 'anthropic':
      return ['claude-sonnet-4-20250514', 'claude-sonnet-3-5-20250219', 'claude-3-5-sonnet', 'claude-3-haiku'];
    case 'deepseek':
      return ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'];
    case 'doubao':
      return ['doubao-pro-32k', 'doubao-lite-32k', 'doubao-pro'];
    case 'qwen':
      return ['qwen-plus', 'qwen-turbo', 'qwen-max', 'qwen-max-longcontext'];
    case 'zhipu':
      return ['glm-4', 'glm-4-plus', 'glm-4-flash', 'glm-3-turbo'];
    case 'ollama':
      return ['llama3.1', 'llama3', 'mistral', 'codellama', 'qwen2.5', 'phi3'];
    case 'custom':
      return []; // 自定义模型由用户输入
    default:
      return [];
  }
};

// 获取各提供商的默认模型
export const getDefaultModel = (provider: AiApiProvider): string => {
  switch (provider) {
    case 'openai':
      return 'gpt-4o';
    case 'anthropic':
      return 'claude-sonnet-4-20250514';
    case 'deepseek':
      return 'deepseek-chat';
    case 'doubao':
      return 'doubao-pro-32k';
    case 'qwen':
      return 'qwen-plus';
    case 'zhipu':
      return 'glm-4-plus';
    case 'ollama':
      return 'llama3.1';
    case 'custom':
      return '';
    default:
      return '';
  }
};

// 获取provider的API URL

// 调用AI API进行排版
export async function callAiFormatting(
  config: AiApiConfig,
  content: string,
  onChunk?: (chunk: string) => void,
  taskMode: AiTaskMode = 'format'
): Promise<AiResponse> {
  const { provider, apiKey, model } = config;

  if (!apiKey && provider !== 'ollama') {
    return { success: false, error: '请先在设置中配置 API Key' };
  }

  if (!content.trim()) {
    return { success: false, error: '内容不能为空' };
  }

  const prompt = TASK_PROMPTS[taskMode] || TASK_PROMPTS.format;
  const fullPrompt = prompt + content;

  // 辅助函数：去除 Markdown 代码块包裹
  const stripMarkdownCodeBlock = (text: string) => {
    // 匹配 ```markdown ... ``` 或 ``` ... ``` 或 ` ... `
    // 优先匹配多行代码块
    const codeBlockRegex = /^```(?:markdown)?\s*([\s\S]*?)\s*```$/i;
    const match = text.trim().match(codeBlockRegex);
    if (match) {
      return match[1];
    }
    return text;
  };

  try {
    let response: AiResponse;
    switch (provider) {
      case 'openai':
        response = await callOpenAI(apiKey, model, fullPrompt, onChunk);
        break;
      case 'anthropic':
        response = await callAnthropic(apiKey, model, fullPrompt, onChunk);
        break;
      case 'deepseek':
        response = await callDeepSeek(apiKey, model, fullPrompt, onChunk);
        break;
      case 'doubao':
        response = await callDoubao(apiKey, model, fullPrompt, onChunk);
        break;
      case 'qwen':
        response = await callQwen(apiKey, model, fullPrompt, onChunk);
        break;
      case 'zhipu':
        response = await callZhipu(apiKey, model, fullPrompt, onChunk);
        break;
      case 'ollama':
        response = await callOllama(model, fullPrompt, onChunk);
        break;
      case 'custom':
        response = await callCustomApi(config.customApiUrl || '', config.customModelName || model, apiKey, fullPrompt, onChunk);
        break;
      default:
        return { success: false, error: '未支持的 AI 提供商' };
    }

    // 后处理：去除代码块
    if (response.success && response.content) {
      response.content = stripMarkdownCodeBlock(response.content);
    }
    return response;

  } catch (error) {
    console.error('AI API 调用失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '调用失败，请检查网络或API配置'
    };
  }
}

// OpenAI API 调用
async function callOpenAI(
  apiKey: string,
  model: string,
  prompt: string,
  onChunk?: (chunk: string) => void
): Promise<AiResponse> {
  const tc = createTimeoutController(AI_FETCH_TIMEOUT);
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一个专业的公众号排版助手，擅长将文章排版得美观易读。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        stream: Boolean(onChunk),
      }),
      signal: tc.controller.signal,
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message || 'API 调用失败' };
    }

    if (onChunk && response.body) {
      return await readSseStream(
        response,
        (json: any) => json.choices?.[0]?.delta?.content || '',
        onChunk,
      );
    }

    const data = await response.json();
    return { success: true, content: data.choices?.[0]?.message?.content || '' };
  } finally {
    tc.clear();
  }
}

// Anthropic API 调用
async function callAnthropic(
  apiKey: string,
  model: string,
  prompt: string,
  onChunk?: (chunk: string) => void
): Promise<AiResponse> {
  const tc = createTimeoutController(AI_FETCH_TIMEOUT);
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: '你是一个专业的公众号排版助手，擅长将文章排版得美观易读。直接输出排版后的Markdown内容，不要添加任何解释。',
        messages: [
          { role: 'user', content: prompt }
        ],
        stream: Boolean(onChunk),
      }),
      signal: tc.controller.signal,
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message || 'API 调用失败' };
    }

    if (onChunk && response.body) {
      return await readSseStream(
        response,
        (json: any) => json.delta?.text || '',
        onChunk,
      );
    }

    const data = await response.json();
    return { success: true, content: data.content?.[0]?.text || '' };
  } finally {
    tc.clear();
  }
}

// DeepSeek API 调用
async function callDeepSeek(
  apiKey: string,
  model: string,
  prompt: string,
  onChunk?: (chunk: string) => void
): Promise<AiResponse> {
  const tc = createTimeoutController(AI_FETCH_TIMEOUT);
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一个专业的公众号排版助手，擅长将文章排版得美观易读。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        stream: Boolean(onChunk),
      }),
      signal: tc.controller.signal,
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message || 'API 调用失败' };
    }

    if (onChunk && response.body) {
      return await readSseStream(
        response,
        (json: any) => json.choices?.[0]?.delta?.content || '',
        onChunk,
      );
    }

    const data = await response.json();
    return { success: true, content: data.choices?.[0]?.message?.content || '' };
  } finally {
    tc.clear();
  }
}

// Ollama 本地 API 调用
async function callOllama(
  model: string,
  prompt: string,
  onChunk?: (chunk: string) => void
): Promise<AiResponse> {
  const tc = createTimeoutController(AI_FETCH_TIMEOUT);
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一个专业的公众号排版助手，擅长将文章排版得美观易读。直接输出排版后的Markdown内容，不要添加任何解释。' },
          { role: 'user', content: prompt }
        ],
        stream: Boolean(onChunk),
      }),
      signal: tc.controller.signal,
    });

    if (!response.ok) {
      return {
        success: false,
        error: '无法连接到 Ollama 服务，请确保已在本地运行 ollama'
      };
    }

    if (onChunk && response.body) {
      // Ollama uses raw JSON lines (no "data: " SSE prefix)
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = '';
      let consecutiveErrors = 0;
      let chunkTimer: ReturnType<typeof setTimeout> | null = null;

      const resetChunkTimer = () => {
        if (chunkTimer) clearTimeout(chunkTimer);
        chunkTimer = setTimeout(() => {
          reader.cancel().catch(() => {});
        }, AI_CHUNK_TIMEOUT);
      };

      try {
        resetChunkTimer();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          resetChunkTimer();

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            try {
              const json = JSON.parse(line);
              const content = json.message?.content || '';
              if (content) {
                result += content;
                onChunk(result);
              }
              consecutiveErrors = 0;
            } catch (e) {
              consecutiveErrors++;
              console.debug(`[AI Stream] JSON parse error (${consecutiveErrors}/${MAX_CONSECUTIVE_PARSE_ERRORS}):`, e);
              if (consecutiveErrors >= MAX_CONSECUTIVE_PARSE_ERRORS) {
                return { success: false, error: 'AI 响应格式异常，连续解析失败过多' };
              }
            }
          }
        }
      } finally {
        if (chunkTimer) clearTimeout(chunkTimer);
      }

      return { success: true, content: result };
    }

    const data = await response.json();
    return { success: true, content: data.message?.content || '' };
  } finally {
    tc.clear();
  }
}

// 豆包 API 调用 (字节跳动)
async function callDoubao(
  apiKey: string,
  model: string,
  prompt: string,
  onChunk?: (chunk: string) => void
): Promise<AiResponse> {
  const tc = createTimeoutController(AI_FETCH_TIMEOUT);
  try {
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一个专业的公众号排版助手，擅长将文章排版得美观易读。直接输出排版后的Markdown内容，不要添加任何解释。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        stream: Boolean(onChunk),
      }),
      signal: tc.controller.signal,
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message || 'API 调用失败' };
    }

    if (onChunk && response.body) {
      return await readSseStream(
        response,
        (json: any) => json.choices?.[0]?.delta?.content || '',
        onChunk,
      );
    }

    const data = await response.json();
    return { success: true, content: data.choices?.[0]?.message?.content || '' };
  } finally {
    tc.clear();
  }
}

// 通义千问 API 调用 (阿里)
async function callQwen(
  apiKey: string,
  model: string,
  prompt: string,
  onChunk?: (chunk: string) => void
): Promise<AiResponse> {
  const tc = createTimeoutController(AI_FETCH_TIMEOUT);
  try {
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一个专业的公众号排版助手，擅长将文章排版得美观易读。直接输出排版后的Markdown内容，不要添加任何解释。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        stream: Boolean(onChunk),
      }),
      signal: tc.controller.signal,
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message || 'API 调用失败' };
    }

    if (onChunk && response.body) {
      return await readSseStream(
        response,
        (json: any) => json.choices?.[0]?.delta?.content || '',
        onChunk,
      );
    }

    const data = await response.json();
    return { success: true, content: data.choices?.[0]?.message?.content || '' };
  } finally {
    tc.clear();
  }
}

// 智谱 GLM API 调用
async function callZhipu(
  apiKey: string,
  model: string,
  prompt: string,
  onChunk?: (chunk: string) => void
): Promise<AiResponse> {
  const tc = createTimeoutController(AI_FETCH_TIMEOUT);
  try {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一个专业的公众号排版助手，擅长将文章排版得美观易读。直接输出排版后的Markdown内容，不要添加任何解释。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        stream: Boolean(onChunk),
      }),
      signal: tc.controller.signal,
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message || 'API 调用失败' };
    }

    if (onChunk && response.body) {
      return await readSseStream(
        response,
        (json: any) => json.choices?.[0]?.delta?.content || '',
        onChunk,
      );
    }

    const data = await response.json();
    return { success: true, content: data.choices?.[0]?.message?.content || '' };
  } finally {
    tc.clear();
  }
}

// 自定义 API 调用
async function callCustomApi(
  apiUrl: string,
  model: string,
  apiKey: string,
  prompt: string,
  onChunk?: (chunk: string) => void
): Promise<AiResponse> {
  if (!apiUrl) {
    return { success: false, error: '请配置自定义 API 地址' };
  }

  const tc = createTimeoutController(AI_FETCH_TIMEOUT);
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是一个专业的公众号排版助手，擅长将文章排版得美观易读。直接输出排版后的Markdown内容，不要添加任何解释。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        stream: Boolean(onChunk),
      }),
      signal: tc.controller.signal,
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message || 'API 调用失败' };
    }

    if (onChunk && response.body) {
      return await readSseStream(
        response,
        (json: any) => json.choices?.[0]?.delta?.content || '',
        onChunk,
      );
    }

    const data = await response.json();
    // 尝试多种可能的返回格式
    return {
      success: true,
      content: data.choices?.[0]?.message?.content || data.choices?.[0]?.text || data.content || ''
    };
  } finally {
    tc.clear();
  }
}
