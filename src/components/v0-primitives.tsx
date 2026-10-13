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

export interface IconProps {
  size?: number;
  color?: string;
  hasDot?: boolean;
}

/** Checkmark icon */
export function CheckIcon({ size = 16, color = '#FFFFFF' }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.35,
          height: size * 0.65,
          borderColor: color,
          borderBottomWidth: Math.max(2, size * 0.14),
          borderRightWidth: Math.max(2, size * 0.14),
          transform: [{ rotate: '45deg' }, { translateY: -size * 0.08 }],
        }}
      />
    </View>
  );
}

/** Chevron right icon */
export function ChevronRightIcon({ size = 18, color = '#62645F' }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.42,
          height: size * 0.42,
          borderColor: color,
          borderTopWidth: Math.max(1.8, size * 0.12),
          borderRightWidth: Math.max(1.8, size * 0.12),
          transform: [{ rotate: '45deg' }, { translateX: -size * 0.08 }],
        }}
      />
    </View>
  );
}

/** Arrow right icon */
export function ArrowRightIcon({ size = 18, color = '#334537' }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <View
        style={{
          width: size * 0.65,
          height: Math.max(1.8, size * 0.11),
          backgroundColor: color,
          borderRadius: 1,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: size * 0.18,
          width: size * 0.34,
          height: size * 0.34,
          borderColor: color,
          borderTopWidth: Math.max(1.8, size * 0.11),
          borderRightWidth: Math.max(1.8, size * 0.11),
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

/** Calendar icon */
export function CalendarIcon({ size = 20, color = '#334537' }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderWidth: Math.max(1.5, size * 0.09),
        borderColor: color,
        borderRadius: 4,
        paddingTop: size * 0.25,
        alignItems: 'center',
        justifyContent: 'space-around',
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: size * 0.28,
          borderBottomWidth: Math.max(1.2, size * 0.08),
          borderColor: color,
        }}
      />
      <View
        style={{
          flexDirection: 'row',
          gap: 2,
        }}
      >
        <View style={{ width: 2, height: 2, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: 2, height: 2, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: 2, height: 2, backgroundColor: color, borderRadius: 1 }} />
      </View>
    </View>
  );
}

/** File / Document text icon */
export function FileTextIcon({ size = 20, color = '#334537' }: IconProps) {
  return (
    <View
      style={{
        width: size * 0.85,
        height: size,
        borderWidth: Math.max(1.5, size * 0.09),
        borderColor: color,
        borderRadius: 3,
        paddingHorizontal: size * 0.15,
        justifyContent: 'center',
        gap: size * 0.12,
      }}
    >
      <View style={{ height: Math.max(1.2, size * 0.08), backgroundColor: color, width: '100%' }} />
      <View style={{ height: Math.max(1.2, size * 0.08), backgroundColor: color, width: '75%' }} />
      <View style={{ height: Math.max(1.2, size * 0.08), backgroundColor: color, width: '50%' }} />
    </View>
  );
}

/** Bell icon with notification dot */
export function BellIcon({ size = 20, color = '#334537', hasDot = false }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <View
        style={{
          width: size * 0.68,
          height: size * 0.68,
          borderWidth: Math.max(1.5, size * 0.09),
          borderColor: color,
          borderTopLeftRadius: size * 0.35,
          borderTopRightRadius: size * 0.35,
          borderBottomWidth: 0,
        }}
      />
      <View
        style={{
          width: size * 0.84,
          height: Math.max(1.5, size * 0.09),
          backgroundColor: color,
          borderRadius: 1,
        }}
      />
      <View
        style={{
          width: size * 0.22,
          height: size * 0.12,
          backgroundColor: color,
          borderBottomLeftRadius: 3,
          borderBottomRightRadius: 3,
          marginTop: 1,
        }}
      />
      {hasDot ? (
        <View
          style={{
            position: 'absolute',
            top: 1,
            right: 1,
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: '#8C6D62',
            borderWidth: 1,
            borderColor: '#FAF8F5',
          }}
        />
      ) : null}
    </View>
  );
}

