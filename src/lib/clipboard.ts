export interface ClipboardCopyResult {
  ok: boolean;
  method?: 'clipboard' | 'legacy' | 'text';
  error?: unknown;
}

function legacyCopyHtml(html: string, text: string): ClipboardCopyResult {
  const container = document.createElement('div');
  container.contentEditable = 'true';
  container.setAttribute('aria-hidden', 'true');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.opacity = '0';
  container.innerHTML = html || text;
  document.body.appendChild(container);

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(container);

  selection?.removeAllRanges();
  selection?.addRange(range);

  try {
    const success = document.execCommand('copy');
    selection?.removeAllRanges();
    document.body.removeChild(container);
    return success ? { ok: true, method: 'legacy' } : { ok: false };
  } catch (error) {
    selection?.removeAllRanges();
    document.body.removeChild(container);
    return { ok: false, error };
  }
}

export async function copyRichContent(html: string, text: string): Promise<ClipboardCopyResult> {
  if (typeof window === 'undefined') {
    return { ok: false, error: new Error('Clipboard is unavailable during SSR.') };
  }

  try {
    if (navigator.clipboard && 'write' in navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ]);
      return { ok: true, method: 'clipboard' };
    }
  } catch (error) {
    const fallback = legacyCopyHtml(html, text);
    if (fallback.ok) {
      return fallback;
    }
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return { ok: true, method: 'text' };
      } catch (textError) {
        return { ok: false, error: textError };
      }
    }
    return { ok: false, error };
  }

  const fallback = legacyCopyHtml(html, text);
  if (fallback.ok) {
    return fallback;
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true, method: 'text' };
    } catch (error) {
      return { ok: false, error };
    }
  }

  return { ok: false, error: new Error('Clipboard API and fallback are unavailable.') };
}
