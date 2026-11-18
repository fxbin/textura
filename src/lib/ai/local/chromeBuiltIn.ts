import {
  CHROME_BUILT_IN_TEXT_LANGUAGES,
  type BuiltInAvailability,
  type ChromeBuiltInCapability,
  type ChromeBuiltInCapabilityRequest,
  type ChromeBuiltInPromptRequest,
  type ChromeBuiltInPromptSession,
  type ChromeBuiltInTextLanguage,
  type LanguageModelCoreOptions,
} from './types';

interface LanguageModelMonitorLike {
  addEventListener(
    type: 'downloadprogress',
    listener: (event: { loaded: number; total?: number }) => void,
  ): void;
}

interface LanguageModelOptions extends LanguageModelCoreOptions {
  initialPrompts?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  signal?: AbortSignal;
  monitor?: (monitor: LanguageModelMonitorLike) => void;
}

interface LanguageModelApiLike {
  availability(options: LanguageModelCoreOptions): Promise<string>;
  create(options: LanguageModelOptions): Promise<ChromeBuiltInPromptSession>;
}

type GlobalWithLanguageModel = typeof globalThis & {
  LanguageModel?: LanguageModelApiLike;
  ai?: { languageModel?: unknown; summarizer?: unknown };
};
type NavigatorWithUserActivation = Navigator & { userActivation?: { isActive: boolean } };

export type ChromeBuiltInErrorCode =
  | 'insecure-context'
  | 'api-missing'
  | 'language-unsupported'
  | 'unavailable'
  | 'user-activation-required'
  | 'session-create-failed';

export class ChromeBuiltInAiError extends Error {
  readonly code: ChromeBuiltInErrorCode;
  readonly originalError?: unknown;

  constructor(message: string, code: ChromeBuiltInErrorCode, originalError?: unknown) {
    super(message);
    this.name = 'ChromeBuiltInAiError';
    this.code = code;
    this.originalError = originalError;
  }
}

export function isChromeBuiltInTextLanguage(language: string): language is ChromeBuiltInTextLanguage {
  return (CHROME_BUILT_IN_TEXT_LANGUAGES as readonly string[]).includes(language.toLowerCase());
}

export function normalizeBuiltInAvailability(raw: unknown): BuiltInAvailability {
  switch (raw) {
    case 'available':
    case 'readily':
      return 'available';
    case 'downloadable':
    case 'after-download':
      return 'downloadable';
    case 'downloading':
      return 'downloading';
    case 'unavailable':
    case 'no':
    default:
      return 'unavailable';
  }
}

export function normalizeDownloadProgress(loaded: number, total?: number): number {
  const ratio =
    typeof total === 'number' && Number.isFinite(total) && total > 0
      ? loaded / total
      : loaded;
  if (!Number.isFinite(ratio)) return 0;
  return Math.max(0, Math.min(1, ratio));
}

export function formatLocalAiErrorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof Error) {
    return error.name && error.name !== 'Error'
      ? `${error.name}: ${error.message}`
      : error.message;
  }
  return String(error);
}

export function isInsecureBrowserContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext === false;
}

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

function buildApiMissingMessage(kind: 'prompt' | 'summarizer'): string {
  if (isTauriRuntime()) {
    return '当前处于 Tauri 桌面端内置 WebView，不包含 Chrome Gemini Nano 组件；请切换为「智能选择」或「仅云端」。';
  }

  const legacyAi =
    typeof globalThis !== 'undefined' ? (globalThis as GlobalWithLanguageModel).ai : undefined;

  if (kind === 'prompt') {
    if (legacyAi?.languageModel) {
      return '检测到旧版 window.ai 接口；请升级至桌面版 Chrome 138+，并在 chrome://flags 中开启 #prompt-api-for-gemini-nano。';
    }
    return '当前浏览器未开启 LanguageModel (Prompt API) 接口。若使用桌面版 Chrome，请在 chrome://flags 中将 #prompt-api-for-gemini-nano 与 #optimization-guide-on-device-model 设为 Enabled 后重启浏览器；其他浏览器请使用「智能选择」或「仅云端」。';
  }

  if (legacyAi?.summarizer) {
    return '检测到旧版 window.ai 接口；请升级至桌面版 Chrome 138+，并在 chrome://flags 中开启 #summarization-api-for-gemini-nano。';
  }
  return '当前浏览器未开启 Summarizer API 接口。若使用桌面版 Chrome，请在 chrome://flags 中将 #summarization-api-for-gemini-nano 与 #optimization-guide-on-device-model 设为 Enabled 后重启浏览器；其他浏览器请使用「智能选择」或「仅云端」。';
}

