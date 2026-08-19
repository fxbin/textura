import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
import shell from 'highlight.js/lib/languages/shell';
import { THEMES } from './themes';

// Register only commonly used languages to keep bundle size small.
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('java', java);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('c', cpp);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);
hljs.registerLanguage('shell', shell);

export const md = new MarkdownIt({
    html: true,
    linkify: false,
    typographer: false,
    highlight: function (str: string, lang: string) {
        let codeContent = '';
        if (lang && hljs.getLanguage(lang)) {
            try {
                codeContent = hljs.highlight(str, { language: lang }).value;
            } catch {
                codeContent = md.utils.escapeHtml(str);
            }
        } else {
            codeContent = md.utils.escapeHtml(str);
        }

        const dots = '<div style="margin-bottom: 12px; white-space: nowrap;"><span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #ff5f56; margin-right: 6px;"></span><span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #ffbd2e; margin-right: 6px;"></span><span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #27c93f;"></span></div>';

        // Preserve language class for non-hljs languages (like mermaid)
        const langClass = lang ? `language-${lang}` : '';
        return `<pre>${dots}<code class="hljs ${langClass}">${codeContent}</code></pre>`;
    }
});

const BLOCKED_HTML_TAGS = [
    'script',
    'style',
    'iframe',
    'object',
    'embed',
    'form',
    'input',
    'button',
    'textarea',
    'select',
    'option',
    'link',
    'meta',
    'base',
    'template',
    'svg',
    'math',
];

const URL_ATTRIBUTES = new Set(['href', 'src', 'poster', 'action', 'formaction', 'xlink:href']);

function isSafeUrl(value: string, attribute: string, tagName: string): boolean {
    const normalized = value.replace(/[\u0000-\u001F\u007F\s]+/g, '').toLowerCase();
    if (!normalized) return true;

    if (normalized.startsWith('#') || normalized.startsWith('/') || normalized.startsWith('./') || normalized.startsWith('../')) {
        return true;
    }

    if (/^(https?:|mailto:|tel:|blob:)/.test(normalized)) {
        return true;
    }

    if (attribute === 'src' && tagName === 'IMG' && /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp);/i.test(value.trim())) {
        return true;
    }

    return false;
}

