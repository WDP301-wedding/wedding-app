import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWeddingTheme } from '@/theme';
import type { IconProps } from './v0-icons';
import { styles } from './v0-primitives.styles';

export * from './v0-icons';
export { styles as v0PrimitiveStyles } from './v0-primitives.styles';

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
          borderRadius: 4,
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

export interface TabItem {
  id: string;
  label: string;
  icon: (props: IconProps) => React.ReactElement;
}

export interface BottomNavBarProps {
  tabs: readonly TabItem[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

export function BottomNavBar({ tabs, activeTab, onSelectTab }: BottomNavBarProps) {
  const { tokens } = useWeddingTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bottomNav,
        {
          backgroundColor: tokens.surface,
          borderTopColor: tokens.rule,
          paddingBottom: Math.max(8, insets.bottom),
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive =
          activeTab === tab.id ||
          (tab.id === 'invite' && ['edit', 'share'].includes(activeTab)) ||
          (tab.id === 'plan' &&
            ['media', 'print', 'households', 'guests', 'schedule', 'seating'].includes(activeTab));

        const IconComponent = tab.icon;
        const iconColor = isActive ? tokens.primary : tokens.muted;

        return (
          <View key={tab.id} style={styles.tabButton}>
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
              onPress={() => onSelectTab(tab.id)}
              style={StyleSheet.absoluteFill}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
              onPress={() => onSelectTab(tab.id)}
              style={[StyleSheet.absoluteFill, { opacity: 0 }]}
            />
            <View pointerEvents="none" style={{ alignItems: 'center', justifyContent: 'center' }}>
              <IconComponent size={20} color={iconColor} />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: iconColor,
                    fontWeight: isActive ? '700' : '400',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
