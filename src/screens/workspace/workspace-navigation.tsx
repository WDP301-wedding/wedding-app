import { useEffect, useState, type ReactNode } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { BottomSheet, RNHostView } from '@expo/ui';
import { HyText as Text } from '@/components/hy-ui';
import { CalendarIcon, FileTextIcon, MenuIcon, UsersIcon, WalletIcon } from '@/components/icons';
import { useAppInsets } from '@/lib/safe-area';
import { hy } from '@/theme';
import { Action, NotificationHeaderContext, type Destination } from './workspace-common';

const tabs = [
  { id: 'overview', label: 'Tổng quan', Icon: CalendarIcon },
  { id: 'agreement', label: 'Thoả thuận', Icon: FileTextIcon },
  { id: 'payment', label: 'Thanh toán', Icon: WalletIcon },
  { id: 'prepare', label: 'Chuẩn bị', Icon: UsersIcon },
] as const;

export function WorkspaceNavigation({
  destination,
  phase,
  navigate,
  onSwitchBooking,
  canSwitch,
  children,
  unreadCount = 0,
}: {
  destination: Destination;
  phase?: string | undefined;
  navigate: (destination: Destination) => void;
  onSwitchBooking: () => void;
  canSwitch: boolean;
  children: ReactNode;
  unreadCount?: number;
}) {
  const [more, setMore] = useState(false);
  const moreSelected = destination === 'profile' || destination === 'settlement';
  const insets = useAppInsets();
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (more) {
        setMore(false);
        return true;
      }
      if (destination !== 'overview') {
        navigate('overview');
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [destination, more, navigate]);
  const go = (next: Destination) => {
    setMore(false);
    navigate(next);
  };
  return (
    <NotificationHeaderContext.Provider
      value={{
        unreadCount,
        active: destination === 'notifications',
        onPress: () => go('notifications'),
      }}
    >
      <View style={[n.root, { paddingTop: insets.top }]}>
        <View style={n.content}>{children}</View>
        <View
          accessibilityRole="tablist"
          style={[n.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}
        >
          {tabs.map(({ id, label, Icon }) => (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: destination === id }}
              onPress={() => navigate(id)}
              style={[n.tab, destination === id && n.selected]}
            >
              <Icon size={20} color={destination === id ? hy.primary : hy.muted} />
              <Text style={[n.label, destination === id && n.selectedText]}>{label}</Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="Thêm"
            accessibilityState={{
              selected: moreSelected,
            }}
            onPress={() => setMore(true)}
            style={[n.tab, moreSelected && n.selected]}
          >
            <MenuIcon size={20} color={moreSelected ? hy.primary : hy.muted} />
            <Text style={[n.label, moreSelected && n.selectedText]}>Thêm</Text>
          </Pressable>
        </View>
        <BottomSheet
          isPresented={more}
          onDismiss={() => setMore(false)}
          showDragIndicator={false}
          contentPadding={0}
          containerColor={hy.canvas}
          scrimColor={hy.scrim}
        >
          <RNHostView matchContents={{ vertical: true }}>
            <View
              testID="workspace-more-menu"
              accessibilityViewIsModal
              style={[n.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
            >
              <Text accessibilityRole="header" style={n.heading}>
                Không gian của hai bạn
              </Text>
              <Action
                label="Quyết toán"
                onPress={() => go('settlement')}
                disabled={phase !== 'COMPLETED'}
                secondary
              />
              {phase !== 'COMPLETED' && (
                <Text style={n.help}>Mở sau khi nhà hàng xác nhận tiệc đã tổ chức xong.</Text>
              )}
              <Action label="Hồ sơ" onPress={() => go('profile')} secondary />
              {canSwitch && (
                <Action
                  label="Đổi tiệc đang xem"
                  onPress={() => {
                    setMore(false);
                    onSwitchBooking();
                  }}
                  secondary
                />
              )}
              <Action label="Đóng" onPress={() => setMore(false)} secondary />
            </View>
          </RNHostView>
        </BottomSheet>
      </View>
    </NotificationHeaderContext.Provider>
  );
}
const n = StyleSheet.create({
  root: { flex: 1, backgroundColor: hy.canvas },
  content: { flex: 1 },
  bar: {
    flexDirection: 'row',
    backgroundColor: hy.surface,
    borderTopWidth: 1,
    borderTopColor: hy.rule,
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderTopWidth: 2,
    borderTopColor: 'transparent',
    paddingVertical: 4,
  },
  selected: { borderTopColor: hy.primary },
  label: { fontSize: 11, lineHeight: 17, textAlign: 'center', maxWidth: '100%', color: hy.muted },
  selectedText: { color: hy.primary, fontFamily: hy.semibold },
  sheet: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    backgroundColor: hy.canvas,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 20,
    gap: 12,
  },
  heading: { fontFamily: hy.semibold, fontSize: 20, lineHeight: 28 },
  help: { fontSize: 13, lineHeight: 20, color: hy.muted },
});
