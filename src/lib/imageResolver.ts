/**
 * Rewrite relative image paths in HTML to use a base path.
 *
 * When a user writes Markdown with relative image paths (e.g. from VS Code),
 * the browser cannot resolve them because the page URL is not in the same
 * directory as the source files. This function prepends a user-configured
 * base path so the images can be loaded.
 *
 * - Absolute URLs (http://, https://, data:, blob:, //) are left unchanged.
 * - Relative paths (./foo.png, ../foo.png, foo.png) get the base path prepended.
 */
export function resolveImagePaths(html: string, basePath: string): string {
    if (!basePath || typeof window === 'undefined') return html;

    // Normalise: ensure trailing slash
    const base = basePath.endsWith('/') ? basePath : basePath + '/';

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const imgs = doc.querySelectorAll('img');

    imgs.forEach(img => {
        const src = img.getAttribute('src');
        if (!src) return;

        // Skip absolute URLs, data URIs, blob URLs, protocol-relative URLs
        if (/^(https?:\/\/|data:|blob:|\/\/)/.test(src)) return;

        // Skip paths that are already absolute
        if (src.startsWith('/')) return;

        // Strip leading ./ for cleaner concatenation
        const cleanSrc = src.startsWith('./') ? src.slice(2) : src;

        img.setAttribute('src', base + cleanSrc);
    });

    return doc.body.innerHTML;
}
