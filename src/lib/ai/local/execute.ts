import { callAiFormatting, type AiTaskMode } from '@/lib/aiService';
import type { AiApiConfig } from '@/store/useEditorStore';
import {
  getChromeBuiltInCapability,
  runChromeBuiltInPrompt,
} from './chromeBuiltIn';
import {
  getChromeSummarizerCapability,
  runChromeSummarizer,
} from './chromeSummarizer';
import { inferPrimaryTextLanguage, routeAiExecution } from './router';
import type { ChromeBuiltInCapability, LocalAiExecutionMode } from './types';

export interface AiExecutionMeta {
  provider: 'chrome-built-in' | 'cloud';
  reason: string;
  fallback: boolean;
  cloudProvider?: string;
}

export interface RoutedAiResponse {
  success: boolean;
  content?: string;
  error?: string;
  execution: AiExecutionMeta;
}

interface ExecuteAiTaskOptions {
  config: AiApiConfig;
  executionMode: LocalAiExecutionMode;
  content: string;
  taskMode: AiTaskMode;
  onChunk?: (accumulated: string) => void;
  signal?: AbortSignal;
}

const LOCAL_TASK_PROMPTS: Partial<Record<AiTaskMode, { system: string; instruction: string }>> = {
  polish: {
    system: 'You are a professional English editor. Preserve the author’s meaning and Markdown structure. Return only the edited text.',
    instruction: 'Polish the following English text so it is clearer, smoother, and more professional. Preserve its meaning and Markdown formatting. Return only the revised text.\n\n',
  },
  fix: {
    system: 'You are a meticulous English proofreader. Preserve Markdown and return only the corrected text.',
    instruction: 'Correct grammar, spelling, punctuation, and obvious wording errors in the following English text. Do not add commentary. Preserve Markdown formatting.\n\n',
  },
  expand: {
    system: 'You are a professional English writing assistant. Preserve Markdown and the original intent. Return only the expanded text.',
    instruction: 'Expand the following English text with useful detail, explanation, or examples while preserving its original intent and Markdown structure. Return only the expanded text.\n\n',
  },
};

function hasCloudConfig(config: AiApiConfig): boolean {
  if (config.provider === 'none') return false;
  if (config.provider === 'ollama') return true;
  if (config.provider === 'custom' && !config.customApiUrl?.trim()) return false;
  return Boolean(config.apiKey.trim());
}

function nonEnglishUnsupportedMessage(inputLanguage: string): string {
  if (inputLanguage === 'zh') {
    return '当前文稿为中文，而 Chrome 本地 AI（Gemini Nano）目前仅支持英文内容。请切换为「智能选择」或「仅云端」处理中文，或选中英文段落后再试。';
  }
  return 'Chrome 本地 AI 业务路由当前仅支持英文内容；请切换为「智能选择」或「仅云端」，或选中英文段落后再试。';
}

function appendNonEnglishNote(message: string | undefined, inputLanguage: string): string {
  const base = message || '当前浏览器或设备暂不支持 Chrome 本地 AI。';
  return inputLanguage !== 'en' ? `${base}（另注：Chrome 本地 AI 目前也仅支持英文内容）` : base;
}

function localUnavailableMessage(
  reason: string,
  inputLanguage: string,
  localCapability?: ChromeBuiltInCapability,
): string {
  switch (reason) {
    case 'local-task-unsupported':
      return '当前 Chrome 本地 AI 暂不支持「排版」任务；请切换为「智能选择」或「仅云端」，或改用润色、摘要、扩写、纠错。';
    case 'local-download-required':
      return 'Chrome 本地模型尚未准备完成，请先在「偏好设置 → AI 配置」中点击准备按钮下载模型。';
    case 'explicit-local-language-unsupported':
      return nonEnglishUnsupportedMessage(inputLanguage);
    case 'explicit-local-api-unavailable':
      if (!localCapability?.apiPresent && inputLanguage !== 'en') {
        return appendNonEnglishNote(localCapability?.reasonMessage, inputLanguage);
      }
      return localCapability?.reasonMessage || '当前浏览器、设备或安全上下文暂不支持 Chrome 本地 AI。';
    case 'explicit-local-unavailable':
      return '当前浏览器、设备或文本语言暂不支持 Chrome 本地 AI。';
    default:
      return 'Chrome 本地 AI 当前不可用。';
  }
}