export function getLocalAiApiMissingMessage(kind: 'prompt' | 'summarizer'): string {
  return buildApiMissingMessage(kind);
}

function getLanguageModelApi(): LanguageModelApiLike | null {
  if (typeof globalThis === 'undefined') return null;
  return (globalThis as GlobalWithLanguageModel).LanguageModel ?? null;
}

export function buildLanguageModelCoreOptions(
  request: ChromeBuiltInCapabilityRequest,
): LanguageModelCoreOptions & {
  inputLanguage: string;
  outputLanguage: string;
  systemPromptLanguage: string;
} {
  const inputLanguage = (request.inputLanguage || 'en').trim().toLowerCase();
  const outputLanguage = (request.outputLanguage || inputLanguage).trim().toLowerCase();
  const systemPromptLanguage = (request.systemPromptLanguage || 'en').trim().toLowerCase();
  return {
    inputLanguage,
    outputLanguage,
    systemPromptLanguage,
    expectedInputs: [
      { type: 'text' as const, languages: Array.from(new Set([systemPromptLanguage, inputLanguage])) },
    ],
    expectedOutputs: [{ type: 'text' as const, languages: [outputLanguage] }],
  };
}

export async function getChromeBuiltInCapability(
  request: ChromeBuiltInCapabilityRequest,
): Promise<ChromeBuiltInCapability> {
  const options = buildLanguageModelCoreOptions(request);
  const coreOptions: LanguageModelCoreOptions = {
    expectedInputs: options.expectedInputs,
    expectedOutputs: options.expectedOutputs,
  };
  const requestedLanguages = [
    options.systemPromptLanguage,
    options.inputLanguage,
    options.outputLanguage,
  ];
  const api = getLanguageModelApi();

  if (isInsecureBrowserContext()) {
    return {
      provider: 'chrome-built-in',
      apiPresent: Boolean(api),
      availability: 'unavailable',
      inputLanguage: options.inputLanguage,
      outputLanguage: options.outputLanguage,
      systemPromptLanguage: options.systemPromptLanguage,
      supportedLanguages: CHROME_BUILT_IN_TEXT_LANGUAGES,
      requiresDownload: false,
      canCreateSession: false,
      reason: 'insecure-context',
      reasonMessage: '当前页面处于非安全上下文（需 HTTPS 或 localhost），Chrome Built-in AI 仅在安全上下文中可用。',
      checkedOptions: coreOptions,
    };
  }

  if (!api || typeof api.availability !== 'function') {
    return {
      provider: 'chrome-built-in',
      apiPresent: false,
      availability: 'unavailable',
      inputLanguage: options.inputLanguage,
      outputLanguage: options.outputLanguage,
      systemPromptLanguage: options.systemPromptLanguage,
      supportedLanguages: CHROME_BUILT_IN_TEXT_LANGUAGES,
      requiresDownload: false,
      canCreateSession: false,
      reason: 'api-missing',
      reasonMessage: getLocalAiApiMissingMessage('prompt'),
      checkedOptions: coreOptions,
    };
  }

  if (!requestedLanguages.every(isChromeBuiltInTextLanguage)) {
    return {
      provider: 'chrome-built-in',
      apiPresent: true,
      availability: 'unavailable',
      inputLanguage: options.inputLanguage,
      outputLanguage: options.outputLanguage,
      systemPromptLanguage: options.systemPromptLanguage,
      supportedLanguages: CHROME_BUILT_IN_TEXT_LANGUAGES,
      requiresDownload: false,
      canCreateSession: false,
      reason: 'language-unsupported',
      reasonMessage: '请求语言不在本地模型支持列表内（当前开放：en / ja / es / de / fr）。',
      checkedOptions: coreOptions,
    };
  }

  try {
    const rawAvailability = await api.availability(coreOptions);
    const availability = normalizeBuiltInAvailability(rawAvailability);

    return {
      provider: 'chrome-built-in',
      apiPresent: true,
      availability,
      rawAvailability: String(rawAvailability),
      inputLanguage: options.inputLanguage,
      outputLanguage: options.outputLanguage,
      systemPromptLanguage: options.systemPromptLanguage,
      supportedLanguages: CHROME_BUILT_IN_TEXT_LANGUAGES,
      requiresDownload: availability === 'downloadable' || availability === 'downloading',
      canCreateSession: availability !== 'unavailable',
      reason: availability === 'unavailable' ? 'browser-unavailable' : undefined,
      reasonMessage:
        availability === 'unavailable'
          ? '浏览器返回 unavailable（常见原因：磁盘剩余空间不足 22GB、显存/内存未达标、移动端或系统策略限制），请对照 chrome://on-device-internals 排查。'
          : undefined,
      checkedOptions: coreOptions,
    };
  } catch (error) {
    const errorMessage = formatLocalAiErrorMessage(error);
    return {
      provider: 'chrome-built-in',
      apiPresent: true,
      availability: 'unavailable',
      inputLanguage: options.inputLanguage,
      outputLanguage: options.outputLanguage,
      systemPromptLanguage: options.systemPromptLanguage,
      supportedLanguages: CHROME_BUILT_IN_TEXT_LANGUAGES,
      requiresDownload: false,
      canCreateSession: false,
      reason: 'availability-check-failed',
      reasonMessage: errorMessage
        ? `检测 Prompt API 状态时发生异常：${errorMessage}`
        : '检测 Prompt API 状态时发生异常。',
      errorMessage,
      checkedOptions: coreOptions,
      error,
    };
  }
}

