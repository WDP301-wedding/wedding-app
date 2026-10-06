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
    android: Color.android.dynamic.onSurface,
    default: '#232321',
  })!,
  secondaryLabel: Platform.select<ColorValue>({
    android: Color.android.dynamic.onSurfaceVariant,
    default: '#62645F',
  })!,
  background: Platform.select<ColorValue>({
    android: Color.android.dynamic.surface,
    default: '#FAF8F5',
  })!,
  secondaryBackground: Platform.select<ColorValue>({
    android: Color.android.dynamic.surfaceVariant,
    default: '#F3EFEA',
  })!,
  separator: Platform.select<ColorValue>({
    android: Color.android.dynamic.outlineVariant,
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
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: -0.8 } satisfies TextStyle,
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.35 } satisfies TextStyle,
  headline: { fontSize: 17, fontWeight: '700' } satisfies TextStyle,
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 } satisfies TextStyle,
  subhead: { fontSize: 14, fontWeight: '500', lineHeight: 20 } satisfies TextStyle,
  caption: { fontSize: 12, fontWeight: '500', lineHeight: 16 } satisfies TextStyle,
} as const;

export function useWeddingTheme() {
  const colorScheme = useColorScheme();
  const brand = brandPalette[colorScheme === 'dark' ? 'dark' : 'light'];

  return { brand, colors: semanticColors } as const;
}
