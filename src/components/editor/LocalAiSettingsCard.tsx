'use client';

import * as React from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Cpu,
  Download,
  RefreshCw,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  collectLocalAiDiagnostics,
  createChromeBuiltInPromptSession,
  getChromeBuiltInCapability,
  getChromeSummarizerCapability,
  prepareChromeSummarizer,
  type ChromeBuiltInCapability,
  type ChromeSummarizerCapability,
} from '@/lib/ai/local';

const LOCAL_CAPABILITY_REQUEST = {
  inputLanguage: 'en',
  outputLanguage: 'en',
  systemPromptLanguage: 'en',
} as const;

type CapabilityLike =
  | Pick<ChromeBuiltInCapability, 'availability' | 'reason'>
  | Pick<ChromeSummarizerCapability, 'availability' | 'reason'>;

function getStatusText(capability: CapabilityLike | null, checking: boolean) {
  if (checking) return '检测中';
  if (!capability) return '未知';

  switch (capability.availability) {
    case 'available':
      return '可用';
    case 'downloadable':
      return '可下载';
    case 'downloading':
      return '下载中';
    default:
      if (capability.reason === 'insecure-context') return '非安全上下文';
      if (capability.reason === 'api-missing') return '浏览器不支持';
      if (capability.reason === 'language-unsupported') return '语言不支持';
      if (capability.reason === 'availability-check-failed') return '检测异常';
      return '不可用';
  }
}

function ProgressBar({ progress }: { progress: number | null }) {
  if (progress === null) return null;
  const percent = Math.round(progress * 100);
  return (
    <div className="space-y-1">
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-right text-[11px] text-muted-foreground">{percent}%</p>
    </div>
  );
}

