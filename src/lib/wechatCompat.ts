import { THEMES } from './themes';

// Helper to convert images to Base64 with a 10-second timeout
async function getBase64Image(imgUrl: string): Promise<string> {
    try {
        if (imgUrl.startsWith('data:')) return imgUrl;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10_000);

        try {
            const response = await fetch(imgUrl, {
                mode: 'cors', cache: 'default', signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) return imgUrl;

            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => resolve(imgUrl);
                reader.readAsDataURL(blob);
            });
        } catch {
            clearTimeout(timeoutId);
            return imgUrl;
        }
    } catch {
        return imgUrl;
    }
}

export async function makeWeChatCompatible(html: string, themeId: string): Promise<string> {
    if (typeof window === 'undefined') return html;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
    const containerStyle = theme.styles.container || '';

    // 1. WeChat prefers <section> as the root wrapper for overall styling
    // If the root is a div, let's wrap or convert it to a section.
    const rootNodes = Array.from(doc.body.children);

    // Create new wrap section
    const section = doc.createElement('section');
    section.setAttribute('style', containerStyle);

    rootNodes.forEach(node => {
        // If the original html came from applyTheme it already has a root div
        // We strip it regardless of exact style string match to avoid double layers
        if (node.tagName === 'DIV' && rootNodes.length === 1) {
            Array.from(node.childNodes).forEach(child => section.appendChild(child));
        } else {
            section.appendChild(node);
        }
    });

    // 2. WeChat ignores flex in many scenarios. Convert image flex wrappers to table layout.
    const flexLikeNodes = section.querySelectorAll('div, p.image-grid');
    flexLikeNodes.forEach(node => {
        // Keep code block internals untouched.
        if (node.closest('pre, code')) return;

        const style = node.getAttribute('style') || '';
        const isFlexNode = style.includes('display: flex') || style.includes('display:flex');
        const isImageGrid = node.classList.contains('image-grid');
        if (!isFlexNode && !isImageGrid) return;

        const flexChildren = Array.from(node.children);
        if (flexChildren.every(child => child.tagName === 'IMG' || child.querySelector('img'))) {
            const table = doc.createElement('table');
            table.setAttribute('style', 'width: 100%; border-collapse: collapse; margin: 16px 0; border: none !important;');
            const tbody = doc.createElement('tbody');
            const tr = doc.createElement('tr');
            tr.setAttribute('style', 'border: none !important; background: transparent !important;');

            flexChildren.forEach(child => {
                const td = doc.createElement('td');
                td.setAttribute('style', 'padding: 0 4px; vertical-align: top; border: none !important; background: transparent !important;');
                td.appendChild(child);
                // Update child width to 100% since it's now bound by TD
                if (child.tagName === 'IMG') {
                    const currentStyle = child.getAttribute('style') || '';
                    child.setAttribute('style', currentStyle.replace(/width:\s*[^;]+;?/g, '') + ' width: 100% !important; display: block; margin: 0 auto;');
                }
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
            table.appendChild(tbody);
            node.parentNode?.replaceChild(table, node);
        } else if (isFlexNode) {
            // Non-image flex items just get stripped of flex.
            node.setAttribute('style', style.replace(/display:\s*flex;?/g, 'display: block;'));
        }
    });

    // 3. List Item Flattening
    // WeChat notoriously misrenders heavily nested <li> formatting, flattening the inner structure helps
    const listItems = section.querySelectorAll('li');
    listItems.forEach(li => {
        const hasBlockChildren = Array.from(li.children).some(child =>
            ['P', 'DIV', 'UL', 'OL', 'BLOCKQUOTE'].includes(child.tagName)
        );
        if (hasBlockChildren) {
            // We only want to clean inner tags if it's overly complex, 
            // but flattening everything might kill <strong> or <em>.
            // Let's just strip 'p' inside 'li' by replacing <p> with <span>
            const ps = li.querySelectorAll('p');
            ps.forEach(p => {
                const span = doc.createElement('span');
                span.innerHTML = p.innerHTML;
                const pStyle = p.getAttribute('style');
                if (pStyle) span.setAttribute('style', pStyle);
                p.parentNode?.replaceChild(span, p);
            });
        }
    });

    // 4. Force Inheritance
    // WeChat's editor aggressively overrides inherited fonts on <p>, <li>, etc.
    // So we manually distribute the container's font properties to all individual blocks.
    const fontMatch = containerStyle.match(/font-family:\s*([^;]+);/);
    const sizeMatch = containerStyle.match(/font-size:\s*([^;]+);/);
    const colorMatch = containerStyle.match(/color:\s*([^;]+);/);
    const lineHeightMatch = containerStyle.match(/line-height:\s*([^;]+);/);

    // We only enforce on specific text tags that WeChat likes to hijack
    const textNodes = section.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, blockquote, span');
    textNodes.forEach(node => {
        // Preserve code highlighting tokens inside code blocks.
        if (node.tagName === 'SPAN' && node.closest('pre, code')) return;

        let currentStyle = node.getAttribute('style') || '';

        if (fontMatch && !currentStyle.includes('font-family:')) {
            currentStyle += ` font-family: ${fontMatch[1]};`;
        }
        if (lineHeightMatch && !currentStyle.includes('line-height:')) {
            currentStyle += ` line-height: ${lineHeightMatch[1]};`;
        }
        // Add font-size if not present (only for standard text nodes so we don't shrink headings)
        if (sizeMatch && !currentStyle.includes('font-size:') && ['P', 'LI', 'BLOCKQUOTE', 'SPAN'].includes(node.tagName)) {
            currentStyle += ` font-size: ${sizeMatch[1]};`;
        }
        if (colorMatch && !currentStyle.includes('color:')) {
            currentStyle += ` color: ${colorMatch[1]};`;
        }

        node.setAttribute('style', currentStyle.trim());
    });

    // 4.5 Normalize spacing for Latin-heavy text blocks.
    // Positive letter-spacing (e.g. 0.2em) designed for CJK readability causes
    // visibly excessive gaps in English text because it applies after every
    // character *including* space characters. Combined with word-spacing and
    // text-align:justify the effect compounds dramatically in WeChat's editor.
    // Strip these properties when the Latin character ratio exceeds a threshold.
    const LATIN_RATIO_THRESHOLD = 0.3;
    const stripSpacing = (style: string): string =>
        style
            .replace(/letter-spacing\s*:\s*[^;]+;?/g, '')
            .replace(/word-spacing\s*:\s*[^;]+;?/g, '')
            .replace(/;\s*;/g, ';')
            .trim();

    const spacingBlocks = section.querySelectorAll('p, li, blockquote');
    spacingBlocks.forEach(node => {
        const text = node.textContent || '';
        if (!text) return;
        const latinChars = (text.match(/[A-Za-z0-9]/g) || []).length;
        const ratio = latinChars / text.length;
        if (ratio <= LATIN_RATIO_THRESHOLD) return;

        // Reset spacing on the block element itself
        let currentStyle = node.getAttribute('style') || '';
        node.setAttribute('style', stripSpacing(currentStyle));

        // Also reset spacing on inline children that may carry their own values
        node.querySelectorAll('em, strong, b, i, span, a').forEach(child => {
            const childStyle = child.getAttribute('style') || '';
            if (childStyle) {
                child.setAttribute('style', stripSpacing(childStyle));
            }
        });
    });

    // 4.7 WeChat CSS Property Degradation.
    // WeChat strips or ignores many CSS properties. Degrade them to
    // WeChat-safe alternatives so the visual output stays intact.
    section.querySelectorAll('*').forEach(node => {
        let style = node.getAttribute('style') || '';
        if (!style) return;
        const tag = node.tagName;

        // (a) Gradient → solid color fallback.
        // WeChat strips background-image entirely, including gradients.
        if (/background(?:-image)?\s*:\s*[^;]*(?:linear|radial)-gradient/i.test(style)) {
            // Extract first usable color from the gradient as fallback
            const colorMatch = style.match(/(?:rgba?\([^)]+\)|#[0-9a-fA-F]{3,8})/);
            const fallback = colorMatch ? colorMatch[0] : '#e0e0e0';

            if (tag === 'HR') {
                // HR with gradient becomes a solid border-top line
                style = style
                    .replace(/background(?:-image)?\s*:\s*[^;]+;?/g, '')
                    .replace(/border\s*:\s*none;?/g, '');
                style += ` border: none; border-top: 1px solid ${fallback}; height: 0;`;
            } else {
                style = style.replace(/background(?:-image)?\s*:\s*[^;]+;?/g, '');
                style += ` background-color: ${fallback};`;
            }
        }

        // (b) display: table → display: block + centering.
        // WeChat strips display:table on non-table elements (used for heading centering).
        if (style.includes('display: table') || style.includes('display:table')) {
            style = style.replace(/display\s*:\s*table\s*;?/g, 'display: block; text-align: center;');
        }

        // (c) Strip properties WeChat silently ignores — avoids dead CSS clutter
        // and prevents edge-case rendering bugs.
        style = style
            .replace(/box-shadow\s*:\s*[^;]+;?/g, '')
            .replace(/text-shadow\s*:\s*[^;]+;?/g, '')
            .replace(/font-variant\s*:\s*[^;]+;?/g, '')
            .replace(/object-fit\s*:\s*[^;]+;?/g, '')
            .replace(/text-decoration-color\s*:\s*[^;]+;?/g, '')
            .replace(/text-underline-offset\s*:\s*[^;]+;?/g, '')
            .replace(/;\s*;/g, ';')
            .trim();

        node.setAttribute('style', style);
    });

    // (d) Code blocks: WeChat does not support overflow-x:auto horizontal scroll.
    // Force line wrapping instead of truncation.
    section.querySelectorAll('pre').forEach(pre => {
        const style = pre.getAttribute('style') || '';
        const degraded = style
            .replace(/overflow-x\s*:\s*auto;?/g, '')
            .replace(/overflow\s*:\s*auto;?/g, '')
            + ' white-space: pre-wrap; word-wrap: break-word; overflow: visible;';
        pre.setAttribute('style', degraded.trim());
    });

    // Keep CJK punctuation attached to preceding inline emphasis in WeChat.
    // Example: <strong>标题</strong>：说明 -> <strong>标题：</strong>说明
    const inlineNodes = section.querySelectorAll('strong, b, em, span, a, code');
    inlineNodes.forEach(node => {
        const next = node.nextSibling;
        if (!next || next.nodeType !== Node.TEXT_NODE) return;
        const text = next.textContent || '';
        const match = text.match(/^\s*([：；，。！？、:])([\s\S]*)$/);
        if (!match) return;

        const punct = match[1];
        const rest = match[2] || '';
        node.appendChild(doc.createTextNode(punct));
        if (rest) {
            next.textContent = rest;
        } else {
            next.parentNode?.removeChild(next);
        }
    });

    // 5. Convert hyperlinks to footnote references.
    // WeChat strips <a> tags on paste, silently losing URLs.
    // Replace each link with its visible text + superscript number,
    // then append a "引用链接" section listing all URLs.
    const anchors = Array.from(section.querySelectorAll('a'));
    const collectedLinks: { text: string; url: string }[] = [];

    anchors.forEach(a => {
        if (a.closest('pre, code')) return;
        const href = a.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

        const linkText = a.textContent?.trim() || '';
        if (!linkText) return;

        collectedLinks.push({ text: linkText, url: href });
        const refIndex = collectedLinks.length;

        const span = doc.createElement('span');
        const aStyle = a.getAttribute('style') || '';
        // Keep the link's text color but strip border-bottom so it doesn't
        // look like a broken hyperlink in WeChat.
        const colorMatch = aStyle.match(/color\s*:\s*[^;]+;?/);
        if (colorMatch) span.setAttribute('style', colorMatch[0]);
        span.textContent = linkText;

        const sup = doc.createElement('sup');
        sup.setAttribute(
            'style',
            'font-size: 0.75em; color: #888; margin-left: 1px; vertical-align: super;'
        );
        sup.textContent = `[${refIndex}]`;

        const wrapper = doc.createElement('span');
        wrapper.appendChild(span);
        wrapper.appendChild(sup);
        a.parentNode?.replaceChild(wrapper, a);
    });

    if (collectedLinks.length > 0) {
        const refSection = doc.createElement('section');
        refSection.setAttribute(
            'style',
            'margin-top: 24px; padding-top: 12px; border-top: 1px solid #eee; font-size: 12px; color: #888; line-height: 1.8;'
        );

        const refTitle = doc.createElement('p');
        refTitle.setAttribute(
            'style',
            'font-size: 13px; font-weight: bold; color: #666; margin: 0 0 8px;'
        );
        refTitle.textContent = '引用链接';
        refSection.appendChild(refTitle);

        collectedLinks.forEach((link, i) => {
            const item = doc.createElement('p');
            item.setAttribute(
                'style',
                'margin: 2px 0; font-size: 12px; color: #888; word-break: break-all;'
            );
            item.textContent = `[${i + 1}] ${link.text}: ${link.url}`;
            refSection.appendChild(item);
        });

        section.appendChild(refSection);
    }

    // 6. Convert all images to Base64 (batched, max 3 concurrent to respect browser limits)
    const imgs = Array.from(section.querySelectorAll('img'));
    const BATCH_SIZE = 3;
    for (let i = 0; i < imgs.length; i += BATCH_SIZE) {
        const batch = imgs.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async img => {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('data:')) {
                const base64 = await getBase64Image(src);
                if (base64.length > 2_000_000) {
                    console.warn(
                        `[wechatCompat] Oversized Base64 image (${base64.length} chars, ~${(base64.length / 1_000_000).toFixed(1)}MB) from: ${src}`
                    );
                }
                img.setAttribute('src', base64);
            }
        }));
    }

    doc.body.innerHTML = '';
    doc.body.appendChild(section);

    // Prevent WeChat from breaking lines between inline emphasis and leading CJK punctuation.
    // Example: </strong>： should stay on the same line.
    let outputHtml = doc.body.innerHTML;
    outputHtml = outputHtml.replace(/(<\/(?:strong|b|em|span|a|code)>)\s*([：；，。！？、])/g, '$1\u2060$2');

    return outputHtml;
}

