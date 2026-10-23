import { notify } from '@/lib/toast/feedback';
import '@/lib/alert';
import React, { useState } from 'react';
import { View } from 'react-native';
import { HyText as Text, HyCard, HyRow, HyScreen, HySheet, HyButton } from '@/components/hy-ui';
import { hy } from '@/theme';
import type { Profile } from '@/features/identity-access/experience-api';
import { NativeAccountSettings } from '../native-account-settings';
import { RestoredHealthPanel } from '../v0/restored-flow-controls';
import type { V0CommonProps } from '../v0/v0-types';

export function HyProfile({
  profile,
  session,
  onLogout,
  onNavigate,
  onProfileUpdated,
}: V0CommonProps) {
  const [security, setSecurity] = useState(false);
  const [health, setHealth] = useState(false);
  const [overriddenProfile, setOverriddenProfile] = useState<Profile | null>(null);
  const activeProfile = overriddenProfile ?? profile ?? null;

  const handleProfileUpdated = (updated: Profile) => {
    setOverriddenProfile(updated);
    onProfileUpdated?.(updated);
  };

  return (
    <HyScreen>
      <HyCard>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: hy.primarySoft,
            alignSelf: 'center',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: hy.display, fontSize: 28, color: hy.primary }}>HY</Text>
        </View>
        <Text style={{ textAlign: 'center', fontFamily: hy.display, fontSize: 26 }}>
          {activeProfile?.displayName || 'Hồ sơ cặp đôi'}
        </Text>
        {activeProfile?.displayEmail && (
          <Text style={{ textAlign: 'center', color: hy.muted }}>{activeProfile.displayEmail}</Text>
        )}
      </HyCard>
      <HyRow
        title="Hồ sơ & bảo mật"
        subtitle="Thông tin cá nhân, đổi mật khẩu và OTP"
        onPress={() => setSecurity(true)}
      />
      <HyRow
        title="Thông báo"
        subtitle="Hộp thư, tùy chọn và thiết bị"
        onPress={() => onNavigate('notifications')}
      />
      <HyRow
        title="Phiên đăng nhập"
        subtitle="Quản lý các thiết bị được cấp quyền"
        onPress={() => onNavigate('sessions')}
      />
      <HyRow
        title="Nhà hàng"
        subtitle="Thông tin, sảnh tiệc và thực đơn"
        onPress={() => onNavigate('catalog')}
      />
      <HyRow title="Thông tin kết nối" onPress={() => setHealth(true)} />
      <HyButton
        label="Đăng xuất"
        variant="outline"
        onPress={() =>
          notify('Đăng xuất', 'Bạn muốn đăng xuất trên thiết bị này?', [
            { text: 'Ở lại', style: 'cancel' },
            { text: 'Đăng xuất', style: 'destructive', onPress: onLogout },
          ])
        }
      />
      <HySheet visible={security} title="Hồ sơ & bảo mật" onClose={() => setSecurity(false)}>
        {session && onLogout ? (
          <NativeAccountSettings
            session={session}
            onSignedOut={onLogout}
            onProfileUpdated={handleProfileUpdated}
          />
        ) : (
          <Text>Phiên đăng nhập không còn khả dụng.</Text>
        )}
      </HySheet>
      <HySheet visible={health} title="Thông tin kết nối" onClose={() => setHealth(false)}>
        {health && <RestoredHealthPanel />}
      </HySheet>
    </HyScreen>
  );
}
