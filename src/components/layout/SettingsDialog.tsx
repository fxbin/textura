import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Moon, Sun, Type, Bot, Key, CheckCircle } from "lucide-react";
import { useEditorStore, AiApiProvider } from "@/store/useEditorStore";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { getProviderModels, getDefaultModel } from "@/lib/aiService";
import { toast } from "sonner";

export function SettingsDialog() {
  const { fontSize, setFontSize, aiApiConfig, setAiApiConfig, isSettingsOpen, setSettingsOpen } = useEditorStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleProviderChange = (provider: AiApiProvider) => {
    setAiApiConfig({ 
      provider, 
      model: getDefaultModel(provider)
    });
  };

  const handleSaveApiKey = () => {
    if (!aiApiConfig.apiKey.trim()) {
      toast.error('请输入 API Key');
      return;
    }
    toast.success('API 配置已保存');
  };

  if (!mounted) {
    return (
        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="w-4 h-4 mr-2" />
            偏好设置
        </Button>
    );
  }

  return (
    <Dialog open={isSettingsOpen} onOpenChange={setSettingsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="w-4 h-4 mr-2" />
            偏好设置
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-w-[90vw]">
        <DialogHeader>
          <DialogTitle>偏好设置</DialogTitle>
          <DialogDescription>
            自定义编辑器外观与预览选项。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {/* Font Size Setting */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="font-size" className="flex items-center gap-2">
                <Type className="w-4 h-4 text-muted-foreground" />
                默认字号
              </Label>
              <span className="text-sm font-mono text-muted-foreground">{fontSize}px</span>
            </div>
            <Slider
              id="font-size"
              min={12}
              max={24}
              step={1}
              value={[fontSize]}
              onValueChange={(value) => setFontSize(value[0])}
              className="w-full"
            />
          </div>

          {/* Theme Mode Setting */}
          <div className="flex items-center justify-between space-y-0">
             <Label htmlFor="dark-mode" className="flex items-center gap-2">
                {theme === 'dark' ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
                界面外观
             </Label>
             <div className="flex items-center space-x-2">
                <Button 
                    variant={theme === 'light' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setTheme('light')}
                    className="h-7 px-2 text-xs"
                >
                    明亮
                </Button>
                <Button 
                    variant={theme === 'dark' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setTheme('dark')}
                    className="h-7 px-2 text-xs"
                >
                    暗黑
                </Button>
             </div>
          </div>

          {/* AI API Configuration */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-primary" />
              <Label className="text-sm font-semibold">AI 智能排版</Label>
            </div>
            
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">AI 提供商</Label>
              <Select 
                value={aiApiConfig.provider} 
                onValueChange={(value) => handleProviderChange(value as AiApiProvider)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deepseek">DeepSeek (深度求索)</SelectItem>
                  <SelectItem value="doubao">豆包 (字节跳动)</SelectItem>
                  <SelectItem value="qwen">通义千问 (阿里)</SelectItem>
                  <SelectItem value="zhipu">智谱 GLM</SelectItem>
                  <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="ollama">Ollama (本地开源)</SelectItem>
                  <SelectItem value="custom">🔧 自定义 API</SelectItem>
                  <SelectItem value="none">不使用 (手动模式)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Model Selection */}
            {aiApiConfig.provider !== 'none' && aiApiConfig.provider !== 'custom' && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">模型</Label>
                <Select 
                  value={aiApiConfig.model} 
                  onValueChange={(value) => setAiApiConfig({ model: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getProviderModels(aiApiConfig.provider).map((model) => (
                      <SelectItem key={model} value={model}>{model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Custom API Configuration */}
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
                  <Label className="text-xs text-muted-foreground">模型名称</Label>
                  <Select 
                    value={aiApiConfig.customModelName || ''}
                    onValueChange={(value) => {
                      if (value === '__custom__') {
                        // 保持当前输入值，让用户手动输入
                      } else {
                        setAiApiConfig({ customModelName: value });
                      }
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="选择或输入模型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                      <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                      <SelectItem value="claude-sonnet-4">claude-sonnet-4</SelectItem>
                      <SelectItem value="deepseek-chat">deepseek-chat</SelectItem>
                      <SelectItem value="qwen-plus">qwen-plus</SelectItem>
                      <SelectItem value="glm-4-plus">glm-4-plus</SelectItem>
                      <SelectItem value="__custom__">🔧 自定义输入...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* 当选择自定义输入时，显示文本框 */}
                {!aiApiConfig.customModelName || aiApiConfig.customModelName === '__custom__' ? (
                  <div className="space-y-2">
                    <Input
                      value={aiApiConfig.customModelName || ''}
                      onChange={(e) => setAiApiConfig({ customModelName: e.target.value })}
                      placeholder="输入自定义模型名称"
                      className="h-9"
                    />
                  </div>
                ) : null}
              </>
            )}

            {/* API Key Input */}
            {aiApiConfig.provider !== 'none' && aiApiConfig.provider !== 'ollama' && aiApiConfig.provider !== 'custom' && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Key className="w-3 h-3" />
                  API Key
                </Label>
                <div className="relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={aiApiConfig.apiKey}
                    onChange={(e) => setAiApiConfig({ apiKey: e.target.value })}
                    placeholder={aiApiConfig.provider === 'openai' ? "sk-..." : "输入 API Key"}
                    className="h-9 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-2"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <span className="text-xs">隐藏</span> : <span className="text-xs">显示</span>}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {aiApiConfig.provider === 'openai' && '获取 API Key: https://platform.openai.com/api-keys'}
                  {aiApiConfig.provider === 'anthropic' && '获取 API Key: https://console.anthropic.com/keys'}
                  {aiApiConfig.provider === 'deepseek' && '获取 API Key: https://platform.deepseek.com/'}
                  {aiApiConfig.provider === 'doubao' && '获取 API Key: https://www.doubao.com/'}
                  {aiApiConfig.provider === 'qwen' && '获取 API Key: https://dashscope.console.aliyun.com/'}
                  {aiApiConfig.provider === 'zhipu' && '获取 API Key: https://open.bigmodel.cn/'}
                </p>
              </div>
            )}

            {/* Custom API Key (Optional) */}
            {aiApiConfig.provider === 'custom' && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Key className="w-3 h-3" />
                  API Key (可选)
                </Label>
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={aiApiConfig.apiKey}
                  onChange={(e) => setAiApiConfig({ apiKey: e.target.value })}
                  placeholder="如需认证请输入 API Key"
                  className="h-9"
                />
              </div>
            )}

            {aiApiConfig.provider === 'ollama' && (
              <p className="text-[10px] text-muted-foreground">
                Ollama 需要在本地运行。下载: https://ollama.com
              </p>
            )}

            {aiApiConfig.provider !== 'none' && (
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full gap-2"
                onClick={handleSaveApiKey}
              >
                <CheckCircle className="w-3 h-3" />
                保存配置
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
