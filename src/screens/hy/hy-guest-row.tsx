import React from 'react';
import { Pressable, View } from 'react-native';
import { HyText as Text } from '@/components/hy-ui';
import { hy } from '@/theme';
import type { Guest, Group } from './hy-guest-types';

export const GuestRow = React.memo(function GuestRow({
  guest,
  group,
  onPress,
  isFirst,
  isLast,
}: {
  guest: Guest;
  group?: Group | undefined;
  onPress: (guest: Guest) => void;
  isFirst?: boolean | undefined;
  isLast?: boolean | undefined;
}) {
  const initials = guest.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Khách ${guest.name}, nhóm ${group?.name ?? 'Chưa xác định'}`}
      onPress={() => onPress(guest)}
      style={{
        minHeight: 72,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: hy.surface,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderTopWidth: isFirst ? 1 : 0,
        borderBottomWidth: 1,
        borderColor: hy.rule,
        borderTopLeftRadius: isFirst ? 20 : 0,
        borderTopRightRadius: isFirst ? 20 : 0,
        borderBottomLeftRadius: isLast ? 20 : 0,
        borderBottomRightRadius: isLast ? 20 : 0,
      }}
    >
      <View
        style={{
          height: 40,
          width: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: hy.primarySoft,
        }}
      >
        <Text style={{ color: hy.primary, fontWeight: '700', fontSize: 14 }}>{initials}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontWeight: '600', fontSize: 15 }}>{guest.name}</Text>
        <Text style={{ fontSize: 12, color: hy.muted }}>
          {group?.name ?? 'Nhóm chưa xác định'}
          {guest.phone ? ` · ${guest.phone}` : ''}
        </Text>
      </View>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: group?.color ?? hy.outline,
        }}
      />
      <Text style={{ color: hy.muted, fontSize: 20 }}>›</Text>
    </Pressable>
  );
});
