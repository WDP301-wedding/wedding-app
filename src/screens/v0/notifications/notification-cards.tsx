import React, { useMemo, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, Switch, View } from 'react-native';
import { HyText as Text } from '@/components/hy-ui';
import { CheckIcon, StatusTag } from '@/components/v0-primitives';
import type {
  AndroidInstallationItem,
  InboxItem,
  NotificationPreferencesView,
} from '@/features/notifications/notification-api';
import { useWeddingTheme } from '@/theme';
import type { V0Screen } from '../v0-types';
import { styles } from '../v0-notifications-subflow.styles';

function ReadSwipe({
  unread,
  onRead,
  children,
}: React.PropsWithChildren<{ unread: boolean; onRead: () => void }>) {
  const [offset] = useState(() => new Animated.Value(0));
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          unread && g.dx < -12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderMove: (_, g) => offset.setValue(Math.max(-100, Math.min(0, g.dx))),
        onPanResponderRelease: (_, g) => {
          if (g.dx < -80) onRead();
          Animated.timing(offset, {
            toValue: 0,
            duration: 150,
            useNativeDriver: Platform.OS !== 'web',
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.timing(offset, {
            toValue: 0,
            duration: 150,
            useNativeDriver: Platform.OS !== 'web',
          }).start();
        },
      }),
    [unread, onRead, offset],
  );
  return (
    <View
      style={{ backgroundColor: '#7A1F3D', borderRadius: 20, overflow: 'hidden', marginBottom: 12 }}
    >
      <View
        pointerEvents={Platform.OS === 'web' ? undefined : 'none'}
        style={{ position: 'absolute', right: 16, top: 32, pointerEvents: 'none' }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 12 }}>Đánh dấu đã đọc</Text>
      </View>
      <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: offset }] }}>
        {children}
      </Animated.View>
    </View>
  );
}
export function NotificationInboxCard({
  item,
  onMarkRead,
  onNavigateDetail,
  destination,
}: {
  item: InboxItem;
  onMarkRead: () => void;
  onNavigateDetail?: () => void;
  destination: V0Screen | null;
}) {
  const { tokens } = useWeddingTheme();
  const isUnread = !item.readAt;

  return (
    <ReadSwipe unread={isUnread} onRead={onMarkRead}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.message || 'Thông báo'}
        onPress={onMarkRead}
        style={[
          styles.calloutCard,
          {
            backgroundColor: isUnread ? tokens.calloutBg : tokens.surface,
            borderColor: tokens.rule,
            borderLeftWidth: 1,
            borderRadius: 20,
            padding: 16,
            minHeight: 96,
            marginBottom: 0,
          },
        ]}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: isUnread ? '700' : '500',
              color: tokens.text,
              flex: 1,
            }}
          >
            {item.message}
          </Text>
          {isUnread ? (
            <StatusTag tone="warm">Mới</StatusTag>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <CheckIcon size={12} color={tokens.sage} />
              <Text style={{ fontSize: 11, color: tokens.sage }}>Đã đọc</Text>
            </View>
          )}
        </View>

        <View style={[styles.factRow, { marginTop: 8 }]}>
          <Text style={{ fontSize: 10, color: tokens.earth }}>
            {new Date(item.createdAt).toLocaleString('vi-VN')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 10, color: tokens.sage }}>{item.purpose}</Text>
            {destination && onNavigateDetail && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xem chi tiết nội dung"
                onPress={onNavigateDetail}
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 12,
                  backgroundColor: tokens.surfaceMuted,
                }}
              >
                <Text style={{ fontSize: 10, color: tokens.primary, fontWeight: '600' }}>
                  Xem chi tiết ›
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </Pressable>
    </ReadSwipe>
  );
}

