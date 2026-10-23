import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { HyAlert, HyButton, HyInput, HySheet, HyText as Text } from '@/components/hy-ui';
import { hy } from '@/theme';
import type { Group, Guest } from './hy-guest-types';

export function HyGuestCreateSheet({
  visible,
  groups,
  name,
  groupId,
  phone,
  note,
  error,
  saving,
  onClose,
  onChangeName,
  onChangeGroupId,
  onChangePhone,
  onChangeNote,
  onSubmit,
}: {
  visible: boolean;
  groups: readonly Group[];
  name: string;
  groupId: string;
  phone: string;
  note: string;
  error: string | null;
  saving: boolean;
  onClose: () => void;
  onChangeName: (v: string) => void;
  onChangeGroupId: (v: string) => void;
  onChangePhone: (v: string) => void;
  onChangeNote: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <HySheet visible={visible} title="Thêm khách mời mới" onClose={onClose}>
      <View style={{ gap: 14 }}>
        <Text style={{ fontSize: 13, color: hy.secondary, lineHeight: 18 }}>
          Khách mời sẽ được lưu vào danh sách tiệc cưới và hiển thị trên sơ đồ bàn tiệc.
        </Text>

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: hy.ink }}>Họ và tên *</Text>
          <HyInput
            accessibilityLabel="Nhập họ và tên khách"
            value={name}
            onChangeText={onChangeName}
            placeholder="Ví dụ: Nguyễn Văn An"
            maxLength={120}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: hy.ink }}>Nhóm khách mời *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          >
            {groups.map((g) => {
              const isSelected = (groupId || groups[0]?.guestGroupId) === g.guestGroupId;
              return (
                <Pressable
                  key={g.guestGroupId}
                  accessibilityRole="button"
                  accessibilityLabel={`Chọn nhóm ${g.name}`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => onChangeGroupId(g.guestGroupId)}
                  style={{
                    minHeight: 38,
                    borderWidth: 1,
                    borderColor: isSelected ? hy.primary : hy.rule,
                    borderRadius: 19,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    backgroundColor: isSelected ? hy.primarySoft : hy.surface,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: g.color || hy.outline,
                    }}
                  />
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

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: hy.ink }}>
            Số điện thoại (tùy chọn)
          </Text>
          <HyInput
            accessibilityLabel="Nhập số điện thoại khách"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={onChangePhone}
            placeholder="Ví dụ: 0901234567"
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: hy.ink }}>
            Ghi chú phục vụ (tùy chọn)
          </Text>
          <HyInput
            accessibilityLabel="Nhập ghi chú phục vụ"
            value={note}
            onChangeText={onChangeNote}
            placeholder="Ví dụ: Ăn chay, kèm trẻ nhỏ, ngồi gần gia đình..."
            maxLength={500}
          />
        </View>

        {error ? <HyAlert variant="error" message={error} style={{ marginBottom: 12 }} /> : null}

        <HyButton
          label={saving ? 'Đang lưu...' : 'Lưu khách mời'}
          disabled={saving || !name.trim()}
          busy={saving}
          onPress={onSubmit}
        />
      </View>
    </HySheet>
  );
}

export function HyGuestEditSheet({
  visible,
  groups,
  editingGuest,
  name,
  groupId,
  phone,
  note,
  error,
  saving,
  onClose,
  onChangeName,
  onChangeGroupId,
  onChangePhone,
  onChangeNote,
  onSubmit,
  onArchive,
}: {
  visible: boolean;
  groups: readonly Group[];
  editingGuest: Guest | null;
  name: string;
  groupId: string;
  phone: string;
  note: string;
  error: string | null;
  saving: boolean;
  onClose: () => void;
  onChangeName: (v: string) => void;
  onChangeGroupId: (v: string) => void;
  onChangePhone: (v: string) => void;
  onChangeNote: (v: string) => void;
  onSubmit: () => void;
  onArchive: (guest: Guest) => void;
}) {
  return (
    <HySheet visible={visible} title="Sửa thông tin khách mời" onClose={onClose}>
      <View style={{ gap: 14 }}>
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: hy.ink }}>Họ và tên *</Text>
          <HyInput
            accessibilityLabel="Sửa họ và tên khách"
            value={name}
            onChangeText={onChangeName}
            placeholder="Ví dụ: Nguyễn Văn An"
            maxLength={120}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: hy.ink }}>Nhóm khách mời *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          >
            {groups.map((g) => {
              const isSelected = groupId === g.guestGroupId;
              return (
                <Pressable
                  key={g.guestGroupId}
                  accessibilityRole="button"
                  accessibilityLabel={`Chọn nhóm ${g.name}`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => onChangeGroupId(g.guestGroupId)}
                  style={{
                    minHeight: 38,
                    borderWidth: 1,
                    borderColor: isSelected ? hy.primary : hy.rule,
                    borderRadius: 19,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    backgroundColor: isSelected ? hy.primarySoft : hy.surface,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: g.color || hy.outline,
                    }}
                  />
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

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: hy.ink }}>
            Số điện thoại (tùy chọn)
          </Text>
          <HyInput
            accessibilityLabel="Sửa số điện thoại khách"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={onChangePhone}
            placeholder="Ví dụ: 0901234567"
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: hy.ink }}>
            Ghi chú phục vụ (tùy chọn)
          </Text>
          <HyInput
            accessibilityLabel="Sửa ghi chú phục vụ"
            value={note}
            onChangeText={onChangeNote}
            placeholder="Ví dụ: Ăn chay, kèm trẻ nhỏ..."
            maxLength={500}
          />
        </View>

        {error ? <HyAlert variant="error" message={error} style={{ marginBottom: 12 }} /> : null}

        <HyButton
          label={saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          disabled={saving || !name.trim()}
          busy={saving}
          onPress={onSubmit}
        />

        {editingGuest && (
          <HyButton
            label="Lưu trữ khách (xóa khỏi danh sách)"
            variant="text"
            disabled={saving}
            onPress={() => onArchive(editingGuest)}
          />
        )}
      </View>
    </HySheet>
  );
}

export function HyHeadcountEditSheet({
  visible,
  value,
  error,
  saving,
  onClose,
  onChangeValue,
  onSubmit,
}: {
  visible: boolean;
  value: string;
  error: string | null;
  saving: boolean;
  onClose: () => void;
  onChangeValue: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <HySheet visible={visible} title="Sửa số khách dự kiến" onClose={onClose}>
      <View style={{ gap: 14 }}>
        <Text style={{ fontSize: 13, color: hy.secondary, lineHeight: 18 }}>
          Số lượng khách dự kiến do Cặp đôi hoặc Quản lý nhập độc lập, không phụ thuộc vào số lượng
          tên trong danh sách khách.
        </Text>

        <HyInput
          accessibilityLabel="Nhập số khách dự kiến"
          keyboardType="number-pad"
          value={value}
          onChangeText={onChangeValue}
          placeholder="Ví dụ: 280"
        />

        {error ? <HyAlert variant="error" message={error} style={{ marginBottom: 12 }} /> : null}

        <HyButton
          label={saving ? 'Đang lưu...' : 'Lưu số lượng khách'}
          disabled={saving}
          busy={saving}
          onPress={onSubmit}
        />
      </View>
    </HySheet>
  );
}
