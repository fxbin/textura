export interface Example {
  id: string;
  name: string;
  description: string;
  content: string;
}

export const examples: Example[] = [
  {
    id: 'basic-syntax',
    name: 'Markdown 基础语法',
    description: '快速掌握 Markdown 常用排版标记',
    content: `# Markdown 基础语法手册

本手册展示了 Markdown 最常用的语法，Textura 已对其进行了深度排版优化。

## 1. 文本样式

- **加粗**：使用 \`**文本**\` 或 \`__文本__\`
- *斜体*：使用 \`*文本*\` 或 \`_文本_\`
- ~~删除线~~：使用 \`~~文本~~\`
- \`行内代码\`：使用反引号包裹

## 2. 列表

### 无序列表
- 项目 A
- 项目 B
  - 子项目 B1
  - 子项目 B2

### 有序列表
1. 第一步
2. 第二步
3. 第三步

## 3. 引用与分割线

> 这是一个标准的引用块。
> 它可以跨越多个段落。

---

## 4. 链接与图片

[访问 Textura 官网](https://textura.app)

![示例图片](https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80)

## 5. 表格

| 姓名 | 职位 | 能力 |
| :--- | :--- | :--- |
| 张三 | 设计师 | UI/UX |
| 李四 | 开发者 | React/Next.js |

## 6. 代码块

\`\`\`javascript
function hello() {
  console.log("Hello, Textura!");
}
\`\`\`
`
  },
  {
    id: 'advanced-layout',
    name: '高级排版技巧',
    description: '利用 Textura 的特性打造精美文章',
    content: `# 高级排版美学指南

> “好的排版是隐形的，但它能引导读者的灵魂。”

## 1. 节奏感：字间距与行高

在 Textura 中，我们为每一款主题都预设了最佳的阅读节奏。

### 标题层级
使用不同的标题级别来构建内容的骨架。不要只使用 H1，合理利用 H2 和 H3 能让长文章更易读。

## 2. 视觉引导：色彩与引用

### 强调色彩
合理使用**加粗**来突出关键词。在 Textura 的某些主题中，加粗文字会自动带上品牌色。

### 多级引用
> 顶层引用：用于核心观点的阐述。
> > 嵌套引用：用于补充说明或来源标注。

## 3. 技术展示：极致的代码高亮

对于技术博主，代码的易读性至关重要：

\`\`\`python
class TexturaEngine:
    def __init__(self, theme="ocean"):
        self.theme = theme
        self.config = self.load_config()
        
    def render(self, content):
        print(f"Rendering with {self.theme}...")
        return f"<html>{content}</html>"
\`\`\`

## 4. 结构化信息：表格的艺术

| 维度 | 传统排版 | Textura 艺术排版 |
| :--- | :--- | :--- |
| **可读性** | 较低 | 极高 |
| **视觉冲击力** | 平平 | 强烈 |
| **交互感** | 无 | 实时反馈 |

---

**提示**：尝试切换右侧的主题，看看这些高级元素在不同风格下是如何变化的。
`
  },
  {
    id: 'heti-best-practice',
    name: '赫蹏 (Heti) 排版规范',
    description: '符合中文阅读习惯的专业排版标准',
    content: `# 赫蹏 (Heti) 中文排版最佳实践

Textura 内置了 **Heti** 排版引擎，旨在提供极致的中文阅读体验。

## 1. 标点符号的艺术

在中文排版中，标点符号占用的空间非常关键。Heti 自动处理了：

- **全角标点**：确保它们在视觉上不会过于稀疏或拥挤
- **避头尾**：防止标点符号出现在行首或行末不当位置

## 2. 中西文混排

这是一个关于 **React** 和 **TypeScript** 的技术分享。

> 注意：在中文和英文/数字之间，Textura 会自动处理适当的间距（盘古间距），使阅读更加流畅。

## 3. 段落缩进与间距

### 传统风格
某些主题支持首行缩进两个字符，适合文学类创作。

### 现代风格
使用段落间距来区分内容，更适合屏幕阅读和碎片化信息传递。

## 4. 案例演示

「所谓排版，不仅仅是把文字放上去。」

*   **重点 1**：关注文字的呼吸感。
*   **重点 2**：关注颜色的对比度。
*   **重点 3**：关注层级的清晰度。

---

通过遵循这些规范，你的文章将散发出纸质书籍般的质感。
`
  }
];
