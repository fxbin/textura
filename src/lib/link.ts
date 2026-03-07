import { open } from '@tauri-apps/plugin-shell';
import { isTauri } from '@tauri-apps/api/core';

/**
 * Open an external link in the default browser.
 * Supports both Web and Tauri environments.
 */
export async function openExternalLink(url: string) {
  if (isTauri()) {
    try {
      await open(url);
    } catch (e) {
      console.error('Failed to open link via Tauri shell:', e);
      // Fallback
      window.open(url, '_blank');
    }
  } else {
    window.open(url, '_blank');
  }
}
