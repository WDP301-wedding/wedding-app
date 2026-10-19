import type { V0Screen } from './v0/v0-types';
import * as Linking from 'expo-linking';
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { HyText as Text } from '@/components/hy-ui';

import {
  type AndroidIdentitySession,
  type AndroidSessionSnapshot,
} from '@/features/identity-access/session';
import { sharedDeviceSession } from '@/features/identity-access/device-session';
import { type, useWeddingTheme } from '@/theme';

import { CoupleOverviewScreen } from './couple-overview';
import { styles } from './home.styles';
import { IdentityScreen } from './identity-screen';

export { IdentityScreen };

export function HomeScreen({
  initialResetToken,
  initialBookingId,
  initialScreen,
  session = sharedDeviceSession,
}: Readonly<{
  initialResetToken?: string | null;
  initialBookingId?: string | undefined;
  initialScreen?: V0Screen | undefined;
  session?: AndroidIdentitySession;
}>) {
  const { brand, colors } = useWeddingTheme();
  const incomingUrl = Linking.useURL();
  const [snapshot, setSnapshot] = useState<AndroidSessionSnapshot>(() => session.snapshot());
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'login' | 'reset-request'>('login');

  useEffect(() => {
    return session.subscribe(() => {
      setSnapshot(session.snapshot());
    });
  }, [session]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const url = incomingUrl ?? (await Linking.getInitialURL());
      if (url && (url.includes('/reset') || url.includes('#reset'))) {
        setMode('reset-request');
      }
      if (initialResetToken !== undefined && initialResetToken !== null) {
        setMode('reset-request');
      }
      const nextSnapshot = await session.restore();
      if (!active) return;
      setSnapshot(nextSnapshot);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [initialResetToken, incomingUrl, session]);

  if (loading) {
    return (
      <View style={[styles.sessionState, { backgroundColor: colors.background }]}>
        <Text style={[styles.sessionEyebrow, { color: brand.primary }]}>Hỷ Yến</Text>
        <Text style={[styles.sessionTitle, { color: brand.display }]}>Đang khôi phục phiên</Text>
        <Text selectable style={[type.body, { color: colors.secondaryLabel }]}>
          Phiên an toàn đang được kiểm tra từ máy chủ.
        </Text>
      </View>
    );
  }

  const isReset =
    mode === 'reset-request' ||
    Boolean(incomingUrl && (incomingUrl.includes('/reset') || incomingUrl.includes('#reset'))) ||
    (initialResetToken !== undefined && initialResetToken !== null);

  if (isReset || snapshot.status === 'anonymous') {
    return (
      <IdentityScreen
        key={isReset ? 'identity-reset' : 'identity-anon'}
        session={session}
        initialMode={isReset ? 'reset-request' : mode}
        onAuthenticated={(nextSnapshot) => {
          setSnapshot(nextSnapshot);
          setMode('login');
        }}
      />
    );
  }

  if (snapshot.access === 'denied') {
    return (
      <View
        style={[
          styles.sessionState,
          { backgroundColor: colors.background, paddingHorizontal: 24, justifyContent: 'center' },
        ]}
      >
        <Text style={[styles.sessionEyebrow, { color: brand.script }]}>TRUY CẬP BỊ TỪ CHỐI</Text>
        <Text style={[styles.sessionTitle, { color: brand.display, marginTop: 8 }]}>
          Tài khoản chưa có quyền truy cập
        </Text>
        <Text
          selectable
          style={[
            type.body,
            { color: colors.secondaryLabel, textAlign: 'center', marginVertical: 16 },
          ]}
        >
          Ứng dụng di động chỉ dành cho Cặp đôi có quyền FULL sau khi hoàn tất đặt cọc. Tài khoản
          của bạn ({snapshot.actor.displayEmail}) hiện ở trạng thái RESTRICTED hoặc chưa đủ quyền.
          Vui lòng thao tác trên phiên bản Web.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đăng xuất"
          testID="logout-button"
          onPress={() => {
            void session.logout().finally(() => setSnapshot(session.snapshot()));
          }}
          style={({ pressed }) => [
            styles.authPrimaryAction,
            { backgroundColor: brand.primary, width: '100%' },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.authPrimaryLabel, { color: brand.primaryText }]}>ĐĂNG XUẤT</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <CoupleOverviewScreen
      initialBookingId={initialBookingId}
      initialScreen={initialScreen}
      session={session}
      onLogout={() => {
        void session.logout().finally(() => setSnapshot(session.snapshot()));
      }}
    />
  );
}