/** Menu / hamburger icon */
export function MenuIcon({ size = 20, color = '#334537' }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        justifyContent: 'space-evenly',
        paddingVertical: size * 0.15,
      }}
    >
      <View
        style={{ height: Math.max(1.5, size * 0.09), backgroundColor: color, borderRadius: 1 }}
      />
      <View
        style={{ height: Math.max(1.5, size * 0.09), backgroundColor: color, borderRadius: 1 }}
      />
      <View
        style={{ height: Math.max(1.5, size * 0.09), backgroundColor: color, borderRadius: 1 }}
      />
    </View>
  );
}

/** Share icon */
export function ShareIcon({ size = 18, color = '#334537' }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <View
        style={{
          position: 'absolute',
          right: 2,
          top: 2,
          width: 5,
          height: 5,
          borderRadius: 3,
          borderWidth: 1.5,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 2,
          bottom: 2,
          width: 5,
          height: 5,
          borderRadius: 3,
          borderWidth: 1.5,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 2,
          top: size * 0.5 - 2.5,
          width: 5,
          height: 5,
          borderRadius: 3,
          borderWidth: 1.5,
          borderColor: color,
        }}
      />
      <View
        style={{
          width: size * 0.5,
          height: 1,
          backgroundColor: color,
          transform: [{ rotate: '-28deg' }, { translateY: -size * 0.15 }],
        }}
      />
      <View
        style={{
          width: size * 0.5,
          height: 1,
          backgroundColor: color,
          transform: [{ rotate: '28deg' }, { translateY: size * 0.15 }],
        }}
      />
    </View>
  );
}

/** Stylized QR code box icon */
export function QrCodeIcon({ size = 72, color = '#334537' }: IconProps) {
  const borderW = Math.max(2, size * 0.035);
  const cornerSize = size * 0.26;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderWidth: borderW,
        borderColor: color,
        borderRadius: 8,
        padding: size * 0.08,
        position: 'relative',
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* Top Left Finder */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.08,
          left: size * 0.08,
          width: cornerSize,
          height: cornerSize,
          borderWidth: borderW,
          borderColor: color,
          borderRadius: 3,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: cornerSize * 0.45,
            height: cornerSize * 0.45,
            backgroundColor: color,
            borderRadius: 1,
          }}
        />
      </View>

      {/* Top Right Finder */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.08,
          right: size * 0.08,
          width: cornerSize,
          height: cornerSize,
          borderWidth: borderW,
          borderColor: color,
          borderRadius: 3,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: cornerSize * 0.45,
            height: cornerSize * 0.45,
            backgroundColor: color,
            borderRadius: 1,
          }}
        />
      </View>

      {/* Bottom Left Finder */}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.08,
          left: size * 0.08,
          width: cornerSize,
          height: cornerSize,
          borderWidth: borderW,
          borderColor: color,
          borderRadius: 3,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: cornerSize * 0.45,
            height: cornerSize * 0.45,
            backgroundColor: color,
            borderRadius: 1,
          }}
        />
      </View>

      {/* Center & Pattern blocks */}
      <View
        style={{
          position: 'absolute',
          right: size * 0.12,
          bottom: size * 0.12,
          width: size * 0.35,
          height: size * 0.35,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 3,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: size * 0.1, height: size * 0.1, backgroundColor: color }} />
        <View style={{ width: size * 0.08, height: size * 0.08, backgroundColor: color }} />
        <View style={{ width: size * 0.08, height: size * 0.08, backgroundColor: color }} />
        <View style={{ width: size * 0.1, height: size * 0.1, backgroundColor: color }} />
      </View>
    </View>
  );
}

