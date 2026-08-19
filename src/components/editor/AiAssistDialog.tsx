'use client';

import * as React from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { useLocalAiStore } from '@/store/localAiStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { Copy, ExternalLink, ArrowRight, Bot, Sparkles, Zap, Loader2, Settings, Square } from 'lucide-react';
import { toast } from 'sonner';
import type { AiTaskMode } from '@/lib/aiService';
import { executeAiTask, type AiExecutionMeta } from '@/lib/ai/local';
import { openExternalLink } from '@/lib/link';

interface AiAssistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedText?: string;
}

const AI_PROVIDERS = [
  { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com', icon: '🐋' },
  { id: 'kimi', name: 'Kimi', url: 'https://kimi.moonshot.cn', icon: '🌙' },
  { id: 'doubao', name: '豆包', url: 'https://www.doubao.com/chat', icon: '🍞' },
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com', icon: '🤖' },
] as const;

const TASK_MODES: { id: AiTaskMode; label: string }[] = [
  { id: 'format', label: '排版' },
  { id: 'polish', label: '润色' },
  { id: 'summarize', label: '摘要' },
  { id: 'expand', label: '扩写' },
  { id: 'fix', label: '纠错' },
];

const LOCAL_PROMPT_TASKS = new Set<AiTaskMode>(['polish', 'summarize', 'expand', 'fix']);

function hasCloudConfig(provider: string, apiKey: string, customApiUrl?: string) {
  if (provider === 'none') return false;
  if (provider === 'ollama') return true;
  if (provider === 'custom' && !customApiUrl?.trim()) return false;
  return Boolean(apiKey.trim());
}

function executionModeLabel(mode: 'smart' | 'chrome-built-in' | 'cloud') {
  if (mode === 'smart') return '智能选择';
  if (mode === 'chrome-built-in') return 'Chrome 本地 AI';
  return '仅云端';
}

export function AiAssistDialog({ open, onOpenChange, selectedText }: AiAssistDialogProps) {
  const { markdown, setMarkdown, aiProvider, setAiProvider, aiApiConfig, setSettingsOpen } = useEditorStore();
  const executionMode = useLocalAiStore((s) => s.executionMode);
  const [resultText, setResultText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [mode, setMode] = React.useState<'api' | 'manual'>('api');
  const [taskMode, setTaskMode] = React.useState<AiTaskMode>('format');
  const [lastExecution, setLastExecution] = React.useState<AiExecutionMeta | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const effectiveContent = selectedText && selectedText.trim() ? selectedText : markdown;
  const isProcessingSelection = Boolean(selectedText && selectedText.trim());
  const cloudConfigured = hasCloudConfig(aiApiConfig.provider, aiApiConfig.apiKey, aiApiConfig.customApiUrl);
  const canUseApi = executionMode !== 'cloud' || cloudConfigured;

  React.useEffect(() => {
    if (!open) return;
    setMode(canUseApi ? 'api' : 'manual');
    setLastExecution(null);
  }, [open, canUseApi]);

  React.useEffect(() => {
    if (executionMode === 'chrome-built-in' && !LOCAL_PROMPT_TASKS.has(taskMode)) {
      setTaskMode('polish');
    }
  }, [executionMode, taskMode]);

  React.useEffect(() => () => abortControllerRef.current?.abort(), []);

  const taskModeLabel = TASK_MODES.find((item) => item.id === taskMode)?.label || '排版';
  const prompt = `请对以下内容进行「${taskModeLabel}」处理。\n\n【原文内容】：\n${effectiveContent}`;

  const handleCopyPrompt = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(prompt);
        toast.success('Prompt 已复制到剪贴板');
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = prompt;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        toast.success('Prompt 已复制到剪贴板');
      } catch (error) {
        console.error('Copy failed:', error);
        toast.error('复制失败，请手动复制');
      }
    }
  };

  const handleOpenAi = () => {
    const provider = AI_PROVIDERS.find((item) => item.id === aiProvider);
    if (provider) {
      openExternalLink(provider.url);
      toast.info(`已打开 ${provider.name}，请粘贴 Prompt`);
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
        taskMode,
        signal: controller.signal,
        onChunk: (chunk) => setResultText(chunk),
      });

      setLastExecution(result.execution);

      if (result.success && result.content) {
        setResultText(result.content);
        if (result.execution.provider === 'chrome-built-in') {
          toast.success(`Chrome 本地 AI ${taskModeLabel}完成`);
        } else if (result.execution.fallback) {
          toast.success(`已通过 ${result.execution.cloudProvider || '云端 AI'} fallback 完成${taskModeLabel}`);
        } else {
          toast.success(`AI ${taskModeLabel}完成！`);
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
      toast.error('请先生成或粘贴内容');
      return;
    }

    if (isProcessingSelection && selectedText) {
      const idx = markdown.indexOf(selectedText);
      if (idx !== -1) {
        const newMarkdown = markdown.substring(0, idx) + resultText + markdown.substring(idx + selectedText.length);
        setMarkdown(newMarkdown);
      } else {
        setMarkdown(resultText);
      }
    } else {
      setMarkdown(resultText);
    }

    onOpenChange(false);
    toast.success(`${taskModeLabel}已应用`);
    setResultText('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[80vh] sm:max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            AI 辅助
          </DialogTitle>
          <DialogDescription className="text-sm">
            {canUseApi
              ? '选择任务模式和执行方式，Textura 会按本地优先策略处理内容。'
              : '当前为仅云端模式，请先配置 AI API，或使用手动模式。'}
          </DialogDescription>
          {isProcessingSelection && (
            <div className="mt-1 inline-flex items-center gap-1.5 self-start rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              处理选中文字
            </div>
          )}
          {!isProcessingSelection && (
            <div className="mt-1 inline-flex items-center gap-1.5 self-start rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
              处理全文
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <Tabs value={mode} onValueChange={(value) => setMode(value as 'api' | 'manual')} className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-4">
              <TabsTrigger value="api" className="gap-2">
                <Zap className="w-4 h-4" />
                一键处理
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <Bot className="w-4 h-4" />
                手动模式
              </TabsTrigger>
            </TabsList>

            <TabsContent value="api" className="space-y-4 m-0">
              {canUseApi ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-primary">任务模式</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {TASK_MODES.map((item) => {
                        const disabled = executionMode === 'chrome-built-in' && !LOCAL_PROMPT_TASKS.has(item.id);
                        return (
                          <Button
                            key={item.id}
                            variant={taskMode === item.id ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 rounded-full px-3 text-xs"
                            onClick={() => setTaskMode(item.id)}
                            disabled={disabled}
                            title={disabled ? '当前 Chrome 本地 AI 暂不支持该任务' : undefined}
                          >
                            {item.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">执行方式:</span>
                      <span className="font-medium">{executionModeLabel(executionMode)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">云端 Provider:</span>
                      <span className="font-medium capitalize">{aiApiConfig.provider}</span>
                    </div>
                    {aiApiConfig.provider !== 'none' && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">云端模型:</span>
                        <span className="font-mono text-xs">{aiApiConfig.model || '-'}</span>
                      </div>
                    )}
                    {lastExecution && (
                      <div className="flex items-center justify-between border-t pt-1 mt-1">
                        <span className="text-muted-foreground">本次实际执行:</span>
                        <span className="font-medium">
                          {lastExecution.provider === 'chrome-built-in'
                            ? 'Chrome 本地 AI'
                            : `${lastExecution.cloudProvider || 'Cloud'}${lastExecution.fallback ? '（fallback）' : ''}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {executionMode === 'smart' && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
                      智能选择可能在本地任务不支持、模型未准备或运行失败时使用已配置的云端 Provider；实际执行方式会显示在上方。
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-primary">
                      待{taskModeLabel}内容预览
                    </Label>
                    <div className="bg-muted/30 rounded-lg p-3 max-h-32 overflow-y-auto">
                      <p className="text-xs text-muted-foreground line-clamp-6">
                        {effectiveContent.slice(0, 500)}{effectiveContent.length > 500 ? '...' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-2 text-primary">
                      {taskModeLabel}结果
                      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    </Label>
                    <Textarea
                      placeholder={isLoading ? 'AI 正在生成中...' : `点击「开始生成」获取${taskModeLabel}结果`}
                      value={resultText}
                      onChange={(event) => setResultText(event.target.value)}
                      className="h-40 font-mono text-xs resize-none"
                      disabled={isLoading}
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <Bot className="w-12 h-12 mx-auto opacity-50" />
                  <p className="text-sm">请先配置云端 AI API</p>
                  <p className="text-xs text-muted-foreground">或者在设置中切换为“智能选择 / Chrome 本地 AI”。</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      setSettingsOpen(true);
                    }}
                    className="gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    立即配置
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 m-0">
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <Label className="text-sm font-semibold flex items-center gap-2 text-primary">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md shrink-0">1</span>
                    复制专用提示词 (Prompt)
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {AI_PROVIDERS.map((provider) => (
                      <Button
                        key={provider.id}
                        variant={aiProvider === provider.id ? 'default' : 'outline'}
                        size="sm"
                        className="h-6 text-xs gap-1 rounded-full px-2 sm:px-2.5"
                        onClick={() => setAiProvider(provider.id)}
                      >
                        <span>{provider.icon}</span>
                        <span className="hidden sm:inline">{provider.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                  <div className="relative bg-background rounded-lg border shadow-sm">
                    <Textarea
                      value={prompt}
                      readOnly
                      className="h-20 sm:h-24 font-mono text-xs bg-transparent border-0 resize-none pr-14 sm:pr-20 focus-visible:ring-0 p-2"
                    />
                    <div className="absolute top-1 right-1 flex gap-1">
                      <Button size="sm" onClick={handleCopyPrompt} className="h-6 sm:h-7 gap-1 shadow-sm text-xs px-1.5">
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="secondary" onClick={handleOpenAi} className="h-6 sm:h-7 gap-1 shadow-sm text-xs px-1.5 bg-secondary/80 hover:bg-secondary">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2 text-primary">
                  <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md shrink-0">2</span>
                  粘贴 AI 返回的结果
                </Label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                  <Textarea
                    placeholder="在此处粘贴 AI 生成的 Markdown 内容..."
                    value={resultText}
                    onChange={(event) => setResultText(event.target.value)}
                    className="relative h-28 sm:h-32 font-mono text-xs sm:text-sm resize-none border-0 bg-background rounded-lg shadow-sm p-2 focus-visible:ring-0"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          {mode === 'api' && canUseApi && (
            isLoading ? (
              <Button onClick={handleStop} variant="destructive" className="gap-2">
                <Square className="w-3.5 h-3.5" />
                停止生成
              </Button>
            ) : (
              <Button
                onClick={handleApiCall}
                disabled={!effectiveContent.trim()}
                className="gap-2"
              >
                <Zap className="w-4 h-4" />
                开始生成
              </Button>
            )
          )}
          <Button onClick={handleApply} disabled={!resultText.trim() || isLoading} className="gap-2">
            <Bot className="w-4 h-4" />
            应用{taskModeLabel}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
