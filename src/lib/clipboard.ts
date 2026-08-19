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

    return {
      ok: false,
      error: error instanceof Error
        ? error
        : new Error('富文本复制不可用，请检查浏览器剪贴板权限。'),
    };
  }

  const fallback = legacyCopyHtml(html, text);
  if (fallback.ok) {
    return fallback;
  }

  // 不再静默降级到 writeText：纯文本复制会让 UI 误报“可直接粘贴到公众号”，
  // 但主题样式实际上已经全部丢失。富文本不可用时明确返回失败。
  return {
    ok: false,
    error: new Error('当前浏览器不支持富文本剪贴板，请检查权限或更换浏览器后重试。'),
  };
}
