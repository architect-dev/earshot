import { rosePine, rosePineDawn, type ColorPalette } from './colors';
import { spacing, fontSize, fontWeight, borderWidth } from './tokens';

export type ThemeMode = 'dark' | 'light';

export interface Theme {
  mode: ThemeMode;
  colors: ColorPalette;
  spacing: typeof spacing;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  borderWidth: typeof borderWidth;
}

export const darkTheme: Theme = {
  mode: 'dark',
  colors: rosePine,
  spacing,
  fontSize,
  fontWeight,
  borderWidth,
};

export const lightTheme: Theme = {
  mode: 'light',
  colors: rosePineDawn,
  spacing,
  fontSize,
  fontWeight,
  borderWidth,
};

export { rosePine, rosePineDawn, spacing, fontSize, fontWeight, borderWidth };
export type { ColorPalette };
