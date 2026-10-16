import '@/lib/alert';
import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Pressable, View } from 'react-native';
import { useAppInsets } from '@/lib/safe-area';
import { HyText as Text, HyState, HySheet, HyBadge } from '@/components/hy-ui';
import { CalendarIcon, BellIcon, WalletIcon, SparklesIcon } from '@/components/v0-icons';
import { hy } from '@/theme';
import { AndroidBillingPage } from '@/screens/billing';
import { HyParty } from '../hy/hy-party';
import { HyGuests } from '../hy/hy-guests';
import { HyProfile } from '../hy/hy-profile';
import { V0InviteTab } from './v0-invite-tab';
import { HyPartyDetail } from '../hy/hy-detail';
import { V0CatalogSubflow } from './v0-catalog-subflow';
import { V0NotificationsSubflow } from './v0-notifications-subflow';
import { V0SessionsSubflow } from './v0-sessions-subflow';
import { V2PrepareTab } from '../v2/v2-prepare-tab';
import { V2PaymentsTab } from '../v2/v2-payments-tab';
import { createNotificationGateway } from '@/features/notifications/notification-api';
import {
  V0AppendicesSubflow,
  V0ContractsSubflow,
  V0GuestsSubflow,
  V0IncidentalsSubflow,
  V0InvoicesSubflow,
  V0MediaSubflow,
  V0PrintSubflow,
  V0ScheduleSubflow,
} from './v0-subflows';
import type { V0CommonProps, V0Screen } from './v0-types';

export interface V0CompanionShellProps extends Omit<V0CommonProps, 'onNavigate'> {
  readonly initialScreen?: V0Screen;
  readonly onNavigate?: (screen: V0Screen) => void;
}

const notificationGateway = createNotificationGateway();

const tabs = [
  { id: 'overview', label: 'Tổng quan', Icon: CalendarIcon },
  { id: 'prepare', label: 'Chuẩn bị', Icon: SparklesIcon },
  { id: 'payments', label: 'Thanh toán', Icon: WalletIcon },
  { id: 'notifications', label: 'Thông báo', Icon: BellIcon },
] as const;

const names: Record<V0Screen, string> = {
  overview: 'Tổng quan tiệc cưới',
  prepare: 'Chuẩn bị',
  payments: 'Thanh toán & Ví tiệc',
  notifications: 'Thông báo',
  finance: 'Tài chính & Ví tiệc',
  guests: 'Khách mời',
  invite: 'Thiệp cưới',
  plan: 'Chi tiết tiệc',
  account: 'Hồ sơ',
  edit: 'Sửa nhanh thiệp',
  share: 'Chia sẻ thiệp',
  schedule: 'Lịch trình tiệc',
  media: 'Ảnh riêng tư',
  print: 'Đơn in thiệp',
  seating: 'Sơ đồ bàn tiệc',
  billing: 'Thanh toán & Ví tiệc',
  contracts: 'Hợp đồng thương mại',
  appendices: 'Phụ lục hợp đồng',
  incidentals: 'Chi phí phát sinh',
  invoices: 'Hóa đơn quyết toán',
  catalog: 'Khám phá nhà hàng',
  sessions: 'Phiên đăng nhập',
};

function parent(screen: V0Screen): V0Screen {
  if (['billing', 'contracts', 'appendices', 'incidentals', 'invoices', 'finance'].includes(screen))
    return 'payments';
  if (['guests', 'seating', 'invite', 'edit', 'share', 'print'].includes(screen)) return 'prepare';
  if (screen === 'sessions') return 'account';
  if (screen === 'account') return 'overview';
  return 'overview';
}

function resolveActiveTab(screen: V0Screen): (typeof tabs)[number]['id'] {
  if (tabs.some((t) => t.id === screen)) return screen as (typeof tabs)[number]['id'];
  if (['billing', 'contracts', 'appendices', 'incidentals', 'invoices', 'finance'].includes(screen))
    return 'payments';
  if (['guests', 'seating', 'invite', 'edit', 'share', 'print'].includes(screen)) return 'prepare';
  if (screen === 'notifications') return 'notifications';
  return 'overview';
}

