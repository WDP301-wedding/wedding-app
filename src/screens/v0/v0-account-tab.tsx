import '@/lib/alert';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CalendarIcon, ChevronRightIcon, FileTextIcon, LockIcon } from '@/components/v0-primitives';
import { deriveInitials, NativeAccountSettings } from '@/screens/couple-overview';
import { useWeddingTheme } from '@/theme';
import { RestoredHealthPanel } from './restored-flow-controls';
import type { V0CommonProps } from './v0-types';

export function V0AccountTab({ facts, onLogout, onNavigate, profile, session }: V0CommonProps) {
  const { tokens } = useWeddingTheme();

  // Toggle inline security/password settings
  const [showSecurity, setShowSecurity] = useState(false);

  // Derive initials dynamically from couple names or profile
  const initials = deriveInitials(facts.brideName, facts.groomName, profile?.displayName);

  const handleLogoutPress = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi phiên trên thiết bị này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => {
          onLogout?.();
        },
      },
    ]);
  };

  const displayName = profile?.displayName || facts.coupleDisplay;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Topbar */}
      <View style={styles.topbar}>
        <View style={styles.topbarLeft}>
          <Text style={[styles.eyebrow, { color: tokens.sage }]}>Tài khoản</Text>
          <Text style={[styles.heading, { color: tokens.text }]}>Thông tin của hai bạn</Text>
        </View>
        <View style={[styles.avatarSmall, { backgroundColor: tokens.primary }]}>
          <Text style={[styles.avatarSmallText, { color: tokens.onPrimary }]}>{initials}</Text>
        </View>
      </View>

      {/* Account Card */}
      <View style={[styles.accountCard, { borderBottomColor: tokens.rule }]}>
        <View style={[styles.avatarLarge, { backgroundColor: tokens.primary }]}>
          <Text style={[styles.avatarLargeText, { color: tokens.onPrimary }]}>{initials}</Text>
        </View>
        <View style={styles.accountInfo}>
          <Text style={[styles.accountName, { color: tokens.text }]}>{displayName}</Text>
          <Text style={[styles.accountRole, { color: tokens.muted }]}>Tài khoản cặp đôi</Text>
          {profile?.displayEmail ? (
            <Text style={[styles.accountEmail, { color: tokens.sage }]}>
              {profile.displayEmail}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Account Rows */}
      <View style={styles.accountList}>
        {(
          [
            ['catalog', 'Nhà hàng, sảnh và thực đơn'],
            ['notifications', 'Thông báo và thiết bị'],
            ['sessions', 'Các phiên đăng nhập'],
          ] as const
        ).map(([screen, label]) => (
          <Pressable
            key={screen}
            accessibilityRole="button"
            onPress={() => onNavigate(screen)}
            style={[styles.secondaryRow, { borderBottomColor: tokens.rule }]}
          >
            <Text style={[styles.secondaryRowTitle, { color: tokens.text }]}>{label}</Text>
          </Pressable>
        ))}
        <RestoredHealthPanel />
        {/* Row 1: Commercial Contracts */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hợp đồng tiệc cưới"
          onPress={() => onNavigate('contracts')}
          style={[styles.secondaryRow, { borderBottomColor: tokens.rule }]}
        >
          <FileTextIcon size={18} color={tokens.sage} />
          <View style={styles.secondaryRowCopy}>
            <Text style={[styles.secondaryRowTitle, { color: tokens.text }]}>
              Hợp đồng tiệc cưới
            </Text>
            <Text style={[styles.secondaryRowSub, { color: tokens.muted }]}>
              Xem các phiên bản hợp đồng & tải tệp PDF bảo mật
            </Text>
          </View>
          <ChevronRightIcon size={17} color={tokens.muted} />
        </Pressable>

        {/* Row 2: Appendices */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Phụ lục hợp đồng"
          onPress={() => onNavigate('appendices')}
          style={[styles.secondaryRow, { borderBottomColor: tokens.rule }]}
        >
          <FileTextIcon size={18} color={tokens.sage} />
          <View style={styles.secondaryRowCopy}>
            <Text style={[styles.secondaryRowTitle, { color: tokens.text }]}>Phụ lục hợp đồng</Text>
            <Text style={[styles.secondaryRowSub, { color: tokens.muted }]}>
              Xem điều chỉnh phát sinh & phụ lục đã duyệt
            </Text>
          </View>
          <ChevronRightIcon size={17} color={tokens.muted} />
        </Pressable>

        {/* Row 3: Incidental Expenses */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chi phí phát sinh"
          onPress={() => onNavigate('incidentals')}
          style={[styles.secondaryRow, { borderBottomColor: tokens.rule }]}
        >
          <FileTextIcon size={18} color={tokens.sage} />
          <View style={styles.secondaryRowCopy}>
            <Text style={[styles.secondaryRowTitle, { color: tokens.text }]}>
              Chi phí phát sinh
            </Text>
            <Text style={[styles.secondaryRowSub, { color: tokens.muted }]}>
              Chi tiết đồ uống, dịch vụ phát sinh thực tế trong tiệc
            </Text>
          </View>
          <ChevronRightIcon size={17} color={tokens.muted} />
        </Pressable>

        {/* Row 4: Final Invoices */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hóa đơn quyết toán cuối"
          onPress={() => onNavigate('invoices')}
          style={[styles.secondaryRow, { borderBottomColor: tokens.rule }]}
        >
          <FileTextIcon size={18} color={tokens.sage} />
          <View style={styles.secondaryRowCopy}>
            <Text style={[styles.secondaryRowTitle, { color: tokens.text }]}>
              Hóa đơn quyết toán cuối
            </Text>
            <Text style={[styles.secondaryRowSub, { color: tokens.muted }]}>
              Hóa đơn quyết toán chính thức sau nghiệm thu tiệc
            </Text>
          </View>
          <ChevronRightIcon size={17} color={tokens.muted} />
        </Pressable>

        {/* Row 5: Balance & Payment Ledger */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thanh toán & Sổ cái số dư"
          onPress={() => onNavigate('billing')}
          style={[styles.secondaryRow, { borderBottomColor: tokens.rule }]}
        >
          <FileTextIcon size={18} color={tokens.sage} />
          <View style={styles.secondaryRowCopy}>
            <Text style={[styles.secondaryRowTitle, { color: tokens.text }]}>
              Thanh toán & Sổ cái số dư
            </Text>
            <Text style={[styles.secondaryRowSub, { color: tokens.muted }]}>
              Xem số dư, thanh toán online VNPay & lịch sử giao dịch
            </Text>
          </View>
          <ChevronRightIcon size={17} color={tokens.muted} />
        </Pressable>

        {/* Row 3: Event Facts */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ngày giờ & sảnh tiệc"
          onPress={() =>
            Alert.alert(
              'Chi tiết tiệc cưới',
              `• Địa điểm: ${facts.venueName}\n• Sảnh: ${facts.hallName}\n• Thời gian: ${facts.formattedDate} (${facts.shiftTime})\n• Khách dự kiến: ${facts.planningHeadcount} khách`,
            )
          }
          style={[styles.secondaryRow, { borderBottomColor: tokens.rule }]}
        >
          <CalendarIcon size={18} color={tokens.sage} />
          <View style={styles.secondaryRowCopy}>
            <Text style={[styles.secondaryRowTitle, { color: tokens.text }]}>
              Ngày giờ & sảnh tiệc
            </Text>
            <Text style={[styles.secondaryRowSub, { color: tokens.muted }]}>
              {facts.formattedDate} · {facts.hallName}
            </Text>
          </View>
          <ChevronRightIcon size={17} color={tokens.muted} />
        </Pressable>

        {/* Row 4: Security & Password */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bảo mật phiên đăng nhập"
          onPress={() => setShowSecurity((prev) => !prev)}
          style={[styles.secondaryRow, { borderBottomColor: tokens.rule }]}
        >
          <LockIcon size={18} color={tokens.sage} />
          <View style={styles.secondaryRowCopy}>
            <Text style={[styles.secondaryRowTitle, { color: tokens.text }]}>
              Bảo mật phiên đăng nhập
            </Text>
            <Text style={[styles.secondaryRowSub, { color: tokens.muted }]}>
              {showSecurity ? 'Đang mở cài đặt bên dưới' : 'Đổi mật khẩu & xác thực OTP'}
            </Text>
          </View>
          <ChevronRightIcon size={17} color={tokens.muted} />
        </Pressable>
      </View>

      {/* Inline Security Settings */}
      {showSecurity && session && onLogout ? (
        <View
          style={[
            styles.securityContainer,
            { backgroundColor: tokens.surface, borderColor: tokens.rule },
          ]}
        >
          <Text style={[styles.securityHeading, { color: tokens.text }]}>
            Đổi mật khẩu tài khoản
          </Text>
          <NativeAccountSettings session={session} onSignedOut={onLogout} />
        </View>
      ) : null}

      {/* Logout Action */}
      <View style={styles.logoutWrapper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đăng xuất khỏi thiết bị"
          onPress={handleLogoutPress}
          style={({ pressed }) => [
            styles.logoutButton,
            {
              borderColor: tokens.rule,
              backgroundColor: pressed ? tokens.surfaceMuted : 'transparent',
            },
          ]}
        >
          <Text style={[styles.logoutButtonText, { color: tokens.earth }]}>
            Đăng xuất khỏi thiết bị
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 96,
  },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  topbarLeft: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  heading: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmallText: {
    fontSize: 12,
    fontWeight: '700',
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 16,
    marginBottom: 12,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeText: {
    fontSize: 18,
    fontWeight: '700',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 2,
  },
  accountRole: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 2,
  },
  accountEmail: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  accountList: {
    marginTop: 8,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
    minHeight: 48,
  },
  secondaryRowCopy: {
    flex: 1,
  },
  secondaryRowTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  secondaryRowSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  securityContainer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    marginTop: 18,
  },
  securityHeading: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 14,
  },
  logoutWrapper: {
    marginTop: 32,
    alignItems: 'center',
  },
  logoutButton: {
    minHeight: 44,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoutButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
