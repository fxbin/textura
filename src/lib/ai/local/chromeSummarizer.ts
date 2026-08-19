import {
  CHROME_BUILT_IN_TEXT_LANGUAGES,
  type BuiltInAvailability,
  type ChromeBuiltInTextLanguage,
} from './types';
import { isChromeBuiltInTextLanguage } from './chromeBuiltIn';

interface SummarizerMonitorLike {
  addEventListener(type: 'downloadprogress', listener: (event: { loaded: number }) => void): void;
}

interface SummarizerCreateOptions {
  type?: 'key-points' | 'tldr' | 'teaser' | 'headline';
  format?: 'markdown' | 'plain-text';
  length?: 'short' | 'medium' | 'long';
  preference?: 'auto' | 'speed' | 'capability';
  sharedContext?: string;
  expectedInputLanguages?: string[];
  outputLanguage?: string;
  expectedContextLanguages?: string[];
  monitor?: (monitor: SummarizerMonitorLike) => void;
}

interface SummarizeOptions {
  context?: string;
}

interface SummarizerSessionLike {
  summarize(input: string, options?: SummarizeOptions): Promise<string>;
  summarizeStreaming(input: string, options?: SummarizeOptions): ReadableStream<string>;
  destroy?: () => void;
}

interface SummarizerApiLike {
  availability(): Promise<BuiltInAvailability>;
  create(options?: SummarizerCreateOptions): Promise<SummarizerSessionLike>;
}

type GlobalWithSummarizer = typeof globalThis & { Summarizer?: SummarizerApiLike };
type NavigatorWithUserActivation = Navigator & { userActivation?: { isActive: boolean } };

export interface ChromeSummarizerCapability {
  apiPresent: boolean;
  availability: BuiltInAvailability;
  language: string;
  supportedLanguages: readonly ChromeBuiltInTextLanguage[];
  requiresDownload: boolean;
  canCreate: boolean;
  reason?: 'api-missing' | 'language-unsupported' | 'browser-unavailable' | 'availability-check-failed';
  error?: unknown;
}

export class ChromeSummarizerError extends Error {
  constructor(
    message: string,
    public readonly code: 'api-missing' | 'language-unsupported' | 'unavailable' | 'download-required' | 'user-activation-required' | 'create-failed',
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'ChromeSummarizerError';
  }
}

function getSummarizerApi(): SummarizerApiLike | null {
  if (typeof globalThis === 'undefined') return null;
  return (globalThis as GlobalWithSummarizer).Summarizer ?? null;
}

export async function getChromeSummarizerCapability(language = 'en'): Promise<ChromeSummarizerCapability> {
  const normalizedLanguage = language.trim().toLowerCase();
  const api = getSummarizerApi();

  if (!isChromeBuiltInTextLanguage(normalizedLanguage)) {
    return {
      apiPresent: Boolean(api),
      availability: 'unavailable',
      language: normalizedLanguage,
      supportedLanguages: CHROME_BUILT_IN_TEXT_LANGUAGES,
      requiresDownload: false,
      canCreate: false,
      reason: 'language-unsupported',
    };
  }

  if (!api) {
    return {
      apiPresent: false,
      availability: 'unavailable',
      language: normalizedLanguage,
      supportedLanguages: CHROME_BUILT_IN_TEXT_LANGUAGES,
      requiresDownload: false,
      canCreate: false,
      reason: 'api-missing',
    };
  }

  try {
    const availability = await api.availability();
    return {
      apiPresent: true,
      availability,
      language: normalizedLanguage,
      supportedLanguages: CHROME_BUILT_IN_TEXT_LANGUAGES,
      requiresDownload: availability === 'downloadable' || availability === 'downloading',
      canCreate: availability !== 'unavailable',
      reason: availability === 'unavailable' ? 'browser-unavailable' : undefined,
    };
  } catch (error) {
    return {
      apiPresent: true,
      availability: 'unavailable',
      language: normalizedLanguage,
      supportedLanguages: CHROME_BUILT_IN_TEXT_LANGUAGES,
      requiresDownload: false,
      canCreate: false,
      reason: 'availability-check-failed',
      error,
    };
  }
}

async function createSummarizer(
  language: string,
  onDownloadProgress?: (progress: number) => void,
): Promise<SummarizerSessionLike> {
  const capability = await getChromeSummarizerCapability(language);
  const api = getSummarizerApi();

  if (capability.reason === 'language-unsupported') {
    throw new ChromeSummarizerError('Requested language is not supported by Chrome Summarizer.', 'language-unsupported');
  }
  if (!api) {
    throw new ChromeSummarizerError('Chrome Summarizer API is not available in this browser.', 'api-missing');
  }
  if (!capability.canCreate) {
    throw new ChromeSummarizerError('Chrome Summarizer is unavailable on this device.', 'unavailable', capability.error);
  }

  const activation = typeof navigator === 'undefined' ? undefined : (navigator as NavigatorWithUserActivation).userActivation;
  if (capability.requiresDownload && activation && !activation.isActive) {
    throw new ChromeSummarizerError('Summarizer download requires direct user interaction.', 'user-activation-required');
  }

  try {
    return await api.create({
      type: 'key-points',
      format: 'markdown',
      length: 'medium',
      preference: 'auto',
      expectedInputLanguages: [language],
      outputLanguage: language,
      monitor: onDownloadProgress
        ? (monitor) => monitor.addEventListener('downloadprogress', (event) => {
            onDownloadProgress(Math.max(0, Math.min(1, event.loaded)));
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
  const session = await createSummarizer(language, onDownloadProgress);
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
    throw new ChromeSummarizerError('Chrome Summarizer model needs to be prepared first.', 'download-required');
  }

  const session = await createSummarizer(language);
  try {
    if (!options?.onChunk) {
      if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      return await session.summarize(input);
    }

    const reader = session.summarizeStreaming(input).getReader();
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