export function LocalAiSettingsCard() {
  const [promptCapability, setPromptCapability] = React.useState<ChromeBuiltInCapability | null>(null);
  const [summarizerCapability, setSummarizerCapability] =
    React.useState<ChromeSummarizerCapability | null>(null);
  const [checking, setChecking] = React.useState(true);
  const [preparingPrompt, setPreparingPrompt] = React.useState(false);
  const [preparingSummarizer, setPreparingSummarizer] = React.useState(false);
  const [promptProgress, setPromptProgress] = React.useState<number | null>(null);
  const [summarizerProgress, setSummarizerProgress] = React.useState<number | null>(null);
  const [showDiagnostics, setShowDiagnostics] = React.useState(false);

  const refreshCapability = React.useCallback(async () => {
    setChecking(true);
    try {
      const [prompt, summarizer] = await Promise.all([
        getChromeBuiltInCapability(LOCAL_CAPABILITY_REQUEST),
        getChromeSummarizerCapability('en'),
      ]);
      setPromptCapability(prompt);
      setSummarizerCapability(summarizer);
    } finally {
      setChecking(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshCapability();
  }, [refreshCapability]);

  const diagnostics = React.useMemo(
    () =>
      collectLocalAiDiagnostics({
        promptCapability,
        summarizerCapability,
      }),
    [promptCapability, summarizerCapability]
  );

  const handlePreparePrompt = async () => {
    setPreparingPrompt(true);
    setPromptProgress(0);
    try {
      const session = await createChromeBuiltInPromptSession({
        ...LOCAL_CAPABILITY_REQUEST,
        onDownloadProgress: (progress) => setPromptProgress(progress),
      });
      session.destroy?.();
      await refreshCapability();
      toast.success('Chrome Prompt 本地模型已准备完成');
    } catch (error) {
      console.error('[Local AI] prompt prepare failed:', error);
      toast.error(error instanceof Error ? error.message : 'Prompt 本地模型准备失败');
    } finally {
      setPreparingPrompt(false);
    }
  };

  const handlePrepareSummarizer = async () => {
    setPreparingSummarizer(true);
    setSummarizerProgress(0);
    try {
      await prepareChromeSummarizer('en', (progress) => setSummarizerProgress(progress));
      await refreshCapability();
      toast.success('Chrome Summarizer 已准备完成');
    } catch (error) {
      console.error('[Local AI] summarizer prepare failed:', error);
      toast.error(error instanceof Error ? error.message : '摘要模型准备失败');
    } finally {
      setPreparingSummarizer(false);
    }
  };

  const handleCopyText = async (text: string, successMsg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMsg);
    } catch {
      toast.error('复制失败，请检查剪贴板权限');
    }
  };

  const promptCanPrepare =
    promptCapability?.availability === 'downloadable' ||
    promptCapability?.availability === 'downloading';
  const summarizerCanPrepare =
    summarizerCapability?.availability === 'downloadable' ||
    summarizerCapability?.availability === 'downloading';
  const allReady =
    promptCapability?.availability === 'available' &&
    summarizerCapability?.availability === 'available';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Cpu className="h-4 w-4 text-primary" />
          Chrome 本地 AI
        </CardTitle>
        <CardDescription>
          Textura 分别基于官方 availability 参数独立检测 Prompt API 与 Summarizer API；模型下载仅在你显式点击准备按钮后触发。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            当前仅对英语开放本地推理，中文任务继续由云端执行或 fallback。
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void refreshCapability()}
            disabled={checking || preparingPrompt || preparingSummarizer}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
            重新检测
          </Button>
        </div>

        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Prompt API</p>
              <p className="text-xs text-muted-foreground">
                英文润色 / 纠错 / 扩写 · {getStatusText(promptCapability, checking)}
              </p>
            </div>
            {promptCanPrepare && (
              <Button size="sm" onClick={() => void handlePreparePrompt()} disabled={preparingPrompt}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {preparingPrompt ? '准备中' : '准备 Prompt 模型'}
              </Button>
            )}
          </div>
          {!checking && promptCapability?.reasonMessage && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {promptCapability.reasonMessage}
            </p>
          )}
          <ProgressBar progress={promptProgress} />
        </div>

        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Summarizer API</p>
              <p className="text-xs text-muted-foreground">
                英文摘要 · {getStatusText(summarizerCapability, checking)}
              </p>
            </div>
            {summarizerCanPrepare && (
              <Button
                size="sm"
                onClick={() => void handlePrepareSummarizer()}
                disabled={preparingSummarizer}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {preparingSummarizer ? '准备中' : '准备摘要模型'}
              </Button>
            )}
          </div>
          {!checking && summarizerCapability?.reasonMessage && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {summarizerCapability.reasonMessage}
            </p>
          )}
          <ProgressBar progress={summarizerProgress} />
        </div>

        {allReady && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>Prompt 与摘要本地能力均已就绪。实际走本地执行时，正文不会发送到云端 Provider。</span>
          </div>
        )}

        {/* Diagnostics Collapsible Section */}
        <div className="rounded-lg border border-border/80 bg-muted/25">
          <button
            type="button"
            onClick={() => setShowDiagnostics((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
          >
            <span className="flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
              诊断详情（Diagnostics）
            </span>
            {showDiagnostics ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>

          {showDiagnostics && (
            <div className="space-y-3 border-t border-border/70 p-3 text-[11.5px]">
              <div className="grid gap-1.5 sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">浏览器版本：</span>
                  <span className="font-mono text-foreground">{diagnostics.chromeVersion}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">当前 Origin：</span>
                  <span className="font-mono text-foreground">{diagnostics.origin}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">安全上下文：</span>
                  <span className="font-mono text-foreground">
                    {diagnostics.isSecureContext ? '是 (Secure)' : '否 (Insecure)'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">运行环境：</span>
                  <span className="font-mono text-foreground">{diagnostics.runtime}</span>
                </div>
              </div>

              <div className="space-y-1.5 rounded-md border border-border/60 bg-background/70 p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">Prompt API 原始状态</span>
                  <span className="font-mono text-muted-foreground">
                    {diagnostics.prompt.availability}
                    {diagnostics.prompt.rawAvailability &&
                    diagnostics.prompt.rawAvailability !== diagnostics.prompt.availability
                      ? ` (raw: ${diagnostics.prompt.rawAvailability})`
                      : ''}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-muted-foreground">
                  apiPresent={String(diagnostics.prompt.apiPresent)} · reason=
                  {diagnostics.prompt.reason ?? 'none'}
                </p>
                {diagnostics.prompt.errorMessage && (
                  <p className="font-mono text-[11px] text-destructive">
                    error={diagnostics.prompt.errorMessage}
                  </p>
                )}
              </div>

              <div className="space-y-1.5 rounded-md border border-border/60 bg-background/70 p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">Summarizer API 原始状态</span>
                  <span className="font-mono text-muted-foreground">
                    {diagnostics.summarizer.availability}
                    {diagnostics.summarizer.rawAvailability &&
                    diagnostics.summarizer.rawAvailability !== diagnostics.summarizer.availability
                      ? ` (raw: ${diagnostics.summarizer.rawAvailability})`
                      : ''}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-muted-foreground">
                  apiPresent={String(diagnostics.summarizer.apiPresent)} · reason=
                  {diagnostics.summarizer.reason ?? 'none'}
                </p>
                {diagnostics.summarizer.errorMessage && (
                  <p className="font-mono text-[11px] text-destructive">
                    error={diagnostics.summarizer.errorMessage}
                  </p>
                )}
              </div>

              <p className="leading-relaxed text-muted-foreground">{diagnostics.deviceHint}</p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    void handleCopyText(
                      'chrome://on-device-internals',
                      '已复制 chrome://on-device-internals，可在 Chrome 地址栏粘贴打开'
                    )
                  }
                >
                  <Copy className="h-3 w-3" />
                  复制 chrome://on-device-internals
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    void handleCopyText(
                      JSON.stringify(diagnostics, null, 2),
                      '已复制诊断详情 JSON'
                    )
                  }
                >
                  <Copy className="h-3 w-3" />
                  复制诊断 JSON
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          “智能选择”只有在对应 API 状态为“可用”时才走本地；可下载或下载中不会自动触发下载，而是使用已配置的云端 fallback。
        </p>
      </CardContent>
    </Card>
  );
}
