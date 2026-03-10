import type { Theme } from './types';

export const redAccentThemes: Theme[] = [
  {
    id: 'red-accent-classic',
    name: '赤红经典',
    description: '经典的红黑配色，适合正式文档与强调重点',
    styles: {
      container: 'font-family: PingFangSC-Light; color: #3e3e3e; line-height: 1.75; padding: 20px;',
      p: 'margin: 10px 10px; line-height: 1.75; letter-spacing: 0.2em; font-size: 14px; word-spacing: 0.1em; text-align: justify;',
      // H1 - Full width bottom border
      h1: 'display: block; margin: 20px 0 15px; padding-bottom: 5px; border-bottom: 3px solid rgb(248,57,41); font-size: 22px; font-weight: bold; color: #3e3e3e; text-align: left; line-height: 1.4;',
      
      // H2 - Thick left border
      h2: 'display: block; margin: 30px 0 15px; padding-left: 12px; border-left: 6px solid rgb(248,57,41); font-size: 18px; font-weight: bold; color: #3e3e3e; line-height: 1.4;',
      
      // H3 - Thin left border with colored text
      h3: 'display: block; margin: 20px 0 10px; padding-left: 8px; border-left: 3px solid rgb(248,57,41); font-size: 16px; font-weight: bold; color: rgb(248,57,41); line-height: 1.4;',
      ul: 'font-size: 14px; padding-left: 20px; margin: 10px 0;',
      ol: 'font-size: 14px; padding-left: 20px; margin: 10px 0;',
      li: 'margin: 5px 0;',
      blockquote: 'margin: 10px 5px; border-left: 3px solid #e34c3c; border-right: 0px solid #e34c3c; color: #37393c; background: #FBF9FD; padding: 10px;',
      a: 'color: rgb(248,57,41); border-bottom: 1px solid #ff3502; font-family: STHeitiSC-Light; text-decoration: none;',
      strong: 'font-weight: bold; color: rgb(248,57,41);',
      em: 'color: rgb(248,57,41); letter-spacing: 0.3em; font-style: italic;',
      hr: 'height: 1px; padding: 0; border: none; border-top: 1px solid #333; text-align: center; background-image: linear-gradient(to right, rgba(248,57,41,0), rgba(248,57,41,0.75), rgba(248,57,41,0)); margin: 20px 0;',
      img: 'border-radius: 0px 0px 5px 5px; display: block; margin: 20px auto; max-width: 85%; height: auto; object-fit: contain; box-shadow: #84A1A8 0px 10px 15px;',
      code: 'color: rgb(271,93,108); background-color: rgba(27,31,35,.05); padding: 2px 4px; border-radius: 4px; font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace;',
      pre: 'display: block; padding: 10px; margin: 10px 0; font-size: 13px; line-height: 1.45; word-break: break-all; word-wrap: break-word; color: #333; background-color: #f6f8fa; border: 0; border-radius: 3px; overflow: auto;',
    }
  }
];
