import type { Theme } from './types';

const MD_PRIMARY = '#0F4C81';
const MD_FONT_SIZE = '16px';
const MD_FOREGROUND = '#333333';
const MD_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const mdMainThemes: Theme[] = [
  {
    id: 'md-default',
    name: 'MD 经典',
    description: 'Markdown 经典默认主题，清晰规范',
    styles: {
      container: `max-width: 100%; margin: 0 auto; padding: 24px 20px 48px 20px; font-family: ${MD_FONT_FAMILY}; font-size: ${MD_FONT_SIZE}; line-height: 1.75 !important; color: ${MD_FOREGROUND} !important; background-color: #ffffff !important; word-wrap: break-word;`,
      h1: `display: table; padding: 0 1em; border-bottom: 2px solid ${MD_PRIMARY}; margin: 2em auto 1em; color: ${MD_FOREGROUND}; font-size: 1.2em; font-weight: bold; text-align: center;`,
      h2: `display: table; padding: 0 0.2em; margin: 4em auto 2em; color: #fff; background: ${MD_PRIMARY}; font-size: 1.2em; font-weight: bold; text-align: center; border-radius: 2px;`,
      h3: `padding-left: 8px; border-left: 3px solid ${MD_PRIMARY}; margin: 2em 8px 0.75em 0; color: ${MD_FOREGROUND}; font-size: 1.1em; font-weight: bold; line-height: 1.2;`,
      h4: `margin: 2em 8px 0.5em; color: ${MD_PRIMARY}; font-size: 1em; font-weight: bold;`,
      h5: `margin: 1.5em 8px 0.5em; color: ${MD_PRIMARY}; font-size: 1em; font-weight: bold;`,
      h6: `margin: 1.5em 8px 0.5em; color: ${MD_PRIMARY}; font-size: 1em;`,
      p: `margin: 1.5em 8px; letter-spacing: 0.1em; color: ${MD_FOREGROUND}; line-height: 1.75;`,
      blockquote: `font-style: normal; padding: 1em; border-left: 4px solid ${MD_PRIMARY}; border-radius: 6px; color: ${MD_FOREGROUND}; background: #f8f8f8; margin-bottom: 1em;`,
      strong: `font-weight: bold; color: ${MD_PRIMARY};`,
      em: `font-style: italic; color: ${MD_PRIMARY};`,
      a: `color: ${MD_PRIMARY} !important; text-decoration: none; border-bottom: 1px solid ${MD_PRIMARY};`,
      ul: `margin: 1.5em 8px; padding-left: 2em;`,
      ol: `margin: 1.5em 8px; padding-left: 2em;`,
      li: `margin: 0.5em 0; color: ${MD_FOREGROUND};`,
      code: `font-family: "SF Mono", Consolas, monospace; padding: 2px 4px; background-color: #f8f8f8; color: ${MD_PRIMARY}; border-radius: 4px; font-size: 0.9em;`,
      pre: `margin: 1.5em 8px; padding: 1em; background-color: #f8f8f8; border-radius: 6px; overflow-x: auto; font-size: 0.9em;`,
      hr: `margin: 2em 0; border: none; height: 1px; background-color: #e0e0e0;`,
      img: `max-width: 100%; height: auto; display: block; margin: 1.5em auto; border-radius: 4px;`,
      table: `border-collapse: collapse; margin: 1.5em 8px; width: 100%; font-size: 0.9em;`,
      th: `background-color: #f8f8f8; padding: 0.5em 1em; border: 1px solid #e0e0e0; font-weight: bold; color: ${MD_FOREGROUND};`,
      td: `padding: 0.5em 1em; border: 1px solid #e0e0e0; color: ${MD_FOREGROUND};`,
      tr: `border: none;`,
    }
  },
  {
    id: 'md-grace',
    name: 'MD 优雅',
    description: '优雅的视觉效果，带阴影与圆角',
    styles: {
      container: `max-width: 100%; margin: 0 auto; padding: 24px 20px 48px 20px; font-family: ${MD_FONT_FAMILY}; font-size: ${MD_FONT_SIZE}; line-height: 1.75 !important; color: ${MD_FOREGROUND} !important; background-color: #ffffff !important; word-wrap: break-word;`,
      h1: `padding: 0.5em 1em; border-bottom: 2px solid ${MD_PRIMARY}; font-size: 1.4em; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1); margin: 32px 0 16px; font-weight: bold; color: ${MD_FOREGROUND};`,
      h2: `padding: 0.3em 1em; border-radius: 8px; font-size: 1.3em; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); margin: 28px 0 16px; font-weight: bold; background: #fff; color: ${MD_FOREGROUND};`,
      h3: `padding-left: 12px; font-size: 1.2em; border-left: 4px solid ${MD_PRIMARY}; border-bottom: 1px dashed ${MD_PRIMARY}; margin: 24px 0 14px; font-weight: bold; color: ${MD_FOREGROUND};`,
      h4: `font-size: 1.1em; margin: 20px 0 12px; font-weight: bold; color: ${MD_FOREGROUND};`,
      p: `margin: 16px 0; letter-spacing: 0.05em; color: ${MD_FOREGROUND}; line-height: 1.75;`,
      blockquote: `font-style: italic; padding: 1em 1em 1em 2em; border-left: 4px solid ${MD_PRIMARY}; border-radius: 6px; color: rgba(0, 0, 0, 0.6); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); margin-bottom: 1em; background: #fff;`,
      strong: `font-weight: bold; color: ${MD_PRIMARY};`,
      em: `font-style: italic; color: ${MD_PRIMARY};`,
      a: `color: #576b95; text-decoration: none;`,
      ul: `list-style: none; padding-left: 1.5em; margin: 16px 0;`,
      ol: `padding-left: 1.5em; margin: 16px 0;`,
      li: `margin: 0.5em 8px; color: ${MD_FOREGROUND};`,
      code: `font-family: "SF Mono", Consolas, monospace; padding: 2px 4px; background-color: #f8f8f8; color: ${MD_PRIMARY}; border-radius: 4px; font-size: 0.9em;`,
      pre: `margin: 1.5em 0; padding: 1em; background-color: #f8f8f8; border-radius: 6px; overflow-x: auto; font-size: 0.9em; box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.05);`,
      hr: `height: 1px; border: none; margin: 2em 0; background: linear-gradient(to right, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0));`,
      img: `max-width: 100%; height: auto; display: block; margin: 1.5em auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);`,
      table: `border-collapse: separate; border-spacing: 0; border-radius: 8px; margin: 1em 8px; color: ${MD_FOREGROUND}; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; width: 100%;`,
      th: `background-color: ${MD_PRIMARY}; color: #fff; padding: 0.5em 1em; font-weight: bold; text-align: left;`,
      td: `padding: 0.5em 1em; border-bottom: 1px solid #f0f0f0; color: ${MD_FOREGROUND};`,
      tr: `border: none;`,
    }
  },
  {
    id: 'md-simple',
    name: 'MD 简洁',
    description: '简洁现代的设计风格，圆角与轻微阴影',
    styles: {
      container: `max-width: 100%; margin: 0 auto; padding: 24px 20px 48px 20px; font-family: ${MD_FONT_FAMILY}; font-size: ${MD_FONT_SIZE}; line-height: 1.75 !important; color: ${MD_FOREGROUND} !important; background-color: #ffffff !important; word-wrap: break-word;`,
      h1: `padding: 0.5em 1em; font-size: 1.4em; text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.05); margin: 32px 0 16px; font-weight: bold; color: ${MD_FOREGROUND};`,
      h2: `padding: 0.3em 1.2em; font-size: 1.3em; border-radius: 8px 24px 8px 24px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06); margin: 28px 0 16px; font-weight: bold; background: #fff; color: ${MD_FOREGROUND};`,
      h3: `padding-left: 12px; font-size: 1.2em; border-radius: 6px; line-height: 2.4em; border-left: 4px solid ${MD_PRIMARY}; border-right: 1px solid rgba(15, 76, 129, 0.1); border-bottom: 1px solid rgba(15, 76, 129, 0.1); border-top: 1px solid rgba(15, 76, 129, 0.1); background: rgba(15, 76, 129, 0.08); margin: 24px 0 14px; font-weight: bold; color: ${MD_FOREGROUND};`,
      h4: `font-size: 1.1em; border-radius: 6px; margin: 20px 0 12px; font-weight: bold; color: ${MD_FOREGROUND};`,
      p: `margin: 16px 0; color: ${MD_FOREGROUND}; line-height: 1.75;`,
      blockquote: `font-style: italic; padding: 1em 1em 1em 2em; color: rgba(0, 0, 0, 0.6); border: 0.2px solid rgba(0, 0, 0, 0.04); background: #f9f9f9; border-radius: 4px; margin-bottom: 1em;`,
      strong: `font-weight: bold; color: ${MD_PRIMARY};`,
      em: `font-style: italic; color: ${MD_PRIMARY};`,
      a: `color: #576b95; text-decoration: none;`,
      ul: `list-style: none; padding-left: 1.5em; margin: 16px 0;`,
      ol: `padding-left: 1.5em; margin: 16px 0;`,
      li: `margin: 0.5em 8px; color: ${MD_FOREGROUND};`,
      code: `font-family: "SF Mono", Consolas, monospace; padding: 2px 4px; background-color: #f8f8f8; color: ${MD_PRIMARY}; border-radius: 4px; font-size: 0.9em;`,
      pre: `margin: 1.5em 0; padding: 1em; background-color: #f8f8f8; border: 1px solid rgba(0, 0, 0, 0.04); border-radius: 6px; overflow-x: auto; font-size: 0.9em;`,
      hr: `height: 1px; border: none; margin: 2em 0; background: linear-gradient(to right, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0));`,
      img: `max-width: 100%; height: auto; display: block; margin: 1.5em auto; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.04);`,
      table: `border-collapse: collapse; margin: 1em 8px; width: 100%; font-size: 0.9em;`,
      th: `padding: 0.5em 1em; border: 1px solid #f0f0f0; background: #fafafa; font-weight: bold; color: ${MD_FOREGROUND};`,
      td: `padding: 0.5em 1em; border: 1px solid #f0f0f0; color: ${MD_FOREGROUND};`,
      tr: `border: none;`,
    }
  }
];
