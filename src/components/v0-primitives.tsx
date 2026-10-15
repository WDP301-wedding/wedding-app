import React from 'react';
import { View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { HyText as Text } from '@/components/hy-ui';
import { useWeddingTheme } from '@/theme';

export * from './v0-icons';

export interface StatusTagProps {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warm';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function StatusTag({ children, tone = 'neutral', style, textStyle }: StatusTagProps) {
  const { tokens } = useWeddingTheme();

  let bg: string = tokens.surfaceMuted;
  let fg: string = tokens.muted;

  if (tone === 'success') {
    bg = tokens.tagSuccessBg;
    fg = tokens.tagSuccessText;
  } else if (tone === 'warm') {
    bg = tokens.tagWarmBg;
    fg = tokens.tagWarmText;
  }

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: bg,
          paddingVertical: 4,
          paddingHorizontal: 8,
          borderRadius: 12,
        },
        style,
      ]}
    >
      {React.isValidElement(children) ? (
        children
      ) : (
        <Text
          style={[
            {
              fontSize: 10,
              fontWeight: '600',
              color: fg,
              lineHeight: 14,
            },
            textStyle,
          ]}
        >
          {children}
        </Text>
      )}
    </View>
  );
}
