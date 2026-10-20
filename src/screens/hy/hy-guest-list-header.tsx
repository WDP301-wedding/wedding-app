import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { HyBadge, HyButton, HyCard, HyInput, HyText as Text } from '@/components/hy-ui';
import { hy } from '@/theme';
import type { AttendanceSummary, Group, GuestPlan } from './hy-guest-types';

export function HyGuestListHeader({
  filteredCount,
  currentHeadcount,
  totalGuestsCount,
  hasData,
  auxData,
  auxLoading,
  search,
  onSearchChange,
  group,
  onSelectGroup,
  groups,
  onOpenCreate,
  onOpenEditHeadcount,
  onOpenSettings,
  onOpenArchived,
}: {
  filteredCount: number;
  currentHeadcount: number;
  totalGuestsCount: number;
  hasData: boolean;
  auxData: { attendance: AttendanceSummary | null; guestPlan: GuestPlan | null } | null;
  auxLoading: boolean;
  search: string;
  onSearchChange: (text: string) => void;
  group: string | null;
  onSelectGroup: (groupId: string | null) => void;
  groups: readonly Group[];
  onOpenCreate: () => void;
  onOpenEditHeadcount: () => void;
  onOpenSettings: () => void;
  onOpenArchived: () => void;
}) {
  return (
    <View style={{ gap: 16, marginBottom: filteredCount > 0 ? 16 : 0 }}>
      {/* Planned count vs Listed guests */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <HyCard style={{ flex: 1, gap: 4 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 13, color: hy.secondary }}>Khách dự kiến</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sửa nhanh số khách dự kiến"
              onPress={onOpenEditHeadcount}
              style={{ paddingHorizontal: 6, paddingVertical: 2 }}
            >
              <Text style={{ fontSize: 12, color: hy.primary, fontWeight: '600' }}>Sửa</Text>
            </Pressable>
          </View>
          <Text
            style={{
              fontSize: 28,
              lineHeight: 34,
              fontWeight: '700',
              color: hy.primary,
              fontFamily: hy.bold,
            }}
          >
            {currentHeadcount}
          </Text>
          <Text style={{ fontSize: 11, color: hy.muted }}>Độc lập với danh sách tên</Text>
        </HyCard>

        <HyCard style={{ flex: 1, gap: 4 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 13, color: hy.secondary }}>Tên đã nhập</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Thêm khách mời mới"
              onPress={onOpenCreate}
              style={{ paddingHorizontal: 6, paddingVertical: 2 }}
            >
              <Text style={{ fontSize: 12, color: hy.primary, fontWeight: '600' }}>+ Thêm</Text>
            </Pressable>
          </View>
          <Text
            style={{
              fontSize: 28,
              lineHeight: 34,
              fontWeight: '700',
              color: hy.ink,
              fontFamily: hy.bold,
            }}
          >
            {hasData ? totalGuestsCount : '—'}
          </Text>
          <Text style={{ fontSize: 11, color: hy.muted }}>Tùy chọn · không bắt buộc</Text>
        </HyCard>
      </View>

      {/* Check-in Status Card */}
      <HyCard style={{ backgroundColor: hy.surfaceMuted, gap: 6 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: hy.ink }}>
            Điểm danh (Check-in)
          </Text>
          <HyBadge
            status={
              auxLoading && !auxData
                ? 'neutral'
                : !auxData?.attendance || auxData.attendance.checkInMode === 'NONE'
                  ? 'neutral'
                  : 'info'
            }
            label={
              auxLoading && !auxData
                ? 'Đang kiểm tra…'
                : !auxData?.attendance || auxData.attendance.checkInMode === 'NONE'
                  ? 'Chưa ghi nhận'
                  : 'Đang bật'
            }
          />
        </View>
        <Text style={{ fontSize: 13, color: hy.secondary, lineHeight: 18 }}>
          {auxLoading && !auxData
            ? 'Đang tải trạng thái điểm danh…'
            : !auxData?.attendance || auxData.attendance.checkInMode === 'NONE'
              ? 'Điểm danh đang tắt. Hệ thống không ghi nhận (không phải 0 khách).'
              : `Điểm danh theo tên: ${auxData.attendance.checkedInGuestCount ?? 'Chưa ghi nhận'} khách đã check-in.`}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 4,
          }}
        >
          <HyButton label="Cài đặt chế độ điểm danh" variant="text" onPress={onOpenSettings} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở danh sách khách đã lưu trữ"
            onPress={onOpenArchived}
            style={{ paddingHorizontal: 10, paddingVertical: 6 }}
          >
            <Text style={{ fontSize: 13, color: hy.primary, fontWeight: '600' }}>
              📦 Đã lưu trữ
            </Text>
          </Pressable>
        </View>
      </HyCard>

      {/* Search & Add Action */}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <HyInput
            accessibilityLabel="Tìm tên khách"
            placeholder="Tìm kiếm theo tên khách mời…"
            value={search}
            onChangeText={onSearchChange}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thêm khách mời mới"
          onPress={onOpenCreate}
          style={({ pressed }) => ({
            minHeight: 56,
            paddingHorizontal: 16,
            borderRadius: 12,
            backgroundColor: pressed ? hy.primaryPressed : hy.primary,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 4,
          })}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>+ Thêm</Text>
        </Pressable>
      </View>

      {/* Group Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
      >
        {[{ guestGroupId: '', name: 'Tất cả', color: hy.primary }, ...groups].map((g) => {
          const isSelected = group === (g.guestGroupId || null);
          return (
            <Pressable
              key={g.guestGroupId}
              accessibilityRole="button"
              accessibilityLabel={`Lọc nhóm ${g.name}`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectGroup(g.guestGroupId || null)}
              style={{
                minHeight: 40,
                borderWidth: 1,
                borderColor: isSelected ? hy.primary : hy.rule,
                borderRadius: 20,
                paddingVertical: 8,
                paddingHorizontal: 14,
                backgroundColor: isSelected ? hy.primarySoft : hy.surface,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {g.guestGroupId !== '' && (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: g.color || hy.outline,
                  }}
                />
              )}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: isSelected ? '600' : '400',
                  color: isSelected ? hy.primary : hy.ink,
                }}
              >
                {g.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
