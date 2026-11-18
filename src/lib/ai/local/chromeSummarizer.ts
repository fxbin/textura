import {
  CHROME_BUILT_IN_TEXT_LANGUAGES,
  type BuiltInAvailability,
  type ChromeBuiltInCapabilityReason,
  type ChromeBuiltInTextLanguage,
} from './types';
import {
  formatLocalAiErrorMessage,
  getLocalAiApiMissingMessage,
  isChromeBuiltInTextLanguage,
  isInsecureBrowserContext,
  normalizeBuiltInAvailability,
  normalizeDownloadProgress,
} from './chromeBuiltIn';

interface SummarizerMonitorLike {
  addEventListener(
    type: 'downloadprogress',
    listener: (event: { loaded: number; total?: number }) => void,
  ): void;
}

export interface SummarizerCoreOptions {
  type: 'key-points' | 'tldr' | 'teaser' | 'headline';
  format: 'markdown' | 'plain-text';
  length: 'short' | 'medium' | 'long';
  expectedInputLanguages: string[];
  outputLanguage: string;
}

interface SummarizerCreateOptions extends SummarizerCoreOptions {
  sharedContext?: string;
  expectedContextLanguages?: string[];
  signal?: AbortSignal;
  monitor?: (monitor: SummarizerMonitorLike) => void;
}

interface SummarizeOptions {
  context?: string;
  signal?: AbortSignal;
}

interface SummarizerSessionLike {
  summarize(input: string, options?: SummarizeOptions): Promise<string>;
  summarizeStreaming(input: string, options?: SummarizeOptions): ReadableStream<string>;
  destroy?: () => void;
}

interface SummarizerApiLike {
  availability(options?: SummarizerCoreOptions): Promise<string>;
  create(options?: SummarizerCreateOptions): Promise<SummarizerSessionLike>;
}

type GlobalWithSummarizer = typeof globalThis & { Summarizer?: SummarizerApiLike };
type NavigatorWithUserActivation = Navigator & { userActivation?: { isActive: boolean } };

export interface ChromeSummarizerCapability {
  apiPresent: boolean;
  availability: BuiltInAvailability;
  rawAvailability?: string;
  language: string;
  supportedLanguages: readonly ChromeBuiltInTextLanguage[];
  requiresDownload: boolean;
  canCreate: boolean;
  reason?: ChromeBuiltInCapabilityReason;
  reasonMessage?: string;
  errorMessage?: string;
  checkedOptions?: SummarizerCoreOptions;
  error?: unknown;
}

export type ChromeSummarizerErrorCode =
  | 'insecure-context'
  | 'api-missing'
  | 'language-unsupported'
  | 'unavailable'
  | 'download-required'
  | 'user-activation-required'
  | 'create-failed';

export class ChromeSummarizerError extends Error {
  readonly code: ChromeSummarizerErrorCode;
  readonly originalError?: unknown;

  constructor(message: string, code: ChromeSummarizerErrorCode, originalError?: unknown) {
    super(message);
    this.name = 'ChromeSummarizerError';
    this.code = code;
    this.originalError = originalError;
  }
}

function getSummarizerApi(): SummarizerApiLike | null {
  if (typeof globalThis === 'undefined') return null;
  return (globalThis as GlobalWithSummarizer).Summarizer ?? null;
}

export function buildSummarizerCoreOptions(language = 'en'): SummarizerCoreOptions {
  const normalizedLanguage = language.trim().toLowerCase() || 'en';
  return {
    type: 'key-points',
    format: 'markdown',
    length: 'medium',
    expectedInputLanguages: [normalizedLanguage],
    outputLanguage: normalizedLanguage,
  };
}

