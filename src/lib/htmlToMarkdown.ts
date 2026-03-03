import React from 'react';
import TurndownService from 'turndown';
// @ts-ignore
import { gfm } from 'turndown-plugin-gfm';

const turndownService = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    fence: '```',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined'
});

turndownService.use(gfm);

// Rule to optimize images
turndownService.addRule('image', {
    filter: 'img',
    replacement: (_content: string, node: any) => {
        const alt = node.alt || '图片';
        const src = node.src || '';
        const title = node.title || '';
        if (src.startsWith('data:image')) {
            const typeMatch = src.match(/data:image\/(\w+);/);
            const type = typeMatch ? typeMatch[1] : 'image';
            return `![${alt}](data:image/${type};base64,...)${title ? ` "${title}"` : ''}\n`;
        }
        return `![${alt}](${src})${title ? ` "${title}"` : ''}\n`;
    }
});

function isIDEFormattedHTML(htmlData: string, textData: string): boolean {
    if (!htmlData || !textData) return false;

    const ideSignatures = [
        /<meta\s+charset=['"]utf-8['"]/i,
        /<div\s+class=["']ace_line["']/,
        /style=["'][^"']*font-family:\s*['"]?(?:Consolas|Monaco|Menlo|Courier)/i,
        (html: string) => {
            const hasDivSpan = /<(?:div|span)[\s>]/.test(html);
            const hasSemanticTags = /<(?:p|h[1-6]|strong|em|ul|ol|li|blockquote)[\s>]/i.test(html);
            return hasDivSpan && !hasSemanticTags;
        },
        (html: string) => {
            const strippedHtml = html.replace(/<[^>]+>/g, '').trim();
            return strippedHtml === textData.trim();
        }
    ];

    let matchCount = 0;
    for (const signature of ideSignatures) {
        if (typeof signature === 'function') {
            if (signature(htmlData)) matchCount++;
        } else if (signature.test(htmlData)) {
            matchCount++;
        }
    }
    return matchCount >= 2;
}

function isMarkdown(text: string): boolean {
    if (!text) return false;
    const patterns = [
        /^#{1,6}\s+/m,
        /\*\*[^*]+\*\*/,
        /\*[^*\n]+\*/,
        /\[[^\]]+\]\([^)]+\)/,
        /!\[[^\]]*\]\([^)]+\)/,
        /^[\*\-\+]\s+/m,
        /^\d+\.\s+/m,
        /^>\s+/m,
        /`[^`]+`/,
        /```[\s\S]*?```/,
        /^\|.*\|$/m,
        /<!--.*?-->/,
        /^---+$/m
    ];
    return patterns.filter(pattern => pattern.test(text)).length >= 2;
}

export function handleSmartPaste(
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    markdownInput: string,
    setMarkdownInput: (val: string) => void
) {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const htmlData = clipboardData.getData('text/html');
    const textData = clipboardData.getData('text/plain');

    if (textData && /^\[Image\s*#?\d*\]$/i.test(textData.trim())) {
        e.preventDefault();
        return;
    }

    const isFromIDE = isIDEFormattedHTML(htmlData, textData);
    if (isFromIDE && textData && isMarkdown(textData)) {
        return;
    }

    if (htmlData && htmlData.trim() !== '') {
        const hasPreTag = /<pre[\s>]/.test(htmlData);
        const hasCodeTag = /<code[\s>]/.test(htmlData);
        const isMainlyCode = (hasPreTag || hasCodeTag) && !htmlData.includes('<p') && !htmlData.includes('<div');

        if (isMainlyCode) {
            return;
        }

        if (htmlData.includes('file:///') || htmlData.includes('src="file:')) {
            e.preventDefault();
            return;
        }

        e.preventDefault();
        try {
            let markdown = turndownService.turndown(htmlData);
            markdown = markdown.replace(/\n{3,}/g, '\n\n');

            const textarea = e.currentTarget;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;

            const newValue = markdownInput.substring(0, start) + markdown + markdownInput.substring(end);
            setMarkdownInput(newValue);

            // Need to set the selection after React update. 
            // Since we passed setMarkdownInput, the parent will update state.
            // We can't easily sync selection here without refs, but the user can adjust cursor.
            // Or we can assume the parent updates synchronously or we rely on the component to handle cursor.
            // For now, let's just set the value.
            
        } catch (err) {
            console.error('HTML to Markdown conversion failed:', err);
            // Fallback to text
            const textarea = e.currentTarget;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newValue = markdownInput.substring(0, start) + textData + markdownInput.substring(end);
            setMarkdownInput(newValue);
        }
    } else if (textData && isMarkdown(textData)) {
        // Let default behavior handle plain text paste, or custom handle if needed
        return;
    }
}
