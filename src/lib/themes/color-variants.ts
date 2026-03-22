import type { Theme } from './types';
import { redAccentThemes } from './red-accent';

// Helper to create color variants dynamically
const createThemeVariant = (
  baseThemeId: string,
  newId: string,
  newName: string,
  newDesc: string,
  primaryColor: string,
  secondaryColor: string,
  bgColor: string // Light background for blockquotes
): Theme => {
  const baseTheme = redAccentThemes[0];
  const styles = { ...baseTheme.styles };

  // Base colors to replace
  const BASE_PRIMARY = 'rgb(248, 57, 41)'; // Red
  const BASE_SECONDARY = '#ff3502';      // Light Red
  const BASE_BG = '#FBF9FD';             // Light Background
  const BASE_BORDER_QUOTE = '#e34c3c';   // Quote Border (Red)
  const BASE_PRIMARY_RGB_REGEX = /rgb\(\s*248\s*,\s*57\s*,\s*41\s*\)/gi;

  const newStyles: Record<string, string> = {};

  for (const [key, value] of Object.entries(styles)) {
    let newValue = value;
    // Replace all occurrences
    newValue = newValue.replace(BASE_PRIMARY_RGB_REGEX, primaryColor);
    newValue = newValue.replaceAll(BASE_PRIMARY, primaryColor);
    newValue = newValue.replaceAll(BASE_SECONDARY, secondaryColor);
    newValue = newValue.replaceAll(BASE_BG, bgColor);
    newValue = newValue.replaceAll(BASE_BORDER_QUOTE, primaryColor);
    
    // Special handling for gradient in hr
    if (key === 'hr') {
        // Construct new gradient
        // linear-gradient(to right, rgba(R,G,B,0), rgba(R,G,B,0.75), rgba(R,G,B,0))
        // We need to convert hex/rgb to rgba strings if possible, or just replace the rgb() part
        // The regex replacement above handles `rgb(...)` format.
        // But if `primaryColor` is hex, we might have an issue in `rgba`.
        // For simplicity, we assume primaryColor provided is in `rgb(...)` format for now,
        // or we manually reconstruct the hr style.
        
        // Let's manually set hr style to be safe
        const rgbValues = primaryColor.match(/\d+, ?\d+, ?\d+/)?.[0] || '0,0,0';
        newValue = `height: 1px; padding: 0; border: none; border-top: 1px solid #333; text-align: center; background-image: linear-gradient(to right, rgba(${rgbValues},0), rgba(${rgbValues},0.75), rgba(${rgbValues},0)); margin: 20px 0;`;
    }

    newStyles[key] = newValue;
  }

  return {
    id: newId,
    name: newName,
    description: newDesc,
    styles: newStyles
  };
};

export const blueAccentThemes: Theme[] = [
  createThemeVariant(
    'red-accent-classic',
    'blue-accent-classic',
    '深蓝经典',
    '沉稳的深蓝配色，适合商务与科技类文档',
    'rgb(0, 82, 204)',
    '#0052cc',
    '#F4F8FB'
  )
];

export const greenAccentThemes: Theme[] = [
  createThemeVariant(
    'red-accent-classic',
    'green-accent-classic',
    '墨绿经典',
    '清新的墨绿配色，适合文艺与生活类文档',
    'rgb(0, 128, 0)',
    '#008000',
    '#F0F9F0'
  )
];

export const purpleAccentThemes: Theme[] = [
  createThemeVariant(
    'red-accent-classic',
    'purple-accent-classic',
    '雅紫经典',
    '优雅的紫色配色，适合情感与时尚类文档',
    'rgb(128, 0, 128)',
    '#800080',
    '#F9F0F9'
  )
];

export const orangeAccentThemes: Theme[] = [
  createThemeVariant(
    'red-accent-classic',
    'orange-accent-classic',
    '暖橙经典',
    '温暖的橙色配色，适合活力与创意类文档',
    'rgb(255, 140, 0)',
    '#ff8c00',
    '#FFF8F0'
  )
];
