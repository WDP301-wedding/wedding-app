import React from 'react';
import { View } from 'react-native';
import { HyText as Text } from '@/components/hy-ui';
import type { IconProps } from './v0-icons-core';

/** Users icon */
export function UsersIcon({ size = 18, color = '#4A3A40' }: IconProps) {
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
export function ImageIcon({ size = 18, color = '#4A3A40' }: IconProps) {
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
export function LockIcon({ size = 16, color = '#4A3A40' }: IconProps) {
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
export function RotateCcwIcon({ size = 17, color = '#4A3A40' }: IconProps) {
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
export function SparklesIcon({ size = 16, color = '#C9A46A' }: IconProps) {
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
export function CircleHelpIcon({ size = 17, color = '#4A3A40' }: IconProps) {
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
export function LinkIcon({ size = 16, color = '#4A3A40' }: IconProps) {
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
          borderRadius: 12,
          transform: [{ rotate: '-45deg' }],
        }}
      />
    </View>
  );
}

/** More horizontal icon */
export function MoreIcon({ size = 20, color = '#7A1F3D' }: IconProps) {
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

/** Native vector-like wallet outline for the finance destination. */
export function WalletIcon({ size = 20, color = '#7A1F3D' }: IconProps) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center' }}>
      <View
        style={{
          width: size,
          height: size * 0.72,
          borderRadius: 4,
          borderWidth: 1.7,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: -1,
          top: size * 0.35,
          width: size * 0.42,
          height: size * 0.3,
          borderRadius: 2,
          borderWidth: 1.5,
          borderColor: color,
          backgroundColor: '#FFFFFF',
        }}
      />
    </View>
  );
}

/** Clock icon */
export function ClockIcon({ size = 16, color = '#4A3A40' }: IconProps) {
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

/** Eye (visible / show) icon */
export function EyeIcon({ size = 20, color = '#6E5D63' }: IconProps) {
  const stroke = Math.max(1.6, size * 0.08);
  const eyeW = size * 0.95;
  const halfH = size * 0.3;
  const outerW = size * 1.18;
  const outerH = size * 1.0;
  const offsetL = (eyeW - outerW) / 2;

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
      <View style={{ width: eyeW, height: halfH, overflow: 'hidden', position: 'relative' }}>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: offsetL,
            width: outerW,
            height: outerH,
            borderRadius: outerW / 2,
            borderWidth: stroke,
            borderColor: color,
          }}
        />
      </View>
      <View style={{ width: eyeW, height: halfH, overflow: 'hidden', position: 'relative' }}>
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: offsetL,
            width: outerW,
            height: outerH,
            borderRadius: outerW / 2,
            borderWidth: stroke,
            borderColor: color,
          }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          width: size * 0.3,
          height: size * 0.3,
          borderRadius: size * 0.15,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** Eye off (hidden) icon with diagonal slash */
export function EyeOffIcon({ size = 20, color = '#6E5D63' }: IconProps) {
  const stroke = Math.max(1.6, size * 0.08);
  const eyeW = size * 0.95;
  const halfH = size * 0.3;
  const outerW = size * 1.18;
  const outerH = size * 1.0;
  const offsetL = (eyeW - outerW) / 2;

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
      <View style={{ width: eyeW, height: halfH, overflow: 'hidden', position: 'relative' }}>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: offsetL,
            width: outerW,
            height: outerH,
            borderRadius: outerW / 2,
            borderWidth: stroke,
            borderColor: color,
          }}
        />
      </View>
      <View style={{ width: eyeW, height: halfH, overflow: 'hidden', position: 'relative' }}>
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: offsetL,
            width: outerW,
            height: outerH,
            borderRadius: outerW / 2,
            borderWidth: stroke,
            borderColor: color,
          }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          width: size * 0.3,
          height: size * 0.3,
          borderRadius: size * 0.15,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 1.05,
          height: stroke,
          backgroundColor: color,
          transform: [{ rotate: '-45deg' }],
          borderRadius: 1,
        }}
      />
    </View>
  );
}
