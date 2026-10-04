import { Color } from 'expo-router';
import { Platform, useColorScheme, type ColorValue, type TextStyle } from 'react-native';

const brandPalette = {
  light: {
    primary: '#163A70',
    primaryText: '#FFFFFF',
    powder: '#DCE6F6',
    display: '#553419',
    script: '#6B3A3A',
    gold: '#B08A47',
    goldSoft: '#E7DABF',
  },
  dark: {
    primary: '#A0B9DB',
    primaryText: '#102B55',
    powder: '#1C2D46',
    display: '#E7DABF',
    script: '#DCAAAA',
    gold: '#D8BD82',
    goldSoft: '#5C4B2E',
  },
} as const;

export const semanticColors = {
  label: Platform.select<ColorValue>({
    android: Color.android.dynamic.onSurface,
    default: '#2C2725',
  })!,
  secondaryLabel: Platform.select<ColorValue>({
    android: Color.android.dynamic.onSurfaceVariant,
    default: '#716965',
  })!,
  background: Platform.select<ColorValue>({
    android: Color.android.dynamic.surface,
    default: '#FBF8F4',
  })!,
  secondaryBackground: Platform.select<ColorValue>({
    android: Color.android.dynamic.surfaceVariant,
    default: '#F4F7FC',
  })!,
  separator: Platform.select<ColorValue>({
    android: Color.android.dynamic.outlineVariant,
    default: '#DDD5CD',
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
