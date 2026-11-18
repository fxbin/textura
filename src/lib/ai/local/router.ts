import type { AiRouteDecision, AiRouteRequest, LocalAiTask } from './types';

const PROMPT_LOCAL_TASKS = new Set<LocalAiTask>(['polish', 'expand', 'fix']);
const FENCED_CODE_BLOCK_RE = /```[\s\S]*?```/g;
const URL_RE = /https?:\/\/\S+/g;
const KANA_CHAR_RE = /[\u3040-\u30ff]/gu;
const HAN_CHAR_RE = /\p{Script=Han}/gu;
const LATIN_WORD_RE = /[A-Za-z]+(?:'[A-Za-z]+)*/g;

const isBusinessEnglish = (language: string): boolean => language.trim().toLowerCase() === 'en';

export function inferPrimaryTextLanguage(text: string): 'zh' | 'ja' | 'en' | 'und' {
  if (!text.trim()) return 'und';

  const stripped = text.replace(FENCED_CODE_BLOCK_RE, ' ').replace(URL_RE, ' ');
  const sample = stripped.trim() ? stripped : text;

  const kanaCount = sample.match(KANA_CHAR_RE)?.length ?? 0;
  const hanCount = sample.match(HAN_CHAR_RE)?.length ?? 0;
  const latinWords = sample.match(LATIN_WORD_RE)?.length ?? 0;

  if (kanaCount > 0 && (latinWords < 8 || kanaCount / (kanaCount + latinWords) >= 0.15)) {
    return 'ja';
  }

  if (hanCount > 0) {
    if (latinWords >= 8 && hanCount / (hanCount + latinWords) < 0.15) {
      return 'en';
    }
    return 'zh';
  }

  if (/\p{Script=Latin}/u.test(sample)) return 'en';
  return 'und';
}

export function routeAiExecution(request: AiRouteRequest): AiRouteDecision {
  const cloudProvider = request.cloudProvider || 'deepseek';
  const outputLanguage = request.outputLanguage || request.inputLanguage;

  if (request.mode === 'cloud') {
    return {
      provider: 'cloud',
      canExecute: true,
      reason: 'explicit-cloud',
      cloudProvider,
      fallbackAllowed: false,
    };
  }

  if (!PROMPT_LOCAL_TASKS.has(request.task)) {
    return request.mode === 'chrome-built-in'
      ? {
          provider: 'chrome-built-in',
          canExecute: false,
          reason: 'local-task-unsupported',
          localAvailability: request.localCapability?.availability || 'unavailable',
          fallbackAllowed: false,
        }
      : {
          provider: 'cloud',
          canExecute: true,
          reason: 'local-task-unsupported',
          cloudProvider,
          localAvailability: request.localCapability?.availability,
          fallbackAllowed: true,
        };
  }

  const languageSupported =
    isBusinessEnglish(request.inputLanguage) && isBusinessEnglish(outputLanguage);

  if (request.mode === 'chrome-built-in') {
    const capabilityReason = request.localCapability?.reason;
    if (capabilityReason === 'api-missing' || capabilityReason === 'insecure-context') {
      return {
        provider: 'chrome-built-in',
        canExecute: false,
        reason: 'explicit-local-api-unavailable',
        localAvailability: request.localCapability?.availability || 'unavailable',
        fallbackAllowed: false,
      };
    }

    if (!languageSupported) {
      return {
        provider: 'chrome-built-in',
        canExecute: false,
        reason: 'explicit-local-language-unsupported',
        localAvailability: request.localCapability?.availability || 'unavailable',
        fallbackAllowed: false,
      };
    }

    if (!request.localCapability || request.localCapability.availability === 'unavailable') {
      return {
        provider: 'chrome-built-in',
        canExecute: false,
        reason: 'explicit-local-api-unavailable',
        localAvailability: request.localCapability?.availability || 'unavailable',
        fallbackAllowed: false,
      };
    }

    if (request.localCapability.availability !== 'available') {
      return {
        provider: 'chrome-built-in',
        canExecute: false,
        reason: 'local-download-required',
        localAvailability: request.localCapability.availability,
        fallbackAllowed: false,
      };
    }

    return {
      provider: 'chrome-built-in',
      canExecute: true,
      reason: 'explicit-local',
      localAvailability: 'available',
      fallbackAllowed: false,
    };
  }

  if (!languageSupported) {
    return {
      provider: 'cloud',
      canExecute: true,
      reason: 'local-language-unsupported',
      cloudProvider,
      localAvailability: 'unavailable',
      fallbackAllowed: true,
    };
  }

  if (!request.localCapability || request.localCapability.availability === 'unavailable') {
    return {
      provider: 'cloud',
      canExecute: true,
      reason: 'local-api-unavailable',
      cloudProvider,
      localAvailability: request.localCapability?.availability || 'unavailable',
      fallbackAllowed: true,
    };
  }

  if (request.localCapability.availability !== 'available') {
    return {
      provider: 'cloud',
      canExecute: true,
      reason: 'local-download-required',
      cloudProvider,
      localAvailability: request.localCapability.availability,
      fallbackAllowed: true,
    };
  }

  return {
    provider: 'chrome-built-in',
    canExecute: true,
    reason: 'local-supported',
    localAvailability: 'available',
    fallbackAllowed: true,
  };
}