/**
 * Convert all <a> hyperlinks in the HTML to footnote-style references.
 * WeChat strips <a> tags on paste, silently losing URLs.
 * This function replaces each link with its visible text + a superscript
 * number, and appends a "引用链接" section listing all URLs as plain text.
 *
 * Safe to call on any HTML — if no links are found, the input is returned
 * unchanged.
 */
export function convertLinksToFootnotes(html: string): string {
    if (typeof window === 'undefined') return html;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const anchors = Array.from(doc.querySelectorAll('a'));
    const collectedLinks: { text: string; url: string }[] = [];

    anchors.forEach(a => {
        if (a.closest('pre, code')) return;
        const href = a.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

        const linkText = a.textContent?.trim() || '';
        if (!linkText) return;

        collectedLinks.push({ text: linkText, url: href });
        const refIndex = collectedLinks.length;

        const span = doc.createElement('span');
        const aStyle = a.getAttribute('style') || '';
        const colorMatch = aStyle.match(/color\s*:\s*[^;]+;?/);
        if (colorMatch) span.setAttribute('style', colorMatch[0]);
        span.textContent = linkText;

        const sup = doc.createElement('sup');
        sup.setAttribute(
            'style',
            'font-size: 0.75em; color: #888; margin-left: 1px; vertical-align: super;'
        );
        sup.textContent = `[${refIndex}]`;

        const wrapper = doc.createElement('span');
        wrapper.appendChild(span);
        wrapper.appendChild(sup);
        a.parentNode?.replaceChild(wrapper, a);
    });

    if (collectedLinks.length === 0) return html;

    const refSection = doc.createElement('section');
    refSection.setAttribute(
        'style',
        'margin-top: 24px; padding-top: 12px; border-top: 1px solid #eee; font-size: 12px; color: #888; line-height: 1.8;'
    );

    const refTitle = doc.createElement('p');
    refTitle.setAttribute(
        'style',
        'font-size: 13px; font-weight: bold; color: #666; margin: 0 0 8px;'
    );
    refTitle.textContent = '引用链接';
    refSection.appendChild(refTitle);

    collectedLinks.forEach((link, i) => {
        const item = doc.createElement('p');
        item.setAttribute(
            'style',
            'margin: 2px 0; font-size: 12px; color: #888; word-break: break-all;'
        );
        item.textContent = `[${i + 1}] ${link.text}: ${link.url}`;
        refSection.appendChild(item);
    });

    doc.body.appendChild(refSection);
    return doc.body.innerHTML;
}

