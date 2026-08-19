'use client';

import * as React from 'react';
import { Cpu, Download, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
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

type CapabilityLike = Pick<ChromeBuiltInCapability, 'availability' | 'reason'> | Pick<ChromeSummarizerCapability, 'availability' | 'reason'>;

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
      if (capability.reason === 'api-missing') return '浏览器不支持';
      if (capability.reason === 'language-unsupported') return '语言不支持';
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
  const [summarizerCapability, setSummarizerCapability] = React.useState<ChromeSummarizerCapability | null>(null);
  const [checking, setChecking] = React.useState(true);
  const [preparingPrompt, setPreparingPrompt] = React.useState(false);
  const [preparingSummarizer, setPreparingSummarizer] = React.useState(false);
  const [promptProgress, setPromptProgress] = React.useState<number | null>(null);
  const [summarizerProgress, setSummarizerProgress] = React.useState<number | null>(null);

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

  const promptCanPrepare = promptCapability?.availability === 'downloadable' || promptCapability?.availability === 'downloading';
  const summarizerCanPrepare = summarizerCapability?.availability === 'downloadable' || summarizerCapability?.availability === 'downloading';
  const allReady = promptCapability?.availability === 'available' && summarizerCapability?.availability === 'available';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Cpu className="h-4 w-4 text-primary" />
          Chrome 本地 AI
        </CardTitle>
        <CardDescription>
          Textura 分别检测 Prompt API 与 Summarizer API；模型下载只会在你主动点击准备按钮后触发。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">当前只开放英语本地任务，中文继续使用云端 fallback。</p>
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

        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Prompt API</p>
              <p className="text-xs text-muted-foreground">英文润色 / 纠错 / 扩写 · {getStatusText(promptCapability, checking)}</p>
            </div>
            {promptCanPrepare && (
              <Button size="sm" onClick={() => void handlePreparePrompt()} disabled={preparingPrompt}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {preparingPrompt ? '准备中' : '准备 Prompt 模型'}
              </Button>
            )}
          </div>
          <ProgressBar progress={promptProgress} />
        </div>

        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Summarizer API</p>
              <p className="text-xs text-muted-foreground">英文摘要 · {getStatusText(summarizerCapability, checking)}</p>
            </div>
            {summarizerCanPrepare && (
              <Button size="sm" onClick={() => void handlePrepareSummarizer()} disabled={preparingSummarizer}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {preparingSummarizer ? '准备中' : '准备摘要模型'}
              </Button>
            )}
          </div>
          <ProgressBar progress={summarizerProgress} />
        </div>

        {allReady && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>Prompt 与摘要本地能力均已就绪。实际走本地执行时，正文不会发送到云端 Provider。</span>
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          “智能选择”只有在对应 API 状态为“可用”时才走本地；可下载或下载中不会自动触发下载，而是使用已配置的云端 fallback。
        </p>
      </CardContent>
    </Card>
  );
}
