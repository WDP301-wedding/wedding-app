import React from 'react';
import { Text, View } from 'react-native';
import type { IconProps } from './v0-icons-core';

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
