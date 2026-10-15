import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CircleHelpIcon,
  ClockIcon,
  FileTextIcon,
  ImageIcon,
  LockIcon,
  StatusTag,
  UsersIcon,
} from '@/components/v0-primitives';
import {
  createAppInvitationGateway,
  type AppPrintOrderView,
} from '@/features/invitation-studio/app-invitation-api';
import { ApiClientError } from '@/lib/api/client';
import { useWeddingTheme } from '@/theme';
import {
  RestoredInvoicePanel,
  RestoredTimelinePanel,
  RestoredCommercialPanel,
  RestoredGuestPanel,
  RestoredPrintPanel,
} from '../restored-flow-controls';
import { saveOrShareDownloadedFile } from '@/lib/save-downloaded-file';
import type { V0CommonProps } from '../v0-types';
import { styles } from './subflows.styles';
import {
  money,
  coupleBilling,
  printStatusMeta,
  type CommercialContractView,
  type CommercialAppendixView,
  type IncidentalExpensesView,
  type CommercialInvoiceView,
  type GuestGroupView,
  type NamedGuestView,
} from './subflows-common';

export function V0GuestsSubflow({ activeBooking, facts, onNavigate, session }: V0CommonProps) {
  const { tokens } = useWeddingTheme();
  const [groups, setGroups] = useState<GuestGroupView>([]);
  const [guests, setGuests] = useState<NamedGuestView['items']>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!session || !activeBooking?.bookingId) return;
      setLoading(true);
      setError(null);
      try {
        const [loadedGroups, loadedGuests] = await session.authorize(async (token) => {
          const gGroups = await coupleBilling.loadGuestGroups(token, activeBooking.bookingId);
          const gGuests = await coupleBilling.loadGuests(token, activeBooking.bookingId);
          return [gGroups, gGuests.items] as const;
        });
        if (active) {
          setGroups(loadedGroups);
          setGuests(loadedGuests);
        }
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Chưa tải được danh sách nhóm khách mời từ máy chủ.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [session, activeBooking?.bookingId]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <RestoredGuestPanel activeBooking={activeBooking} session={session} />
      <View style={styles.pageHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về kế hoạch"
          onPress={() => onNavigate('plan')}
          style={styles.backButton}
        >
          <Text style={[styles.backGlyph, { color: tokens.primary }]}>‹</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.eyebrow, { color: tokens.sage }]}>Kế hoạch</Text>
          <Text style={[styles.heading, { color: tokens.text }]}>Khách mời & chỗ ngồi</Text>
        </View>
      </View>

      <View
        style={[
          styles.calloutCard,
          { backgroundColor: tokens.surface, borderColor: tokens.premium },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <CircleHelpIcon size={16} color={tokens.sage} />
          <Text style={[styles.calloutTitle, { color: tokens.primary }]}>
            Quy định danh sách & sơ đồ bàn
          </Text>
        </View>
        <Text style={[styles.calloutSubtitle, { color: tokens.muted }]}>
          • Quản lý theo Nhóm (Group) và Danh sách khách mời tùy chọn.{'\n'}• Sơ đồ bàn tiệc hoạt
          động theo Nhóm mà không bắt buộc phải có tên khách cụ thể.{'\n'}• Hệ thống không lưu trữ
          danh tính theo Hộ gia đình (Household).{'\n'}• Khách mời chỉ xem thiệp trực tuyến, không
          có tính năng phản hồi RSVP.{'\n'}• Điểm danh (Check-in) là tùy chọn opt-in cho từng tiệc
          và mặc định TẮT. Khi tắt, hệ thống không ghi nhận chứ không phải là 0 khách tham dự.
        </Text>
      </View>

      <View
        style={[
          styles.calloutCard,
          { backgroundColor: tokens.surface, borderColor: tokens.rule, marginTop: 12 },
        ]}
      >
        <Text style={[styles.calloutTitle, { color: tokens.text, marginBottom: 8 }]}>
          Kế hoạch sảnh tiệc & số lượng khách
        </Text>
        <View style={styles.factRow}>
          <Text style={{ fontSize: 13, color: tokens.muted }}>Sảnh tiệc đã xác nhận:</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: tokens.text }}>
            {facts.hallName}
          </Text>
        </View>
        <View style={styles.factRow}>
          <Text style={{ fontSize: 13, color: tokens.muted }}>Khung giờ tiệc:</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: tokens.text }}>
            {facts.shiftTime}
          </Text>
        </View>
        <View style={styles.factRow}>
          <Text style={{ fontSize: 13, color: tokens.muted }}>Số lượng khách kế hoạch:</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.primary }}>
            {facts.planningHeadcount} khách
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: tokens.earth, marginTop: 4 }}>
          Số lượng khách kế hoạch do Cặp đôi / Quản lý nhập độc lập, không phụ thuộc và không bị ảnh
          hưởng bởi số lượng tên khách trong danh sách.
        </Text>
      </View>

      {loading && <ActivityIndicator color={tokens.primary} style={{ marginVertical: 16 }} />}

      {error ? (
        <View style={[styles.emptyCard, { borderColor: tokens.champagne, marginBottom: 16 }]}>
          <Text style={{ color: tokens.tagWarmText, fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      <View style={{ marginTop: 18 }}>
        <Text style={[styles.policyTitle, { color: tokens.text, marginBottom: 8 }]}>
          Danh sách Nhóm khách mời từ máy chủ ({groups.length} nhóm)
        </Text>

        {groups.length > 0 ? (
          groups.map((grp) => {
            const groupGuests = guests.filter((g) => g.guestGroupId === grp.guestGroupId);
            return (
              <View
                key={grp.guestGroupId}
                style={[
                  styles.calloutCard,
                  {
                    backgroundColor: tokens.surface,
                    borderColor: tokens.rule,
                    marginBottom: 10,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.text }}>
                    {grp.name}
                  </Text>
                  <StatusTag tone={grp.status === 'ACTIVE' ? 'success' : 'neutral'}>
                    {grp.status}
                  </StatusTag>
                </View>
                <Text style={{ fontSize: 12, color: tokens.muted, marginTop: 4 }}>
                  Khách mời đã gán ({groupGuests.length} người):{' '}
                  {groupGuests.length > 0
                    ? groupGuests.map((g) => g.name).join(', ')
                    : 'Chưa có tên cụ thể (xếp theo nhóm)'}
                </Text>
              </View>
            );
          })
        ) : !loading ? (
          <View style={styles.emptyCard}>
            <UsersIcon size={24} color={tokens.sage} />
            <Text style={[styles.emptyCardTitle, { color: tokens.text }]}>
              Chưa có nhóm khách mời nào được lưu trên máy chủ
            </Text>
            <Text style={[styles.emptyCardDesc, { color: tokens.muted }]}>
              Hai bạn có thể tổ chức nhóm khách mời và phân bổ bàn tiệc thông qua Cổng quản lý Web.
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

// ====================================================
// 5. CONTRACTS SUBFLOW
// ====================================================
