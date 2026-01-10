/**
 * Rose Pine color palette
 * https://rosepinetheme.com/palette
 */

export const rosePine = {
  // Base colors (dark theme)
  base: '#191724',
  surface: '#1f1d2e',
  overlay: '#26233a',
  muted: '#6e6a86',
  subtle: '#908caa',
  text: '#e0def4',

  // Accent colors
  love: '#eb6f92', // Rose - used for hearts
  gold: '#f6c177', // Primary actions
  rose: '#ebbcba',
  pine: '#31748f', // Used for comments
  foam: '#9ccfd8',
  iris: '#c4a7e7',

  // Highlight colors
  highlightLow: '#21202e',
  highlightMed: '#403d52',
  highlightHigh: '#524f67',

  // Love highlight colors (brighter, less grey, more love/pink tint)
  loveLow: '#2f1f26',
  loveMed: '#4f2d3a',
  loveHigh: '#6f3d50',

  // Pine highlight colors (brighter, less grey, more pine tint)
  pineLow: '#1f252b',
  pineMed: '#2c3845',
  pineHigh: '#3a4b5f',
} as const;

export const rosePineDawn = {
  // Base colors (light theme)
  base: '#faf4ed',
  surface: '#fffaf3',
  overlay: '#f2e9e1',
  muted: '#9893a5',
  subtle: '#797593',
  text: '#575279',

  // Accent colors (same across themes)
  love: '#b4637a', // Rose - used for hearts
  gold: '#ea9d34', // Primary actions
  rose: '#d7827e',
  pine: '#286983', // Used for comments
  foam: '#56949f',
  iris: '#907aa9',

  // Highlight colors
  highlightLow: '#f4ede8',
  highlightMed: '#dfdad9',
  highlightHigh: '#cecacd',

  // Love highlight colors (brighter, less grey, more love/pink tint)
  loveLow: '#f9eceb',
  loveMed: '#f3d9d9',
  loveHigh: '#edc6c7',

  // Pine highlight colors (brighter, less grey, more pine tint)
  pineLow: '#f0f5f6',
  pineMed: '#e1ebed',
  pineHigh: '#d2e1e4',
} as const;

export interface ColorPalette {
  base: string;
  surface: string;
  overlay: string;
  muted: string;
  subtle: string;
  text: string;
  love: string;
  gold: string;
  rose: string;
  pine: string;
  foam: string;
  iris: string;
  highlightLow: string;
  highlightMed: string;
  highlightHigh: string;
  loveLow: string;
  loveMed: string;
  loveHigh: string;
  pineLow: string;
  pineMed: string;
  pineHigh: string;
}
