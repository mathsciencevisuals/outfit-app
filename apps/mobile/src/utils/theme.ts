import { Platform } from 'react-native';
import type { AccentColor, ThemeMode } from '../store/app-store';

// ── Accent palettes ──────────────────────────────────────────────────────────
const ACCENTS: Record<AccentColor, { primary: string; primaryLight: string; primaryDim: string }> = {
  teal:   { primary: '#0f766e', primaryLight: '#14b8a6', primaryDim: '#ccfbf1' },
  purple: { primary: '#7c3aed', primaryLight: '#a78bfa', primaryDim: '#ede9fe' },
  blue:   { primary: '#1d4ed8', primaryLight: '#60a5fa', primaryDim: '#dbeafe' },
  pink:   { primary: '#db2777', primaryLight: '#f472b6', primaryDim: '#fce7f3' },
};

// ── Theme surfaces ────────────────────────────────────────────────────────────
const THEMES: Record<ThemeMode, {
  bg: string; surface: string; surface2: string; surface3: string;
  textPrimary: string; textSecondary: string; textMuted: string;
  border: string; borderStrong: string;
}> = {
  light: {
    bg: '#fffaf5', surface: '#ffffff', surface2: '#f6f1ea', surface3: '#eadfce',
    textPrimary: '#172033', textSecondary: '#52607a', textMuted: '#94a3b8',
    border: '#eadfce', borderStrong: '#d4c5b0',
  },
  dark: {
    bg: '#111827', surface: '#1f2937', surface2: '#374151', surface3: '#4b5563',
    textPrimary: '#f3f4f6', textSecondary: '#9ca3af', textMuted: '#6b7280',
    border: '#374151', borderStrong: '#4b5563',
  },
};

export function getColors(theme: ThemeMode = 'light', accent: AccentColor = 'teal') {
  return {
    ...THEMES[theme],
    ...ACCENTS[accent],
    success: '#16a34a', successDim: '#dcfce7',
    warning: '#d97706', warningDim: '#fef3c7',
    error:   '#dc2626', errorDim:   '#fee2e2',
    white:   '#ffffff', black: '#000000',
    overlay: 'rgba(0,0,0,0.45)',
  };
}

// Default colours (light + teal) — used where hook not available
export const Colors = getColors('light', 'teal');

export const Spacing = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32, xxxl: 48,
} as const;

export const Radius = {
  sm: 8, md: 12, lg: 16, xl: 24, full: 9999,
} as const;

export const FontSize = {
  xs: 11, sm: 13, base: 15, md: 17, lg: 20, xl: 24, xxl: 30,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium:  '500' as const,
  semibold:'600' as const,
  bold:    '700' as const,
};

export const Shadow = {
  sm: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8 },
    android: { elevation: 5 },
  }),
} as const;
