export interface ThemePreview {
  background: string;
  text: string;
  heading: string;
  accent: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  styles: Record<string, string>;
  preview?: ThemePreview;
}
