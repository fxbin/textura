'use client';

import * as React from 'react';
import { Cpu, Download, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  createChromeBuiltInPromptSession,
  getChromeBuiltInCapability,
  type ChromeBuiltInCapability,
} from '@/lib/ai/local';

const LOCAL_CAPABILITY_REQUEST = {
  inputLanguage: 'en',
  outputLanguage: 'en',
  systemPromptLanguage: 'en',
} as const;

function getStatusText(capability: ChromeBuiltInCapability | null, checking: boolean) {
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

export function LocalAiSettingsCard() {
  const [capability, setCapability] = React.useState<ChromeBuiltInCapability | null>(null);
  const [checking, setChecking] = React.useState(true);
  const [preparing, setPreparing] = React.useState(false);
  const [downloadProgress, setDownloadProgress] = React.useState<number | null>(null);

  const refreshCapability = React.useCallback(async () => {
    setChecking(true);
    try {
      const next = await getChromeBuiltInCapability(LOCAL_CAPABILITY_REQUEST);
      setCapability(next);
    } finally {
      setChecking(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshCapability();
  }, [refreshCapability]);

  const handlePrepare = async () => {
    setPreparing(true);
    setDownloadProgress(0);
    try {
      const session = await createChromeBuiltInPromptSession({
        ...LOCAL_CAPABILITY_REQUEST,
        onDownloadProgress: (progress) => setDownloadProgress(progress),
      });
      session.destroy?.();
      await refreshCapability();
      toast.success('Chrome 本地 AI 已准备完成');
    } catch (error) {
      console.error('[Local AI] prepare failed:', error);
      toast.error(error instanceof Error ? error.message : '本地 AI 准备失败');
    } finally {
      setPreparing(false);
    }
  };

  const progressPercent = downloadProgress === null ? null : Math.round(downloadProgress * 100);
  const canPrepare = capability?.availability === 'downloadable' || capability?.availability === 'downloading';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Cpu className="h-4 w-4 text-primary" />
          Chrome 本地 AI
        </CardTitle>
        <CardDescription>
          使用浏览器内置模型执行适合的任务。当前第一阶段只对英文润色、纠错和扩写启用本地 Prompt API。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">设备状态</p>
            <p className="text-xs text-muted-foreground">{getStatusText(capability, checking)}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => void refreshCapability()} disabled={checking || preparing}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
            重新检测
          </Button>
        </div>

        {canPrepare && (
          <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">本地模型尚未就绪</p>
                <p className="text-xs text-muted-foreground">下载只会在你点击按钮后触发。</p>
              </div>
              <Button size="sm" onClick={() => void handlePrepare()} disabled={preparing}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {preparing ? '准备中' : '准备本地 AI'}
              </Button>
            </div>

            {progressPercent !== null && (
              <div className="space-y-1">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
                <p className="text-right text-[11px] text-muted-foreground">{progressPercent}%</p>
              </div>
            )}
          </div>
        )}

        {capability?.availability === 'available' && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>本地模型已就绪。实际走本地执行时，正文不会发送到云端 Provider。</span>
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          中文目前不进入本地 Prompt API；“智能选择”会在本地模型已就绪且任务/语言满足条件时使用本地，否则走已配置的云端 Provider。
        </p>
      </CardContent>
    </Card>
  );
}