export function NotificationDeviceDiagnosticCard({
  stableInstallationId,
}: {
  stableInstallationId: string | null;
}) {
  const { tokens } = useWeddingTheme();

  return (
    <View
      style={[styles.calloutCard, { backgroundColor: tokens.surface, borderColor: tokens.rule }]}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <Text style={[styles.calloutTitle, { color: tokens.text }]}>
          Định danh thiết bị Android & Push FCM
        </Text>
        <StatusTag tone="warm">Native FCM Blocker</StatusTag>
      </View>
      <Text style={[styles.calloutSubtitle, { color: tokens.muted, marginBottom: 8 }]}>
        Thiết bị sử dụng định danh cài đặt ổn định lưu trữ bảo mật (SecureStore). Hoạt động nhận
        push notification từ xa qua FCM hiện đang bị chặn bởi các rào cản kỹ thuật bên dưới.
      </Text>

      <View style={[styles.factRow, { marginTop: 6 }]}>
        <Text style={{ fontSize: 11, color: tokens.muted }}>Mã cài đặt thiết bị này:</Text>
        <Text
          selectable
          style={{
            fontSize: 11,
            fontFamily: 'monospace',
            color: stableInstallationId ? tokens.primary : tokens.tagWarmText,
            fontWeight: '700',
          }}
        >
          {stableInstallationId
            ? `${stableInstallationId.slice(0, 18)}…`
            : 'Chưa sẵn sàng (SecureStore lỗi/chưa khởi tạo)'}
        </Text>
      </View>

      <View
        style={{
          marginTop: 8,
          padding: 8,
          backgroundColor: tokens.canvas,
          borderRadius: 6,
          gap: 4,
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '700', color: tokens.text }}>
          Chi tiết 4 rào cản tích hợp FCM:
        </Text>
        <Text style={{ fontSize: 11, color: tokens.muted }}>
          1. Cấu hình: google-services.json có sẵn tại thư mục gốc (com.wdp301.wedding.staging)
          nhưng chưa liên kết trong app.config.ts (android.googleServicesFile).
        </Text>
        <Text style={{ fontSize: 11, color: tokens.muted }}>
          2. SDK Client: Thư viện Push FCM (expo-notifications / react-native-firebase) chưa được
          cài đặt trong package.json.
        </Text>
        <Text style={{ fontSize: 11, color: tokens.muted }}>
          3. Build Native: Chưa biên dịch Android Gradle native plugin cho Firebase.
        </Text>
        <Text style={{ fontSize: 11, color: tokens.muted }}>
          4. Máy chủ: FCM background delivery worker phía máy chủ chưa kích hoạt.
        </Text>
      </View>
    </View>
  );
}

