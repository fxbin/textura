import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as mammoth from 'mammoth';

export interface DocumentMeta {
  id: string;
  name: string;
  lastModified: number;
  path?: string;
}

interface DocumentState {
  documents: DocumentMeta[];
  currentDocumentId: string | null;
  addDocument: (doc: DocumentMeta) => void;
  updateDocument: (id: string, updates: Partial<DocumentMeta>) => void;
  removeDocument: (id: string) => void;
  setCurrentDocument: (id: string | null) => void;
}

export interface SaveDocumentResult {
  success: boolean;
  path?: string;
  error?: string;
}

export interface OpenDocumentResult {
  success: boolean;
  content?: string;
  name?: string;
  path?: string;
  error?: string;
  warning?: string;
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set) => ({
      documents: [],
      currentDocumentId: null,

      addDocument: (doc) =>
        set((state) => ({
          documents: [...state.documents, doc],
        })),

      updateDocument: (id, updates) =>
        set((state) => ({
          documents: state.documents.map((doc) => (doc.id === id ? { ...doc, ...updates } : doc)),
        })),

      removeDocument: (id) =>
        set((state) => ({
          documents: state.documents.filter((doc) => doc.id !== id),
          currentDocumentId: state.currentDocumentId === id ? null : state.currentDocumentId,
        })),

      setCurrentDocument: (id) => set({ currentDocumentId: id }),
    }),
    {
      name: 'textura-documents',
    }
  )
);

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

function getFileName(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

function getFileExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() || '';
}

function uint8ArrayToArrayBuffer(data: Uint8Array<ArrayBuffer>): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}

async function convertDocxToMarkdown(
  arrayBuffer: ArrayBuffer,
  sourceName: string
): Promise<OpenDocumentResult> {
  try {
    const result = await mammoth.convertToMarkdown({ arrayBuffer });
    const warning =
      result.messages.length > 0
        ? `${sourceName} 已导入，部分复杂样式已转为 Markdown 近似格式。`
        : undefined;

    return {
      success: true,
      content: result.value,
      name: sourceName.replace(/\.docx$/i, '.md'),
      warning,
    };
  } catch (error) {
    console.error('Word conversion failed:', error);
    return {
      success: false,
      error: 'DOCX 解析失败，请确认文件未损坏。',
    };
  }
}

export async function saveDocumentToFile(
  content: string,
  defaultName: string = 'document.md'
): Promise<SaveDocumentResult> {
  try {
    if (isTauriRuntime()) {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');

      const filePath = await save({
        defaultPath: defaultName,
        filters: [
          { name: 'Markdown', extensions: ['md', 'markdown'] },
          { name: 'Text', extensions: ['txt'] },
        ],
      });

      if (!filePath) {
        return { success: false, error: '已取消保存。' };
      }

      await writeTextFile(filePath, content);
      return { success: true, path: filePath };
    }

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = defaultName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return { success: true };
  } catch (error) {
    console.error('Save error:', error);
    return {
      success: false,
      error: '保存失败，请检查文件权限后重试。',
    };
  }
}

export async function openDocumentFromFile(): Promise<OpenDocumentResult> {
  try {
    if (isTauriRuntime()) {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readFile, readTextFile } = await import('@tauri-apps/plugin-fs');

      const selected = await open({
        multiple: false,
        filters: [
          { name: 'Markdown', extensions: ['md', 'markdown'] },
          { name: 'Text', extensions: ['txt'] },
          { name: 'Word', extensions: ['docx'] },
        ],
      });

      if (!selected || Array.isArray(selected)) {
        return { success: false, error: '已取消打开文件。' };
      }

      const filePath = selected;
      const fileName = getFileName(filePath);
      const extension = getFileExtension(fileName);

      if (extension === 'docx') {
        const fileBuffer = await readFile(filePath);
        const result = await convertDocxToMarkdown(uint8ArrayToArrayBuffer(fileBuffer), fileName);
        return {
          ...result,
          path: filePath,
        };
      }

      const content = await readTextFile(filePath);
      return {
        success: true,
        content,
        name: fileName,
        path: filePath,
      };
    }

    return await new Promise<OpenDocumentResult>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = `.md,.markdown,.txt,text/markdown,text/plain,.docx,${DOCX_MIME}`;

      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve({ success: false, error: '已取消打开文件。' });
          return;
        }

        const fileName = file.name;
        const extension = getFileExtension(fileName);

        if (extension === 'docx') {
          const result = await convertDocxToMarkdown(await file.arrayBuffer(), fileName);
          resolve(result);
          return;
        }

        resolve({
          success: true,
          content: await file.text(),
          name: fileName,
        });
      };

      input.click();
    });
  } catch (error) {
    console.error('Open error:', error);
    return {
      success: false,
      error: '打开文件失败，请重试。',
    };
  }
}

export function generateDocumentId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
