import type { Theme } from './types';
import { classicThemes } from './classic';
import { modernThemes } from './modern';
import { extraThemes } from './extra';
import { mdMainThemes } from './md-main';
import { redAccentThemes } from './red-accent';
import { blueAccentThemes, greenAccentThemes, purpleAccentThemes, orangeAccentThemes } from './color-variants';

export type { Theme };
export const THEMES: Theme[] = [
  ...classicThemes, 
  ...redAccentThemes, 
  ...blueAccentThemes, 
  ...greenAccentThemes, 
  ...purpleAccentThemes, 
  ...orangeAccentThemes,
  ...modernThemes, 
  ...extraThemes, 
  ...mdMainThemes
];

export interface ThemeGroup {
  label: string;
  themes: Theme[];
}

export const THEME_GROUPS: ThemeGroup[] = [
  { label: '经典', themes: [...classicThemes, ...redAccentThemes, ...blueAccentThemes, ...greenAccentThemes, ...purpleAccentThemes, ...orangeAccentThemes] },
  { label: '潮流', themes: modernThemes },
  { label: 'MD 系列', themes: mdMainThemes },
  { label: '更多风格', themes: extraThemes },
];
