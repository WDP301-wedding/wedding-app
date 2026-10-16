import type { TextStyle } from 'react-native';

/** Hỷ Yến v1.0 — values transcribed from the supplied shared design system. */
export const hy = {
  canvas: '#FFF8F1',
  surface: '#FFFFFF',
  surfaceMuted: '#F7EDE4',
  primary: '#7A1F3D',
  primaryPressed: '#5C1430',
  primarySoft: '#F5E4E9',
  peach: '#F4B9A7',
  gold: '#C9A46A',
  ink: '#2B1D22',
  secondary: '#4A3A40',
  muted: '#6E5D63',
  outline: '#9A877F',
  rule: '#EADFD6',
  success: '#2F6B4F',
  successBg: '#E7F1EA',
  warning: '#8A5300',
  warningBg: '#FCEFD6',
  error: '#C62828',
  errorBg: '#FDECEA',
  info: '#3F5B6B',
  infoBg: '#E9EFF2',
  scrim: 'rgba(43,29,34,0.4)',
  body: 'HyBody',
  medium: 'HyBody500',
  semibold: 'HyBody600',
  bold: 'HyBody700',
  display: 'HyBody700',
  monogram: 'HyDisplay',
} as const;
export const motion = {
  fast: 150,
  standard: 250,
  emphasized: 300,
  sheet: 350,
  exit: 400,
  stagger: 50,
  ease: [0.2, 0, 0, 1] as const,
};
const brand = {
  primary: hy.primary,
  primaryText: '#FFFFFF',
  powder: hy.surfaceMuted,
  display: hy.ink,
  script: hy.primary,
  gold: hy.gold,
  goldSoft: hy.warningBg,
};
export const semanticColors = {
  label: hy.ink,
  secondaryLabel: hy.secondary,
  background: hy.canvas,
  secondaryBackground: hy.surface,
  separator: hy.rule,
};
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 12, md: 12, lg: 16, xl: 24, full: 999 } as const;
export const type = {
  largeTitle: {
    fontFamily: hy.bold,
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 38,
  } satisfies TextStyle,
  title: {
    fontFamily: hy.bold,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  } satisfies TextStyle,
  headline: {
    fontFamily: hy.semibold,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
  } satisfies TextStyle,
  body: {
    fontFamily: hy.body,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  } satisfies TextStyle,
  subhead: {
    fontFamily: hy.medium,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
  } satisfies TextStyle,
  caption: {
    fontFamily: hy.body,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  } satisfies TextStyle,
} as const;
const tokens = {
  canvas: hy.canvas,
  surface: hy.surface,
  surfaceMuted: hy.surfaceMuted,
  primary: hy.primary,
  primaryPressed: hy.primaryPressed,
  onPrimary: '#FFFFFF',
  sage: hy.secondary,
  champagne: hy.gold,
  earth: hy.muted,
  text: hy.ink,
  muted: hy.muted,
  rule: hy.rule,
  premium: hy.rule,
  tagSuccessBg: hy.successBg,
  tagSuccessText: hy.success,
  tagWarmBg: hy.warningBg,
  tagWarmText: hy.warning,
  previewBg: hy.surfaceMuted,
  previewArt: hy.canvas,
  border: hy.rule,
  calloutBg: hy.primarySoft,
  calloutText: hy.primaryPressed,
  revisionAlertBg: hy.warningBg,
};
export type ThemeTokens = typeof tokens;
export function useWeddingTheme() {
  return { brand, colors: semanticColors, tokens, mode: 'light' } as const;
}
