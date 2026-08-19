/**
 * 智能排版引擎
 * 用于将纯文本转换为结构化的 Markdown
 */

function isFenceBoundary(line: string): boolean {
  return /^\s*(?:```|~~~)/.test(line);
}

function isMarkdownListLine(line: string): boolean {
  return /^\s*(?:[-*+]\s+|\d+[.)]\s+)/.test(line);
}

function isIndentedCodeLine(line: string): boolean {
  return /^(?: {4}|\t)/.test(line);
}

function collapseExcessBlankLines(lines: string[]): string {
  const result: string[] = [];
  let inFence = false;
  let blankRun = 0;

  for (const line of lines) {
    if (isFenceBoundary(line)) {
      result.push(line);
      inFence = !inFence;
      blankRun = 0;
      continue;
    }

    if (inFence) {
      result.push(line);
      continue;
    }

    if (!line.trim()) {
      blankRun += 1;
      if (blankRun <= 2) {
        result.push('');
      }
      continue;
    }

    blankRun = 0;
    result.push(line);
  }

  return result.join('\n');
}

export function autoFormatMarkdown(text: string): string {
  const lines = text.split('\n');
  const formattedLines: string[] = [];
  let inFence = false;

  for (const rawLine of lines) {
    // fenced code block 内必须保持原始空格与缩进，避免排版破坏代码。
    if (isFenceBoundary(rawLine)) {
      formattedLines.push(rawLine.trimEnd());
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      formattedLines.push(rawLine);
      continue;
    }

    if (!rawLine.trim()) {
      formattedLines.push('');
      continue;
    }

    const indent = rawLine.match(/^\s*/)?.[0] ?? '';
    const content = rawLine.trim();
    let line = rawLine.trimEnd();

    // 有缩进的行通常属于嵌套列表/缩进代码，不做标题启发式转换。
    if (!indent) {
      // 1. 识别一级标题/二级标题 (H2)
      // 规则：以 "一、" "二、" "1、" 开头，且长度小于 40 字
      if (/^([一二三四五六七八九十]+|[0-9]+)、/.test(content) && content.length < 40) {
        if (!content.startsWith('#')) {
          line = `## ${content}`;
        }
      }
      // 规则：以 "第[一二...]章/节" 开头
      else if (/^第[一二三四五六七八九十]+[章节]/.test(content)) {
        if (!content.startsWith('#')) {
          line = `## ${content}`;
        }
      }
      // 2. 识别三级标题 (H3)
      // 仅处理 "（一）" / "(1)"，不再把标准 Markdown 的 "1. xxx" 误判成标题。
      else if (/^(?:\（[一二三四五六七八九十]+\）|\([0-9]+\))/.test(content) && content.length < 40) {
        if (!content.startsWith('#')) {
          line = `### ${content}`;
        }
      }
    }

    // 3. 规范无序列表，保留原有缩进层级。
    if (/^\s*[•-]\s/.test(line)) {
      line = line.replace(/^(\s*)[•-]\s*/, '$1- ');
    }

    formattedLines.push(line);
  }

  // 4. 智能段落间距
  // 普通段落之间增加一个空行；列表、标题、代码块保持原有紧凑结构。
  const resultLines: string[] = [];
  inFence = false;

  for (let i = 0; i < formattedLines.length; i += 1) {
    const current = formattedLines[i];
    const next = formattedLines[i + 1];
    resultLines.push(current);

    if (isFenceBoundary(current)) {
      inFence = !inFence;
      continue;
    }

    if (inFence || next === undefined || !current.trim() || !next.trim()) {
      continue;
    }

    const isHeader = /^\s*#/.test(current);
    const isList = isMarkdownListLine(current);
    const isCode = isIndentedCodeLine(current) || isIndentedCodeLine(next);

    if (!isHeader && !isList && !isCode) {
      resultLines.push('');
    }
  }

  return collapseExcessBlankLines(resultLines);
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

  const newText = text.replace(linkRegex, (match, title, url, offset, source) => {
    // 对 ![alt](url) 而言，正则匹配从 '[' 开始，因此需要检查匹配位置前的字符。
    if (offset > 0 && source[offset - 1] === '!') return match;

    links.push(`${counter}. ${title}: ${url}`);
    return `${title} <sup>[${counter++}]</sup>`;
  });

  if (links.length === 0) return text;

  return `${newText}\n\n### 引用链接\n\n${links.join('\n')}`;
}