function sanitizeInlineStyle(value: string): string {
    return value
        .split(';')
        .map(part => part.trim())
        .filter(Boolean)
        .filter(part => {
            const normalized = part.replace(/\s+/g, '').toLowerCase();
            return !/(?:url\(|expression\(|javascript:|vbscript:|behavior:|-moz-binding)/.test(normalized);
        })
        .join('; ');
}

function sanitizeRenderedDocument(doc: Document) {
    BLOCKED_HTML_TAGS.forEach(tag => {
        doc.querySelectorAll(tag).forEach(node => node.remove());
    });

    doc.querySelectorAll('*').forEach(node => {
        Array.from(node.attributes).forEach(attribute => {
            const name = attribute.name.toLowerCase();

            if (name === 'style') {
                const safeStyle = sanitizeInlineStyle(attribute.value);
                if (safeStyle) {
                    node.setAttribute(attribute.name, safeStyle);
                } else {
                    node.removeAttribute(attribute.name);
                }
                return;
            }

            if (name === 'srcdoc' || name.startsWith('on')) {
                node.removeAttribute(attribute.name);
                return;
            }

            if (URL_ATTRIBUTES.has(name) && !isSafeUrl(attribute.value, name, node.tagName)) {
                node.removeAttribute(attribute.name);
            }
        });
    });
}

export function applyTheme(html: string, themeId: string, fontSize?: number) {
    // In SSR environment, DOMParser might not be available.
    if (typeof window === 'undefined') return html;

    const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
    const style = { ...theme.styles };

    if (fontSize) {
        const baseFontSize = `${fontSize}px`;
        const appendFontSize = (value?: string) =>
            `${value || ''}${value ? ' ' : ''}font-size: ${baseFontSize} !important;`;

        style.p = appendFontSize(style.p);
        style.li = appendFontSize(style.li);
        style.blockquote = appendFontSize(style.blockquote);
        style.td = appendFontSize(style.td);
        style.th = appendFontSize(style.th);
        style.table = appendFontSize(style.table);
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    sanitizeRenderedDocument(doc);

    // Specific inline overrides to prevent headings from uninheriting styles
    const headingInlineOverrides: Record<string, string> = {
        strong: 'font-weight: 700; color: inherit !important; background-color: transparent !important;',
        em: 'font-style: italic; color: inherit !important; background-color: transparent !important;',
        a: 'color: inherit !important; text-decoration: none !important; border-bottom: 1px solid currentColor !important; background-color: transparent !important;',
        code: 'color: inherit !important; background-color: transparent !important; border: none !important; padding: 0 !important;',
    };

    const getSingleImageNode = (p: HTMLParagraphElement): HTMLElement | null => {
        const children = Array.from(p.childNodes).filter(n =>
            !(n.nodeType === Node.TEXT_NODE && !(n.textContent || '').trim()) &&
            !(n.nodeType === Node.ELEMENT_NODE && (n as Element).tagName === 'BR')
        );
        if (children.length !== 1) return null;
        const onlyChild = children[0];
        if (onlyChild.nodeName === 'IMG') return onlyChild as HTMLElement;
        if (onlyChild.nodeName === 'A' && onlyChild.childNodes.length === 1 && onlyChild.childNodes[0].nodeName === 'IMG') {
            return onlyChild as HTMLElement;
        }
        return null;
    };

    // Merge consecutive single-image paragraphs (same parent) into pair-wise side-by-side grids.
    const paragraphSnapshot = Array.from(doc.querySelectorAll('p'));
    for (const paragraph of paragraphSnapshot) {
        if (!paragraph.isConnected) continue;
        const parent = paragraph.parentElement;
        if (!parent) continue;
        if (!getSingleImageNode(paragraph)) continue;

        const run: HTMLParagraphElement[] = [paragraph];
        let cursor = paragraph.nextElementSibling;
        while (cursor && cursor.tagName === 'P') {
            const p = cursor as HTMLParagraphElement;
            if (!getSingleImageNode(p)) break;
            run.push(p);
            cursor = p.nextElementSibling;
        }

        if (run.length < 2) continue;

        // Pair images two by two, leaving an odd tail image as-is.
        for (let i = 0; i + 1 < run.length; i += 2) {
            const first = run[i];
            const second = run[i + 1];
            if (!first.isConnected || !second.isConnected) continue;

            const firstImageNode = getSingleImageNode(first);
            const secondImageNode = getSingleImageNode(second);
            if (!firstImageNode || !secondImageNode) continue;

            const gridParagraph = doc.createElement('p');
            gridParagraph.classList.add('image-grid');
            gridParagraph.setAttribute('style', 'display: flex; justify-content: center; gap: 8px; margin: 24px 0; align-items: flex-start;');
            gridParagraph.appendChild(firstImageNode);
            gridParagraph.appendChild(secondImageNode);

            first.before(gridParagraph);
            first.remove();
            second.remove();
        }
    }

    // Process image grids
    const paragraphs = doc.querySelectorAll('p');
    paragraphs.forEach(p => {
        const children = Array.from(p.childNodes).filter(n => !(n.nodeType === Node.TEXT_NODE && !(n.textContent || '').trim()));
        const isAllImages = children.length > 1 && children.every(n => n.nodeName === 'IMG' || (n.nodeName === 'A' && n.childNodes.length === 1 && n.childNodes[0].nodeName === 'IMG'));

        if (isAllImages) {
            p.classList.add('image-grid');
            p.setAttribute('style', 'display: flex; justify-content: center; gap: 8px; margin: 24px 0; align-items: flex-start;');

            p.querySelectorAll('img').forEach(img => {
                img.classList.add('grid-img');
                const w = 100 / children.length;
                img.setAttribute('style', `width: calc(${w}% - ${8 * (children.length - 1) / children.length}px); margin: 0; border-radius: 8px; height: auto;`);
            });
        }
    });

    Object.keys(style).forEach((selector) => {
        if (selector === 'pre code') return;
        const elements = doc.querySelectorAll(selector);
        elements.forEach(el => {
            if (selector === 'code' && el.parentElement?.tagName === 'PRE') return;
            if (el.tagName === 'IMG' && el.closest('.image-grid')) return;
            const currentStyle = el.getAttribute('style') || '';
            el.setAttribute('style', currentStyle + '; ' + style[selector as keyof typeof style]);
        });
    });

    // Tailwind preflight removes native list markers. Restore markers only when
    // the active theme did not explicitly choose a list style of its own.
    const themeDefinesUlStyle = /list-style(?:-type)?\s*:/i.test(style.ul || '');
    const themeDefinesOlStyle = /list-style(?:-type)?\s*:/i.test(style.ol || '');

    if (!themeDefinesUlStyle) {
        doc.querySelectorAll('ul').forEach(ul => {
            const currentStyle = ul.getAttribute('style') || '';
            ul.setAttribute('style', `${currentStyle}; list-style-type: disc !important; list-style-position: outside;`);
        });
        doc.querySelectorAll('ul ul').forEach(ul => {
            const currentStyle = ul.getAttribute('style') || '';
            ul.setAttribute('style', `${currentStyle}; list-style-type: circle !important;`);
        });
        doc.querySelectorAll('ul ul ul').forEach(ul => {
            const currentStyle = ul.getAttribute('style') || '';
            ul.setAttribute('style', `${currentStyle}; list-style-type: square !important;`);
        });
    }

    if (!themeDefinesOlStyle) {
        doc.querySelectorAll('ol').forEach(ol => {
            const currentStyle = ol.getAttribute('style') || '';
            ol.setAttribute('style', `${currentStyle}; list-style-type: decimal !important; list-style-position: outside;`);
        });
    }

    const hljsLight: Record<string, string> = {
        'hljs-comment': 'color: #6a737d; font-style: italic;',
        'hljs-quote': 'color: #6a737d; font-style: italic;',
        'hljs-keyword': 'color: #d73a49; font-weight: 600;',
        'hljs-selector-tag': 'color: #d73a49; font-weight: 600;',
        'hljs-string': 'color: #032f62;',
        'hljs-title': 'color: #6f42c1; font-weight: 600;',
        'hljs-section': 'color: #6f42c1; font-weight: 600;',
        'hljs-type': 'color: #005cc5; font-weight: 600;',
        'hljs-number': 'color: #005cc5;',
        'hljs-literal': 'color: #005cc5;',
        'hljs-built_in': 'color: #005cc5;',
        'hljs-variable': 'color: #e36209;',
        'hljs-template-variable': 'color: #e36209;',
        'hljs-tag': 'color: #22863a;',
        'hljs-name': 'color: #22863a;',
        'hljs-attr': 'color: #6f42c1;',
    };

    const codeTokens = doc.querySelectorAll('.hljs span');
    codeTokens.forEach(span => {
        let inlineStyle = span.getAttribute('style') || '';
        if (inlineStyle && !inlineStyle.endsWith(';')) inlineStyle += '; ';
        span.classList.forEach(cls => {
            if (hljsLight[cls]) {
                inlineStyle += hljsLight[cls] + '; ';
            }
        });
        if (inlineStyle) {
            span.setAttribute('style', inlineStyle);
        }
    });

    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => {
        Object.keys(headingInlineOverrides).forEach(tag => {
            heading.querySelectorAll(tag).forEach(node => {
                const override = headingInlineOverrides[tag];
                node.setAttribute('style', `${node.getAttribute('style') || ''}; ${override}`);
            });
        });
    });

    return doc.body.innerHTML;
}
