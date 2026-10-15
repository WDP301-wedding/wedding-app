import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { StatusTag } from '@/components/v0-primitives';
import type {
  PublicDishesView,
  PublicHallDetailView,
  PublicHallsView,
  PublicMenuPackagesView,
} from '@/features/catalog/catalog-api';
import { useWeddingTheme } from '@/theme';
import { styles } from '../v0-catalog-subflow.styles';

export const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export function HallItemCard({
  hall,
  isSelected,
  loadingDetail,
  detailError,
  selectedHall,
  onToggle,
}: {
  hall: PublicHallsView['items'][number];
  isSelected: boolean;
  loadingDetail: boolean;
  detailError: string | null;
  selectedHall: PublicHallDetailView | null;
  onToggle: () => void;
}) {
  const { tokens } = useWeddingTheme();

  return (
    <View
      style={[
        styles.calloutCard,
        {
          backgroundColor: tokens.surface,
          borderColor: isSelected ? tokens.primary : tokens.rule,
          borderWidth: isSelected ? 1.5 : 1,
        },
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '700', color: tokens.text }}>{hall.name}</Text>
        <StatusTag tone="success">Tối đa {hall.maxGuests} khách</StatusTag>
      </View>

      {hall.description ? (
        <Text style={{ fontSize: 12, color: tokens.muted, marginTop: 4, lineHeight: 17 }}>
          {hall.description}
        </Text>
      ) : null}

      <View style={{ marginTop: 10, alignItems: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Xem chi tiết sảnh ${hall.name}`}
          onPress={onToggle}
          style={[styles.outlineButton, { borderColor: tokens.rule }]}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: tokens.primary }}>
            {isSelected ? 'Đóng chi tiết' : 'Xem chi tiết sảnh'}
          </Text>
        </Pressable>
      </View>

      {/* Expanded Detail (A68-66) */}
      {isSelected && (
        <View
          style={{
            marginTop: 12,
            borderTopWidth: 1,
            borderTopColor: tokens.rule,
            paddingTop: 10,
          }}
        >
          {loadingDetail ? (
            <ActivityIndicator size="small" color={tokens.primary} />
          ) : detailError ? (
            <Text style={{ fontSize: 12, color: tokens.tagWarmText }}>{detailError}</Text>
          ) : selectedHall ? (
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: tokens.primary }}>
                Thông tin sảnh:
              </Text>
              <View style={styles.factRow}>
                <Text style={{ fontSize: 12, color: tokens.muted }}>Sức chứa tối đa:</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: tokens.text }}>
                  {selectedHall.maxGuests} khách
                </Text>
              </View>
              {selectedHall.description ? (
                <Text
                  style={{
                    fontSize: 12,
                    color: tokens.muted,
                    marginTop: 4,
                    lineHeight: 17,
                  }}
                >
                  {selectedHall.description}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

export function MenuPackageCard({
  pkg,
}: {
  pkg: PublicMenuPackagesView['items'][number];
}) {
  const { tokens } = useWeddingTheme();

  return (
    <View
      style={[
        styles.calloutCard,
        { backgroundColor: tokens.surface, borderColor: tokens.rule },
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '700', color: tokens.text }}>{pkg.name}</Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.primary }}>
          {money(pkg.priceVndPerTable)} / bàn
        </Text>
      </View>

      {pkg.description ? (
        <Text style={{ fontSize: 12, color: tokens.muted, marginTop: 4, lineHeight: 17 }}>
          {pkg.description}
        </Text>
      ) : null}

      <View style={[styles.factRow, { marginTop: 8 }]}>
        <Text style={{ fontSize: 11, color: tokens.sage }}>Mã: #{pkg.id.slice(0, 8)}</Text>
        <Text style={{ fontSize: 11, color: tokens.earth }}>
          Phiên bản #{pkg.versionNumber} ({pkg.items?.length ?? 0} món)
        </Text>
      </View>
    </View>
  );
}

export function DishCard({
  dish,
}: {
  dish: PublicDishesView['items'][number];
}) {
  const { tokens } = useWeddingTheme();

  return (
    <View
      style={[
        styles.calloutCard,
        { backgroundColor: tokens.surface, borderColor: tokens.rule },
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.text }}>{dish.name}</Text>
        <StatusTag tone="neutral">{dish.categoryLabel}</StatusTag>
      </View>

      {dish.priceVnd ? (
        <Text style={{ fontSize: 13, fontWeight: '600', color: tokens.primary, marginTop: 4 }}>
          Đơn giá: {money(dish.priceVnd)}
        </Text>
      ) : null}

      {dish.description ? (
        <Text style={{ fontSize: 12, color: tokens.muted, marginTop: 2, lineHeight: 17 }}>
          {dish.description}
        </Text>
      ) : null}
    </View>
  );
}
