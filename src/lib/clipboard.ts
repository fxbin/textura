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

async function copyPlainTextAsFailedRichCopy(text: string): Promise<ClipboardCopyResult> {
  if (!navigator.clipboard?.writeText) {
    return { ok: false, error: new Error('Rich clipboard and plain-text fallback are unavailable.') };
  }

  try {
    await navigator.clipboard.writeText(text);
    return {
      ok: false,
      method: 'text',
      error: new Error('富文本复制不可用，已仅复制纯文本。请检查浏览器剪贴板权限后重试。'),
    };
  } catch (error) {
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

    const textFallback = await copyPlainTextAsFailedRichCopy(text);
    if (textFallback.method === 'text') {
      return textFallback;
    }
    return { ok: false, error: textFallback.error || error };
  }

  const fallback = legacyCopyHtml(html, text);
  if (fallback.ok) {
    return fallback;
  }

  return await copyPlainTextAsFailedRichCopy(text);
}
