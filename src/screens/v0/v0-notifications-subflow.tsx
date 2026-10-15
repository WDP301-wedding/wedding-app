import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';
import { BellIcon, CheckIcon, RotateCcwIcon, StatusTag } from '@/components/v0-primitives';
import {
  createNotificationGateway,
  type AndroidInstallationItem,
  type InboxItem,
  type NotificationPreferencesView,
} from '@/features/notifications/notification-api';
import { useWeddingTheme } from '@/theme';
import type { V0CommonProps, V0Screen } from './v0-types';

const notificationGateway = createNotificationGateway();
const INSTALLATION_STORAGE_KEY = 'wedding.notifications.installation-id';

export function V0NotificationsSubflow({ onNavigate, session }: V0CommonProps) {
  const { tokens } = useWeddingTheme();
  const [tab, setTab] = useState<'inbox' | 'devices' | 'preferences'>('inbox');
  const [inbox, setInbox] = useState<readonly InboxItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [preferences, setPreferences] = useState<NotificationPreferencesView | null>(null);
  const [installations, setInstallations] = useState<readonly AndroidInstallationItem[]>([]);
  const [loading, setLoading] = useState(Boolean(session));
  const [error, setError] = useState<string | null>(null);
  const [stableInstallationId, setStableInstallationId] = useState<string | null>(null);

  // Initialize or read stable device installation ID from SecureStore
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const stored = await SecureStore.getItemAsync(INSTALLATION_STORAGE_KEY);
        if (stored) {
          if (active) setStableInstallationId(stored);
        } else {
          const generated = randomUUID();
          await SecureStore.setItemAsync(INSTALLATION_STORAGE_KEY, generated);
          if (active) setStableInstallationId(generated);
        }
      } catch {
        if (active) setStableInstallationId(null);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!session) return;
    try {
      const [inboxRes, unread, prefs, insts] = await session.authorize(async (token) => {
        return await Promise.all([
          notificationGateway.listInbox(token, { limit: 30 }),
          notificationGateway.countUnread(token),
          notificationGateway.getPreferences(token),
          notificationGateway.listInstallations(token),
        ]);
      });
      setInbox(inboxRes.items);
      setNextCursor(inboxRes.nextCursor ?? null);
      setUnreadCount(unread);
      setPreferences(prefs);
      setInstallations(insts);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Chưa tải được dữ liệu thông báo từ máy chủ.',
      );
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
  }, [fetchData]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    await fetchData();
  };

  const handleLoadMoreInbox = async () => {
    if (!session || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const more = await session.authorize((token) =>
        notificationGateway.listInbox(token, { cursor: nextCursor, limit: 30 }),
      );
      setInbox((prev) => [...prev, ...more.items]);
      setNextCursor(more.nextCursor ?? null);
    } catch (caught) {
      Alert.alert(
        'Lỗi tải thêm',
        caught instanceof Error ? caught.message : 'Không thể tải thêm thông báo.',
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const handleMarkRead = async (item: InboxItem) => {
    if (!session || item.readAt) return;
    try {
      await session.authorize((token) =>
        notificationGateway.readNotification(token, item.id, item.revision),
      );
      setInbox((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (caught) {
      Alert.alert('Lỗi', caught instanceof Error ? caught.message : 'Không thể đánh dấu đã đọc.');
    }
  };

  const handleMarkAllRead = async () => {
    if (!session || inbox.length === 0) return;
    const latestDate = inbox[0]?.createdAt ?? new Date().toISOString();
    try {
      await session.authorize((token) =>
        notificationGateway.readAllNotifications(token, latestDate),
      );
      setInbox((prev) => prev.map((i) => ({ ...i, readAt: i.readAt || new Date().toISOString() })));
      setUnreadCount(0);
      Alert.alert('Thành công', 'Đã đánh dấu tất cả thông báo là đã đọc.');
    } catch (caught) {
      Alert.alert(
        'Lỗi',
        caught instanceof Error ? caught.message : 'Không thể đánh dấu tất cả đã đọc.',
      );
    }
  };

  const handleTogglePreference = async (
    field: 'reminderEmail' | 'reminderPush',
    value: boolean,
  ) => {
    if (!session || !preferences) return;
    const oldPrefs = { ...preferences };
    const updated = { ...preferences, [field]: value };
    setPreferences(updated);
    try {
      const res = await session.authorize((token) =>
        notificationGateway.updatePreferences(token, {
          expectedRevision: preferences.revision,
          [field]: value,
        }),
      );
      setPreferences(res);
    } catch (caught) {
      setPreferences(oldPrefs);
      Alert.alert(
        'Lỗi cập nhật tùy chọn',
        caught instanceof Error ? caught.message : 'Không thể cập nhật tùy chọn thông báo.',
      );
    }
  };

  const handleRevokeDevice = (item: AndroidInstallationItem) => {
    Alert.alert(
      'Hủy đăng ký thiết bị',
      'Bạn có chắc chắn muốn hủy đăng ký nhận thông báo đẩy trên thiết bị này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Hủy đăng ký',
          style: 'destructive',
          onPress: async () => {
            if (!session) return;
            try {
              await session.authorize((token) =>
                notificationGateway.revokeInstallation(token, item.id, item.revision),
              );
              Alert.alert('Thành công', 'Đã hủy đăng ký thiết bị thành công.');
              await loadData();
            } catch (caught) {
              Alert.alert(
                'Lỗi hủy thiết bị',
                caught instanceof Error ? caught.message : 'Không thể hủy thiết bị.',
              );
            }
          },
        },
      ],
    );
  };

  const getDestinationScreen = (purpose: string): V0Screen | null => {
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
        return 'billing';
      case 'PRINT':
        return 'print';
      case 'GUEST_PLAN':
      case 'GUEST_INVITATION':
        return 'guests';
      case 'FINAL_INVOICE':
        return 'invoices';
      default:
        return null;
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về tài khoản"
          onPress={() => onNavigate('account')}
          style={styles.backButton}
        >
          <Text style={[styles.backGlyph, { color: tokens.primary }]}>‹</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.eyebrow, { color: tokens.sage }]}>Trung tâm thông báo</Text>
          <Text style={[styles.heading, { color: tokens.text }]}>Hộp thư & Thiết bị</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tải lại thông báo"
          onPress={loadData}
          style={styles.refreshButton}
        >
          <RotateCcwIcon size={16} color={tokens.primary} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: tokens.rule }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hộp thư thông báo"
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
            {unreadCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: tokens.primary }]}>
                <Text style={[styles.badgeText, { color: tokens.onPrimary }]}>{unreadCount}</Text>
              </View>
            ) : null}
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thiết bị FCM"
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
            Thiết bị ({installations.length})
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tùy chọn nhận tin"
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

      {loading && <ActivityIndicator color={tokens.primary} style={{ marginVertical: 16 }} />}

      {error ? (
        <View style={[styles.emptyCard, { borderColor: tokens.champagne, marginBottom: 16 }]}>
          <Text style={{ color: tokens.tagWarmText, fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      {/* Tab 1: INBOX */}
      {tab === 'inbox' && (
        <View style={{ gap: 12 }}>
          {inbox.length > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4,
              }}
            >
              <Text style={{ fontSize: 13, color: tokens.muted }}>
                {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Đã đọc tất cả thông báo'}
              </Text>
              {unreadCount > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Đánh dấu tất cả đã đọc"
                  onPress={handleMarkAllRead}
                  style={[styles.outlineButton, { borderColor: tokens.primary }]}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: tokens.primary }}>
                    Đọc tất cả
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {inbox.length > 0 ? (
            inbox.map((item) => {
              const isUnread = !item.readAt;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={item.message || 'Thông báo'}
                  onPress={() => handleMarkRead(item)}
                  style={[
                    styles.calloutCard,
                    {
                      backgroundColor: isUnread ? tokens.surface : tokens.canvas,
                      borderColor: isUnread ? tokens.primary : tokens.rule,
                      borderLeftWidth: isUnread ? 4 : 1,
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
                      {getDestinationScreen(item.purpose) && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Xem chi tiết nội dung"
                          onPress={() => {
                            void handleMarkRead(item);
                            const dest = getDestinationScreen(item.purpose);
                            if (dest) onNavigate(dest);
                          }}
                          style={{
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
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
              );
            })
          ) : !loading ? (
            <View style={styles.emptyCard}>
              <BellIcon size={24} color={tokens.sage} />
              <Text style={[styles.emptyCardTitle, { color: tokens.text }]}>
                Hộp thư thông báo trống
              </Text>
              <Text style={[styles.emptyCardDesc, { color: tokens.muted }]}>
                Các cập nhật lịch trình, hợp đồng, đơn in và thanh toán sẽ xuất hiện tại đây.
              </Text>
            </View>
          ) : null}

          {/* Pagination Load More (Finding 7) */}
          {nextCursor ? (
            <View style={{ alignItems: 'center', marginTop: 6, marginBottom: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tải thêm thông báo cũ hơn"
                disabled={loadingMore}
                onPress={handleLoadMoreInbox}
                style={[
                  styles.outlineButton,
                  { borderColor: tokens.primary, paddingHorizontal: 16 },
                ]}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={tokens.primary} />
                ) : (
                  <Text style={{ fontSize: 12, fontWeight: '600', color: tokens.primary }}>
                    Tải thêm thông báo cũ hơn
                  </Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>
      )}

      {/* Tab 2: DEVICES */}
      {tab === 'devices' && (
        <View style={{ gap: 14 }}>
          {/* Honest Device Installation Status & Blocker Diagnostics (Finding 6) */}
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
                marginBottom: 4,
              }}
            >
              <Text style={[styles.calloutTitle, { color: tokens.text }]}>
                Định danh thiết bị Android & Push FCM
              </Text>
              <StatusTag tone="warm">Native FCM Blocker</StatusTag>
            </View>
            <Text style={[styles.calloutSubtitle, { color: tokens.muted, marginBottom: 8 }]}>
              Thiết bị sử dụng định danh cài đặt ổn định lưu trữ bảo mật (SecureStore). Hoạt động
              nhận push notification từ xa qua FCM hiện đang bị chặn bởi các rào cản kỹ thuật bên
              dưới.
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
                1. Cấu hình: google-services.json có sẵn tại thư mục gốc
                (com.wdp301.wedding.staging) nhưng chưa liên kết trong app.config.ts
                (android.googleServicesFile).
              </Text>
              <Text style={{ fontSize: 11, color: tokens.muted }}>
                2. SDK Client: Thư viện Push FCM (expo-notifications / react-native-firebase) chưa
                được cài đặt trong package.json.
              </Text>
              <Text style={{ fontSize: 11, color: tokens.muted }}>
                3. Build Native: Chưa biên dịch Android Gradle native plugin cho Firebase.
              </Text>
              <Text style={{ fontSize: 11, color: tokens.muted }}>
                4. Máy chủ: FCM background delivery worker phía máy chủ chưa kích hoạt.
              </Text>
            </View>
          </View>

          <Text style={[styles.policyTitle, { color: tokens.text, marginTop: 4 }]}>
            Danh sách thiết bị đã liên kết trên máy chủ ({installations.length})
          </Text>

          {installations.length > 0 ? (
            installations.map((inst) => (
              <View
                key={inst.id}
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
                    onPress={() => handleRevokeDevice(inst)}
                    style={[styles.outlineButton, { borderColor: tokens.champagne }]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: tokens.tagWarmText }}>
                      Hủy liên kết
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          ) : !loading ? (
            <View style={styles.emptyCard}>
              <Text style={[styles.emptyCardTitle, { color: tokens.text }]}>
                Chưa có thiết bị nào
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Tab 3: PREFERENCES */}
      {tab === 'preferences' && (
        <View style={{ gap: 14 }}>
          {preferences ? (
            <View
              style={[
                styles.calloutCard,
                { backgroundColor: tokens.surface, borderColor: tokens.rule },
              ]}
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
                    Nhận thông báo cập nhật hợp đồng, phụ lục và xác nhận thanh toán qua thư điện
                    tử.
                  </Text>
                </View>
                <Switch
                  value={preferences.reminderEmail}
                  onValueChange={(val) => handleTogglePreference('reminderEmail', val)}
                  trackColor={{ false: tokens.rule, true: tokens.primary }}
                />
              </View>

              <View style={[styles.prefRow, { paddingTop: 12 }]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.text }}>
                    Thông báo đẩy (Push Notification)
                  </Text>
                  <Text style={{ fontSize: 12, color: tokens.muted, marginTop: 2 }}>
                    Nhận thông báo trực tiếp trên màn hình thiết bị Android khi có thay đổi trạng
                    thái.
                  </Text>
                </View>
                <Switch
                  value={preferences.reminderPush}
                  onValueChange={(val) => handleTogglePreference('reminderPush', val)}
                  trackColor={{ false: tokens.rule, true: tokens.primary }}
                />
              </View>

              <Text style={{ fontSize: 11, color: tokens.sage, marginTop: 14 }}>
                Phiên bản cấu hình: #{preferences.revision}
              </Text>
            </View>
          ) : !loading ? (
            <View style={styles.emptyCard}>
              <Text style={[styles.emptyCardTitle, { color: tokens.text }]}>
                Không thể tải tùy chọn thông báo
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: {
    fontSize: 26,
    lineHeight: 28,
  },
  headerTitleWrap: { flex: 1 },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  tabText: {
    fontSize: 13,
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  calloutCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  calloutTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  calloutSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCardDesc: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13,
  },
  primaryButton: {
    minHeight: 38,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  outlineButton: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
});