export function V0CompanionShell({
  initialScreen = 'overview',
  onNavigate: externalNavigate,
  activeBooking,
  onSwitchBooking,
  allBookings,
  onSelectBooking,
  session,
  profile,
  ...props
}: V0CompanionShellProps) {
  const [screen, setScreen] = useState<V0Screen>(initialScreen);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const insets = useAppInsets();

  const navigate = useCallback(
    (next: V0Screen) => {
      if (!activeBooking && next === 'overview' && onSwitchBooking) {
        onSwitchBooking();
        return;
      }
      setScreen(next);
      externalNavigate?.(next);
    },
    [externalNavigate, activeBooking, onSwitchBooking],
  );

  const back = useCallback(() => navigate(parent(screen)), [navigate, screen]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'overview') return false;
      back();
      return true;
    });
    return () => sub.remove();
  }, [screen, back]);

  // Load unread count from API
  useEffect(() => {
    let active = true;
    if (session) {
      void session
        .authorize((t) => notificationGateway.countUnread(t))
        .then((count) => {
          if (active) setUnreadCount(count);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [session, screen]);

  const common: V0CommonProps = {
    ...props,
    session,
    profile,
    activeBooking,
    allBookings,
    onSelectBooking,
    onSwitchBooking,
    onNavigate: navigate,
    onBack: back,
  };

  const isTabScreen = tabs.some((t) => t.id === screen);
  const activeTabId = resolveActiveTab(screen);

  const renderContent = () => {
    if (!activeBooking && !['account', 'catalog', 'notifications', 'sessions'].includes(screen))
      return (
        <HyState
          kind="empty"
          title="Chọn tiệc để bắt đầu"
          body="Mở một tiệc cưới để xem tổng quan, chuẩn bị và tài chính."
          {...(onSwitchBooking ? { onRetry: onSwitchBooking } : {})}
        />
      );

    switch (screen) {
      case 'overview':
        return <HyParty {...common} />;
      case 'prepare':
        return <V2PrepareTab {...common} />;
      case 'payments':
      case 'finance':
        return <V2PaymentsTab {...common} />;
      case 'notifications':
        return <V0NotificationsSubflow {...common} />;
      case 'guests':
        return <HyGuests {...common} />;
      case 'account':
        return <HyProfile {...common} />;
      case 'invite':
      case 'edit':
      case 'share':
        return (
          <V0InviteTab {...common} initialSubscreen={screen === 'invite' ? 'preview' : screen} />
        );
      case 'plan':
        return <HyPartyDetail {...common} />;
      case 'schedule':
        return <V0ScheduleSubflow {...common} />;
      case 'media':
        return <V0MediaSubflow {...common} />;
      case 'print':
        return <V0PrintSubflow {...common} />;
      case 'seating':
        return <V0GuestsSubflow {...common} />;
      case 'contracts':
        return <V0ContractsSubflow {...common} />;
      case 'appendices':
        return <V0AppendicesSubflow {...common} />;
      case 'incidentals':
        return <V0IncidentalsSubflow {...common} />;
      case 'invoices':
        return <V0InvoicesSubflow {...common} />;
      case 'catalog':
        return <V0CatalogSubflow {...common} />;
      case 'sessions':
        return <V0SessionsSubflow {...common} />;
      case 'billing':
        return (
          <AndroidBillingPage
            {...(session ? { session } : {})}
            {...(activeBooking ? { initialBookingId: activeBooking.bookingId } : {})}
          />
        );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: hy.canvas, paddingTop: insets.top }}>
      {/* Top Header */}
      <View
        style={{
          minHeight: 64,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderBottomWidth: 1,
          borderBottomColor: hy.rule,
          backgroundColor: hy.canvas,
        }}
      >
        {!isTabScreen && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={back}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 28, color: hy.primary }}>‹</Text>
          </Pressable>
        )}

        {/* Title or Booking Switcher */}
        {allBookings && allBookings.length >= 2 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đổi tiệc cưới"
            onPress={() => setSwitcherOpen(true)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingVertical: 8,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: hy.bold,
                  fontSize: 18,
                  lineHeight: 24,
                  fontWeight: '700',
                  color: hy.ink,
                }}
                numberOfLines={1}
              >
                {activeBooking?.hallName || names[screen]}
              </Text>
              <Text style={{ fontSize: 12, color: hy.muted }}>
                {props.facts.formattedDate} · Chạm để đổi tiệc ⌄
              </Text>
            </View>
          </Pressable>
        ) : (
          <Text
            style={{
              fontFamily: hy.bold,
              fontSize: 20,
              lineHeight: 28,
              fontWeight: '700',
              flex: 1,
              color: hy.ink,
            }}
            numberOfLines={1}
          >
            {names[screen]}
          </Text>
        )}

        {/* Notification Bell with Badge */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Mở thông báo${unreadCount > 0 ? `, ${unreadCount} tin chưa đọc` : ''}`}
          onPress={() => navigate('notifications')}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <BellIcon color={screen === 'notifications' ? hy.primary : hy.muted} />
          {unreadCount > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: hy.error,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 4,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </Pressable>

        {/* Avatar opening Profile */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mở hồ sơ cá nhân"
          onPress={() => navigate('account')}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: hy.primarySoft,
            borderWidth: 1.5,
            borderColor: hy.gold,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: hy.monogram,
              fontSize: 13,
              fontWeight: '600',
              color: hy.primary,
            }}
          >
            HY
          </Text>
        </Pressable>
      </View>

      {/* Screen Subtree (keyed by booking ID for clean resets when switching bookings) */}
      <View key={activeBooking?.bookingId ?? 'no-booking'} style={{ flex: 1 }}>
        {renderContent()}
      </View>

      {/* 4 Bottom Tabs */}
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row',
          backgroundColor: hy.surface,
          borderTopWidth: 1,
          borderTopColor: hy.rule,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 10),
        }}
      >
        {tabs.map(({ id, label, Icon }) => {
          const isSelected = activeTabId === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: isSelected }}
              onPress={() => navigate(id)}
              style={{
                flex: 1,
                minHeight: 56,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 30,
                  borderRadius: 16,
                  backgroundColor: isSelected ? hy.primarySoft : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Icon size={21} color={isSelected ? hy.primary : hy.muted} />
                {id === 'notifications' && unreadCount > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 1,
                      right: 12,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: hy.error,
                    }}
                  />
                )}
              </View>
              <Text
                style={{
                  fontSize: 11,
                  lineHeight: 16,
                  fontWeight: isSelected ? '700' : '500',
                  color: isSelected ? hy.primary : hy.muted,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Booking Switcher Bottom Sheet */}
      {allBookings && allBookings.length >= 2 && (
        <HySheet
          visible={switcherOpen}
          title="Chọn tiệc cưới"
          onClose={() => setSwitcherOpen(false)}
        >
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 13, color: hy.secondary, lineHeight: 18 }}>
              Tài khoản của bạn có {allBookings.length} tiệc cưới. Chạm để chuyển đổi tiệc đang theo
              dõi.
            </Text>

            {allBookings.map((b) => {
              const isActive = b.bookingId === activeBooking?.bookingId;
              const formattedDate = new Date(`${b.eventDate}T00:00:00+07:00`).toLocaleDateString(
                'vi-VN',
                {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                },
              );

              return (
                <Pressable
                  key={b.bookingId}
                  accessibilityRole="button"
                  accessibilityLabel={`Tiệc ${b.hallName}, ngày ${formattedDate}`}
                  onPress={() => {
                    setSwitcherOpen(false);
                    if (!isActive && onSelectBooking) {
                      onSelectBooking(b.bookingId);
                    }
                  }}
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: isActive ? hy.primary : hy.rule,
                    backgroundColor: isActive ? hy.primarySoft : hy.surface,
                    gap: 6,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '700',
                        color: isActive ? hy.primary : hy.ink,
                      }}
                    >
                      {b.hallName}
                    </Text>
                    <HyBadge
                      status={
                        b.phase === 'CONFIRMED' || b.phase === 'COMPLETED'
                          ? 'done'
                          : b.phase === 'AWAITING_DEPOSIT'
                            ? 'waiting'
                            : 'neutral'
                      }
                      label={
                        b.phase === 'CONFIRMED'
                          ? 'Đã xác nhận'
                          : b.phase === 'COMPLETED'
                            ? 'Đã hoàn thành'
                            : b.phase === 'AWAITING_DEPOSIT'
                              ? 'Chờ đặt cọc'
                              : 'Bản nháp'
                      }
                    />
                  </View>
                  <Text style={{ fontSize: 13, color: hy.secondary }}>
                    {formattedDate} · {b.shiftCode === 'LUNCH' ? 'Tiệc trưa' : 'Tiệc tối'} ·{' '}
                    {b.planningHeadcount} khách kế hoạch
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </HySheet>
      )}
    </View>
  );
}