export function NotificationDeviceCard({
  inst,
  onRevoke,
}: {
  inst: AndroidInstallationItem;
  onRevoke: () => void;
}) {
  const { tokens } = useWeddingTheme();

  return (
    <View
      style={[styles.calloutCard, { backgroundColor: tokens.surface, borderColor: tokens.rule }]}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: tokens.text }}>
          Android #{inst.id.slice(0, 8)}
        </Text>
        <StatusTag tone={inst.enabled ? 'success' : 'neutral'}>
          {inst.enabled ? 'Đang kích hoạt' : 'Tắt'}
        </StatusTag>
      </View>

      <View style={[styles.factRow, { marginTop: 6 }]}>
        <Text style={{ fontSize: 11, color: tokens.muted }}>Mã cài đặt:</Text>
        <Text style={{ fontSize: 11, fontFamily: 'monospace', color: tokens.text }}>
          {inst.installationId.slice(0, 16)}…
        </Text>
      </View>

      <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Hủy thiết bị ${inst.id.slice(0, 8)}`}
          onPress={onRevoke}
          style={[styles.outlineButton, { borderColor: tokens.champagne }]}
        >
          <Text style={{ fontSize: 11, fontWeight: '600', color: tokens.tagWarmText }}>
            Hủy liên kết
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function NotificationPreferencesCard({
  preferences,
  onToggle,
}: {
  preferences: NotificationPreferencesView;
  onToggle: (field: 'reminderEmail' | 'reminderPush', val: boolean) => void;
}) {
  const { tokens } = useWeddingTheme();

  return (
    <View
      style={[styles.calloutCard, { backgroundColor: tokens.surface, borderColor: tokens.rule }]}
    >
      <Text style={[styles.calloutTitle, { color: tokens.text, marginBottom: 12 }]}>
        Kênh nhận nhắc nhở & thông báo
      </Text>

      <View
        style={[
          styles.prefRow,
          { borderBottomColor: tokens.rule, borderBottomWidth: 1, paddingBottom: 12 },
        ]}
      >
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.text }}>
            Nhắc nhở qua Email
          </Text>
          <Text style={{ fontSize: 12, color: tokens.muted, marginTop: 2 }}>
            Nhận thông báo cập nhật hợp đồng, phụ lục và xác nhận thanh toán qua thư điện tử.
          </Text>
        </View>
        <Switch
          value={preferences.reminderEmail}
          onValueChange={(val) => onToggle('reminderEmail', val)}
          trackColor={{ false: tokens.rule, true: tokens.primary }}
        />
      </View>

      <View style={[styles.prefRow, { paddingTop: 12 }]}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.text }}>
            Thông báo đẩy (Push Notification)
          </Text>
          <Text style={{ fontSize: 12, color: tokens.muted, marginTop: 2 }}>
            Nhận thông báo trực tiếp trên màn hình thiết bị Android khi có thay đổi trạng thái.
          </Text>
        </View>
        <Switch
          value={preferences.reminderPush}
          onValueChange={(val) => onToggle('reminderPush', val)}
          trackColor={{ false: tokens.rule, true: tokens.primary }}
        />
      </View>

      <Text style={{ fontSize: 11, color: tokens.sage, marginTop: 14 }}>
        Phiên bản cấu hình: #{preferences.revision}
      </Text>
    </View>
  );
}

export function getDestinationScreen(purpose: string): V0Screen | null {
  switch (purpose) {
    case 'TIMELINE_REVIEW':
    case 'TIMELINE_CHANGED':
      return 'plan';
    case 'CONTRACT':
      return 'contracts';
    case 'APPENDIX':
      return 'appendices';
    case 'DEPOSIT_ELIGIBLE':
    case 'PAYMENT':
    case 'REFUND':
      return 'payments';
    case 'PRINT':
      return 'print';
    case 'GUEST_PLAN':
    case 'GUEST_INVITATION':
      return 'guests';
    case 'FINAL_INVOICE':
      return 'invoices';
    case 'PUBLICATION_CHANGED':
      return 'invite';
    case 'MEDIA_CUTOFF':
      return 'media';
    case 'PASSWORD_OTP':
    case 'ACCESS_PROMOTED':
      return 'account';
    case 'WORKSPACE_INVITATION':
    case 'CANCELLATION_NOTICE':
    case 'D3_REMINDER':
    case 'COMPLETION_NOTICE':
      return 'overview';
    default:
      return null;
  }
}

export function NotificationTabBar({
  tab,
  setTab,
  unreadCount,
}: {
  tab: 'inbox' | 'devices' | 'preferences';
  setTab: (tab: 'inbox' | 'devices' | 'preferences') => void;
  unreadCount: number;
}) {
  const { tokens } = useWeddingTheme();
  return (
    <View style={[styles.tabBar, { borderBottomColor: tokens.rule }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hộp thư"
        onPress={() => setTab('inbox')}
        style={[
          styles.tabButton,
          tab === 'inbox' && { borderBottomColor: tokens.primary, borderBottomWidth: 2 },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text
            style={[
              styles.tabText,
              {
                color: tab === 'inbox' ? tokens.primary : tokens.muted,
                fontWeight: tab === 'inbox' ? '700' : '500',
              },
            ]}
          >
            Hộp thư
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: tokens.primary }]}>
              <Text style={[styles.badgeText, { color: tokens.onPrimary }]}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Thiết bị nhận push"
        onPress={() => setTab('devices')}
        style={[
          styles.tabButton,
          tab === 'devices' && { borderBottomColor: tokens.primary, borderBottomWidth: 2 },
        ]}
      >
        <Text
          style={[
            styles.tabText,
            {
              color: tab === 'devices' ? tokens.primary : tokens.muted,
              fontWeight: tab === 'devices' ? '700' : '500',
            },
          ]}
        >
          Thiết bị
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tùy chọn thông báo"
        onPress={() => setTab('preferences')}
        style={[
          styles.tabButton,
          tab === 'preferences' && { borderBottomColor: tokens.primary, borderBottomWidth: 2 },
        ]}
      >
        <Text
          style={[
            styles.tabText,
            {
              color: tab === 'preferences' ? tokens.primary : tokens.muted,
              fontWeight: tab === 'preferences' ? '700' : '500',
            },
          ]}
        >
          Tùy chọn
        </Text>
      </Pressable>
    </View>
  );
}
