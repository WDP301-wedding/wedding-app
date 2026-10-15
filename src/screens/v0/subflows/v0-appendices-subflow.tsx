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

export function V0AppendicesSubflow({ activeBooking, onNavigate, session }: V0CommonProps) {
  const { tokens } = useWeddingTheme();
  const [appendixData, setAppendixData] = useState<CommercialAppendixView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!session || !activeBooking?.bookingId) return;
      setLoading(true);
      setError(null);
      try {
        const loaded = await session.authorize((token) =>
          coupleBilling.loadAppendices(token, activeBooking.bookingId),
        );
        if (active) setAppendixData(loaded);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : 'Chưa tải được danh sách phụ lục hợp đồng.',
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
      <RestoredCommercialPanel mode="appendix" activeBooking={activeBooking} session={session} />
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
          <Text style={[styles.eyebrow, { color: tokens.sage }]}>Thương mại & Pháp lý</Text>
          <Text style={[styles.heading, { color: tokens.text }]}>Phụ lục hợp đồng</Text>
        </View>
      </View>

      {loading && <ActivityIndicator color={tokens.primary} style={{ marginVertical: 16 }} />}

      {error ? (
        <View style={[styles.emptyCard, { borderColor: tokens.champagne, marginBottom: 16 }]}>
          <Text style={{ color: tokens.tagWarmText, fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      {appendixData ? (
        <View style={{ gap: 14 }}>
          <View
            style={[
              styles.calloutCard,
              { backgroundColor: tokens.surface, borderColor: tokens.premium },
            ]}
          >
            <Text style={[styles.calloutTitle, { color: tokens.primary }]}>
              Tổng giá trị phụ lục hiệu lực
            </Text>
            <Text
              style={[
                styles.calloutSubtitle,
                { color: tokens.text, fontSize: 16, fontWeight: '700' },
              ]}
            >
              {money(appendixData.effectiveTotalVnd)}
            </Text>
            <Text style={{ fontSize: 11, color: tokens.sage, marginTop: 4 }}>
              Phiên bản hiệu lực: #{appendixData.effectiveRevisionId.slice(0, 8)}
            </Text>
          </View>

          <Text style={[styles.policyTitle, { color: tokens.text, marginTop: 8 }]}>
            Danh sách phụ lục ({appendixData.revisions.length} bản)
          </Text>

          {appendixData.revisions.map((app) => (
            <View
              key={app.revisionId}
              style={[
                styles.calloutCard,
                { backgroundColor: tokens.surface, borderColor: tokens.rule, marginBottom: 12 },
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
                  Phụ lục #{app.revisionNumber}
                </Text>
                <StatusTag tone={app.state === 'APPROVED' ? 'success' : 'neutral'}>
                  {app.state}
                </StatusTag>
              </View>

              <View style={[styles.factRow, { marginTop: 8 }]}>
                <Text style={{ fontSize: 12, color: tokens.muted }}>Giá trị điều chỉnh:</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: tokens.primary }}>
                  {app.document.deltaVnd >= 0 ? '+' : ''}
                  {money(app.document.deltaVnd)}
                </Text>
              </View>

              <Text style={{ fontSize: 12, color: tokens.text, marginTop: 4 }}>
                Lý do điều chỉnh: {app.document.reason}
              </Text>

              {app.createdAt ? (
                <Text style={{ fontSize: 11, color: tokens.muted, marginTop: 4 }}>
                  Ngày tạo: {new Date(app.createdAt).toLocaleDateString('vi-VN')}
                </Text>
              ) : null}

              {app.documentDigest ? (
                <Text style={{ fontSize: 10, color: tokens.earth, marginTop: 2 }}>
                  Mã xác thực: {app.documentDigest.slice(0, 16)}…
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : !loading ? (
        <View style={styles.emptyCard}>
          <FileTextIcon size={24} color={tokens.sage} />
          <Text style={[styles.emptyCardTitle, { color: tokens.text }]}>
            Không có phụ lục hợp đồng
          </Text>
          <Text style={[styles.emptyCardDesc, { color: tokens.muted }]}>
            Các thay đổi về dịch vụ, số lượng bàn hoặc trang trí phát sinh sau khi ký hợp đồng sẽ
            được ghi nhận trong các phụ lục tại đây.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

// ====================================================
// 7. INCIDENTAL EXPENSES SUBFLOW
// ====================================================