// ── Dark-theme detection ──

/** Parse a CSS color string into [r, g, b] (0–255). Returns null on failure. */
function parseColor(raw: string): [number, number, number] | null {
    const s = raw.trim();
    // #hex
    const hex = s.match(/^#([0-9a-f]{3,8})$/i);
    if (hex) {
        let h = hex[1];
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        if (h.length >= 6) {
            return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
        }
    }
    // rgb / rgba
    const rgb = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgb) return [+rgb[1], +rgb[2], +rgb[3]];
    return null;
}

function luminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map(c => {
        c /= 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Returns true when the theme has a dark background color that WeChat is
 * likely to strip, causing light-colored text to become invisible on
 * WeChat's default white article background.
 */
export function isWeChatDarkThemeRisk(themeId: string): boolean {
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme) return false;
    const container = theme.styles.container || '';
    const bgMatch = container.match(/background-color\s*:\s*([^;]+)/);
    if (!bgMatch) return false;
    const rgb = parseColor(bgMatch[1]);
    if (!rgb) return false;
    return luminance(rgb[0], rgb[1], rgb[2]) < 0.3;
}

/**
 * Build the final copy-ready HTML for clipboard.
 * Shared by PreviewPane and TopNav so both produce identical output.
 */
export async function buildCopyHtml(
    html: string,
    themeId: string,
    isPresetTheme: boolean,
    customThemeCss: string,
    statsHtml: string,
): Promise<string> {
    let content: string;
    if (isPresetTheme) {
        content = await makeWeChatCompatible(html, themeId);
    } else {
        content = convertLinksToFootnotes(`<style>${customThemeCss}</style>${html}`);
    }
    if (statsHtml) {
        content = statsHtml + content;
    }
    return content;
}
