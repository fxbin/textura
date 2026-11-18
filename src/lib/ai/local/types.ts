export const CHROME_BUILT_IN_TEXT_LANGUAGES = ['en', 'ja', 'es', 'de', 'fr'] as const;

export type ChromeBuiltInTextLanguage = (typeof CHROME_BUILT_IN_TEXT_LANGUAGES)[number];
export type BuiltInAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';
export type LocalAiTask = 'format' | 'polish' | 'summarize' | 'expand' | 'fix';
export type LocalAiExecutionMode = 'smart' | 'chrome-built-in' | 'cloud';

export type ChromeBuiltInCapabilityReason =
  | 'insecure-context'
  | 'api-missing'
  | 'language-unsupported'
  | 'browser-unavailable'
  | 'availability-check-failed';

export interface LanguageModelCoreOptions {
  expectedInputs: Array<{ type: 'text'; languages: string[] }>;
  expectedOutputs: Array<{ type: 'text'; languages: string[] }>;
}

export interface ChromeBuiltInCapabilityRequest {
  inputLanguage: string;
  outputLanguage?: string;
  systemPromptLanguage?: string;
}

export interface ChromeBuiltInCapability {
  provider: 'chrome-built-in';
  apiPresent: boolean;
  availability: BuiltInAvailability;
  rawAvailability?: string;
  inputLanguage: string;
  outputLanguage: string;
  systemPromptLanguage: string;
  supportedLanguages: readonly ChromeBuiltInTextLanguage[];
  requiresDownload: boolean;
  canCreateSession: boolean;
  reason?: ChromeBuiltInCapabilityReason;
  reasonMessage?: string;
  errorMessage?: string;
  checkedOptions?: LanguageModelCoreOptions;
  error?: unknown;
}

export interface ChromeBuiltInPromptRequest extends ChromeBuiltInCapabilityRequest {
  prompt: string;
  systemPrompt?: string;
  signal?: AbortSignal;
  onDownloadProgress?: (progress: number) => void;
}

export interface ChromeBuiltInPromptSession {
  prompt(input: string, options?: { signal?: AbortSignal }): Promise<string>;
  promptStreaming(input: string, options?: { signal?: AbortSignal }): ReadableStream<string>;
  destroy?: () => void;
}

export interface AiRouteRequest {
  mode: LocalAiExecutionMode;
  task: LocalAiTask;
  inputLanguage: string;
  outputLanguage?: string;
  cloudProvider?: string;
  localCapability?: ChromeBuiltInCapability;
}

export interface AiRouteDecision {
  provider: 'chrome-built-in' | 'cloud';
  canExecute: boolean;
  reason:
    | 'explicit-cloud'
    | 'explicit-local'
    | 'explicit-local-unavailable'
    | 'local-supported'
    | 'local-language-unsupported'
    | 'local-api-unavailable'
    | 'local-download-required'
    | 'local-task-unsupported';
  cloudProvider?: string;
  localAvailability?: BuiltInAvailability;
  fallbackAllowed: boolean;
}