async function runCloud(
  config: AiApiConfig,
  content: string,
  onChunk: ((accumulated: string) => void) | undefined,
  taskMode: AiTaskMode,
  meta: AiExecutionMeta,
): Promise<RoutedAiResponse> {
  if (!hasCloudConfig(config)) {
    return {
      success: false,
      error: meta.fallback
        ? '本地 AI 当前无法执行，且云端 fallback 尚未配置。请准备本地模型或配置云端 Provider。'
        : '请先在设置中配置可用的云端 AI Provider。',
      execution: meta,
    };
  }

  const result = await callAiFormatting(config, content, onChunk, taskMode);
  return { ...result, execution: meta };
}

async function executeSummarizeTask(
  config: AiApiConfig,
  executionMode: LocalAiExecutionMode,
  content: string,
  inputLanguage: string,
  onChunk?: (accumulated: string) => void,
  signal?: AbortSignal,
): Promise<RoutedAiResponse> {
  if (executionMode === 'cloud') {
    return runCloud(config, content, onChunk, 'summarize', {
      provider: 'cloud',
      reason: 'explicit-cloud',
      fallback: false,
      cloudProvider: config.provider,
    });
  }

  if (executionMode === 'smart' && inputLanguage !== 'en') {
    return runCloud(config, content, onChunk, 'summarize', {
      provider: 'cloud',
      reason: 'summarizer-language-unsupported',
      fallback: true,
      cloudProvider: config.provider,
    });
  }

  const capability = await getChromeSummarizerCapability('en');

  if (executionMode === 'chrome-built-in') {
    if (capability.reason === 'api-missing' || capability.reason === 'insecure-context') {
      return {
        success: false,
        error: appendNonEnglishNote(capability.reasonMessage, inputLanguage),
        execution: {
          provider: 'chrome-built-in',
          reason: 'explicit-local-api-unavailable',
          fallback: false,
        },
      };
    }

    if (inputLanguage !== 'en') {
      return {
        success: false,
        error: nonEnglishUnsupportedMessage(inputLanguage),
        execution: {
          provider: 'chrome-built-in',
          reason: 'summarizer-language-unsupported',
          fallback: false,
        },
      };
    }
  }

  if (capability.availability !== 'available') {
    const reason = capability.availability === 'downloadable' || capability.availability === 'downloading'
      ? 'summarizer-download-required'
      : 'summarizer-unavailable';

    if (executionMode === 'chrome-built-in') {
      return {
        success: false,
        error: capability.requiresDownload
          ? 'Chrome 摘要模型尚未准备，请先在「偏好设置 → AI 配置」中点击准备按钮下载模型。'
          : (capability.reasonMessage || '当前浏览器或设备不支持 Chrome Summarizer。'),
        execution: {
          provider: 'chrome-built-in',
          reason,
          fallback: false,
        },
      };
    }

    return runCloud(config, content, onChunk, 'summarize', {
      provider: 'cloud',
      reason,
      fallback: true,
      cloudProvider: config.provider,
    });
  }

  try {
    const result = await runChromeSummarizer(content, {
      language: 'en',
      signal,
      onChunk,
    });

    return {
      success: true,
      content: result,
      execution: {
        provider: 'chrome-built-in',
        reason: 'summarizer-supported',
        fallback: false,
      },
    };
  } catch (error) {
    if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      return {
        success: false,
        error: '已停止本地摘要生成',
        execution: {
          provider: 'chrome-built-in',
          reason: 'local-aborted',
          fallback: false,
        },
      };
    }

    console.error('[Local AI] summarizer failed:', error);

    if (executionMode === 'smart' && hasCloudConfig(config)) {
      return runCloud(config, content, onChunk, 'summarize', {
        provider: 'cloud',
        reason: 'summarizer-runtime-fallback',
        fallback: true,
        cloudProvider: config.provider,
      });
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Chrome 本地摘要执行失败',
      execution: {
        provider: 'chrome-built-in',
        reason: 'summarizer-runtime-error',
        fallback: false,
      },
    };
  }
}