export async function createChromeBuiltInPromptSession(
  request: Omit<ChromeBuiltInPromptRequest, 'prompt'>,
): Promise<ChromeBuiltInPromptSession> {
  const capability = await getChromeBuiltInCapability(request);
  const api = getLanguageModelApi();

  if (capability.reason === 'insecure-context') {
    throw new ChromeBuiltInAiError(
      capability.reasonMessage || 'Chrome Built-in AI requires a secure context (HTTPS or localhost).',
      'insecure-context',
    );
  }
  if (capability.reason === 'language-unsupported') {
    throw new ChromeBuiltInAiError(
      'Requested language is not supported by Chrome Built-in AI.',
      'language-unsupported',
    );
  }
  if (!api) {
    throw new ChromeBuiltInAiError(
      'Chrome Built-in AI is not available in this browser.',
      'api-missing',
    );
  }
  if (!capability.canCreateSession) {
    throw new ChromeBuiltInAiError(
      capability.reasonMessage || 'Chrome Built-in AI is unavailable on this device.',
      'unavailable',
      capability.error,
    );
  }

  const activation =
    typeof navigator === 'undefined'
      ? undefined
      : (navigator as NavigatorWithUserActivation).userActivation;
  if (capability.requiresDownload && activation && !activation.isActive) {
    throw new ChromeBuiltInAiError(
      'Model download requires direct user interaction.',
      'user-activation-required',
    );
  }

  const options = buildLanguageModelCoreOptions(request);
  try {
    return await api.create({
      expectedInputs: options.expectedInputs,
      expectedOutputs: options.expectedOutputs,
      ...(request.systemPrompt
        ? { initialPrompts: [{ role: 'system' as const, content: request.systemPrompt }] }
        : {}),
      signal: request.signal,
      monitor: request.onDownloadProgress
        ? (monitor) =>
            monitor.addEventListener('downloadprogress', (event) =>
              request.onDownloadProgress?.(normalizeDownloadProgress(event.loaded, event.total)),
            )
        : undefined,
    });
  } catch (error) {
    throw new ChromeBuiltInAiError(
      'Failed to create a Chrome Built-in AI session.',
      'session-create-failed',
      error,
    );
  }
}

export async function runChromeBuiltInPrompt(
  request: ChromeBuiltInPromptRequest,
  onChunk?: (accumulatedText: string) => void,
): Promise<string> {
  const session = await createChromeBuiltInPromptSession(request);
  try {
    if (!onChunk) {
      if (request.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      return await session.prompt(request.prompt, { signal: request.signal });
    }

    const reader = session
      .promptStreaming(request.prompt, { signal: request.signal })
      .getReader();
    const abortHandler = () => {
      void reader.cancel();
    };
    request.signal?.addEventListener('abort', abortHandler, { once: true });

    let result = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += value;
        onChunk(result);
      }
    } finally {
      request.signal?.removeEventListener('abort', abortHandler);
    }

    if (request.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return result;
  } finally {
    session.destroy?.();
  }
}
