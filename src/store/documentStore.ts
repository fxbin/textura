import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as mammoth from 'mammoth';
import { isTauri } from '@tauri-apps/api/core';

export type DocumentSource = 'untitled' | 'file' | 'example' | 'recovery';

export interface DocumentRecord {
  id: string;
  name: string;
  source: DocumentSource;
  lastModified: number;
  lastOpenedAt: number;
  lastSavedAt?: number;
  path?: string;
  lastKnownContent?: string;
  lastSavedContent?: string;
}

interface DocumentState {
  recentDocuments: DocumentRecord[];
  currentDocument: DocumentRecord | null;
  isDirty: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  ensureCurrentDocument: (content: string) => void;
  openDocumentSession: (payload: {
    id?: string;
    name: string;
    content: string;
    path?: string;
    source: DocumentSource;
    lastSavedAt?: number;
  }) => void;
  syncCurrentContent: (content: string) => void;
  markCurrentDocumentSaved: (payload: {
    content: string;
    name?: string;
    path?: string;
    lastSavedAt?: number;
  }) => void;
  removeRecentDocument: (id: string) => void;
  clearRecentDocuments: () => void;
}

export interface SaveDocumentOptions {
  defaultName?: string;
  path?: string;
  forceDialog?: boolean;
}

export interface SaveDocumentResult {
  success: boolean;
  path?: string;
  name?: string;
  savedAt?: number;
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

const MAX_RECENT_DOCUMENTS = 8;
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function now() {
  return Date.now();
}

function createDocumentId() {
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function upsertRecentDocuments(documents: DocumentRecord[], nextDocument: DocumentRecord) {
  const filtered = documents.filter((item) => item.id !== nextDocument.id && item.path !== nextDocument.path);
  return [nextDocument, ...filtered].slice(0, MAX_RECENT_DOCUMENTS);
}

function createDocumentRecord(payload: {
  id?: string;
  name: string;
  content: string;
  path?: string;
  source: DocumentSource;
  lastSavedAt?: number;
}): DocumentRecord {
  const timestamp = now();
  return {
    id: payload.id || createDocumentId(),
    name: payload.name,
    source: payload.source,
    lastModified: timestamp,
    lastOpenedAt: timestamp,
    lastSavedAt: payload.lastSavedAt,
    path: payload.path,
    lastKnownContent: payload.content,
    lastSavedContent: payload.content,
  };
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set) => ({
      recentDocuments: [],
      currentDocument: null,
      isDirty: false,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      ensureCurrentDocument: (content) =>
        set((state) => {
          if (state.currentDocument) {
            return state;
          }

          const untitled = createDocumentRecord({
            name: '未命名文档.md',
            content,
            source: 'untitled',
          });

          return {
            currentDocument: untitled,
            recentDocuments: upsertRecentDocuments(state.recentDocuments, untitled),
            isDirty: false,
          };
        }),

      openDocumentSession: (payload) =>
        set((state) => {
          const nextDocument = createDocumentRecord(payload);
          return {
            currentDocument: nextDocument,
            recentDocuments: upsertRecentDocuments(state.recentDocuments, nextDocument),
            isDirty: false,
          };
        }),

      syncCurrentContent: (content) =>
        set((state) => {
          if (!state.currentDocument) {
            return state;
          }

          const updated = {
            ...state.currentDocument,
            lastKnownContent: content,
            lastModified: now(),
          };

          return {
            currentDocument: updated,
            recentDocuments: upsertRecentDocuments(state.recentDocuments, updated),
            isDirty: content !== (state.currentDocument.lastSavedContent ?? ''),
          };
        }),

      markCurrentDocumentSaved: ({ content, name, path, lastSavedAt }) =>
        set((state) => {
          const baseDocument = state.currentDocument || createDocumentRecord({
            name: name || '未命名文档.md',
            content,
            path,
            source: path ? 'file' : 'untitled',
          });

          const updated: DocumentRecord = {
            ...baseDocument,
            name: name || baseDocument.name,
            path: path || baseDocument.path,
            source: path ? 'file' : baseDocument.source,
            lastKnownContent: content,
            lastSavedContent: content,
            lastSavedAt: lastSavedAt || now(),
            lastModified: now(),
            lastOpenedAt: baseDocument.lastOpenedAt || now(),
          };

          return {
            currentDocument: updated,
            recentDocuments: upsertRecentDocuments(state.recentDocuments, updated),
            isDirty: false,
          };
        }),

      removeRecentDocument: (id) =>
        set((state) => ({
          recentDocuments: state.recentDocuments.filter((item) => item.id !== id),
          currentDocument: state.currentDocument?.id === id ? null : state.currentDocument,
          isDirty: state.currentDocument?.id === id ? false : state.isDirty,
        })),

      clearRecentDocuments: () =>
        set((state) => ({
          recentDocuments: state.currentDocument ? [state.currentDocument] : [],
        })),
    }),
    {
      name: 'textura-documents',
      skipHydration: true,
      partialize: (state) => ({
        recentDocuments: state.recentDocuments,
        currentDocument: state.currentDocument,
        isDirty: state.isDirty,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return isTauri();
  } catch {
    return false;
  }
}

function getFileName(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

function getFileExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() || '';
}

function ensureMarkdownName(name: string): string {
  if (/\.(md|markdown|txt)$/i.test(name)) {
    return name;
  }

  return `${name}.md`;
}

function uint8ArrayToArrayBuffer(data: Uint8Array<ArrayBuffer>): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}

async function convertDocxToMarkdown(arrayBuffer: ArrayBuffer, sourceName: string): Promise<OpenDocumentResult> {
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

async function readDocumentFromTauriPath(filePath: string): Promise<OpenDocumentResult> {
  const { readFile, readTextFile } = await import('@tauri-apps/plugin-fs');
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

export async function saveDocumentToFile(
  content: string,
  options: SaveDocumentOptions | string = 'document.md'
): Promise<SaveDocumentResult> {
  const normalizedOptions = typeof options === 'string' ? { defaultName: options } : options;
  const defaultName = ensureMarkdownName(normalizedOptions.defaultName || 'document.md');

  try {
    if (isTauriRuntime()) {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');

      const targetPath =
        normalizedOptions.path && !normalizedOptions.forceDialog
          ? normalizedOptions.path
          : await save({
              defaultPath: normalizedOptions.path || defaultName,
              filters: [
                { name: 'Markdown', extensions: ['md', 'markdown'] },
                { name: 'Text', extensions: ['txt'] },
              ],
            });

      if (!targetPath) {
        return { success: false, error: '已取消保存。' };
      }

      await writeTextFile(targetPath, content);
      return {
        success: true,
        path: targetPath,
        name: getFileName(targetPath),
        savedAt: now(),
      };
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

    return {
      success: true,
      name: defaultName,
      savedAt: now(),
    };
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

      return await readDocumentFromTauriPath(selected);
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
          resolve(await convertDocxToMarkdown(await file.arrayBuffer(), fileName));
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

export async function openRecentDocument(record: DocumentRecord): Promise<OpenDocumentResult> {
  try {
    if (record.path && isTauriRuntime()) {
      return await readDocumentFromTauriPath(record.path);
    }

    if (record.lastKnownContent !== undefined) {
      return {
        success: true,
        content: record.lastKnownContent,
        name: record.name,
        path: record.path,
      };
    }

    return {
      success: false,
      error: '该最近文档缺少可恢复内容。',
    };
  } catch (error) {
    console.error('Open recent document failed:', error);
    return {
      success: false,
      error: '打开最近文档失败，请重新导入。',
    };
  }
}

export function generateDocumentId(): string {
  return createDocumentId();
}
