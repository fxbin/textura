import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { md } from './markdown';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const HAN_CHAR_REGEX = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;
const ASCII_ALNUM_REGEX = /^[A-Za-z0-9]$/;
const ASCII_TOKEN_CHAR_REGEX = /^[A-Za-z0-9/._-]$/;
const TAG_REGEX = /<[^>]+>/g;

function stripHtmlTags(text: string) {
  return text.replace(TAG_REGEX, '');
}

function markdownToVisibleText(markdown: string) {
  if (!markdown.trim()) {
    return '';
  }

  const tokens = md.parse(markdown, {});
  const segments: string[] = [];
  const listStack: Array<{ type: 'bullet' } | { type: 'ordered'; next: number }> = [];

  const appendInlineContent = (contentToken: (typeof tokens)[number]) => {
    if (!contentToken.children) {
      segments.push(contentToken.content);
      return;
    }

    contentToken.children.forEach((child) => {
      switch (child.type) {
        case 'text':
        case 'code_inline':
          segments.push(child.content);
          break;
        case 'softbreak':
        case 'hardbreak':
          segments.push('\n');
          break;
        case 'html_inline':
          segments.push(stripHtmlTags(child.content));
          break;
        default:
          break;
      }
    });
  };

  tokens.forEach((token) => {
    switch (token.type) {
      case 'inline':
        appendInlineContent(token);
        break;
      case 'bullet_list_open':
        listStack.push({ type: 'bullet' });
        break;
      case 'ordered_list_open': {
        const start = Number(token.attrGet('start') || '1');
        listStack.push({
          type: 'ordered',
          next: Number.isFinite(start) ? start : 1,
        });
        break;
      }
      case 'bullet_list_close':
      case 'ordered_list_close':
        listStack.pop();
        segments.push('\n');
        break;
      case 'list_item_open': {
        const currentList = listStack[listStack.length - 1];
        if (currentList?.type === 'ordered') {
          segments.push(`${currentList.next}. `);
          currentList.next += 1;
        }
        break;
      }
      case 'list_item_close':
      case 'paragraph_close':
      case 'heading_close':
      case 'blockquote_close':
      case 'table_close':
      case 'tr_close':
        segments.push('\n');
        break;
      case 'code_block':
      case 'fence':
      case 'html_block':
        segments.push(stripHtmlTags(token.content), '\n');
        break;
      default:
        break;
    }
  });

  return segments.join('');
}

function countWeChatLikeCharacters(text: string) {
  const chars = Array.from(text).filter((char) => !/\s/u.test(char));

  let charCount = 0;
  let hanCharCount = 0;
  let asciiTokenCount = 0;

  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index];

    if (HAN_CHAR_REGEX.test(char)) {
      charCount += 1;
      hanCharCount += 1;
      continue;
    }

    if (ASCII_ALNUM_REGEX.test(char)) {
      let nextIndex = index + 1;

      while (nextIndex < chars.length && ASCII_TOKEN_CHAR_REGEX.test(chars[nextIndex])) {
        nextIndex += 1;
      }

      charCount += 1;
      asciiTokenCount += 1;
      index = nextIndex - 1;
      continue;
    }

    charCount += 1;
  }

  return {
    charCount,
    hanCharCount,
    asciiTokenCount,
  };
}

export function calculateWordCount(text: string) {
  const visibleText = markdownToVisibleText(text);
  const { charCount, hanCharCount, asciiTokenCount } = countWeChatLikeCharacters(visibleText);
  const readTimeMinutes = hanCharCount / 400 + asciiTokenCount / 200;
  const readTime = Math.ceil(readTimeMinutes) || 1;

  return {
    charCount,
    readTime,
  };
}
