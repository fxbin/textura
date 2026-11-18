import { isTauriRuntime } from './chromeBuiltIn';
import type { ChromeSummarizerCapability } from './chromeSummarizer';
import type { ChromeBuiltInCapability } from './types';

interface NavigatorBrand {
  brand: string;
  version: string;
}

interface NavigatorUADataLike {
  brands?: NavigatorBrand[];
}

export interface LocalAiApiDiagnostic {
  apiPresent: boolean;
  availability: string;
  rawAvailability?: string;
  reason?: string;
  reasonMessage?: string;
  errorMessage?: string;
  checkedOptions?: unknown;
}

export interface LocalAiDiagnosticsReport {
  chromeVersion: string;
  runtime: 'tauri' | 'browser' | 'server';
  origin: string;
  isSecureContext: boolean;
  userAgent: string;
  prompt: LocalAiApiDiagnostic;
  summarizer: LocalAiApiDiagnostic;
  deviceHint: string;
}

export function extractChromeVersion(
  userAgent: string,
  brands?: NavigatorBrand[],
): string {
  const chromeBrand = brands?.find((item) =>
    /google chrome|chromium|microsoft edge/i.test(item.brand),
  );
  if (chromeBrand?.version) {
    return `${chromeBrand.brand} ${chromeBrand.version}`;
  }

  const edgeMatch = userAgent.match(/Edg\/([\d.]+)/);
  if (edgeMatch) {
    return `Edge ${edgeMatch[1]}`;
  }

  const chromeMatch = userAgent.match(/Chrome\/([\d.]+)/);
  if (chromeMatch) {
    return `Chrome ${chromeMatch[1]}`;
  }

  if (/Firefox\//i.test(userAgent)) return 'Firefox（非 Chromium 内核）';
  if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) return 'Safari（非 Chromium 内核）';
  return userAgent ? '非 Chrome 内核' : '未知环境';
}

function buildApiDiagnostic(
  capability: ChromeBuiltInCapability | ChromeSummarizerCapability | null,
): LocalAiApiDiagnostic {
  if (!capability) {
    return {
      apiPresent: false,
      availability: 'unknown',
      reasonMessage: '尚未完成检测',
    };
  }

  return {
    apiPresent: capability.apiPresent,
    availability: capability.availability,
    rawAvailability: capability.rawAvailability,
    reason: capability.reason,
    reasonMessage: capability.reasonMessage,
    errorMessage: capability.errorMessage,
    checkedOptions: capability.checkedOptions,
  };
}

function buildDeviceHint(
  isSecureContext: boolean,
  runtime: LocalAiDiagnosticsReport['runtime'],
  userAgent: string,
  prompt: ChromeBuiltInCapability | null,
  summarizer: ChromeSummarizerCapability | null,
): string {
  if (!isSecureContext) {
    return '当前非安全上下文，请通过 HTTPS 或 localhost 访问以启用浏览器内置 AI。';
  }

  if (!prompt?.apiPresent && !summarizer?.apiPresent) {
    if (runtime === 'tauri') {
      return '当前运行于 Tauri 桌面端内置 WebView，不包含 Chrome 内置 Gemini Nano 模型，建议使用「智能选择」或配置云端 Provider。';
    }
    if (/Firefox\//i.test(userAgent) || (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent))) {
      return '当前浏览器内核不支持 Chrome Built-in AI，建议使用「智能选择」或配置云端 Provider。';
    }
    return '当前浏览器未暴露 LanguageModel / Summarizer 接口；若使用桌面版 Chrome，请在 chrome://flags 开启 #optimization-guide-on-device-model、#prompt-api-for-gemini-nano 与 #summarization-api-for-gemini-nano 后重启，或直接使用云端 Provider。';
  }

  if (
    prompt?.availability === 'available' &&
    summarizer?.availability === 'available'
  ) {
    return 'Prompt 与 Summarizer 模型均已准备就绪，可执行纯本地英语推理。';
  }

  if (
    prompt?.availability === 'downloadable' ||
    summarizer?.availability === 'downloadable'
  ) {
    return '模型当前处于可下载状态（downloadable）。请使用非计费网络并确保磁盘至少有 22GB 可用空间后，点击上方「准备」按钮。';
  }

  if (
    prompt?.availability === 'downloading' ||
    summarizer?.availability === 'downloading'
  ) {
    return '模型正在后台下载中（downloading），可在 chrome://on-device-internals 查看实时进度；下载完成前“智能选择”会回退云端。';
  }

  return '设备状态为 unavailable 时，请打开 chrome://on-device-internals 核对 Gemini Nano 模型状态，并确认硬件条件（>4GB 显存或 >=16GB 内存且 >=4 核 CPU，磁盘 >=22GB）。';
}

export function collectLocalAiDiagnostics(input: {
  promptCapability: ChromeBuiltInCapability | null;
  summarizerCapability: ChromeSummarizerCapability | null;
}): LocalAiDiagnosticsReport {
  const hasWindow = typeof window !== 'undefined';
  const hasNavigator = typeof navigator !== 'undefined';
  const userAgent = hasNavigator ? navigator.userAgent : '';
  const brands = hasNavigator
    ? (navigator as Navigator & { userAgentData?: NavigatorUADataLike }).userAgentData?.brands
    : undefined;
  const runtime: LocalAiDiagnosticsReport['runtime'] = !hasWindow
    ? 'server'
    : isTauriRuntime()
      ? 'tauri'
      : 'browser';
  const origin = hasWindow && window.location ? window.location.origin : 'unknown';
  const isSecureContext = hasWindow ? window.isSecureContext !== false : false;

  return {
    chromeVersion: extractChromeVersion(userAgent, brands),
    runtime,
    origin,
    isSecureContext,
    userAgent,
    prompt: buildApiDiagnostic(input.promptCapability),
    summarizer: buildApiDiagnostic(input.summarizerCapability),
    deviceHint: buildDeviceHint(
      isSecureContext,
      runtime,
      userAgent,
      input.promptCapability,
      input.summarizerCapability,
    ),
  };
}
