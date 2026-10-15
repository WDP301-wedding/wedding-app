import '@/lib/alert';
import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomNavBar,
  CalendarIcon,
  CheckIcon,
  FileTextIcon,
  MenuIcon,
  type TabItem,
} from '@/components/v0-primitives';
import { AndroidBillingPage } from '@/screens/billing';
import { useWeddingTheme } from '@/theme';
import { V0CatalogSubflow } from './v0-catalog-subflow';
import { V0NotificationsSubflow } from './v0-notifications-subflow';
import { V0SessionsSubflow } from './v0-sessions-subflow';
import { V0AccountTab } from './v0-account-tab';
import { V0InviteTab } from './v0-invite-tab';
import { V0OverviewTab } from './v0-overview-tab';
import { V0PlanTab } from './v0-plan-tab';
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

const NAV_TABS: readonly TabItem[] = [
  { id: 'overview', label: 'Tổng quan', icon: CalendarIcon },
  { id: 'plan', label: 'Kế hoạch', icon: CheckIcon },
  { id: 'invite', label: 'Thiệp', icon: FileTextIcon },
  { id: 'account', label: 'Tài khoản', icon: MenuIcon },
];

export interface V0CompanionShellProps extends Omit<V0CommonProps, 'onNavigate'> {
  readonly initialScreen?: V0Screen;
  readonly onNavigate?: (screen: V0Screen) => void;
}

export function V0CompanionShell({
  activeBooking,
  facts,
  initialScreen = 'overview',
  invitationGateway,
  onLogout,
  onNavigate: externalNavigate,
  onSwitchBooking,
  profile,
  session,
}: V0CompanionShellProps) {
  const { tokens } = useWeddingTheme();
  const [currentScreen, setCurrentScreen] = useState<V0Screen>(initialScreen);

  const handleNavigate = useCallback(
    (next: V0Screen) => {
      setCurrentScreen(next);
      externalNavigate?.(next);
    },
    [externalNavigate],
  );

  // Hardware back handling bounded to subflows/parent tabs
  useEffect(() => {
    const handleHardwareBack = () => {
      if (
        [
          'billing',
          'contracts',
          'appendices',
          'incidentals',
          'invoices',
          'catalog',
          'notifications',
          'sessions',
        ].includes(currentScreen)
      ) {
        handleNavigate('account');
        return true;
      }
      if (['schedule', 'media', 'print', 'guests', 'seating'].includes(currentScreen)) {
        handleNavigate('plan');
        return true;
      }
      if (['edit', 'share'].includes(currentScreen)) {
        handleNavigate('invite');
        return true;
      }
      if (currentScreen !== 'overview') {
        handleNavigate('overview');
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => subscription.remove();
  }, [currentScreen, handleNavigate]);

  const activeTabId = (() => {
    if (['schedule', 'media', 'print', 'guests', 'seating'].includes(currentScreen)) return 'plan';
    if (['edit', 'share'].includes(currentScreen)) return 'invite';
    if (
      [
        'billing',
        'contracts',
        'appendices',
        'incidentals',
        'invoices',
        'catalog',
        'notifications',
        'sessions',
      ].includes(currentScreen)
    )
      return 'account';
    return currentScreen;
  })();

  const renderScreen = () => {
    const commonProps: V0CommonProps = {
      facts,
      activeBooking,
      profile,
      session,
      invitationGateway,
      onNavigate: handleNavigate,
      onLogout,
      onSwitchBooking,
      onBack: () => {
        if (
          [
            'billing',
            'contracts',
            'appendices',
            'incidentals',
            'invoices',
            'catalog',
            'notifications',
            'sessions',
          ].includes(currentScreen)
        )
          handleNavigate('account');
        else if (['schedule', 'media', 'print', 'guests', 'seating'].includes(currentScreen))
          handleNavigate('plan');
        else if (['edit', 'share'].includes(currentScreen)) handleNavigate('invite');
        else handleNavigate('overview');
      },
    };

    switch (currentScreen) {
      case 'overview':
        return <V0OverviewTab {...commonProps} />;
      case 'invite':
      case 'edit':
      case 'share':
        return (
          <V0InviteTab
            {...commonProps}
            initialSubscreen={currentScreen === 'invite' ? 'preview' : currentScreen}
          />
        );
      case 'plan':
        return <V0PlanTab {...commonProps} />;
      case 'catalog':
        return <V0CatalogSubflow {...commonProps} />;
      case 'notifications':
        return <V0NotificationsSubflow {...commonProps} />;
      case 'sessions':
        return <V0SessionsSubflow {...commonProps} />;
      case 'account':
        return <V0AccountTab {...commonProps} />;
      case 'schedule':
        return <V0ScheduleSubflow {...commonProps} />;
      case 'media':
        return <V0MediaSubflow {...commonProps} />;
      case 'print':
        return <V0PrintSubflow {...commonProps} />;
      case 'guests':
      case 'seating':
        return <V0GuestsSubflow {...commonProps} />;
      case 'contracts':
        return <V0ContractsSubflow {...commonProps} />;
      case 'appendices':
        return <V0AppendicesSubflow {...commonProps} />;
      case 'incidentals':
        return <V0IncidentalsSubflow {...commonProps} />;
      case 'invoices':
        return <V0InvoicesSubflow {...commonProps} />;
      case 'billing':
        return (
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: tokens.canvas,
                borderBottomWidth: 1,
                borderBottomColor: tokens.rule,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quay lại tài khoản"
                onPress={() => handleNavigate('account')}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 22, color: tokens.primary }}>‹</Text>
              </Pressable>
              <Text style={{ fontSize: 17, fontWeight: '700', color: tokens.text, marginLeft: 8 }}>
                Thanh toán & Hóa đơn
              </Text>
            </View>
            <AndroidBillingPage
              {...(session ? { session } : {})}
              {...(activeBooking?.bookingId ? { initialBookingId: activeBooking.bookingId } : {})}
            />
          </View>
        );
      default:
        return <V0OverviewTab {...commonProps} />;
    }
  };

  return (
    <View style={[styles.shell, { backgroundColor: tokens.canvas }]}>
      <View style={styles.screenContainer}>{renderScreen()}</View>
      <BottomNavBar
        tabs={NAV_TABS}
        activeTab={activeTabId}
        onSelectTab={(tabId) => handleNavigate(tabId as V0Screen)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    position: 'relative',
  },
  screenContainer: {
    flex: 1,
  },
});
