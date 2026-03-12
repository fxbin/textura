import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateWordCount(text: string) {
  const cleanText = text.replace(/\s/g, '');
  const charCount = cleanText.length;
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
  const chineseCount = chineseChars.length;
  const nonChineseText = text.replace(/[\u4e00-\u9fa5]/g, ' ');
  const words = nonChineseText.trim().split(/\s+/).filter((item) => item.length > 0);
  const wordCount = words.length;
  const readTimeMinutes = chineseCount / 400 + wordCount / 200;
  const readTime = Math.ceil(readTimeMinutes) || 1;

  return {
    charCount,
    readTime,
  };
}
