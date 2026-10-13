import { Color } from 'expo-router';
import { Platform, useColorScheme, type ColorValue, type TextStyle } from 'react-native';

const brandPalette = {
  light: {
    primary: '#334537',
    primaryText: '#FAF8F5',
    powder: '#F3EFEA',
    display: '#232321',
    script: '#8C6D62',
    gold: '#C5A880',
    goldSoft: '#F1E5CE',
  },
  dark: {
    primary: '#B7CCB9',
    primaryText: '#1C211D',
    powder: '#28312A',
    display: '#F7F3EC',
    script: '#E4BEB1',
    gold: '#E0C298',
    goldSoft: '#584A34',
  },
} as const;

export const semanticColors = {
  label: Platform.select<ColorValue>({
    android: Color?.android?.dynamic?.onSurface ?? '#232321',
    default: '#232321',
  })!,
  secondaryLabel: Platform.select<ColorValue>({
    android: Color?.android?.dynamic?.onSurfaceVariant ?? '#62645F',
    default: '#62645F',
  })!,
  background: Platform.select<ColorValue>({
    android: Color?.android?.dynamic?.surface ?? '#FAF8F5',
    default: '#FAF8F5',
  })!,
  secondaryBackground: Platform.select<ColorValue>({
    android: Color?.android?.dynamic?.surfaceVariant ?? '#F3EFEA',
    default: '#F3EFEA',
  })!,
  separator: Platform.select<ColorValue>({
    android: Color?.android?.dynamic?.outlineVariant ?? '#D7D4CC',
    default: '#D7D4CC',
  })!,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 14,
  full: 999,
} as const;

export const type = {
  largeTitle: { fontSize: 34, fontWeight: '700', lineHeight: 44 } satisfies TextStyle,
  title: { fontSize: 22, fontWeight: '700', lineHeight: 28 } satisfies TextStyle,
  headline: { fontSize: 17, fontWeight: '700', lineHeight: 22 } satisfies TextStyle,
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 } satisfies TextStyle,
  subhead: { fontSize: 14, fontWeight: '500', lineHeight: 20 } satisfies TextStyle,
  caption: { fontSize: 12, fontWeight: '500', lineHeight: 16 } satisfies TextStyle,
} as const;

export const v0Tokens = {
  light: {
    canvas: '#FAF8F5',
    surface: '#FFFFFF',
    surfaceMuted: '#F3EFEA',
    primary: '#334537',
    primaryPressed: '#243B2A',
    onPrimary: '#FFFFFF',
    sage: '#4A5D4E',
    champagne: '#C5A880',
    earth: '#8C6D62',
    text: '#232321',
    muted: '#62645F',
    rule: 'rgba(74, 93, 78, 0.14)',
    premium: 'rgba(197, 168, 128, 0.42)',
    tagSuccessBg: '#E7EEE7',
    tagSuccessText: '#4A5D4E',
    tagWarmBg: '#F1E9DF',
    tagWarmText: '#795E52',
    previewBg: '#E9DFD1',
    previewArt: '#FBF8F1',
    border: 'rgba(74, 93, 78, 0.14)',
    calloutBg: '#F3EFEA',
    calloutText: '#232321',
    revisionAlertBg: '#EDF0EA',
  },
  dark: {
    canvas: '#1C211D',
    surface: '#28312A',
    surfaceMuted: '#313B32',
    primary: '#B7CCB9',
    primaryPressed: '#D5E3D5',
    onPrimary: '#1C211D',
    sage: '#B7CCB9',
    champagne: '#E0C298',
    earth: '#E4BEB1',
    text: '#F7F3EC',
    muted: '#C9CDC6',
    rule: 'rgba(201, 205, 198, 0.16)',
    premium: 'rgba(224, 194, 152, 0.42)',
    tagSuccessBg: '#35483B',
    tagSuccessText: '#C9DFCB',
    tagWarmBg: '#4A4035',
    tagWarmText: '#ECD2B1',
    previewBg: '#2D352E',
    previewArt: '#202820',
    border: 'rgba(201, 205, 198, 0.16)',
    calloutBg: '#28312A',
    calloutText: '#F7F3EC',
    revisionAlertBg: '#28312A',
  },
} as const;

export type ThemeTokens = (typeof v0Tokens)['light'];

export function useWeddingTheme() {
  const colorScheme = useColorScheme();
  const mode = colorScheme === 'dark' ? 'dark' : 'light';
  const brand = brandPalette[mode];
  const tokens = v0Tokens[mode];

  return { brand, colors: semanticColors, tokens, mode } as const;
}
