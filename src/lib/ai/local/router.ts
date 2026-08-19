import { isChromeBuiltInTextLanguage } from './chromeBuiltIn';
import type { AiRouteDecision, AiRouteRequest } from './types';

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

  const languageSupported =
    isChromeBuiltInTextLanguage(request.inputLanguage) &&
    isChromeBuiltInTextLanguage(outputLanguage);

  if (request.mode === 'chrome-built-in') {
    if (!languageSupported || !request.localCapability || request.localCapability.availability === 'unavailable') {
      return {
        provider: 'chrome-built-in',
        canExecute: false,
        reason: 'explicit-local-unavailable',
        localAvailability: request.localCapability?.availability || 'unavailable',
        fallbackAllowed: false,
      };
    }

    return {
      provider: 'chrome-built-in',
      canExecute: true,
      reason: 'explicit-local',
      localAvailability: request.localCapability.availability,
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

  return {
    provider: 'chrome-built-in',
    canExecute: true,
    reason: 'local-supported',
    localAvailability: request.localCapability.availability,
    fallbackAllowed: true,
  };
}
