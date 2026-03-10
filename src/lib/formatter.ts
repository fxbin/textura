
/**
 * 智能排版引擎
 * 用于将纯文本转换为结构化的 Markdown
 */

export function autoFormatMarkdown(text: string): string {
  let lines = text.split('\n');
  const formattedLines: string[] = [];
  
  // 预处理：移除行首尾空格
  lines = lines.map(line => line.trim());

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // 跳过空行（稍后统一处理段落间距）
    if (!line) {
      formattedLines.push('');
      continue;
    }

    // 1. 识别一级标题/二级标题 (H2)
    // 规则：以 "一、" "二、" "1、" 开头，且长度小于 40 字
    if (/^([一二三四五六七八九十]+|[0-9]+)、/.test(line) && line.length < 40) {
      // 避免重复加 #
      if (!line.startsWith('#')) {
        line = `## ${line}`;
      }
    }
    // 规则：以 "第[一二...]章" 开头
    else if (/^第[一二三四五六七八九十]+[章|节]/.test(line)) {
       if (!line.startsWith('#')) {
        line = `## ${line}`;
      }
    }

    // 2. 识别三级标题 (H3)
    // 规则：以 "（一）" "(1)" "1." 开头，且长度小于 40 字
    else if (/^(\（[一二三四五六七八九十]+\）|\([0-9]+\)|[0-9]+\.)/.test(line) && line.length < 40) {
      if (!line.startsWith('#')) {
        line = `### ${line}`;
      }
    }
    
    // 3. 识别列表
    // 规则：以 "•" "-" 开头
    else if (/^[•\-]\s/.test(line)) {
      if (!line.startsWith('- ')) {
        line = line.replace(/^[•\-]\s*/, '- ');
      }
    }

    // 4. 中文段落标点优化 (可选，暂不强制替换英文标点，避免误伤代码)
    
    formattedLines.push(line);
  }

  // 5. 智能段落间距
  // 确保非空行之间有空行，除非是列表
  let result = '';
  for (let i = 0; i < formattedLines.length; i++) {
    const current = formattedLines[i];
    const next = formattedLines[i + 1];

    result += current + '\n';

    // 如果当前行不是空行，且下一行也不是空行，且不是标题或列表，则插入空行
    // 简单的策略：只要不是空行，就多加一个换行（Markdown 标准段落）
    // 但要注意列表之间不能加空行太频繁
    
    const isHeader = /^#/.test(current);
    const isList = /^- /.test(current);
    const isEmpty = current.trim() === '';

    if (!isEmpty && !isHeader && !isList && next && next.trim() !== '') {
       // 这是一个普通段落行，且下一行也是内容，为了分段，插入空行
       // 或者是列表结束了
       result += '\n';
    }
  }

  // 清理多余的连续空行 (超过2个的变成2个)
  return result.replace(/\n{3,}/g, '\n\n');
}

/**
 * 微信外链转底部引用
 * 将 Markdown 中的链接 [text](url) 转换为 文本 [n] 的形式
 * 并在文末添加引用列表
 */
export function formatWeChatLinks(text: string): string {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links: string[] = [];
  let counter = 1;
  
  // 替换正文中的链接
  const newText = text.replace(linkRegex, (match, title, url) => {
    // 忽略已经是引用格式的链接（如果有的话，虽然不太可能）
    // 忽略图片
    if (match.startsWith('!')) return match;
    
    links.push(`${counter}. ${title}: ${url}`);
    return `${title} <sup>[${counter++}]</sup>`;
  });

  if (links.length === 0) return text;

  // 添加底部引用
  return `${newText}\n\n### 引用链接\n\n${links.join('\n')}`;
}