export async function executeAiTask({
  config,
  executionMode,
  content,
  taskMode,
  onChunk,
  signal,
}: ExecuteAiTaskOptions): Promise<RoutedAiResponse> {
  if (!content.trim()) {
    return {
      success: false,
      error: '内容不能为空',
      execution: {
        provider: executionMode === 'cloud' ? 'cloud' : 'chrome-built-in',
        reason: 'empty-content',
        fallback: false,
      },
    };
  }

  const inputLanguage = inferPrimaryTextLanguage(content);

  if (taskMode === 'summarize') {
    return executeSummarizeTask(
      config,
      executionMode,
      content,
      inputLanguage,
      onChunk,
      signal,
    );
  }

  let localCapability: ChromeBuiltInCapability | undefined;

  if (
    LOCAL_TASK_PROMPTS[taskMode] &&
    (executionMode === 'chrome-built-in' || (executionMode === 'smart' && inputLanguage === 'en'))
  ) {
    localCapability = await getChromeBuiltInCapability({
      inputLanguage: 'en',
      outputLanguage: 'en',
      systemPromptLanguage: 'en',
    });
  }

  const route = routeAiExecution({
    mode: executionMode,
    task: taskMode,
    inputLanguage,
    outputLanguage: inputLanguage,
    cloudProvider: config.provider,
    localCapability,
  });

  if (route.provider === 'cloud') {
    return runCloud(config, content, onChunk, taskMode, {
      provider: 'cloud',
      reason: route.reason,
      fallback: executionMode === 'smart',
      cloudProvider: config.provider,
    });
  }

  if (!route.canExecute) {
    return {
      success: false,
      error: localUnavailableMessage(route.reason, inputLanguage, localCapability),
      execution: {
        provider: 'chrome-built-in',
        reason: route.reason,
        fallback: false,
      },
    };
  }

  const localPrompt = LOCAL_TASK_PROMPTS[taskMode];
  if (!localPrompt) {
    return {
      success: false,
      error: localUnavailableMessage('local-task-unsupported', inputLanguage, localCapability),
      execution: {
        provider: 'chrome-built-in',
        reason: 'local-task-unsupported',
        fallback: false,
      },
    };
  }

  try {
    const result = await runChromeBuiltInPrompt(
      {
        inputLanguage: 'en',
        outputLanguage: 'en',
        systemPromptLanguage: 'en',
        systemPrompt: localPrompt.system,
        prompt: `${localPrompt.instruction}${content}`,
        signal,
      },
      onChunk,
    );

    return {
      success: true,
      content: result,
      execution: {
        provider: 'chrome-built-in',
        reason: route.reason,
        fallback: false,
      },
    };
  } catch (error) {
    if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      return {
        success: false,
        error: '已停止本地 AI 生成',
        execution: {
          provider: 'chrome-built-in',
          reason: 'local-aborted',
          fallback: false,
        },
      };
    }

    console.error('[Local AI] prompt failed:', error);

    if (executionMode === 'smart' && hasCloudConfig(config)) {
      return runCloud(config, content, onChunk, taskMode, {
        provider: 'cloud',
        reason: 'local-runtime-fallback',
        fallback: true,
        cloudProvider: config.provider,
      });
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Chrome 本地 AI 执行失败',
      execution: {
        provider: 'chrome-built-in',
        reason: 'local-runtime-error',
        fallback: false,
      },
    };
  }
}
