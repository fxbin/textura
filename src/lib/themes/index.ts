import type { Theme } from './types';
import { classicThemes } from './classic';
import { modernThemes } from './modern';
import { extraThemes } from './extra';
import { mdMainThemes } from './md-main';

export type { Theme };
export const THEMES: Theme[] = [...classicThemes, ...modernThemes, ...extraThemes, ...mdMainThemes];

export interface ThemeGroup {
  label: string;
  themes: Theme[];
}

export const THEME_GROUPS: ThemeGroup[] = [
  { label: '经典', themes: classicThemes },
  { label: '潮流', themes: modernThemes },
  { label: '更多风格', themes: extraThemes },
  { label: 'MD 系列', themes: mdMainThemes },
];
