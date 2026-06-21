'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Bot, CheckCircle, Key, Moon, MonitorSmartphone, Settings, Sun, Type } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { getDefaultModel, getProviderModels } from '@/lib/aiService';
import { useEditorStore, AiApiProvider } from '@/store/useEditorStore';
import { useHistoryStore } from '@/store/historyStore';

function getDeviceLabel(deviceModel: string) {
  switch (deviceModel) {
    case 'iphone-15-pro-max':
      return 'iPhone 15 Pro Max';
    case 'android-flagship':
      return 'Android 水滴屏';
    case 'custom':
      return '自定义尺寸';
    default:
      return 'PC / Web';
  }
}

export function SettingsDialog() {
  const fontSize = useEditorStore((s) => s.fontSize);
  const setFontSize = useEditorStore((s) => s.setFontSize);
  const aiApiConfig = useEditorStore((s) => s.aiApiConfig);
  const setAiApiConfig = useEditorStore((s) => s.setAiApiConfig);
  const isSettingsOpen = useEditorStore((s) => s.isSettingsOpen);
  const setSettingsOpen = useEditorStore((s) => s.setSettingsOpen);
  const deviceModel = useEditorStore((s) => s.deviceModel);
  const customWidth = useEditorStore((s) => s.customWidth);
  const customHeight = useEditorStore((s) => s.customHeight);
  const isScrollSyncEnabled = useEditorStore((s) => s.isScrollSyncEnabled);
  const toggleScrollSync = useEditorStore((s) => s.toggleScrollSync);
  const isStatsVisible = useEditorStore((s) => s.isStatsVisible);
  const toggleStats = useEditorStore((s) => s.toggleStats);
  const isHetiEnabled = useEditorStore((s) => s.isHetiEnabled);
  const toggleHeti = useEditorStore((s) => s.toggleHeti);
  const imageBasePath = useEditorStore((s) => s.imageBasePath);
  const setImageBasePath = useEditorStore((s) => s.setImageBasePath);
  const theme = useEditorStore((s) => s.theme);
  const savedThemes = useEditorStore((s) => s.savedThemes);
  const { snapshots } = useHistoryStore();
  const { theme: appTheme, setTheme } = useTheme();
  const [showApiKey, setShowApiKey] = useState(false);

  const handleProviderChange = (provider: AiApiProvider) => {
    setAiApiConfig({
      provider,
      model: getDefaultModel(provider),
    });
  };

  const handleSaveApiKey = () => {
    if (aiApiConfig.provider !== 'none' && aiApiConfig.provider !== 'ollama' && !aiApiConfig.apiKey.trim()) {
      toast.error('请输入 API Key');
      return;
    }

    toast.success('AI 配置已保存到本地。');
  };

  return (
    <Dialog open={isSettingsOpen} onOpenChange={setSettingsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="mr-2 h-4 w-4" />
          偏好设置
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>偏好设置</DialogTitle>
          <DialogDescription>
            这里管理全局偏好与 AI 配置。主题编辑、设备切换和历史快照仍在各自面板里完成。
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="gap-4">
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="general">通用</TabsTrigger>
            <TabsTrigger value="ai">AI 配置</TabsTrigger>
            <TabsTrigger value="workspace">工作区边界</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Type className="h-4 w-4 text-muted-foreground" />
                  编辑与阅读
                </CardTitle>
                <CardDescription>这些设置会持久化到本地，用于下次打开时恢复工作习惯。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="font-size">默认字号</Label>
                    <span className="text-sm font-mono text-muted-foreground">{fontSize}px</span>
                  </div>
                  <Slider
                    id="font-size"
                    min={12}
                    max={24}
                    step={1}
                    value={[fontSize]}
                    onValueChange={(value) => setFontSize(value[0])}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-2">
                      {appTheme === 'dark' ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
                      界面外观
                    </Label>
                    <p className="text-xs text-muted-foreground">只影响应用界面，不影响导出结果和微信复制内容。</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={appTheme !== 'dark' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme('light')}
                    >
                      明亮
                    </Button>
                    <Button
                      variant={appTheme === 'dark' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme('dark')}
                    >
                      暗色
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-1">
                      <Label>滚动联动</Label>
                      <p className="text-xs text-muted-foreground">编辑区与预览区同步滚动。</p>
                    </div>
                    <Switch checked={isScrollSyncEnabled} onCheckedChange={toggleScrollSync} />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-1">
                      <Label>字数统计</Label>
                      <p className="text-xs text-muted-foreground">预览中显示字数和阅读时间。</p>
                    </div>
                    <Switch checked={isStatsVisible} onCheckedChange={toggleStats} />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-1">
                      <Label>Heti 排版优化</Label>
                      <p className="text-xs text-muted-foreground">启用中西文混排间距优化（仅预设主题）。</p>
                    </div>
                    <Switch checked={isHetiEnabled} onCheckedChange={toggleHeti} />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="image-base-path">图片基础路径</Label>
                  <Input
                    id="image-base-path"
                    value={imageBasePath}
                    onChange={(e) => setImageBasePath(e.target.value)}
                    placeholder="例如: https://cdn.example.com/images 或 /Users/name/project/"
                  />
                  <p className="text-xs text-muted-foreground">
                    Markdown 中的相对图片路径（如 <code className="rounded bg-muted px-1">./images/photo.png</code>）会拼接此路径进行解析。从 VS Code 等编辑器粘贴内容时，设置此路径即可正常预览本地图片。
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bot className="h-4 w-4 text-primary" />
                  AI 模型与凭证
                </CardTitle>
                <CardDescription>AI 配置仅保存在当前设备本地。主题、历史快照和导出结果不依赖这里的配置。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">提供方</Label>
                  <Select value={aiApiConfig.provider} onValueChange={(value) => handleProviderChange(value as AiApiProvider)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deepseek">DeepSeek</SelectItem>
                      <SelectItem value="doubao">豆包</SelectItem>
                      <SelectItem value="qwen">通义千问</SelectItem>
                      <SelectItem value="zhipu">智谱 GLM</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="ollama">Ollama</SelectItem>
                      <SelectItem value="custom">自定义 API</SelectItem>
                      <SelectItem value="none">不使用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {aiApiConfig.provider !== 'none' && aiApiConfig.provider !== 'custom' && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">模型</Label>
                    <Select value={aiApiConfig.model} onValueChange={(value) => setAiApiConfig({ model: value })}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getProviderModels(aiApiConfig.provider).map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {aiApiConfig.provider === 'custom' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">API 地址</Label>
                      <Input
                        value={aiApiConfig.customApiUrl || ''}
                        onChange={(e) => setAiApiConfig({ customApiUrl: e.target.value })}
                        placeholder="https://api.example.com/v1/chat/completions"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">模型名</Label>
                      <Input
                        value={aiApiConfig.customModelName || ''}
                        onChange={(e) => setAiApiConfig({ customModelName: e.target.value })}
                        placeholder="例如 gpt-4o / claude-sonnet-4 / deepseek-chat"
                        className="h-9"
                      />
                    </div>
                  </>
                )}

                {aiApiConfig.provider !== 'none' && aiApiConfig.provider !== 'ollama' && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Key className="h-3 w-3" />
                      API Key
                    </Label>
                    <div className="relative">
                      <Input
                        type={showApiKey ? 'text' : 'password'}
                        value={aiApiConfig.apiKey}
                        onChange={(e) => setAiApiConfig({ apiKey: e.target.value })}
                        placeholder={aiApiConfig.provider === 'openai' ? 'sk-...' : '输入 API Key'}
                        className="h-9 pr-16"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-7 px-2 text-xs"
                        onClick={() => setShowApiKey((value) => !value)}
                      >
                        {showApiKey ? '隐藏' : '显示'}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">仅用于当前浏览器 / 桌面端本地调用，不会自动上传到 Textura 云端。</p>
                  </div>
                )}

                {aiApiConfig.provider === 'ollama' && (
                  <p className="text-[11px] text-muted-foreground">使用 Ollama 前，请先确保本地服务已启动。</p>
                )}

                {aiApiConfig.provider !== 'none' && (
                  <Button size="sm" variant="outline" className="w-full gap-2" onClick={handleSaveApiKey}>
                    <CheckCircle className="h-3.5 w-3.5" />
                    保存 AI 配置
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workspace" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">主题与复制</CardTitle>
                  <CardDescription>主题样式与复制兼容性不是同一层状态。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>当前主题：<span className="font-medium text-foreground">{theme}</span></p>
                  <p>已保存自定义主题：<span className="font-medium text-foreground">{savedThemes.length}</span></p>
                  <p>预设主题支持“微信兼容复制”；自定义主题只保证本地预览，复制到微信可能丢样式。</p>
                  <p>主题创建、保存、删除都在右侧主题面板完成，这里只做说明，不直接编辑主题。</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
                    设备预览
                  </CardTitle>
                  <CardDescription>设备壳与尺寸只影响预览和打印，不修改 Markdown 内容。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>当前设备：<span className="font-medium text-foreground">{getDeviceLabel(deviceModel)}</span></p>
                  {deviceModel === 'custom' && (
                    <p>当前尺寸：<span className="font-medium text-foreground">{customWidth} × {customHeight}</span></p>
                  )}
                  <p>设备切换入口在预览头部工具栏，适合校对不同终端下的展示效果。</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">历史与恢复</CardTitle>
                  <CardDescription>历史快照和异常恢复是两个不同兜底层。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>历史快照数：<span className="font-medium text-foreground">{snapshots.length}</span></p>
                  <p>自动快照每 3 分钟保存一次，入口在顶部“History”。</p>
                  <p>异常恢复草稿单独保存在 localStorage，用于 IndexedDB 恢复失败或浏览器异常退出时兜底。</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">导入导出</CardTitle>
                  <CardDescription>Web 与 Tauri 现在共用一套文件链路。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>支持 Markdown / TXT / DOCX 导入。</p>
                  <p>Tauri 下的 DOCX 也会先转 Markdown，再进入编辑器。</p>
                  <p>导出失败时会返回明确错误提示，便于定位权限或系统打印问题。</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
