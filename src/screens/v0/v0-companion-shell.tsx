import '@/lib/alert';
import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HyText as Text, HyState } from '@/components/hy-ui';
import { CalendarIcon, UsersIcon, FileTextIcon, BellIcon, WalletIcon } from '@/components/v0-icons';
import { hy } from '@/theme';
import { AndroidBillingPage } from '@/screens/billing';
import { HyParty } from '../hy/hy-party';
import { HyGuests } from '../hy/hy-guests';
import { HyFinance } from '../hy/hy-finance';
import { HyProfile } from '../hy/hy-profile';
import { V0InviteTab } from './v0-invite-tab';
import { HyPartyDetail } from '../hy/hy-detail';
import { V0CatalogSubflow } from './v0-catalog-subflow';
import { V0NotificationsSubflow } from './v0-notifications-subflow';
import { V0SessionsSubflow } from './v0-sessions-subflow';
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
const tabs = [
  { id: 'overview', label: 'Tiệc', Icon: CalendarIcon },
  { id: 'guests', label: 'Khách', Icon: UsersIcon },
  { id: 'invite', label: 'Thiệp', Icon: FileTextIcon },
  { id: 'finance', label: 'Tài chính', Icon: WalletIcon },
] as const;
const names: Record<V0Screen, string> = {
  overview: 'Tiệc của hai bạn',
  guests: 'Khách mời',
  invite: 'Thiệp cưới',
  finance: 'Tài chính',
  plan: 'Chi tiết tiệc',
  account: 'Hồ sơ của bạn',
  edit: 'Sửa nhanh thiệp',
  share: 'Chia sẻ thiệp',
  schedule: 'Lịch trình',
  media: 'Ảnh cưới',
  print: 'Đơn in',
  seating: 'Nhóm khách & sơ đồ',
  billing: 'Thanh toán',
  contracts: 'Hợp đồng',
  appendices: 'Phụ lục',
  incidentals: 'Chi phí phát sinh',
  invoices: 'Hóa đơn',
  catalog: 'Nhà hàng',
  notifications: 'Thông báo',
  sessions: 'Phiên đăng nhập',
};
function parent(screen: V0Screen): V0Screen {
  if (['billing', 'contracts', 'appendices', 'incidentals', 'invoices', 'print'].includes(screen))
    return 'finance';
  if (['edit', 'share'].includes(screen)) return 'invite';
  if (screen === 'seating') return 'guests';
  if (screen === 'sessions') return 'account';
  return 'overview';
}
export function V0CompanionShell({
  initialScreen = 'overview',
  onNavigate: externalNavigate,
  ...props
}: V0CompanionShellProps) {
  const [screen, setScreen] = useState<V0Screen>(initialScreen);
  const insets = useSafeAreaInsets();
  const navigate = useCallback(
    (next: V0Screen) => {
      setScreen(next);
      externalNavigate?.(next);
    },
    [externalNavigate],
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
  const common: V0CommonProps = { ...props, onNavigate: navigate, onBack: back };
  const tab = tabs.some((t) => t.id === screen);
  const active = tab ? screen : parent(screen);
  const render = () => {
    if (
      !props.activeBooking &&
      !['account', 'catalog', 'notifications', 'sessions'].includes(screen)
    )
      return (
        <HyState
          kind="empty"
          title="Chọn tiệc để bắt đầu"
          body="Mở một tiệc cưới để xem khách mời, thiệp và tài chính."
          {...(props.onSwitchBooking ? { onRetry: props.onSwitchBooking } : {})}
        />
      );
    switch (screen) {
      case 'overview':
        return <HyParty {...common} />;
      case 'guests':
        return <HyGuests {...common} />;
      case 'finance':
        return <HyFinance {...common} />;
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
      case 'notifications':
        return <V0NotificationsSubflow {...common} />;
      case 'sessions':
        return <V0SessionsSubflow {...common} />;
      case 'billing':
        return (
          <AndroidBillingPage
            {...(props.session ? { session: props.session } : {})}
            {...(props.activeBooking ? { initialBookingId: props.activeBooking.bookingId } : {})}
          />
        );
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: hy.canvas, paddingTop: insets.top }}>
      <View
        style={{
          minHeight: 72,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderBottomWidth: 1,
          borderBottomColor: hy.rule,
        }}
      >
        {!tab && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={back}
            style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 30, color: hy.primary }}>‹</Text>
          </Pressable>
        )}
        <Text style={{ fontFamily: hy.display, fontSize: 24, lineHeight: 32, flex: 1 }}>
          {names[screen]}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mở thông báo"
          onPress={() => navigate('notifications')}
          style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <BellIcon color={hy.primary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mở hồ sơ"
          onPress={() => navigate('account')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: hy.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontWeight: '600', color: hy.primary }}>
            {props.profile?.displayName?.trim().slice(0, 1).toLocaleUpperCase() || 'HY'}
          </Text>
        </Pressable>
      </View>
      <View key={props.activeBooking?.bookingId ?? 'no-booking'} style={{ flex: 1 }}>
        {render()}
      </View>
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
        {tabs.map(({ id, label, Icon }) => (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: active === id }}
            onPress={() => navigate(id)}
            style={{
              flex: 1,
              minHeight: 60,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
            }}
          >
            <View
              style={{
                width: 60,
                height: 30,
                borderRadius: 18,
                backgroundColor: active === id ? hy.primarySoft : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={21} color={active === id ? hy.primary : hy.muted} />
            </View>
            <Text
              style={{
                fontSize: 11,
                lineHeight: 16,
                fontWeight: active === id ? '600' : '400',
                color: active === id ? hy.primary : hy.muted,
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
