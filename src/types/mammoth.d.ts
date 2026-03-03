declare module 'mammoth' {
  export interface MammothOptions {
    path?: string;
    buffer?: Buffer;
    arrayBuffer?: ArrayBuffer;
  }

  export interface ConversionResult {
    value: string;
    messages: any[];
  }

  export function convertToMarkdown(options: MammothOptions): Promise<ConversionResult>;
  export function convertToHtml(options: MammothOptions): Promise<ConversionResult>;
  export function extractRawText(options: MammothOptions): Promise<ConversionResult>;
}
