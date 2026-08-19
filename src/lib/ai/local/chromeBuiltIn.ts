import {
  CHROME_BUILT_IN_TEXT_LANGUAGES,
  type BuiltInAvailability,
  type ChromeBuiltInCapability,
  type ChromeBuiltInCapabilityRequest,
  type ChromeBuiltInPromptRequest,
  type ChromeBuiltInPromptSession,
  type ChromeBuiltInTextLanguage,
} from './types';

interface LanguageModelMonitorLike {
  addEventListener(type: 'downloadprogress', listener: (event: { loaded: number }) => void): void;
}

interface LanguageModelOptions {
  expectedInputs: Array<{ type: 'text'; languages: string[] }>;
  expectedOutputs: Array<{ type: 'text'; languages: string[] }>;
  initialPrompts?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  signal?: AbortSignal;
  monitor?: (monitor: LanguageModelMonitorLike) => void;
}

interface LanguageModelApiLike {
  availability(options: Pick<LanguageModelOptions, 'expectedInputs' | 'expectedOutputs'>): Promise<BuiltInAvailability>;
  create(options: LanguageModelOptions): Promise<ChromeBuiltInPromptSession>;
}

type GlobalWithLanguageModel = typeof globalThis & { LanguageModel?: LanguageModelApiLike };

export class ChromeBuiltInAiError extends Error {
  constructor(
    message: string,
    public readonly code: 'api-missing' | 'language-unsupported' | 'unavailable' | 'user-activation-required' | 'session-create-failed',
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ChromeBuiltInAiError';
  }
}

export function isChromeBuiltInTextLanguage(language: string): language is ChromeBuiltInTextLanguage {
  return (CHROME_BUILT_IN_TEXT_LANGUAGES as readonly string[]).includes(language.toLowerCase());
}

function getLanguageModelApi(): LanguageModelApiLike | null {
  if (typeof globalThis === 'undefined') return null;
  return (globalThis as GlobalWithLanguageModel).LanguageModel ?? null;
}

function buildExpectedOptions(request: ChromeBuiltInCapabilityRequest) {
  const inputLanguage = (request.inputLanguage || 'en').trim().toLowerCase();
  const outputLanguage = (request.outputLanguage || 'en').trim().toLowerCase();
  const systemPromptLanguage = (request.systemPromptLanguage || 'en').trim().toLowerCase();
  return {
    inputLanguage,
    outputLanguage,
    systemPromptLanguage,
    expectedInputs: [{ type: 'text' as const, languages: Array.from(new Set([systemPromptLanguage, inputLanguage])) }],
    expectedOutputs: [{ type: 'text' as const, languages: [outputLanguage] }],
  };
}

export async function getChromeBuiltInCapability(request: ChromeBuiltInCapabilityRequest): Promise<ChromeBuiltInCapability> {
  const options = buildExpectedOptions(request);
  const requestedLanguages = [options.systemPromptLanguage, options.inputLanguage, options.outputLanguage];
  const api = getLanguageModelApi();

  if (!requestedLanguages.every(isChromeBuiltInTextLanguage)) {
    return {
      provider: 'chrome-built-in', apiPresent: Boolean(api), availability: 'unavailable',
      inputLanguage: options.inputLanguage, outputLanguage: options.outputLanguage,
      systemPromptLanguage: options.systemPromptLanguage, supportedLanguages: CHROME_BUILT_IN_TEXT_LANGUAGES,
      requiresDownload: false, canCreateSession: false, reason: 'language-unsupported',
    };
  }

  if (!api) {
    return {
      provider: 'chrome-built-in', apiPresent: false, availability: 'unavailable',
      inputLanguage: options.inputLanguage, outputLanguage: options.outputLanguage,
      systemPromptLanguage: options.systemPromptLanguage, supportedLanguages: CHROME_BUILT_IN_TEXT_LANGUAGES,
      requiresDownload: false, canCreateSession: false, reason: 'api-missing',
    };
  }

  try {
    const availability = await api.availability({ expectedInputs: options.expectedInputs, expectedOutputs: options.expectedOutputs });
    return {
      provider: 'chrome-built-in', apiPresent: true, availability,
      inputLanguage: options.inputLanguage, outputLanguage: options.outputLanguage,
      systemPromptLanguage: options.systemPromptLanguage, supportedLanguages: CHROME_BUILT_IN_TEXT_LANGUAGES,
      requiresDownload: availability === 'downloadable' || availability === 'downloading',
      canCreateSession: availability !== 'unavailable',
      reason: availability === 'unavailable' ? 'browser-unavailable' : undefined,
    };
  } catch (error) {
    return {
      provider: 'chrome-built-in', apiPresent: true, availability: 'unavailable',
      inputLanguage: options.inputLanguage, outputLanguage: options.outputLanguage,
      systemPromptLanguage: options.systemPromptLanguage, supportedLanguages: CHROME_BUILT_IN_TEXT_LANGUAGES,
      requiresDownload: false, canCreateSession: false, reason: 'availability-check-failed', error,
    };
  }
}

export async function createChromeBuiltInPromptSession(request: Omit<ChromeBuiltInPromptRequest, 'prompt'>): Promise<ChromeBuiltInPromptSession> {
  const capability = await getChromeBuiltInCapability(request);
  const api = getLanguageModelApi();

  if (capability.reason === 'language-unsupported') {
    throw new ChromeBuiltInAiError('Requested language is not supported by Chrome Built-in AI.', 'language-unsupported');
  }
  if (!api) throw new ChromeBuiltInAiError('Chrome Built-in AI is not available in this browser.', 'api-missing');
  if (!capability.canCreateSession) throw new ChromeBuiltInAiError('Chrome Built-in AI is unavailable on this device.', 'unavailable', capability.error);

  if (capability.requiresDownload && typeof navigator !== 'undefined' && navigator.userActivation && !navigator.userActivation.isActive) {
    throw new ChromeBuiltInAiError('Model download requires direct user interaction.', 'user-activation-required');
  }

  const options = buildExpectedOptions(request);
  try {
    return await api.create({
      expectedInputs: options.expectedInputs,
      expectedOutputs: options.expectedOutputs,
      ...(request.systemPrompt ? { initialPrompts: [{ role: 'system' as const, content: request.systemPrompt }] } : {}),
      signal: request.signal,
      monitor: request.onDownloadProgress ? (monitor) => monitor.addEventListener('downloadprogress', (event) => request.onDownloadProgress?.(Math.max(0, Math.min(1, event.loaded)))) : undefined,
    });
  } catch (error) {
    throw new ChromeBuiltInAiError('Failed to create a Chrome Built-in AI session.', 'session-create-failed', error);
  }
}

export async function runChromeBuiltInPrompt(request: ChromeBuiltInPromptRequest, onChunk?: (accumulatedText: string) => void): Promise<string> {
  const session = await createChromeBuiltInPromptSession(request);
  try {
    if (!onChunk) return await session.prompt(request.prompt, { signal: request.signal });
    const reader = session.promptStreaming(request.prompt, { signal: request.signal }).getReader();
    let result = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += value;
      onChunk(result);
    }
    return result;
  } finally {
    session.destroy?.();
  }
}
