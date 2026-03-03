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

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set) => ({
      documents: [],
      currentDocumentId: null,

      addDocument: (doc) => set((state) => ({
        documents: [...state.documents, doc],
      })),

      updateDocument: (id, updates) => set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === id ? { ...doc, ...updates } : doc
        ),
      })),

      removeDocument: (id) => set((state) => ({
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

// 检测是否在 Tauri 环境中运行
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

export async function saveDocumentToFile(
  content: string,
  defaultName: string = 'document.md'
): Promise<{ success: boolean; path?: string }> {
  try {
    // Tauri 环境
    if (isTauri()) {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');

      const filePath = await save({
        defaultPath: defaultName,
        filters: [
          { name: 'Markdown', extensions: ['md', 'markdown'] },
          { name: 'Text', extensions: ['txt'] },
        ],
      });

      if (filePath) {
        await writeTextFile(filePath, content);
        return { success: true, path: filePath };
      }
    } else {
      // 网页环境：使用浏览器原生下载功能
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true };
    }
  } catch (err) {
    console.error('Save error:', err);
  }

  return { success: false };
}

export async function openDocumentFromFile(): Promise<{
  success: boolean;
  content?: string;
  name?: string;
  path?: string;
}> {
  try {
    // Tauri 环境 (TODO: 暂不支持 Tauri 下的 Word 导入，因为 mammoth 需要 Buffer/ArrayBuffer，Tauri fs 读取二进制需要适配)
    // 目前简单实现 Web 环境下的 Word 导入
    
    // 网页环境：使用文件输入
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.md,.markdown,.txt,text/markdown,text/plain,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve({ success: false });
          return;
        }

        const fileName = file.name;
        const fileExt = fileName.split('.').pop()?.toLowerCase();

        if (fileExt === 'docx') {
          // 处理 Word 文档
          try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.convertToMarkdown({ arrayBuffer });
            
            if (result.messages.length > 0) {
              console.warn('Word conversion messages:', result.messages);
            }
            
            resolve({ 
              success: true, 
              content: result.value, 
              name: fileName.replace(/\.docx$/i, '.md') 
            });
          } catch (err) {
            console.error('Word conversion failed:', err);
            resolve({ success: false });
          }
        } else {
          // 处理普通文本/Markdown
          const content = await file.text();
          resolve({ success: true, content, name: fileName });
        }
      };
      input.click();
    });
  } catch (err) {
    console.error('Open error:', err);
    return { success: false };
  }
}

export function generateDocumentId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
