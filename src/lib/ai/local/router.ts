import { isChromeBuiltInTextLanguage } from './chromeBuiltIn';
import type { AiRouteDecision, AiRouteRequest, LocalAiTask } from './types';

const PROMPT_LOCAL_TASKS = new Set<LocalAiTask>(['polish', 'expand', 'fix']);

export function inferPrimaryTextLanguage(text: string): 'zh' | 'ja' | 'en' | 'und' {
  if (!text.trim()) return 'und';
  if (/[\u3040-\u30ff]/u.test(text)) return 'ja';
  if (/\p{Script=Han}/u.test(text)) return 'zh';
  if (/\p{Script=Latin}/u.test(text)) return 'en';
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
    isChromeBuiltInTextLanguage(request.inputLanguage) &&
    isChromeBuiltInTextLanguage(outputLanguage);

  if (request.mode === 'chrome-built-in') {
    if (!languageSupported) {
      return {
        provider: 'chrome-built-in',
        canExecute: false,
        reason: 'explicit-local-unavailable',
        localAvailability: request.localCapability?.availability || 'unavailable',
        fallbackAllowed: false,
      };
    }

    if (!request.localCapability || request.localCapability.availability === 'unavailable') {
      return {
        provider: 'chrome-built-in',
        canExecute: false,
        reason: 'explicit-local-unavailable',
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
