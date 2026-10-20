import React from 'react';
import { View } from 'react-native';
import { HyButton, HyCard, HySheet, HyText as Text } from '@/components/hy-ui';
import { hy } from '@/theme';
import type { Guest } from './hy-guest-types';

export function HyConfirmArchiveSheet({
  visible,
  target,
  saving,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  target: Guest | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (guest: Guest) => void;
}) {
  return (
    <HySheet visible={visible} title="Xác nhận lưu trữ khách" onClose={onClose}>
      <View style={{ gap: 14 }}>
        <HyCard style={{ backgroundColor: hy.surfaceMuted, gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: hy.ink }}>
            Lưu trữ: {target?.name}
          </Text>
          <Text style={{ fontSize: 13, color: hy.secondary, lineHeight: 18 }}>
            Khách này sẽ bị ẩn khỏi danh sách tiệc cưới và liên kết thiệp riêng cá nhân (nếu có) sẽ
            bị thu hồi.
          </Text>
          <Text style={{ fontSize: 12, color: hy.muted, lineHeight: 16 }}>
            Lưu ý: Dữ liệu không bị xóa mất. Bạn có thể mở danh sách &ldquo;Khách đã lưu trữ&rdquo;
            để khôi phục lại bất cứ lúc nào.
          </Text>
        </HyCard>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          <View style={{ flex: 1 }}>
            <HyButton label="Hủy" variant="outline" disabled={saving} onPress={onClose} />
          </View>
          <View style={{ flex: 1 }}>
            <HyButton
              label={saving ? 'Đang lưu trữ...' : 'Xác nhận lưu trữ'}
              variant="primary"
              disabled={saving || !target}
              busy={saving}
              onPress={() => target && onConfirm(target)}
            />
          </View>
        </View>
      </View>
    </HySheet>
  );
}
