import * as Clipboard from 'expo-clipboard';
import React from 'react';
import { Linking, View } from 'react-native';
import { HyAlert, HyButton, HyCard, HySheet, HyText as Text } from '@/components/hy-ui';
import { toast } from '@/lib/toast/store';
import { hy } from '@/theme';
import type { Guest, Group } from './hy-guest-types';

export function HyGuestDetailSheet({
  selected,
  group,
  issuedLink,
  issueError,
  issuingLink,
  attendanceCheckInText,
  onClose,
  onOpenEdit,
  onIssueLink,
  onNavigateShare,
}: {
  selected: Guest | null;
  group?: Group | undefined;
  issuedLink: { readonly url: string; readonly expiresAt: string; readonly guestId: string } | null;
  issueError: string | null;
  issuingLink: boolean;
  attendanceCheckInText: string;
  onClose: () => void;
  onOpenEdit: (guest: Guest) => void;
  onIssueLink: (guest: Guest) => void;
  onNavigateShare: () => void;
}) {
  return (
    <HySheet
      visible={selected !== null}
      title={selected?.name ?? 'Chi tiết khách'}
      onClose={onClose}
    >
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: group?.color || hy.outline,
            }}
          />
          <Text style={{ color: hy.primary, fontWeight: '700', fontSize: 16 }}>
            {group?.name ?? 'Chưa gán nhóm'}
          </Text>
        </View>

        <HyCard style={{ gap: 8 }}>
          <Text style={{ fontSize: 14, color: hy.ink }}>
            Điện thoại:{' '}
            <Text style={{ fontWeight: '600' }}>{selected?.phone || 'Chưa cung cấp'}</Text>
          </Text>
          <Text style={{ fontSize: 14, color: hy.ink }}>
            Ghi chú phục vụ:{' '}
            <Text style={{ color: hy.secondary }}>{selected?.operationalNote || 'Không có'}</Text>
          </Text>
          <Text style={{ fontSize: 14, color: hy.ink }}>
            Tình trạng điểm danh:{' '}
            <Text style={{ fontWeight: '600', color: hy.secondary }}>{attendanceCheckInText}</Text>
          </Text>
        </HyCard>

        {/* Issued Personal Link Card */}
        {issuedLink && issuedLink.guestId === selected?.guestId && (
          <HyCard style={{ backgroundColor: hy.primarySoft, borderColor: hy.primary, gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: hy.primary }}>
              Liên kết thiệp riêng của {selected.name}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: hy.ink,
                backgroundColor: hy.surface,
                padding: 8,
                borderRadius: 8,
              }}
              numberOfLines={2}
              selectable
            >
              {issuedLink.url}
            </Text>
            <HyButton
              label="Sao chép lại liên kết"
              variant="outline"
              onPress={() =>
                void Clipboard.setStringAsync(issuedLink.url).then(() =>
                  toast.success('Đã sao chép liên kết vào bộ nhớ tạm!'),
                )
              }
            />
            <Text style={{ fontSize: 11, color: hy.secondary }}>
              Liên kết thiệp này chỉ hiển thị một lần. Hãy sao chép để gửi riêng cho khách.
            </Text>
          </HyCard>
        )}

        {issueError ? (
          <HyAlert variant="error" message={issueError} style={{ marginBottom: 12 }} />
        ) : null}

        {/* Actions */}
        <HyButton
          label={issuingLink ? 'Đang cấp liên kết...' : 'Cấp link thiệp riêng'}
          variant="primary"
          busy={issuingLink}
          disabled={issuingLink}
          onPress={() => selected && onIssueLink(selected)}
        />

        <HyButton
          label="Sửa thông tin khách"
          variant="outline"
          onPress={() => {
            if (selected) {
              const target = selected;
              onClose();
              onOpenEdit(target);
            }
          }}
        />

        {selected?.phone ? (
          <HyButton
            label={`Gọi cho ${selected.name}`}
            variant="outline"
            onPress={() => void Linking.openURL(`tel:${selected.phone!.replace(/\s+/g, '')}`)}
          />
        ) : null}

        <HyButton label="Mở chia sẻ thiệp cưới" variant="text" onPress={onNavigateShare} />

        <Text style={{ fontSize: 12, color: hy.muted, textAlign: 'center' }}>
          Hệ thống không quản lý danh tính theo Hộ gia đình và không có tính năng phản hồi RSVP.
        </Text>
      </View>
    </HySheet>
  );
}