export async function getChromeSummarizerCapability(
  language = 'en',
): Promise<ChromeSummarizerCapability> {
  const normalizedLanguage = (language || 'en').trim().toLowerCase();
  const coreOptions = buildSummarizerCoreOptions(normalizedLanguage);
  const api = getSummarizerApi();

  if (isInsecureBrowserContext()) {
    return {
      apiPresent: Boolean(api),
      availability: 'unavailable',
      language: normalizedLanguage,
      supportedLanguages: CHROME_BUILT_IN_TEXT_LANGUAGES,
      requiresDownload: false,
      canCreate: false,
      reason: 'insecure-context',
      reasonMessage: '当前页面处于非安全上下文（需 HTTPS 或 localhost），Chrome Summarizer 仅在安全上下文中可用。',
      checkedOptions: coreOptions,
    };
  }

  if (!api || typeof api.availability !== 'function') {
    return {
      apiPresent: false,
      availability: 'unavailable',
      language: normalizedLanguage,
      supportedLanguages: CHROME_BUILT_IN_TEXT_LANGUAGES,
      requiresDownload: false,
      canCreate: false,
      reason: 'api-missing',
      reasonMessage: getLocalAiApiMissingMessage('summarizer'),
      checkedOptions: coreOptions,
    };
  }

  if (!isChromeBuiltInTextLanguage(normalizedLanguage)) {
    return {
      apiPresent: true,
      availability: 'unavailable',
      language: normalizedLanguage,
      supportedLanguages: CHROME_BUILT_IN_TEXT_LANGUAGES,
      requiresDownload: false,
      canCreate: false,
      reason: 'language-unsupported',
      reasonMessage: '请求语言不在当前支持列表中（当前开放：en / ja / es / de / fr）。',
      checkedOptions: coreOptions,
    };
  }

  try {
    const rawAvailability = await api.availability(coreOptions);
    const availability = normalizeBuiltInAvailability(rawAvailability);

    return {
      apiPresent: true,
      availability,
      rawAvailability: String(rawAvailability),
      language: normalizedLanguage,
      supportedLanguages: CHROME_BUILT_IN_TEXT_LANGUAGES,
      requiresDownload: availability === 'downloadable' || availability === 'downloading',
      canCreate: availability !== 'unavailable',
      reason: availability === 'unavailable' ? 'browser-unavailable' : undefined,
      reasonMessage:
        availability === 'unavailable'
          ? '浏览器返回 unavailable（可能是设备硬件或系统暂不满足摘要模型要求），请对照 chrome://on-device-internals 排查。'
          : undefined,
      checkedOptions: coreOptions,
    };
  } catch (error) {
    const errorMessage = formatLocalAiErrorMessage(error);
    return {
      apiPresent: true,
      availability: 'unavailable',
      language: normalizedLanguage,
      supportedLanguages: CHROME_BUILT_IN_TEXT_LANGUAGES,
      requiresDownload: false,
      canCreate: false,
      reason: 'availability-check-failed',
      reasonMessage: errorMessage
        ? `检测 Summarizer API 状态时发生异常：${errorMessage}`
        : '检测 Summarizer API 状态时发生异常。',
      errorMessage,
      checkedOptions: coreOptions,
      error,
    };
  }
}

async function createSummarizer(
  language: string,
  options?: {
    onDownloadProgress?: (progress: number) => void;
    signal?: AbortSignal;
  },
): Promise<SummarizerSessionLike> {
  const capability = await getChromeSummarizerCapability(language);
  const api = getSummarizerApi();

  if (capability.reason === 'insecure-context') {
    throw new ChromeSummarizerError(
      capability.reasonMessage || 'Chrome Summarizer requires a secure context.',
      'insecure-context',
    );
  }
  if (capability.reason === 'language-unsupported') {
    throw new ChromeSummarizerError(
      'Requested language is not supported by Chrome Summarizer.',
      'language-unsupported',
    );
  }
  if (!api) {
    throw new ChromeSummarizerError(
      'Chrome Summarizer API is not available in this browser.',
      'api-missing',
    );
  }
  if (!capability.canCreate) {
    throw new ChromeSummarizerError(
      capability.reasonMessage || 'Chrome Summarizer is unavailable on this device.',
      'unavailable',
      capability.error,
    );
  }

  const activation =
    typeof navigator === 'undefined'
      ? undefined
      : (navigator as NavigatorWithUserActivation).userActivation;
  if (capability.requiresDownload && activation && !activation.isActive) {
    throw new ChromeSummarizerError(
      'Summarizer download requires direct user interaction.',
      'user-activation-required',
    );
  }

  const coreOptions = buildSummarizerCoreOptions(language);

  try {
    return await api.create({
      ...coreOptions,
      signal: options?.signal,
      monitor: options?.onDownloadProgress
        ? (monitor) =>
            monitor.addEventListener('downloadprogress', (event) => {
              options.onDownloadProgress?.(normalizeDownloadProgress(event.loaded, event.total));
            })
        : undefined,
    });
  } catch (error) {
    throw new ChromeSummarizerError('Failed to create Chrome Summarizer.', 'create-failed', error);
  }
}

export async function prepareChromeSummarizer(
  language = 'en',
  onDownloadProgress?: (progress: number) => void,
): Promise<void> {
  const session = await createSummarizer(language, { onDownloadProgress });
  session.destroy?.();
}

export async function runChromeSummarizer(
  input: string,
  options?: {
    language?: string;
    signal?: AbortSignal;
    onChunk?: (accumulated: string) => void;
  },
): Promise<string> {
  const language = (options?.language || 'en').toLowerCase();
  const capability = await getChromeSummarizerCapability(language);

  if (capability.availability === 'downloadable' || capability.availability === 'downloading') {
    throw new ChromeSummarizerError(
      'Chrome Summarizer model needs to be prepared first.',
      'download-required',
    );
  }

  const session = await createSummarizer(language, { signal: options?.signal });
  try {
    if (!options?.onChunk) {
      if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      return await session.summarize(input, { signal: options?.signal });
    }

    const reader = session.summarizeStreaming(input, { signal: options.signal }).getReader();
    const abortHandler = () => {
      void reader.cancel();
    };
    options.signal?.addEventListener('abort', abortHandler, { once: true });

    let result = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += value;
        options.onChunk(result);
      }
    } finally {
      options.signal?.removeEventListener('abort', abortHandler);
    }

    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return result;
  } finally {
    session.destroy?.();
  }
}
