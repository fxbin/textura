'use client';

import * as React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Settings,
  Sparkles,
  Square,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  createChromeBuiltInPromptSession,
  executeAiTask,
  getChromeBuiltInCapability,
  getChromeSummarizerCapability,
  inferPrimaryTextLanguage,
  isTauriRuntime,
  prepareChromeSummarizer,
  type AiExecutionMeta,
  type ChromeBuiltInCapability,
  type ChromeSummarizerCapability,
  type LocalAiExecutionMode,
} from '@/lib/ai/local';
import type { AiTaskMode } from '@/lib/aiService';
import { openExternalLink } from '@/lib/link';
import { cn } from '@/lib/utils';
import { useLocalAiStore } from '@/store/localAiStore';
import { useEditorStore } from '@/store/useEditorStore';

interface AiAssistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedText?: string;
}

const AI_PROVIDERS = [
  { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com' },
  { id: 'kimi', name: 'Kimi', url: 'https://kimi.moonshot.cn' },
  { id: 'doubao', name: '豆包', url: 'https://www.doubao.com/chat' },
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com' },
] as const;

const TASK_MODES: { id: AiTaskMode; label: string; hint: string }[] = [
  { id: 'format', label: '排版', hint: '梳理标题层级、列表与段落结构' },
  { id: 'polish', label: '润色', hint: '提升表达质感与阅读流畅度' },
  { id: 'summarize', label: '摘要', hint: '提炼核心要点生成导读' },
  { id: 'expand', label: '扩写', hint: '丰富论据与细节描述' },
  { id: 'fix', label: '纠错', hint: '修正错别字、标点与语病' },
];

const LOCAL_PROMPT_TASKS = new Set<AiTaskMode>(['polish', 'summarize', 'expand', 'fix']);

const LOCAL_CAPABILITY_REQUEST = {
  inputLanguage: 'en',
  outputLanguage: 'en',
  systemPromptLanguage: 'en',
} as const;

const EXECUTION_MODE_OPTIONS: { id: LocalAiExecutionMode; label: string }[] = [
  { id: 'smart', label: '智能选择' },
  { id: 'chrome-built-in', label: 'Chrome 本地 AI' },
  { id: 'cloud', label: '仅云端' },
];

function hasCloudConfig(provider: string, apiKey: string, customApiUrl?: string) {
  if (provider === 'none') return false;
  if (provider === 'ollama') return true;
  if (provider === 'custom' && !customApiUrl?.trim()) return false;
  return Boolean(apiKey.trim());
}

async function writeClipboardText(text: string): Promise<boolean> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  return ok;
}

