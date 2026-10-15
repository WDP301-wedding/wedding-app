import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';
import { BellIcon, RotateCcwIcon } from '@/components/v0-primitives';
import {
  createNotificationGateway,
  type AndroidInstallationItem,
  type InboxItem,
  type NotificationPreferencesView,
} from '@/features/notifications/notification-api';
import { useWeddingTheme } from '@/theme';
import type { V0CommonProps } from './v0-types';
import { styles } from './v0-notifications-subflow.styles';
import {
  NotificationDeviceCard,
  NotificationDeviceDiagnosticCard,
  NotificationInboxCard,
  NotificationPreferencesCard,
  NotificationTabBar,
  getDestinationScreen,
} from './notifications/notification-cards';

export { styles };

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

  const loadData = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const [inboxRes, unreadRes, prefsRes, installsRes] = await Promise.all([
        session.authorize((token) => notificationGateway.listInbox(token, { limit: 30 })),
        session.authorize((token) => notificationGateway.countUnread(token)),
        session.authorize((token) => notificationGateway.getPreferences(token)),
        session.authorize((token) => notificationGateway.listInstallations(token)),
      ]);
      setInbox(inboxRes.items);
      setNextCursor(inboxRes.nextCursor ?? null);
      setUnreadCount(unreadRes);
      setPreferences(prefsRes);
      setInstallations(installsRes);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không thể tải thông báo. Vui lòng kiểm tra kết nối.',
      );
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

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
          onPress={() => {
            setLoading(true);
            void loadData();
          }}
          style={styles.refreshButton}
        >
          <RotateCcwIcon size={18} color={tokens.primary} />
        </Pressable>
      </View>

      {/* Tabs */}
      <NotificationTabBar tab={tab} setTab={setTab} unreadCount={unreadCount} />

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
              const dest = getDestinationScreen(item.purpose);
              return (
                <NotificationInboxCard
                  key={item.id}
                  item={item}
                  destination={dest}
                  onMarkRead={() => handleMarkRead(item)}
                  onNavigateDetail={() => {
                    void handleMarkRead(item);
                    if (dest) onNavigate(dest);
                  }}
                />
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
          <NotificationDeviceDiagnosticCard stableInstallationId={stableInstallationId} />

          <Text style={[styles.policyTitle, { color: tokens.text, marginTop: 4 }]}>
            Danh sách thiết bị đã liên kết trên máy chủ ({installations.length})
          </Text>

          {installations.length > 0 ? (
            installations.map((inst) => (
              <NotificationDeviceCard
                key={inst.id}
                inst={inst}
                onRevoke={() => handleRevokeDevice(inst)}
              />
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
            <NotificationPreferencesCard
              preferences={preferences}
              onToggle={handleTogglePreference}
            />
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
