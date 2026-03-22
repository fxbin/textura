import type { Theme, ThemePreview } from './types';

function extractStyle(styleStr: string, prop: string): string | null {
  const regex = new RegExp(`${prop}\\s*:\\s*([^;!]+)`, 'i');
  const match = styleStr.match(regex);
  return match ? match[1].trim() : null;
}

function extractColorFromShorthand(styleStr: string, prop: string): string | null {
  const value = extractStyle(styleStr, prop);
  if (!value) {
    return null;
  }

  const colorMatch = value.match(/(rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-fA-F]{3,8})/);
  return colorMatch ? colorMatch[1] : null;
}

function firstNonNull(...values: Array<string | null>) {
  return values.find(Boolean) || null;
}

export function buildThemePreview(styles: Record<string, string>): ThemePreview {
  const background = firstNonNull(
    extractStyle(styles.container || '', 'background-color'),
    extractColorFromShorthand(styles.container || '', 'background'),
    extractStyle(styles.blockquote || '', 'background-color'),
    extractColorFromShorthand(styles.blockquote || '', 'background'),
    extractStyle(styles.pre || '', 'background-color'),
    extractColorFromShorthand(styles.pre || '', 'background'),
    '#ffffff'
  )!;

  const text = firstNonNull(
    extractStyle(styles.p || '', 'color'),
    extractStyle(styles.container || '', 'color'),
    extractStyle(styles.li || '', 'color'),
    '#333333'
  )!;

  const heading = firstNonNull(
    extractStyle(styles.h1 || '', 'color'),
    extractStyle(styles.h2 || '', 'color'),
    extractStyle(styles.h3 || '', 'color'),
    text
  )!;

  const accent = firstNonNull(
    extractStyle(styles.a || '', 'color'),
    extractStyle(styles.strong || '', 'color'),
    extractColorFromShorthand(styles.h2 || '', 'border-left'),
    extractColorFromShorthand(styles.h1 || '', 'border-bottom'),
    extractColorFromShorthand(styles.h3 || '', 'border-left'),
    extractColorFromShorthand(styles.blockquote || '', 'border-left'),
    extractStyle(styles.blockquote || '', 'border-left-color'),
    extractColorFromShorthand(styles.h2 || '', 'background'),
    extractStyle(styles.h2 || '', 'background-color'),
    heading
  )!;

  return {
    background,
    text,
    heading,
    accent,
  };
}

const themePreviewOverrides: Record<string, Partial<ThemePreview>> = {
  'red-accent-classic': {
    background: '#FBF9FD',
    accent: 'rgb(248,57,41)',
  },
  'blue-accent-classic': {
    background: '#F4F8FB',
    accent: 'rgb(0, 82, 204)',
  },
  'green-accent-classic': {
    background: '#F0F9F0',
    accent: 'rgb(0, 128, 0)',
  },
  'purple-accent-classic': {
    background: '#F9F0F9',
    accent: 'rgb(128, 0, 128)',
  },
  'orange-accent-classic': {
    background: '#FFF8F0',
    accent: 'rgb(255, 140, 0)',
  },
  linear: {
    heading: '#f1f1f2',
  },
  notion: {
    accent: '#37352f',
  },
};

export function withResolvedThemePreview(theme: Theme): Theme {
  return {
    ...theme,
    preview: {
      ...buildThemePreview(theme.styles),
      ...themePreviewOverrides[theme.id],
    },
  };
}

export function withResolvedThemePreviews(themes: Theme[]) {
  return themes.map(withResolvedThemePreview);
}