/** Clock icon */
export function ClockIcon({ size = 16, color = '#4A5D4E' }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.5,
        borderWidth: Math.max(1.5, size * 0.09),
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: size * 0.22,
          width: Math.max(1.4, size * 0.09),
          height: size * 0.3,
          backgroundColor: color,
          borderRadius: 1,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.45,
          top: size * 0.45,
          width: size * 0.25,
          height: Math.max(1.4, size * 0.09),
          backgroundColor: color,
          borderRadius: 1,
        }}
      />
    </View>
  );
}

/** Users icon */
export function UsersIcon({ size = 18, color = '#4A5D4E' }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.36,
          height: size * 0.36,
          borderRadius: size * 0.18,
          borderWidth: Math.max(1.3, size * 0.08),
          borderColor: color,
        }}
      />
      <View
        style={{
          width: size * 0.65,
          height: size * 0.38,
          borderTopLeftRadius: size * 0.25,
          borderTopRightRadius: size * 0.25,
          borderWidth: Math.max(1.3, size * 0.08),
          borderColor: color,
          borderBottomWidth: 0,
          marginTop: 1,
        }}
      />
    </View>
  );
}

/** Image icon */
export function ImageIcon({ size = 18, color = '#4A5D4E' }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size * 0.85,
        borderWidth: Math.max(1.4, size * 0.09),
        borderColor: color,
        borderRadius: 3,
        padding: 2,
        justifyContent: 'flex-end',
        position: 'relative',
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 2,
          right: 3,
          width: 3,
          height: 3,
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          width: '100%',
          height: size * 0.35,
          borderTopWidth: Math.max(1.2, size * 0.08),
          borderColor: color,
          borderStyle: 'dashed',
        }}
      />
    </View>
  );
}

/** Lock keyhole icon */
export function LockIcon({ size = 16, color = '#4A5D4E' }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.5,
          height: size * 0.42,
          borderWidth: Math.max(1.4, size * 0.09),
          borderColor: color,
          borderTopLeftRadius: size * 0.25,
          borderTopRightRadius: size * 0.25,
          borderBottomWidth: 0,
        }}
      />
      <View
        style={{
          width: size * 0.75,
          height: size * 0.52,
          borderWidth: Math.max(1.4, size * 0.09),
          borderColor: color,
          borderRadius: 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: size * 0.16,
            height: size * 0.2,
            backgroundColor: color,
            borderRadius: 1,
          }}
        />
      </View>
    </View>
  );
}

/** Rotate counter-clockwise / Revision icon */
export function RotateCcwIcon({ size = 17, color = '#4A5D4E' }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.75,
          height: size * 0.75,
          borderRadius: size * 0.4,
          borderWidth: Math.max(1.5, size * 0.09),
          borderColor: color,
          borderTopColor: 'transparent',
          transform: [{ rotate: '-45deg' }],
        }}
      />
    </View>
  );
}

/** Sparkles icon */
export function SparklesIcon({ size = 16, color = '#C5A880' }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.5,
          height: size * 0.5,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }],
          borderRadius: 1,
        }}
      />
    </View>
  );
}

/** Help icon */
export function CircleHelpIcon({ size = 17, color = '#4A5D4E' }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.5,
        borderWidth: Math.max(1.4, size * 0.09),
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.6, fontWeight: '700', color, lineHeight: size * 0.8 }}>
        ?
      </Text>
    </View>
  );
}

/** Link icon */
export function LinkIcon({ size = 16, color = '#4A5D4E' }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.6,
          height: size * 0.35,
          borderWidth: Math.max(1.3, size * 0.09),
          borderColor: color,
          borderRadius: 4,
          transform: [{ rotate: '-45deg' }],
        }}
      />
    </View>
  );
}

/** More horizontal icon */
export function MoreIcon({ size = 20, color = '#334537' }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
      }}
    >
      <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: color }} />
      <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: color }} />
      <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: color }} />
    </View>
  );
}

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
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
            onPress={() => onSelectTab(tab.id)}
            style={styles.tabButton}
          >
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
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    minHeight: 64,
    paddingTop: 8,
    paddingHorizontal: 8,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    lineHeight: 13,
  },
});
