'use client';

import * as React from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, ExternalLink, ArrowRight, Bot, Sparkles, Zap, Loader2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { callAiFormatting } from '@/lib/aiService';

interface AiAssistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AI_PROVIDERS = [
  { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com', icon: '🐋' },
  { id: 'kimi', name: 'Kimi', url: 'https://kimi.moonshot.cn', icon: '🌙' },
  { id: 'doubao', name: '豆包', url: 'https://www.doubao.com/chat', icon: '🍞' },
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com', icon: '🤖' },
] as const;

export function AiAssistDialog({ open, onOpenChange }: AiAssistDialogProps) {
  const { markdown, setMarkdown, aiProvider, setAiProvider, aiApiConfig, setSettingsOpen } = useEditorStore();
  const [resultText, setResultText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [mode, setMode] = React.useState<'api' | 'manual'>('api');
  
  // 当对话框打开时，检查API是否配置
  React.useEffect(() => {
    if (open) {
      if (aiApiConfig.provider === 'none' || !aiApiConfig.apiKey) {
        setMode('manual');
      } else {
        setMode('api');
      }
    }
  }, [open, aiApiConfig]);

  const prompt = `请将以下内容重新排版为适合微信公众号阅读的 Markdown 格式。

【排版结构要求】：
1. 一级标题：必须以 "## " 开头，并使用中文数字编号（如 "## 一、核心观点"）。
2. 二级标题：必须以 "### " 开头，并使用括号编号（如 "### （一）详细说明"）。
3. 三级标题：必须以 "#### " 开头，并使用数字编号（如 "#### 1. 具体步骤"）。
4. 列表：使用 "- " 开头。
5. 重点：保留原文核心意图，优化段落间距，适当添加 Emoji 增加趣味性（可选）。
6. 禁忌：不要输出任何"好的"、"如下"等客套话，直接输出 Markdown 代码。

【原文内容】：
${markdown}`;

  const handleCopyPrompt = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(prompt);
        toast.success('Prompt 已复制到剪贴板');
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch (err) {
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
      } catch (e) {
        console.error('Copy failed:', e);
        toast.error('复制失败，请手动复制');
      }
    }
  };

  const handleOpenAi = () => {
    const provider = AI_PROVIDERS.find(p => p.id === aiProvider);
    if (provider) {
      window.open(provider.url, '_blank');
      toast.info(`已打开 ${provider.name}，请粘贴 Prompt`);
    }
  };

  // API模式调用AI
  const handleApiCall = async () => {
    if (!markdown.trim()) {
      toast.error('请先输入一些内容');
      return;
    }

    setIsLoading(true);
    setResultText('');

    try {
      const result = await callAiFormatting(aiApiConfig, markdown, (chunk) => {
        setResultText(chunk);
      });

      if (result.success && result.content) {
        setResultText(result.content);
        toast.success('AI 排版完成！');
      } else {
        toast.error(result.error || '调用失败');
      }
    } catch (error) {
      toast.error('调用失败，请检查 API 配置');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!resultText.trim()) {
      toast.error('请先生成或粘贴内容');
      return;
    }
    setMarkdown(resultText);
    onOpenChange(false);
    toast.success('排版已应用');
    setResultText('');
  };

  const hasApiConfig = aiApiConfig.provider !== 'none' && (
    aiApiConfig.provider === 'ollama' || aiApiConfig.apiKey.trim() !== ''
  );
  
  // 检查是否可以进行API调用
  const canUseApi = aiApiConfig.provider !== 'none' && (aiApiConfig.provider === 'ollama' || aiApiConfig.apiKey.trim() !== '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[80vh] sm:max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            AI 辅助排版
          </DialogTitle>
          <DialogDescription className="text-sm">
            {hasApiConfig 
              ? '选择「API模式」一键完成排版，或选择「手动模式」复制到其他AI工具处理。'
              : '请在设置中配置 AI API 以使用一键排版功能，或使用手动模式。'}
          </DialogDescription>
        </DialogHeader>
  
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Mode Tabs */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'api' | 'manual')} className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-4">
              <TabsTrigger value="api" className="gap-2">
                <Zap className="w-4 h-4" />
                API 一键排版
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <Bot className="w-4 h-4" />
                手动模式
              </TabsTrigger>
            </TabsList>

            {/* API Mode */}
            <TabsContent value="api" className="space-y-4 m-0">
              {canUseApi ? (
                <>
                  {/* Current Config Info */}
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">当前配置:</span>
                      <span className="font-medium capitalize">{aiApiConfig.provider}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-muted-foreground">模型:</span>
                      <span className="font-mono text-xs">{aiApiConfig.model}</span>
                    </div>
                  </div>

                  {/* Preview of content */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-primary">
                      待排版内容预览
                    </Label>
                    <div className="bg-muted/30 rounded-lg p-3 max-h-32 overflow-y-auto">
                      <p className="text-xs text-muted-foreground line-clamp-6">
                        {markdown.slice(0, 500)}{markdown.length > 500 ? '...' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Result */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-2 text-primary">
                      排版结果
                      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    </Label>
                    <Textarea 
                      placeholder={isLoading ? "AI 正在生成中..." : "点击「开始生成」获取排版结果"}
                      value={resultText}
                      onChange={(e) => setResultText(e.target.value)}
                      className="h-40 font-mono text-xs resize-none"
                      disabled={isLoading}
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <Bot className="w-12 h-12 mx-auto opacity-50" />
                  <p className="text-sm">请先配置 AI API</p>
                  <p className="text-xs text-muted-foreground">支持 DeepSeek、豆包、通义千问、智谱等国产模型</p>
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

            {/* Manual Mode */}
            <TabsContent value="manual" className="space-y-4 m-0">
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <Label className="text-sm font-semibold flex items-center gap-2 text-primary">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md shrink-0">1</span>
                    复制专用提示词 (Prompt)
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {AI_PROVIDERS.map((p) => (
                      <Button
                        key={p.id}
                        variant={aiProvider === p.id ? 'default' : 'outline'}
                        size="sm"
                        className="h-6 text-xs gap-1 rounded-full px-2 sm:px-2.5"
                        onClick={() => setAiProvider(p.id)}
                      >
                        <span>{p.icon}</span>
                        <span className="hidden sm:inline">{p.name}</span>
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
                    onChange={(e) => setResultText(e.target.value)}
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
            <Button 
              onClick={handleApiCall} 
              disabled={isLoading || !markdown.trim()}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  开始生成
                </>
              )}
            </Button>
          )}
          <Button onClick={handleApply} disabled={!resultText.trim()} className="gap-2">
            <Bot className="w-4 h-4" />
            应用排版
            <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
