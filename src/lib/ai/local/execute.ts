import { callAiFormatting, type AiTaskMode } from '@/lib/aiService';
import type { AiApiConfig } from '@/store/useEditorStore';
import {
  getChromeBuiltInCapability,
  runChromeBuiltInPrompt,
} from './chromeBuiltIn';
import { inferPrimaryTextLanguage, routeAiExecution } from './router';
import type { LocalAiExecutionMode } from './types';

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

function localUnavailableMessage(reason: string): string {
  switch (reason) {
    case 'local-task-unsupported':
      return '当前 Chrome 本地 AI 仅支持英文润色、纠错和扩写；该任务请切换到智能选择或云端模式。';
    case 'local-download-required':
      return 'Chrome 本地模型尚未准备完成，请先在“偏好设置 → AI 配置”中点击“准备本地 AI”。';
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
  let localCapability;

  if (executionMode !== 'cloud' && inputLanguage === 'en' && LOCAL_TASK_PROMPTS[taskMode]) {
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
      error: localUnavailableMessage(route.reason),
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
      error: localUnavailableMessage('local-task-unsupported'),
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
