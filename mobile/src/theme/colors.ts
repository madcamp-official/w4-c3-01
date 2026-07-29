// Ported from frontend/src/styles/global.css — keep in sync.
// Palette matches week4_1/ALine.dc.html (v2 design — minimal black/white/red,
// replaces the earlier hand-drawn cream palette). Light is the default export
// used by anything not yet routed through useTheme(); ThemeContext swaps in
// darkColors when the user toggles dark mode.
export interface ThemeColors {
  ink: string;
  inkSoft: string;
  paper: string;
  paper2: string;
  paper3: string;
  border: string;
  line: string;
  muted: string;
  accent: string;
  danger: string;
}

export const lightColors: ThemeColors = {
  ink: '#000000',
  inkSoft: '#847B73',
  paper: '#FFF9F2',
  paper2: '#F7EFE6',
  paper3: '#F1E6DB',
  border: '#E2D6CA',
  line: '#E2D6CA',
  muted: '#91877E',
  accent: '#B23B2E',
  danger: '#B23B2E'
};

export const darkColors: ThemeColors = {
  ink: '#FFFFFF',
  inkSoft: '#8E8E8E',
  paper: '#000000',
  paper2: '#141414',
  paper3: '#141414',
  border: '#333333',
  line: '#333333',
  muted: '#8E8E8E',
  accent: '#B23B2E',
  danger: '#B23B2E'
};

/** Static default (light) palette — for code that hasn't been threaded through useTheme() yet. */
export const colors = lightColors;

export const radius = {
  pill: 999,
  md: 16,
  lg: 18
} as const;
