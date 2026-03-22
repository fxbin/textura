import type { Theme } from './types';
import { classicThemes } from './classic';
import { modernThemes } from './modern';
import { extraThemes } from './extra';
import { mdMainThemes } from './md-main';
import { redAccentThemes } from './red-accent';
import { blueAccentThemes, greenAccentThemes, purpleAccentThemes, orangeAccentThemes } from './color-variants';
import { withResolvedThemePreviews } from './preview';

export type { Theme };

const classicGroupThemes = withResolvedThemePreviews([
  ...classicThemes,
  ...redAccentThemes,
  ...blueAccentThemes,
  ...greenAccentThemes,
  ...purpleAccentThemes,
  ...orangeAccentThemes,
]);

const modernGroupThemes = withResolvedThemePreviews(modernThemes);
const extraGroupThemes = withResolvedThemePreviews(extraThemes);
const mdGroupThemes = withResolvedThemePreviews(mdMainThemes);

export const THEMES: Theme[] = [
  ...classicGroupThemes,
  ...modernGroupThemes,
  ...extraGroupThemes,
  ...mdGroupThemes,
];

export interface ThemeGroup {
  label: string;
  themes: Theme[];
}

export const THEME_GROUPS: ThemeGroup[] = [
  { label: '经典', themes: classicGroupThemes },
  { label: '潮流', themes: modernGroupThemes },
  { label: 'MD 系列', themes: mdGroupThemes },
  { label: '更多风格', themes: extraGroupThemes },
];