export function AiAssistDialog({ open, onOpenChange, selectedText }: AiAssistDialogProps) {
  const markdown = useEditorStore((s) => s.markdown);
  const setMarkdown = useEditorStore((s) => s.setMarkdown);
  const aiProvider = useEditorStore((s) => s.aiProvider);
  const setAiProvider = useEditorStore((s) => s.setAiProvider);
  const aiApiConfig = useEditorStore((s) => s.aiApiConfig);
  const setSettingsOpen = useEditorStore((s) => s.setSettingsOpen);
  const executionMode = useLocalAiStore((s) => s.executionMode);
  const setExecutionMode = useLocalAiStore((s) => s.setExecutionMode);
  const setSettingsTab = useLocalAiStore((s) => s.setSettingsTab);

  const cloudConfigured = hasCloudConfig(
    aiApiConfig.provider,
    aiApiConfig.apiKey,
    aiApiConfig.customApiUrl
  );
  const canUseApi = executionMode !== 'cloud' || cloudConfigured;

  const [resultText, setResultText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [modeOverride, setModeOverride] = React.useState<'api' | 'manual' | null>(null);
  const [taskMode, setTaskMode] = React.useState<AiTaskMode>('format');
  const [lastExecution, setLastExecution] = React.useState<AiExecutionMeta | null>(null);
  const [copiedPrompt, setCopiedPrompt] = React.useState(false);
  const [localCapabilities, setLocalCapabilities] = React.useState<{
    prompt: ChromeBuiltInCapability;
    summarizer: ChromeSummarizerCapability;
  } | null>(null);
  const [preparingLocal, setPreparingLocal] = React.useState(false);
  const [localPrepProgress, setLocalPrepProgress] = React.useState<number | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const fetchLocalCapabilities = React.useCallback(async () => {
    const [prompt, summarizer] = await Promise.all([
      getChromeBuiltInCapability(LOCAL_CAPABILITY_REQUEST),
      getChromeSummarizerCapability('en'),
    ]);
    return { prompt, summarizer };
  }, []);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchLocalCapabilities().then((caps) => {
      if (!cancelled) {
        setLocalCapabilities(caps);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, fetchLocalCapabilities]);

  React.useEffect(() => () => abortControllerRef.current?.abort(), []);

  const mode: 'api' | 'manual' = modeOverride ?? (canUseApi ? 'api' : 'manual');
  const effectiveTaskMode: AiTaskMode =
    mode === 'api' && executionMode === 'chrome-built-in' && !LOCAL_PROMPT_TASKS.has(taskMode)
      ? 'polish'
      : taskMode;

  const effectiveContent = selectedText && selectedText.trim() ? selectedText : markdown;
  const isProcessingSelection = Boolean(selectedText && selectedText.trim());
  const currentTask = TASK_MODES.find((m) => m.id === effectiveTaskMode) ?? TASK_MODES[0];

  const detectedLanguage = inferPrimaryTextLanguage(effectiveContent);
  const activeLocalCap =
    effectiveTaskMode === 'summarize'
      ? localCapabilities?.summarizer
      : localCapabilities?.prompt;
  const activeTaskFlag =
    effectiveTaskMode === 'summarize'
      ? 'chrome://flags/#summarization-api-for-gemini-nano'
      : 'chrome://flags/#prompt-api-for-gemini-nano';
  const showDesktopChromeFlags =
    activeLocalCap?.reason === 'api-missing' && !isTauriRuntime();

  const localBlocker = React.useMemo(() => {
    if (executionMode !== 'chrome-built-in') return null;
    if (activeLocalCap && (activeLocalCap.reason === 'api-missing' || activeLocalCap.reason === 'insecure-context')) {
      const langNote =
        effectiveContent.trim() && detectedLanguage !== 'en'
          ? '（另注：Chrome 本地 AI 目前也仅支持英文内容）'
          : '';
      return {
        kind: 'api' as const,
        title:
          activeLocalCap.reason === 'insecure-context'
            ? '当前页面处于非安全上下文'
            : '当前环境未开启 Chrome 本地 AI 接口',
        description: `${activeLocalCap.reasonMessage ?? ''}${langNote}`,
      };
    }

    if (effectiveContent.trim() && detectedLanguage !== 'en') {
      return {
        kind: 'language' as const,
        title:
          detectedLanguage === 'zh'
            ? '当前文稿为中文，Chrome 本地 AI 暂不支持中文'
            : '当前文稿非英文，Chrome 本地 AI 暂不支持',
        description:
          'Chrome 内置 Gemini Nano 目前仅开放英文内容的润色、纠错、扩写与摘要；纯本地模式不会静默上传您的文稿。',
      };
    }

    if (
      activeLocalCap &&
      (activeLocalCap.availability === 'downloadable' ||
        activeLocalCap.availability === 'downloading')
    ) {
      return {
        kind: 'download' as const,
        title:
          activeLocalCap.availability === 'downloading'
            ? 'Chrome 本地模型正在下载'
            : 'Chrome 本地模型尚未准备完成',
        description:
          '英文文稿支持纯本地执行；首次使用需要先下载浏览器端模型，可直接在下方点击准备。',
      };
    }

    if (activeLocalCap && activeLocalCap.availability === 'unavailable') {
      return {
        kind: 'unavailable' as const,
        title: '当前浏览器或设备暂不可用 Chrome 本地 AI',
        description:
          activeLocalCap.reasonMessage ||
          '浏览器返回 unavailable，请对照 chrome://on-device-internals 检查本地模型与硬件状态。',
      };
    }

    return null;
  }, [executionMode, activeLocalCap, effectiveContent, detectedLanguage]);

  const prompt = `请对以下 Markdown 内容进行「${currentTask.label}」处理（${currentTask.hint}），并直接返回处理后的 Markdown 文本，无需额外解释：

${effectiveContent}`;

  const copyPromptToClipboard = async () => {
    try {
      const copied = await writeClipboardText(prompt);
      if (!copied) {
        toast.error('复制失败，请手动全选复制');
        return false;
      }
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 1800);
      return true;
    } catch (error) {
      console.error('Copy prompt failed:', error);
      toast.error('复制失败，请手动全选复制');
      return false;
    }
  };

  const handleCopyHelperText = async (text: string, successMsg: string) => {
    try {
      const copied = await writeClipboardText(text);
      if (copied) {
        toast.success(successMsg);
      } else {
        toast.error('复制失败，请检查剪贴板权限');
      }
    } catch {
      toast.error('复制失败，请检查剪贴板权限');
    }
  };

  const handlePrepareLocalModel = async () => {
    setPreparingLocal(true);
    setLocalPrepProgress(0);
    try {
      if (effectiveTaskMode === 'summarize') {
        await prepareChromeSummarizer('en', (p) => setLocalPrepProgress(p));
        toast.success('Chrome 摘要模型已准备完成');
      } else {
        const session = await createChromeBuiltInPromptSession({
          ...LOCAL_CAPABILITY_REQUEST,
          onDownloadProgress: (p) => setLocalPrepProgress(p),
        });
        session.destroy?.();
        toast.success('Chrome Prompt 本地模型已准备完成');
      }
      const nextCaps = await fetchLocalCapabilities();
      setLocalCapabilities(nextCaps);
    } catch (error) {
      console.error('[AI Assist] local prepare failed:', error);
      toast.error(error instanceof Error ? error.message : 'Chrome 本地模型准备失败');
    } finally {
      setPreparingLocal(false);
      setLocalPrepProgress(null);
    }
  };

  const openAiSettings = () => {
    setSettingsTab('ai');
    handleDialogOpenChange(false);
    setSettingsOpen(true);
  };

  const handleCopyPrompt = async () => {
    if (await copyPromptToClipboard()) {
      toast.success(`已复制「${currentTask.label}」提示词`);
    }
  };

  const handleCopyAndOpenAi = async () => {
    await copyPromptToClipboard();
    const provider = AI_PROVIDERS.find((p) => p.id === aiProvider);
    if (provider) {
      openExternalLink(provider.url);
      toast.info(`已复制提示词并打开 ${provider.name}`);
    }
  };

  const handleApiCall = async () => {
    if (!effectiveContent.trim()) {
      toast.error(isProcessingSelection ? '请先选中一些文字' : '请先输入一些内容');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);
    setResultText('');
    setLastExecution(null);

    try {
      const result = await executeAiTask({
        config: aiApiConfig,
        executionMode,
        content: effectiveContent,
        taskMode: effectiveTaskMode,
        signal: controller.signal,
        onChunk: (chunk) => setResultText(chunk),
      });

      setLastExecution(result.execution);

      if (result.success && result.content) {
        setResultText(result.content);
        if (result.execution.provider === 'chrome-built-in') {
          toast.success(`Chrome 本地 AI ${currentTask.label}完成`);
        } else if (result.execution.fallback) {
          toast.success(
            `已通过 ${result.execution.cloudProvider || '云端 AI'} fallback 完成${currentTask.label}`
          );
        } else {
          toast.success(`AI ${currentTask.label}完成`);
        }
      } else if (result.execution.reason === 'local-aborted') {
        toast.info('已停止本地 AI 生成');
      } else {
        toast.error(result.error || '调用失败');
      }
    } catch (error) {
      console.error('[AI Assist] execution failed:', error);
      toast.error('调用失败，请检查 AI 配置');
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  const handleApply = () => {
    if (!resultText.trim()) {
      toast.error('请先生成或粘贴处理结果');
      return;
    }

    if (isProcessingSelection && selectedText) {
      const idx = markdown.indexOf(selectedText);
      if (idx !== -1) {
        const newMarkdown =
          markdown.substring(0, idx) + resultText + markdown.substring(idx + selectedText.length);
        setMarkdown(newMarkdown);
      } else {
        setMarkdown(resultText);
      }
    } else {
      setMarkdown(resultText);
    }

    onOpenChange(false);
    toast.success(`已应用「${currentTask.label}」结果`);
    setResultText('');
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      abortControllerRef.current?.abort();
      setModeOverride(null);
      setLastExecution(null);
      setCopiedPrompt(false);
      setLocalPrepProgress(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[95vw] max-w-[95vw] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              AI 写作与排版助手
            </DialogTitle>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                isProcessingSelection
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  isProcessingSelection ? 'bg-primary' : 'bg-muted-foreground/60'
                )}
              />
              {isProcessingSelection
                ? `仅处理选中段落 (${effectiveContent.length} 字)`
                : '处理整篇文稿'}
            </span>
          </div>
          <DialogDescription className="text-xs">
            {canUseApi
              ? '按本地优先策略流式处理内容，也可随时切换手动模式复制提示词。'
              : '当前为仅云端模式，请先配置 AI API，或使用手动模式。'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {/* Shared Task Mode Picker */}
          <div className="space-y-2 rounded-xl border border-border/75 bg-muted/35 p-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-semibold text-foreground">处理任务</Label>
              <span className="text-[11px] text-muted-foreground">{currentTask.hint}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TASK_MODES.map((tm) => {
                const disabledInLocal =
                  mode === 'api' &&
                  executionMode === 'chrome-built-in' &&
                  !LOCAL_PROMPT_TASKS.has(tm.id);
                const isSelected = effectiveTaskMode === tm.id;
                return (
                  <button
                    key={tm.id}
                    type="button"
                    disabled={disabledInLocal}
                    title={disabledInLocal ? '当前 Chrome 本地 AI 暂不支持该任务' : undefined}
                    onClick={() => setTaskMode(tm.id)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-45',
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'border border-border/70 bg-background text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {tm.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Tabs
            value={mode}
            onValueChange={(v) => setModeOverride(v as 'api' | 'manual')}
            className="w-full"
          >
            <TabsList className="mb-3 grid w-full grid-cols-2">
              <TabsTrigger value="api" className="gap-1.5 text-xs">
                <Zap className="h-3.5 w-3.5" />
                一键处理
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-1.5 text-xs">
                <Bot className="h-3.5 w-3.5" />
                手动提示词协作
              </TabsTrigger>
            </TabsList>

            {/* API / Local-first Mode */}
            <TabsContent value="api" className="m-0 space-y-3.5">
              <div className="space-y-2 rounded-xl border border-border/75 bg-card px-3.5 py-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-muted-foreground">执行方式</span>
                    {EXECUTION_MODE_OPTIONS.map((option) => {
                      const active = executionMode === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          disabled={isLoading || preparingLocal}
                          onClick={() => {
                            setExecutionMode(option.id);
                            setLastExecution(null);
                          }}
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-50',
                            active
                              ? 'bg-primary text-primary-foreground shadow-2xs'
                              : 'border border-border/70 bg-background text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={openAiSettings}
                  >
                    <Settings className="h-3 w-3" />
                    配置
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-1.5">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10.5px] font-medium',
                      executionMode === 'chrome-built-in'
                        ? !localCapabilities
                          ? 'bg-muted text-muted-foreground'
                          : localBlocker
                            ? 'bg-amber-500/12 text-amber-800 dark:text-amber-300'
                            : 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                        : executionMode === 'smart'
                          ? 'bg-amber-500/12 text-amber-700 dark:text-amber-300'
                          : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {executionMode === 'chrome-built-in'
                      ? !localCapabilities
                        ? '正在检测本地支持 · 正文不上传云端'
                        : localBlocker
                          ? '纯本地受限 · 正文不上传云端'
                          : '本地就绪 · 正文不上传云端'
                      : executionMode === 'smart'
                        ? '本地优先 · 回退云端时显式标注'
                        : '云端执行 · 发送至所选服务商'}
                  </span>
                  {executionMode !== 'chrome-built-in' && aiApiConfig.provider !== 'none' && (
                    <>
                      <span className="text-muted-foreground">· 云端</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 font-medium capitalize text-foreground">
                        {aiApiConfig.provider}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {aiApiConfig.model || aiApiConfig.customModelName || '-'}
                      </span>
                    </>
                  )}
                </div>

                {lastExecution && (
                  <div className="flex items-center justify-between border-t border-border/60 pt-1.5">
                    <span className="text-muted-foreground">本次实际执行</span>
                    <span
                      className={cn(
                        'font-medium',
                        lastExecution.provider === 'chrome-built-in'
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-foreground'
                      )}
                    >
                      {lastExecution.provider === 'chrome-built-in'
                        ? '本地设备已执行（正文未离开本机）'
                        : `云端已执行：${lastExecution.cloudProvider || 'Cloud'}${lastExecution.fallback ? '（fallback 回退）' : ''}`}
                    </span>
                  </div>
                )}
              </div>

              {canUseApi ? (
                <>
                  {executionMode === 'chrome-built-in' && localBlocker && (
                    <div className="space-y-2.5 rounded-xl border border-amber-500/35 bg-amber-50/80 p-3 text-xs text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <div className="min-w-0 space-y-1">
                          <p className="font-semibold">{localBlocker.title}</p>
                          <p className="text-[11.5px] leading-relaxed opacity-90">
                            {localBlocker.description}
                          </p>
                        </div>
                      </div>

                      {localPrepProgress !== null && (
                        <div className="space-y-1">
                          <div className="h-1.5 overflow-hidden rounded-full bg-amber-950/15 dark:bg-amber-200/15">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${Math.round(localPrepProgress * 100)}%` }}
                            />
                          </div>
                          <p className="text-right font-mono text-[10.5px] opacity-80">
                            {Math.round(localPrepProgress * 100)}%
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-1.5 pl-6">
                        {localBlocker.kind === 'download' && (
                          <Button
                            type="button"
                            size="xs"
                            disabled={preparingLocal}
                            onClick={() => void handlePrepareLocalModel()}
                          >
                            <Download className="h-3 w-3" />
                            {preparingLocal ? '模型准备中…' : '立即准备本地模型'}
                          </Button>
                        )}
                        {showDesktopChromeFlags && (
                          <>
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() =>
                                void handleCopyHelperText(
                                  activeTaskFlag,
                                  `已复制 ${activeTaskFlag}`
                                )
                              }
                            >
                              <Copy className="h-3 w-3" />
                              复制任务 Flag
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() =>
                                void handleCopyHelperText(
                                  'chrome://flags/#optimization-guide-on-device-model',
                                  '已复制端侧模型 Flag 地址'
                                )
                              }
                            >
                              <Copy className="h-3 w-3" />
                              复制端侧模型 Flag
                            </Button>
                          </>
                        )}
                        {localBlocker.kind === 'unavailable' && (
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            onClick={() =>
                              void handleCopyHelperText(
                                'chrome://on-device-internals',
                                '已复制 chrome://on-device-internals'
                              )
                            }
                          >
                            <Copy className="h-3 w-3" />
                            复制 chrome://on-device-internals
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="xs"
                          variant={localBlocker.kind === 'language' ? 'default' : 'outline'}
                          onClick={() => setExecutionMode('smart')}
                        >
                          切换为「智能选择」
                        </Button>
                        {!cloudConfigured && (
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            onClick={openAiSettings}
                          >
                            <Settings className="h-3 w-3" />
                            配置云端 AI
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          onClick={() => setModeOverride('manual')}
                        >
                          使用手动提示词
                        </Button>
                      </div>
                    </div>
                  )}

                  {executionMode === 'smart' && (
                    <div className="rounded-xl border border-amber-500/25 bg-amber-50/75 px-3 py-2 text-[11.5px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                      智能选择会在本地任务不支持、非英文文稿或模型未准备时自动使用已配置的云端 Provider；上方会显示本次实际执行路径。
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      待{currentTask.label}原文摘要
                    </Label>
                    <div className="max-h-24 overflow-y-auto rounded-xl border border-border/70 bg-muted/30 p-3">
                      <p className="whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed text-muted-foreground">
                        {effectiveContent.slice(0, 360)}
                        {effectiveContent.length > 360 ? '…' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2 text-xs font-medium text-foreground">
                      <span>{currentTask.label}结果</span>
                      {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                    </Label>
                    <Textarea
                      placeholder={
                        isLoading
                          ? '正在流式生成中…'
                          : `点击下方「开始${currentTask.label}」获取结果，支持生成后微调再应用`
                      }
                      value={resultText}
                      onChange={(e) => setResultText(e.target.value)}
                      className="h-44 resize-none bg-background font-mono text-xs leading-relaxed"
                      disabled={isLoading}
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-8 text-center">
                  <Bot className="mb-2.5 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-foreground">请先配置云端 AI API</p>
                  <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                    或者直接在上方切换为「智能选择 / Chrome 本地 AI」；也可使用右侧「手动提示词协作」零配置协作。
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setModeOverride('manual')}
                    >
                      使用手动模式
                    </Button>
                    <Button type="button" size="sm" onClick={openAiSettings}>
                      <Settings className="h-3.5 w-3.5" />
                      立即配置
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Manual Mode */}
            <TabsContent value="manual" className="m-0 space-y-4">
              <div className="space-y-2.5 rounded-xl border border-border/75 bg-card p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                      1
                    </span>
                    选择常用 AI 并复制「{currentTask.label}」提示词
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {AI_PROVIDERS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setAiProvider(p.id)}
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                          aiProvider === p.id
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border/70 bg-background text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <Textarea
                  value={prompt}
                  readOnly
                  className="h-24 resize-none bg-muted/40 font-mono text-[11.5px] leading-relaxed"
                />

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button type="button" variant="outline" size="xs" onClick={handleCopyPrompt}>
                    {copiedPrompt ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    {copiedPrompt ? '已复制' : '仅复制提示词'}
                  </Button>
                  <Button type="button" size="xs" onClick={handleCopyAndOpenAi}>
                    <ExternalLink className="h-3 w-3" />
                    复制并打开 {AI_PROVIDERS.find((p) => p.id === aiProvider)?.name}
                  </Button>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-border/75 bg-card p-3.5">
                <Label className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                    2
                  </span>
                  粘贴 AI 返回的 Markdown 结果
                </Label>
                <Textarea
                  placeholder="在此粘贴 AI 生成的正文内容..."
                  value={resultText}
                  onChange={(e) => setResultText(e.target.value)}
                  className="h-32 resize-none bg-background font-mono text-xs leading-relaxed"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="shrink-0 border-t border-border/70 pt-3">
          <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)}>
            取消
          </Button>
          {mode === 'api' &&
            canUseApi &&
            (isLoading ? (
              <Button type="button" variant="destructive" onClick={handleStop}>
                <Square className="h-3.5 w-3.5" />
                停止生成
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={handleApiCall}
                disabled={!effectiveContent.trim()}
              >
                <Zap className="h-3.5 w-3.5" />
                开始{currentTask.label}
              </Button>
            ))}
          <Button type="button" onClick={handleApply} disabled={!resultText.trim() || isLoading}>
            应用{currentTask.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
