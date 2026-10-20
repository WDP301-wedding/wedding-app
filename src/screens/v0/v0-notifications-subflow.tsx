import { notify } from '@/lib/toast/feedback';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { HyText as Text } from '@/components/hy-ui';
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

export interface V0NotificationsSubflowProps extends V0CommonProps {
  readonly initialUnreadCount?: number;
  readonly onUnreadCountChanged?: (count: number) => void;
}

export function V0NotificationsSubflow({
  onNavigate,
  session,
  activeBooking,
  allBookings,
  onSelectBooking,
  initialUnreadCount,
  onUnreadCountChanged,
}: V0NotificationsSubflowProps) {
  const { tokens } = useWeddingTheme();
  const [tab, setTab] = useState<'inbox' | 'devices' | 'preferences'>('inbox');
  const [inbox, setInbox] = useState<readonly InboxItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount ?? 0);
  const [preferences, setPreferences] = useState<NotificationPreferencesView | null>(null);
  const [installations, setInstallations] = useState<readonly AndroidInstallationItem[]>([]);
  const [loading, setLoading] = useState(Boolean(session));
  const [error, setError] = useState<string | null>(null);
  const [stableInstallationId, setStableInstallationId] = useState<string | null>(null);
  const mutatingRef = useRef(false);

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

  const loadRequestIdRef = useRef(0);

  const loadInboxData = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    const currentReq = ++loadRequestIdRef.current;
    setError(null);
    setLoading(true);

    const inboxPromise = session
      .authorize((token) => notificationGateway.listInbox(token, { limit: 30 }))
      .then((inboxRes) => {
        if (currentReq === loadRequestIdRef.current) {
          setInbox(inboxRes.items);
          setNextCursor(inboxRes.nextCursor ?? null);
          setLoading(false);
        }
      })
      .catch((caught) => {
        if (currentReq === loadRequestIdRef.current) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Không thể tải hộp thư thông báo. Vui lòng kiểm tra kết nối.',
          );
          setLoading(false);
        }
      });

    const unreadPromise = session
      .authorize((token) => notificationGateway.countUnread(token))
      .then((unreadRes) => {
        if (currentReq === loadRequestIdRef.current) {
          setUnreadCount(unreadRes);
          onUnreadCountChanged?.(unreadRes);
        }
      })
      .catch(() => {
        // Non-blocking unread count failure
      });

    await Promise.allSettled([inboxPromise, unreadPromise]);
  }, [session, onUnreadCountChanged]);

  const loadPreferencesData = useCallback(async () => {
    if (!session) return;
    try {
      const prefs = await session.authorize((token) => notificationGateway.getPreferences(token));
      setPreferences(prefs);
    } catch {
      // Non-blocking preference error
    }
  }, [session]);

  const loadInstallationsData = useCallback(async () => {
    if (!session) return;
    try {
      const list = await session.authorize((token) => notificationGateway.listInstallations(token));
      setInstallations(list);
    } catch {
      // Non-blocking installation error
    }
  }, [session]);

  useEffect(() => {
    const task = setTimeout(() => {
      void loadInboxData();
    }, 0);
    return () => clearTimeout(task);
  }, [loadInboxData]);

  useEffect(() => {
    const task = setTimeout(() => {
      if (tab === 'preferences' && !preferences) {
        void loadPreferencesData();
      } else if (tab === 'devices' && installations.length === 0) {
        void loadInstallationsData();
      }
    }, 0);
    return () => clearTimeout(task);
  }, [tab, preferences, installations.length, loadPreferencesData, loadInstallationsData]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await loadInboxData();
    if (tab === 'preferences') {
      await loadPreferencesData();
    } else if (tab === 'devices') {
      await loadInstallationsData();
    }
    setLoading(false);
  }, [loadInboxData, loadPreferencesData, loadInstallationsData, tab]);

  const handleLoadMoreInbox = async () => {
    if (!session || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const more = await session.authorize((token) =>
        notificationGateway.listInbox(token, { cursor: nextCursor, limit: 30 }),
      );
      setInbox((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const newItems = more.items.filter((i) => !existingIds.has(i.id));
        return [...prev, ...newItems];
      });
      setNextCursor(more.nextCursor ?? null);
    } catch (caught) {
      notify(
        'Lỗi tải thêm',
        caught instanceof Error ? caught.message : 'Không thể tải thêm thông báo.',
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const handleMarkRead = async (item: InboxItem) => {
    if (!session || item.readAt || mutatingRef.current) return;
    mutatingRef.current = true;
    try {
      await session.authorize((token) =>
        notificationGateway.readNotification(token, item.id, item.revision),
      );
      setInbox((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i)),
      );
      setUnreadCount((c) => {
        const nextCount = Math.max(0, c - 1);
        onUnreadCountChanged?.(nextCount);
        return nextCount;
      });
    } catch (caught) {
      notify('Lỗi', caught instanceof Error ? caught.message : 'Không thể đánh dấu đã đọc.');
    } finally {
      mutatingRef.current = false;
    }
  };

  const handleMarkAllRead = async () => {
    if (!session || inbox.length === 0 || mutatingRef.current) return;
    mutatingRef.current = true;
    const latestDate = inbox[0]?.createdAt ?? new Date().toISOString();
    try {
      await session.authorize((token) =>
        notificationGateway.readAllNotifications(token, latestDate),
      );
      setInbox((prev) => prev.map((i) => ({ ...i, readAt: i.readAt || new Date().toISOString() })));
      setUnreadCount(0);
      onUnreadCountChanged?.(0);
      notify('Thành công', 'Đã đánh dấu tất cả thông báo là đã đọc.');
    } catch (caught) {
      notify('Lỗi', caught instanceof Error ? caught.message : 'Không thể đánh dấu tất cả đã đọc.');
    } finally {
      mutatingRef.current = false;
    }
  };

  const handleTogglePreference = async (
    field: 'reminderEmail' | 'reminderPush',
    value: boolean,
  ) => {
    if (!session || !preferences || mutatingRef.current) return;
    mutatingRef.current = true;
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
      notify(
        'Lỗi cập nhật tùy chọn',
        caught instanceof Error ? caught.message : 'Không thể cập nhật tùy chọn thông báo.',
      );
    } finally {
      mutatingRef.current = false;
    }
  };

  const handleRevokeDevice = (item: AndroidInstallationItem) => {
    notify(
      'Hủy đăng ký thiết bị',
      'Bạn có chắc chắn muốn hủy đăng ký nhận thông báo đẩy trên thiết bị này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Hủy đăng ký',
          style: 'destructive',
          onPress: async () => {
            if (!session || mutatingRef.current) return;
            mutatingRef.current = true;
            try {
              await session.authorize((token) =>
                notificationGateway.revokeInstallation(token, item.id, item.revision),
              );
              notify('Thành công', 'Đã hủy đăng ký thiết bị thành công.');
              await loadInboxData();
              await loadInstallationsData();
            } catch (caught) {
              notify(
                'Lỗi hủy thiết bị',
                caught instanceof Error ? caught.message : 'Không thể hủy thiết bị.',
              );
            } finally {
              mutatingRef.current = false;
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => {
            setLoading(true);
            void loadData();
          }}
          tintColor={tokens.primary}
        />
      }
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
                    const notifBookingId = item.resource?.bookingId;
                    if (notifBookingId && notifBookingId !== activeBooking?.bookingId) {
                      const targetBooking = allBookings?.find(
                        (b) => b.bookingId === notifBookingId,
                      );
                      if (targetBooking && onSelectBooking) {
                        onSelectBooking(notifBookingId);
                      } else {
                        notify(
                          'Không có quyền truy cập',
                          'Bạn không có quyền xem tiệc cưới này hoặc tiệc cưới không tồn tại trong tài khoản của bạn.',
                        );
                        return;
                      }
                    }
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
