import React from 'react';
import { View } from 'react-native';

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
